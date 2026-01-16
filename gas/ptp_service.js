/**
 * @fileoverview PTPService - Fase 2 Core de Cobranzas
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * 
 * PTP = Promise to Pay (Compromiso de Pago)
 * 
 * CARACTERÍSTICAS:
 * - Registro de compromisos de pago
 * - Seguimiento de cumplimiento
 * - Historial de PTPs por cliente
 * - Métricas de cumplimiento (CEI)
 * - Integración con Bitácora
 * 
 * FEATURE FLAG: FEATURES.ENABLE_PTP_SERVICE
 */

const PTPService = {
    // ========== CONFIGURACIÓN ==========
    SHEET_NAME: 'PTP_Compromisos',
    CACHE_KEY: 'PTP_STATS_V1',
    CACHE_TTL: 300,

    // ========== ESTADOS PTP ==========
    STATUS: {
        PENDIENTE: 'PENDIENTE',       // Esperando fecha de pago
        CUMPLIDO: 'CUMPLIDO',         // Pagó en fecha
        CUMPLIDO_PARCIAL: 'CUMPLIDO_PARCIAL', // Pagó parcialmente
        INCUMPLIDO: 'INCUMPLIDO',     // No pagó
        RENEGOCIADO: 'RENEGOCIADO',   // Se acordó nueva fecha
        CANCELADO: 'CANCELADO'        // Cancelado por algún motivo
    },

    // ========== HEADERS DE HOJA PTP ==========
    HEADERS: [
        'ID_PTP',
        'ID_CICLO',
        'FECHA_REGISTRO',
        'ASEGURADO',
        'RUC',
        'RESPONSABLE',
        'MONTO_COMPROMETIDO',
        'MONEDA',
        'FECHA_COMPROMISO',
        'ESTADO',
        'FECHA_CUMPLIMIENTO',
        'MONTO_PAGADO',
        'OBSERVACIONES',
        'FECHA_ACTUALIZACION'
    ],

    // ========== API PRINCIPAL ==========

    /**
     * Registra un nuevo compromiso de pago
     * @param {Object} ptp - Datos del compromiso
     * @return {Object} { ok, id, message }
     */
    registrarPTP(ptp) {
        const context = 'PTPService.registrarPTP';

        if (!this._isEnabled()) {
            return { ok: false, error: 'Feature disabled' };
        }

        try {
            // Validar datos requeridos
            const validation = this._validatePTP(ptp);
            if (!validation.ok) {
                return validation;
            }

            // Generar ID único
            const idPTP = this._generateId();
            const now = new Date();

            // Preparar registro
            const registro = [
                idPTP,
                ptp.idCiclo || '',
                now,
                ptp.asegurado,
                ptp.ruc || '',
                ptp.responsable || this._getCurrentUser(),
                ptp.montoComprometido || 0,
                ptp.moneda || 'PEN',
                new Date(ptp.fechaCompromiso),
                this.STATUS.PENDIENTE,
                '', // fecha cumplimiento
                0,  // monto pagado
                ptp.observaciones || '',
                now
            ];

            // Escribir en hoja
            const sheet = this._getOrCreateSheet();
            sheet.appendRow(registro);

            // Registrar en bitácora si hay ciclo
            if (ptp.idCiclo && typeof BitacoraService !== 'undefined') {
                BitacoraService.registrarGestion({
                    idCiclo: ptp.idCiclo,
                    asegurado: ptp.asegurado,
                    ruc: ptp.ruc,
                    tipoGestion: 'COMPROMISO_PAGO',
                    estadoGestion: 'COMPROMISO_PAGO',
                    fechaCompromiso: ptp.fechaCompromiso,
                    observaciones: `PTP registrado: ${ptp.montoComprometido} ${ptp.moneda || 'PEN'} para ${new Date(ptp.fechaCompromiso).toLocaleDateString('es-PE')}`
                });
            }

            // Invalidar cache
            this.invalidateCache();

            Logger.info(context, 'PTP registrado', { id: idPTP, asegurado: ptp.asegurado });

            return {
                ok: true,
                id: idPTP,
                message: 'Compromiso registrado exitosamente'
            };

        } catch (error) {
            Logger.error(context, 'Error registrando PTP', error);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Actualiza estado de un PTP
     * @param {string} idPTP - ID del compromiso
     * @param {Object} update - { estado, montoPagado, observaciones }
     * @return {Object} { ok, message }
     */
    actualizarPTP(idPTP, update) {
        const context = 'PTPService.actualizarPTP';

        if (!this._isEnabled()) {
            return { ok: false, error: 'Feature disabled' };
        }

        try {
            const sheet = this._getOrCreateSheet();
            const data = sheet.getDataRange().getValues();

            // Buscar PTP
            let rowIndex = -1;
            for (let i = 1; i < data.length; i++) {
                if (data[i][0] === idPTP) {
                    rowIndex = i + 1; // +1 porque getRange es 1-based
                    break;
                }
            }

            if (rowIndex === -1) {
                return { ok: false, error: 'PTP no encontrado' };
            }

            const now = new Date();
            const currentRow = data[rowIndex - 1];

            // Actualizar campos
            if (update.estado) {
                sheet.getRange(rowIndex, 10).setValue(update.estado); // ESTADO
            }
            if (update.estado === this.STATUS.CUMPLIDO || update.estado === this.STATUS.CUMPLIDO_PARCIAL) {
                sheet.getRange(rowIndex, 11).setValue(now); // FECHA_CUMPLIMIENTO
            }
            if (update.montoPagado !== undefined) {
                sheet.getRange(rowIndex, 12).setValue(update.montoPagado); // MONTO_PAGADO
            }
            if (update.observaciones) {
                const obsActual = currentRow[12] || '';
                const newObs = obsActual ? `${obsActual}\n[${now.toLocaleDateString('es-PE')}] ${update.observaciones}` : update.observaciones;
                sheet.getRange(rowIndex, 13).setValue(newObs); // OBSERVACIONES
            }
            sheet.getRange(rowIndex, 14).setValue(now); // FECHA_ACTUALIZACION

            this.invalidateCache();

            Logger.info(context, 'PTP actualizado', { id: idPTP, estado: update.estado });

            return { ok: true, message: 'Compromiso actualizado' };

        } catch (error) {
            Logger.error(context, 'Error actualizando PTP', error);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Marca un PTP como cumplido
     * @param {string} idPTP - ID del compromiso
     * @param {number} montoPagado - Monto efectivamente pagado
     * @param {string} observaciones - Notas adicionales
     * @return {Object} { ok, message }
     */
    marcarCumplido(idPTP, montoPagado, observaciones = '') {
        return this.actualizarPTP(idPTP, {
            estado: this.STATUS.CUMPLIDO,
            montoPagado: montoPagado,
            observaciones: observaciones || 'Pago recibido'
        });
    },

    /**
     * Marca un PTP como incumplido
     * @param {string} idPTP - ID del compromiso
     * @param {string} observaciones - Motivo del incumplimiento
     * @return {Object} { ok, message }
     */
    marcarIncumplido(idPTP, observaciones = '') {
        return this.actualizarPTP(idPTP, {
            estado: this.STATUS.INCUMPLIDO,
            observaciones: observaciones || 'Compromiso no cumplido'
        });
    },

    /**
     * Obtiene PTPs de un asegurado
     * @param {string} asegurado - Nombre o RUC
     * @return {Array} Lista de PTPs
     */
    getPTPsByAsegurado(asegurado) {
        const context = 'PTPService.getPTPsByAsegurado';

        try {
            const sheet = this._getOrCreateSheet();
            const data = sheet.getDataRange().getValues();
            const ptps = [];

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row[3]?.toLowerCase().includes(asegurado.toLowerCase()) ||
                    row[4] === asegurado) { // Por RUC
                    ptps.push(this._rowToObject(row));
                }
            }

            return ptps.sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));

        } catch (error) {
            Logger.error(context, 'Error obteniendo PTPs', error);
            return [];
        }
    },

    /**
     * Obtiene PTPs pendientes (vencidos o próximos)
     * @return {Array} Lista de PTPs pendientes
     */
    getPTPsPendientes() {
        const context = 'PTPService.getPTPsPendientes';

        try {
            const sheet = this._getOrCreateSheet();
            const data = sheet.getDataRange().getValues();
            const ptps = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (row[9] === this.STATUS.PENDIENTE) {
                    const ptp = this._rowToObject(row);
                    const fechaComp = new Date(ptp.fechaCompromiso);
                    ptp.diasRestantes = Math.floor((fechaComp - today) / (1000 * 60 * 60 * 24));
                    ptp.vencido = ptp.diasRestantes < 0;
                    ptps.push(ptp);
                }
            }

            // Ordenar: vencidos primero, luego por fecha
            return ptps.sort((a, b) => {
                if (a.vencido && !b.vencido) return -1;
                if (!a.vencido && b.vencido) return 1;
                return a.diasRestantes - b.diasRestantes;
            });

        } catch (error) {
            Logger.error(context, 'Error obteniendo PTPs pendientes', error);
            return [];
        }
    },

    /**
     * Obtiene métricas de cumplimiento (CEI - Collection Effectiveness Index)
     * @param {Object} options - { fechaInicio, fechaFin }
     * @return {Object} Métricas de cumplimiento
     */
    getMetricasCumplimiento(options = {}) {
        const context = 'PTPService.getMetricasCumplimiento';

        // Verificar cache
        if (typeof CacheHelper !== 'undefined') {
            const cached = CacheHelper.get(this.CACHE_KEY);
            if (cached && !options.forceRefresh) {
                return cached;
            }
        }

        try {
            const sheet = this._getOrCreateSheet();
            const data = sheet.getDataRange().getValues();

            const metricas = {
                ok: true,
                timestamp: new Date().toISOString(),
                total: 0,
                cumplidos: 0,
                cumplidosParcial: 0,
                incumplidos: 0,
                pendientes: 0,
                renegociados: 0,
                tasaCumplimiento: 0,
                cei: 0, // Collection Effectiveness Index
                montoComprometido: 0,
                montoRecuperado: 0,
                tasaRecuperacion: 0
            };

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const estado = row[9];
                const montoComp = parseFloat(row[6]) || 0;
                const montoPagado = parseFloat(row[11]) || 0;

                metricas.total++;
                metricas.montoComprometido += montoComp;
                metricas.montoRecuperado += montoPagado;

                switch (estado) {
                    case this.STATUS.CUMPLIDO:
                        metricas.cumplidos++;
                        break;
                    case this.STATUS.CUMPLIDO_PARCIAL:
                        metricas.cumplidosParcial++;
                        break;
                    case this.STATUS.INCUMPLIDO:
                        metricas.incumplidos++;
                        break;
                    case this.STATUS.PENDIENTE:
                        metricas.pendientes++;
                        break;
                    case this.STATUS.RENEGOCIADO:
                        metricas.renegociados++;
                        break;
                }
            }

            // Calcular tasas
            const resueltos = metricas.cumplidos + metricas.cumplidosParcial + metricas.incumplidos;
            if (resueltos > 0) {
                metricas.tasaCumplimiento = ((metricas.cumplidos + metricas.cumplidosParcial) / resueltos * 100).toFixed(1);
            }

            if (metricas.montoComprometido > 0) {
                metricas.tasaRecuperacion = (metricas.montoRecuperado / metricas.montoComprometido * 100).toFixed(1);
            }

            // CEI = (Monto Recuperado / Monto Comprometido) * (Cumplidos / Total)
            if (metricas.total > 0 && metricas.montoComprometido > 0) {
                metricas.cei = (
                    (metricas.montoRecuperado / metricas.montoComprometido) *
                    ((metricas.cumplidos + metricas.cumplidosParcial) / metricas.total) * 100
                ).toFixed(1);
            }

            // Guardar en cache
            if (typeof CacheHelper !== 'undefined') {
                CacheHelper.set(this.CACHE_KEY, metricas, this.CACHE_TTL);
            }

            return metricas;

        } catch (error) {
            Logger.error(context, 'Error calculando métricas', error);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Invalida cache
     */
    invalidateCache() {
        if (typeof CacheHelper !== 'undefined') {
            CacheHelper.remove(this.CACHE_KEY);
        }
    },

    // ========== MÉTODOS PRIVADOS ==========

    _isEnabled() {
        return getConfig('FEATURES.ENABLE_PTP_SERVICE', true);
    },

    _validatePTP(ptp) {
        if (!ptp.asegurado) {
            return { ok: false, error: 'Asegurado es requerido' };
        }
        if (!ptp.fechaCompromiso) {
            return { ok: false, error: 'Fecha de compromiso es requerida' };
        }
        const fecha = new Date(ptp.fechaCompromiso);
        if (isNaN(fecha.getTime())) {
            return { ok: false, error: 'Fecha de compromiso inválida' };
        }
        return { ok: true };
    },

    _generateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `PTP_${timestamp}_${random}`.toUpperCase();
    },

    _getCurrentUser() {
        try {
            return Session.getActiveUser().getEmail() || 'system';
        } catch (e) {
            return 'system';
        }
    },

    _getOrCreateSheet() {
        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName(this.SHEET_NAME);

        if (!sheet) {
            sheet = ss.insertSheet(this.SHEET_NAME);
            sheet.getRange(1, 1, 1, this.HEADERS.length).setValues([this.HEADERS])
                .setFontWeight('bold')
                .setBackground('#e8f5e9');
            sheet.setFrozenRows(1);
            Logger.info('PTPService', `Hoja ${this.SHEET_NAME} creada`);
        }

        return sheet;
    },

    _rowToObject(row) {
        return {
            idPTP: row[0],
            idCiclo: row[1],
            fechaRegistro: row[2],
            asegurado: row[3],
            ruc: row[4],
            responsable: row[5],
            montoComprometido: row[6],
            moneda: row[7],
            fechaCompromiso: row[8],
            estado: row[9],
            fechaCumplimiento: row[10],
            montoPagado: row[11],
            observaciones: row[12],
            fechaActualizacion: row[13]
        };
    }
};

// ========== FUNCIONES API ==========

function registrarPTP_API(ptp) {
    return PTPService.registrarPTP(ptp);
}

function actualizarPTP_API(idPTP, update) {
    return PTPService.actualizarPTP(idPTP, update);
}

function marcarPTPCumplido_API(idPTP, montoPagado, observaciones) {
    return PTPService.marcarCumplido(idPTP, montoPagado, observaciones);
}

function marcarPTPIncumplido_API(idPTP, observaciones) {
    return PTPService.marcarIncumplido(idPTP, observaciones);
}

function getPTPsByAsegurado_API(asegurado) {
    return PTPService.getPTPsByAsegurado(asegurado);
}

function getPTPsPendientes_API() {
    return PTPService.getPTPsPendientes();
}

function getMetricasPTP_API(options) {
    return PTPService.getMetricasCumplimiento(options);
}
