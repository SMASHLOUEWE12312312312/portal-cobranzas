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
        const cfg = this.CONFIG;
        const T = Date.now();

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        const wsBDCruce = dataContext.bdCruceSheet;
        if (!wsBDCruce) throw new Error('BD_Cruce no encontrada en contexto');
        // Clear sheets
        wsEECC.clear();
        ProcessorBase.clearFromRow(wsTrama, 2);

        // Get source data
        // Special Case: Crecer VLE creates a Workbook with specific sheet name logic.
        // If SheetJS is used, we receive 'data' from the first sheet. 
        // We might need to check sheet names in SheetJS result?
        // _parseXLSXWithSheetJS returns just data from first sheet.
        // If Crecer VLE requires "Reporte" specifically and it's not the first sheet, this could be tricky.
        // However, usually the report IS the first/only sheet.
        // Legacy code checked: let tempSheet = tempSS.getSheetByName(cfg.SOURCE_SHEET_NAME); if (!tempSheet) tempSheet = tempSS.getSheets()[0];
        // So it falls back to first sheet anyway. We can safely use the data we have.

        // `srcData` (display strings) is used for text columns (cupones, factura).
        // `srcValues` (native types) is used for the date column to avoid the
        // locale-dependent dd/mm vs mm/dd ambiguity introduced by getDisplayValues().
        let srcData;
        let srcValues;
        if (convertResult.data) {
            srcData = convertResult.data;
            srcValues = convertResult.values || convertResult.data;
        } else {
            const tempSS = SpreadsheetApp.openById(convertResult.fileId);
            let tempSheet = tempSS.getSheetByName(cfg.SOURCE_SHEET_NAME);
            if (!tempSheet) {
                tempSheet = tempSS.getSheets()[0];
            }
            const range = tempSheet.getDataRange();
            srcData = range.getDisplayValues();
            srcValues = range.getValues();
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

        const filasCargadas = Math.max(0, srcData.length - 1);

        // Process EECC
        const tramaRows = [];

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            const nroComprobante = String(row[cfg.COL_NRO_COMPROBANTE - 1] || '').trim();
            if (!nroComprobante) continue;

            // Apply BuildNumeroCupon transformation
            const numeroCupon = ProcessorBase.buildNumeroCuponVLE(nroComprobante);
            
            // Read the date from the native-typed array, not from the display string,
            // to avoid the locale-dependent dd/mm vs mm/dd ambiguity.
            const fechaPago = ProcessorBase.parseToDate(srcValues[i][cfg.COL_FECHA - 1]);

            // FACTURA is the NRO_COMPROBANTE as-is
            tramaRows.push([numeroCupon, fechaPago, nroComprobante, '']);
        }

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);
        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        // Execute cross-reference
        const cruceResult = ConciliacionCruceV2.ejecutarCruce(wsTrama, wsBDCruce, {
            statusCol: 4,
            bdCruceCupones: dataContext.bdCruceCupones
        });

        // V10: Build export data from memory (NO re-read from sheet)
        const tramaDataForExport = [cfg.TRAMA_HEADERS];
        const statusFromCruce = cruceResult._statusValues || [];
        for (let i = 0; i < tramaRows.length; i++) {
            const row = tramaRows[i];
            const exportRow = row.map((cell) => {
                if (cell instanceof Date && !isNaN(cell.getTime())) {
                    return cell.getDate() + '/' + (cell.getMonth() + 1) + '/' + cell.getFullYear();
                }
                return cell;
            });
            exportRow[3] = statusFromCruce[i] ? statusFromCruce[i][0] : '';
            tramaDataForExport.push(exportRow);
        }
        
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
