/**
 * @fileoverview Lógica central de generación de EECC
 * @version 2.0.0 - Optimización parcial
 * 
 * ESTADO v2.0:
 * ✅ Usa SheetsIO.readSheet() batch para lectura
 * ✅ Procesamiento en memoria con filter()/map()
 * ✅ Usa Set para filtrado eficiente
 * ✅ Sin getValue/setValue en loops principales
 * ⚠️  _generateCore crea spreadsheet temporal por EECC (inevitable, es el producto)
 * ⚠️  Procesamiento por asegurado (no batch) - Por diseño funcional
 * 
 * NOTA: La naturaleza de EECC (un documento por asegurado) limita el batch processing.
 * Cada EECC requiere su propio spreadsheet temporal → PDF/XLSX.
 * Las optimizaciones principales están en los servicios auxiliares (Logger, Bitácora, Mail).
 */

const EECCCore = {
  /**
   * Genera EECC para un asegurado (con UI - prompts/alerts)
   * @param {string} nombreAsegurado - Nombre del asegurado
   * @param {Object} opts - Opciones { exportPdf, exportXlsx }
   * @return {string} Mensaje de resultado
   */
  generateWithUI(nombreAsegurado, opts = {}) {
    const context = 'EECCCore.generateWithUI';
    Logger.info(context, 'Starting generation with UI', { asegurado: nombreAsegurado, opts });

    try {
      validateConfig();

      const exportPdf = !!opts.exportPdf;
      const exportXlsx = !!opts.exportXlsx;

      if (!exportPdf && !exportXlsx) {
        throw new Error('Selecciona al menos un tipo de archivo (PDF/XLSX)');
      }

      if (!nombreAsegurado) {
        throw new Error('Selecciona un asegurado');
      }

      const ui = SpreadsheetApp.getUi();
      const ss = SpreadsheetApp.getActive();

      // 1. Leer datos base
      const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
      const aseguradoCol = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.ASEGURADO'));

      if (aseguradoCol === -1) {
        throw new Error('No se encontró la columna ASEGURADO en la base de datos');
      }

      // 2. Filtrar por asegurado
      const rowsAsegurado = baseData.rows.filter(row =>
        Utils.cleanText(row[aseguradoCol]) === Utils.cleanText(nombreAsegurado)
      );

      if (rowsAsegurado.length === 0) {
        throw new Error(`No hay datos para el asegurado: ${nombreAsegurado}`);
      }

      // 3. Pre-chequeo (mostrar preview al usuario)
      const userRows = this._showPreCheckDialog(ui, rowsAsegurado, baseData.headers, nombreAsegurado);

      if (userRows === null) {
        return 'Operación cancelada por el usuario';
      }

      // 4. Confirmar generación
      const tipos = exportPdf && exportXlsx ? 'PDF + XLSX' : (exportPdf ? 'PDF' : 'XLSX');
      const folder = DriveIO.getOutputFolder(nombreAsegurado);
      const folderPath = DriveIO.getFolderPath(folder);

      const confirmMsg = `Se generará: ${tipos}\nCarpeta: ${folderPath}\n\n¿Deseas continuar?`;

      if (ui.alert('Confirmar generación', confirmMsg, ui.ButtonSet.OK_CANCEL) === ui.Button.CANCEL) {
        return 'Operación cancelada por el usuario';
      }

      // 5. Generar
      const result = this._generateCore(nombreAsegurado, userRows, baseData.headers, {
        exportPdf,
        exportXlsx,
        folder
      });

      Logger.info(context, 'Generation complete', result);

      return `Listo: ${tipos} generado(s) para ${nombreAsegurado} en ${folderPath}`;

    } catch (error) {
      Logger.error(context, 'Generation failed', error);
      throw error;
    }
  },

  /**
   * Genera EECC sin UI (para API/portal)
   * @param {string} nombreAsegurado - Nombre del asegurado
   * @param {Object} opts - Opciones { exportPdf, exportXlsx, rowsToSkip, includeObs, obsForRAM }
   * @return {Object} { ok, message, pdfUrl, xlsxUrl, folderPath }
   */
  generateHeadless(nombreAsegurado, opts = {}) {
    const context = 'EECCCore.generateHeadless';
    Logger.info(context, 'Starting headless generation', { asegurado: nombreAsegurado, opts });

    // Phase 1: Pipeline tracking (only if flag ON)
    let pipelineId = null;
    try {
      const pipelineResult = EECCPipeline.create(nombreAsegurado, opts, Logger.getCorrelationId());
      if (pipelineResult.ok && pipelineResult.pipelineId) {
        pipelineId = pipelineResult.pipelineId;
        EECCPipeline.transition(pipelineId, EECCPipeline.STATES.GENERANDO);
      }
    } catch (e) { /* ignore pipeline errors */ }

    try {
      validateConfig();

      const exportPdf = !!opts.exportPdf;
      const exportXlsx = !!opts.exportXlsx;

      if (!exportPdf && !exportXlsx) {
        throw new Error('Selecciona al menos un tipo de archivo');
      }

      // 1. Leer datos
      const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
      const aseguradoCol = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.ASEGURADO'));

      if (aseguradoCol === -1) {
        throw new Error('Columna ASEGURADO no encontrada');
      }

      // 2. Filtrar
      let rowsAsegurado = baseData.rows.filter(row =>
        Utils.cleanText(row[aseguradoCol]) === Utils.cleanText(nombreAsegurado)
      );

      if (rowsAsegurado.length === 0) {
        throw new Error(`Sin datos para: ${nombreAsegurado}`);
      }

      // 3. Aplicar filtros de filas a excluir (desde preview)
      if (opts.rowsToSkip && opts.rowsToSkip.length > 0) {
        const skipSet = new Set(opts.rowsToSkip.map(n => Number(n) - 1));
        rowsAsegurado = rowsAsegurado.filter((_, idx) => !skipSet.has(idx));
      }

      if (rowsAsegurado.length === 0) {
        throw new Error('No quedan filas después de aplicar filtros');
      }

      // 4. Procesar obsForRAM: convertir a Set
      let obsForRAMSet = null;
      if (opts.includeObs) {
        const rawObsForRAM = opts.obsForRAM || '__ALL__';
        if (Array.isArray(rawObsForRAM)) {
          obsForRAMSet = new Set(rawObsForRAM.map(r => Utils.cleanText(r)));
        } else if (rawObsForRAM === '__ALL__') {
          obsForRAMSet = '__ALL__';
        } else {
          obsForRAMSet = new Set([Utils.cleanText(rawObsForRAM)]);
        }
      }

      // 5. Generar
      const folder = DriveIO.getOutputFolder(nombreAsegurado);
      const result = this._generateCore(nombreAsegurado, rowsAsegurado, baseData.headers, {
        exportPdf,
        exportXlsx,
        folder,
        includeObs: !!opts.includeObs,
        obsForRAM: obsForRAMSet
      });

      Logger.info(context, 'Headless generation complete', result);

      // Phase 1: Audit EECC generation (soft-fail)
      try {
        const displayNames = getConfig('AUTH.USER_DISPLAY_NAMES', {});
        const auditUser = opts.portalUser
          ? (displayNames[opts.portalUser] || opts.portalUser)
          : null;
        AuditService.log(AuditService.ACTIONS.GENERATE_EECC, nombreAsegurado, {
          pdfUrl: result.pdfUrl || null,
          xlsxUrl: result.xlsxUrl || null
        }, null, null, auditUser);
      } catch (e) { /* ignore audit errors */ }

      // ========== REGISTRAR EN BITÁCORA ==========
      // Registrar la generación del EECC en la bitácora de gestiones
      try {
        const datosGestion = {
          asegurado: nombreAsegurado,
          poliza: '', // Puede extraerse de los datos si es necesario
          estado: 'ENVIADO', // Estado inicial al generar
          canal: 'PORTAL', // O 'MANUAL' según el origen
          destinatarios: '',
          observaciones: 'EECC generado desde el portal',
          fechaTentativaPago: null,
          montoGestionado: '',
          moneda: '',
          archivoGenerado: result.pdfUrl || result.xlsxUrl || '',
          messageId: '',
          idGestionPadre: ''
        };

        const bitacoraResult = BitacoraService.registrarGestion(datosGestion, baseData);

        if (bitacoraResult.ok) {
          Logger.info(context, 'Gestión registrada en bitácora', {
            idGestion: bitacoraResult.idGestion
          });
        } else {
          // Log error pero no bloquear el flujo principal
          Logger.warn(context, 'No se pudo registrar en bitácora', {
            error: bitacoraResult.error
          });
        }
      } catch (bitacoraError) {
        // Error controlado: no bloquear el flujo principal
        Logger.error(context, 'Error al registrar en bitácora (no crítico)', bitacoraError);
      }

      // Phase 1: Pipeline success transition
      try {
        if (pipelineId) {
          EECCPipeline.transition(pipelineId, EECCPipeline.STATES.GENERADO, {
            pdfUrl: result.pdfUrl,
            xlsxUrl: result.xlsxUrl
          });
        }
      } catch (e) { /* ignore pipeline errors */ }

      let folderPath = null;
      try {
        folderPath = DriveIO.getFolderPath(folder);
      } catch (e) {
        Logger.warn(context, 'getFolderPath failed (non-critical)', { error: e.message });
      }

      return {
        ok: true,
        message: `EECC generado para ${nombreAsegurado}`,
        pdfUrl: result.pdfUrl || null,
        xlsxUrl: result.xlsxUrl || null,
        folderPath: folderPath,
        pipelineId: pipelineId // Phase 1: Return pipelineId for email step
      };

    } catch (error) {
      Logger.error(context, 'Headless generation failed', error);

      // Phase 1: Pipeline error transition
      try {
        if (pipelineId) {
          EECCPipeline.transition(pipelineId, EECCPipeline.STATES.ERROR, {
            error: error.message
          });
        }
      } catch (e) { /* ignore pipeline errors */ }

      // ========== REGISTRAR ERROR EN BITÁCORA ==========
      try {
        BitacoraService.registrarGestion({
          asegurado: nombreAsegurado,
          poliza: '',
          estado: 'ERROR',
          canal: 'PORTAL',
          destinatarios: '',
          observaciones: `Error al generar EECC: ${error.message}`,
          fechaTentativaPago: null,
          montoGestionado: '',
          moneda: '',
          archivoGenerado: '',
          messageId: '',
          idGestionPadre: ''
        });
      } catch (bitacoraError) {
        Logger.error(context, 'Error al registrar error en bitácora', bitacoraError);
      }

      return {
        ok: false,
        error: error.message || String(error)
      };
    }
  },

  /**
   * Genera EECC para todo un Grupo Económico
   * // GRUPO_ECONOMICO - OPTIMIZADO: Lee BD una sola vez y procesa en batches
   * @param {string} grupoNombre - Nombre del grupo
   * @param {Object} opts - Opciones (mismas que generateHeadless)
   * @return {Object} Resultado consolidado
   */
  generateByGrupo(grupoNombre, opts = {}) {
    const context = 'EECCCore.generateByGrupo';
    Logger.info(context, 'Starting optimized group generation', { grupo: grupoNombre, opts });

    try {
      validateConfig();

      // 1. Obtener asegurados del grupo
      const asegurados = GrupoEconomicoService.getAsegurados(grupoNombre);

      if (!asegurados || asegurados.length === 0) {
        throw new Error(`El grupo "${grupoNombre}" no tiene asegurados configurados o no existe.`);
      }

      Logger.info(context, `Grupo encontrado con ${asegurados.length} asegurados`, { asegurados });

      // 2. OPTIMIZACIÓN: Leer BD UNA SOLA VEZ (en lugar de N veces)
      const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
      const aseguradoCol = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.ASEGURADO'));

      if (aseguradoCol === -1) {
        throw new Error('Columna ASEGURADO no encontrada en BD');
      }

      // OPTIMIZACIÓN: getOutputFolder una sola vez (ahorra N-1 llamadas a Drive)
      const sharedFolder = DriveIO.getOutputFolder();
      const optsWithFolder = Object.assign({}, opts, { folderInjected: sharedFolder });

      // Helper: detecta errores transitorios de Drive que ameritan retry
      const isTransientDriveError = (msg) =>
        typeof msg === 'string' && /Drive|servicio|service/i.test(msg);

      // 3. Dividir en batches de 3 para evitar timeouts (3 × 3seg ≈ 9seg < 30seg)
      // Nota: Reducido de 6 a 3 por seguridad tras diagnóstico de performance
      const BATCH_SIZE = 3;
      const batches = [];
      for (let i = 0; i < asegurados.length; i += BATCH_SIZE) {
        batches.push(asegurados.slice(i, i + BATCH_SIZE));
      }

      Logger.info(context, `Procesando ${asegurados.length} asegurados en ${batches.length} batch(es)`);

      const results = [];
      const errors = [];

      // 4. Procesar cada batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        Logger.info(context, `Procesando batch ${batchIndex + 1}/${batches.length}`, { size: batch.length });

        for (const asegurado of batch) {
          try {
            // Filtrar filas en memoria (sin leer BD nuevamente)
            const rowsAsegurado = baseData.rows.filter(row =>
              Utils.cleanText(row[aseguradoCol]) === Utils.cleanText(asegurado)
            );

            if (rowsAsegurado.length === 0) {
              errors.push({ asegurado, error: 'Sin datos en BD' });
              Logger.warn(context, `Sin datos para ${asegurado}`);
              continue;
            }

            // Generar usando datos pre-filtrados
            let result = this._generateFromFilteredData(asegurado, rowsAsegurado, baseData.headers, optsWithFolder);

            // Retry transitorio: si falló por Drive intermitente, reintentar 1 vez tras pausa
            if (!result.ok && isTransientDriveError(result.error)) {
              Logger.warn(context, `Reintentando ${asegurado} tras error transitorio de Drive`, { error: result.error });
              Utilities.sleep(3000);
              result = this._generateFromFilteredData(asegurado, rowsAsegurado, baseData.headers, optsWithFolder);
            }

            if (result.ok) {
              results.push({
                asegurado,
                pdfUrl: result.pdfUrl,
                xlsxUrl: result.xlsxUrl,
                folderPath: result.folderPath
              });
            } else {
              errors.push({ asegurado, error: result.error });
              Logger.warn(context, `Fallo parcial para ${asegurado}`, result.error);
            }
          } catch (e) {
            errors.push({ asegurado, error: e.message });
            Logger.error(context, `Error crítico para ${asegurado}`, e);
          }
        }

        // Pausa entre batches para evitar rate limits de Drive (2s, antes 1s)
        if (batchIndex < batches.length - 1) {
          Utilities.sleep(2000);
        }
      }

      // 5. Retornar resultado consolidado
      const message = `Generación grupal completada. Éxitos: ${results.length}/${asegurados.length}, Errores: ${errors.length}`;
      Logger.info(context, message);

      return {
        ok: results.length > 0,
        grupo: grupoNombre,
        totalAsegurados: asegurados.length,
        generatedCount: results.length,
        errorCount: errors.length,
        batchesProcessed: batches.length,
        results,
        errors,
        message
      };

    } catch (error) {
      Logger.error(context, 'Group generation failed', error);
      return {
        ok: false,
        error: error.message
      };
    }
  },

  /**
   * Genera EECC para múltiples asegurados en batch
   * Optimizaciones: 1 BD read, 1 template/logo read, parallel exports via fetchAll
   * Cada asegurado obtiene su propio temp spreadsheet (preserva multi-moneda en un PDF/XLSX)
   *
   * @param {Array<string>} asegurados - Lista de asegurados
   * @param {Object} opts - { exportPdf, exportXlsx, includeObs, obsForRAM }
   * @return {Object} { ok, results[], errors[], generatedCount, errorCount }
   */
  generateBatchHeadless(asegurados, opts = {}) {
    const context = 'EECCCore.generateBatchHeadless';
    const startTime = Date.now();
    Logger.info(context, 'Starting batch generation', { count: asegurados.length, opts });

    try {
      validateConfig();

      const exportPdf = !!opts.exportPdf;
      const exportXlsx = !!opts.exportXlsx;

      if (!exportPdf && !exportXlsx) {
        throw new Error('Selecciona al menos un tipo de archivo');
      }

      // ── 1. Single BD read ──
      const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
      const aseguradoCol = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.ASEGURADO'));
      if (aseguradoCol === -1) throw new Error('Columna ASEGURADO no encontrada');

      const columnMap = this._buildColumnMap(baseData.headers);

      // ── 2. Single template + logo read ──
      const ss = SheetsIO._getSpreadsheet();
      const template = ss.getSheetByName(getConfig('SHEETS.TEMPLATE'));
      if (!template) throw new Error('Plantilla EECC_Template no encontrada');
      const logo = DriveIO.getLogoCached();

      // Procesar obsForRAM una sola vez
      let obsForRAMSet = null;
      if (opts.includeObs) {
        const rawObsForRAM = opts.obsForRAM || '__ALL__';
        if (Array.isArray(rawObsForRAM)) {
          obsForRAMSet = new Set(rawObsForRAM.map(r => Utils.cleanText(r)));
        } else if (rawObsForRAM === '__ALL__') {
          obsForRAMSet = '__ALL__';
        } else {
          obsForRAMSet = new Set([Utils.cleanText(rawObsForRAM)]);
        }
      }

      const tz = getConfig('FORMAT.TIMEZONE');
      const dateStr = Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
      const prefix = getConfig('EXPORT.FILE_PREFIX');

      // ── 3. Create one temp SS per asegurado (preserves multi-currency in single file) ──
      const tempIds = []; // Track all temp IDs for cleanup
      const exportRegistry = []; // { tempId, asegurado, folder, baseName }
      const results = [];
      const errors = [];

      // OPTIMIZACIÓN: getOutputFolder una sola vez (config tiene SUBFOLDER_BY_ASEGURADO=false)
      const sharedFolder = DriveIO.getOutputFolder();

      for (const nombre of asegurados) {
        const cleanName = Utils.cleanText(nombre);
        const rows = baseData.rows.filter(row => Utils.cleanText(row[aseguradoCol]) === cleanName);

        if (rows.length === 0) {
          errors.push({ asegurado: nombre, error: 'Sin datos en BD' });
          continue;
        }

        try {
          const byMoneda = this._groupByMoneda(rows, columnMap);
          const folder = sharedFolder;
          // Retry SpreadsheetApp.create: Drive falla bajo carga ("Error de servicio: Drive")
          const tempSpreadsheet = Utils.retryWithBackoff(
            () => SpreadsheetApp.create('TMP_EECC_' + Date.now() + '_' + tempIds.length),
            3,
            2000
          );
          const tempId = tempSpreadsheet.getId();
          tempIds.push(tempId);

          const defaultSheet = tempSpreadsheet.getSheets()[0];
          let defaultDeleted = false;

          for (const [moneda, grupos] of Object.entries(byMoneda)) {
            if (Object.keys(grupos).length === 0) continue;

            this._createSheetForMoneda(
              tempSpreadsheet, template, nombre, moneda, grupos, columnMap, logo,
              { ...opts, includeObs: !!opts.includeObs, obsForRAM: obsForRAMSet }
            );

            if (!defaultDeleted) {
              try {
                tempSpreadsheet.deleteSheet(defaultSheet);
                defaultDeleted = true;
              } catch (e) { /* ignore */ }
            }
          }

          const baseName = `${prefix}${Utils.safeName(nombre)}_${dateStr}`;
          exportRegistry.push({ tempId, asegurado: nombre, folder, baseName });

        } catch (e) {
          errors.push({ asegurado: nombre, error: e.message });
          Logger.warn(context, `Error preparing ${nombre}`, { error: e.message });
        }
      }

      if (exportRegistry.length === 0) {
        // Cleanup any temp files created before failure
        tempIds.forEach(id => { try { DriveIO.deleteFile(id); } catch (e) { /* ignore */ } });
        return {
          ok: false,
          error: 'No se pudieron preparar hojas para ningún asegurado',
          results: [],
          errors: errors
        };
      }

      try {
        // ── 4. Flush all spreadsheets, then parallel export ──
        SpreadsheetApp.flush();

        // Build export items for PDF and XLSX
        const pdfItems = exportPdf ? exportRegistry.map(reg => ({
          spreadsheetId: reg.tempId,
          fileName: reg.baseName + '.pdf'
        })) : [];

        const xlsxItems = exportXlsx ? exportRegistry.map(reg => ({
          spreadsheetId: reg.tempId,
          fileName: reg.baseName + '.xlsx'
        })) : [];

        // Parallel export — one fetchAll call for all PDFs, one for all XLSXs
        const pdfResults = pdfItems.length > 0 ? ExportService.batchExportSpreadsheets(pdfItems, { format: 'pdf' }) : [];
        const xlsxResults = xlsxItems.length > 0 ? ExportService.batchExportSpreadsheets(xlsxItems, { format: 'xlsx' }) : [];

        // ── 5. Upload to Drive ──
        // Cachear folderPath una vez (no cambia entre asegurados con folder compartido)
        let cachedFolderPath = null;
        try { cachedFolderPath = DriveIO.getFolderPath(sharedFolder); } catch (e) { /* non-critical */ }

        for (let i = 0; i < exportRegistry.length; i++) {
          const reg = exportRegistry[i];
          let pdfUrl = null;
          let xlsxUrl = null;

          if (pdfResults[i] && pdfResults[i].ok) {
            try {
              const file = Utils.retryWithBackoff(() => reg.folder.createFile(pdfResults[i].blob), 3, 1500);
              pdfUrl = file.getUrl();
            } catch (e) {
              Logger.warn(context, `createFile PDF failed for ${reg.asegurado}`, { error: e.message });
            }
          }

          if (xlsxResults[i] && xlsxResults[i].ok) {
            try {
              const file = Utils.retryWithBackoff(() => reg.folder.createFile(xlsxResults[i].blob), 3, 1500);
              xlsxUrl = file.getUrl();
            } catch (e) {
              Logger.warn(context, `createFile XLSX failed for ${reg.asegurado}`, { error: e.message });
            }
          }

          if (pdfUrl || xlsxUrl) {
            results.push({
              asegurado: reg.asegurado,
              pdfUrl: pdfUrl,
              xlsxUrl: xlsxUrl,
              folderPath: cachedFolderPath,
              ok: true
            });
          } else {
            errors.push({ asegurado: reg.asegurado, error: 'Export falló para PDF y XLSX' });
          }
        }

        // Log export failures
        [...pdfResults, ...xlsxResults].forEach(res => {
          if (!res.ok) {
            Logger.warn(context, `Export failed: ${res.fileName}`, { error: res.error });
          }
        });

      } finally {
        // ── 6. Cleanup ALL temp spreadsheets en paralelo (UrlFetchApp.fetchAll) ──
        if (tempIds.length > 0) {
          try { DriveIO.deleteBatch(tempIds); }
          catch (e) {
            // Fallback secuencial si la versión batch falla
            tempIds.forEach(id => { try { DriveIO.deleteFile(id); } catch (e2) { /* ignore */ } });
          }
        }
      }

      const duration = Date.now() - startTime;
      Logger.info(context, 'Batch generation complete', {
        total: asegurados.length,
        generated: results.length,
        errors: errors.length,
        durationMs: duration
      });

      return {
        ok: results.length > 0,
        generatedCount: results.length,
        errorCount: errors.length,
        totalAsegurados: asegurados.length,
        results: results,
        errors: errors,
        durationMs: duration,
        message: `Batch completado: ${results.length}/${asegurados.length} generados en ${Math.round(duration / 1000)}s`
      };

    } catch (error) {
      Logger.error(context, 'Batch generation failed', error);
      return { ok: false, error: error.message, results: [], errors: [] };
    }
  },

  /**
   * Genera EECC desde datos pre-filtrados (optimización para grupos)
   * // GRUPO_ECONOMICO - Método auxiliar para evitar re-lectura de BD
   * @private
   * @param {string} nombreAsegurado - Nombre del asegurado
   * @param {Array} rowsAsegurado - Filas ya filtradas para este asegurado
   * @param {Array} headers - Encabezados de la BD
   * @param {Object} opts - Opciones de generación
   * @return {Object} Resultado de generación
   */
  _generateFromFilteredData(nombreAsegurado, rowsAsegurado, headers, opts = {}) {
    const context = 'EECCCore._generateFromFilteredData';
    Logger.debug(context, 'Generating from filtered data', { asegurado: nombreAsegurado, rows: rowsAsegurado.length });

    try {
      const exportPdf = !!opts.exportPdf;
      const exportXlsx = !!opts.exportXlsx;

      if (!exportPdf && !exportXlsx) {
        throw new Error('Selecciona al menos un tipo de archivo');
      }

      // Aplicar filtros de filas a excluir (desde preview)
      let filteredRows = rowsAsegurado;
      if (opts.rowsToSkip && opts.rowsToSkip.length > 0) {
        const skipSet = new Set(opts.rowsToSkip.map(n => Number(n) - 1));
        filteredRows = rowsAsegurado.filter((_, idx) => !skipSet.has(idx));
      }

      if (filteredRows.length === 0) {
        throw new Error('No quedan filas después de aplicar filtros');
      }

      // Procesar obsForRAM
      let obsForRAMSet = null;
      if (opts.includeObs) {
        const rawObsForRAM = opts.obsForRAM || '__ALL__';
        if (Array.isArray(rawObsForRAM)) {
          obsForRAMSet = new Set(rawObsForRAM.map(r => Utils.cleanText(r)));
        } else if (rawObsForRAM === '__ALL__') {
          obsForRAMSet = '__ALL__';
        } else {
          obsForRAMSet = new Set([Utils.cleanText(rawObsForRAM)]);
        }
      }

      // Reusar folder inyectado (ahorra ~3-5s en generación grupal de N asegurados)
      const folder = opts.folderInjected || DriveIO.getOutputFolder(nombreAsegurado);
      const result = this._generateCore(nombreAsegurado, filteredRows, headers, {
        exportPdf,
        exportXlsx,
        folder,
        includeObs: !!opts.includeObs,
        obsForRAM: obsForRAMSet
      });

      Logger.debug(context, 'Generation complete', { asegurado: nombreAsegurado, ok: result.ok });
      return result;

    } catch (error) {
      Logger.error(context, 'Generation failed', error);
      return {
        ok: false,
        error: error.message
      };
    }
  },

  /**
   * Núcleo de generación (usado por ambos métodos)
   * @private
   */
  _generateCore(nombreAsegurado, rows, headers, opts) {
    const context = 'EECCCore._generateCore';
    const startTime = Date.now();

    // Mapeo de columnas
    const columnMap = this._buildColumnMap(headers);

    // Agrupar por moneda
    const byMoneda = this._groupByMoneda(rows, columnMap);

    // Crear spreadsheet temporal con retry (Drive puede tirar "Error de servicio" bajo carga)
    const tempSpreadsheet = Utils.retryWithBackoff(
      () => SpreadsheetApp.create('TMP_EECC_' + Date.now()),
      3,
      2000
    );
    const tempId = tempSpreadsheet.getId();

    try {
      const ss = SheetsIO._getSpreadsheet();
      const template = ss.getSheetByName(getConfig('SHEETS.TEMPLATE'));

      if (!template) {
        throw new Error('Plantilla EECC_Template no encontrada');
      }

      const logo = DriveIO.getLogoCached();
      const sheetNames = [];

      // Eliminar hoja por defecto
      const defaultSheet = tempSpreadsheet.getSheets()[0];
      let defaultDeleted = false;

      // Crear hoja por cada moneda
      for (const [moneda, grupos] of Object.entries(byMoneda)) {
        if (Object.keys(grupos).length === 0) continue;

        const sheetName = this._createSheetForMoneda(
          tempSpreadsheet,
          template,
          nombreAsegurado,
          moneda,
          grupos,
          columnMap,
          logo,
          opts
        );

        sheetNames.push(sheetName);

        if (!defaultDeleted) {
          try {
            tempSpreadsheet.deleteSheet(defaultSheet);
            defaultDeleted = true;
          } catch (e) {
            Logger.warn(context, 'Could not delete default sheet', { error: e.message });
          }
        }
      }

      SpreadsheetApp.flush();

      // Exportar archivos
      const result = {};
      const tz = getConfig('FORMAT.TIMEZONE');
      const dateStr = Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
      const baseName = `${getConfig('EXPORT.FILE_PREFIX')}${Utils.safeName(nombreAsegurado)}_${dateStr}`;

      if (opts.exportPdf) {
        const pdfBlob = ExportService.exportToPDF(tempId);
        const pdfFile = opts.folder.createFile(pdfBlob.setName(baseName + '.pdf'));
        result.pdfUrl = pdfFile.getUrl();
      }

      if (opts.exportXlsx) {
        const xlsxBlob = ExportService.exportToXLSX(tempId);
        const xlsxFile = opts.folder.createFile(xlsxBlob.setName(baseName + '.xlsx'));
        result.xlsxUrl = xlsxFile.getUrl();
      }

      const duration = Date.now() - startTime;

      Logger.info(context, 'Core generation complete', {
        asegurado: nombreAsegurado,
        rows: rows.length,
        sheets: sheetNames.length,
        durationMs: duration
      });

      return { ok: true, ...result }; // FIX: Incluir ok:true

    } finally {
      // Limpiar archivo temporal
      DriveIO.deleteFile(tempId);
    }
  },

  /**
   * Construye mapa de columnas
   * @private
   */
  _buildColumnMap(headers) {
    const cols = getConfig('BD.COLUMNS');
    const map = {};
    for (const [key, colName] of Object.entries(cols)) {
      const idx = Utils.findColumnIndex(headers, colName);
      if (idx >= 0) {
        map[key] = idx;
      }
    }
    return map;
  },

  /**
   * Agrupa filas por moneda y CIA
   * @private
   */
  _groupByMoneda(rows, columnMap) {
    const monIdx = columnMap.MON;
    const ciaIdx = columnMap.CIA;

    if (monIdx === undefined) {
      throw new Error('Columna MON no encontrada');
    }

    const byMoneda = {};

    for (const row of rows) {
      let moneda = Utils.normalizeCurrency(row[monIdx]);
      if (!moneda) moneda = 'SIN_MONEDA';

      if (!byMoneda[moneda]) {
        byMoneda[moneda] = {};
      }

      const cia = Utils.cleanText(row[ciaIdx]) || '(Sin CIA)';

      if (!byMoneda[moneda][cia]) {
        byMoneda[moneda][cia] = [];
      }

      byMoneda[moneda][cia].push(row);
    }

    return byMoneda;
  },

  /**
   * Crea hoja para una moneda específica
   * @private
   */
  _createSheetForMoneda(tempSpreadsheet, template, asegurado, moneda, gruposCIA, columnMap, logo, opts) {
    const context = 'EECCCore._createSheetForMoneda';

    // Determinar número de columnas
    const numCols = opts.includeObs ? 12 : 11;

    // Copiar template
    const sheet = template.copyTo(tempSpreadsheet);
    const sheetName = opts.sheetNameOverride || (moneda === 'S/.' ? 'EECC_Soles' : 'EECC_Dolares');
    sheet.setName(sheetName);

    // Colocar logo
    if (logo) {
      this._placeLogo(sheet, logo);
    }

    // Headers principales
    sheet.getRange('A1:K1').merge()
      .setValue('Transperuana Corredores de Seguros S.A.')
      .setHorizontalAlignment('center')
      .setFontSize(18)
      .setFontWeight('bold');

    sheet.getRange('A2:K2').merge()
      .setValue('Estado de Cuenta')
      .setHorizontalAlignment('center')
      .setFontSize(14)
      .setFontWeight('bold');

    sheet.setRowHeight(1, 30);
    sheet.setRowHeight(2, 24);

    // Datos cabecera
    sheet.getRange('A4').setValue('Asegurado:').setFontWeight('bold');
    sheet.getRange('A5').setValue('Moneda:').setFontWeight('bold');
    sheet.getRange('A6').setValue('Fecha:').setFontWeight('bold');

    sheet.getRange('C4:F4').merge().setValue(asegurado).setFontWeight('bold');
    sheet.getRange('C5:F5').merge().setValue(Utils.currencyDisplay(moneda)).setFontWeight('bold');
    sheet.getRange('C6:F6').merge().setValue(new Date()).setNumberFormat('dd/MM/yyyy').setFontWeight('bold');

    // Headers de tabla (fila 8)
    const headerRow = 8;
    const baseHeaders = ['CIA', 'POLIZA', 'RAM', 'N°', 'CUPÓN', 'MON', 'IMPORTE', 'VIG. DESDE', 'VIG. HASTA', 'FEC. VENC', 'DÍAS'];

    if (opts.includeObs) {
      baseHeaders.push('OBS');
    }

    sheet.getRange(headerRow, 1, 1, numCols).setValues([baseHeaders])
      .setHorizontalAlignment('center')
      .setWrap(false);

    sheet.setFrozenRows(headerRow);

    // Construir tabla con subtotales
    const tableData = this._buildTableWithSubtotals(gruposCIA, columnMap, opts, numCols);

    const startRow = getConfig('TEMPLATE.START_ROW', 9);

    // Limpiar área de datos
    const clearRows = Math.max(50, tableData.rows.length + 10);
    sheet.getRange(startRow, 1, clearRows, numCols).clearContent().clearFormat();

    // Escribir datos en batch
    if (tableData.rows.length > 0) {
      sheet.getRange(startRow, 1, tableData.rows.length, numCols).setValues(tableData.rows);

      // Aplicar formatos
      this._applyTableFormats(sheet, startRow, tableData, numCols, opts);
    }

    // Total y pie
    const totalRow = startRow + tableData.rows.length + 1;

    sheet.getRange(totalRow, 6).setValue('TOTAL:').setFontWeight('bold').setHorizontalAlignment('right');
    sheet.getRange(totalRow, 7)
      .setValue(tableData.total)
      .setNumberFormat('#,##0.00')
      .setFontWeight('bold')
      .setHorizontalAlignment('right');

    const footerRow = totalRow + 2;

    sheet.getRange(footerRow, 1, 1, numCols).merge()
      .setValue(getConfig('EXPORT.FOOTER_TEXT'))
      .setHorizontalAlignment('center')
      .setFontSize(9)
      .setFontColor('#666666')
      .setFontStyle('italic');

    const folioRow = footerRow + 1;
    const tz = getConfig('FORMAT.TIMEZONE');
    const stamp = Utilities.formatDate(new Date(), tz, 'yyyyMMdd-HHmm');
    const folio = `${getConfig('EXPORT.DOC_PREFIX')}-${stamp}-${Math.floor(100 + Math.random() * 900)}`;

    sheet.getRange(folioRow, 1, 1, numCols).merge()
      .setValue('N° EECC: ' + folio)
      .setHorizontalAlignment('center')
      .setFontWeight('bold')
      .setFontSize(10);

    // Recortar hoja
    const keepRows = folioRow + 1;
    const maxRows = sheet.getMaxRows();

    if (keepRows < maxRows) {
      sheet.deleteRows(keepRows + 1, maxRows - keepRows);
    }

    // Ajustar anchos de columna
    const widths = getConfig('TEMPLATE.COL_WIDTHS');
    widths.forEach((w, i) => {
      if (w && i < numCols) sheet.setColumnWidth(i + 1, w);
    });

    // Si includeObs, ajustar ancho de columna 12
    if (opts.includeObs) {
      sheet.setColumnWidth(12, 150);
    }

    Logger.debug(context, 'Sheet created', { name: sheetName, rows: tableData.rows.length, numCols });

    return sheetName;
  },

  /**
   * Construye tabla con subtotales por CIA
   * @private
   */
  _buildTableWithSubtotals(gruposCIA, columnMap, opts, numCols) {
    const rows = [];
    const rowTypes = [];
    let totalImporte = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Ordenar CIAs alfabéticamente
    const ciasOrdenadas = Object.keys(gruposCIA).sort((a, b) => a.localeCompare(b, 'es'));

    for (const cia of ciasOrdenadas) {
      const items = gruposCIA[cia];
      if (!items || items.length === 0) continue;

      // Ordenar items dentro de CIA
      // MODIFICADO: Se elimina el ordenamiento explícito para respetar el orden de la BD (Sheet)
      // items.sort((a, b) => { ... });

      let subtotal = 0;

      // Agregar filas de datos
      for (const item of items) {
        const fecVenc = item[columnMap.FEC_VENCIMIENTO_COB];
        const importe = Number(item[columnMap.IMPORTE]) || 0;
        let dias = '';

        if (
          fecVenc instanceof Date &&
          !isNaN(fecVenc) &&
          !isNaN(importe) &&
          importe > 0 // CAMBIO: solo se calculan días si el importe > 0
        ) {
          dias = Utils.daysBetween(today, fecVenc);
        }
        subtotal += importe;

        let obs = '';
        if (opts.includeObs && columnMap.MOTIVO !== undefined) {
          const ramActual = Utils.cleanText(item[columnMap.RAM]);

          // Chequear si este RAM debe incluir OBS
          if (opts.obsForRAM === '__ALL__') {
            obs = item[columnMap.MOTIVO] || '';
          } else if (opts.obsForRAM && opts.obsForRAM.has && opts.obsForRAM.has(ramActual)) {
            obs = item[columnMap.MOTIVO] || '';
          }
        }

        const row = [
          item[columnMap.CIA],
          item[columnMap.POLIZA],
          item[columnMap.RAM],
          item[columnMap.NUM_CUOTA],
          item[columnMap.CUPON],
          Utils.currencyDisplay(item[columnMap.MON]),
          importe,
          item[columnMap.VIG_DEL],
          item[columnMap.VIG_AL],
          fecVenc,
          dias
        ];

        if (opts.includeObs) {
          row.push(obs);
        }

        // Asegurar que la fila tenga exactamente numCols
        while (row.length < numCols) {
          row.push('');
        }

        rows.push(row);
        rowTypes.push('data');
      }

      // Agregar subtotal
      const subtotalRow = [
        `SUBTOTAL CIA: ${cia}`,
        '', '', '', '',
        Utils.currencyDisplay(items[0][columnMap.MON]),
        subtotal,
        '', '', '', ''
      ];

      if (opts.includeObs) {
        subtotalRow.push('');
      }

      // Asegurar numCols
      while (subtotalRow.length < numCols) {
        subtotalRow.push('');
      }

      rows.push(subtotalRow);
      rowTypes.push('subtotal');

      totalImporte += subtotal;

      // Fila en blanco después de subtotal
      const blankRow = Array(numCols).fill('');
      rows.push(blankRow);
      rowTypes.push('blank');
    }

    return { rows, rowTypes, total: totalImporte };
  },

  /**
   * Aplica formatos a la tabla
   * @private
   */
  _applyTableFormats(sheet, startRow, tableData, numCols, opts) {
    const numRows = tableData.rows.length;

    // Formatos base
    sheet.getRange(startRow, 1, numRows, numCols).setFontSize(9).setWrap(false);

    // Alineaciones por columna
    sheet.getRange(startRow, 1, numRows, 3).setHorizontalAlignment('left'); // CIA, POLIZA, RAM
    sheet.getRange(startRow, 4, numRows, 3).setHorizontalAlignment('center'); // N°, CUPÓN, MON
    sheet.getRange(startRow, 7, numRows, 1).setNumberFormat('#,##0.00').setHorizontalAlignment('right'); // IMPORTE
    sheet.getRange(startRow, 8, numRows, 3).setHorizontalAlignment('center').setNumberFormat('dd/MM/yyyy'); // VIG DEL/AL, FEC VENC
    sheet.getRange(startRow, 11, numRows, 1).setNumberFormat('0').setHorizontalAlignment('center'); // DÍAS

    // Si includeObs, alinear columna OBS (columna 12)
    if (opts.includeObs) {
      sheet.getRange(startRow, 12, numRows, 1).setHorizontalAlignment('left').setWrap(true);
    }

    // Colores por tipo de fila y lógica de vencimiento
    const brandRed = getConfig('BRAND.COLORS.RED_OVERDUE', '#E53935');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Preparar matrices de formatos para aplicar en batch
    const fontColors = [];
    const backgrounds = [];
    const fontWeights = [];

    // Inicializar matrices con valores por defecto
    for (let i = 0; i < numRows; i++) {
      const rowColors = new Array(numCols).fill('#000000'); // Negro por defecto
      const rowBackgrounds = new Array(numCols).fill(null); // Sin fondo
      const rowWeights = new Array(numCols).fill('normal'); // Peso normal

      const rowType = tableData.rowTypes[i];

      if (rowType === 'subtotal') {
        rowBackgrounds.fill('#f0f0f0');
        rowWeights.fill('bold');
      } else if (rowType === 'data') {
        // Lógica de color: SOLO si está vencido
        const fecVenc = tableData.rows[i][9]; // Columna 10 (índice 9)
        const importe = Number(tableData.rows[i][6]); // IMPORTE

        if (
          fecVenc instanceof Date &&
          !isNaN(fecVenc) &&
          !isNaN(importe) &&
          importe > 0 // CAMBIO: solo se resalta en rojo si el cupón está vencido y el importe > 0
        ) {
          const vencDate = new Date(fecVenc);
          vencDate.setHours(0, 0, 0, 0);

          if (vencDate < today) {
            // Columnas a colorear: CUPÓN(4), MON(5), IMPORTE(6), FEC. VENC(9), DÍAS(10)
            // Índices: 4, 5, 6, 9, 10
            rowColors[4] = brandRed;
            rowColors[5] = brandRed;
            rowColors[6] = brandRed;
            rowColors[9] = brandRed;
            rowColors[10] = brandRed;
          }
        }
      }

      fontColors.push(rowColors);
      backgrounds.push(rowBackgrounds);
      fontWeights.push(rowWeights);
    }

    // Aplicar formatos en batch (una sola llamada por tipo)
    const range = sheet.getRange(startRow, 1, numRows, numCols);
    range.setFontColors(fontColors);
    range.setBackgrounds(backgrounds);
    range.setFontWeights(fontWeights);
  },

  /**
   * Coloca logo en la hoja
   * @private
   */
  _placeLogo(sheet, logoBlob) {
    try {
      const targetCol = getConfig('EXPORT.LOGO.TARGET_COL', 10);
      const targetRow = getConfig('EXPORT.LOGO.TARGET_ROW', 2);
      const maxW = getConfig('EXPORT.LOGO.MAX_WIDTH', 600);
      const maxH = getConfig('EXPORT.LOGO.MAX_HEIGHT', 140);

      // Limpiar imágenes existentes
      const images = sheet.getImages ? sheet.getImages() : [];
      images.forEach(img => {
        try { img.remove(); } catch (e) { }
      });

      // Insertar logo
      const img = sheet.insertImage(logoBlob, targetCol, targetRow);
      const origW = img.getWidth();
      const origH = img.getHeight();

      if (origW && origH) {
        const scale = Math.min(maxW / origW, maxH / origH, 1);
        img.setWidth(Math.round(origW * scale));
        img.setHeight(Math.round(origH * scale));
      }

    } catch (error) {
      Logger.warn('EECCCore._placeLogo', 'Failed to place logo', { error: error.message });
    }
  },

  /**
   * Muestra diálogo de pre-chequeo con preview
   * @private
   * @return {Array|null} Filas filtradas o null si cancelado
   */
  _showPreCheckDialog(ui, rows, headers, asegurado) {
    const maxPreview = Math.min(getConfig('LIMITS.PREVIEW_MAX_ROWS', 50), rows.length);
    const columnMap = this._buildColumnMap(headers);

    const lines = ['# | CUPON | N° CUOTA | MON | IMPORTE | FEC VENC COB'];

    for (let i = 0; i < maxPreview; i++) {
      const r = rows[i];
      const fvc = r[columnMap.FEC_VENCIMIENTO_COB];
      const fvcTxt = fvc instanceof Date
        ? Utils.formatDate(fvc)
        : (fvc ?? '');

      lines.push(`${i + 1} | ${r[columnMap.CUPON] ?? ''} | ${r[columnMap.NUM_CUOTA] ?? ''} | ${r[columnMap.MON] ?? ''} | ${r[columnMap.IMPORTE] ?? ''} | ${fvcTxt}`);
    }

    const msgIntro = `Se encontraron ${rows.length} registros para "${asegurado}".\n\n` +
      `Vista previa (primeros ${maxPreview}):\n` + lines.join('\n') +
      `\n\n¿Deseas eliminar alguna fila ANTES de generar los archivos?`;

    const resp = ui.alert('Pre-chequeo de registros', msgIntro, ui.ButtonSet.YES_NO);

    if (resp === ui.Button.NO) {
      return rows;
    }

    const input = ui.prompt(
      'Eliminar filas por índice',
      'Ingresa los # de fila a eliminar (según la vista previa), separados por comas. Ej.: 1,3,7\n\nDeja vacío y presiona Aceptar para no eliminar.',
      ui.ButtonSet.OK_CANCEL
    );

    if (input.getSelectedButton() === ui.Button.CANCEL) {
      return null;
    }

    const text = String(input.getResponseText() || '').trim();

    if (text === '') {
      return rows;
    }

    const toDeleteIdx = new Set(
      text.split(/[,\s]+/)
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n))
        .map(n => n - 1)
        .filter(n => n >= 0 && n < rows.length)
    );

    if (toDeleteIdx.size === 0) {
      return rows;
    }

    const filtered = rows.filter((_, i) => !toDeleteIdx.has(i));

    if (filtered.length === 0) {
      ui.alert('No quedan filas después de la eliminación. Operación cancelada.');
      return null;
    }

    return filtered;
  }
};
