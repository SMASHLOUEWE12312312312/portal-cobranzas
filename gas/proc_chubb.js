/**
 * @fileoverview Processor for CHUBB insurance company
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Module6.bas → Sub Macro_CHUBB()
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

const ChubbProcessor = {
    CONFIG: {
        HOJA_EECC: 'EECC_CHUBB',
        HOJA_TRAMA: 'Trama_CHUBB',
        START_ROW: 2,

        COL_CONVENIO: 5,         // E - Convenio (CUPON)
        COL_FACTURA: 7,          // G - Factura
        COL_FECHA: 10,           // J - Fecha (Spanish format)

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy' }
    },

    process(tempFileId, ss) {
        const context = 'ChubbProcessor.process';
        const cfg = this.CONFIG;

        Logger.log(context + ': Iniciando procesamiento CHUBB');

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

        // Copy to EECC
        // FIX v2.0: Apply text format BEFORE writing to preserve original values
        if (srcData.length > 0) {
            const numRows = srcData.length;
            const numCols = srcData[0].length;
            const eeccRange = wsEECC.getRange(1, 1, numRows, numCols);

            // CRITICAL: Set text format on data rows (row 2 onwards)
            if (numRows > 1) {
                wsEECC.getRange(2, 1, numRows - 1, numCols).setNumberFormat('@');
            }

            // Now write values
            eeccRange.setValues(srcData);

            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, numCols).setFontWeight('bold').setBackground('#D9D9D9');
        }

        const filasCargadas = srcData.length - 1;

        // Process EECC
        const tramaRows = [];

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            const convenio = String(row[cfg.COL_CONVENIO - 1] || '').trim();
            if (!convenio) continue;

            // Parse Spanish date
            let fechaPago = row[cfg.COL_FECHA - 1];
            if (!(fechaPago instanceof Date)) {
                const parsed = ProcessorBase.parsearFechaEspanol(fechaPago);
                if (parsed) fechaPago = parsed;
            }

            // Transform factura (insert hyphen)
            const factura = ProcessorBase.insertarGuionFactura(row[cfg.COL_FACTURA - 1]);

            tramaRows.push([convenio, fechaPago, factura, '']);
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
        const exportResult = ConciliacionExport.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'CHUBB',
            { columnasTrama: 3, startRowEECC: cfg.START_ROW, cuponColEECC: cfg.COL_CONVENIO }
        );

        // Cleanup
        ConciliacionCruce.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'CHUBB',
            stats: { filasCargadas, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    }
};
