/**
 * @fileoverview Cross-reference algorithm for Trama vs BD_Cruce
 * @version 1.0.0
 * 
 * REPLICA EXACTA DE:
 * - CruzarTramaConBDCruce()
 * - CompareCuponesArray()
 */

const ConciliacionCruce = {
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
     * 
     * REPLICA EXACTA DE: Sub CruzarTramaConBDCruce() del VBA
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

        Logger.log(context + ': Iniciando cruce');

        // 1. Load coupons from BD_Cruce into arrays
        // (replica: arrCuponesBD, arrFilasBD from VBA)
        const bdData = wsBDCruce.getDataRange().getValues();
        const cuponesBD = [];
        const filasBD = [];

        for (let i = 1; i < bdData.length; i++) {
            const cupon = String(bdData[i][cuponColBD - 1] || '').trim();
            if (cupon) {
                cuponesBD.push(cupon);
                filasBD.push(i + 1); // 1-indexed row
            }
        }

        Logger.log(context + ': Cupones en BD_Cruce: ' + cuponesBD.length);

        // 2. Add temporary STATUS column in BD_Cruce
        // (replica: colStatus = lastColBD + 1)
        const lastColBD = wsBDCruce.getLastColumn() || cuponColBD;
        const colStatusBD = lastColBD + 1;
        wsBDCruce.getRange(1, colStatusBD).setValue('STATUS');

        // 3. Array to mark processed BD coupons
        const procesadosBD = new Array(cuponesBD.length).fill(false);

        // 4. Counters
        let contRegistrado = 0;
        let contValidar = 0;
        let contNoRegistrado = 0;

        // 5. Process each coupon from Trama
        const tramaData = wsTrama.getDataRange().getValues();

        for (let i = 1; i < tramaData.length; i++) {
            const cuponTrama = String(tramaData[i][0] || '').trim();
            const filaT = i + 1;

            // Empty coupon → not registered
            if (!cuponTrama) {
                wsTrama.getRange(filaT, statusColTrama)
                    .setValue(this.STATUS.NO_REGISTRADO)
                    .setBackground(this.COLORS.NO_REGISTRADO);
                contNoRegistrado++;
                continue;
            }

            // Find match
            const resultado = this._compararCupon(
                cuponTrama,
                cuponesBD,
                filasBD,
                wsBDCruce,
                colStatusBD,
                procesadosBD
            );

            // Apply result
            switch (resultado) {
                case 'EXACTO':
                    wsTrama.getRange(filaT, statusColTrama)
                        .setValue(this.STATUS.REGISTRADO)
                        .setBackground(this.COLORS.REGISTRADO);
                    contRegistrado++;
                    break;

                case 'SIMILAR':
                    wsTrama.getRange(filaT, statusColTrama)
                        .setValue(this.STATUS.VALIDAR)
                        .setBackground(this.COLORS.VALIDAR);
                    contValidar++;
                    break;

                default: // 'NINGUNO'
                    wsTrama.getRange(filaT, statusColTrama)
                        .setValue(this.STATUS.NO_REGISTRADO)
                        .setBackground(this.COLORS.NO_REGISTRADO);
                    contNoRegistrado++;
            }
        }

        // 6. Mark unprocessed BD coupons
        // (replica: If Not arrProcesadosBD(i) Then ...)
        for (let i = 0; i < cuponesBD.length; i++) {
            if (!procesadosBD[i]) {
                wsBDCruce.getRange(filasBD[i], colStatusBD)
                    .setValue(this.STATUS.NO_REGISTRADO);
            }
        }

        Logger.log(context + ': Cruce completado. ' +
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
