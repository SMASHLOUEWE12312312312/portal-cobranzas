/**
 * @fileoverview Export functionality for conciliation results
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE:
 * - Sub ExportarTramaRegistrados()
 * - Sub ExportarEstadoCuentaPendientes()
 */

const ConciliacionExport = {
    /**
     * Exports both result files
     * 
     * @param {Sheet} wsTrama - Processed Trama sheet
     * @param {Sheet} wsEECC - Estado de Cuenta sheet
     * @param {Sheet} wsBDCruce - BD_Cruce sheet
     * @param {string} insurerKey - Insurer identifier
     * @param {Object} options - Additional options
     * @returns {Object} URLs of generated files
     */
    exportarResultados(wsTrama, wsEECC, wsBDCruce, insurerKey, options = {}) {
        const context = 'ConciliacionExport.exportarResultados';
        const columnasTrama = options.columnasTrama || 3;

        // Get destination folder
        const folderId = this._getExportFolderId();
        if (!folderId) {
            return { ok: false, error: 'Carpeta de exports no configurada' };
        }

        const folder = DriveApp.getFolderById(folderId);
        const timestamp = Utilities.formatDate(
            new Date(),
            'America/Lima',
            'yyyyMMdd_HHmmss'
        );

        const results = {
            tramaRegistrados: null,
            estadoCuentaPendientes: null
        };

        try {
            // 1. Export Trama_Registrados
            results.tramaRegistrados = this._exportarTramaRegistrados(
                wsTrama, folder, insurerKey, timestamp, columnasTrama
            );

            // 2. Export Estado_Cuenta_Pendientes
            results.estadoCuentaPendientes = this._exportarEstadoCuentaPendientes(
                wsTrama, wsEECC, wsBDCruce, folder, insurerKey, timestamp, options
            );

            return { ok: true, ...results };

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: error.message, ...results };
        }
    },

    /**
     * Exports Trama_Registrados
     * 
     * REPLICA EXACTA DE: Sub ExportarTramaRegistrados()
     * - Only rows with STATUS = "Cupón Registrado"
     * - WITHOUT STATUS column
     * - Columns A:C only
     */
    _exportarTramaRegistrados(wsTrama, folder, insurerKey, timestamp, columnasTrama) {
        const context = 'ConciliacionExport._exportarTramaRegistrados';

        const tramaData = wsTrama.getDataRange().getValues();
        const statusCol = columnasTrama + 1; // STATUS is after data columns

        // Filter only "Cupón Registrado" and without STATUS column
        const rows = [];

        // Headers without STATUS
        rows.push(tramaData[0].slice(0, columnasTrama));

        // Filtered data
        for (let i = 1; i < tramaData.length; i++) {
            const status = String(tramaData[i][statusCol - 1] || '').trim();
            if (status === ConciliacionCruce.STATUS.REGISTRADO) {
                rows.push(tramaData[i].slice(0, columnasTrama));
            }
        }

        if (rows.length <= 1) {
            return { ok: true, message: 'Sin cupones registrados para exportar', url: null, count: 0 };
        }

        // Create temporary spreadsheet
        const tempSSName = 'Trama_Registrados_' + insurerKey + '_' + timestamp;
        const tempSS = SpreadsheetApp.create(tempSSName);
        const sheet = tempSS.getSheets()[0];
        sheet.setName('Trama_Registrados');

        // Write data
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);

        // Format
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#D9D9D9');

        // Format date column (col B)
        if (rows.length > 1) {
            sheet.getRange(2, 2, rows.length - 1, 1).setNumberFormat('dd/mm/yyyy');
        }

        // Export as XLSX
        const url = 'https://docs.google.com/spreadsheets/d/' + tempSS.getId() + '/export?format=xlsx';
        const blob = UrlFetchApp.fetch(url, {
            headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
        }).getBlob();

        const fileName = tempSSName + '.xlsx';
        const file = folder.createFile(blob.setName(fileName));

        // Cleanup: delete temporary spreadsheet
        DriveApp.getFileById(tempSS.getId()).setTrashed(true);

        Logger.log(context + ': Exportado ' + (rows.length - 1) + ' registros');

        return {
            ok: true,
            url: file.getUrl(),
            count: rows.length - 1,
            fileName: fileName
        };
    },

    /**
     * Exports Estado_Cuenta_Pendientes
     * OPTIMIZED VERSION: Batch writes for performance
     * 
     * - Coupons from Trama with status "no Registrado" or "Validar Registro"
     * - Coupons from BD_Cruce with Estado = "Pendiente"
     * - OBSERVACION column with status
     * - Highlighting on columns E and G
     */
    _exportarEstadoCuentaPendientes(wsTrama, wsEECC, wsBDCruce, folder, insurerKey, timestamp, options) {
        const context = 'ConciliacionExport._exportarEstadoCuentaPendientes';
        const startRowEECC = options.startRowEECC || 2;
        const cuponColEECC = options.cuponColEECC || 7; // Column G by default

        // ========== PROFILING INSTRUMENTATION ==========
        const T = { start: Date.now() };
        const perfLog = (label) => {
            const now = Date.now();
            const elapsed = now - T.start;
            const delta = T.last ? now - T.last : elapsed;
            Logger.log('[PERF] exportPendientes | ' + label + ' | +' + delta + 'ms | total=' + elapsed + 'ms');
            T.last = now;
        };
        perfLog('INIT');

        // 1. Get pending coupons from Trama with their status
        const tramaData = wsTrama.getDataRange().getValues();
        const cuponesPendientes = new Map(); // cupon → status

        const lastColTrama = tramaData[0].length;

        for (let i = 1; i < tramaData.length; i++) {
            const cupon = String(tramaData[i][0] || '').trim();
            const status = String(tramaData[i][lastColTrama - 1] || '').trim();

            if (cupon && (status === ConciliacionCruce.STATUS.NO_REGISTRADO ||
                status === ConciliacionCruce.STATUS.VALIDAR)) {
                cuponesPendientes.set(cupon, status);
                // Also add normalized version
                cuponesPendientes.set(ProcessorBase.normalizarCupon(cupon), status);
            }
        }
        perfLog('BUILD_PENDING_MAP');

        if (cuponesPendientes.size === 0) {
            return { ok: true, message: 'Sin registros pendientes', url: null, count: 0 };
        }

        // 2. Get EECC rows corresponding to pending coupons
        const eeccData = wsEECC.getDataRange().getValues();
        const eeccHeaders = eeccData[0] || [];
        perfLog('READ_EECC');

        // Create temporary spreadsheet
        const tempSSName = 'Estado_Cuenta_Pendientes_' + insurerKey + '_' + timestamp;
        const tempSS = SpreadsheetApp.create(tempSSName);
        const wsOut = tempSS.getSheets()[0];
        wsOut.setName('Estado_Cuenta_Pendientes');

        // Headers + OBSERVACION column
        const headersOut = [...eeccHeaders, 'OBSERVACION'];
        wsOut.getRange(1, 1, 1, headersOut.length).setValues([headersOut]);
        wsOut.setFrozenRows(1);
        wsOut.getRange(1, 1, 1, headersOut.length).setFontWeight('bold').setBackground('#D9D9D9');
        perfLog('CREATE_TEMP_SS');

        // ========== BATCH ACCUMULATION ==========
        const outputRows = [];      // Data rows to write
        const highlightInfo = [];   // { rowIdx, status } for highlighting

        for (let i = startRowEECC - 1; i < eeccData.length; i++) {
            const row = eeccData[i];
            const cuponEECC = String(row[cuponColEECC - 1] || '').trim();
            const cuponNorm = ProcessorBase.normalizarCupon(cuponEECC);
            let statusEncontrado = cuponesPendientes.get(cuponEECC) || cuponesPendientes.get(cuponNorm);

            if (statusEncontrado) {
                const rowData = [...row, statusEncontrado];
                outputRows.push(rowData);
                highlightInfo.push({ rowIdx: outputRows.length - 1, status: statusEncontrado });
            }
        }
        perfLog('ACCUMULATE_ROWS');

        // ========== BATCH WRITE DATA ==========
        let rowOut = 2;
        if (outputRows.length > 0) {
            const numCols = outputRows[0].length;
            wsOut.getRange(2, 1, outputRows.length, numCols).setValues(outputRows);
            rowOut = 2 + outputRows.length;
        }
        perfLog('WRITE_DATA_BATCH');

        // ========== BATCH WRITE BACKGROUNDS ==========
        if (highlightInfo.length > 0 && wsOut.getLastColumn() >= 7) {
            // Prepare background arrays for columns E (5) and G (7)
            const bgColE = [];
            const bgColG = [];

            for (let i = 0; i < highlightInfo.length; i++) {
                const item = highlightInfo[i];
                let color = null;

                switch (item.status) {
                    case ConciliacionCruce.STATUS.NO_REGISTRADO:
                        color = ConciliacionCruce.COLORS.NO_REGISTRADO;
                        break;
                    case ConciliacionCruce.STATUS.VALIDAR:
                        color = ConciliacionCruce.COLORS.VALIDAR;
                        break;
                    case ConciliacionCruce.STATUS.PENDIENTE_BD:
                        color = ConciliacionCruce.COLORS.PENDIENTE_BD;
                        break;
                    default:
                        color = null;
                }

                bgColE.push([color]);
                bgColG.push([color]);
            }

            // Apply backgrounds in batch
            wsOut.getRange(2, 5, bgColE.length, 1).setBackgrounds(bgColE);
            wsOut.getRange(2, 7, bgColG.length, 1).setBackgrounds(bgColG);
        }
        perfLog('WRITE_BACKGROUNDS_BATCH');

        // Export as XLSX
        const url = 'https://docs.google.com/spreadsheets/d/' + tempSS.getId() + '/export?format=xlsx';
        const blob = UrlFetchApp.fetch(url, {
            headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
        }).getBlob();

        const fileName = tempSSName + '.xlsx';
        const file = folder.createFile(blob.setName(fileName));
        perfLog('EXPORT_XLSX');

        // Cleanup
        DriveApp.getFileById(tempSS.getId()).setTrashed(true);

        Logger.log(context + ': Exportados ' + (rowOut - 2) + ' registros pendientes (BATCH)');
        perfLog('COMPLETE');

        return {
            ok: true,
            url: file.getUrl(),
            count: rowOut - 2,
            fileName: fileName
        };
    },

    /**
     * Gets folder ID for exports
     */
    _getExportFolderId() {
        // First try conciliation-specific folder
        const concilFolder = getConfig('CONCILIACION.FOLDER_ID', '');
        if (concilFolder) return concilFolder;

        // Fallback to general outputs folder
        return getConfig('DRIVE.OUTPUT_FOLDER_ID', '');
    }
};
