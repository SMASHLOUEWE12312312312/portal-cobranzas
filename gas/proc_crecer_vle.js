/**
 * @fileoverview Processor for Crecer VLE (Vida Ley) insurance
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Module8.bas → Sub Macro_Crecer_VLE()
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_Crecer_VLE
 * - Trama Sheet: Trama_Crecer_VLE
 * - Data start row: 2
 * - Source sheet MUST be named "Reporte"
 * - Special: BuildNumeroCupon transformation
 *   "F008-00090390" → "8" + "00090390" → "800090390"
 * - Mapping:
 *   - CUPON: Col I (with BuildNumeroCupon)
 *   - FECHA: Col L
 *   - FACTURA: Col I (as-is)
 */

const CrecerVLEProcessor = {
    CONFIG: {
        HOJA_EECC: 'EECC_Crecer_VLE',
        HOJA_TRAMA: 'Trama_Crecer_VLE',
        START_ROW: 2,
        SOURCE_SHEET_NAME: 'Reporte',  // Source sheet must have this name

        COL_NRO_COMPROBANTE: 9,  // I - NRO_COMPROBANTE (for CUPON & FACTURA)
        COL_FECHA: 12,           // L - Fecha

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy' }
    },

    process(tempFileId, ss) {
        const context = 'CrecerVLEProcessor.process';
        const cfg = this.CONFIG;

        Logger.log(context + ': Iniciando procesamiento Crecer VLE');

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        const wsBDCruce = ss.getSheetByName('BD_Cruce');
        if (!wsBDCruce) throw new Error('Hoja BD_Cruce no encontrada');

        // Clear sheets
        wsEECC.clear();
        ProcessorBase.clearFromRow(wsTrama, 2);

        // Load EECC file - MUST find sheet named "Reporte"
        const tempSS = SpreadsheetApp.openById(tempFileId);
        let tempSheet = tempSS.getSheetByName(cfg.SOURCE_SHEET_NAME);

        if (!tempSheet) {
            // Try first sheet if "Reporte" not found
            tempSheet = tempSS.getSheets()[0];
            Logger.log(context + ': Warning - Hoja "Reporte" no encontrada, usando primera hoja');
        }

        // FIX: Usar getDisplayValues() para preservar datos originales
        const srcData = tempSheet.getDataRange().getDisplayValues();

        // Copy to EECC
        if (srcData.length > 0) {
            wsEECC.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, srcData[0].length).setFontWeight('bold').setBackground('#D9D9D9');
        }

        const filasCargadas = srcData.length - 1;

        // Process EECC
        const tramaRows = [];

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            const nroComprobante = String(row[cfg.COL_NRO_COMPROBANTE - 1] || '').trim();
            if (!nroComprobante) continue;

            // Apply BuildNumeroCupon transformation
            const numeroCupon = ProcessorBase.buildNumeroCuponVLE(nroComprobante);

            const fechaPago = row[cfg.COL_FECHA - 1];

            // FACTURA is the NRO_COMPROBANTE as-is
            tramaRows.push([numeroCupon, fechaPago, nroComprobante, '']);
        }

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);

        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        Logger.log(context + ': Procesamiento completado. Filas: ' + tramaRows.length);

        // Execute cross-reference
        const cruceResult = ConciliacionCruce.ejecutarCruce(wsTrama, wsBDCruce, { statusCol: 4 });

        // Export
        // FIX v1.3: cuponColsTrama:[1,3] para matchear por NUMERO_CUPON (col 1) y FACTURA (col 3)
        // FACTURA tiene el valor original del EECC, permitiendo el match correcto
        const exportResult = ConciliacionExport.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Crecer_VLE',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColEECC: cfg.COL_NRO_COMPROBANTE,
                cuponColsTrama: [1, 3]  // FIX: NUMERO_CUPON + FACTURA para match con EECC
            }
        );

        // Cleanup
        ConciliacionCruce.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'Crecer VLE',
            stats: { filasCargadas, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    }
};
