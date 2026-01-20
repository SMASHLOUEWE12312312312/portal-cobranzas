/**
 * @fileoverview Processor for Rimac insurance company
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Module5.bas → Sub Macro_Rimac()
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
 *   - FEC_EMISION: Col L
 *   - FEC_PAG: Col O
 */

const RimacProcessor = {
    CONFIG: {
        HOJA_EECC: 'EECC_Rimac',
        HOJA_TRAMA: 'Trama_Rimac',
        START_ROW: 2,

        COL_TIPO: 7,             // G - Tipo (filter)
        COL_TIPO_DOC: 10,        // J - TIPO.DOC (CUPON)
        COL_FEC_EMISION: 12,     // L - FEC_EMISION
        COL_FEC_PAG: 15,         // O - FEC_PAG

        TRAMA_HEADERS: ['NUMERO_CUPON', 'FEC_EMISION', 'FEC_PAG', 'STATUS'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy', 3: 'dd/mm/yyyy' }
    },

    process(tempFileId, ss) {
        const context = 'RimacProcessor.process';
        const cfg = this.CONFIG;

        Logger.log(context + ': Iniciando procesamiento Rimac');

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

        // Copy to EECC
        if (srcData.length > 0) {
            wsEECC.getRange(1, 1, srcData.length, srcData[0].length).setValues(srcData);
            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, srcData[0].length).setFontWeight('bold').setBackground('#D9D9D9');
        }

        const filasCargadas = srcData.length - 1;

        // Process EECC: filter Tipo = "COB" or "PAG"
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

                const fecEmision = row[cfg.COL_FEC_EMISION - 1];
                const fecPag = row[cfg.COL_FEC_PAG - 1];

                tramaRows.push([numeroCupon, fecEmision, fecPag, '']);
            }
        }

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);

        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        Logger.log(context + ': Procesamiento completado. Filtrados: ' + filtrados + ', Escritas: ' + tramaRows.length);

        // Execute cross-reference
        const cruceResult = ConciliacionCruce.ejecutarCruce(wsTrama, wsBDCruce, { statusCol: 4 });

        // Export
        const exportResult = ConciliacionExport.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Rimac',
            { columnasTrama: 3, startRowEECC: cfg.START_ROW, cuponColEECC: cfg.COL_TIPO_DOC }
        );

        // Cleanup
        ConciliacionCruce.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'Rimac',
            stats: { filasCargadas, filtrados, filasEscritas: tramaRows.length },
            cruce: cruceResult,
            exports: exportResult
        };
    }
};
