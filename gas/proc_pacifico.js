/**
 * @fileoverview Processor for Pacífico insurance company
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE: Module4.bas → Sub Macro_Pacifico()
 * 
 * SPECIFICATIONS:
 * - EECC Sheet: EECC_Pacifico
 * - Trama Sheet: Trama_Pacifico
 * - Data start row: 2
 * - SPECIAL: Dual coupon logic
 *   - First try Col E vs BD_Cruce
 *   - If no match, try Col F
 * - Mapping:
 *   - CUPON: E or F (dual logic)
 *   - FECHA: Col K
 *   - FACTURA: Col J
 *   - ORIGEN_CUPON: auxiliary column (E or F)
 */

const PacificoProcessor = {
    CONFIG: {
        HOJA_EECC: 'EECC_Pacifico',
        HOJA_TRAMA: 'Trama_Pacifico',
        START_ROW: 2,

        COL_E: 5,                // E - Primary coupon
        COL_F: 6,                // F - Fallback coupon
        COL_FACTURA: 10,         // J - Factura
        COL_FECHA: 11,           // K - Fecha pago

        // Trama has 5 columns including ORIGEN_CUPON
        TRAMA_HEADERS: ['NUMERO_CUPON', 'FECHA_PAGO', 'FACTURA', 'STATUS', 'ORIGEN_CUPON'],
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy' }
    },

    /**
     * FIX: Limpia sufijo (x/y) de cupones Pacífico
     * Ejemplo: "111891993(5/12)" → "111891993"
     * @param {string} cupon - Cupón original
     * @returns {string} Cupón sin sufijo
     */
    _limpiarSufijoCupon(cupon) {
        const str = String(cupon || '').trim();
        // Quitar todo desde "(" hasta el final si termina en ")"
        return str.replace(/\([^)]*\)$/, '').trim();
    },

    process(tempFileId, ss) {
        const context = 'PacificoProcessor.process';
        const cfg = this.CONFIG;
        const cuponColBD = getConfig('CONCILIACION.BD_CRUCE_CUPON_COL', 8);

        Logger.log(context + ': Iniciando procesamiento Pacífico');

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        const wsBDCruce = ss.getSheetByName('BD_Cruce');
        if (!wsBDCruce) throw new Error('Hoja BD_Cruce no encontrada');

        // Load BD_Cruce coupons for dual logic
        const bdData = wsBDCruce.getDataRange().getValues();
        const cuponesBD = new Set();
        const cuponesBDNorm = new Set();

        for (let i = 1; i < bdData.length; i++) {
            const cupon = String(bdData[i][cuponColBD - 1] || '').trim();
            if (cupon) {
                cuponesBD.add(cupon);
                cuponesBDNorm.add(ProcessorBase.normalizarCupon(cupon));
            }
        }

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

        // Process EECC with dual logic
        const tramaRows = [];
        let usedE = 0;
        let usedF = 0;

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            // FIX: Limpiar sufijo (x/y) de cupones Pacífico antes de procesar
            const cuponERaw = String(row[cfg.COL_E - 1] || '').trim();
            const cuponFRaw = String(row[cfg.COL_F - 1] || '').trim();
            const cuponE = this._limpiarSufijoCupon(cuponERaw);
            const cuponF = this._limpiarSufijoCupon(cuponFRaw);
            const fechaPago = row[cfg.COL_FECHA - 1];
            const factura = row[cfg.COL_FACTURA - 1];

            // Dual logic: try E first
            let numeroCupon = '';
            let origen = '';

            if (cuponE) {
                const cuponENorm = ProcessorBase.normalizarCupon(cuponE);
                if (cuponesBD.has(cuponE) || cuponesBDNorm.has(cuponENorm)) {
                    numeroCupon = cuponE;
                    origen = 'E';
                    usedE++;
                }
            }

            // If E didn't match, try F
            if (!numeroCupon && cuponF) {
                numeroCupon = cuponF;
                origen = 'F';
                usedF++;
            }

            // If neither, use E anyway (for tracking)
            if (!numeroCupon && cuponE) {
                numeroCupon = cuponE;
                origen = 'E';
            }

            if (numeroCupon) {
                tramaRows.push([numeroCupon, fechaPago, factura, '', origen]);
            }
        }

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);

        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        Logger.log(context + ': Procesamiento completado. Usó Col E: ' + usedE + ', Usó Col F: ' + usedF);

        // Execute cross-reference
        const cruceResult = ConciliacionCruce.ejecutarCruce(wsTrama, wsBDCruce, { statusCol: 4 });

        // Export - only first 3 columns
        // FIX v1.2: Pasar cuponColsEECC para matchear por E y F + limpiar sufijos (x/y)
        const exportResult = ConciliacionExport.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Pacifico',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColsEECC: [cfg.COL_E, cfg.COL_F],  // FIX: Matchear por E y F
                cuponStripParenSuffix: true,            // FIX: Limpiar sufijos (x/y)
                statusColTrama: 4
            }
        );

        // FIX v1.2: Warning log si hay mismatch entre cruce y export
        const pendientesCruce = (cruceResult.noRegistrado || 0) + (cruceResult.validar || 0);
        const pendientesXlsx = (exportResult.estadoCuentaPendientes && exportResult.estadoCuentaPendientes.count) || 0;
        if (pendientesCruce !== pendientesXlsx) {
            Logger.log('[WARN] Pendientes mismatch: UI(cruce)=' + pendientesCruce + ' vs XLSX=' + pendientesXlsx + ' | insurer=Pacifico');
        }

        // Cleanup
        ConciliacionCruce.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'Pacífico',
            stats: { filasCargadas, filasEscritas: tramaRows.length, usedColE: usedE, usedColF: usedF },
            cruce: cruceResult,
            exports: exportResult
        };
    }
};
