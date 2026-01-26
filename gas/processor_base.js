/**
 * @fileoverview Base helpers for Conciliación processors
 * @version 1.0.0
 * 
 * Common utilities used by all insurance company processors.
 * MUST be included before any processor files.
 */

const ProcessorBase = {
    /**
     * Normalizes a state value to lowercase and trimmed
     * @param {*} valor - Value to normalize
     * @returns {string}
     */
    normalizeState(valor) {
        return String(valor || '').trim().toLowerCase();
    },

    /**
     * Parses a value to integer, returns 0 if fails
     * @param {*} valor - Value to parse
     * @returns {number}
     */
    parseLongOrZero(valor) {
        const num = parseInt(valor, 10);
        return isNaN(num) ? 0 : num;
    },

    /**
     * Extracts year from a date value (Date object, string, or serial number)
     * REPLICA EXACTA: VBA Year(CDate(valor)) behavior
     * 
     * @param {*} valor - Date value (can be Date, string "dd/mm/yyyy", or Excel serial)
     * @returns {number|null} Year if valid date, null otherwise
     */
    extraerAnioDeVigencia(valor) {
        // Si es vacío o null, retornar null (VBA: IsDate() = False)
        if (valor === null || valor === undefined || valor === '') {
            return null;
        }

        // Si ya es Date, extraer año directamente
        if (valor instanceof Date) {
            return valor.getFullYear();
        }

        // Convertir a string para procesar
        const str = String(valor).trim();
        if (!str) return null;

        // Intentar parsear como dd/mm/yyyy o dd-mm-yyyy
        const regexDMY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
        const matchDMY = str.match(regexDMY);
        if (matchDMY) {
            const anio = parseInt(matchDMY[3], 10);
            if (anio >= 1900 && anio <= 2100) {
                return anio;
            }
        }

        // Intentar parsear como yyyy-mm-dd (ISO)
        const regexISO = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
        const matchISO = str.match(regexISO);
        if (matchISO) {
            const anio = parseInt(matchISO[1], 10);
            if (anio >= 1900 && anio <= 2100) {
                return anio;
            }
        }

        // Intentar como número (serial de Excel)
        const num = parseFloat(str);
        if (!isNaN(num) && num > 1 && num < 100000) {
            // Convertir serial de Excel a fecha
            // Excel usa 1/1/1900 como día 1 (con bug del año bisiesto 1900)
            const excelEpoch = new Date(1899, 11, 30);
            const fecha = new Date(excelEpoch.getTime() + num * 86400000);
            if (!isNaN(fecha.getTime())) {
                return fecha.getFullYear();
            }
        }

        // No es una fecha válida
        return null;
    },

    /**
     * Removes leading zeros from a string
     * @param {string} str - String to process
     * @returns {string}
     */
    quitarCerosIzquierda(str) {
        let result = String(str || '').trim();
        while (result.length > 1 && result.charAt(0) === '0') {
            result = result.substring(1);
        }
        return result;
    },

    /**
     * Normalizes coupon for comparison (uppercase, no leading zeros)
     * REPLICA: Function NormalizarCupon() del VBA
     * @param {string} cupon - Coupon to normalize
     * @returns {string}
     */
    normalizarCupon(cupon) {
        let result = String(cupon || '').trim().toUpperCase();
        while (result.length > 1 && result.charAt(0) === '0') {
            result = result.substring(1);
        }
        return result;
    },

    /**
     * Clears data from a sheet starting at a specific row
     * @param {Sheet} sheet - Sheet to clear
     * @param {number} startRow - Row from which to clear
     */
    clearFromRow(sheet, startRow) {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn() || 1;

        if (lastRow >= startRow) {
            sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).clearContent();
        }
    },

    /**
     * Gets last row with data in a specific column
     * @param {Sheet} sheet - Sheet
     * @param {number} col - Column number (1-indexed)
     * @returns {number}
     */
    lastRowInCol(sheet, col) {
        const lastRow = sheet.getLastRow();
        if (lastRow === 0) return 0;

        const data = sheet.getRange(1, col, lastRow, 1).getValues();
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i][0] !== '' && data[i][0] !== null && data[i][0] !== undefined) {
                return i + 1;
            }
        }
        return 0;
    },

    /**
     * Writes headers to a Trama sheet
     * @param {Sheet} sheet - Trama sheet
     * @param {Array<string>} headers - Headers
     */
    writeTramaHeaders(sheet, headers) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, headers.length)
            .setFontWeight('bold')
            .setBackground('#D9D9D9');
    },

    /**
     * Writes data to Trama with formatting
     * FIX v3.0: Handle date columns properly - write Date objects, not strings
     * @param {Sheet} sheet - Trama sheet
     * @param {Array<Array>} rows - Data rows
     * @param {Object} formatConfig - Format config by column {col: format}
     */
    writeTramaData(sheet, rows, formatConfig) {
        if (!rows || rows.length === 0) return;

        const numCols = rows[0].length;
        const range = sheet.getRange(2, 1, rows.length, numCols);

        // FIX v3.0: Identify date columns from formatConfig
        const dateColumns = new Set();
        if (formatConfig) {
            Object.keys(formatConfig).forEach(colStr => {
                const format = formatConfig[parseInt(colStr, 10)];
                if (format && (format.includes('d') || format.includes('m') || format.includes('y'))) {
                    dateColumns.add(parseInt(colStr, 10) - 1); // Convert to 0-indexed
                }
            });
        }

        // Apply text format ONLY to non-date columns
        for (let col = 1; col <= numCols; col++) {
            if (!dateColumns.has(col - 1)) {
                sheet.getRange(2, col, rows.length, 1).setNumberFormat('@');
            }
        }

        // Write values
        range.setValues(rows);

        // Apply specific formats (including date format)
        if (formatConfig) {
            Object.keys(formatConfig).forEach(colStr => {
                const col = parseInt(colStr, 10);
                const format = formatConfig[col];
                sheet.getRange(2, col, rows.length, 1).setNumberFormat(format);
            });
        }
    },

    /**
     * Writes data preserving original values (prevents numeric conversion)
     * CRITICAL: This function MUST be used for all data writes in Conciliación
     * 
     * @param {Sheet} sheet - Target sheet
     * @param {number} startRow - Starting row (1-indexed)
     * @param {number} startCol - Starting column (1-indexed)  
     * @param {Array<Array>} data - 2D array of data to write
     * @param {Object} options - Optional settings
     *   - formatAsText: boolean (default: true) - Force all cells as text
     *   - skipHeader: boolean (default: false) - Skip first row for text format
     */
    writeDataPreservingFormat(sheet, startRow, startCol, data, options = {}) {
        if (!data || data.length === 0) return;

        const formatAsText = options.formatAsText !== false;
        const skipHeader = options.skipHeader === true;

        const numRows = data.length;
        const numCols = data[0].length;
        const range = sheet.getRange(startRow, startCol, numRows, numCols);

        if (formatAsText) {
            // CRITICAL: Apply text format BEFORE writing values
            // This prevents Google Sheets from converting "0002673426" to 2673426
            if (skipHeader && numRows > 1) {
                // Apply text format only to data rows (skip header)
                sheet.getRange(startRow + 1, startCol, numRows - 1, numCols).setNumberFormat('@');
            } else {
                range.setNumberFormat('@');
            }
        }

        // Now write values - they will be preserved as text
        range.setValues(data);
    },

    /**
     * Formats a date for output
     * @param {Date|string} fecha - Date to format
     * @returns {Date|string}
     */
    formatearFecha(fecha) {
        if (fecha instanceof Date) return fecha;
        if (!fecha) return '';

        // Try to parse string date
        const d = new Date(fecha);
        return isNaN(d.getTime()) ? fecha : d;
    },

    /**
     * Converts a date string to a Date object for Google Sheets
     * Handles formats: dd/mm/yyyy, d/m/yyyy, mm/dd/yyyy, yyyy-mm-dd
     * @param {string|Date} fecha - Date string or Date object
     * @returns {Date|string} Date object if valid, original string if not
     */
    parseToDate(fecha) {
        if (!fecha) return '';
        if (fecha instanceof Date) return fecha;
        
        const str = String(fecha).trim();
        if (!str) return '';
        
        // Remove time portion if present (e.g., "25/09/2025 00:00:00")
        const datePart = str.includes(' ') ? str.split(' ')[0] : str;
        
        // Try dd/mm/yyyy or d/m/yyyy format (most common in EECC files)
        const dmyMatch = datePart.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1; // JavaScript months are 0-indexed
            const year = parseInt(dmyMatch[3], 10);
            
            // Validate day and month ranges
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                return new Date(year, month, day);
            }
        }
        
        // Try yyyy-mm-dd format (ISO)
        const isoMatch = datePart.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (isoMatch) {
            const year = parseInt(isoMatch[1], 10);
            const month = parseInt(isoMatch[2], 10) - 1;
            const day = parseInt(isoMatch[3], 10);
            return new Date(year, month, day);
        }
        
        // Return original if can't parse
        return str;
    },

    /**
     * Spanish month abbreviation mapping for CHUBB processor
     */
    MESES_ESPANOL: {
        'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
    },

    /**
     * Parses Spanish format date ("04 ago. 25")
     * REPLICA: CHUBB date parsing from VBA
     * @param {*} valor - Date value
     * @returns {Date|null}
     */
    parsearFechaEspanol(valor) {
        if (valor instanceof Date) return valor;

        const str = String(valor || '').toLowerCase().replace(/\./g, '').trim();
        const partes = str.split(/\s+/);

        if (partes.length >= 3) {
            const dia = parseInt(partes[0], 10);
            const mesKey = partes[1].substring(0, 3);
            const mes = this.MESES_ESPANOL[mesKey];
            let anio = parseInt(partes[2], 10);

            if (!isNaN(dia) && mes !== undefined && !isNaN(anio)) {
                if (anio < 100) anio += 2000;
                return new Date(anio, mes, dia);
            }
        }

        return null;
    },

    /**
     * Transforms DOCUMENTO field for Crecer&Protecta
     * REPLICA EXACTA: VBA transformation logic
     * @param {string} documento - DOCUMENTO value
     * @returns {string} Extracted coupon number
     */
    extraerCuponCrecerProtecta(documento) {
        const doc = String(documento || '').trim();
        const len = doc.length;
        let cupon = '';

        if (len === 22) {
            // "CC-AC-SCTR-000866016/1" → position 14 (index 13), length 7
            cupon = doc.substring(13, 20);
        } else if (len === 17) {
            // "AC-SCTR-000888610" → position 11 (index 10), length 7
            cupon = doc.substring(10, 17);
        } else if (doc.toUpperCase().startsWith('EPS-')) {
            // "EPS-00557721" → from position 5 (index 4)
            cupon = doc.substring(4);
        } else {
            cupon = doc;
        }

        // Remove leading zeros
        return this.quitarCerosIzquierda(cupon);
    },

    /**
     * Extracts coupon from Rimac based on length rules
     * REPLICA EXACTA: VBA length rules
     * @param {string} tipoDoc - TIPO.DOC value
     * @returns {string}
     */
    extraerCuponRimac(tipoDoc) {
        const doc = String(tipoDoc || '').trim();
        const len = doc.length;

        if (len === 9 || len === 10) {
            return doc;
        } else if (len >= 20 && len <= 22) {
            return doc.substring(0, 10);
        }

        return doc;
    },

    /**
     * Inserts hyphen after 4th character in FACTURA
     * REPLICA: CHUBB factura transformation
     * @param {string} factura - Factura value
     * @returns {string}
     */
    insertarGuionFactura(factura) {
        const fac = String(factura || '').trim();

        if (fac.length > 4 && fac.indexOf('-') === -1) {
            return fac.substring(0, 4) + '-' + fac.substring(4);
        }

        return fac;
    },

    /**
     * Builds coupon number for Crecer VLE
     * REPLICA: BuildNumeroCupon from VBA
     * "F008-00090390" → "8" + "00090390" → "800090390"
     * @param {string} nroComprobante - NRO_COMPROBANTE value
     * @returns {string}
     */
    buildNumeroCuponVLE(nroComprobante) {
        const nro = String(nroComprobante || '').trim();

        if (nro.length >= 6) {
            const char4 = nro.charAt(3);      // 4th character (index 3)
            const resto = nro.substring(5);    // From position 6 (index 5)
            return char4 + resto;
        }

        return nro;
    }
};
