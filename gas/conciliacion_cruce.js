/**
 * @fileoverview Cross-reference algorithm - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * CAMBIOS v2.0:
 * - NUEVO: Acepta datos pre-cargados para evitar re-lecturas
 * - OPTIMIZADO: Normalización con memoización
 * - OPTIMIZADO: Escrituras batch consolidadas
 * - ELIMINADO: Lecturas duplicadas de sheets
 * 
 * MEJORA ESPERADA: 40-60% reducción en tiempo de cruce
 */

const ConciliacionCruceV2 = {
    // STATUS Colors (MANDATORY - do not change)
    COLORS: {
        REGISTRADO: '#90EE90',
        VALIDAR: '#FFFF99',
        NO_REGISTRADO: '#FF6464',
        PENDIENTE_BD: '#FFC864'
    },

    // STATUS Values (EXACT - do not change)
    STATUS: {
        REGISTRADO: 'Cupón Registrado',
        VALIDAR: 'Validar Registro',
        NO_REGISTRADO: 'Cupón no Registrado',
        PENDIENTE_BD: 'Pendiente en BD_Cruce'
    },

    // Memoization cache for normalization
    _normCache: new Map(),

    /**
     * Clears normalization cache (call at end of session)
     */
    clearCache() {
        this._normCache.clear();
    },

    /**
     * Normalizes coupon with memoization
     * @private
     */
    _normalizarCuponCached(cupon) {
        const key = String(cupon || '');
        if (this._normCache.has(key)) {
            return this._normCache.get(key);
        }

        let result = key.trim().toUpperCase();
        while (result.length > 1 && result.charAt(0) === '0') {
            result = result.substring(1);
        }

        this._normCache.set(key, result);
        return result;
    },

    /**
     * Executes cross-reference - OPTIMIZED VERSION V3
     * Accepts pre-loaded data to avoid re-reading sheets
     * 
     * V3 OPTIMIZATIONS:
     * - Pre-built lookup maps for O(1) matching
     * - Memoized normalization to avoid repeated string ops
     * - Batch writes for better performance
     * - Detailed performance metrics
     * 
     * @param {Sheet} wsTrama - Trama sheet
     * @param {Sheet} wsBDCruce - BD_Cruce sheet
     * @param {Object} options - Options including pre-loaded data
     * @returns {Object} { registrado, validar, noRegistrado, tramaData, perfMetrics }
     */
    ejecutarCruce(wsTrama, wsBDCruce, options = {}) {
        const T = Date.now();

        const statusColTrama = options.statusCol || 4;
        const cuponColBD = getConfig('CONCILIACION.BD_CRUCE_CUPON_COL', 8);

        // ========== FASE 1: USAR DATOS PRE-CARGADOS O LEER ==========

        // V6 OPTIMIZATION: Use pre-loaded cupones array if available (much faster)
        let bdCuponesArray;
        let lastColBD;
        
        if (options.bdCruceCupones && options.bdCruceCupones.length > 0) {
            // Use optimized pre-loaded cupones (just column H)
            bdCuponesArray = options.bdCruceCupones;
            lastColBD = wsBDCruce.getLastColumn();
        } else if (options.bdCruceData) {
            // Fallback to full data if provided
            bdCuponesArray = options.bdCruceData.map(row => row[cuponColBD - 1]);
            lastColBD = options.bdCruceData[0] ? options.bdCruceData[0].length : cuponColBD;
        } else {
            // Last resort: read from sheet (slowest)
            const bdData = wsBDCruce.getDataRange().getDisplayValues();
            bdCuponesArray = bdData.map(row => row[cuponColBD - 1]);
            lastColBD = bdData[0] ? bdData[0].length : cuponColBD;
        }
        
        const colStatusBD = lastColBD + 1;

        // Build lookup maps with memoized normalization
        const bdMapExacto = new Map();
        const bdMapNorm = new Map();
        const bdCupones = [];

        for (let i = 1; i < bdCuponesArray.length; i++) {
            const cupon = String(bdCuponesArray[i] || '').trim();
            if (cupon) {
                const cuponNorm = this._normalizarCuponCached(cupon);
                const entry = { row: i + 1, idx: bdCupones.length };
                bdCupones.push({ cupon, row: i + 1, procesado: false, status: '' });

                if (!bdMapExacto.has(cupon)) {
                    bdMapExacto.set(cupon, entry);
                }
                if (!bdMapNorm.has(cuponNorm)) {
                    bdMapNorm.set(cuponNorm, entry);
                }
            }
        }

        // Trama data - use pre-loaded if available
        const tramaData = options.tramaData || wsTrama.getDataRange().getDisplayValues();

        // ========== FASE 2: PROCESO EN MEMORIA ==========

        const tramaStatusValues = [];
        const tramaBackgrounds = [];
        let contRegistrado = 0;
        let contValidar = 0;
        let contNoRegistrado = 0;

        for (let i = 1; i < tramaData.length; i++) {
            const cuponTrama = String(tramaData[i][0] || '').trim();

            if (!cuponTrama) {
                tramaStatusValues.push([this.STATUS.NO_REGISTRADO]);
                tramaBackgrounds.push([this.COLORS.NO_REGISTRADO]);
                contNoRegistrado++;
                continue;
            }

            // O(1) lookup with exact match first
            let matchEntry = bdMapExacto.get(cuponTrama);
            let matchType = matchEntry ? 'EXACTO' : null;

            // Normalized match if no exact
            if (!matchType) {
                const cuponNorm = this._normalizarCuponCached(cuponTrama);
                matchEntry = bdMapNorm.get(cuponNorm);
                matchType = matchEntry ? 'SIMILAR' : null;
            }

            if (matchType === 'EXACTO') {
                tramaStatusValues.push([this.STATUS.REGISTRADO]);
                tramaBackgrounds.push([this.COLORS.REGISTRADO]);
                contRegistrado++;
                if (matchEntry && matchEntry.idx >= 0 && matchEntry.idx < bdCupones.length) {
                    bdCupones[matchEntry.idx].procesado = true;
                    bdCupones[matchEntry.idx].status = this.STATUS.REGISTRADO;
                }
            } else if (matchType === 'SIMILAR') {
                tramaStatusValues.push([this.STATUS.VALIDAR]);
                tramaBackgrounds.push([this.COLORS.VALIDAR]);
                contValidar++;
                // P1-FIX: Bounds check on bdCupones array access
                if (matchEntry && matchEntry.idx >= 0 && matchEntry.idx < bdCupones.length) {
                    bdCupones[matchEntry.idx].procesado = true;
                    bdCupones[matchEntry.idx].status = this.STATUS.VALIDAR;
                }
            } else {
                tramaStatusValues.push([this.STATUS.NO_REGISTRADO]);
                tramaBackgrounds.push([this.COLORS.NO_REGISTRADO]);
                contNoRegistrado++;
            }
        }

        // ========== FASE 3: ESCRITURA BATCH OPTIMIZADA ==========

        // Write BD_Cruce STATUS header
        wsBDCruce.getRange(1, colStatusBD).setValue('STATUS');

        // Write Trama in batch
        if (tramaStatusValues.length > 0) {
            const tramaRange = wsTrama.getRange(2, statusColTrama, tramaStatusValues.length, 1);
            tramaRange.setValues(tramaStatusValues);
            tramaRange.setBackgrounds(tramaBackgrounds);
        }

        // Write BD_Cruce STATUS in batch (single setValues call is faster than multiple setValue)
        if (bdCupones.length > 0) {
            const bdStatusValues = bdCupones.map(c => [c.status || '']);
            wsBDCruce.getRange(2, colStatusBD, bdStatusValues.length, 1).setValues(bdStatusValues);
        }

        // Single flush at the end
        SpreadsheetApp.flush();

        // Clear normalization cache to free memory
        this.clearCache();

        const totalTime = Date.now() - T;

        return {
            registrado: contRegistrado,
            validar: contValidar,
            noRegistrado: contNoRegistrado,
            total: contRegistrado + contValidar + contNoRegistrado,
            perfMs: totalTime,
            _statusValues: tramaStatusValues  // Para uso interno (evita re-leer del sheet)
        };
    },

    /**
     * Cleans up temporary STATUS column
     */
    limpiarStatusBDCruce(wsBDCruce) {
        try {
            const lastCol = wsBDCruce.getLastColumn();
            if (lastCol === 0) return;

            const headers = wsBDCruce.getRange(1, 1, 1, lastCol).getValues()[0];
            for (let c = 0; c < headers.length; c++) {
                if (String(headers[c] || '').trim().toUpperCase() === 'STATUS') {
                    wsBDCruce.deleteColumn(c + 1);
                    return;
                }
            }
        } catch (e) {
            Logger.log('ConciliacionCruceV2.limpiarStatusBDCruce: ' + e.message);
        }
    }
};

// Alias for backward compatibility
const ConciliacionCruce = ConciliacionCruceV2;
