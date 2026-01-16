/**
 * @fileoverview CollectionWorkflow - Fase 2 Core de Cobranzas
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * 
 * FEATURE FLAG: FEATURES.ENABLE_COLLECTION_WORKFLOW
 */

const CollectionWorkflow = {
    CYCLE_STATUS: {
        NUEVO: 'NUEVO',
        EN_GESTION: 'EN_GESTION',
        COMPROMISO_PAGO: 'COMPROMISO_PAGO',
        EN_SEGUIMIENTO: 'EN_SEGUIMIENTO',
        ESCALADO: 'ESCALADO',
        CERRADO_PAGADO: 'CERRADO_PAGADO',
        CERRADO_INCOBRABLE: 'CERRADO_INCOBRABLE'
    },

    CADENCE: {
        PRIMER_CONTACTO: 0,
        SEGUIMIENTO_1: 3,
        SEGUIMIENTO_2: 7,
        ESCALAMIENTO_SOFT: 14,
        ESCALAMIENTO_HARD: 21,
        CIERRE_FORZADO: 30
    },

    CHANNEL_PRIORITY: ['EMAIL', 'WHATSAPP', 'LLAMADA', 'REUNION'],

    getNextAction(idCiclo) {
        const context = 'CollectionWorkflow.getNextAction';
        if (!this._isEnabled()) return { ok: false, error: 'Feature disabled' };

        try {
            const ciclo = this._getCicloData(idCiclo);
            if (!ciclo) return { ok: false, error: 'Ciclo no encontrado' };

            const today = new Date();
            const diasDesdeInicio = this._daysBetween(ciclo.fechaInicio, today);
            const diasDesdeUltimaGestion = ciclo.ultimaGestion ?
                this._daysBetween(ciclo.ultimaGestion, today) : diasDesdeInicio;

            const recommendation = {
                ok: true, idCiclo, asegurado: ciclo.asegurado, estadoActual: ciclo.estado,
                diasEnCiclo: diasDesdeInicio, diasSinGestion: diasDesdeUltimaGestion,
                accionRecomendada: '', canalSugerido: '', urgencia: 'NORMAL', motivo: '', proximaFechaSugerida: null
            };

            if (ciclo.estado === this.CYCLE_STATUS.COMPROMISO_PAGO) {
                return this._getActionForPTP(ciclo, recommendation);
            }

            if (diasDesdeUltimaGestion >= this.CADENCE.CIERRE_FORZADO) {
                recommendation.accionRecomendada = 'EVALUAR_INCOBRABILIDAD';
                recommendation.urgencia = 'CRITICA';
                recommendation.motivo = `${diasDesdeUltimaGestion} días sin gestión. Evaluar incobrable.`;
                recommendation.canalSugerido = 'REUNION';
            } else if (diasDesdeUltimaGestion >= this.CADENCE.ESCALAMIENTO_HARD) {
                recommendation.accionRecomendada = 'ESCALAR_GERENCIA';
                recommendation.urgencia = 'CRITICA';
                recommendation.motivo = `Requiere intervención gerencial. ${diasDesdeUltimaGestion} días.`;
                recommendation.canalSugerido = 'REUNION';
            } else if (diasDesdeUltimaGestion >= this.CADENCE.ESCALAMIENTO_SOFT) {
                recommendation.accionRecomendada = 'ESCALAR_SUPERVISOR';
                recommendation.urgencia = 'ALTA';
                recommendation.motivo = `${diasDesdeUltimaGestion} días sin gestión.`;
                recommendation.canalSugerido = 'LLAMADA';
            } else if (diasDesdeUltimaGestion >= this.CADENCE.SEGUIMIENTO_2) {
                recommendation.accionRecomendada = 'SEGUIMIENTO_URGENTE';
                recommendation.urgencia = 'ALTA';
                recommendation.motivo = 'Segunda semana sin respuesta.';
                recommendation.canalSugerido = 'LLAMADA';
            } else if (diasDesdeUltimaGestion >= this.CADENCE.SEGUIMIENTO_1) {
                recommendation.accionRecomendada = 'SEGUIMIENTO_NORMAL';
                recommendation.urgencia = 'NORMAL';
                recommendation.motivo = 'Seguimiento programado.';
                recommendation.canalSugerido = 'WHATSAPP';
            } else {
                recommendation.accionRecomendada = 'ESPERAR';
                recommendation.urgencia = 'BAJA';
                recommendation.motivo = `Gestión reciente (${diasDesdeUltimaGestion} días).`;
                recommendation.proximaFechaSugerida = this._addDays(today, this.CADENCE.SEGUIMIENTO_1 - diasDesdeUltimaGestion);
            }
            return recommendation;
        } catch (error) {
            Logger.error(context, 'Error', error);
            return { ok: false, error: error.message };
        }
    },

    getWorkQueue(options = {}) {
        if (!this._isEnabled()) return { ok: false, error: 'Feature disabled' };
        try {
            const ciclos = this._getCiclosActivos();
            const queue = [];
            ciclos.forEach(ciclo => {
                if (options.responsable && ciclo.responsable !== options.responsable) return;
                const action = this.getNextAction(ciclo.idCiclo);
                if (action.ok && action.accionRecomendada !== 'ESPERAR') {
                    queue.push({ ...action, montoTotal: ciclo.montoTotal || 0 });
                }
            });
            const urgencyOrder = { CRITICA: 0, ALTA: 1, NORMAL: 2, BAJA: 3 };
            queue.sort((a, b) => urgencyOrder[a.urgencia] - urgencyOrder[b.urgencia]);
            const result = options.limit ? queue.slice(0, options.limit) : queue;
            return { ok: true, total: queue.length, items: result, timestamp: new Date().toISOString() };
        } catch (error) {
            return { ok: false, error: error.message };
        }
    },

    evaluateEscalation(idCiclo) {
        const action = this.getNextAction(idCiclo);
        if (!action.ok) return action;
        return {
            ok: true,
            shouldEscalate: ['ESCALAR_SUPERVISOR', 'ESCALAR_GERENCIA', 'EVALUAR_INCOBRABILIDAD'].includes(action.accionRecomendada),
            level: action.accionRecomendada.includes('GERENCIA') ? 'GERENCIA' :
                action.accionRecomendada.includes('SUPERVISOR') ? 'SUPERVISOR' : 'NONE',
            reason: action.motivo,
            diasSinGestion: action.diasSinGestion
        };
    },

    getWorkflowStats() {
        try {
            const ciclos = this._getCiclosActivos();
            const stats = {
                ok: true, timestamp: new Date().toISOString(), totalCiclos: ciclos.length,
                porEstado: {}, porUrgencia: { critica: 0, alta: 0, normal: 0, baja: 0 },
                requierenEscalamiento: 0, sinGestion7Dias: 0, conPTPActivo: 0
            };
            ciclos.forEach(ciclo => {
                stats.porEstado[ciclo.estado] = (stats.porEstado[ciclo.estado] || 0) + 1;
                const action = this.getNextAction(ciclo.idCiclo);
                if (action.ok) {
                    stats.porUrgencia[action.urgencia.toLowerCase()]++;
                    if (action.accionRecomendada.includes('ESCALAR')) stats.requierenEscalamiento++;
                    if (action.diasSinGestion >= 7) stats.sinGestion7Dias++;
                }
                if (ciclo.estado === this.CYCLE_STATUS.COMPROMISO_PAGO) stats.conPTPActivo++;
            });
            return stats;
        } catch (error) {
            return { ok: false, error: error.message };
        }
    },

    _isEnabled() { return getConfig('FEATURES.ENABLE_COLLECTION_WORKFLOW', true); },

    _getCicloData(idCiclo) {
        if (typeof BitacoraService === 'undefined') return null;
        try { return BitacoraService.getCiclosActivos().find(c => c.idCiclo === idCiclo); } catch (e) { return null; }
    },

    _getCiclosActivos() {
        if (typeof BitacoraService === 'undefined') return [];
        try { return BitacoraService.getCiclosActivos() || []; } catch (e) { return []; }
    },

    _getActionForPTP(ciclo, rec) {
        if (typeof PTPService !== 'undefined') {
            const ptps = PTPService.getPTPsByAsegurado(ciclo.asegurado);
            const ptp = ptps.find(p => p.estado === 'PENDIENTE');
            if (ptp) {
                const dias = this._daysBetween(new Date(), new Date(ptp.fechaCompromiso));
                if (dias < 0) { rec.accionRecomendada = 'VERIFICAR_PAGO_VENCIDO'; rec.urgencia = 'CRITICA'; rec.motivo = `Venció hace ${Math.abs(dias)} días.`; rec.canalSugerido = 'LLAMADA'; }
                else if (dias === 0) { rec.accionRecomendada = 'VERIFICAR_PAGO_HOY'; rec.urgencia = 'ALTA'; rec.motivo = 'Vence hoy.'; rec.canalSugerido = 'WHATSAPP'; }
                else if (dias <= 2) { rec.accionRecomendada = 'RECORDATORIO_PTP'; rec.urgencia = 'NORMAL'; rec.motivo = `Vence en ${dias} días.`; rec.canalSugerido = 'WHATSAPP'; }
                else { rec.accionRecomendada = 'ESPERAR_PTP'; rec.urgencia = 'BAJA'; rec.motivo = `Vigente. Vence en ${dias} días.`; }
                rec.ptpActivo = { id: ptp.idPTP, monto: ptp.montoComprometido, fechaCompromiso: ptp.fechaCompromiso };
            }
        }
        return rec;
    },

    _daysBetween(d1, d2) {
        const a = new Date(d1), b = new Date(d2);
        a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
        return Math.floor((b - a) / 86400000);
    },

    _addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
};

function getNextAction_API(idCiclo) { return CollectionWorkflow.getNextAction(idCiclo); }
function getWorkQueue_API(options) { return CollectionWorkflow.getWorkQueue(options || {}); }
function evaluateEscalation_API(idCiclo) { return CollectionWorkflow.evaluateEscalation(idCiclo); }
function getWorkflowStats_API() { return CollectionWorkflow.getWorkflowStats(); }
