/**
 * @fileoverview Processor for Mapfre insurance company - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_Mapfre
 * - Trama Sheet: Trama_Mapfre
 * - Data start row: 2
 * - Filter: None
 * - Mapping:
 *   - CUPON: Col J (NUM RECIBO)
 *   - FECHA: Col Q (FEC_SITUACION)
 *   - FACTURA: -
 */

const MapfreProcessorV2 = {
    CONFIG: {
        HOJA_EECC: 'EECC_Mapfre',
        HOJA_TRAMA: 'Trama_Mapfre',
        START_ROW: 2,

        COL_NUM_RECIBO: 10,      // J - NUM RECIBO (CUPON)
        COL_FECHA: 17,           // Q - FEC_SITUACION

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy' }
    },

    /**
     * OPTIMIZED process method
     */
    processOptimized(convertResult, ss, dataContext) {
        const context = 'MapfreProcessorV2.processOptimized';
        const cfg = this.CONFIG;
        const T = { start: Date.now() };
        const perfLog = (label) => {
            Logger.log('[PERF-V2] Mapfre | ' + label + ' | ' + (Date.now() - T.start) + 'ms');
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

            const numeroCupon = String(row[cfg.COL_NUM_RECIBO - 1] || '').trim();
            if (!numeroCupon) continue;

            // FIX: Format date as DD/MM/YYYY
            let fechaPago = String(row[cfg.COL_FECHA - 1] || '').trim();
            
            // Remove time portion if present (e.g., "01/27/2025 00:00:00" → "01/27/2025")
            if (fechaPago.includes(' ')) {
                fechaPago = fechaPago.split(' ')[0];
            }
            
            // Convert MM/DD/YYYY → DD/MM/YYYY
            if (fechaPago && fechaPago.includes('/')) {
                const parts = fechaPago.split('/');
                if (parts.length === 3) {
                    // parts[0]=MM, parts[1]=DD, parts[2]=YYYY → DD/MM/YYYY
                    fechaPago = parts[1] + '/' + parts[0] + '/' + parts[2];
                }
            }

            tramaRows.push([numeroCupon, fechaPago, '', '']);
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
            wsTrama, wsEECC, wsBDCruce, 'Mapfre',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColEECC: cfg.COL_NUM_RECIBO
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
            insurer: 'Mapfre',
            stats: { filasCargadas, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    },

    process(tempFileId, ss) {
        const dataContext = {
            bdCruceSheet: ss.getSheetByName('BD_Cruce'),
            bdCruceData: null
        };
        if (dataContext.bdCruceSheet) {
            dataContext.bdCruceData = dataContext.bdCruceSheet.getDataRange().getDisplayValues();
        }
        return this.processOptimized({ fileId: tempFileId, data: null }, ss, dataContext);
    }
};

const MapfreProcessor = MapfreProcessorV2;
