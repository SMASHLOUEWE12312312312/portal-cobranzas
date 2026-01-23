/**
 * @fileoverview I/O operations for Conciliación module
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Mod_Subir_BD_Sisnet.bas
 * Handles file upload, conversion, and spreadsheet operations.
 */

const ConciliacionIO = {
    /**
     * Uploads BD Sisnet file and loads it into BD_Cruce sheet
     * 
     * REPLICA EXACTA DE: Mod_Subir_BD_Sisnet.bas → Sub Subir_BD_Sisnet()
     * 
     * @param {string} base64Data - File content in base64
     * @param {string} fileName - File name
     * @param {string} mimeType - File MIME type
     * @returns {Object} { ok: boolean, rowsLoaded?: number, error?: string }
     */
    subirBDSisnet(base64Data, fileName, mimeType) {
        const context = 'ConciliacionIO.subirBDSisnet';

        // ========== PROFILING INSTRUMENTATION ==========
        const T = { start: Date.now() };
        const perfLog = (label) => {
            const now = Date.now();
            const elapsed = now - T.start;
            const delta = T.last ? now - T.last : elapsed;
            Logger.log('[PERF] subirBDSisnet | ' + label + ' | +' + delta + 'ms | total=' + elapsed + 'ms');
            T.last = now;
        };
        perfLog('INIT');

        // Get lock to prevent simultaneous executions
        const lock = LockService.getScriptLock();
        if (!lock.tryLock(30000)) {
            return { ok: false, error: 'Proceso en ejecución, intenta más tarde' };
        }

        let tempFileId = null;

        try {
            Logger.log(context + ': Iniciando carga de BD Sisnet');

            // 1. Validate input
            if (!base64Data || !fileName) {
                return { ok: false, error: 'Datos de archivo inválidos' };
            }

            // 2. Get conciliation spreadsheet
            const ssId = this._getConciliacionSSId();
            if (!ssId) {
                return { ok: false, error: 'CONCILIACION.SS_ID no configurado en config.js' };
            }

            const ss = SpreadsheetApp.openById(ssId);
            perfLog('OPEN_SS');

            // 3. Convert base64 to blob
            const bytes = Utilities.base64Decode(base64Data);
            const blob = Utilities.newBlob(
                bytes,
                mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                fileName
            );
            perfLog('CREATE_BLOB');

            // 4. Upload to Drive and convert to Google Sheet
            const resource = {
                title: 'TMP_BD_SISNET_' + Date.now(),
                mimeType: 'application/vnd.google-apps.spreadsheet'
            };

            const tempFile = Drive.Files.insert(resource, blob, { convert: true });
            tempFileId = tempFile.id;
            perfLog('DRIVE_CONVERT');

            // 5. Read data from temporary file
            const tempSS = SpreadsheetApp.openById(tempFileId);
            const tempSheet = tempSS.getSheets()[0];
            // FIX: Usar getDisplayValues() para preservar datos originales (ej: ceros iniciales)
            const data = tempSheet.getDataRange().getDisplayValues();
            perfLog('READ_TEMP_DATA');

            // 6. Validate data (minimum 2 rows: header + 1 data)
            if (data.length < 2) {
                return { ok: false, error: 'El archivo no contiene datos válidos (mínimo 2 filas requeridas)' };
            }

            // 7. Get or create BD_Cruce sheet
            let bdCruce = ss.getSheetByName('BD_Cruce');
            if (!bdCruce) {
                bdCruce = ss.insertSheet('BD_Cruce');
            }

            // 8. CLEAR sheet completely (replica: wsBDCruce.Cells.Clear)
            bdCruce.clear();
            perfLog('CLEAR_BD_CRUCE');

            // 9. Write data (replica: wsOrigen.UsedRange.Copy wsBDCruce.Range("A1"))
            // FIX v2.0: Apply text format BEFORE writing to preserve original values
            const numRows = data.length;
            const numCols = data[0].length;
            const dataRange = bdCruce.getRange(1, 1, numRows, numCols);

            // CRITICAL: Set text format on data rows (skip header row)
            if (numRows > 1) {
                bdCruce.getRange(2, 1, numRows - 1, numCols).setNumberFormat('@');
            }

            // Now write values - they will be preserved as text
            dataRange.setValues(data);
            perfLog('WRITE_BD_CRUCE');

            // 10. Apply formatting in batch (optimized)
            bdCruce.setTabColor('#00B0F0');
            bdCruce.setFrozenRows(1);
            const headerRange = bdCruce.getRange(1, 1, 1, numCols);
            headerRange.setFontWeight('bold').setBackground('#D9D9D9');
            SpreadsheetApp.flush();
            perfLog('FORMAT_COMPLETE');

            // 11. Rows loaded (without header)
            const rowsLoaded = numRows - 1;

            Logger.log(context + ': BD Sisnet cargada exitosamente. Registros: ' + rowsLoaded);
            perfLog('COMPLETE');

            return {
                ok: true,
                rowsLoaded: rowsLoaded,
                message: 'BD Sisnet cargada exitosamente. Registros cargados: ' + rowsLoaded
            };

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: 'Error al cargar BD Sisnet: ' + error.message };

        } finally {
            // ALWAYS cleanup temporary file
            if (tempFileId) {
                try {
                    Drive.Files.remove(tempFileId);
                } catch (e) {
                    Logger.log(context + ': Warning - No se pudo eliminar archivo temporal: ' + e.message);
                }
            }
            lock.releaseLock();
        }
    },

    /**
     * Converts XLSX file to temporary Google Sheet
     * @param {string} base64Data - Content in base64
     * @param {string} fileName - File name
     * @param {string} mimeType - MIME type
     * @returns {Object} { ok: boolean, fileId?: string, error?: string }
     */
    convertirXLSXaSheet(base64Data, fileName, mimeType) {
        const context = 'ConciliacionIO.convertirXLSXaSheet';

        try {
            const bytes = Utilities.base64Decode(base64Data);
            const blob = Utilities.newBlob(
                bytes,
                mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                fileName
            );

            const resource = {
                title: 'TMP_EECC_' + Date.now(),
                mimeType: 'application/vnd.google-apps.spreadsheet'
            };

            const file = Drive.Files.insert(resource, blob, { convert: true });

            return { ok: true, fileId: file.id };

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Deletes temporary file from Drive
     * @param {string} fileId - File ID to delete
     */
    eliminarArchivoTemporal(fileId) {
        if (!fileId) return;

        try {
            Drive.Files.remove(fileId);
        } catch (e) {
            Logger.log('ConciliacionIO.eliminarArchivoTemporal: Warning - ' + e.message);
        }
    },

    /**
     * Gets the Conciliation Spreadsheet
     * @returns {Spreadsheet|null}
     */
    getConciliacionSpreadsheet() {
        const ssId = this._getConciliacionSSId();
        if (!ssId) return null;

        try {
            return SpreadsheetApp.openById(ssId);
        } catch (e) {
            Logger.log('ConciliacionIO.getConciliacionSpreadsheet: ERROR - ' + e.message);
            return null;
        }
    },

    /**
     * Loads EECC data into the corresponding sheet
     * @param {string} tempFileId - Temporary file ID
     * @param {string} sheetName - Target sheet name (e.g., "EECC_La Positiva")
     * @param {number} startRow - Row to start copying data
     * @param {Spreadsheet} ss - Conciliation spreadsheet
     * @returns {Object} { ok: boolean, rowsCopied?: number, error?: string }
     */
    cargarEECCenHoja(tempFileId, sheetName, startRow, ss) {
        const context = 'ConciliacionIO.cargarEECCenHoja';

        try {
            // Get target sheet
            let wsEECC = ss.getSheetByName(sheetName);
            if (!wsEECC) {
                wsEECC = ss.insertSheet(sheetName);
            }

            // Clear from startRow
            ProcessorBase.clearFromRow(wsEECC, startRow);

            // Read source data
            const tempSS = SpreadsheetApp.openById(tempFileId);
            const tempSheet = tempSS.getSheets()[0];
            const srcData = tempSheet.getDataRange().getDisplayValues();

            // Copy data from startRow
            // FIX v2.0: Apply text format BEFORE writing to preserve original values
            if (srcData.length >= startRow) {
                const dataRows = srcData.slice(startRow - 1);
                if (dataRows.length > 0) {
                    const numRows = dataRows.length;
                    const numCols = dataRows[0].length;
                    const targetRange = wsEECC.getRange(startRow, 1, numRows, numCols);

                    // CRITICAL: Set text format BEFORE writing
                    targetRange.setNumberFormat('@');

                    // Now write values
                    targetRange.setValues(dataRows);
                }
                return { ok: true, rowsCopied: dataRows.length };
            }

            return { ok: true, rowsCopied: 0 };

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Gets a specific sheet from source file by name
     * @param {string} tempFileId - Temporary file ID
     * @param {string} sheetName - Sheet name to find
     * @returns {Sheet|null}
     */
    getSheetFromTempFile(tempFileId, sheetName) {
        try {
            const tempSS = SpreadsheetApp.openById(tempFileId);
            return tempSS.getSheetByName(sheetName);
        } catch (e) {
            return null;
        }
    },

    /**
     * Gets conciliation spreadsheet ID
     * @private
     * @returns {string|null}
     */
    _getConciliacionSSId() {
        // First try Script Properties (more secure)
        try {
            const props = PropertiesService.getScriptProperties();
            const fromProps = props.getProperty('CONCILIACION_SS_ID');
            if (fromProps) return fromProps;
        } catch (e) {
            // Ignore
        }

        // Then try config.js
        return getConfig('CONCILIACION.SS_ID', null);
    }
};
