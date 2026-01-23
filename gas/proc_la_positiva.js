/**
 * @fileoverview Processor for La Positiva insurance company
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Module1.bas → Sub Macro_La_Positiva()
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_La Positiva
 * - Trama Sheet: Trama_La Positiva
 * - Data start row: 11 (header at row 10)
 * - Filter: Column T = "Cancelado"
 * - Mapping:
 *   - CUPON: Col G + Col H (if H > 0)
 *   - FECHA: Col U
 *   - FACTURA: Col R
 */

const LaPositivaProcessor = {
    // FIXED Configuration - DO NOT MODIFY
    CONFIG: {
        HOJA_EECC: 'EECC_La Positiva',
        HOJA_TRAMA: 'Trama_La Positiva',
        START_ROW: 11,           // Data from row 11
        HEADER_ROW: 10,          // Header at row 10

        // EECC Columns (1-indexed)
        COL_NUMERO: 7,           // G - Number
        COL_GIRO: 8,             // H - Giro
        COL_FACTURA: 18,         // R - Factura
        COL_ESTADO: 20,          // T - Estado
        COL_FECHA: 21,           // U - Fecha pago

        // Trama Headers
        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],

        // Trama column formats
        TRAMA_FORMAT: {
            1: '@',              // NUMERO_CUPON as text
            2: 'dd/mm/yyyy'      // FECHA_PAGO as date
        }
    },

    /**
     * Processes La Positiva Estado de Cuenta file
     * 
     * @param {string} tempFileId - Converted temporary file ID
     * @param {Spreadsheet} ss - Conciliation spreadsheet
     * @returns {Object} Processing result
     */
    process(tempFileId, ss) {
        const context = 'LaPositivaProcessor.process';
        const cfg = this.CONFIG;

        Logger.log(context + ': Iniciando procesamiento La Positiva');

        // 1. Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) {
            wsEECC = ss.insertSheet(cfg.HOJA_EECC);
        }

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) {
            wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);
        }

        const wsBDCruce = ss.getSheetByName('BD_Cruce');
        if (!wsBDCruce) {
            throw new Error('Hoja BD_Cruce no encontrada. Primero sube la BD Sisnet.');
        }

        // 2. Clear sheets (replica VBA: wsBroker.Rows("11:" & lastAny).Delete)
        ProcessorBase.clearFromRow(wsEECC, cfg.START_ROW);
        ProcessorBase.clearFromRow(wsTrama, 2);

        // 3. Load EECC file
        const tempSS = SpreadsheetApp.openById(tempFileId);
        const tempSheet = tempSS.getSheets()[0];
        // FIX: Usar getDisplayValues() para preservar datos originales (ej: ceros iniciales)
        const srcData = tempSheet.getDataRange().getDisplayValues();

        // Copy from source row 11 to EECC row 11
        if (srcData.length >= cfg.START_ROW) {
            const dataRows = srcData.slice(cfg.START_ROW - 1);
            if (dataRows.length > 0) {
                wsEECC.getRange(cfg.START_ROW, 1, dataRows.length, dataRows[0].length)
                    .setValues(dataRows);
            }
        }

        const filasCargadas = Math.max(0, srcData.length - cfg.START_ROW + 1);

        // 4. Process EECC: filter Estado="Cancelado" → generate Trama
        const eeccData = wsEECC.getDataRange().getValues();
        const tramaRows = [];

        let filasCancelado = 0;
        let filasOmitidas = 0;

        for (let i = cfg.START_ROW - 1; i < eeccData.length; i++) {
            const row = eeccData[i];

            // Check Estado = "Cancelado" (Col T, index 19)
            const estado = ProcessorBase.normalizeState(row[cfg.COL_ESTADO - 1]);

            if (estado === 'cancelado') {
                filasCancelado++;

                // Get NUMERO_CUPON: Col G + Col H (if H > 0)
                const numeroRaw = String(row[cfg.COL_NUMERO - 1] || '').trim();
                const giroVal = ProcessorBase.parseLongOrZero(row[cfg.COL_GIRO - 1]);

                if (!numeroRaw) {
                    filasOmitidas++;
                    continue;
                }

                // Build coupon: number + giro (if giro > 0)
                const numeroCupon = giroVal > 0 ? numeroRaw + String(giroVal) : numeroRaw;

                // Get date and factura
                const fechaPago = row[cfg.COL_FECHA - 1];    // Col U
                const factura = row[cfg.COL_FACTURA - 1];    // Col R

                // Add row to Trama (STATUS empty, filled during cross-reference)
                tramaRows.push([numeroCupon, fechaPago, factura, '']);
            }
        }

        // 5. Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);

        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        const filasEscritas = tramaRows.length;

        Logger.log(context + ': Procesamiento completado. ' +
            'Cargadas: ' + filasCargadas + ', ' +
            'Cancelado: ' + filasCancelado + ', ' +
            'Escritas: ' + filasEscritas + ', ' +
            'Omitidas: ' + filasOmitidas);

        // 6. Execute cross-reference with BD_Cruce
        const cruceResult = ConciliacionCruce.ejecutarCruce(wsTrama, wsBDCruce, {
            statusCol: 4  // Column D in Trama
        });

        // 7. Export results
        const exportResult = ConciliacionExport.exportarResultados(
            wsTrama,
            wsEECC,
            wsBDCruce,
            'La_Positiva',
            {
                columnasTrama: 3,          // Export A:C (without STATUS)
                startRowEECC: cfg.START_ROW,
                cuponColEECC: cfg.COL_NUMERO
            }
        );

        // 8. Cleanup temporary STATUS column from BD_Cruce
        ConciliacionCruce.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'La Positiva',
            stats: {
                filasCargadas,
                filasCancelado,
                filasEscritas,
                filasOmitidas
            },
            cruce: cruceResult,
            exports: exportResult
        };
    }
};
