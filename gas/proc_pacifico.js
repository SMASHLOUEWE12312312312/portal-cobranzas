/**
 * @fileoverview Processor for Pacífico insurance company - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
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

const PacificoProcessorV2 = {
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

    processOptimized(convertResult, ss, dataContext) {
        const context = 'PacificoProcessorV2.processOptimized';
        const cfg = this.CONFIG;
        const T = { start: Date.now() };
        const perfLog = (label) => {
            Logger.log('[PERF-V2] Pacifico | ' + label + ' | ' + (Date.now() - T.start) + 'ms');
        };

        Logger.log(context + ': Iniciando procesamiento OPTIMIZADO');
        perfLog('INIT');

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        const wsBDCruce = dataContext.bdCruceSheet;
        if (!wsBDCruce) throw new Error('BD_Cruce no encontrada en contexto');

        // Prepare BD lookup sets for dual logic
        // Use cached data to build sets in memory (fast)
        const cuponColBD = getConfig('CONCILIACION.BD_CRUCE_CUPON_COL', 8);
        const bdData = dataContext.bdCruceData;
        const cuponesBD = new Set();
        const cuponesBDNorm = new Set();

        for (let i = 1; i < bdData.length; i++) {
            const cupon = String(bdData[i][cuponColBD - 1] || '').trim();
            if (cupon) {
                cuponesBD.add(cupon);
                cuponesBDNorm.add(ProcessorBase.normalizarCupon(cupon));
            }
        }
        perfLog('BD_LOOKUP_BUILT');

        // Clear sheets
        wsEECC.clear();
        ProcessorBase.clearFromRow(wsTrama, 2);
        perfLog('SHEETS_CLEARED');

        // Get source data
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

        // Write to EECC
        if (srcData.length > 0) {
            const numRows = srcData.length;
            const numCols = srcData[0].length;

            if (numRows > 1) {
                wsEECC.getRange(2, 1, numRows - 1, numCols).setNumberFormat('@');
            }
            wsEECC.getRange(1, 1, numRows, numCols).setValues(srcData);

            wsEECC.setFrozenRows(1);
            wsEECC.getRange(1, 1, 1, numCols).setFontWeight('bold').setBackground('#D9D9D9');
        }
        perfLog('EECC_WRITTEN');

        const filasCargadas = Math.max(0, srcData.length - 1);

        // Process EECC
        const tramaRows = [];
        let usedE = 0;
        let usedF = 0;

        for (let i = cfg.START_ROW - 1; i < srcData.length; i++) {
            const row = srcData[i];

            const cuponERaw = String(row[cfg.COL_E - 1] || '').trim();
            const cuponFRaw = String(row[cfg.COL_F - 1] || '').trim();
            const cuponE = this._limpiarSufijoCupon(cuponERaw);
            const cuponF = this._limpiarSufijoCupon(cuponFRaw);
            const fechaPago = row[cfg.COL_FECHA - 1];
            const factura = row[cfg.COL_FACTURA - 1];

            // Dual logic
            let numeroCupon = '';
            let origen = '';

            // Try E against BD sets
            if (cuponE) {
                const cuponENorm = ProcessorBase.normalizarCupon(cuponE);
                if (cuponesBD.has(cuponE) || cuponesBDNorm.has(cuponENorm)) {
                    numeroCupon = cuponE;
                    origen = 'E';
                    usedE++;
                }
            }

            // If not found, try F
            if (!numeroCupon && cuponF) {
                numeroCupon = cuponF;
                origen = 'F';
                usedF++;
            }

            // Fallback to E if neither found
            if (!numeroCupon && cuponE) {
                numeroCupon = cuponE;
                origen = 'E';
            }

            if (numeroCupon) {
                tramaRows.push([numeroCupon, fechaPago, factura, '', origen]);
            }
        }
        perfLog('EECC_PROCESSED');

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);
        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }
        perfLog('TRAMA_WRITTEN');

        // Execute cross-reference
        const cruceResult = ConciliacionCruceV2.ejecutarCruce(wsTrama, wsBDCruce, {
            statusCol: 4,
            bdCruceCupones: dataContext.bdCruceCupones
        });
        perfLog('CRUCE_COMPLETE');

        // Export
        const tramaDataForExport = wsTrama.getDataRange().getDisplayValues();
        const exportResult = ConciliacionExportV2.exportarResultados(
            wsTrama, wsEECC, wsBDCruce, 'Pacifico',
            {
                columnasTrama: 3,
                startRowEECC: cfg.START_ROW,
                cuponColsEECC: [cfg.COL_E, cfg.COL_F],
                cuponStripParenSuffix: true,
                statusColTrama: 4
            },
            {
                tramaData: tramaDataForExport,
                eeccData: srcData
            }
        );

        // Log mismatch check
        const pendientesCruce = (cruceResult.noRegistrado || 0) + (cruceResult.validar || 0);
        const pendientesXlsx = (exportResult.estadoCuentaPendientes && exportResult.estadoCuentaPendientes.count) || 0;
        if (pendientesCruce !== pendientesXlsx) {
            Logger.log('[WARN] Pendientes mismatch: UI(cruce)=' + pendientesCruce + ' vs XLSX=' + pendientesXlsx + ' | insurer=Pacifico');
        }
        perfLog('EXPORT_COMPLETE');

        // Cleanup
        ConciliacionCruceV2.limpiarStatusBDCruce(wsBDCruce);

        return {
            ok: true,
            insurer: 'Pacífico',
            stats: { filasCargadas, filasEscritas: tramaRows.length, usedColE: usedE, usedColF: usedF },
            cruce: cruceResult,
            exports: exportResult
        };
    },

    process(tempFileId, ss) {
        const dataContext = {
            bdCruceSheet: ss.getSheetByName('BD_Cruce'),
            bdCruceData: null
        };
        if (dataContext.bdCruceSheet) {
            dataContext.bdCruceData = dataContext.bdCruceSheet.getDataRange().getDisplayValues();
        }
        return this.processOptimized({ fileId: tempFileId, data: null }, ss, dataContext);
    }
};

const PacificoProcessor = PacificoProcessorV2;
