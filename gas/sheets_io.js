/**
 * @fileoverview I/O optimizado para Google Sheets
 * @version 2.1.0 - Fixed para Web App deployments
 */

const SheetsIO = {
  /**
   * Obtiene el Spreadsheet principal (container-bound o por ID)
   * @param {string} overrideId - ID opcional para override (ej: Bitácora puede usar ID diferente)
   * @private
   */
  _getSpreadsheet(overrideId = '') {
    const context = 'SheetsIO._getSpreadsheet';

    // PRIORIDAD 1: Usar overrideId si se proporciona, sino SPREADSHEET_ID
    const ssId = overrideId || getConfig('SPREADSHEET_ID', '');
    if (ssId) {
      try {
        const ss = SpreadsheetApp.openById(ssId);
        Logger.info(context, `✅ Abierto por ID: ${ss.getName()} (ID: ${ssId.substring(0, 15)}...)`);
        return ss;
      } catch (e) {
        Logger.error(context, `❌ openById FALLÓ para ID: ${ssId}`, e);
        // Continuar al fallback
      }
    } else {
      Logger.warn(context, '⚠️ SPREADSHEET_ID no configurado en config.js');
    }

    // PRIORIDAD 2: Fallback a getActive (solo funciona si script está container-bound)
    try {
      const ss = SpreadsheetApp.getActive();
      if (ss) {
        Logger.info(context, `✅ Usando getActive (fallback): ${ss.getName()}`);
        return ss;
      } else {
        Logger.warn(context, '⚠️ getActive() retornó null (no estamos en contexto container-bound)');
      }
    } catch (e) {
      Logger.warn(context, '⚠️ getActive() lanzó excepción', e);
    }

    // Si ninguno funcionó, error fatal
    throw new Error('❌ No se pudo abrir Spreadsheet. Verifica que SPREADSHEET_ID esté configurado correctamente en config.js');
  },

  /**
   * Lee todas las filas de una hoja (optimizado con batch)
   * @param {string} sheetName - Nombre de la hoja
   * @param {number} startRow - Fila inicial (default: START_ROW de config)
   * @param {number} headerRow - Fila de encabezados (default: HEADER_ROW de config)
   * @return {Object} { headers: Array, rows: Array, columnMap: Object }
   */
  readSheet(sheetName, startRow = null, headerRow = null) {
    const context = 'SheetsIO.readSheet';
    Logger.debug(context, `Reading sheet: ${sheetName}`);

    const ss = this._getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(`Hoja "${sheetName}" no encontrada`);
    }

    const hRow = headerRow ?? getConfig('BD.HEADER_ROW', 1);
    const sRow = startRow ?? getConfig('BD.START_ROW', 2);

    // OPTIMIZACIÓN: Leer todo el rango de datos de una sola vez
    // Esto es más rápido que hacer múltiples llamadas a getRange
    const allData = sheet.getDataRange().getValues();

    if (allData.length < hRow) {
      Logger.warn(context, 'Sheet empty or no headers', { sheet: sheetName });
      return { headers: [], rows: [], columnMap: {} };
    }

    // Leer headers (ajustar índice 1-based a 0-based)
    const headers = allData[hRow - 1].map(String);

    // Crear mapa de columnas para acceso rápido
    const columnMap = {};
    headers.forEach((h, idx) => {
      const normalized = Utils.normalizeHeader(h);
      if (normalized) columnMap[normalized] = idx;
    });

    // Leer datos si existen
    let rows = [];
    if (allData.length >= sRow) {
      rows = allData.slice(sRow - 1);
    }

    Logger.debug(context, `Read complete`, { rows: rows.length, cols: headers.length });
    return { headers, rows, columnMap };
  },

  /**
   * Escribe datos en batch (optimizado)
   * @param {string} sheetName - Nombre de la hoja
   * @param {Array<Array>} data - Datos 2D a escribir
   * @param {number} startRow - Fila inicial
   * @param {number} startCol - Columna inicial (default: 1)
   * @param {boolean} clearFirst - Limpiar contenido previo (default: true)
   */
  writeSheet(sheetName, data, startRow = 2, startCol = 1, clearFirst = true) {
    const context = 'SheetsIO.writeSheet';
    Logger.debug(context, `Writing to ${sheetName}`, { rows: data.length });

    if (!data || data.length === 0) {
      Logger.warn(context, 'No data to write');
      return;
    }

    const ss = this._getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Limpiar si se solicita
    if (clearFirst) {
      const maxRows = sheet.getMaxRows();
      const maxCols = sheet.getMaxColumns();
      if (startRow <= maxRows) {
        const clearRows = maxRows - startRow + 1;
        sheet.getRange(startRow, startCol, clearRows, maxCols).clearContent();
      }
    }

    // Escribir en batch
    const numCols = Math.max(...data.map(row => row.length));
    const normalized = data.map(row => {
      const r = row.slice();
      while (r.length < numCols) r.push('');
      return r;
    });

    sheet.getRange(startRow, startCol, normalized.length, numCols).setValues(normalized);
    Logger.info(context, `Write complete`, { rows: normalized.length, cols: numCols });
  },

  /**
   * Actualiza hoja BD con deduplicación por CUPON
   * @param {Array<Array>} headers - Encabezados
   * @param {Array<Array>} rows - Filas de datos
   * @return {Object} { ok: boolean, rowsWritten: number, duplicatesRemoved: number }
   */
  updateBaseSheet(headers, rows) {
    const context = 'SheetsIO.updateBaseSheet';
    Logger.info(context, 'Starting update', { inputRows: rows.length });

    try {
      const sheetName = getConfig('SHEETS.BASE', 'BD');
      const headerRow = getConfig('BD.HEADER_ROW', 1);

      // Limpiar datos (espacios, moneda, etc.)
      const cleaned = this._cleanData(headers, rows);

      // Deduplicar por CUPON
      const deduped = this._deduplicateByCupon(headers, cleaned);
      const duplicatesRemoved = cleaned.length - deduped.length;

      const ss = this._getSpreadsheet();
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      // Limpiar hoja completa
      sheet.clear({ contentsOnly: true });

      // Escribir headers
      sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold')
        .setBackground('#f3f3f3');

      // Escribir datos
      if (deduped.length > 0) {
        sheet.getRange(headerRow + 1, 1, deduped.length, headers.length).setValues(deduped);
      }

      sheet.setFrozenRows(headerRow);

      Logger.info(context, 'Update complete', {
        written: deduped.length,
        duplicatesRemoved
      });

      return {
        ok: true,
        rowsWritten: deduped.length,
        duplicatesRemoved
      };
    } catch (error) {
      Logger.error(context, 'Update failed', error);
      throw error;
    }
  },

  /**
   * Limpia datos según configuración
   * @private
   */
  _cleanData(headers, rows) {
    const cleanCols = getConfig('BD.CLEAN_TEXT_COLS', []);
    const monColName = getConfig('BD.COLUMNS.MON', 'MON');

    const colsToClean = cleanCols.map(name => Utils.findColumnIndex(headers, name)).filter(i => i >= 0);
    const monIdx = Utils.findColumnIndex(headers, monColName);

    return rows.map(row => {
      const cleaned = row.slice();

      // Limpiar texto en columnas configuradas
      colsToClean.forEach(idx => {
        cleaned[idx] = Utils.cleanText(cleaned[idx]);
      });

      // Normalizar moneda
      if (monIdx >= 0) {
        cleaned[monIdx] = Utils.normalizeCurrency(cleaned[monIdx]);
      }

      return cleaned;
    });
  },

  /**
   * Deduplica por columna CUPON (blancos no se consideran duplicados)
   * @private
   */
  _deduplicateByCupon(headers, rows) {
    const cuponColName = getConfig('BD.COLUMNS.CUPON', 'CUPON');
    const cuponIdx = Utils.findColumnIndex(headers, cuponColName);

    if (cuponIdx === -1) {
      Logger.warn('SheetsIO._deduplicateByCupon', 'CUPON column not found, skipping dedup');
      return rows;
    }

    const seen = new Set();
    const result = [];

    for (const row of rows) {
      const cupon = Utils.cleanText(row[cuponIdx]);

      // Blancos siempre se conservan
      if (!cupon) {
        result.push(row);
        continue;
      }

      // Deduplicar
      if (!seen.has(cupon)) {
        seen.add(cupon);
        result.push(row);
      }
    }

    return result;
  }
};

