/**
 * @fileoverview Processor for Crecer VLE (Vida Ley) insurance - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_Crecer_VLE
 * - Trama Sheet: Trama_Crecer_VLE
 * - Data start row: 2
 * - Source sheet MUST be named "Reporte"
 * - Special: BuildNumeroCupon transformation
 * - Mapping:
 *   - CUPON: Col I (with BuildNumeroCupon)
 *   - FECHA: Col L
 *   - FACTURA: Col I (as-is)
 */

const CrecerVLEProcessorV2 = {
    CONFIG: {
        HOJA_EECC: 'EECC_Crecer_VLE',
        HOJA_TRAMA: 'Trama_Crecer_VLE',
        START_ROW: 2,
        SOURCE_SHEET_NAME: 'Reporte',

        COL_NRO_COMPROBANTE: 9,  // I - NRO_COMPROBANTE (for CUPON & FACTURA)
        COL_FECHA: 12,           // L - Fecha

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy', 3: '@' }  // Date format
    },

    processOptimized(convertResult, ss, dataContext) {
        const context = 'CrecerVLEProcessorV2.processOptimized';
        const cfg = this.CONFIG;
        const T = { start: Date.now() };
        const perfLog = (label) => {
            Logger.log('[PERF-V2] CrecerVLE | ' + label + ' | ' + (Date.now() - T.start) + 'ms');
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
        // Special Case: Crecer VLE creates a Workbook with specific sheet name logic.
        // If SheetJS is used, we receive 'data' from the first sheet. 
        // We might need to check sheet names in SheetJS result?
        // _parseXLSXWithSheetJS returns just data from first sheet.
        // If Crecer VLE requires "Reporte" specifically and it's not the first sheet, this could be tricky.
        // However, usually the report IS the first/only sheet.
        // Legacy code checked: let tempSheet = tempSS.getSheetByName(cfg.SOURCE_SHEET_NAME); if (!tempSheet) tempSheet = tempSS.getSheets()[0];
        // So it falls back to first sheet anyway. We can safely use the data we have.

        let srcData;
        if (convertResult.data) {
            srcData = convertResult.data;
            perfLog('DATA_FROM_SHEETJS');
        } else {
            const tempSS = SpreadsheetApp.openById(convertResult.fileId);
            let tempSheet = tempSS.getSheetByName(cfg.SOURCE_SHEET_NAME);
            if (!tempSheet) {
                tempSheet = tempSS.getSheets()[0];
                Logger.log(context + ': Warning - Hoja "Reporte" no encontrada, usando primera hoja');
            }
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

            const nroComprobante = String(row[cfg.COL_NRO_COMPROBANTE - 1] || '').trim();
            if (!nroComprobante) continue;

            // Apply BuildNumeroCupon transformation
            const numeroCupon = ProcessorBase.buildNumeroCuponVLE(nroComprobante);
            
            // FIX 2026-01-26: Convert to Date object for proper date formatting
            const fechaPago = ProcessorBase.parseToDate(row[cfg.COL_FECHA - 1]);

            // FACTURA is the NRO_COMPROBANTE as-is
            tramaRows.push([numeroCupon, fechaPago, nroComprobante, '']);
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
            wsTrama, wsEECC, wsBDCruce, 'Crecer_VLE',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColEECC: cfg.COL_NRO_COMPROBANTE,
                cuponColsTrama: [1, 3], // NUMERO_CUPON + FACTURA
                cuponTransformFn: ProcessorBase.buildNumeroCuponVLE
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
            insurer: 'Crecer VLE',
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

const CrecerVLEProcessor = CrecerVLEProcessorV2;
