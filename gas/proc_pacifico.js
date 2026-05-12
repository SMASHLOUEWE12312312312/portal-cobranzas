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
        TRAMA_FORMAT: { 1: '@', 2: 'dd/mm/yyyy', 3: '@' }  // Date format
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
        const cfg = this.CONFIG;
        const T = Date.now();

        // Get sheets
        let wsEECC = ss.getSheetByName(cfg.HOJA_EECC);
        if (!wsEECC) wsEECC = ss.insertSheet(cfg.HOJA_EECC);

        let wsTrama = ss.getSheetByName(cfg.HOJA_TRAMA);
        if (!wsTrama) wsTrama = ss.insertSheet(cfg.HOJA_TRAMA);

        const wsBDCruce = dataContext.bdCruceSheet;
        if (!wsBDCruce) throw new Error('BD_Cruce no encontrada en contexto');

        // Prepare BD lookup sets for dual logic
        // V6 OPTIMIZATION: Use pre-loaded cupones array (much faster)
        const cuponesBD = new Set();
        const cuponesBDNorm = new Set();
        
        const bdCupones = dataContext.bdCruceCupones || [];
        for (let i = 1; i < bdCupones.length; i++) {
            const cupon = String(bdCupones[i] || '').trim();
            if (cupon) {
                cuponesBD.add(cupon);
                cuponesBDNorm.add(ProcessorBase.normalizarCupon(cupon));
            }
        }

        // Clear sheets
        wsEECC.clear();
        ProcessorBase.clearFromRow(wsTrama, 2);

        // Get source data
        // `srcData` (display strings) is used for text columns (cupones, factura).
        // `srcValues` (native types) is used for the date column to avoid the
        // locale-dependent dd/mm vs mm/dd ambiguity introduced by getDisplayValues().
        let srcData;
        let srcValues;
        if (convertResult.data) {
            srcData = convertResult.data;
            srcValues = convertResult.values || convertResult.data;
        } else {
            const tempSS = SpreadsheetApp.openById(convertResult.fileId);
            const tempSheet = tempSS.getSheets()[0];
            const range = tempSheet.getDataRange();
            srcData = range.getDisplayValues();
            srcValues = range.getValues();
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
            
            // Read the date from the native-typed array, not from the display string.
            // The display string is locale-dependent ("5/8/2026" is ambiguous between
            // 5-aug and 8-may); the native value is a proper Date object.
            const fechaPago = ProcessorBase.parseToDate(srcValues[i][cfg.COL_FECHA - 1]);
            
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

        // Write Trama
        ProcessorBase.writeTramaHeaders(wsTrama, cfg.TRAMA_HEADERS);
        if (tramaRows.length > 0) {
            ProcessorBase.writeTramaData(wsTrama, tramaRows, cfg.TRAMA_FORMAT);
        }

        // Execute cross-reference
        const cruceResult = ConciliacionCruceV2.ejecutarCruce(wsTrama, wsBDCruce, {
            statusCol: 4,
            bdCruceCupones: dataContext.bdCruceCupones
        });

        // V10: Build export data from memory (NO re-read from sheet)
        const tramaDataForExport = [cfg.TRAMA_HEADERS];
        const statusFromCruce = cruceResult._statusValues || [];
        for (let i = 0; i < tramaRows.length; i++) {
            const row = tramaRows[i];
            const exportRow = row.map((cell) => {
                if (cell instanceof Date && !isNaN(cell.getTime())) {
                    return cell.getDate() + '/' + (cell.getMonth() + 1) + '/' + cell.getFullYear();
                }
                return cell;
            });
            exportRow[3] = statusFromCruce[i] ? statusFromCruce[i][0] : '';
            tramaDataForExport.push(exportRow);
        }
        
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
        return this.processOptimized({ fileId: tempFileId, data: null }, ss, dataContext);
    }
};

const PacificoProcessor = PacificoProcessorV2;
