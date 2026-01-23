/**
 * @fileoverview Export functionality for conciliation results
 * @version 2.0.0 - OPTIMIZED WITH DIRECT DOWNLOAD
 * 
 * CAMBIOS v2.0:
 * - Batch writes para performance
 * - Descarga directa (retorna base64, no URL de Drive)
 * - No crea archivos permanentes en Drive
 * - Aplica a TODAS las aseguradoras
 */

const ConciliacionExport = {
    /**
     * Exports both result files with DIRECT DOWNLOAD
     * 
     * @param {Sheet} wsTrama - Processed Trama sheet
     * @param {Sheet} wsEECC - Estado de Cuenta sheet
     * @param {Sheet} wsBDCruce - BD_Cruce sheet
     * @param {string} insurerKey - Insurer identifier
     * @param {Object} options - Additional options
     * @returns {Object} Base64 content for direct download
     */
    exportarResultados(wsTrama, wsEECC, wsBDCruce, insurerKey, options = {}) {
        const context = 'ConciliacionExport.exportarResultados';
        const columnasTrama = options.columnasTrama || 3;

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
            // 1. Export Trama_Registrados (DIRECT DOWNLOAD)
            results.tramaRegistrados = this._exportarTramaRegistradosDirecto(
                wsTrama, insurerKey, timestamp, columnasTrama
            );

            // 2. Export Estado_Cuenta_Pendientes (DIRECT DOWNLOAD)
            results.estadoCuentaPendientes = this._exportarEstadoCuentaPendientesDirecto(
                wsTrama, wsEECC, wsBDCruce, insurerKey, timestamp, options
            );

            return { ok: true, ...results };

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: error.message, ...results };
        }
    },

    /**
     * Exports Trama_Registrados with DIRECT DOWNLOAD
     * Returns base64 content instead of Drive URL
     * 
     * @private
     */
    _exportarTramaRegistradosDirecto(wsTrama, insurerKey, timestamp, columnasTrama) {
        const context = 'ConciliacionExport._exportarTramaRegistradosDirecto';

        // Profiling
        const T = { start: Date.now() };
        const perfLog = (label) => {
            const now = Date.now();
            Logger.log('[PERF] exportTramaDirecto | ' + label + ' | ' + (now - T.start) + 'ms');
        };

        // FIX: Usar getDisplayValues() para preservar datos originales
        const tramaData = wsTrama.getDataRange().getDisplayValues();
        const statusCol = columnasTrama + 1;

        // Filter only "Cupón Registrado" and without STATUS column
        const rows = [];
        rows.push(tramaData[0].slice(0, columnasTrama)); // Headers

        for (let i = 1; i < tramaData.length; i++) {
            const status = String(tramaData[i][statusCol - 1] || '').trim();
            if (status === ConciliacionCruce.STATUS.REGISTRADO) {
                rows.push(tramaData[i].slice(0, columnasTrama));
            }
        }
        perfLog('FILTER_DATA');

        if (rows.length <= 1) {
            return {
                ok: true,
                message: 'Sin cupones registrados para exportar',
                base64: null,
                fileName: null,
                count: 0
            };
        }

        // Create temporary spreadsheet (will be deleted immediately)
        const tempSSName = 'TMP_Trama_' + Date.now();
        const tempSS = SpreadsheetApp.create(tempSSName);
        const sheet = tempSS.getSheets()[0];
        sheet.setName('Trama_Registrados');
        perfLog('CREATE_TEMP_SS');

        // BATCH write data
        sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);

        // BATCH format
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#D9D9D9');

        // Format date column (col B)
        if (rows.length > 1) {
            sheet.getRange(2, 2, rows.length - 1, 1).setNumberFormat('dd/mm/yyyy');
        }

        SpreadsheetApp.flush();
        perfLog('WRITE_AND_FORMAT');

        // Export to XLSX blob
        const exportUrl = 'https://docs.google.com/spreadsheets/d/' + tempSS.getId() + '/export?format=xlsx';
        const blob = UrlFetchApp.fetch(exportUrl, {
            headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
        }).getBlob();
        perfLog('EXPORT_XLSX');

        // Convert to base64 for direct download
        const base64 = Utilities.base64Encode(blob.getBytes());
        perfLog('ENCODE_BASE64');

        // IMMEDIATELY delete temporary spreadsheet (no Drive file created)
        DriveApp.getFileById(tempSS.getId()).setTrashed(true);
        perfLog('CLEANUP');

        const fileName = 'Trama_Registrados_' + insurerKey + '_' + timestamp + '.xlsx';

        Logger.log(context + ': Exportado ' + (rows.length - 1) + ' registros (DESCARGA DIRECTA)');

        return {
            ok: true,
            base64: base64,
            fileName: fileName,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            count: rows.length - 1
        };
    },

    /**
     * Exports Estado_Cuenta_Pendientes with DIRECT DOWNLOAD
     * OPTIMIZED: Batch writes + returns base64
     * FIX v1.1: Detección robusta de columna STATUS
     * FIX v1.2: Soporte multi-columna para cupón EECC (Pacífico E/F)
     * 
     * @private
     */
    _exportarEstadoCuentaPendientesDirecto(wsTrama, wsEECC, wsBDCruce, insurerKey, timestamp, options) {
        const context = 'ConciliacionExport._exportarEstadoCuentaPendientesDirecto';
        const startRowEECC = options.startRowEECC || 2;

        // FIX v1.2: Soporte multi-columna sin romper compatibilidad
        const cuponColsEECC = Array.isArray(options.cuponColsEECC) && options.cuponColsEECC.length
            ? options.cuponColsEECC
            : [(options.cuponColEECC || 7)];

        // FIX v1.2: Opción para limpiar sufijos tipo "(x/y)"
        const stripParenSuffix = options.cuponStripParenSuffix === true;
        const sanitizeCupon = (v) => {
            let s = String(v || '').trim();
            if (stripParenSuffix && s) {
                s = s.replace(/\([^)]*\)$/, '').trim();
            }
            return s;
        };

        // Profiling
        const T = { start: Date.now() };
        const perfLog = (label) => {
            const now = Date.now();
            Logger.log('[PERF] exportPendientesDirecto | ' + label + ' | ' + (now - T.start) + 'ms');
        };

        // 1. Build pending coupons map
        // FIX: Usar getDisplayValues() para preservar datos originales
        const tramaData = wsTrama.getDataRange().getDisplayValues();
        const cuponesPendientes = new Map();
        const lastColTrama = tramaData[0].length;

        // FIX v1.1: Determinar columna STATUS de forma robusta
        let statusColIndex = null;

        if (options.statusColTrama) {
            statusColIndex = options.statusColTrama - 1;
        }

        if (statusColIndex === null && tramaData.length > 0) {
            const headers = tramaData[0];
            for (let c = 0; c < headers.length; c++) {
                if (String(headers[c]).trim().toUpperCase() === 'STATUS') {
                    statusColIndex = c;
                    break;
                }
            }
        }

        if (statusColIndex === null) {
            statusColIndex = (options.columnasTrama || 3);
        }

        Logger.log(context + ': statusColIndex=' + statusColIndex + ' | cuponColsEECC=' + JSON.stringify(cuponColsEECC) + ' | stripParenSuffix=' + stripParenSuffix);

        // FIX v1.3: Soporte multi-columna para cupón desde Trama (ej. Crecer VLE: NUMERO_CUPON + FACTURA)
        const cuponColsTrama = Array.isArray(options.cuponColsTrama) && options.cuponColsTrama.length
            ? options.cuponColsTrama
            : [1]; // DEFAULT: col 1 (NUMERO_CUPON) — comportamiento actual

        Logger.log(context + ': cuponColsTrama=' + JSON.stringify(cuponColsTrama));

        for (let i = 1; i < tramaData.length; i++) {
            const status = String(tramaData[i][statusColIndex] || '').trim();

            if (status === ConciliacionCruce.STATUS.NO_REGISTRADO ||
                status === ConciliacionCruce.STATUS.VALIDAR) {
                for (let k = 0; k < cuponColsTrama.length; k++) {
                    const col = cuponColsTrama[k];
                    const keyRaw = String(tramaData[i][col - 1] || '').trim();
                    if (!keyRaw) continue;

                    // Regla de prioridad (NO_REGISTRADO gana sobre VALIDAR si colisiona)
                    const prev = cuponesPendientes.get(keyRaw);
                    if (!prev || (prev === ConciliacionCruce.STATUS.VALIDAR && status === ConciliacionCruce.STATUS.NO_REGISTRADO)) {
                        cuponesPendientes.set(keyRaw, status);
                        cuponesPendientes.set(ProcessorBase.normalizarCupon(keyRaw), status);
                    }
                }
            }
        }
        perfLog('BUILD_MAP');

        Logger.log(context + ': Cupones pendientes encontrados: ' + cuponesPendientes.size);

        if (cuponesPendientes.size === 0) {
            return {
                ok: true,
                message: 'Sin registros pendientes',
                base64: null,
                fileName: null,
                count: 0
            };
        }

        // 2. Get EECC data and accumulate rows
        // FIX: Usar getDisplayValues() para preservar datos originales
        const eeccData = wsEECC.getDataRange().getDisplayValues();
        const eeccHeaders = eeccData[0] || [];

        const outputRows = [];
        const highlightInfo = [];

        // FIX v1.2: Contador por columna para logging
        const matchesByCol = {};
        cuponColsEECC.forEach(c => matchesByCol[c] = 0);

        for (let i = startRowEECC - 1; i < eeccData.length; i++) {
            const row = eeccData[i];

            let statusEncontrado = null;
            let matchedCol = null;

            // FIX v1.2: Intentar match por cualquiera de las columnas configuradas (en orden)
            for (let k = 0; k < cuponColsEECC.length; k++) {
                const col = cuponColsEECC[k];
                const cuponRaw = sanitizeCupon(row[col - 1]);
                if (!cuponRaw) continue;

                const cuponNorm = ProcessorBase.normalizarCupon(cuponRaw);
                statusEncontrado = cuponesPendientes.get(cuponRaw) || cuponesPendientes.get(cuponNorm);

                if (statusEncontrado) {
                    matchedCol = col;
                    break;
                }
            }

            if (statusEncontrado) {
                const rowData = [...row, statusEncontrado];
                outputRows.push(rowData);
                highlightInfo.push({ rowIdx: outputRows.length - 1, status: statusEncontrado });

                if (matchedCol != null) {
                    matchesByCol[matchedCol] = (matchesByCol[matchedCol] || 0) + 1;
                }
            }
        }

        Logger.log(context + ': matchesByCol=' + JSON.stringify(matchesByCol) + ' | exportRows=' + outputRows.length + ' | pendientesMapSize=' + cuponesPendientes.size);
        perfLog('ACCUMULATE');

        if (outputRows.length === 0) {
            return {
                ok: true,
                message: 'Sin registros pendientes encontrados en EECC',
                base64: null,
                fileName: null,
                count: 0
            };
        }

        // 3. Create temporary spreadsheet
        const tempSSName = 'TMP_Pendientes_' + Date.now();
        const tempSS = SpreadsheetApp.create(tempSSName);
        const wsOut = tempSS.getSheets()[0];
        wsOut.setName('Estado_Cuenta_Pendientes');
        perfLog('CREATE_TEMP_SS');

        // 4. BATCH write headers
        const headersOut = [...eeccHeaders, 'OBSERVACION'];
        wsOut.getRange(1, 1, 1, headersOut.length).setValues([headersOut]);
        wsOut.setFrozenRows(1);
        wsOut.getRange(1, 1, 1, headersOut.length).setFontWeight('bold').setBackground('#D9D9D9');

        // 5. BATCH write data
        const numCols = outputRows[0].length;
        wsOut.getRange(2, 1, outputRows.length, numCols).setValues(outputRows);
        perfLog('WRITE_DATA');

        // 6. BATCH write backgrounds for columns E and G
        if (highlightInfo.length > 0) {
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
                }

                bgColE.push([color]);
                bgColG.push([color]);
            }

            // Only apply if columns exist
            const lastCol = wsOut.getLastColumn();
            if (lastCol >= 5) {
                wsOut.getRange(2, 5, bgColE.length, 1).setBackgrounds(bgColE);
            }
            if (lastCol >= 7) {
                wsOut.getRange(2, 7, bgColG.length, 1).setBackgrounds(bgColG);
            }
        }
        perfLog('WRITE_BACKGROUNDS');

        SpreadsheetApp.flush();

        // 7. Export to XLSX blob
        const exportUrl = 'https://docs.google.com/spreadsheets/d/' + tempSS.getId() + '/export?format=xlsx';
        const blob = UrlFetchApp.fetch(exportUrl, {
            headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
        }).getBlob();
        perfLog('EXPORT_XLSX');

        // 8. Convert to base64
        const base64 = Utilities.base64Encode(blob.getBytes());
        perfLog('ENCODE_BASE64');

        // 9. IMMEDIATELY delete temporary spreadsheet
        DriveApp.getFileById(tempSS.getId()).setTrashed(true);
        perfLog('CLEANUP');

        const fileName = 'Estado_Cuenta_Pendientes_' + insurerKey + '_' + timestamp + '.xlsx';

        Logger.log(context + ': Exportados ' + outputRows.length + ' registros (DESCARGA DIRECTA)');

        return {
            ok: true,
            base64: base64,
            fileName: fileName,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            count: outputRows.length
        };
    }
};
