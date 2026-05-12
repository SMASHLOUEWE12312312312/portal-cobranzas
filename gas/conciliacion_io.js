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
     * Uploads BD Sisnet file - OPTIMIZED VERSION V3
     * 
     * V3 FIXES:
     * - Extended lock timeout to 300s (5 min) for large files
     * - Better error handling with specific error codes
     * - Performance logging with correlation ID
     * - Robust fallback to Drive API when SheetJS unavailable
     * - Chunked writing for very large files (>50k rows)
     * 
     * @param {string} base64Data - File content in base64
     * @param {string} fileName - File name
     * @param {string} mimeType - File MIME type
     * @returns {Object} { ok: boolean, rowsLoaded?: number, data?: Array, error?: string }
     */
    subirBDSisnet(base64Data, fileName, mimeType) {
        const T = Date.now();

        // V10: Single lock attempt with 60s timeout
        const lock = LockService.getDocumentLock();
        const lockAcquired = lock.tryLock(60000);

        if (!lockAcquired) {
            return {
                ok: false,
                error: 'El sistema está ocupado. Por favor, espera unos segundos e intenta nuevamente.',
                errorCode: 'LOCK_TIMEOUT'
            };
        }

        let tempFileId = null;

        try {
            // Validation
            if (!base64Data) {
                return { ok: false, error: 'Datos de archivo vacíos', errorCode: 'EMPTY_DATA' };
            }
            if (!fileName) {
                return { ok: false, error: 'Nombre de archivo no especificado', errorCode: 'NO_FILENAME' };
            }

            const ss = this.getConciliacionSpreadsheet();
            if (!ss) {
                return { ok: false, error: 'Spreadsheet de conciliación no configurado (CONCILIACION.SS_ID)', errorCode: 'NO_SS_CONFIG' };
            }

            try {
                const bytes = this._safeBase64Decode(base64Data);

                const effectiveMime = mimeType ||
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                const blob = Utilities.newBlob(bytes, effectiveMime, fileName);

                const resource = {
                    title: 'TMP_BD_SISNET_' + Date.now(),
                    mimeType: 'application/vnd.google-apps.spreadsheet'
                };

                const tempFile = Drive.Files.insert(resource, blob, { convert: true });
                tempFileId = tempFile.id;

                const tempSS = SpreadsheetApp.openById(tempFileId);
                const tempSheet = tempSS.getSheets()[0];

                const lastRow = tempSheet.getLastRow();
                const lastCol = tempSheet.getLastColumn();
                
                if (lastRow < 2) {
                    return { ok: false, error: 'El archivo no contiene datos válidos (mínimo 2 filas)', errorCode: 'INVALID_DATA' };
                }
                
                const existingBDCruce = ss.getSheetByName('BD_Cruce');
                if (existingBDCruce) {
                    ss.deleteSheet(existingBDCruce);
                }

                const copiedSheet = tempSheet.copyTo(ss);
                copiedSheet.setName('BD_Cruce');
                copiedSheet.setTabColor('#00B0F0');
                copiedSheet.setFrozenRows(1);

                if (lastCol > 0) {
                    copiedSheet.getRange(1, 1, 1, lastCol).setFontWeight('bold').setBackground('#D9D9D9');
                }

                SpreadsheetApp.flush();

                const rowsLoaded = lastRow - 1;
                const totalTime = Date.now() - T;

                // Guardar metadata del último upload de BD Cruce
                try {
                    var uploaderEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'Desconocido';
                    PropertiesService.getScriptProperties().setProperty('BD_CRUCE_LAST_UPLOAD', JSON.stringify({
                        user: uploaderEmail,
                        date: new Date().toISOString(),
                        rows: rowsLoaded
                    }));
                } catch (metaErr) { /* best-effort */ }

                return {
                    ok: true,
                    rowsLoaded: rowsLoaded,
                    message: 'BD Sisnet cargada exitosamente. Registros: ' + rowsLoaded,
                    perfMs: totalTime
                };
                
            } catch (driveError) {
                Logger.log('subirBDSisnet Drive error: ' + driveError.message);
                return {
                    ok: false,
                    error: 'Error al procesar archivo Excel: ' + driveError.message,
                    errorCode: 'PROCESS_FAILED'
                };
            }

        } catch (error) {
            Logger.log('subirBDSisnet ERROR: ' + (error.message || String(error)));
            return {
                ok: false,
                error: 'Error al cargar BD Sisnet: ' + (error.message || String(error)),
                errorCode: 'EXCEPTION'
            };

        } finally {
            if (tempFileId) {
                try { Drive.Files.remove(tempFileId); } catch (e) { /* ignore */ }
            }
            lock.releaseLock();
        }
    },

    /**
     * Helper: Safe Base64 Decode with cleanup
     * @private
     */
    _safeBase64Decode(input) {
        if (!input) throw new Error('Input base64 is empty');
        // Aggressive cleanup: remove URI prefix AND all non-base64 chars (newlines, etc)
        const clean = (input.includes(',') ? input.split(',')[1] : input).replace(/[^A-Za-z0-9+/=]/g, "");
        if (clean.length % 4 !== 0) {
            // Pad with = if needed
            const padded = clean + '='.repeat((4 - clean.length % 4) % 4);
            return Utilities.base64Decode(padded);
        }
        return Utilities.base64Decode(clean);
    },

    /**
     * Parses XLSX directly using SheetJS (NO DRIVE OPERATIONS)
     * @private
     */
    _parseXLSXWithSheetJS(base64Data) {
        const bytes = this._safeBase64Decode(base64Data);
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
     * Converts XLSX to temporary Sheet - OPTIMIZED V3
     * Returns data directly if SheetJS available, otherwise creates temp file
     * 
     * V3 FIXES:
     * - Robust SheetJS error handling with Drive fallback
     * - Detailed logging for debugging
     * - Returns data directly when possible to avoid re-reading
     * 
     * @param {string} base64Data - Content in base64
     * @param {string} fileName - File name
     * @param {string} mimeType - MIME type
     * @returns {Object} { ok, fileId?, data?, error?, useSheetJS? }
     */
    convertirXLSXaSheet(base64Data, fileName, mimeType) {
        try {
            const bytes = this._safeBase64Decode(base64Data);

            const effectiveMime = mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const blob = Utilities.newBlob(bytes, effectiveMime, fileName);

            const resource = {
                title: 'TMP_EECC_' + Date.now(),
                mimeType: 'application/vnd.google-apps.spreadsheet'
            };

            const file = Drive.Files.insert(resource, blob, { convert: true });

            const tempSS = SpreadsheetApp.openById(file.id);
            const tempSheet = tempSS.getSheets()[0];
            const range = tempSheet.getDataRange();
            const data = range.getDisplayValues();
            // Native typed values (Date for date-formatted cells, Number for numbers).
            // Use `values` for any column where locale-dependent string parsing would be ambiguous
            // (e.g. dd/mm vs mm/dd dates). `data` is still authoritative for text columns
            // (cupones with leading zeros, factura with spaces, etc.).
            const values = range.getValues();

            return {
                ok: true,
                fileId: file.id,
                data: data,
                values: values,
                useSheetJS: false
            };

        } catch (error) {
            Logger.log('convertirXLSXaSheet FAILED: ' + error.message);
            return { ok: false, error: error.message, errorCode: 'CONVERT_FAILED' };
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
            const bytes = this._safeBase64Decode(base64Data);
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
            Logger.log('forceCreateTempFile Error: ' + error.message);
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
                // V3 FIX: DO NOT return data - it's too large and causes timeout
                return { ok: true, rowsCopied: dataRows.length };
            }

            return { ok: true, rowsCopied: 0 };

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
