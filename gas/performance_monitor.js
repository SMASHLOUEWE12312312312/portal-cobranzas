/**
 * @fileoverview PerformanceMonitor - Fase 5 UX & Optimización
 * @version 1.0.0
 * @author Portal Cobranzas Team
 *
 * CARACTERÍSTICAS:
 * - Monitoreo de tiempos de ejecución
 * - Detección de operaciones lentas
 * - Métricas de rendimiento
 * - Logging de performance
 *
 * FEATURE FLAG: FEATURES.ENABLE_PERFORMANCE_MONITOR
 */

const PerformanceMonitor = {
  // ========== CONFIGURACIÓN ==========
  SLOW_THRESHOLD_MS: 3000,    // 3 segundos = operación lenta
  CRITICAL_THRESHOLD_MS: 10000, // 10 segundos = crítico
  LOG_SHEET: 'Performance_Log',
  MAX_LOG_ROWS: 1000,

  // ========== MEDICIONES ==========
  _activeTimers: {},

  /**
   * Inicia un timer de medición
   * @param {string} operationId - ID de la operación
   * @param {Object} context - Contexto adicional
   * @return {string} ID del timer
   */
  startTimer(operationId, context = {}) {
    if (!this._isEnabled()) return operationId;

    const timerId = operationId + '_' + Date.now();

    this._activeTimers[timerId] = {
      operationId: operationId,
      startTime: Date.now(),
      context: context
    };

    return timerId;
  },

  /**
   * Detiene un timer y registra la medición
   * @param {string} timerId - ID del timer
   * @param {Object} result - Resultado de la operación
   * @return {Object} Métricas de la operación
   */
  endTimer(timerId, result = {}) {
    if (!this._isEnabled()) return { ok: true, duration: 0 };

    const timer = this._activeTimers[timerId];
    if (!timer) {
      return { ok: false, error: 'Timer no encontrado' };
    }

    const endTime = Date.now();
    const duration = endTime - timer.startTime;

    const metrics = {
      operationId: timer.operationId,
      duration: duration,
      startTime: new Date(timer.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      context: timer.context,
      result: {
        ok: result.ok !== false,
        recordCount: result.count || result.length || 0
      },
      performance: this._categorizePerformance(duration)
    };

    // Eliminar timer activo
    delete this._activeTimers[timerId];

    // Loguear si es lento
    if (duration >= this.SLOW_THRESHOLD_MS) {
      this._logSlowOperation(metrics);
    }

    return metrics;
  },

  /**
   * Mide una función y retorna su resultado con métricas
   * @param {string} operationId - ID de la operación
   * @param {Function} fn - Función a medir
   * @param {Object} context - Contexto adicional
   * @return {Object} { result, metrics }
   */
  measure(operationId, fn, context = {}) {
    const timerId = this.startTimer(operationId, context);

    try {
      const result = fn();
      const metrics = this.endTimer(timerId, result);

      return {
        result: result,
        metrics: metrics
      };
    } catch (error) {
      const metrics = this.endTimer(timerId, { ok: false, error: error.message });
      metrics.error = error.message;

      throw error;
    }
  },

  /**
   * Versión async de measure
   * @param {string} operationId - ID de la operación
   * @param {Function} asyncFn - Función async a medir
   * @param {Object} context - Contexto adicional
   * @return {Promise<Object>} { result, metrics }
   */
  async measureAsync(operationId, asyncFn, context = {}) {
    const timerId = this.startTimer(operationId, context);

    try {
      const result = await asyncFn();
      const metrics = this.endTimer(timerId, result);

      return {
        result: result,
        metrics: metrics
      };
    } catch (error) {
      const metrics = this.endTimer(timerId, { ok: false, error: error.message });
      metrics.error = error.message;

      throw error;
    }
  },

  // ========== MÉTRICAS AGREGADAS ==========

  /**
   * Obtiene estadísticas de performance recientes
   * @param {number} hoursBack - Horas hacia atrás
   * @return {Object} Estadísticas agregadas
   */
  getStats(hoursBack = 24) {
    if (!this._isEnabled()) {
      return { ok: false, reason: 'Feature disabled' };
    }

    try {
      const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
      const sheet = ss.getSheetByName(this.LOG_SHEET);

      if (!sheet) {
        return { ok: true, stats: {}, message: 'No hay datos de performance' };
      }

      const data = sheet.getDataRange().getValues();
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - hoursBack);

      const recentData = data.slice(1).filter(row => {
        const timestamp = new Date(row[0]);
        return timestamp >= cutoff;
      });

      if (recentData.length === 0) {
        return { ok: true, stats: {}, message: 'No hay datos recientes' };
      }

      // Calcular estadísticas por operación
      const byOperation = {};

      recentData.forEach(row => {
        const op = row[1]; // operationId
        const duration = row[2]; // duration

        if (!byOperation[op]) {
          byOperation[op] = {
            count: 0,
            totalMs: 0,
            minMs: Infinity,
            maxMs: 0,
            slowCount: 0
          };
        }

        byOperation[op].count++;
        byOperation[op].totalMs += duration;
        byOperation[op].minMs = Math.min(byOperation[op].minMs, duration);
        byOperation[op].maxMs = Math.max(byOperation[op].maxMs, duration);

        if (duration >= this.SLOW_THRESHOLD_MS) {
          byOperation[op].slowCount++;
        }
      });

      // Calcular promedios
      Object.keys(byOperation).forEach(op => {
        const stats = byOperation[op];
        stats.avgMs = Math.round(stats.totalMs / stats.count);
        stats.slowPercentage = ((stats.slowCount / stats.count) * 100).toFixed(1);
      });

      return {
        ok: true,
        period: { hours: hoursBack, since: cutoff.toISOString() },
        totalOperations: recentData.length,
        byOperation: byOperation
      };

    } catch (error) {
      Logger.error('PerformanceMonitor.getStats', 'Error obteniendo stats', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Obtiene las operaciones más lentas
   * @param {number} limit - Cantidad máxima
   * @return {Array} Operaciones lentas
   */
  getSlowestOperations(limit = 10) {
    if (!this._isEnabled()) return [];

    try {
      const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
      const sheet = ss.getSheetByName(this.LOG_SHEET);

      if (!sheet) return [];

      const data = sheet.getDataRange().getValues();

      return data.slice(1)
        .map(row => ({
          timestamp: row[0],
          operationId: row[1],
          duration: row[2],
          context: row[3]
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, limit);

    } catch (error) {
      Logger.error('PerformanceMonitor.getSlowestOperations', 'Error', error);
      return [];
    }
  },

  // ========== MÉTODOS PRIVADOS ==========

  _isEnabled() {
    return getConfig('FEATURES.ENABLE_PERFORMANCE_MONITOR', true);
  },

  _categorizePerformance(durationMs) {
    if (durationMs < 500) return 'EXCELLENT';
    if (durationMs < 1000) return 'GOOD';
    if (durationMs < 3000) return 'ACCEPTABLE';
    if (durationMs < 10000) return 'SLOW';
    return 'CRITICAL';
  },

  _logSlowOperation(metrics) {
    try {
      const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
      let sheet = ss.getSheetByName(this.LOG_SHEET);

      if (!sheet) {
        sheet = ss.insertSheet(this.LOG_SHEET);
        sheet.getRange(1, 1, 1, 5).setValues([[
          'Timestamp', 'Operation', 'Duration (ms)', 'Context', 'Performance'
        ]]).setFontWeight('bold').setBackground('#ffcdd2');
        sheet.setFrozenRows(1);
      }

      // Agregar log
      sheet.appendRow([
        new Date(),
        metrics.operationId,
        metrics.duration,
        JSON.stringify(metrics.context),
        metrics.performance
      ]);

      // Mantener solo últimas N filas
      const lastRow = sheet.getLastRow();
      if (lastRow > this.MAX_LOG_ROWS + 1) {
        sheet.deleteRows(2, lastRow - this.MAX_LOG_ROWS - 1);
      }

      // Log también en Logger
      Logger.warn('PerformanceMonitor', `Operación lenta: ${metrics.operationId}`, {
        duration: metrics.duration,
        performance: metrics.performance
      });

    } catch (error) {
      Logger.error('PerformanceMonitor._logSlowOperation', 'Error logging', error);
    }
  },

  /**
   * Limpia logs antiguos
   * @param {number} daysToKeep - Días a mantener
   * @return {Object} { ok, deleted }
   */
  cleanup(daysToKeep = 30) {
    try {
      const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
      const sheet = ss.getSheetByName(this.LOG_SHEET);

      if (!sheet) return { ok: true, deleted: 0 };

      const data = sheet.getDataRange().getValues();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysToKeep);

      let deleted = 0;
      for (let i = data.length - 1; i > 0; i--) {
        if (new Date(data[i][0]) < cutoff) {
          sheet.deleteRow(i + 1);
          deleted++;
        }
      }

      return { ok: true, deleted };

    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
};

// ========== FUNCIONES API GLOBALES ==========

function getPerformanceStats_API(hours) {
  return PerformanceMonitor.getStats(hours || 24);
}

function getSlowestOperations_API(limit) {
  return PerformanceMonitor.getSlowestOperations(limit || 10);
}

function cleanupPerformanceLogs_API(days) {
  return PerformanceMonitor.cleanup(days || 30);
}
