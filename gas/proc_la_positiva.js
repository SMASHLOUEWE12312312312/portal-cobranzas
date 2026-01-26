/**
 * @fileoverview Processor for La Positiva - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * CAMBIOS v2.0:
 * - NUEVO: processOptimized() que usa DataContext compartido
 * - ELIMINADO: Lecturas duplicadas de datos
 * - OPTIMIZADO: Flujo de datos sin re-lecturas
 * - OPTIMIZADO: Integración con ConciliacionExportV2
 * 
 * MEJORA ESPERADA: 60-70% reducción en tiempo
 */

const LaPositivaProcessorV2 = {
    CONFIG: {
        HOJA_EECC: 'EECC_La Positiva',
        HOJA_TRAMA: 'Trama_La Positiva',
        START_ROW: 11,
        HEADER_ROW: 10,

        COL_NUMERO: 7,
        COL_GIRO: 8,
        COL_FACTURA: 18,
        COL_ESTADO: 20,
        COL_FECHA: 21,

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy' }
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
        const context = 'LaPositivaProcessorV2.processOptimized';
        const cfg = this.CONFIG;
        const T = { start: Date.now() };
        const perfLog = (label) => {
            Logger.log('[PERF-V2] LaPositiva | ' + label + ' | ' + (Date.now() - T.start) + 'ms');
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
        ProcessorBase.clearFromRow(wsEECC, cfg.START_ROW);
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

        // Write to EECC sheet (batch)
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
        perfLog('EECC_WRITTEN');

        const filasCargadas = Math.max(0, srcData.length - cfg.START_ROW + 1);

        // Process EECC - use srcData directly (NO re-read!)
        const tramaRows = [];
        let filasCancelado = 0;
        let filasOmitidas = 0;

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];
            const estado = ProcessorBase.normalizeState(row[cfg.COL_ESTADO - 1]);

            if (estado === 'cancelado') {
                filasCancelado++;

                const numeroRaw = String(row[cfg.COL_NUMERO - 1] || '').trim();
                const giroVal = ProcessorBase.parseLongOrZero(row[cfg.COL_GIRO - 1]);

                if (!numeroRaw) {
                    filasOmitidas++;
                    continue;
                }

                const numeroCupon = giroVal > 0 ? numeroRaw + String(giroVal) : numeroRaw;
                
                // FIX 2026-01-26: Remove leading zeros from date (keep DD/MM/YYYY order)
                // Example: "25/09/2025" → "25/9/2025" (Sisnet compatible)
                let fechaPago = String(row[cfg.COL_FECHA - 1] || '').trim();
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
                
                const factura = row[cfg.COL_FACTURA - 1];

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

        const filasEscritas = tramaRows.length;

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
            wsTrama, wsEECC, wsBDCruce, 'La_Positiva',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColEECC: cfg.COL_NUMERO
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
            ', Cancelado: ' + filasCancelado + ', Escritas: ' + filasEscritas);

        return {
            ok: true,
            insurer: 'La Positiva',
            stats: { filasCargadas, filasCancelado, filasEscritas, filasOmitidas },
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
const LaPositivaProcessor = LaPositivaProcessorV2;
