/**
 * @fileoverview Processor for Qualitas insurance company - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_Qualitas
 * - Trama Sheet: Trama_Qualitas
 * - Data start row: 17 (IMPORTANT!)
 * - Filter: None
 * - Trama has only 3 columns (NO FACTURA)
 * - Mapping:
 *   - CUPON: Col J
 *   - FECHA: Col N
 *   - FACTURA: - (not applicable)
 */

const QualitasProcessorV2 = {
    CONFIG: {
        HOJA_EECC: 'EECC_Qualitas',
        HOJA_TRAMA: 'Trama_Qualitas',
        START_ROW: 17,           // IMPORTANT: row 17, not 2!

        COL_CUPON: 10,           // J - CUPON
        COL_FECHA: 14,           // N - Fecha

        // Standard 4 columns
        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy', 3: '@' }
    },

    /**
     * OPTIMIZED process method that uses shared DataContext
     * 
     * @param {Object} convertResult - Result from convertirXLSXaSheet
     * @param {Spreadsheet} ss - Conciliation spreadsheet
     * @param {Object} dataContext - Shared data context
     * @returns {Object} Processing result
     */
    processOptimized(convertResult, ss, dataContext) {
        const context = 'QualitasProcessorV2.processOptimized';
        const cfg = this.CONFIG;
        const T = { start: Date.now() };
        const perfLog = (label) => {
            Logger.log('[PERF-V2] Qualitas | ' + label + ' | ' + (Date.now() - T.start) + 'ms');
        };

        Logger.log(context + ': Iniciando procesamiento OPTIMIZADO (ROW 17)');
        perfLog('INIT');

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        // Link BD_Cruce
        const wsBDCruce = dataContext.bdCruceSheet;
        if (!wsBDCruce) throw new Error('BD_Cruce no encontrada en contexto');
        perfLog('SHEETS_READY');

        // Clear sheets
        wsEECC.clear();
        ProcessorBase.clearFromRow(wsTrama, 2);
        perfLog('SHEETS_CLEARED');

        // Get source data
        let srcData;
        if (convertResult.data) {
            srcData = convertResult.data;
            perfLog('DATA_FROM_SHEETJS');
        } else {
            const tempSS = SpreadsheetApp.openById(convertResult.fileId);
            const tempSheet = tempSS.getSheets()[0];
            srcData = tempSheet.getDataRange().getDisplayValues();
            perfLog('DATA_FROM_DRIVE');
        }

        // Write to EECC (headers + data)
        // Note: Qualitas keeps original headers and data structure starting at row 17
        if (srcData.length > 0) {
            const numRows = srcData.length;
            const numCols = srcData[0].length;

            // Text format for data rows (assuming header is row 1-16, data starts 17)
            // Ideally we format the whole sheet to be safe or just the data part
            wsEECC.getRange(1, 1, numRows, numCols).setNumberFormat('@');

            // Write all data
            wsEECC.getRange(1, 1, numRows, numCols).setValues(srcData);

            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, numCols).setFontWeight('bold').setBackground('#D9D9D9');
        }
        perfLog('EECC_WRITTEN');

        const filasCargadas = Math.max(0, srcData.length - cfg.START_ROW + 1);

        // Process EECC from row 17
        const tramaRows = [];

        // Protection against empty files
        if (srcData.length >= cfg.START_ROW) {
            for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
                const row = srcData[i];

                const numeroCupon = String(row[cfg.COL_CUPON - 1] || '').trim();
                if (!numeroCupon) continue;

                // Convert date to DD/MM/YYYY without leading zeros (Sisnet compatible)
                let fechaPago = String(row[cfg.COL_FECHA - 1] || '').trim();
                if (fechaPago.includes(' ')) fechaPago = fechaPago.split(' ')[0];
                if (fechaPago && fechaPago.includes('/')) {
                    const parts = fechaPago.split('/');
                    if (parts.length === 3) {
                        fechaPago = parseInt(parts[1], 10) + '/' + parseInt(parts[0], 10) + '/' + parts[2];
                    }
                }

                // Standard 3 columns + STATUS (FACTURA empty)
                tramaRows.push([numeroCupon, fechaPago, '', '']);
            }
        }
        perfLog('EECC_PROCESSED');

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);
        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }
        perfLog('TRAMA_WRITTEN');

        // Execute cross-reference
        const cruceResult = ConciliacionCruceV2.ejecutarCruce(wsTrama, wsBDCruce, {
            statusCol: 4,
            bdCruceCupones: dataContext.bdCruceCupones
        });
        perfLog('CRUCE_COMPLETE');

        // Export using optimized V2
        const tramaDataForExport = wsTrama.getDataRange().getDisplayValues();
        const exportResult = ConciliacionExportV2.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Qualitas',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColEECC: cfg.COL_CUPON
            },
            {
                tramaData: tramaDataForExport,
                eeccData: srcData
            }
        );
        perfLog('EXPORT_COMPLETE');

        // Cleanup
        ConciliacionCruceV2.limpiarStatusBDCruce(wsBDCruce);

        Logger.log(context + ': Completado. Filas desde row 17: ' + tramaRows.length);

        return {
            ok: true,
            insurer: 'Qualitas',
            stats: { filasCargadas, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    },

    process(tempFileId, ss) {
        // Compatibility wrapper
        const cuponCol = getConfig('CONCILIACION.BD_CRUCE_CUPON_COL', 8);
        const bdCruceSheet = ss.getSheetByName('BD_Cruce');
        const dataContext = {
            bdCruceSheet: bdCruceSheet,
            bdCruceCupones: null
        };
        if (bdCruceSheet) {
            // V6: Load only cupones column for better performance
            const lastRow = bdCruceSheet.getLastRow();
            dataContext.bdCruceCupones = bdCruceSheet.getRange(1, cuponCol, lastRow, 1).getDisplayValues().map(r => r[0]);
        }

        return this.processOptimized(
            { fileId: tempFileId, data: null },
            ss,
            dataContext
        );
    }
};

const QualitasProcessor = QualitasProcessorV2;
