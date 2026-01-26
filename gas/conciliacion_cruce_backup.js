/**
 * @fileoverview Cross-reference algorithm for Trama vs BD_Cruce
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE:
 * - CruzarTramaConBDCruce()
 * - CompareCuponesArray()
 */

const ConciliacionCruce_Backup = {
    // STATUS Colors (MANDATORY - do not change)
    COLORS: {
        REGISTRADO: '#90EE90',     // Light green
        VALIDAR: '#FFFF99',        // Yellow
        NO_REGISTRADO: '#FF6464',  // Light red
        PENDIENTE_BD: '#FFC864'    // Orange
    },

    // STATUS Values (EXACT - do not change)
    STATUS: {
        REGISTRADO: 'Cupón Registrado',
        VALIDAR: 'Validar Registro',
        NO_REGISTRADO: 'Cupón no Registrado',
        PENDIENTE_BD: 'Pendiente en BD_Cruce'
    },

    /**
     * Executes cross-reference of coupons Trama vs BD_Cruce
     * OPTIMIZED VERSION: Batch writes for performance
     * 
     * @param {Sheet} wsTrama - Trama sheet with coupons to validate (Col A)
     * @param {Sheet} wsBDCruce - BD_Cruce sheet (Col H = CUPON)
     * @param {Object} options - { statusCol: status column number in Trama }
     * @returns {Object} { registrado, validar, noRegistrado }
     */
    ejecutarCruce(wsTrama, wsBDCruce, options = {}) {
        const context = 'ConciliacionCruce.ejecutarCruce';
        const statusColTrama = options.statusCol || 4;
        const cuponColBD = getConfig('CONCILIACION.BD_CRUCE_CUPON_COL', 8); // Col H

        // ========== PROFILING INSTRUMENTATION ==========
        const T = { start: Date.now() };
        const perfLog = (label) => {
            const now = Date.now();
            const elapsed = now - T.start;
            const delta = T.last ? now - T.last : elapsed;
            Logger.log('[PERF] ejecutarCruce | ' + label + ' | +' + delta + 'ms | total=' + elapsed + 'ms');
            T.last = now;
        };
        perfLog('INIT');

        Logger.log(context + ': Iniciando cruce (OPTIMIZADO)');

        // ========== FASE 1: CARGA DE DATOS EN MEMORIA ==========

        // 1.1 Load BD_Cruce into Map for O(1) lookup
        // FIX: Usar getDisplayValues() para preservar datos originales (ej: ceros iniciales en cupones)
        const bdData = wsBDCruce.getDataRange().getDisplayValues();
        const lastColBD = bdData[0] ? bdData[0].length : cuponColBD;
        const colStatusBD = lastColBD + 1; // Nueva columna STATUS
        perfLog('READ_BD_CRUCE');

        // Map: cupon exacto -> { row, idx }
        // Map: cupon normalizado -> { row, idx }
        const bdMapExacto = new Map();
        const bdMapNorm = new Map();
        const bdCupones = []; // Para tracking de procesados

        for (let i = 1; i < bdData.length; i++) {
            const cupon = String(bdData[i][cuponColBD - 1] || '').trim();
            if (cupon) {
                const cuponNorm = this._normalizarCupon(cupon);
                const entry = { row: i + 1, idx: bdCupones.length };
                bdCupones.push({ cupon, row: i + 1, procesado: false, status: '' });

                // Solo guardar primera ocurrencia (evitar duplicados)
                if (!bdMapExacto.has(cupon)) {
                    bdMapExacto.set(cupon, entry);
                }
                if (!bdMapNorm.has(cuponNorm)) {
                    bdMapNorm.set(cuponNorm, entry);
                }
            }
        }
        perfLog('BUILD_BD_MAPS');

        Logger.log(context + ': Cupones en BD_Cruce: ' + bdCupones.length);

        // 1.2 Load Trama data
        // FIX: Usar getDisplayValues() para preservar datos originales
        const tramaData = wsTrama.getDataRange().getDisplayValues();
        const numFilasTrama = tramaData.length - 1; // Sin header
        perfLog('READ_TRAMA');

        // ========== FASE 2: PROCESAMIENTO EN MEMORIA ==========

        // Arrays para batch write
        const tramaStatusValues = [];  // [[status], [status], ...]
        const tramaBackgrounds = [];   // [[color], [color], ...]

        // Counters
        let contRegistrado = 0;
        let contValidar = 0;
        let contNoRegistrado = 0;

        // 2.1 Process each Trama row in memory
        for (let i = 1; i < tramaData.length; i++) {
            const cuponTrama = String(tramaData[i][0] || '').trim();

            // Cupón vacío → No registrado
            if (!cuponTrama) {
                tramaStatusValues.push([this.STATUS.NO_REGISTRADO]);
                tramaBackgrounds.push([this.COLORS.NO_REGISTRADO]);
                contNoRegistrado++;
                continue;
            }

            // Buscar match EXACTO en O(1)
            let matchEntry = bdMapExacto.get(cuponTrama);
            let matchType = matchEntry ? 'EXACTO' : null;

            // Si no hay match exacto, buscar NORMALIZADO
            if (!matchType) {
                const cuponNorm = this._normalizarCupon(cuponTrama);
                matchEntry = bdMapNorm.get(cuponNorm);
                matchType = matchEntry ? 'SIMILAR' : null;
            }

            // Determinar resultado
            if (matchType === 'EXACTO') {
                tramaStatusValues.push([this.STATUS.REGISTRADO]);
                tramaBackgrounds.push([this.COLORS.REGISTRADO]);
                contRegistrado++;

                // Marcar BD como procesado
                if (matchEntry) {
                    bdCupones[matchEntry.idx].procesado = true;
                    bdCupones[matchEntry.idx].status = this.STATUS.REGISTRADO;
                }
            } else if (matchType === 'SIMILAR') {
                tramaStatusValues.push([this.STATUS.VALIDAR]);
                tramaBackgrounds.push([this.COLORS.VALIDAR]);
                contValidar++;

                // Marcar BD como procesado
                if (matchEntry) {
                    bdCupones[matchEntry.idx].procesado = true;
                    bdCupones[matchEntry.idx].status = this.STATUS.VALIDAR;
                }
            } else {
                // No encontrado
                tramaStatusValues.push([this.STATUS.NO_REGISTRADO]);
                tramaBackgrounds.push([this.COLORS.NO_REGISTRADO]);
                contNoRegistrado++;
            }
        }
        perfLog('PROCESS_TRAMA_LOOP');

        // ========== FASE 3: ESCRITURA BATCH ==========

        // 3.1 Write header STATUS to BD_Cruce
        wsBDCruce.getRange(1, colStatusBD).setValue('STATUS');

        // 3.2 Write Trama STATUS column in batch
        if (tramaStatusValues.length > 0) {
            wsTrama.getRange(2, statusColTrama, tramaStatusValues.length, 1)
                .setValues(tramaStatusValues);
            wsTrama.getRange(2, statusColTrama, tramaBackgrounds.length, 1)
                .setBackgrounds(tramaBackgrounds);
        }
        perfLog('WRITE_TRAMA_BATCH');

        // 3.3 Write BD_Cruce STATUS column in batch
        if (bdCupones.length > 0) {
            const bdStatusValues = bdCupones.map(c =>
                [c.status || this.STATUS.NO_REGISTRADO]
            );
            wsBDCruce.getRange(2, colStatusBD, bdStatusValues.length, 1)
                .setValues(bdStatusValues);
        }
        perfLog('WRITE_BD_BATCH');

        // Flush changes
        SpreadsheetApp.flush();
        perfLog('FLUSH_COMPLETE');

        Logger.log(context + ': Cruce completado (BATCH). ' +
            'Registrado: ' + contRegistrado + ', ' +
            'Validar: ' + contValidar + ', ' +
            'No Registrado: ' + contNoRegistrado);

        return {
            registrado: contRegistrado,
            validar: contValidar,
            noRegistrado: contNoRegistrado,
            total: contRegistrado + contValidar + contNoRegistrado
        };
    },

    /**
     * Compares a Trama coupon against BD_Cruce
     * 
     * REPLICA EXACTA DE: Function CompareCuponesArray() del VBA
     * 
     * @private
     */
    _compararCupon(cuponTrama, cuponesBD, filasBD, wsBDCruce, colStatusBD, procesadosBD) {
        // 1. Find EXACT match
        for (let i = 0; i < cuponesBD.length; i++) {
            if (cuponesBD[i] === cuponTrama) {
                wsBDCruce.getRange(filasBD[i], colStatusBD).setValue(this.STATUS.REGISTRADO);
                procesadosBD[i] = true;
                return 'EXACTO';
            }
        }

        // 2. Find NORMALIZED match (95%)
        const cuponNorm = this._normalizarCupon(cuponTrama);

        for (let i = 0; i < cuponesBD.length; i++) {
            if (this._normalizarCupon(cuponesBD[i]) === cuponNorm) {
                wsBDCruce.getRange(filasBD[i], colStatusBD).setValue(this.STATUS.VALIDAR);
                procesadosBD[i] = true;
                return 'SIMILAR';
            }
        }

        // 3. No match
        return 'NINGUNO';
    },

    /**
     * Normalizes coupon for comparison
     * 
     * REPLICA EXACTA DE: Function NormalizarCupon() del VBA
     * - UPPER
     * - TRIM
     * - Remove leading zeros
     */
    _normalizarCupon(cupon) {
        let result = String(cupon || '').trim().toUpperCase();

        // Remove leading zeros
        while (result.length > 1 && result.charAt(0) === '0') {
            result = result.substring(1);
        }

        return result;
    },

    /**
     * Cleans up temporary STATUS column from BD_Cruce
     * 
     * REPLICA EXACTA DE: Sub LimpiarColumnaStatusBDCruce() del VBA
     * 
     * @param {Sheet} wsBDCruce - BD_Cruce sheet
     */
    limpiarStatusBDCruce(wsBDCruce) {
        const context = 'ConciliacionCruce.limpiarStatusBDCruce';

        try {
            const lastCol = wsBDCruce.getLastColumn();
            if (lastCol === 0) return;

            const headers = wsBDCruce.getRange(1, 1, 1, lastCol).getValues()[0];

            for (let c = 0; c < headers.length; c++) {
                const header = String(headers[c] || '').trim().toUpperCase();
                if (header === 'STATUS') {
                    wsBDCruce.deleteColumn(c + 1);
                    Logger.log(context + ': Columna STATUS eliminada');
                    return;
                }
            }
        } catch (e) {
            Logger.log(context + ': Warning - ' + e.message);
        }
    }
};
