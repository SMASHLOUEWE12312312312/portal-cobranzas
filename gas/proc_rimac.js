/**
 * @fileoverview Processor for Rimac insurance company - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_Rimac
 * - Trama Sheet: Trama_Rimac
 * - Data start row: 2
 * - Filter: Column G = "COB" or "PAG"
 * - Length rules for CUPON:
 *   - 9-10 chars: as-is
 *   - 20-22 chars: Left(10)
 * - Mapping:
 *   - CUPON: Col J (with length rules)
 *   - FEC_EMISION: Col N
 *   - FEC_PAG: Col O
 */

const RimacProcessorV2 = {
    CONFIG: {
        HOJA_EECC: 'EECC_Rimac',
        HOJA_TRAMA: 'Trama_Rimac',
        START_ROW: 2,

        COL_TIPO: 7,             // G - Tipo (filter)
        COL_TIPO_DOC: 10,        // J - TIPO.DOC (CUPON)
        COL_FEC_EMISION: 14,     // N - FEC_EMISION
        COL_FEC_PAG: 15,         // O - FEC_PAG

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
        const context = 'RimacProcessorV2.processOptimized';
        const cfg = this.CONFIG;
        const T = { start: Date.now() };
        const perfLog = (label) => {
            Logger.log('[PERF-V2] Rimac | ' + label + ' | ' + (Date.now() - T.start) + 'ms');
        };

        Logger.log(context + ': Iniciando procesamiento OPTIMIZADO');
        perfLog('INIT');

        // Get sheets (from cached spreadsheet)
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        // Use pre-loaded BD_Cruce from context
        const wsBDCruce = dataContext.bdCruceSheet;
        if (!wsBDCruce) {
            throw new Error('BD_Cruce no encontrada en contexto');
        }
        perfLog('SHEETS_READY');

        // Clear destination sheets
        wsEECC.clear(); // Rimac requires full clear as it writes from row 1 usually? No, check original logic.
        // Original: wsEECC.clear(); ProcessorBase.clearFromRow(wsTrama, 2);
        ProcessorBase.clearFromRow(wsTrama, 2);
        perfLog('SHEETS_CLEARED');

        // Get source data - use pre-parsed if available (SheetJS)
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

        // Write to EECC sheet (preserve text format)
        if (srcData.length > 0) {
            const numRows = srcData.length;
            const numCols = srcData[0].length;

            // Format first
            if (numRows > 1) {
                wsEECC.getRange(2, 1, numRows - 1, numCols).setNumberFormat('@');
            }

            // Write values
            wsEECC.getRange(1, 1, numRows, numCols).setValues(srcData);

            // Header style
            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, numCols).setFontWeight('bold').setBackground('#D9D9D9');
        }
        perfLog('EECC_WRITTEN');

        const filasCargadas = Math.max(0, srcData.length - 1);

        // Process EECC: filter Tipo = "COB" or "PAG"
        // Use srcData directly (NO re-read!)
        const tramaRows = [];
        let filtrados = 0;

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            // Check Tipo
            const tipo = String(row[cfg.COL_TIPO - 1] || '').toUpperCase().trim();

            if (tipo === 'COB' || tipo === 'PAG') {
                filtrados++;

                // Get and transform TIPO.DOC
                const tipoDoc = String(row[cfg.COL_TIPO_DOC - 1] || '').trim();
                if (!tipoDoc) continue;

                // Apply length rules
                const numeroCupon = ProcessorBase.extraerCuponRimac(tipoDoc);

                // FIX: Correct column mapping per user requirement
                // - FECHA_PAGO (col B) = Column N (FEC_EMISION)
                // - FACTURA (col C) = Column O (has the invoice code like "FA-F581 0007375086")
                
                // Convert date to DD/MM/YYYY without leading zeros (Sisnet compatible)
                let fechaPago = String(row[cfg.COL_FEC_EMISION - 1] || '').trim();
                if (fechaPago.includes(' ')) fechaPago = fechaPago.split(' ')[0];
                if (fechaPago && fechaPago.includes('/')) {
                    const parts = fechaPago.split('/');
                    if (parts.length === 3) {
                        fechaPago = parseInt(parts[1], 10) + '/' + parseInt(parts[0], 10) + '/' + parts[2];
                    }
                }
                
                const factura = row[cfg.COL_FEC_PAG - 1];        // Col O → FACTURA

                tramaRows.push([numeroCupon, fechaPago, factura, '']);
            }
        }
        perfLog('EECC_PROCESSED');

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);
        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }
        perfLog('TRAMA_WRITTEN');

        // Execute cross-reference with pre-loaded BD_Cruce data
        const cruceResult = ConciliacionCruceV2.ejecutarCruce(wsTrama, wsBDCruce, {
            statusCol: 4,
            bdCruceCupones: dataContext.bdCruceCupones  // Use cached data
        });
        perfLog('CRUCE_COMPLETE');

        // Export results using optimized exporter
        // Pass cached data to avoid re-reading
        const tramaDataForExport = wsTrama.getDataRange().getDisplayValues();
        const exportResult = ConciliacionExportV2.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Rimac',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColEECC: cfg.COL_TIPO_DOC,
                cuponTransformFn: ProcessorBase.extraerCuponRimac
            },
            {
                tramaData: tramaDataForExport,
                eeccData: srcData
            }
        );
        perfLog('EXPORT_COMPLETE');

        // Cleanup STATUS column
        ConciliacionCruceV2.limpiarStatusBDCruce(wsBDCruce);
        perfLog('CLEANUP');

        Logger.log(context + ': Completado. Cargadas: ' + filasCargadas +
            ', Filtrados: ' + filtrados + ', Escritas: ' + tramaRows.length);

        return {
            ok: true,
            insurer: 'Rimac',
            stats: { filasCargadas, filtrados, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    },

    /**
     * Original process method for backward compatibility
     */
    process(tempFileId, ss) {
        // Create minimal context and call optimized version
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

// Also update the non-V2 reference
const RimacProcessor = RimacProcessorV2;
