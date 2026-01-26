/**
 * @fileoverview I/O operations for Conciliación module - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * CAMBIOS v2.0:
 * - NUEVO: Caché de spreadsheet abierto
 * - NUEVO: Soporte para SheetJS parsing directo
 * - OPTIMIZADO: Eliminación de lecturas duplicadas
 * - OPTIMIZADO: Batch writes consolidadas
 * 
 * MEJORAS ESPERADAS:
 * - subirBDSisnet: ~60% más rápido
 * - convertirXLSXaSheet: ~70% más rápido con SheetJS
 */

const ConciliacionIOV2 = {
    // Cache de spreadsheet abierto
    _ssCache: null,
    _ssCacheId: null,

    /**
     * Gets the Conciliation Spreadsheet (CACHED)
     * @returns {Spreadsheet|null}
     */
    getConciliacionSpreadsheet() {
        const ssId = this._getConciliacionSSId();
        if (!ssId) return null;

        // Return cached if same ID
        if (this._ssCacheId === ssId && this._ssCache) {
            return this._ssCache;
        }

        try {
            this._ssCache = SpreadsheetApp.openById(ssId);
            this._ssCacheId = ssId;
            return this._ssCache;
        } catch (e) {
            Logger.log('ConciliacionIOV2.getConciliacionSpreadsheet: ERROR - ' + e.message);
            return null;
        }
    },

    /**
     * Clears spreadsheet cache (call at end of processing)
     */
    clearCache() {
        this._ssCache = null;
        this._ssCacheId = null;
    },

    /**
     * Uploads BD Sisnet file - OPTIMIZED VERSION
     * 
     * @param {string} base64Data - File content in base64
     * @param {string} fileName - File name
     * @param {string} mimeType - File MIME type
     * @returns {Object} { ok: boolean, rowsLoaded?: number, data?: Array, error?: string }
     */
    subirBDSisnet(base64Data, fileName, mimeType) {
        const context = 'ConciliacionIOV2.subirBDSisnet';
        const T = { start: Date.now() };
        const perfLog = (label) => {
            Logger.log('[PERF-V2] subirBDSisnet | ' + label + ' | ' + (Date.now() - T.start) + 'ms');
        };
        perfLog('INIT');

        const lock = LockService.getScriptLock();
        if (!lock.tryLock(30000)) {
            return { ok: false, error: 'Proceso en ejecución, intenta más tarde' };
        }

        let tempFileId = null;

        try {
            if (!base64Data || !fileName) {
                return { ok: false, error: 'Datos de archivo inválidos' };
            }

            const ss = this.getConciliacionSpreadsheet();
            if (!ss) {
                return { ok: false, error: 'CONCILIACION.SS_ID no configurado' };
            }
            perfLog('OPEN_SS_CACHED');

            // Try SheetJS first if available
            let data;
            if (typeof XLSX !== 'undefined') {
                data = this._parseXLSXWithSheetJS(base64Data);
                perfLog('PARSE_SHEETJS');
            } else {
                // Fallback to Drive conversion
                const bytes = Utilities.base64Decode(base64Data);
                const blob = Utilities.newBlob(bytes, mimeType ||
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileName);

                const resource = {
                    title: 'TMP_BD_SISNET_' + Date.now(),
                    mimeType: 'application/vnd.google-apps.spreadsheet'
                };

                const tempFile = Drive.Files.insert(resource, blob, { convert: true });
                tempFileId = tempFile.id;
                perfLog('DRIVE_CONVERT');

                const tempSS = SpreadsheetApp.openById(tempFileId);
                const tempSheet = tempSS.getSheets()[0];
                data = tempSheet.getDataRange().getDisplayValues();
                perfLog('READ_TEMP_DATA');
            }

            if (!data || data.length < 2) {
                return { ok: false, error: 'El archivo no contiene datos válidos' };
            }

            // Get or create BD_Cruce sheet
            let bdCruce = ss.getSheetByName('BD_Cruce');
            if (!bdCruce) {
                bdCruce = ss.insertSheet('BD_Cruce');
            }

            // OPTIMIZED: Single batch write with pre-formatting
            bdCruce.clear();
            perfLog('CLEAR_BD_CRUCE');

            const numRows = data.length;
            const numCols = data[0].length;

            // CRITICAL: Set text format and values in optimal order
            // 1. First set text format on data rows
            if (numRows > 1) {
                bdCruce.getRange(2, 1, numRows - 1, numCols).setNumberFormat('@');
            }

            // 2. Write all data at once
            bdCruce.getRange(1, 1, numRows, numCols).setValues(data);

            // 3. Apply all formatting in one batch
            bdCruce.setTabColor('#00B0F0');
            bdCruce.setFrozenRows(1);
            bdCruce.getRange(1, 1, 1, numCols).setFontWeight('bold').setBackground('#D9D9D9');

            // Single flush at the end
            SpreadsheetApp.flush();
            perfLog('WRITE_AND_FORMAT_BATCH');

            const rowsLoaded = numRows - 1;
            Logger.log(context + ': BD Sisnet cargada. Registros: ' + rowsLoaded);

            return {
                ok: true,
                rowsLoaded: rowsLoaded,
                data: data,  // Return data for caching
                message: 'BD Sisnet cargada exitosamente. Registros: ' + rowsLoaded
            };

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: 'Error al cargar BD Sisnet: ' + error.message };

        } finally {
            if (tempFileId) {
                try {
                    Drive.Files.remove(tempFileId);
                } catch (e) {
                    Logger.log(context + ': Warning - ' + e.message);
                }
            }
            lock.releaseLock();
        }
    },

    /**
     * Parses XLSX directly using SheetJS (NO DRIVE OPERATIONS)
     * @private
     */
    _parseXLSXWithSheetJS(base64Data) {
        const bytes = Utilities.base64Decode(base64Data);
        const workbook = XLSX.read(bytes, {
            type: 'array',
            cellDates: true,
            cellText: true,
            raw: false
        });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to 2D array, preserving text format
        return XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: false,
            dateNF: 'dd/mm/yyyy'
        });
    },

    /**
     * Converts XLSX to temporary Sheet - OPTIMIZED
     * Returns data directly if SheetJS available
     * 
     * @param {string} base64Data - Content in base64
     * @param {string} fileName - File name
     * @param {string} mimeType - MIME type
     * @returns {Object} { ok, fileId?, data?, error? }
     */
    convertirXLSXaSheet(base64Data, fileName, mimeType) {
        const context = 'ConciliacionIOV2.convertirXLSXaSheet';

        try {
            // Try SheetJS first
            if (typeof XLSX !== 'undefined') {
                const data = this._parseXLSXWithSheetJS(base64Data);
                return {
                    ok: true,
                    fileId: null,  // No temp file created
                    data: data,    // Data ready to use
                    useSheetJS: true
                };
            }

            // Fallback to Drive conversion
            const bytes = Utilities.base64Decode(base64Data);
            const blob = Utilities.newBlob(bytes,
                mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                fileName);

            const resource = {
                title: 'TMP_EECC_' + Date.now(),
                mimeType: 'application/vnd.google-apps.spreadsheet'
            };

            const file = Drive.Files.insert(resource, blob, { convert: true });
            return { ok: true, fileId: file.id, useSheetJS: false };

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Forces creation of a temporary Google Sheet (Legacy support)
     * @param {string} base64Data 
     * @param {string} fileName 
     * @param {string} mimeType 
     */
    forceCreateTempFile(base64Data, fileName, mimeType) {
        try {
            const bytes = Utilities.base64Decode(base64Data);
            const blob = Utilities.newBlob(bytes,
                mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                fileName);

            const resource = {
                title: 'TMP_EECC_LEGACY_' + Date.now(),
                mimeType: 'application/vnd.google-apps.spreadsheet'
            };

            const file = Drive.Files.insert(resource, blob, { convert: true });
            return { ok: true, fileId: file.id };
        } catch (error) {
            return { ok: false, error: error.message };
        }
    },

    /**
     * Gets data from temp file or from pre-parsed data
     * @param {string|null} tempFileId - Temp file ID (null if SheetJS used)
     * @param {Array|null} parsedData - Pre-parsed data from SheetJS
     * @param {string} sheetName - Sheet name to look for (optional)
     * @returns {Array} 2D array of data
     */
    getDataFromSource(tempFileId, parsedData, sheetName) {
        // If we have pre-parsed data, use it
        if (parsedData && Array.isArray(parsedData)) {
            return parsedData;
        }

        // Otherwise read from temp file
        if (tempFileId) {
            const tempSS = SpreadsheetApp.openById(tempFileId);
            let sheet = sheetName ? tempSS.getSheetByName(sheetName) : null;
            if (!sheet) {
                sheet = tempSS.getSheets()[0];
            }
            return sheet.getDataRange().getDisplayValues();
        }

        return [];
    },

    /**
     * Loads EECC data into sheet - OPTIMIZED
     * @param {string|null} tempFileId - Temp file ID
     * @param {Array|null} parsedData - Pre-parsed data
     * @param {string} sheetName - Target sheet name
     * @param {number} startRow - Row to start copying
     * @param {Spreadsheet} ss - Conciliation spreadsheet
     * @returns {Object}
     */
    cargarEECCenHoja(tempFileId, parsedData, sheetName, startRow, ss) {
        const context = 'ConciliacionIOV2.cargarEECCenHoja';

        try {
            let wsEECC = ss.getSheetByName(sheetName);
            if (!wsEECC) {
                wsEECC = ss.insertSheet(sheetName);
            }

            ProcessorBase.clearFromRow(wsEECC, startRow);

            // Get source data
            const srcData = this.getDataFromSource(tempFileId, parsedData, null);

            if (srcData.length >= startRow) {
                const dataRows = srcData.slice(startRow - 1);
                if (dataRows.length > 0) {
                    const numRows = dataRows.length;
                    const numCols = dataRows[0].length;
                    const targetRange = wsEECC.getRange(startRow, 1, numRows, numCols);

                    // OPTIMIZED: Format then write
                    targetRange.setNumberFormat('@');
                    targetRange.setValues(dataRows);
                }
                return { ok: true, rowsCopied: dataRows.length, data: srcData };
            }

            return { ok: true, rowsCopied: 0, data: srcData };

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Deletes temporary file from Drive
     */
    eliminarArchivoTemporal(fileId) {
        if (!fileId) return;
        try {
            Drive.Files.remove(fileId);
        } catch (e) {
            Logger.log('ConciliacionIOV2.eliminarArchivoTemporal: Warning - ' + e.message);
        }
    },

    /**
     * Gets conciliation spreadsheet ID
     * @private
     */
    _getConciliacionSSId() {
        try {
            const props = PropertiesService.getScriptProperties();
            const fromProps = props.getProperty('CONCILIACION_SS_ID');
            if (fromProps) return fromProps;
        } catch (e) { }
        return getConfig('CONCILIACION.SS_ID', null);
    }
};

// Alias for backward compatibility
const ConciliacionIO = ConciliacionIOV2;
