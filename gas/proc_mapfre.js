/**
 * @fileoverview Processor for Mapfre insurance company
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Module3.bas → Sub Macro_Mapfre()
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_Mapfre
 * - Trama Sheet: Trama_Mapfre
 * - Data start row: 2
 * - Filter: None
 * - Mapping:
 *   - CUPON: Col J (NUM RECIBO)
 *   - FECHA: Col Q (FEC_SITUACION)
 *   - FACTURA: -
 */

const MapfreProcessor = {
    CONFIG: {
        HOJA_EECC: 'EECC_Mapfre',
        HOJA_TRAMA: 'Trama_Mapfre',
        START_ROW: 2,

        COL_NUM_RECIBO: 10,      // J - NUM RECIBO (CUPON)
        COL_FECHA: 17,           // Q - FEC_SITUACION

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy' }
    },

    process(tempFileId, ss) {
        const context = 'MapfreProcessor.process';
        const cfg = this.CONFIG;

        Logger.log(context + ': Iniciando procesamiento Mapfre');

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
        const srcData = tempSheet.getDataRange().getValues();

        // Copy all data to EECC
        if (srcData.length > 0) {
            wsEECC.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, srcData[0].length).setFontWeight('bold').setBackground('#D9D9D9');
        }

        const filasCargadas = Math.max(0, srcData.length - 1);

        // Process EECC: no filter
        const tramaRows = [];

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            const numeroCupon = String(row[cfg.COL_NUM_RECIBO - 1] || '').trim();
            if (!numeroCupon) continue;

            const fechaPago = row[cfg.COL_FECHA - 1];

            tramaRows.push([numeroCupon, fechaPago, '', '']);
        }

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);

        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        Logger.log(context + ': Procesamiento completado. Filas: ' + tramaRows.length);

        // Execute cross-reference
        const cruceResult = ConciliacionCruce.ejecutarCruce(wsTrama, wsBDCruce, { statusCol: 4 });

        // Export results
        const exportResult = ConciliacionExport.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Mapfre',
            { columnasTrama: 3, startRowEECC: cfg.START_ROW, cuponColEECC: cfg.COL_NUM_RECIBO }
        );

        // Cleanup
        ConciliacionCruce.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'Mapfre',
            stats: { filasCargadas, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    }
};
