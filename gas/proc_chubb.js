/**
 * @fileoverview Processor for CHUBB insurance company - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_CHUBB
 * - Trama Sheet: Trama_CHUBB
 * - Data start row: 2
 * - Filter: None
 * - Special:
 *   - Spanish date parsing ("04 ago. 25")
 *   - Insert hyphen in FACTURA after position 4
 * - Mapping:
 *   - CUPON: Col E (Convenio)
 *   - FECHA: Col J (Spanish format)
 *   - FACTURA: Col G (insert hyphen)
 */

const ChubbProcessorV2 = {
    CONFIG: {
        HOJA_EECC: 'EECC_CHUBB',
        HOJA_TRAMA: 'Trama_CHUBB',
        START_ROW: 2,

        COL_CONVENIO: 5,         // E - Convenio (CUPON)
        COL_FACTURA: 7,          // G - Factura
        COL_FECHA: 10,           // J - Fecha (Spanish format)

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: '@', 3: '@' }  // All text to preserve exact format
    },

    processOptimized(convertResult, ss, dataContext) {
        const context = 'ChubbProcessorV2.processOptimized';
        const cfg = this.CONFIG;
        const T = { start: Date.now() };
        const perfLog = (label) => {
            Logger.log('[PERF-V2] Chubb | ' + label + ' | ' + (Date.now() - T.start) + 'ms');
        };

        Logger.log(context + ': Iniciando procesamiento OPTIMIZADO');
        perfLog('INIT');

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

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

        // Write to EECC
        if (srcData.length > 0) {
            const numRows = srcData.length;
            const numCols = srcData[0].length;

            if (numRows > 1) {
                wsEECC.getRange(2, 1, numRows - 1, numCols).setNumberFormat('@');
            }
            wsEECC.getRange(1, 1, numRows, numCols).setValues(srcData);

            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, numCols).setFontWeight('bold').setBackground('#D9D9D9');
        }
        perfLog('EECC_WRITTEN');

        const filasCargadas = Math.max(0, srcData.length - 1);

        // Process EECC
        const tramaRows = [];

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            const convenio = String(row[cfg.COL_CONVENIO - 1] || '').trim();
            if (!convenio) continue;

            // Parse Spanish date ("04 ago. 25") and convert to DD/MM/YYYY without leading zeros
            let fechaPago = row[cfg.COL_FECHA - 1];

            // SheetJS often parses dates correctly already if cellDates: true, but just in case:
            if (!(fechaPago instanceof Date)) {
                const parsed = ProcessorBase.parsearFechaEspanol(fechaPago);
                if (parsed) fechaPago = parsed;
            }
            
            // FIX 2026-01-26: Format as DD/MM/YYYY without leading zeros (Sisnet compatible)
            if (fechaPago instanceof Date) {
                const dia = fechaPago.getDate();
                const mes = fechaPago.getMonth() + 1;
                const anio = fechaPago.getFullYear();
                fechaPago = dia + '/' + mes + '/' + anio;
            } else {
                // If string, just remove leading zeros (keep original order)
                fechaPago = String(fechaPago || '').trim();
                if (fechaPago.includes(' ')) fechaPago = fechaPago.split(' ')[0];
                if (fechaPago && fechaPago.includes('/')) {
                    const parts = fechaPago.split('/');
                    if (parts.length === 3) {
                        // Keep original order, just remove leading zeros
                        const p1 = parseInt(parts[0], 10);
                        const p2 = parseInt(parts[1], 10);
                        const p3 = parts[2];
                        fechaPago = p1 + '/' + p2 + '/' + p3;
                    }
                }
            }

            // Transform factura (insert hyphen logic)
            const factura = ProcessorBase.insertarGuionFactura(row[cfg.COL_FACTURA - 1]);

            tramaRows.push([convenio, fechaPago, factura, '']);
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

        // Export
        const tramaDataForExport = wsTrama.getDataRange().getDisplayValues();
        const exportResult = ConciliacionExportV2.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'CHUBB',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColEECC: cfg.COL_CONVENIO
            },
            {
                tramaData: tramaDataForExport,
                eeccData: srcData
            }
        );
        perfLog('EXPORT_COMPLETE');

        // Cleanup
        ConciliacionCruceV2.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'CHUBB',
            stats: { filasCargadas, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    },

    process(tempFileId, ss) {
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
        return this.processOptimized({ fileId: tempFileId, data: null }, ss, dataContext);
    }
};

const ChubbProcessor = ChubbProcessorV2;
