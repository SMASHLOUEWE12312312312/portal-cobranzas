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
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy', 3: '@' }  // Date format
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
        const cfg = this.CONFIG;
        const T = Date.now();

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        // Link BD_Cruce
        const wsBDCruce = dataContext.bdCruceSheet;
        if (!wsBDCruce) throw new Error('BD_Cruce no encontrada en contexto');

        // Clear sheets
        wsEECC.clear();
        ProcessorBase.clearFromRow(wsTrama, 2);

        // Get source data
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
            const tempSheet = tempSS.getSheets()[0];
            const range = tempSheet.getDataRange();
            srcData = range.getDisplayValues();
            srcValues = range.getValues();
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

        const filasCargadas = Math.max(0, srcData.length - cfg.START_ROW + 1);

        // Process EECC from row 17
        const tramaRows = [];

        // Protection against empty files
        if (srcData.length >= cfg.START_ROW) {
            for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
                const row = srcData[i];

                const numeroCupon = String(row[cfg.COL_CUPON - 1] || '').trim();
                if (!numeroCupon) continue;

                // Read the date from the native-typed array, not from the display string,
                // to avoid the locale-dependent dd/mm vs mm/dd ambiguity.
                const fechaPago = ProcessorBase.parseToDate(srcValues[i][cfg.COL_FECHA - 1]);

                // Standard 3 columns + STATUS (FACTURA empty)
                tramaRows.push([numeroCupon, fechaPago, '', '']);
            }
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

        // V9: Build export data from memory (NO re-read from sheet)
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
            // Use status from cruce result directly (no sheet read needed)
            exportRow[3] = statusFromCruce[i] ? statusFromCruce[i][0] : '';
            tramaDataForExport.push(exportRow);
        }

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
        // Cleanup
        ConciliacionCruceV2.limpiarStatusBDCruce(wsBDCruce);

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
