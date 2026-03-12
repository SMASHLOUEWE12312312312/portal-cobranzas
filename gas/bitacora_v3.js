/**
 * @fileoverview Sistema de Bitácora de Gestión de Cobranzas - v3.0
 * @version 3.0.0
 * @date 2025-11-14
 * 
 * ARQUITECTURA v3.0 - CICLO DE COBRANZA:
 * 
 * CONCEPTO CLAVE: CICLO DE COBRANZA
 * - Cada envío de EECC inicia un CICLO de gestión por cliente
 * - Todas las gestiones posteriores (llamadas, WhatsApp, seguimientos) se enlazan al mismo ID_CICLO
 * - El ciclo se cierra cuando el estado es CERRADO_PAGADO o NO_COBRABLE
 * 
 * ESQUEMA DE 14 HEADERS (NO MONTOS, SOLO GESTIÓN):
 * 1.  ID_CICLO                  - Identificador del ciclo de cobranza (ej: envío semana)
 * 2.  ID_GESTION                - Identificador único de cada gestión (fila)
 * 3.  ORIGEN_REGISTRO           - AUTO_ENVIO | MANUAL_PORTAL
 * 4.  FECHA_ENVIO_EECC          - Fecha del envío EECC que creó el ciclo
 * 5.  FECHA_REGISTRO            - Fecha/hora de esta gestión específica
 * 6.  ASEGURADO                 - Nombre del cliente
 * 7.  RUC                       - RUC del cliente
 * 8.  RESPONSABLE               - Usuario que realiza la gestión
 * 9.  TIPO_GESTION              - ENVIO_EECC | LLAMADA | WHATSAPP | etc.
 * 10. ESTADO_GESTION            - SIN_RESPUESTA | EN_SEGUIMIENTO | COMPROMISO_PAGO | etc.
 * 11. CANAL_CONTACTO            - EMAIL | LLAMADA | WHATSAPP | REUNION | OTRO
 * 12. FECHA_COMPROMISO          - Fecha de compromiso de pago (si aplica)
 * 13. PROXIMA_ACCION            - Próximo paso concreto
 * 14. OBSERVACIONES             - Detalles de la gestión
 * 
 * CÁLCULO DINÁMICO (NO ALMACENADO):
 * - dias_desde_registro: Calculado en backend como (HOY - FECHA_REGISTRO)
 * 
 * OPTIMIZACIÓN:
 * - Buffer en memoria + flush batch (v2.0 compatible)
 * - Caché de referencia a hoja
 * - Lectura batch con getValues()
 * - Escritura batch con setValues()
 */

var BitacoraService = BitacoraService || {

  // ========== CONSTANTES ==========

  SHEET_NAME: 'Bitacora_Gestiones_EECC',
  SCHEMA_VERSION: '3.1',  // v3.1: Agrega campos de snapshot de vencidos

  // ========== ZONA HORARIA ==========

  TIMEZONE: 'America/Lima',  // Perú GMT-5

  // ========== BUFFER Y CACHÉ (privado) ==========

  _buffer: null,
  _sheetCache: null,
  _dataCache: null,        // Caché de datos de gestiones
  _dataCacheTime: null,     // Timestamp del caché de datos
  _dataCacheDuration: null, // v3.1: Loaded from config via getter
  _maxBufferSize: 50,
  _flushScheduled: false,

  /**
   * Obtiene duración del caché desde config (Phase 0: 30s, antes era 3s)
   * @private
   */
  _getDataCacheDuration() {
    if (this._dataCacheDuration === null) {
      this._dataCacheDuration = getConfig('FEATURES.BITACORA_CACHE_DURATION_MS', 30000);
    }
    return this._dataCacheDuration;
  },

  // ========== HEADERS v3.1 ==========

  /**
   * Retorna los 16 headers del esquema v3.1
   * @private
   */
  _getHeaders() {
    return [
      'ID_CICLO',
      'ID_GESTION',
      'ORIGEN_REGISTRO',
      'FECHA_ENVIO_EECC',
      'FECHA_REGISTRO',
      'ASEGURADO',
      'RUC',
      'RESPONSABLE',
      'TIPO_GESTION',
      'ESTADO_GESTION',
      'CANAL_CONTACTO',
      'FECHA_COMPROMISO',
      'PROXIMA_ACCION',
      'OBSERVACIONES',
      'SNAPSHOT_VENCIDO_PEN',   // NUEVO: Total vencido en Soles al momento del registro
      'SNAPSHOT_VENCIDO_USD'    // NUEVO: Total vencido en Dólares al momento del registro
    ];
  },

  // ========== INICIALIZACIÓN ==========

  /**
   * Inicializa la hoja de bitácora con el esquema v3.0
   */
  initialize() {
    const context = 'BitacoraService.initialize';
    Logger.info(context, 'Inicializando bitácora v3.0 (ciclos de cobranza)');

    try {
      // FIX: Usar SheetsIO._getSpreadsheet() para obtener el Spreadsheet correcto por ID
      const bitacoraSpreadsheetId = getConfig('BITACORA.SPREADSHEET_ID', getConfig('SPREADSHEET_ID', ''));
      const ss = SheetsIO._getSpreadsheet(bitacoraSpreadsheetId);
      let sheet = ss.getSheetByName(this.SHEET_NAME);

      // Crear si no existe
      if (!sheet) {
        sheet = ss.insertSheet(this.SHEET_NAME);
        Logger.info(context, 'Hoja creada');
      }

      // Configurar headers
      const headers = this._getHeaders();
      const headerRange = sheet.getRange(1, 1, 1, headers.length);

      // Verificar si ya tiene headers válidos v3.0
      const existingHeaders = headerRange.getValues()[0];
      const hasValidHeaders = existingHeaders[0] === 'ID_CICLO' &&
        existingHeaders.length >= headers.length;

      if (!hasValidHeaders) {
        // Escribir headers
        headerRange.setValues([headers])
          .setFontWeight('bold')
          .setBackground('#1a237e')
          .setFontColor('#ffffff')
          .setHorizontalAlignment('center')
          .setVerticalAlignment('middle')
          .setWrap(false);

        // Anchos de columna
        const widths = [140, 140, 130, 120, 140, 200, 100, 120, 130, 150, 120, 120, 200, 300, 120, 120];
        widths.forEach((width, i) => {
          sheet.setColumnWidth(i + 1, width);
        });

        Logger.info(context, 'Headers v3.1 configurados');
      }

      // Congelar primera fila
      sheet.setFrozenRows(1);

      // Nota explicativa
      sheet.getRange('A1').setNote(
        'BITÁCORA DE GESTIÓN DE COBRANZAS v3.0\n\n' +
        'Sistema de registro de ciclos de cobranza y seguimiento.\n\n' +
        'MODELO DE CICLO:\n' +
        '- Cada envío EECC inicia un ciclo (ID_CICLO)\n' +
        '- Gestiones posteriores se enlazan al mismo ID_CICLO\n' +
        '- El ciclo se cierra con CERRADO_PAGADO o NO_COBRABLE\n\n' +
        'IMPORTANTE:\n' +
        '- No editar manualmente esta hoja\n' +
        '- Los registros se generan automática/manualmente\n' +
        '- Compatible con herramientas de BI\n\n' +
        'Versión: ' + this.SCHEMA_VERSION
      );

      Logger.info(context, 'Bitácora v3.0 inicializada');

      return { ok: true, message: 'Bitácora v3.0 inicializada correctamente' };

    } catch (error) {
      Logger.error(context, 'Error al inicializar', error);
      return { ok: false, message: 'Error: ' + error.message };
    }
  },

  // ========== GESTIÓN DE CICLOS ==========

  /**
   * Crea un nuevo ciclo de cobranza (al enviar EECC automático)
   * 
   * @param {Object} datos
   * @param {string} datos.asegurado - Nombre del asegurado
   * @param {string} datos.ruc - RUC del asegurado
   * @param {string} datos.responsable - Usuario responsable (opcional, se obtiene de sesión)
   * @param {string} datos.observaciones - Observaciones iniciales
   * @return {Object} { ok, idCiclo, idGestion }
   */
  crearCiclo(datos) {
    const context = 'BitacoraService.crearCiclo';

    try {
      // Generar IDs
      const idCiclo = this._generarIdCiclo(datos.asegurado);
      const idGestion = this._generarIdGestion();

      // Fecha de envío EECC (hoy en zona horaria de Perú)
      const fechaEnvioEECC = this._getFechaPeru();
      const fechaRegistro = this._getFechaPeru();

      // Responsable
      const responsable = datos.responsable || this._obtenerUsuarioActual();

      // ========== NUEVO v3.1: Calcular snapshot de vencidos ==========
      const esGrupo = datos.esGrupo || GrupoEconomicoService.esGrupo(datos.asegurado);
      const snapshotVencidos = this._calcularSnapshotVencidos(datos.asegurado, esGrupo);

      if (snapshotVencidos.error) {
        Logger.warn(context, 'Snapshot calculado con error, registrando como 0', { error: snapshotVencidos.error });
      }

      // Construir fila (ahora con 16 columnas)
      const fila = [
        idCiclo,                                    // 1. ID_CICLO
        idGestion,                                  // 2. ID_GESTION
        getConfig('BITACORA.ORIGENES.AUTO_ENVIO'), // 3. ORIGEN_REGISTRO
        fechaEnvioEECC,                            // 4. FECHA_ENVIO_EECC
        fechaRegistro,                             // 5. FECHA_REGISTRO
        datos.asegurado,                           // 6. ASEGURADO
        datos.ruc || '',                           // 7. RUC
        responsable,                               // 8. RESPONSABLE
        'ENVIO_EECC',                              // 9. TIPO_GESTION
        'EN_SEGUIMIENTO',                          // 10. ESTADO_GESTION (inicial)
        'EMAIL',                                   // 11. CANAL_CONTACTO
        '',                                        // 12. FECHA_COMPROMISO (vacío inicialmente)
        'Esperar respuesta del cliente',           // 13. PROXIMA_ACCION
        datos.observaciones || 'Envío automático de EECC', // 14. OBSERVACIONES
        snapshotVencidos.vencidoPEN ?? 0,          // 15. SNAPSHOT_VENCIDO_PEN ← NUEVO
        snapshotVencidos.vencidoUSD ?? 0           // 16. SNAPSHOT_VENCIDO_USD ← NUEVO
      ];

      // Bufferizar
      if (!this._buffer) this._buffer = [];
      this._buffer.push({
        fila: fila,
        estado: 'EN_SEGUIMIENTO',
        idCiclo: idCiclo,
        idGestion: idGestion
      });

      // Auto-flush si buffer lleno
      if (this._buffer.length >= this._maxBufferSize) {
        this.flush();
      }

      Logger.info(context, 'Ciclo creado y bufferizado', {
        idCiclo,
        asegurado: datos.asegurado
      });

      return {
        ok: true,
        idCiclo: idCiclo,
        idGestion: idGestion,
        buffered: true
      };

    } catch (error) {
      Logger.error(context, 'Error al crear ciclo', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * ADAPTER: Método de compatibilidad para código legacy
   * Mapea los campos antiguos al formato v3.0 y delega a registrarGestionManual
   * 
   * @param {Object} datos - Datos en formato legacy o v3
   * @return {Object} { ok, idGestion }
   */
  registrarGestion(datos) {
    const context = 'BitacoraService.registrarGestion (adapter)';

    try {
      Logger.info(context, 'Adaptando llamada legacy', {
        tieneIdCiclo: !!datos.idCiclo,
        tieneTipoGestion: !!datos.tipoGestion,
        tieneCanal: !!datos.canal
      });

      // Mapear campos legacy a v3.0
      const datosV3 = {
        idCiclo: datos.idCiclo || null,
        asegurado: datos.asegurado,
        ruc: datos.ruc || '',
        fechaEnvioEECC: datos.fechaEnvioEECC || new Date(),
        fechaGestion: datos.fechaGestion || new Date(),
        tipoGestion: this._mapTipoGestion(datos),
        estadoGestion: this._mapEstado(datos),
        canalContacto: this._mapCanal(datos),
        fechaCompromiso: datos.fechaCompromiso || null,
        proximaAccion: datos.proximaAccion || datos.proxima_accion || 'Seguimiento',
        observaciones: datos.observaciones || datos.observacion || '',
        responsable: datos.responsable || Session.getActiveUser().getEmail(),
        origen: datos.origen || CONFIG.BITACORA.ORIGENES.MANUAL_PORTAL
      };

      // Delegar a registrarGestionManual
      return this.registrarGestionManual(datosV3);

    } catch (error) {
      Logger.error(context, 'Error en adapter', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Mapea tipo de gestión de formato legacy a v3.0
   * @private
   */
  _mapTipoGestion(datos) {
    if (datos.tipoGestion) return datos.tipoGestion;
    if (datos.tipo_gestion) return datos.tipo_gestion;
    if (datos.tipo) return datos.tipo;

    // Inferir de canal si existe
    const canal = (datos.canal || datos.canalContacto || '').toUpperCase();
    const mapeoCanal = {
      'EMAIL': 'CORREO_INDIVIDUAL',
      'CORREO': 'CORREO_INDIVIDUAL',
      'LLAMADA': 'LLAMADA',
      'TELEFONO': 'LLAMADA',
      'WHATSAPP': 'WHATSAPP',
      'REUNION': 'REUNION'
    };
    return mapeoCanal[canal] || 'OTRO';
  },

  /**
   * Mapea estado de gestión de formato legacy a v3.0
   * @private
   */
  _mapEstado(datos) {
    if (datos.estadoGestion) return datos.estadoGestion;
    if (datos.estado_gestion) return datos.estado_gestion;
    if (datos.estado) return datos.estado;

    // Default según contexto
    if (datos.fechaCompromiso) return 'COMPROMISO_PAGO';
    return 'EN_SEGUIMIENTO';
  },

  /**
   * Mapea canal de contacto de formato legacy a v3.0
   * @private
   */
  _mapCanal(datos) {
    if (datos.canalContacto) return datos.canalContacto;
    if (datos.canal_contacto) return datos.canal_contacto;
    if (datos.canal) return datos.canal.toUpperCase();

    // Inferir del tipo de gestión
    const tipo = (datos.tipoGestion || datos.tipo || '').toUpperCase();
    const mapeoTipo = {
      'ENVIO_EECC': 'EMAIL',
      'CORREO_INDIVIDUAL': 'EMAIL',
      'LLAMADA': 'LLAMADA',
      'WHATSAPP': 'WHATSAPP',
      'REUNION': 'REUNION'
    };
    return mapeoTipo[tipo] || 'OTRO';
  },

  /**
   * Registra una gestión manual en un ciclo existente
   * 
   * @param {Object} datos
   * @param {string} datos.idCiclo - ID del ciclo existente
   * @param {string} datos.asegurado - Nombre del asegurado
   * @param {string} datos.ruc - RUC
   * @param {string} datos.tipoGestion - LLAMADA | WHATSAPP | etc.
   * @param {string} datos.estadoGestion - SIN_RESPUESTA | COMPROMISO_PAGO | etc.
   * @param {string} datos.canalContacto - LLAMADA | EMAIL | etc.
   * @param {Date} datos.fechaCompromiso - Fecha de compromiso (opcional)
   * @param {string} datos.proximaAccion - Próximo paso
   * @param {string} datos.observaciones - Detalles
   * @return {Object} { ok, idGestion }
   */
  registrarGestionManual(datos) {
    const context = 'BitacoraService.registrarGestionManual';

    try {
      // Validar datos requeridos (idCiclo es opcional - se generará si no existe)
      if (!datos.asegurado || !datos.tipoGestion ||
        !datos.estadoGestion || !datos.canalContacto || !datos.proximaAccion) {
        throw new Error('Faltan campos obligatorios');
      }

      // Si no hay idCiclo, generar uno nuevo (nuevo ciclo)
      const idCiclo = datos.idCiclo || this._generarIdCiclo(datos.asegurado);
      const esNuevoCiclo = !datos.idCiclo;

      if (esNuevoCiclo) {
        Logger.info(context, 'Creando nuevo ciclo', { idCiclo, asegurado: datos.asegurado });
      }

      // Validar FECHA_COMPROMISO si el estado lo requiere
      const estadoConfig = getConfig(`BITACORA.ESTADOS.${datos.estadoGestion}`);
      if (estadoConfig && estadoConfig.requiereFechaCompromiso && !datos.fechaCompromiso) {
        throw new Error(`Estado ${datos.estadoGestion} requiere FECHA_COMPROMISO`);
      }

      // Obtener FECHA_ENVIO_EECC: usar la proporcionada o buscar del ciclo (si existe)
      let fechaEnvioEECC;
      if (datos.fechaEnvioEECC) {
        // Usuario proporcionó fecha manualmente
        fechaEnvioEECC = this._parseDate(datos.fechaEnvioEECC);
      } else if (esNuevoCiclo) {
        // Nuevo ciclo - usar fecha de la gestión (o hoy)
        fechaEnvioEECC = datos.fechaGestion
          ? this._parseDate(datos.fechaGestion)
          : this._getFechaPeru();
      } else {
        // Ciclo existente - buscar fecha original
        fechaEnvioEECC = this._obtenerFechaEnvioEECC(idCiclo);
      }

      // Generar nuevo ID_GESTION
      const idGestion = this._generarIdGestion();

      // Fecha de registro: usar la proporcionada (fechaGestion) o la actual
      const fechaRegistro = datos.fechaGestion
        ? this._parseDate(datos.fechaGestion)
        : this._getFechaPeru();

      // Responsable desde sesión
      const responsable = this._obtenerUsuarioActual();

      // ========== NUEVO v3.1: Calcular snapshot de vencidos ==========
      const esGrupo = datos.esGrupo || GrupoEconomicoService.esGrupo(datos.asegurado);
      const snapshotVencidos = this._calcularSnapshotVencidos(datos.asegurado, esGrupo);

      if (snapshotVencidos.error) {
        Logger.warn(context, 'Snapshot calculado con error, registrando como 0', { error: snapshotVencidos.error });
      }

      Logger.info(context, 'Snapshot de vencidos calculado', {
        asegurado: datos.asegurado,
        esGrupo: esGrupo,
        vencidoPEN: snapshotVencidos.vencidoPEN,
        vencidoUSD: snapshotVencidos.vencidoUSD
      });

      // Construir fila (ahora con 16 columnas)
      const fila = [
        idCiclo,                                           // 1. ID_CICLO (puede ser nuevo o existente)
        idGestion,                                         // 2. ID_GESTION
        getConfig('BITACORA.ORIGENES.MANUAL_PORTAL'),     // 3. ORIGEN_REGISTRO
        fechaEnvioEECC,                                   // 4. FECHA_ENVIO_EECC (del ciclo)
        fechaRegistro,                                    // 5. FECHA_REGISTRO
        datos.asegurado,                                  // 6. ASEGURADO
        datos.ruc || '',                                  // 7. RUC
        responsable,                                      // 8. RESPONSABLE
        datos.tipoGestion,                                // 9. TIPO_GESTION
        datos.estadoGestion,                              // 10. ESTADO_GESTION
        datos.canalContacto,                              // 11. CANAL_CONTACTO
        datos.fechaCompromiso || '',                      // 12. FECHA_COMPROMISO
        datos.proximaAccion,                              // 13. PROXIMA_ACCION
        datos.observaciones || '',                        // 14. OBSERVACIONES
        snapshotVencidos.vencidoPEN ?? 0,                 // 15. SNAPSHOT_VENCIDO_PEN ← NUEVO
        snapshotVencidos.vencidoUSD ?? 0                  // 16. SNAPSHOT_VENCIDO_USD ← NUEVO
      ];

      // Bufferizar
      if (!this._buffer) this._buffer = [];
      this._buffer.push({
        fila: fila,
        estado: datos.estadoGestion,
        idCiclo: idCiclo,
        idGestion: idGestion
      });

      // Auto-flush si buffer lleno
      if (this._buffer.length >= this._maxBufferSize) {
        this.flush();
      }

      Logger.info(context, 'Gestión manual bufferizada', {
        idGestion,
        idCiclo: idCiclo,
        esNuevoCiclo: esNuevoCiclo,
        tipo: datos.tipoGestion
      });

      return {
        ok: true,
        idGestion: idGestion,
        idCiclo: idCiclo,
        esNuevoCiclo: esNuevoCiclo,
        buffered: true,
        snapshotVencidoPEN: snapshotVencidos.vencidoPEN,  // NUEVO
        snapshotVencidoUSD: snapshotVencidos.vencidoUSD   // NUEVO
      };

    } catch (error) {
      Logger.error(context, 'Error al registrar gestión manual', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Registra una gestión para todo un grupo económico
   * // GRUPO_ECONOMICO - NUEVA LÓGICA
   * @param {Object} datos - Mismos datos que registrarGestionManual, pero 'asegurado' es el nombre del grupo
   */
  registrarGestionGrupo(datos) {
    const context = 'BitacoraService.registrarGestionGrupo';
    Logger.info(context, 'Iniciando registro grupal', { grupo: datos.asegurado });

    try {
      const grupoNombre = datos.asegurado;
      const asegurados = GrupoEconomicoService.getAsegurados(grupoNombre);

      if (!asegurados || asegurados.length === 0) {
        throw new Error(`Grupo ${grupoNombre} no tiene asegurados`);
      }

      let count = 0;
      const errors = [];

      for (const asegurado of asegurados) {
        try {
          // Clonar datos y reemplazar asegurado
          const datosIndividual = { ...datos, asegurado: asegurado };

          // Agregar nota de grupo en observaciones si no existe
          if (!datosIndividual.observaciones.includes(`Grupo: ${grupoNombre}`)) {
            datosIndividual.observaciones = `[Grupo: ${grupoNombre}] ${datosIndividual.observaciones}`;
          }

          this.registrarGestionManual(datosIndividual);
          count++;
        } catch (e) {
          errors.push({ asegurado, error: e.message });
        }
      }

      return {
        ok: true,
        count: count,
        errors: errors,
        message: `Registradas ${count} gestiones para el grupo ${grupoNombre}`
      };

    } catch (error) {
      Logger.error(context, 'Error en registro grupal', error);
      return { ok: false, error: error.message };
    }
  },

  // ========== CONSULTAS ==========

  /**
   * Obtiene todas las gestiones de un cliente (por ID_CICLO o ASEGURADO)
   * 
   * @param {Object} filtros
   * @param {string} filtros.asegurado - Nombre del asegurado (opcional)
   * @param {string} filtros.idCiclo - ID del ciclo (opcional)
   * @return {Array<Object>} Lista de gestiones
   */
  obtenerGestiones(filtros = {}) {
    const context = 'BitacoraService.obtenerGestiones';

    try {
      let gestiones;
      const ahora = Date.now();

      // ⚡ OPTIMIZACIÓN: Verificar caché en memoria (misma invocación) o leer de sheet
      const cacheDuration = this._getDataCacheDuration();
      if (this._dataCache && this._dataCacheTime && (ahora - this._dataCacheTime < cacheDuration)) {
        gestiones = this._dataCache;
      } else {
        // Leer del sheet
        const sheet = this._getOrCreateSheetCached();
        const lastRow = sheet.getLastRow();

        if (lastRow < 2) {
          return [];  // Sin datos
        }

        // Leer TODAS las filas en batch
        const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();

        // Mapear a objetos
        gestiones = data.map(fila => this._filaToObject(fila));

        // Guardar en caché en memoria (útil si se llama múltiples veces en la misma invocación)
        this._dataCache = gestiones;
        this._dataCacheTime = ahora;
      }

      // Aplicar filtros
      let resultado = gestiones;

      if (filtros.asegurado) {
        const asegBuscar = Utils.cleanText(filtros.asegurado);
        resultado = resultado.filter(g =>
          Utils.cleanText(g.asegurado) === asegBuscar
        );
      }

      if (filtros.idCiclo) {
        resultado = resultado.filter(g => g.idCiclo === filtros.idCiclo);
      }

      // Ordenar por FECHA_REGISTRO desc
      resultado.sort((a, b) => b.fechaRegistro - a.fechaRegistro);

      return resultado;

    } catch (error) {
      Logger.error(context, 'Error al obtener gestiones', error);
      return [];
    }
  },

  /**
   * Obtiene el resumen de ciclos (última gestión del ciclo más reciente de cada asegurado)
   * Calcula días_desde_registro dinámicamente
   * 
   * @param {Object} filtros
   * @param {Object} opciones - { page, pageSize }
   * @return {Object} { data: [], pagination: {} } - Contrato fijo v4.1+
   */
  obtenerResumenCiclos(filtros = {}, opciones = {}) {
    const context = 'BitacoraService.obtenerResumenCiclos';

    try {
      const todasGestiones = this.obtenerGestiones();

      // PASO 1: Agrupar por ASEGURADO (normalizado para evitar duplicados por espacios)
      const aseguradosMap = {};

      todasGestiones.forEach(g => {
        // Normalizar nombre del asegurado (sin espacios extra, mayúsculas)
        const aseguradoNormalizado = Utils.cleanText(g.asegurado);

        if (!aseguradosMap[aseguradoNormalizado]) {
          aseguradosMap[aseguradoNormalizado] = {
            nombreOriginal: g.asegurado,  // Guardar el nombre original
            gestiones: []
          };
        }
        aseguradosMap[aseguradoNormalizado].gestiones.push(g);
      });

      // PASO 2: Para cada asegurado, obtener la gestión más reciente de todos sus ciclos
      const resumen = [];
      const hoy = this._getFechaPeru();

      const aseguradoKeys = Object.keys(aseguradosMap);

      aseguradoKeys.forEach(aseguradoNormalizado => {
        const { nombreOriginal, gestiones: todasGestionesAsegurado } = aseguradosMap[aseguradoNormalizado];

        // Ordenar TODAS las gestiones del asegurado por FECHA_REGISTRO desc (más reciente primero)
        todasGestionesAsegurado.sort((a, b) => {
          const fechaA = a.fechaRegistro instanceof Date ? a.fechaRegistro.getTime() : 0;
          const fechaB = b.fechaRegistro instanceof Date ? b.fechaRegistro.getTime() : 0;
          return fechaB - fechaA;  // Más reciente primero
        });

        // Tomar la gestión más reciente (sin importar de qué ciclo sea)
        const ultimaGestion = todasGestionesAsegurado[0];

        // Contar cuántos ciclos diferentes tiene este asegurado
        const ciclosUnicos = [...new Set(todasGestionesAsegurado.map(g => g.idCiclo))];

        // ========== NUEVO: Calcular variación de deuda vs gestión anterior ==========
        let deltaVencidoPEN = null;
        let deltaVencidoUSD = null;
        let deltaPercentPEN = null;
        let deltaPercentUSD = null;
        let tendenciaPEN = 'SIN_CAMBIO';  // SIN_CAMBIO | AUMENTO | DISMINUCION | PRIMERA
        let tendenciaUSD = 'SIN_CAMBIO';

        if (todasGestionesAsegurado.length > 1) {
          // Tomar la gestión anterior (segunda más reciente)
          const gestionAnterior = todasGestionesAsegurado[1];

          const vencidoPENActual = ultimaGestion.snapshotVencidoPEN || 0;
          const vencidoPENAnterior = gestionAnterior.snapshotVencidoPEN || 0;
          const vencidoUSDActual = ultimaGestion.snapshotVencidoUSD || 0;
          const vencidoUSDAnterior = gestionAnterior.snapshotVencidoUSD || 0;

          // Calcular deltas
          deltaVencidoPEN = Math.round((vencidoPENActual - vencidoPENAnterior) * 100) / 100;
          deltaVencidoUSD = Math.round((vencidoUSDActual - vencidoUSDAnterior) * 100) / 100;

          // Calcular porcentaje de variación
          if (vencidoPENAnterior > 0) {
            deltaPercentPEN = Math.round((deltaVencidoPEN / vencidoPENAnterior) * 10000) / 100; // 2 decimales
          } else if (vencidoPENActual > 0) {
            deltaPercentPEN = 100; // De 0 a algo = 100% aumento
          } else {
            deltaPercentPEN = 0; // Ambos en 0 = sin cambio
          }
          if (vencidoUSDAnterior > 0) {
            deltaPercentUSD = Math.round((deltaVencidoUSD / vencidoUSDAnterior) * 10000) / 100;
          } else if (vencidoUSDActual > 0) {
            deltaPercentUSD = 100;
          } else {
            deltaPercentUSD = 0;
          }

          // Determinar tendencia
          if (deltaVencidoPEN > 0) tendenciaPEN = 'AUMENTO';
          else if (deltaVencidoPEN < 0) tendenciaPEN = 'DISMINUCION';
          else tendenciaPEN = 'SIN_CAMBIO';

          if (deltaVencidoUSD > 0) tendenciaUSD = 'AUMENTO';
          else if (deltaVencidoUSD < 0) tendenciaUSD = 'DISMINUCION';
          else tendenciaUSD = 'SIN_CAMBIO';
        } else {
          // Primera gestión del asegurado
          tendenciaPEN = 'PRIMERA';
          tendenciaUSD = 'PRIMERA';
        }

        // Calcular días desde INICIO DEL CICLO ACTUAL (fechaEnvioEECC)
        const diasDesdeCiclo = this._calcularDiasDesde(ultimaGestion.fechaEnvioEECC, hoy);
        // Calcular días desde la ÚLTIMA GESTIÓN (fechaRegistro)
        const diasDesdeUltimaGestion = this._calcularDiasDesde(ultimaGestion.fechaRegistro, hoy);

        // Agregar al resumen (usando el nombre original, no el normalizado)
        resumen.push({
          ...ultimaGestion,
          asegurado: nombreOriginal,  // Usar el nombre original para mostrar
          diasDesdeCiclo: diasDesdeCiclo,     // Días desde inicio del ciclo
          diasDesdeRegistro: diasDesdeUltimaGestion,  // Días desde última gestión
          numGestiones: todasGestionesAsegurado.length,  // Total de gestiones del asegurado (todos los ciclos)
          numCiclos: ciclosUnicos.length,  // Total de ciclos del asegurado
          // NUEVO: Campos de variación de deuda
          deltaVencidoPEN: deltaVencidoPEN,
          deltaVencidoUSD: deltaVencidoUSD,
          deltaPercentPEN: deltaPercentPEN,
          deltaPercentUSD: deltaPercentUSD,
          tendenciaPEN: tendenciaPEN,
          tendenciaUSD: tendenciaUSD
        });
      });

      // Aplicar filtros adicionales
      let resultado = resumen;

      if (filtros.asegurado) {
        const asegBuscar = Utils.cleanText(filtros.asegurado);
        resultado = resultado.filter(r =>
          Utils.cleanText(r.asegurado) === asegBuscar
        );
      }

      if (filtros.estadoGestion) {
        resultado = resultado.filter(r => r.estadoGestion === filtros.estadoGestion);
      }

      if (filtros.responsable) {
        resultado = resultado.filter(r => r.responsable === filtros.responsable);
      }

      // Filtro por días desde registro
      if (filtros.diasMin !== undefined) {
        resultado = resultado.filter(r => r.diasDesdeRegistro >= filtros.diasMin);
      }

      if (filtros.diasMax !== undefined) {
        resultado = resultado.filter(r => r.diasDesdeRegistro <= filtros.diasMax);
      }

      // Ordenar por diasDesdeRegistro desc (más antiguo primero para priorizar)
      resultado.sort((a, b) => b.diasDesdeRegistro - a.diasDesdeRegistro);

      Logger.info(context, 'Resumen de ciclos obtenido (1 por asegurado)', { count: resultado.length });

      // ========== PAGINACIÓN - Contrato fijo v4.1+ ==========
      const page = opciones.page || 1;
      const pageSize = Math.min(opciones.pageSize || 50, 100);
      const startIdx = (page - 1) * pageSize;
      const paginatedData = resultado.slice(startIdx, startIdx + pageSize);

      return {
        data: paginatedData,
        pagination: {
          page: page,
          pageSize: pageSize,
          total: resultado.length,
          totalPages: Math.ceil(resultado.length / pageSize),
          hasNext: startIdx + pageSize < resultado.length,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      Logger.error(context, 'Error al obtener resumen', error);
      // Contrato fijo incluso en error - respetar page/pageSize del request
      const page = opciones.page || 1;
      const pageSize = opciones.pageSize || 50;
      return {
        data: [],
        pagination: {
          page: page,
          pageSize: pageSize,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }
  },

  // ========== FLUSH ==========

  /**
   * Escribe todas las gestiones del buffer a Sheets en batch
   */
  flush() {
    const context = 'BitacoraService.flush';
    if (!this._buffer) this._buffer = [];

    if (this._buffer.length === 0) {
      this._flushScheduled = false;
      return { ok: true, count: 0 };
    }

    try {
      const sheet = this._getOrCreateSheetCached();

      // Extraer filas y estados del buffer ANTES de cualquier operación
      const rows = this._buffer.map(item => item.fila);
      const bufferSnapshot = this._buffer.map(item => ({ estado: item.estado }));

      // UNA SOLA operación batch
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rows.length, 16).setValues(rows);

      // Aplicar formatos en batch (usando snapshot, no el buffer mutable)
      this._applyFormatsBatch(sheet, lastRow + 1, rows.length, bufferSnapshot);

      const count = rows.length;

      // 🔥 IMPORTANTE: Limpiar cache ANTES del buffer para evitar lecturas stale
      this._clearCache();

      // Limpiar buffer
      this._buffer = [];
      this._flushScheduled = false;

      // Forzar flush de Sheets para asegurar que los datos se escriban inmediatamente
      SpreadsheetApp.flush();

      Logger.info(context, 'Gestiones escritas en batch y cache limpiado', { count });

      return { ok: true, count };

    } catch (error) {
      Logger.error(context, 'Flush failed', error);
      return { ok: false, count: 0, error: error.message };
    }
  },

  clearBuffer() {
    const count = (this._buffer || []).length;
    this._buffer = [];
    this._flushScheduled = false;
    return { ok: true, cleared: count };
  },

  getBufferSize() {
    return (this._buffer || []).length;
  },

  // ========== HELPERS PRIVADOS ==========

  /**
   * Obtiene la fecha/hora actual en zona horaria de Perú
   * @returns {Date} Fecha ajustada a America/Lima (GMT-5)
   * @private
   */
  _getFechaPeru() {
    return new Date();  // Apps Script automáticamente usa la zona horaria del spreadsheet
  },

  /**
   * Genera ID de ciclo único
   * Formato: CIC_{ASEGURADO_SLUG}_{TIMESTAMP}
   * @private
   */
  _generarIdCiclo(asegurado) {
    const slug = Utils.safeName(asegurado).substring(0, 20);
    const timestamp = Utilities.formatDate(this._getFechaPeru(), this.TIMEZONE, 'yyyyMMdd_HHmmss');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CIC_${slug}_${timestamp}_${random}`;
  },

  /**
   * Genera ID de gestión único
   * Formato: GEST_{TIMESTAMP}_{RANDOM}
   * @private
   */
  _generarIdGestion() {
    const timestamp = Utilities.formatDate(this._getFechaPeru(), this.TIMEZONE, 'yyyyMMdd_HHmmss');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `GEST_${timestamp}_${random}`;
  },

  /**
   * Obtiene FECHA_ENVIO_EECC de un ciclo existente
   * @private
   */
  _obtenerFechaEnvioEECC(idCiclo) {
    try {
      // Intentar buscar en el cache de datos primero (evita lectura completa del sheet)
      const gestiones = this.obtenerGestiones({ idCiclo: idCiclo });
      if (gestiones.length > 0 && gestiones[0].fechaEnvioEECC) {
        return gestiones[0].fechaEnvioEECC;
      }

      // Fallback: buscar directamente en el sheet si no está en cache
      const sheet = this._getOrCreateSheetCached();
      const lastRow = sheet.getLastRow();

      if (lastRow < 2) {
        return new Date();  // Fallback
      }

      const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

      for (let i = 0; i < data.length; i++) {
        if (data[i][0] === idCiclo) {
          return data[i][3];  // FECHA_ENVIO_EECC
        }
      }

      return new Date();  // Fallback si no se encuentra

    } catch (error) {
      Logger.warn('BitacoraService._obtenerFechaEnvioEECC', 'Error', error);
      return new Date();
    }
  },

  /**
   * Obtiene usuario actual desde sesión
   * @private
   */
  _obtenerUsuarioActual() {
    try {
      return Session.getActiveUser().getEmail() || 'system';
    } catch (e) {
      return 'system';
    }
  },

  /**
   * Calcula días transcurridos entre dos fechas (solo días completos, sin horas)
   * @private
   */
  _calcularDiasDesde(fechaRegistro, hoy) {
    if (!fechaRegistro || !(fechaRegistro instanceof Date) || isNaN(fechaRegistro.getTime())) {
      return 0;
    }

    // Normalizar ambas fechas al inicio del día (00:00:00)
    const fechaRegistroNormalizada = new Date(fechaRegistro);
    fechaRegistroNormalizada.setHours(0, 0, 0, 0);

    const hoyNormalizado = new Date(hoy);
    hoyNormalizado.setHours(0, 0, 0, 0);

    // Calcular diferencia en milisegundos y convertir a días
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const diffMs = hoyNormalizado.getTime() - fechaRegistroNormalizada.getTime();
    return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
  },

  /**
   * Convierte fila de Sheets a objeto
   * Asegura que las fechas sean objetos Date válidos
   * @private
   */
  _filaToObject(fila) {
    return {
      idCiclo: fila[0],
      idGestion: fila[1],
      origenRegistro: fila[2],
      fechaEnvioEECC: this._parseDate(fila[3]),
      fechaRegistro: this._parseDate(fila[4]),
      asegurado: fila[5],
      ruc: fila[6],
      responsable: fila[7],
      tipoGestion: fila[8],
      estadoGestion: fila[9],
      canalContacto: fila[10],
      fechaCompromiso: fila[11] ? this._parseDate(fila[11]) : null,
      proximaAccion: fila[12],
      observaciones: fila[13],
      snapshotVencidoPEN: fila[14] !== '' && fila[14] != null ? this._parseNumber(fila[14]) : 0,
      snapshotVencidoUSD: fila[15] !== '' && fila[15] != null ? this._parseNumber(fila[15]) : 0
    };
  },

  /**
   * Convierte una fecha de Sheets a objeto Date
   * Maneja strings, Date objects, y otros formatos
   * @private
   */
  _parseDate(value) {
    if (!value) return null;

    // Si ya es un Date válido, retornar
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }

    // Si es string, intentar parsear
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Si es número (timestamp), convertir (validar resultado)
    if (typeof value === 'number') {
      const d = new Date(value);
      return !isNaN(d.getTime()) ? d : null;
    }

    // Fallback: intentar convertir pero validar
    const fallback = new Date(value);
    return !isNaN(fallback.getTime()) ? fallback : null;
  },

  /**
   * Calcula el total de importes vencidos por moneda para un asegurado o grupo económico.
   * 
   * IMPORTANTE: Este cálculo se realiza al momento del registro y se guarda como snapshot.
   * No debe recalcularse posteriormente.
   * 
   * OPTIMIZACIÓN v4.2: Usa caché para evitar lecturas repetidas de BD
   * 
   * @param {string} asegurado - Nombre del asegurado O nombre del grupo económico
   * @param {boolean} esGrupo - Indica si el asegurado es un grupo económico
   * @return {Object} { vencidoPEN: number, vencidoUSD: number }
   * @private
   */
  _calcularSnapshotVencidos(asegurado, esGrupo = false) {
    const context = 'BitacoraService._calcularSnapshotVencidos';

    try {
      Logger.info(context, 'Calculando snapshot de vencidos', {
        asegurado,
        esGrupo
      });

      // Obtener lista de asegurados a procesar
      let aseguradosAProcesar = [];

      if (esGrupo) {
        // Si es grupo económico, obtener todos los asegurados del grupo
        aseguradosAProcesar = GrupoEconomicoService.getAsegurados(asegurado);

        if (!aseguradosAProcesar || aseguradosAProcesar.length === 0) {
          Logger.warn(context, 'Grupo sin asegurados', { grupo: asegurado });
          return { vencidoPEN: 0, vencidoUSD: 0 };
        }

        Logger.info(context, 'Procesando grupo económico', {
          grupo: asegurado,
          totalAsegurados: aseguradosAProcesar.length
        });
      } else {
        // Si es cliente individual
        aseguradosAProcesar = [asegurado];
      }

      // Normalizar nombres para comparación
      const aseguradosNormalizados = aseguradosAProcesar.map(a => Utils.cleanText(a));

      // OPTIMIZACIÓN v4.2: Usar caché de BD si existe (válido por 60 segundos)
      let bdData = null;
      const CACHE_KEY = 'SNAPSHOT_BD_CACHE';
      const CACHE_TTL = 60; // segundos

      try {
        const cacheService = CacheService.getScriptCache();
        const cachedBD = cacheService.get(CACHE_KEY);

        if (cachedBD) {
          bdData = JSON.parse(cachedBD);
          Logger.info(context, 'Usando BD desde caché (ahorro ~1-2s)');
        }
      } catch (cacheError) {
        // Caché inválido o error de parse, leer fresh
        Logger.warn(context, 'Caché BD inválido, leyendo fresh', { error: cacheError.message });
      }

      if (!bdData) {
        // Leer hoja BD (operación costosa)
        bdData = SheetsIO.readSheet(getConfig('SHEETS.BASE', 'BD'));

        // Intentar cachear para próximas lecturas
        try {
          const cacheService = CacheService.getScriptCache();
          // Solo cachear si no es muy grande (límite CacheService = 100KB)
          const bdString = JSON.stringify({
            headers: bdData.headers,
            rows: bdData.rows,
            columnMap: bdData.columnMap
          });

          if (bdString.length < 95000) { // Dejar margen
            cacheService.put(CACHE_KEY, bdString, CACHE_TTL);
            Logger.info(context, 'BD cacheada exitosamente', { sizeKB: Math.round(bdString.length / 1024) });
          } else {
            Logger.warn(context, 'BD muy grande para cachear', { sizeKB: Math.round(bdString.length / 1024) });
          }
        } catch (cacheError) {
          // Ignorar error de caché - no es crítico
          Logger.warn(context, 'No se pudo cachear BD', { error: cacheError.message });
        }
      }

      if (!bdData || !bdData.rows || bdData.rows.length === 0) {
        Logger.warn(context, 'Hoja BD vacía');
        return { vencidoPEN: 0, vencidoUSD: 0 };
      }

      // Obtener índices de columnas
      const colMap = bdData.columnMap;
      const aseguradoIdx = colMap['ASEGURADO'] ?? -1;
      const importeIdx = colMap['IMPORTE'] ?? -1;
      const monIdx = colMap['MON'] ?? -1;
      const fecVencIdx = colMap['FEC_VENCIMIENTO_COB'] ?? colMap['FEC_VENCIMIENTO COB'] ?? colMap['FEC VENCIMIENTO COB'] ?? -1;

      // Validar columnas necesarias - lanzar error en vez de fallo silencioso
      if (aseguradoIdx === -1 || importeIdx === -1 || fecVencIdx === -1) {
        const missing = [];
        if (aseguradoIdx === -1) missing.push('ASEGURADO');
        if (importeIdx === -1) missing.push('IMPORTE');
        if (fecVencIdx === -1) missing.push('FEC_VENCIMIENTO_COB');
        Logger.error(context, 'Columnas requeridas no encontradas en hoja BD', {
          aseguradoIdx,
          importeIdx,
          fecVencIdx,
          columnasDisponibles: Object.keys(colMap).join(', ')
        });
        return { vencidoPEN: null, vencidoUSD: null, error: `Columnas faltantes: ${missing.join(', ')}` };
      }

      // Fecha de hoy (inicio del día para comparación correcta)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Acumuladores
      let vencidoPEN = 0;
      let vencidoUSD = 0;
      let registrosProcesados = 0;
      let registrosVencidos = 0;

      // Procesar cada fila de BD
      for (const row of bdData.rows) {
        // Obtener nombre del asegurado de la fila
        const aseguradoFila = Utils.cleanText(String(row[aseguradoIdx] || ''));

        // Verificar si este asegurado está en nuestra lista
        if (!aseguradosNormalizados.includes(aseguradoFila)) {
          continue;
        }

        registrosProcesados++;

        // Obtener fecha de vencimiento
        const fecVencValue = row[fecVencIdx];
        const fecVenc = this._parseDate(fecVencValue);

        if (!fecVenc) {
          continue; // Si no tiene fecha de vencimiento, no se considera
        }

        // Verificar si está vencido (fecha de vencimiento < hoy)
        fecVenc.setHours(0, 0, 0, 0);
        if (fecVenc >= hoy) {
          continue; // No está vencido
        }

        registrosVencidos++;

        // Obtener importe
        const importeRaw = row[importeIdx];
        const importe = this._parseNumber(importeRaw);

        if (importe <= 0) {
          continue; // Ignorar importes negativos o cero
        }

        // Determinar moneda
        const moneda = String(row[monIdx] || 'PEN').toUpperCase();
        const esUSD = moneda.includes('USD') || moneda.includes('US$') ||
          moneda.includes('DOLAR') || moneda.includes('DOLLAR');

        // Acumular según moneda
        if (esUSD) {
          vencidoUSD += importe;
        } else {
          vencidoPEN += importe;
        }
      }

      // Redondear a 2 decimales
      vencidoPEN = Math.round(vencidoPEN * 100) / 100;
      vencidoUSD = Math.round(vencidoUSD * 100) / 100;

      Logger.info(context, 'Snapshot calculado exitosamente', {
        asegurado,
        esGrupo,
        registrosProcesados,
        registrosVencidos,
        vencidoPEN,
        vencidoUSD
      });

      return { vencidoPEN, vencidoUSD };

    } catch (error) {
      Logger.error(context, 'Error calculando snapshot', error);
      return { vencidoPEN: 0, vencidoUSD: 0 };
    }
  },

  /**
   * Parsea un valor numérico (maneja strings con formato)
   * @private
   */
  _parseNumber(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const cleaned = String(value).replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Obtiene o crea hoja con caché
   * @private
   */
  _getOrCreateSheetCached() {
    if (this._sheetCache) {
      return this._sheetCache;
    }
    // FIX: Usar SheetsIO._getSpreadsheet() para obtener el Spreadsheet correcto por ID
    const bitacoraSpreadsheetId = getConfig('BITACORA.SPREADSHEET_ID', getConfig('SPREADSHEET_ID', ''));
    const ss = SheetsIO._getSpreadsheet(bitacoraSpreadsheetId);
    let sheet = ss.getSheetByName(this.SHEET_NAME);

    if (!sheet) {
      const initResult = this.initialize();
      if (!initResult.ok) {
        throw new Error('No se pudo inicializar bitácora');
      }
      sheet = ss.getSheetByName(this.SHEET_NAME);
    }

    this._sheetCache = sheet;
    return sheet;
  },

  /**
   * Aplica formatos en batch
   * @private
   */
  _applyFormatsBatch(sheet, startRow, numRows, bufferSnapshot) {
    if (numRows === 0) return;

    try {
      // Formatos de fecha
      sheet.getRange(startRow, 4, numRows, 1).setNumberFormat('dd/mm/yyyy');      // FECHA_ENVIO_EECC
      sheet.getRange(startRow, 5, numRows, 1).setNumberFormat('dd/mm/yyyy hh:mm'); // FECHA_REGISTRO
      sheet.getRange(startRow, 12, numRows, 1).setNumberFormat('dd/mm/yyyy');     // FECHA_COMPROMISO

      // Colores por estado (columna 10 = ESTADO_GESTION)
      const backgroundColors = [];
      const fontColors = [];

      for (let i = 0; i < numRows; i++) {
        const estado = bufferSnapshot[i] ? bufferSnapshot[i].estado : '';
        const config = this._getEstadoColorConfig(estado);
        backgroundColors.push([config.bgColor]);
        fontColors.push([config.color]);
      }

      sheet.getRange(startRow, 10, numRows, 1).setBackgrounds(backgroundColors);
      sheet.getRange(startRow, 10, numRows, 1).setFontColors(fontColors);

      // v3.1: Formatos de moneda para columnas de snapshot
      sheet.getRange(startRow, 15, numRows, 1).setNumberFormat('#,##0.00'); // SNAPSHOT_VENCIDO_PEN
      sheet.getRange(startRow, 16, numRows, 1).setNumberFormat('#,##0.00'); // SNAPSHOT_VENCIDO_USD

    } catch (error) {
      Logger.warn('BitacoraService._applyFormatsBatch', 'Error al aplicar formatos', error);
    }
  },

  /**
   * Obtiene configuración de color por estado
   * @private
   */
  _getEstadoColorConfig(estado) {
    const estadoConfig = getConfig(`BITACORA.ESTADOS.${estado}`);

    if (estadoConfig) {
      return {
        color: estadoConfig.color,
        bgColor: estadoConfig.bgColor
      };
    }

    // Fallback
    return { color: '#616161', bgColor: '#F5F5F5' };
  },

  _clearCache() {
    this._sheetCache = null;
    this._dataCache = null;
    this._dataCacheTime = null;
  },

  /**
   * Obtiene todos los compromisos de pago activos
   * LÓGICA MEJORADA:
   * - Agrupa por cliente (asegurado)
   * - Toma solo la ÚLTIMA gestión de cada cliente
   * - Verifica si esa última gestión tiene compromiso activo
   * - Excluye clientes cuya última gestión fue derivada o cerrada
   * 
   * @return {Array<Object>} Lista de compromisos activos (1 por cliente máximo)
   */
  obtenerCompromisosActivos() {
    const context = 'BitacoraService.obtenerCompromisosActivos';

    try {
      // Obtener todas las gestiones
      const todasGestiones = this.obtenerGestiones();

      Logger.info(context, `Procesando ${todasGestiones.length} gestiones totales`);

      // PASO 1: Agrupar por asegurado (normalizado)
      const aseguradosMap = {};

      todasGestiones.forEach(g => {
        const aseguradoNormalizado = Utils.cleanText(g.asegurado);

        if (!aseguradosMap[aseguradoNormalizado]) {
          aseguradosMap[aseguradoNormalizado] = {
            nombreOriginal: g.asegurado,
            gestiones: []
          };
        }

        aseguradosMap[aseguradoNormalizado].gestiones.push(g);
      });

      Logger.info(context, `${Object.keys(aseguradosMap).length} clientes únicos encontrados`);

      // PASO 2: Para cada cliente, obtener su ÚLTIMA gestión
      const compromisosActivos = [];

      // Estados que indican que el ciclo está cerrado o derivado (NO notificar)
      const estadosInactivos = [
        'CERRADO_PAGADO',
        'NO_COBRABLE',
        'DERIVADO_COMERCIAL',
        'DERIVADO_RRHH',
        'DERIVADO_RIESGOS_GENERALES'
      ];

      Object.keys(aseguradosMap).forEach(aseguradoNormalizado => {
        const { nombreOriginal, gestiones } = aseguradosMap[aseguradoNormalizado];

        // Ordenar gestiones por fecha de registro desc (más reciente primero)
        gestiones.sort((a, b) => {
          const fechaA = a.fechaRegistro instanceof Date ? a.fechaRegistro.getTime() : 0;
          const fechaB = b.fechaRegistro instanceof Date ? b.fechaRegistro.getTime() : 0;
          return fechaB - fechaA;
        });

        // Tomar la ÚLTIMA gestión
        const ultimaGestion = gestiones[0];

        // Verificar si la última gestión califica para notificación
        const esEstadoInactivo = estadosInactivos.includes(ultimaGestion.estadoGestion);
        const tieneFechaCompromiso = ultimaGestion.fechaCompromiso &&
          (ultimaGestion.fechaCompromiso instanceof Date);

        // Verificar si el compromiso está vencido
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const compromisoVencido = tieneFechaCompromiso && ultimaGestion.fechaCompromiso < hoy;

        // Solo agregar si tiene fecha de compromiso y NO está en estado inactivo
        if (tieneFechaCompromiso && !esEstadoInactivo) {
          compromisosActivos.push({
            ...ultimaGestion,
            asegurado: nombreOriginal,
            compromisoVencido: compromisoVencido
          });
        }
      });

      // PASO 3: Ordenar por fecha de compromiso (más próximos primero)
      compromisosActivos.sort((a, b) => {
        const fechaA = a.fechaCompromiso.getTime();
        const fechaB = b.fechaCompromiso.getTime();
        return fechaA - fechaB;
      });

      Logger.info(context, `📊 Resultado final: ${compromisosActivos.length} compromisos activos (1 por cliente)`);

      return compromisosActivos;

    } catch (error) {
      Logger.error(context, 'Error al obtener compromisos activos', error);
      return [];
    }
  },

  /**
   * FUNCIÓN DE BACKFILL - Solo para uso único
   * 
   * Actualiza las gestiones existentes que no tienen snapshot de vencidos,
   * calculando los valores ACTUALES (de hoy) de la hoja BD.
   * 
   * IMPORTANTE: Esta función debe ejecutarse UNA SOLA VEZ después del deploy.
   * Los valores calculados serán los del momento de ejecución, no los históricos.
   * 
   * @param {Object} opciones
   * @param {boolean} opciones.dryRun - Si true, solo muestra qué se actualizaría sin guardar
   * @param {number} opciones.limite - Máximo de filas a procesar (default: todas)
   * @return {Object} { ok, totalProcesadas, totalActualizadas, errores, detalles }
   */
  backfillSnapshotsExistentes(opciones = {}) {
    const context = 'BitacoraService.backfillSnapshotsExistentes';
    const dryRun = opciones.dryRun || false;
    const limite = opciones.limite || 9999;

    Logger.info(context, 'Iniciando backfill de snapshots', { dryRun, limite });

    try {
      const sheet = this._getOrCreateSheetCached();
      const lastRow = sheet.getLastRow();

      if (lastRow < 2) {
        return { ok: true, totalProcesadas: 0, totalActualizadas: 0, mensaje: 'No hay gestiones' };
      }

      // Leer TODAS las filas (16 columnas)
      const numRows = Math.min(lastRow - 1, limite);
      const data = sheet.getRange(2, 1, numRows, 16).getValues();

      const detalles = [];
      let totalActualizadas = 0;
      const filasParaActualizar = [];

      for (let i = 0; i < data.length; i++) {
        const fila = data[i];
        const rowNum = i + 2; // Fila real en la hoja

        // Columnas: 0=ID_CICLO, 5=ASEGURADO, 14=SNAPSHOT_PEN, 15=SNAPSHOT_USD
        const asegurado = fila[5];
        const snapshotPEN = fila[14];
        const snapshotUSD = fila[15];

        // Solo procesar si los snapshots están vacíos o son 0
        const necesitaActualizar = !snapshotPEN && !snapshotUSD;

        if (!necesitaActualizar) {
          continue; // Ya tiene snapshot, saltar
        }

        if (!asegurado) {
          detalles.push({ fila: rowNum, error: 'Sin asegurado' });
          continue;
        }

        // Detectar si es grupo económico
        const esGrupo = GrupoEconomicoService.esGrupo(asegurado);

        // Calcular snapshot actual
        const snapshot = this._calcularSnapshotVencidos(asegurado, esGrupo);

        detalles.push({
          fila: rowNum,
          asegurado: asegurado,
          esGrupo: esGrupo,
          vencidoPEN: snapshot.vencidoPEN,
          vencidoUSD: snapshot.vencidoUSD
        });

        // Guardar para actualización batch
        filasParaActualizar.push({
          rowNum: rowNum,
          vencidoPEN: snapshot.vencidoPEN,
          vencidoUSD: snapshot.vencidoUSD
        });

        totalActualizadas++;
      }

      // Si NO es dry run, actualizar las filas
      if (!dryRun && filasParaActualizar.length > 0) {
        Logger.info(context, `Actualizando ${filasParaActualizar.length} filas...`);

        // Actualizar en batch por columna para eficiencia
        for (const item of filasParaActualizar) {
          // Columna 15 = SNAPSHOT_VENCIDO_PEN (índice 15, columna O)
          // Columna 16 = SNAPSHOT_VENCIDO_USD (índice 16, columna P)
          sheet.getRange(item.rowNum, 15).setValue(item.vencidoPEN);
          sheet.getRange(item.rowNum, 16).setValue(item.vencidoUSD);
        }

        // Aplicar formatos de moneda
        for (const item of filasParaActualizar) {
          sheet.getRange(item.rowNum, 15).setNumberFormat('#,##0.00');
          sheet.getRange(item.rowNum, 16).setNumberFormat('#,##0.00');
        }

        SpreadsheetApp.flush();
        Logger.info(context, 'Backfill completado y guardado');
      }

      // Limpiar caché
      this._clearCache();

      const resultado = {
        ok: true,
        dryRun: dryRun,
        totalProcesadas: data.length,
        totalActualizadas: totalActualizadas,
        totalSinCambios: data.length - totalActualizadas,
        detalles: detalles.slice(0, 20) // Solo primeros 20 para no saturar
      };

      Logger.info(context, 'Backfill finalizado', resultado);

      return resultado;

    } catch (error) {
      Logger.error(context, 'Error en backfill', error);
      return { ok: false, error: error.message };
    }
  },

  // ========== CICLOS ACTIVOS (para AlertService) ==========

  /**
   * Obtiene ciclos activos (no cerrados) con última gestión
   * Usado por AlertService para generar alertas de "sin gestión"
   * @returns {Array} Lista de ciclos activos con info de última gestión
   */
  getCiclosActivos() {
    const context = 'BitacoraService.getCiclosActivos';

    try {
      // Estados que consideramos "cerrados" o "inactivos"
      const estadosInactivos = [
        'CERRADO_PAGADO',
        'NO_COBRABLE',
        'NO_CONTACTABLE'
      ];

      // Obtener resumen de ciclos (1 por asegurado)
      const resultado = this.obtenerResumenCiclos({}, { page: 1, pageSize: 1000 });

      if (!resultado || !resultado.data) {
        return [];
      }

      // Filtrar solo los activos
      const ciclosActivos = resultado.data.filter(ciclo => {
        return !estadosInactivos.includes(ciclo.estadoGestion);
      });

      // Transformar al formato esperado por AlertService
      return ciclosActivos.map(ciclo => ({
        idCiclo: ciclo.idCiclo,
        asegurado: ciclo.asegurado,
        ruc: ciclo.ruc,
        responsable: ciclo.responsable,
        estadoGestion: ciclo.estadoGestion,
        ultimaGestion: ciclo.fechaRegistro,  // Fecha de última gestión
        fechaEnvioEECC: ciclo.fechaEnvioEECC,
        diasDesdeRegistro: ciclo.diasDesdeRegistro,
        snapshotVencidoPEN: ciclo.snapshotVencidoPEN || 0,
        snapshotVencidoUSD: ciclo.snapshotVencidoUSD || 0
      }));

    } catch (error) {
      Logger.error(context, 'Error obteniendo ciclos activos', error);
      return [];
    }
  }
};