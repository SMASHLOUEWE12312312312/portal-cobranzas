/**
 * @fileoverview Processor for Qualitas insurance company
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Module7.bas → Sub Macro_Qualitas()
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

const QualitasProcessor = {
    CONFIG: {
        HOJA_EECC: 'EECC_Qualitas',
        HOJA_TRAMA: 'Trama_Qualitas',
        START_ROW: 17,           // IMPORTANT: row 17, not 2!

        COL_CUPON: 10,           // J - CUPON
        COL_FECHA: 14,           // N - Fecha

        // Only 3 columns - NO FACTURA
        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy' }
    },

    process(tempFileId, ss) {
        const context = 'QualitasProcessor.process';
        const cfg = this.CONFIG;

        Logger.log(context + ': Iniciando procesamiento Qualitas (ROW 17!)');

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

        // Load EECC file
        const tempSS = SpreadsheetApp.openById(tempFileId);
        const tempSheet = tempSS.getSheets()[0];
        // FIX: Usar getDisplayValues() para preservar datos originales
        const srcData = tempSheet.getDataRange().getDisplayValues();

        // Copy to EECC (includes headers + data from row 17)
        if (srcData.length > 0) {
            wsEECC.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, srcData[0].length).setFontWeight('bold').setBackground('#D9D9D9');
        }

        const filasCargadas = Math.max(0, srcData.length - cfg.START_ROW + 1);

        // Process EECC from row 17
        const tramaRows = [];

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            const numeroCupon = String(row[cfg.COL_CUPON - 1] || '').trim();
            if (!numeroCupon) continue;

            const fechaPago = row[cfg.COL_FECHA - 1];

            // Only 2 columns + STATUS (no FACTURA)
            tramaRows.push([numeroCupon, fechaPago, '']);
        }

        // Write Trama (3 columns only)
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);

        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        Logger.log(context + ': Procesamiento completado. Filas desde row 17: ' + tramaRows.length);

        // Execute cross-reference (STATUS is in column 3)
        const cruceResult = ConciliacionCruce.ejecutarCruce(wsTrama, wsBDCruce, { statusCol: 3 });

        // Export (only 2 columns, no factura)
        const exportResult = ConciliacionExport.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Qualitas',
            { columnasTrama: 2, startRowEECC: cfg.START_ROW, cuponColEECC: cfg.COL_CUPON }
        );

        // Cleanup
        ConciliacionCruce.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'Qualitas',
            stats: { filasCargadas, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    }
};
