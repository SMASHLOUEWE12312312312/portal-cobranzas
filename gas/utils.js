/**
 * @fileoverview Utilidades generales reutilizables
 */

const Utils = {
  /**
   * Limpia texto: trim, normaliza espacios, remueve non-breaking spaces
   * @param {*} value - Valor a limpiar
   * @return {string} Texto limpio
   */
  cleanText(value) {
    if (value == null) return '';
    const str = String(value);
    return str.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
  },

  /**
   * Normaliza encabezado: uppercase, sin acentos, espacios normalizados
   * @param {string} header - Encabezado a normalizar
   * @return {string} Encabezado normalizado
   */
  normalizeHeader(header) {
    let s = String(header || '').toUpperCase();
    if (s.normalize) {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return s.replace(/[_\s]+/g, ' ').trim();
  },

  /**
   * Normaliza moneda a formato estándar
   * @param {*} value - Valor de moneda
   * @return {string} 'S/.' | 'US$' | original
   */
  normalizeCurrency(value) {
    const s = this.cleanText(value).toUpperCase();
    if (/^US(D|\$)$/.test(s) || s === 'USD$' || s === 'DOLARES' || s === 'DÓLARES') {
      return getConfig('FORMAT.CURRENCY.USD', 'US$');
    }
    if (s === 'S' || s === 'S/' || s === 'S/.' || s === 'SOLES') {
      return getConfig('FORMAT.CURRENCY.PEN', 'S/.');
    }
    return s || '';
  },

  /**
   * Moneda para display (quita punto final de S/.)
   * @param {string} currency - Moneda normalizada
   * @return {string} Moneda para mostrar
   */
  currencyDisplay(currency) {
    return /^S\/\.?$/i.test(String(currency || '')) ? 'S/' : String(currency || '');
  },

  /**
   * Convierte valor a Date si es posible
   * @param {*} value - Valor a convertir
   * @return {Date|string} Date si válido, string vacío si no
   */
  toDate(value) {
    if (value && Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
      return value;
    }

    const s = String(value || '').trim();
    if (!s) return '';

    // Intentar formato dd/MM/yyyy o dd-MM-yyyy
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      let d = +m[1], mo = +m[2], y = +m[3];
      if (y < 100) y += 2000;
      const date = new Date(y, mo - 1, d);
      if (!isNaN(date)) return date;
    }

    // Fallback: intentar Date constructor
    try {
      const t = new Date(s);
      if (!isNaN(t)) return t;
    } catch (_) { }

    return '';
  },

  /**
   * Calcula días entre dos fechas (sin decimales)
   * @param {Date} date1 - Fecha más reciente
   * @param {Date} date2 - Fecha más antigua
   * @return {number} Días de diferencia
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.floor((d1 - d2) / 86400000);
  },

  /**
   * Nombre de archivo seguro (sin caracteres inválidos)
   * @param {string} name - Nombre original
   * @return {string} Nombre seguro
   */
  safeName(name) {
    return String(name).replace(/[\\\/:\*\?\"<>\|#%]+/g, '_').trim();
  },

  /**
   * Formatea fecha según configuración
   * @param {Date} date - Fecha
   * @param {string} format - Formato (default: dd/MM/yyyy)
   * @return {string} Fecha formateada
   */
  formatDate(date, format = null) {
    if (!date || !(date instanceof Date) || isNaN(date)) return '';
    const fmt = format || getConfig('FORMAT.DATE_FORMAT', 'dd/MM/yyyy');
    const tz = getConfig('FORMAT.TIMEZONE', 'America/Lima');
    return Utilities.formatDate(date, tz, fmt);
  },

  /**
   * Encuentra índice de columna en headers
   * @param {Array<string>} headers - Array de encabezados
   * @param {string} columnName - Nombre de columna a buscar
   * @return {number} Índice (base 0) o -1 si no encuentra
   */
  findColumnIndex(headers, columnName) {
    const normalized = headers.map(h => this.normalizeHeader(h));
    const target = this.normalizeHeader(columnName);
    return normalized.indexOf(target);
  },

  /**
   * Letra de columna desde número (1-indexed)
   * @param {number} num - Número de columna (1 = A, 2 = B, etc.)
   * @return {string} Letra de columna
   */
  columnLetter(num) {
    let s = '';
    while (num > 0) {
      const m = (num - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      num = Math.floor((num - 1) / 26);
    }
    return s;
  },

  /**
   * Extrae ID de archivo desde URL de Drive
   * @param {string} url - URL del archivo
   * @return {string|null} ID del archivo o null
   */
  extractFileId(url) {
    if (!url) return null;
    const match = String(url).match(/[-\w]{25,}/);
    return match ? match[0] : null;
  },

  /**
   * Retry con exponential backoff
   * @param {Function} fn - Función a ejecutar
   * @param {number} maxRetries - Máximo de reintentos
   * @param {number} delayMs - Delay inicial en ms
   * @return {*} Resultado de fn
   */
  retryWithBackoff(fn, maxRetries = 3, delayMs = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          Utilities.sleep(delayMs * Math.pow(2, i));
        }
      }
    }
    throw lastError;
  }
};
