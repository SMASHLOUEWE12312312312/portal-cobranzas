/**
 * @fileoverview ResponseFormatter - Fase 5 UX & Optimización
 * @version 1.0.0
 * @author Portal Cobranzas Team
 *
 * CARACTERÍSTICAS:
 * - Estandarización de respuestas API
 * - Estructura consistente de errores
 * - Metadatos de respuesta
 * - Compresión de payload
 *
 * FEATURE FLAG: FEATURES.ENABLE_RESPONSE_FORMATTER
 */

const ResponseFormatter = {
  // ========== VERSIÓN API ==========
  API_VERSION: '2.0',

  // ========== RESPUESTAS EXITOSAS ==========

  /**
   * Genera respuesta exitosa estándar
   * @param {any} data - Datos a retornar
   * @param {Object} meta - Metadatos adicionales
   * @return {Object} Respuesta formateada
   */
  success(data, meta = {}) {
    return {
      ok: true,
      apiVersion: this.API_VERSION,
      timestamp: new Date().toISOString(),
      data: data,
      meta: {
        ...meta,
        requestId: this._generateRequestId()
      }
    };
  },

  /**
   * Genera respuesta exitosa con paginación
   * @param {Array} items - Items de la página actual
   * @param {Object} pagination - { page, pageSize, total }
   * @return {Object} Respuesta formateada
   */
  successPaginated(items, pagination) {
    const { page = 1, pageSize = 20, total = items.length } = pagination;
    const totalPages = Math.ceil(total / pageSize);

    return this.success(items, {
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  },

  /**
   * Genera respuesta exitosa con datos de cache
   * @param {any} data - Datos
   * @param {boolean} fromCache - Si viene de cache
   * @param {number} cacheAge - Edad del cache en segundos
   * @return {Object} Respuesta formateada
   */
  successCached(data, fromCache, cacheAge = 0) {
    return this.success(data, {
      cache: {
        hit: fromCache,
        age: cacheAge
      }
    });
  },

  // ========== RESPUESTAS DE ERROR ==========

  /**
   * Genera respuesta de error estándar
   * @param {string} message - Mensaje de error
   * @param {string} code - Código de error
   * @param {Object} details - Detalles adicionales
   * @return {Object} Respuesta de error
   */
  error(message, code = 'UNKNOWN_ERROR', details = {}) {
    return {
      ok: false,
      apiVersion: this.API_VERSION,
      timestamp: new Date().toISOString(),
      error: {
        code: code,
        message: message,
        details: details,
        requestId: this._generateRequestId()
      }
    };
  },

  /**
   * Error de validación
   * @param {Array} errors - Lista de errores de validación
   * @return {Object} Respuesta de error
   */
  validationError(errors) {
    return this.error(
      'Error de validación',
      'VALIDATION_ERROR',
      { validationErrors: errors }
    );
  },

  /**
   * Error de recurso no encontrado
   * @param {string} resource - Tipo de recurso
   * @param {string} id - ID del recurso
   * @return {Object} Respuesta de error
   */
  notFound(resource, id) {
    return this.error(
      `${resource} no encontrado`,
      'NOT_FOUND',
      { resource, id }
    );
  },

  /**
   * Error de autorización
   * @param {string} message - Mensaje
   * @return {Object} Respuesta de error
   */
  unauthorized(message = 'No autorizado') {
    return this.error(message, 'UNAUTHORIZED');
  },

  /**
   * Error de permiso
   * @param {string} action - Acción denegada
   * @return {Object} Respuesta de error
   */
  forbidden(action) {
    return this.error(
      `No tiene permisos para: ${action}`,
      'FORBIDDEN',
      { action }
    );
  },

  /**
   * Error de servicio
   * @param {Error} err - Error original
   * @return {Object} Respuesta de error
   */
  serverError(err) {
    // No exponer detalles internos en producción
    const isDev = getConfig('ENVIRONMENT', 'production') === 'development';

    return this.error(
      isDev ? err.message : 'Error interno del servidor',
      'SERVER_ERROR',
      isDev ? { stack: err.stack } : {}
    );
  },

  /**
   * Error de feature deshabilitado
   * @param {string} feature - Nombre del feature
   * @return {Object} Respuesta de error
   */
  featureDisabled(feature) {
    return this.error(
      `Funcionalidad "${feature}" no está habilitada`,
      'FEATURE_DISABLED',
      { feature }
    );
  },

  // ========== UTILIDADES ==========

  /**
   * Genera un ID único de request
   * @private
   */
  _generateRequestId() {
    return 'REQ_' + Date.now().toString(36) + '_' +
           Math.random().toString(36).substring(2, 6);
  },

  /**
   * Envuelve una función API con manejo de errores estándar
   * @param {Function} fn - Función a envolver
   * @return {Function} Función envuelta
   */
  wrapAPI(fn) {
    return function(...args) {
      try {
        const result = fn.apply(this, args);

        // Si ya es una respuesta formateada, retornarla
        if (result && typeof result === 'object' && 'ok' in result) {
          return result;
        }

        // Si no, formatear como éxito
        return ResponseFormatter.success(result);

      } catch (error) {
        Logger.error('ResponseFormatter.wrapAPI', 'Error en API', error);
        return ResponseFormatter.serverError(error);
      }
    };
  },

  /**
   * Valida y formatea respuesta para el cliente
   * @param {Object} response - Respuesta a validar
   * @return {Object} Respuesta validada
   */
  validate(response) {
    // Asegurar estructura mínima
    if (!response || typeof response !== 'object') {
      return this.error('Respuesta inválida', 'INVALID_RESPONSE');
    }

    // Si tiene ok, es una respuesta formateada
    if ('ok' in response) {
      return response;
    }

    // Envolver datos crudos
    return this.success(response);
  }
};

// ========== FUNCIONES API GLOBALES ==========

function formatSuccessResponse_API(data, meta) {
  return ResponseFormatter.success(data, meta || {});
}

function formatErrorResponse_API(message, code, details) {
  return ResponseFormatter.error(message, code || 'ERROR', details || {});
}

function formatPaginatedResponse_API(items, pagination) {
  return ResponseFormatter.successPaginated(items, pagination || {});
}
