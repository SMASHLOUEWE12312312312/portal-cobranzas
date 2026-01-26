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
        const context = 'ConciliacionIOV2.subirBDSisnet';
        const runId = 'BD_' + Date.now();
        const T = { start: Date.now() };
        const perfLog = (label, extra) => {
            const msg = '[PERF-V2][' + runId + '] subirBDSisnet | ' + label + ' | ' + (Date.now() - T.start) + 'ms';
            Logger.log(extra ? msg + ' | ' + JSON.stringify(extra) : msg);
        };
        perfLog('INIT', { fileName: fileName, base64Len: base64Data ? base64Data.length : 0 });

        // V3 FIX: Extended lock timeout to 300 seconds (5 min) for large files
        const lock = LockService.getScriptLock();
        if (!lock.tryLock(300000)) {
            Logger.log('[ERR][' + runId + '] Lock timeout - another process is running');
            return { ok: false, error: 'Proceso en ejecución, intenta más tarde', errorCode: 'LOCK_TIMEOUT' };
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
            perfLog('OPEN_SS_CACHED');

            // V4 FIX: ALWAYS use Drive API for file conversion
            // SheetJS hangs on large files (>2MB) in Apps Script environment
            // Drive API is slower but more reliable for production use
            let data;
            
            // Calculate file size (base64 is ~33% larger than original)
            const estimatedFileSizeMB = (base64Data.length * 0.75) / (1024 * 1024);
            Logger.log('[FLOW][' + runId + '] File size estimate: ' + estimatedFileSizeMB.toFixed(2) + ' MB');
            
            // Use Drive API for conversion (reliable for all file sizes)
            try {
                const bytes = this._safeBase64Decode(base64Data);
                perfLog('BASE64_DECODED', { byteLength: bytes.length });
                
                const effectiveMime = mimeType || 
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                const blob = Utilities.newBlob(bytes, effectiveMime, fileName);
                perfLog('BLOB_CREATED');

                const resource = {
                    title: 'TMP_BD_SISNET_' + runId,
                    mimeType: 'application/vnd.google-apps.spreadsheet'
                };

                // Drive conversion - this is the slow step but reliable
                perfLog('DRIVE_INSERT_START');
                const tempFile = Drive.Files.insert(resource, blob, { convert: true });
                tempFileId = tempFile.id;
                perfLog('DRIVE_INSERT_COMPLETE', { tempFileId: tempFileId });

                const tempSS = SpreadsheetApp.openById(tempFileId);
                const tempSheet = tempSS.getSheets()[0];
                data = tempSheet.getDataRange().getDisplayValues();
                perfLog('READ_TEMP_DATA', { rows: data.length, cols: data[0] ? data[0].length : 0 });
                
            } catch (driveError) {
                Logger.log('[ERR][' + runId + '] Drive conversion failed: ' + driveError.message);
                return { 
                    ok: false, 
                    error: 'Error al convertir archivo Excel: ' + driveError.message, 
                    errorCode: 'DRIVE_CONVERT_FAILED' 
                };
            }

            // Validate data
            if (!data || data.length < 2) {
                return { ok: false, error: 'El archivo no contiene datos válidos (mínimo 2 filas: encabezado + datos)', errorCode: 'INVALID_DATA' };
            }

            // Get or create BD_Cruce sheet
            let bdCruce = ss.getSheetByName('BD_Cruce');
            if (!bdCruce) {
                bdCruce = ss.insertSheet('BD_Cruce');
                perfLog('SHEET_CREATED');
            }

            // Clear sheet
            bdCruce.clear();
            perfLog('CLEAR_BD_CRUCE');

            const numRows = data.length;
            const numCols = data[0].length;
            perfLog('DATA_SIZE', { numRows: numRows, numCols: numCols });

            // V3 FIX: Chunked writing for very large files
            const CHUNK_SIZE = 20000;
            
            if (numRows <= CHUNK_SIZE) {
                // Standard batch write for normal files
                if (numRows > 1) {
                    bdCruce.getRange(2, 1, numRows - 1, numCols).setNumberFormat('@');
                }
                bdCruce.getRange(1, 1, numRows, numCols).setValues(data);
                perfLog('WRITE_SINGLE_BATCH');
            } else {
                // Chunked write for large files
                perfLog('WRITE_CHUNKED_START', { chunks: Math.ceil(numRows / CHUNK_SIZE) });
                
                for (let i = 0; i < numRows; i += CHUNK_SIZE) {
                    const endRow = Math.min(i + CHUNK_SIZE, numRows);
                    const chunk = data.slice(i, endRow);
                    const chunkRows = chunk.length;
                    
                    if (i > 0) { // Skip format for header row
                        bdCruce.getRange(i + 1, 1, chunkRows, numCols).setNumberFormat('@');
                    }
                    bdCruce.getRange(i + 1, 1, chunkRows, numCols).setValues(chunk);
                    
                    perfLog('WRITE_CHUNK', { chunk: Math.floor(i / CHUNK_SIZE) + 1, rows: chunkRows });
                }
            }

            // Apply formatting in batch
            bdCruce.setTabColor('#00B0F0');
            bdCruce.setFrozenRows(1);
            bdCruce.getRange(1, 1, 1, numCols).setFontWeight('bold').setBackground('#D9D9D9');

            // Single flush at the end
            SpreadsheetApp.flush();
            perfLog('WRITE_AND_FORMAT_COMPLETE');

            const rowsLoaded = numRows - 1;
            const totalTime = Date.now() - T.start;
            
            Logger.log('[SUCCESS][' + runId + '] BD Sisnet cargada. Registros: ' + rowsLoaded + ' | Tiempo: ' + totalTime + 'ms');

            // V3 FIX: DO NOT return data array - it's too large for google.script.run response
            // Data is already written to BD_Cruce sheet, no need to return it
            return {
                ok: true,
                rowsLoaded: rowsLoaded,
                message: 'BD Sisnet cargada exitosamente. Registros: ' + rowsLoaded,
                perfMs: totalTime,
                usedSheetJS: sheetJSAvailable
            };

        } catch (error) {
            const errMsg = error.message || String(error);
            Logger.log('[ERR][' + runId + '] subirBDSisnet EXCEPTION: ' + errMsg);
            Logger.log('[ERR][' + runId + '] Stack: ' + (error.stack || 'no stack'));
            return { 
                ok: false, 
                error: 'Error al cargar BD Sisnet: ' + errMsg, 
                errorCode: 'EXCEPTION' 
            };

        } finally {
            // Cleanup temp file
            if (tempFileId) {
                try {
                    Drive.Files.remove(tempFileId);
                    perfLog('CLEANUP_TEMP_FILE');
                } catch (e) {
                    Logger.log('[WARN][' + runId + '] Cleanup warning: ' + e.message);
                }
            }
            lock.releaseLock();
            perfLog('LOCK_RELEASED');
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
        const context = 'ConciliacionIOV2.convertirXLSXaSheet';
        const runId = 'CONV_' + Date.now();
        const T = { start: Date.now() };

        try {
            Logger.log('[FLOW][' + runId + '] convertirXLSXaSheet START | file: ' + fileName);
            
            // V4 FIX: ALWAYS use Drive API for conversion
            // SheetJS hangs on large files in Apps Script environment
            // Drive API is slower but reliable for production use
            
            Logger.log('[FLOW][' + runId + '] Using Drive API conversion (reliable method)...');
            const bytes = this._safeBase64Decode(base64Data);
            Logger.log('[FLOW][' + runId + '] Base64 decoded | bytes: ' + bytes.length);
            
            const effectiveMime = mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            const blob = Utilities.newBlob(bytes, effectiveMime, fileName);

            const resource = {
                title: 'TMP_EECC_' + runId,
                mimeType: 'application/vnd.google-apps.spreadsheet'
            };

            const file = Drive.Files.insert(resource, blob, { convert: true });
            Logger.log('[FLOW][' + runId + '] Drive conversion SUCCESS | fileId: ' + file.id + ' | ' + (Date.now() - T.start) + 'ms');
            
            // Read the data so processor doesn't have to re-open
            const tempSS = SpreadsheetApp.openById(file.id);
            const tempSheet = tempSS.getSheets()[0];
            const data = tempSheet.getDataRange().getDisplayValues();
            Logger.log('[FLOW][' + runId + '] Data read from temp file | rows: ' + data.length);
            
            return { 
                ok: true, 
                fileId: file.id, 
                data: data,
                useSheetJS: false 
            };

        } catch (error) {
            Logger.log('[ERR][' + runId + '] convertirXLSXaSheet FAILED: ' + error.message);
            Logger.log('[ERR][' + runId + '] Stack: ' + (error.stack || 'no stack'));
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
