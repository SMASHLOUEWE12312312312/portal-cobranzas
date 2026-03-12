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
        let srcData;
        if (convertResult.data) {
            srcData = convertResult.data;
        } else {
            const tempSS = SpreadsheetApp.openById(convertResult.fileId);
            const tempSheet = tempSS.getSheets()[0];
            srcData = tempSheet.getDataRange().getDisplayValues();
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

            const convenio = String(row[cfg.COL_CONVENIO - 1] || '').trim();
            if (!convenio) continue;

            // FIX 2026-01-26: Parse date (Spanish format or standard) and keep as Date object
            let fechaPago = row[cfg.COL_FECHA - 1];
            
            // If already a Date, keep it
            if (!(fechaPago instanceof Date)) {
                // Try Spanish date parsing first ("04 ago. 25")
                const parsedSpanish = ProcessorBase.parsearFechaEspanol(fechaPago);
                if (parsedSpanish) {
                    fechaPago = parsedSpanish;
                } else {
                    // Try standard date parsing
                    fechaPago = ProcessorBase.parseToDate(fechaPago);
                }
            }

            // Transform factura (insert hyphen logic)
            const factura = ProcessorBase.insertarGuionFactura(row[cfg.COL_FACTURA - 1]);

            tramaRows.push([convenio, fechaPago, factura, '']);
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
        // Cleanup
        ConciliacionCruceV2.limpiarStatusBDCruce(wsBDCruce);

        Logger.log('CHUBB completado en ' + (Date.now() - T) + 'ms | Cargadas: ' + filasCargadas +
            ', Escritas: ' + tramaRows.length);

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
