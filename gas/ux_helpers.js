/**
 * @fileoverview UXHelpers - Fase 5 UX & Optimización
 * @version 1.0.0
 * @author Portal Cobranzas Team
 *
 * CARACTERÍSTICAS:
 * - Formateo consistente de respuestas
 * - Mensajes de usuario amigables
 * - Helpers de validación de entrada
 * - Sanitización de datos
 *
 * FEATURE FLAG: FEATURES.ENABLE_UX_HELPERS
 */

const UXHelpers = {
  // ========== FORMATEO DE MONEDA ==========

  /**
   * Formatea un monto como moneda peruana
   * @param {number} amount - Monto a formatear
   * @param {string} currency - Moneda (PEN/USD)
   * @return {string} Monto formateado
   */
  formatCurrency(amount, currency = 'PEN') {
    if (amount === null || amount === undefined) return '-';

    const symbol = currency === 'USD' ? 'US$ ' : 'S/ ';
    return symbol + this.formatNumber(amount);
  },

  /**
   * Formatea un número con separadores de miles
   * @param {number} num - Número a formatear
   * @param {number} decimals - Decimales (default: 2)
   * @return {string} Número formateado
   */
  formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '-';

    return Number(num).toLocaleString('es-PE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  // ========== FORMATEO DE FECHAS ==========

  /**
   * Formatea una fecha en formato peruano
   * @param {Date|string} date - Fecha a formatear
   * @param {Object} options - { includeTime, relative }
   * @return {string} Fecha formateada
   */
  formatDate(date, options = {}) {
    if (!date) return '-';

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';

    if (options.relative) {
      return this._getRelativeTime(d);
    }

    const dateStr = d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    if (options.includeTime) {
      const timeStr = d.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${dateStr} ${timeStr}`;
    }

    return dateStr;
  },

  /**
   * Obtiene tiempo relativo (hace X minutos/horas/días)
   * @private
   */
  _getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

    return this.formatDate(date);
  },

  // ========== FORMATEO DE PORCENTAJES ==========

  /**
   * Formatea un valor como porcentaje
   * @param {number} value - Valor (0-100 o 0-1)
   * @param {boolean} isDecimal - Si el valor está en formato decimal
   * @return {string} Porcentaje formateado
   */
  formatPercentage(value, isDecimal = false) {
    if (value === null || value === undefined || isNaN(value)) return '-';

    const percentage = isDecimal ? value * 100 : value;
    return `${percentage.toFixed(1)}%`;
  },

  // ========== ESTADOS Y BADGES ==========

  /**
   * Obtiene configuración de badge para un estado
   * @param {string} status - Estado
   * @return {Object} { label, color, icon }
   */
  getStatusBadge(status) {
    const badges = {
      // Estados de gestión
      'CONTACTADO': { label: 'Contactado', color: '#2196f3', icon: '📞' },
      'COMPROMISO_PAGO': { label: 'Compromiso', color: '#ff9800', icon: '🤝' },
      'PAGADO': { label: 'Pagado', color: '#4caf50', icon: '✅' },
      'NO_CONTACTADO': { label: 'No Contactado', color: '#9e9e9e', icon: '⏳' },
      'RECHAZA_PAGO': { label: 'Rechaza', color: '#f44336', icon: '❌' },

      // Estados PTP
      'PENDIENTE': { label: 'Pendiente', color: '#ff9800', icon: '⏰' },
      'CUMPLIDO': { label: 'Cumplido', color: '#4caf50', icon: '✅' },
      'CUMPLIDO_PARCIAL': { label: 'Parcial', color: '#8bc34a', icon: '🔄' },
      'INCUMPLIDO': { label: 'Incumplido', color: '#f44336', icon: '❌' },
      'VENCIDO': { label: 'Vencido', color: '#d32f2f', icon: '⚠️' },

      // Severidades
      'CRITICAL': { label: 'Crítico', color: '#d32f2f', icon: '🚨' },
      'HIGH': { label: 'Alto', color: '#f44336', icon: '⚠️' },
      'MEDIUM': { label: 'Medio', color: '#ff9800', icon: '📋' },
      'LOW': { label: 'Bajo', color: '#4caf50', icon: 'ℹ️' },

      // Default
      'DEFAULT': { label: status || 'Desconocido', color: '#9e9e9e', icon: '❓' }
    };

    return badges[status] || badges['DEFAULT'];
  },

  // ========== VALIDACIÓN DE ENTRADA ==========

  /**
   * Valida un email
   * @param {string} email - Email a validar
   * @return {boolean} Es válido
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  },

  /**
   * Valida un RUC peruano
   * @param {string} ruc - RUC a validar
   * @return {boolean} Es válido
   */
  isValidRUC(ruc) {
    if (!ruc || typeof ruc !== 'string') return false;
    const cleaned = ruc.replace(/\D/g, '');
    return cleaned.length === 11 && /^(10|15|17|20)/.test(cleaned);
  },

  /**
   * Valida un monto
   * @param {any} amount - Monto a validar
   * @return {boolean} Es válido
   */
  isValidAmount(amount) {
    if (amount === null || amount === undefined) return false;
    const num = Number(amount);
    return !isNaN(num) && num >= 0 && isFinite(num);
  },

  // ========== SANITIZACIÓN ==========

  /**
   * Sanitiza texto para prevenir XSS
   * @param {string} text - Texto a sanitizar
   * @return {string} Texto sanitizado
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  },

  /**
   * Trunca texto con elipsis
   * @param {string} text - Texto a truncar
   * @param {number} maxLength - Longitud máxima
   * @return {string} Texto truncado
   */
  truncate(text, maxLength = 50) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },

  // ========== MENSAJES DE USUARIO ==========

  /**
   * Genera mensaje de éxito
   * @param {string} action - Acción realizada
   * @param {Object} details - Detalles adicionales
   * @return {Object} Mensaje formateado
   */
  successMessage(action, details = {}) {
    return {
      type: 'success',
      title: '✅ Operación exitosa',
      message: this._getSuccessText(action),
      details: details,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Genera mensaje de error
   * @param {string} action - Acción que falló
   * @param {string} error - Mensaje de error
   * @return {Object} Mensaje formateado
   */
  errorMessage(action, error) {
    return {
      type: 'error',
      title: '❌ Error',
      message: this._getErrorText(action),
      error: error,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Genera mensaje de advertencia
   * @param {string} message - Mensaje de advertencia
   * @return {Object} Mensaje formateado
   */
  warningMessage(message) {
    return {
      type: 'warning',
      title: '⚠️ Advertencia',
      message: message,
      timestamp: new Date().toISOString()
    };
  },

  _getSuccessText(action) {
    const texts = {
      'gestion_registrada': 'La gestión se registró correctamente',
      'ptp_creado': 'El compromiso de pago se creó correctamente',
      'ptp_actualizado': 'El compromiso de pago se actualizó',
      'email_enviado': 'El correo se envió correctamente',
      'export_completado': 'La exportación se completó correctamente',
      'backup_completado': 'El backup se realizó correctamente'
    };
    return texts[action] || `Acción "${action}" completada`;
  },

  _getErrorText(action) {
    const texts = {
      'gestion_registrada': 'No se pudo registrar la gestión',
      'ptp_creado': 'No se pudo crear el compromiso de pago',
      'ptp_actualizado': 'No se pudo actualizar el compromiso',
      'email_enviado': 'No se pudo enviar el correo',
      'export_completado': 'No se pudo completar la exportación',
      'conexion': 'Error de conexión. Intente nuevamente.'
    };
    return texts[action] || `Error en acción "${action}"`;
  },

  // ========== PAGINACIÓN ==========

  /**
   * Calcula información de paginación
   * @param {number} totalItems - Total de items
   * @param {number} currentPage - Página actual (1-indexed)
   * @param {number} pageSize - Items por página
   * @return {Object} Información de paginación
   */
  getPaginationInfo(totalItems, currentPage = 1, pageSize = 20) {
    const totalPages = Math.ceil(totalItems / pageSize);
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return {
      currentPage,
      totalPages,
      pageSize,
      totalItems,
      startItem,
      endItem,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      displayText: `${startItem}-${endItem} de ${totalItems}`
    };
  }
};

// ========== FUNCIONES API GLOBALES ==========

function formatCurrency_API(amount, currency) {
  return UXHelpers.formatCurrency(amount, currency);
}

function formatDate_API(date, options) {
  return UXHelpers.formatDate(date, options || {});
}

function getStatusBadge_API(status) {
  return UXHelpers.getStatusBadge(status);
}

function validateInput_API(type, value) {
  switch (type) {
    case 'email': return UXHelpers.isValidEmail(value);
    case 'ruc': return UXHelpers.isValidRUC(value);
    case 'amount': return UXHelpers.isValidAmount(value);
    default: return false;
  }
}
