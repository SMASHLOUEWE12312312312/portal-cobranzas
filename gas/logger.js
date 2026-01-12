/**
 * @fileoverview Sistema de logging estructurado con procesamiento batch
 * @version 2.1.0 - Optimizado para reducir llamadas a SpreadsheetApp + correlationId
 * 
 * MEJORAS v2.1 (Phase 0):
 * - correlationId para trazabilidad end-to-end
 * - Migración suave de headers (6 → 7 columnas)
 * 
 * MEJORAS v2.0:
 * - Buffer de logs en memoria (no escribe inmediatamente)
 * - Flush batch: 1 operación para N logs
 * - Caché de referencia a la hoja
 * - Auto-flush cuando buffer alcanza límite
 * - API pública 100% compatible con v1.0
 * 
 * IMPACTO:
 * Antes: 200 logs = 200 appendRow() = 200 operaciones
 * Después: 200 logs = 1 setValues() = 1 operación (-99.5%)
 */

const Logger = {
  /**
   * Niveles de log
   */
  LEVEL: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  },

  // ========== BUFFER Y CACHÉ (privado) ==========

  /**
   * Buffer de logs en memoria
   * @private
   */
  _buffer: [],

  /**
   * Tamaño máximo del buffer antes de auto-flush
   * @private
   */
  _maxBufferSize: 100,

  /**
   * Caché de referencia a la hoja de logs
   * @private
   */
  _sheetCache: null,

  /**
   * Flag para indicar si hay flush programado
   * @private
   */
  _flushScheduled: false,

  /**
   * Current correlation ID for end-to-end tracing
   * @private
   */
  _currentCorrelationId: null,

  // ========== CORRELATION ID API (Phase 0) ==========

  /**
   * Sets correlation ID for current operation
   * @param {string} id - Correlation ID (typically UUID)
   */
  setCorrelationId(id) {
    this._currentCorrelationId = id;
  },

  /**
   * Gets current correlation ID
   * @return {string|null} Current correlation ID or null
   */
  getCorrelationId() {
    return this._currentCorrelationId;
  },

  /**
   * Clears correlation ID
   */
  clearCorrelationId() {
    this._currentCorrelationId = null;
  },

  /**
   * Wrapper to execute function with correlation ID
   * Generates new UUID, sets it, executes fn, clears it
   * 
   * @param {Function} fn - Function to execute
   * @return {Function} Wrapped function
   */
  withCorrelation(fn) {
    const self = this;
    const correlationId = Utilities.getUuid();
    return function (...args) {
      self._currentCorrelationId = correlationId;
      try {
        return fn.apply(this, args);
      } finally {
        self._currentCorrelationId = null;
      }
    };
  },

  // ========== API PÚBLICA (compatible con v1.0) ==========

  /**
   * Registra log en buffer (no escribe inmediatamente a Sheets)
   * 
   * COMPORTAMIENTO:
   * - Agrega entrada al buffer en memoria
   * - Auto-flush si buffer alcanza _maxBufferSize
   * - Escribe efectiva a Sheets solo en flush()
   * 
   * @param {string} level - Nivel del log
   * @param {string} context - Contexto/función origen
   * @param {string} message - Mensaje
   * @param {Object} extra - Datos adicionales
   */
  log(level, context, message, extra = {}) {
    try {
      if (!getConfig('FEATURES.ENABLE_DEBUG_LOGGING', true)) return;

      // Construir entrada de log
      const entry = {
        timestamp: new Date(),
        level: level,
        context: context,
        message: message,
        extra: Object.keys(extra).length > 0 ? JSON.stringify(extra) : '',
        user: this._getCurrentUser(),
        correlationId: this._currentCorrelationId || ''
      };

      // Agregar al buffer (NO escribir a Sheets todavía)
      this._buffer.push(entry);

      // Auto-flush si buffer lleno
      if (this._buffer.length >= this._maxBufferSize) {
        this.flush();
      }

      // Fallback a console para debugging local
      if (typeof console !== 'undefined' && console.log) {
        console.log(`[${level}] ${context}: ${message}`, extra);
      }

    } catch (e) {
      // Fallback a console para evitar loops
      if (typeof console !== 'undefined' && console.error) {
        console.error('Logger.log failed:', e.message);
      }
    }
  },

  /**
   * Escribe todos los logs del buffer a Sheets en una sola operación
   * 
   * CUÁNDO LLAMAR:
   * - Al final de un flujo principal (ej: después de enviar correos)
   * - Manualmente cuando se desea persistir logs
   * - Automáticamente cuando buffer alcanza _maxBufferSize
   * 
   * @return {Object} { ok: boolean, count: number, error?: string }
   */
  flush() {
    const context = 'Logger.flush';

    // Si no hay logs en buffer, no hacer nada
    if (this._buffer.length === 0) {
      this._flushScheduled = false;
      return { ok: true, count: 0 };
    }

    try {
      // Obtener o crear hoja (con caché)
      const logSheet = this._getOrCreateSheet();

      // Convertir buffer a matriz 2D para setValues() (7 columnas con correlationId)
      const rows = this._buffer.map(entry => [
        entry.timestamp,
        entry.level,
        entry.context,
        entry.message,
        entry.extra,
        entry.user,
        entry.correlationId || ''
      ]);

      // UNA SOLA operación para escribir TODOS los logs (7 columnas)
      const lastRow = logSheet.getLastRow();
      logSheet.getRange(lastRow + 1, 1, rows.length, 7).setValues(rows);

      const count = rows.length;

      // Limpiar buffer después de escribir
      this._buffer = [];
      this._flushScheduled = false;

      // Mantener límite de filas (solo si excede)
      this._enforceRowLimit(logSheet);

      // Log de éxito (en console, no recursivo)
      if (typeof console !== 'undefined' && console.log) {
        console.log(`[Logger] Flushed ${count} logs to Sheets`);
      }

      return { ok: true, count: count };

    } catch (error) {
      // Log de error (en console, no recursivo)
      if (typeof console !== 'undefined' && console.error) {
        console.error('Logger.flush failed:', error.message);
      }

      // NO limpiar buffer en caso de error (permitir reintento)
      return {
        ok: false,
        count: 0,
        error: error.message
      };
    }
  },

  /**
   * Limpia el buffer sin escribir a Sheets
   * Útil para testing o cuando se quiere descartar logs
   */
  clearBuffer() {
    const count = this._buffer.length;
    this._buffer = [];
    this._flushScheduled = false;
    return { ok: true, cleared: count };
  },

  /**
   * Obtiene tamaño actual del buffer
   * Útil para monitoreo
   */
  getBufferSize() {
    return this._buffer.length;
  },

  /**
   * Configura tamaño máximo del buffer
   * @param {number} size - Nuevo tamaño (mínimo 10, máximo 500)
   */
  setMaxBufferSize(size) {
    if (size < 10 || size > 500) {
      throw new Error('Buffer size debe estar entre 10 y 500');
    }
    this._maxBufferSize = size;
  },

  // ========== MÉTODOS DE CONVENIENCIA (API pública v1.0) ==========

  debug(context, message, extra) {
    this.log(this.LEVEL.DEBUG, context, message, extra);
  },

  info(context, message, extra) {
    this.log(this.LEVEL.INFO, context, message, extra);
  },

  warn(context, message, extra) {
    this.log(this.LEVEL.WARN, context, message, extra);
  },

  error(context, message, errorObj, extra = {}) {
    const enriched = { ...extra };
    if (errorObj) {
      enriched.error = errorObj.message;
      enriched.stack = errorObj.stack;
    }
    this.log(this.LEVEL.ERROR, context, message, enriched);
  },

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Obtiene o crea la hoja de logs (con caché)
   * @private
   */
  _getOrCreateSheet() {
    // Retornar caché si existe
    if (this._sheetCache) {
      return this._sheetCache;
    }

    const ss = SpreadsheetApp.getActive();
    let logSheet = ss.getSheetByName(getConfig('SHEETS.DEBUG_LOG'));

    // Crear hoja si no existe
    if (!logSheet) {
      logSheet = ss.insertSheet(getConfig('SHEETS.DEBUG_LOG'));
      // v2.1: 7 columnas con CorrelationId
      const headers = ['Timestamp', 'Level', 'Context', 'Message', 'Extra', 'User', 'CorrelationId'];
      logSheet.getRange(1, 1, 1, 7).setValues([headers])
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      logSheet.setFrozenRows(1);
    } else {
      // Migración suave: agregar columna CorrelationId si falta (v2.0 → v2.1)
      this._migrateHeadersIfNeeded(logSheet);
    }

    // Guardar en caché
    this._sheetCache = logSheet;

    return logSheet;
  },

  /**
   * Migra headers existentes agregando CorrelationId (columna G) si falta
   * Fail-safe: si algo falla, continúa sin romper
   * @private
   */
  _migrateHeadersIfNeeded(sheet) {
    try {
      const g1Value = sheet.getRange('G1').getValue();

      // Si G1 está vacío o no dice 'CorrelationId', agregar header
      if (!g1Value || String(g1Value).trim() !== 'CorrelationId') {
        sheet.getRange('G1').setValue('CorrelationId')
          .setFontWeight('bold')
          .setBackground('#f3f3f3');

        if (typeof console !== 'undefined' && console.log) {
          console.log('[Logger] Migrated headers: added CorrelationId column');
        }
      }
    } catch (migrationError) {
      // Non-critical: log warning but continue
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[Logger] Header migration failed (non-critical):', migrationError.message);
      }
    }
  },

  /**
   * Limita filas de la hoja a máximo configurado
   * @private
   */
  _enforceRowLimit(sheet) {
    try {
      const maxRows = getConfig('LOGGER.MAX_ROWS', 5000);
      const currentRows = sheet.getLastRow();

      if (currentRows > maxRows + 1) {
        const rowsToDelete = currentRows - maxRows;
        sheet.deleteRows(2, rowsToDelete);
      }
    } catch (error) {
      // No crítico, solo log a console
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('Logger._enforceRowLimit failed:', error.message);
      }
    }
  },

  /**
   * Obtiene usuario actual
   * @private
   */
  _getCurrentUser() {
    try {
      return Session.getActiveUser().getEmail() || 'system';
    } catch (e) {
      return 'system';
    }
  },

  /**
   * Limpia caché (útil para testing)
   * @private
   */
  _clearCache() {
    this._sheetCache = null;
  }
};

/**
 * Ejecuta función con try/catch y logging automático
 * Incluye flush automático de logs al finalizar
 * 
 * @param {string} context - Nombre del contexto
 * @param {Function} fn - Función a ejecutar
 * @param {*} errorReturn - Valor a retornar en caso de error
 * @param {boolean} autoFlush - Si debe hacer flush al terminar (default: true)
 * @return {*} Resultado de fn o errorReturn
 */
function withErrorLogging(context, fn, errorReturn = null, autoFlush = true) {
  try {
    const result = fn();

    // Flush logs si está habilitado
    if (autoFlush) {
      Logger.flush();
    }

    return result;

  } catch (error) {
    Logger.error(context, 'Exception caught', error);

    // Flush logs incluso en error
    if (autoFlush) {
      Logger.flush();
    }

    return errorReturn;
  }
}

/**
 * Helper para asegurar flush de logs al final de cualquier función
 * Uso: const result = await ensureLogFlush(() => miFunction());
 * 
 * @param {Function} fn - Función a ejecutar
 * @return {*} Resultado de fn
 */
function ensureLogFlush(fn) {
  try {
    const result = fn();
    Logger.flush();
    return result;
  } catch (error) {
    Logger.flush();
    throw error;
  }
}
