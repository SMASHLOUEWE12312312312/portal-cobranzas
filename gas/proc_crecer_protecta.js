/**
 * @fileoverview Processor for Crecer&Protecta insurance company - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_Crecer&Protecta
 * - Trama Sheet: Trama_Crecer&Protecta
 * - Data start row: 8
 * - Filter: Column H >= 2025
 * - Special: Delete column E if header="Estado"
 * - Mapping:
 *   - CUPON: Col F (with transformation)
 *   - FECHA: Col M
 *   - FACTURA: -
 */

const CrecerProtectaProcessorV2 = {
    CONFIG: {
        HOJA_EECC: 'EECC_Crecer&Protecta',
        HOJA_TRAMA: 'Trama_Crecer&Protecta',
        START_ROW: 8,

        // EECC Columns (1-indexed) - MAY SHIFT if col E deleted
        COL_DOCUMENTO: 6,        // F - Documento (for CUPON)
        COL_VIGENCIA: 8,         // H - Vigencia year
        COL_FECHA: 13,           // M - Fecha pago
        COL_COMPROBANTE: 10,     // J - Comprobante

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
        ProcessorBase.clearFromRow(wsEECC, cfg.START_ROW);
        ProcessorBase.clearFromRow(wsTrama, 2);

        // Get source data
        let srcData;
        if (convertResult.data) {
            srcData = convertResult.data; // Copy to avoid mutating original if passed by ref
            // Deep copy not strictly needed if we just splice, but safer if dataContext caches it.
            // Actually slice() logic below creates new arrays for rows.
        } else {
            const tempSS = SpreadsheetApp.openById(convertResult.fileId);
            const tempSheet = tempSS.getSheets()[0];
            srcData = tempSheet.getDataRange().getDisplayValues();
        }

        // Clone srcData to avoid mutating validation cache?
        // Since we modify it (delete column), we should map it.
        srcData = srcData.map(row => [...row]);

        // Check if column E header is "Estado" and delete it
        let colOffset = 0;
        if (srcData.length > 0 && srcData[0].length >= 5) {
            const headerE = String(srcData[0][4] || '').trim().toLowerCase();
            if (headerE === 'estado') {
                // Remove column E (index 4) from all rows
                srcData.forEach(row => row.splice(4, 1));
                colOffset = -1; // Columns after E shift left
            }
        }

        // Write to EECC
        if (srcData.length >= cfg.START_ROW) {
            const dataRows = srcData.slice(cfg.START_ROW - 1);
            if (dataRows.length > 0) {
                const numRows = dataRows.length;
                const numCols = dataRows[0].length;
                const targetRange = wsEECC.getRange(cfg.START_ROW, 1, numRows, numCols);

                targetRange.setNumberFormat('@');
                targetRange.setValues(dataRows);
            }
        }

        const filasCargadas = Math.max(0, srcData.length - cfg.START_ROW + 1);

        // Adjust column indices
        const colDocumento = cfg.COL_DOCUMENTO + colOffset;
        const colVigencia = cfg.COL_VIGENCIA + colOffset;
        const colFecha = cfg.COL_FECHA + colOffset;
        const colComprobante = cfg.COL_COMPROBANTE + colOffset;

        // Process EECC
        const tramaRows = [];
        let filasValidas = 0;
        let filasOmitidas = 0;

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            // Filter Vigencia >= 2025
            const vigenciaRaw = row[colVigencia - 1];
            const anioVigencia = ProcessorBase.extraerAnioDeVigencia(vigenciaRaw);

            if (anioVigencia !== null && anioVigencia < 2025) {
                continue;
            }

            filasValidas++;

            const documento = String(row[colDocumento - 1] || '').trim();
            if (!documento) {
                filasOmitidas++;
                continue;
            }

            const numeroCupon = ProcessorBase.extraerCuponCrecerProtecta(documento);
            
            // FIX 2026-01-26: Convert to Date object for proper date formatting
            const fechaPago = ProcessorBase.parseToDate(row[colFecha - 1]);
            
            const comprobante = String(row[colComprobante - 1] || '').trim();

            tramaRows.push([numeroCupon, fechaPago, comprobante, '']);
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
            wsTrama, wsEECC, wsBDCruce, 'Crecer_Protecta',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColEECC: colDocumento,
                cuponTransformFn: ProcessorBase.extraerCuponCrecerProtecta.bind(ProcessorBase)
            },
            {
                tramaData: tramaDataForExport,
                eeccData: srcData // Export modified data with column deleted
            }
        );

        // Cleanup
        ConciliacionCruceV2.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'Crecer&Protecta',
            stats: { filasCargadas, filasValidas, filasEscritas: tramaRows.length, filasOmitidas },
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

const CrecerProtectaProcessor = CrecerProtectaProcessorV2;
