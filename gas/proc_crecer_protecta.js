/**
 * @fileoverview Processor for Crecer&Protecta insurance company
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Module2.bas → Sub Macro_Crecer_Protecta()
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

const CrecerProtectaProcessor = {
    CONFIG: {
        HOJA_EECC: 'EECC_Crecer&Protecta',
        HOJA_TRAMA: 'Trama_Crecer&Protecta',
        START_ROW: 8,

        // EECC Columns (1-indexed) - MAY SHIFT if col E deleted
        COL_DOCUMENTO: 6,        // F - Documento (for CUPON)
        COL_VIGENCIA: 8,         // H - Vigencia year
        COL_FECHA: 13,           // M - Fecha pago
        COL_COMPROBANTE: 10,     // J - Comprobante

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'COMPROBANTE', 'STATUS'],
        TRAMA_FORMAT: {
            1: '@',
            2: 'dd/mm/yyyy'
        }
    },

    process(tempFileId, ss) {
        const context = 'CrecerProtectaProcessor.process';
        const cfg = this.CONFIG;

        Logger.log(context + ': Iniciando procesamiento Crecer&Protecta');

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        const wsBDCruce = ss.getSheetByName('BD_Cruce');
        if (!wsBDCruce) throw new Error('Hoja BD_Cruce no encontrada');

        // Clear sheets
        ProcessorBase.clearFromRow(wsEECC, cfg.START_ROW);
        ProcessorBase.clearFromRow(wsTrama, 2);

        // Load EECC file
        const tempSS = SpreadsheetApp.openById(tempFileId);
        const tempSheet = tempSS.getSheets()[0];
        // FIX: Usar getDisplayValues() para preservar datos originales
        let srcData = tempSheet.getDataRange().getDisplayValues();

        // Check if column E header is "Estado" and delete it
        // (replica VBA: If header(5) = "Estado" Then delete column)
        let colOffset = 0;
        if (srcData.length > 0 && srcData[0].length >= 5) {
            const headerE = String(srcData[0][4] || '').trim().toLowerCase();
            if (headerE === 'estado') {
                // Remove column E (index 4) from all rows
                srcData = srcData.map(row => {
                    const newRow = [...row];
                    newRow.splice(4, 1);
                    return newRow;
                });
                colOffset = -1; // Columns after E shift left
                Logger.log(context + ': Columna E (Estado) eliminada');
            }
        }

        // Write to EECC sheet
        // FIX v2.0: Apply text format BEFORE writing to preserve original values
        if (srcData.length >= cfg.START_ROW) {
            const dataRows = srcData.slice(cfg.START_ROW - 1);
            if (dataRows.length > 0) {
                const numRows = dataRows.length;
                const numCols = dataRows[0].length;
                const targetRange = wsEECC.getRange(cfg.START_ROW, 1, numRows, numCols);

                // CRITICAL: Set text format BEFORE writing
                targetRange.setNumberFormat('@');

                // Now write values
                targetRange.setValues(dataRows);
            }
        }

        const filasCargadas = Math.max(0, srcData.length - cfg.START_ROW + 1);

        // Adjust column indices if E was deleted
        const colDocumento = cfg.COL_DOCUMENTO + colOffset;
        const colVigencia = cfg.COL_VIGENCIA + colOffset;
        const colFecha = cfg.COL_FECHA + colOffset;
        const colComprobante = cfg.COL_COMPROBANTE + colOffset;

        // Process EECC: filter Vigencia >= 2025
        const eeccData = wsEECC.getDataRange().getValues();
        const tramaRows = [];

        let filasValidas = 0;
        let filasOmitidas = 0;

        for (let i = cfg.START_ROW - 1; i < eeccData.length; i++) {
            const row = eeccData[i];

            // =================================================================
            // FILTRO DE VIGENCIA - REPLICA EXACTA DEL VBA
            // =================================================================
            // VBA Logic:
            // - Si IsDate() Y Year() < 2025 → EXCLUIR
            // - Si IsDate() Y Year() >= 2025 → PROCESAR
            // - Si NO IsDate() (vacío, texto, etc.) → PROCESAR
            // =================================================================
            const vigenciaRaw = row[colVigencia - 1];
            const anioVigencia = ProcessorBase.extraerAnioDeVigencia(vigenciaRaw);

            // Si es fecha válida con año < 2025, excluir (igual que VBA)
            if (anioVigencia !== null && anioVigencia < 2025) {
                continue;  // Skip this row
            }

            // Si llegamos aquí, la fila debe procesarse:
            // - Es fecha válida con año >= 2025, O
            // - No es fecha válida (VBA no elimina estas filas)
            filasValidas++;

            // Get and transform DOCUMENTO
            const documento = String(row[colDocumento - 1] || '').trim();
            if (!documento) {
                filasOmitidas++;
                continue;
            }

            // Transform DOCUMENTO → CUPON
            const numeroCupon = ProcessorBase.extraerCuponCrecerProtecta(documento);

            // Get date
            const fechaPago = row[colFecha - 1];

            // Get COMPROBANTE from column J (adjusted for offset)
            // REPLICA EXACTA VBA: comprobanteStr = CStr(wsEstadoCuenta.Cells(i, "J").Value)
            const comprobante = String(row[colComprobante - 1] || '').trim();

            // Add to Trama
            tramaRows.push([numeroCupon, fechaPago, comprobante, '']);
        }

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);

        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        Logger.log(context + ': Procesamiento completado. ' +
            'Cargadas: ' + filasCargadas + ', ' +
            'Válidas: ' + filasValidas + ', ' +
            'Escritas: ' + tramaRows.length);

        // Execute cross-reference
        const cruceResult = ConciliacionCruce.ejecutarCruce(wsTrama, wsBDCruce, {
            statusCol: 4
        });

        // Export results
        const exportResult = ConciliacionExport.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Crecer_Protecta',
            { columnasTrama: 3, startRowEECC: cfg.START_ROW, cuponColEECC: colDocumento }
        );

        // Cleanup
        ConciliacionCruce.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'Crecer&Protecta',
            stats: { filasCargadas, filasValidas, filasEscritas: tramaRows.length, filasOmitidas },
            cruce: cruceResult,
            exports: exportResult
        };
    }
};
