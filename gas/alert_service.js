/**
 * @fileoverview AlertService - Fase 2 Core de Cobranzas
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * 
 * CARACTERÍSTICAS:
 * - Alertas por compromisos vencidos (PTP)
 * - Alertas por antigüedad de deuda (aging buckets)
 * - Escalamiento automático por días sin gestión
 * - Notificaciones a responsables
 * - Resumen diario de alertas
 * 
 * FEATURE FLAG: FEATURES.ENABLE_ALERT_SERVICE
 */

const AlertService = {
    // ========== CONFIGURACIÓN ==========
    CACHE_KEY: 'ALERTS_ACTIVE_V1',
    CACHE_TTL: 300, // 5 minutos

    // ========== TIPOS DE ALERTA ==========
    ALERT_TYPE: {
        PTP_VENCIDO: 'PTP_VENCIDO',           // Compromiso de pago vencido
        PTP_HOY: 'PTP_HOY',                   // Compromiso vence hoy
        PTP_PROXIMO: 'PTP_PROXIMO',           // Compromiso próximo (1-3 días)
        AGING_CRITICO: 'AGING_CRITICO',       // Deuda > 90 días
        AGING_ALTO: 'AGING_ALTO',             // Deuda 61-90 días
        SIN_GESTION: 'SIN_GESTION',           // Sin gestión > X días
        ESCALAMIENTO: 'ESCALAMIENTO',         // Requiere escalamiento
        MONTO_ALTO: 'MONTO_ALTO'              // Monto superior al umbral
    },

    // ========== SEVERIDAD ==========
    SEVERITY: {
        CRITICAL: 'CRITICAL',   // Rojo - Acción inmediata
        HIGH: 'HIGH',           // Naranja - Acción urgente
        MEDIUM: 'MEDIUM',       // Amarillo - Atención
        LOW: 'LOW',             // Verde - Informativo
        INFO: 'INFO'            // Gris - Solo información
    },

    // ========== API PRINCIPAL ==========

    /**
     * Obtiene todas las alertas activas del sistema
     * @param {Object} options - { forceRefresh, includeInfo, responsable }
     * @return {Object} { ok, alerts, summary, timestamp }
     */
    getActiveAlerts(options = {}) {
        const context = 'AlertService.getActiveAlerts';

        if (!this._isEnabled()) {
            return { ok: false, available: false, reason: 'Feature disabled' };
        }

        // Verificar cache
        if (!options.forceRefresh && typeof CacheHelper !== 'undefined') {
            const cached = CacheHelper.get(this.CACHE_KEY);
            if (cached) {
                cached.fromCache = true;
                // Filtrar por responsable si se especifica
                if (options.responsable) {
                    cached.alerts = cached.alerts.filter(a =>
                        !a.responsable || a.responsable === options.responsable
                    );
                }
                return cached;
            }
        }

        try {
            Logger.info(context, 'Generando alertas...');
            const startTime = Date.now();

            const result = {
                ok: true,
                timestamp: new Date().toISOString(),
                fromCache: false,
                alerts: [],
                summary: {
                    total: 0,
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0
                }
            };

            // 1. Alertas de PTP (compromisos)
            const ptpAlerts = this._generatePTPAlerts();
            result.alerts.push(...ptpAlerts);

            // 2. Alertas de Aging
            const agingAlerts = this._generateAgingAlerts();
            result.alerts.push(...agingAlerts);

            // 3. Alertas de Sin Gestión
            const sinGestionAlerts = this._generateSinGestionAlerts();
            result.alerts.push(...sinGestionAlerts);

            // Ordenar por severidad
            const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
            result.alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

            // Calcular summary
            result.summary.total = result.alerts.length;
            result.alerts.forEach(a => {
                switch (a.severity) {
                    case this.SEVERITY.CRITICAL: result.summary.critical++; break;
                    case this.SEVERITY.HIGH: result.summary.high++; break;
                    case this.SEVERITY.MEDIUM: result.summary.medium++; break;
                    case this.SEVERITY.LOW: result.summary.low++; break;
                }
            });

            result.calculationMs = Date.now() - startTime;

            // Filtrar INFO si no se solicita
            if (!options.includeInfo) {
                result.alerts = result.alerts.filter(a => a.severity !== this.SEVERITY.INFO);
            }

            // Guardar en cache
            if (typeof CacheHelper !== 'undefined') {
                CacheHelper.set(this.CACHE_KEY, result, this.CACHE_TTL);
            }

            // Filtrar por responsable si se especifica
            if (options.responsable) {
                result.alerts = result.alerts.filter(a =>
                    !a.responsable || a.responsable === options.responsable
                );
            }

            Logger.info(context, 'Alertas generadas', {
                total: result.summary.total,
                critical: result.summary.critical,
                ms: result.calculationMs
            });

            return result;

        } catch (error) {
            Logger.error(context, 'Error generando alertas', error);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Obtiene alertas por asegurado específico
     * @param {string} asegurado - Nombre del asegurado
     * @return {Array} Alertas del asegurado
     */
    getAlertsByAsegurado(asegurado) {
        const allAlerts = this.getActiveAlerts({ includeInfo: true });
        if (!allAlerts.ok) return [];

        return allAlerts.alerts.filter(a =>
            a.asegurado && a.asegurado.toLowerCase().includes(asegurado.toLowerCase())
        );
    },

    /**
     * Obtiene resumen de alertas para dashboard
     * @return {Object} Resumen ejecutivo
     */
    getAlertSummary() {
        const alerts = this.getActiveAlerts();
        if (!alerts.ok) return alerts;

        return {
            ok: true,
            summary: alerts.summary,
            topCritical: alerts.alerts.filter(a => a.severity === this.SEVERITY.CRITICAL).slice(0, 5),
            timestamp: alerts.timestamp
        };
    },

    /**
     * Invalida cache de alertas
     */
    invalidateCache() {
        if (typeof CacheHelper !== 'undefined') {
            CacheHelper.remove(this.CACHE_KEY);
        }
        Logger.info('AlertService.invalidateCache', 'Cache invalidado');
    },

    // ========== GENERADORES DE ALERTAS ==========

    /**
     * Genera alertas de PTP (Promise to Pay)
     * @private
     */
    _generatePTPAlerts() {
        const context = 'AlertService._generatePTPAlerts';
        const alerts = [];

        try {
            // Obtener compromisos activos de bitácora
            if (typeof BitacoraService === 'undefined') {
                Logger.warn(context, 'BitacoraService no disponible');
                return alerts;
            }

            const compromisos = BitacoraService.obtenerCompromisosActivos();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            compromisos.forEach(c => {
                if (!c.fechaCompromiso) return;

                const fechaComp = new Date(c.fechaCompromiso);
                fechaComp.setHours(0, 0, 0, 0);
                const diasDiff = Math.floor((fechaComp - today) / (1000 * 60 * 60 * 24));

                let alertType, severity, titulo, mensaje;

                if (diasDiff < 0) {
                    // Vencido
                    alertType = this.ALERT_TYPE.PTP_VENCIDO;
                    severity = this.SEVERITY.CRITICAL;
                    titulo = `Compromiso VENCIDO: ${c.asegurado}`;
                    mensaje = `Venció hace ${Math.abs(diasDiff)} día(s). Monto comprometido pendiente de cobro.`;
                } else if (diasDiff === 0) {
                    // Vence hoy
                    alertType = this.ALERT_TYPE.PTP_HOY;
                    severity = this.SEVERITY.HIGH;
                    titulo = `Compromiso vence HOY: ${c.asegurado}`;
                    mensaje = 'Verificar pago o contactar al cliente.';
                } else if (diasDiff <= 3) {
                    // Próximo
                    alertType = this.ALERT_TYPE.PTP_PROXIMO;
                    severity = this.SEVERITY.MEDIUM;
                    titulo = `Compromiso próximo: ${c.asegurado}`;
                    mensaje = `Vence en ${diasDiff} día(s). Preparar seguimiento.`;
                } else {
                    // No generar alerta si > 3 días
                    return;
                }

                alerts.push({
                    id: `PTP_${c.idCiclo || c.ruc}_${Date.now()}`,
                    type: alertType,
                    severity: severity,
                    titulo: titulo,
                    mensaje: mensaje,
                    asegurado: c.asegurado,
                    ruc: c.ruc || '',
                    responsable: c.responsable || '',
                    fechaCompromiso: fechaComp.toISOString(),
                    diasVencimiento: diasDiff,
                    idCiclo: c.idCiclo || '',
                    acciones: [
                        { id: 'ver_bitacora', label: 'Ver Bitácora' },
                        { id: 'registrar_gestion', label: 'Registrar Gestión' }
                    ],
                    createdAt: new Date().toISOString()
                });
            });

        } catch (error) {
            Logger.error(context, 'Error generando alertas PTP', error);
        }

        return alerts;
    },

    /**
     * Genera alertas de Aging (antigüedad de deuda)
     * @private
     */
    _generateAgingAlerts() {
        const context = 'AlertService._generateAgingAlerts';
        const alerts = [];

        try {
            // Usar KPIService si está disponible
            if (typeof KPIService === 'undefined') {
                Logger.warn(context, 'KPIService no disponible');
                return alerts;
            }

            const kpis = KPIService.getDashboardKPIs();
            if (!kpis.ok || !kpis.available) return alerts;

            // Alertas por bucket de aging crítico (90+)
            const bucket90 = kpis.aging.buckets.find(b => b.id === 'BUCKET_90_PLUS');
            if (bucket90 && bucket90.count > 0) {
                const umbralCritico = getConfig('ALERTS.AGING_CRITICO_THRESHOLD', 5);

                if (bucket90.percentage > umbralCritico) {
                    alerts.push({
                        id: `AGING_CRITICO_${Date.now()}`,
                        type: this.ALERT_TYPE.AGING_CRITICO,
                        severity: this.SEVERITY.CRITICAL,
                        titulo: `Cartera crítica: ${bucket90.percentage}% en 90+ días`,
                        mensaje: `${bucket90.count} registros con más de 90 días de antigüedad. Requiere acción inmediata.`,
                        count: bucket90.count,
                        percentage: bucket90.percentage,
                        amount: bucket90.amount,
                        acciones: [
                            { id: 'ver_detalle', label: 'Ver Detalle' },
                            { id: 'exportar', label: 'Exportar Lista' }
                        ],
                        createdAt: new Date().toISOString()
                    });
                }
            }

            // Alertas por bucket alto (61-90)
            const bucket6190 = kpis.aging.buckets.find(b => b.id === 'BUCKET_61_90');
            if (bucket6190 && bucket6190.count > 0) {
                const umbralAlto = getConfig('ALERTS.AGING_ALTO_THRESHOLD', 10);

                if (bucket6190.percentage > umbralAlto) {
                    alerts.push({
                        id: `AGING_ALTO_${Date.now()}`,
                        type: this.ALERT_TYPE.AGING_ALTO,
                        severity: this.SEVERITY.HIGH,
                        titulo: `Cartera en riesgo: ${bucket6190.percentage}% en 61-90 días`,
                        mensaje: `${bucket6190.count} registros próximos a volverse críticos.`,
                        count: bucket6190.count,
                        percentage: bucket6190.percentage,
                        amount: bucket6190.amount,
                        acciones: [
                            { id: 'ver_detalle', label: 'Ver Detalle' }
                        ],
                        createdAt: new Date().toISOString()
                    });
                }
            }

        } catch (error) {
            Logger.error(context, 'Error generando alertas aging', error);
        }

        return alerts;
    },

    /**
     * Genera alertas de clientes sin gestión reciente
     * @private
     */
    _generateSinGestionAlerts() {
        const context = 'AlertService._generateSinGestionAlerts';
        const alerts = [];

        try {
            if (typeof BitacoraService === 'undefined') {
                return alerts;
            }

            const diasUmbral = getConfig('ALERTS.SIN_GESTION_DIAS', 7);
            const ciclosActivos = BitacoraService.getCiclosActivos();
            const today = new Date();

            ciclosActivos.forEach(ciclo => {
                if (!ciclo.ultimaGestion) return;

                const ultimaGestion = new Date(ciclo.ultimaGestion);
                const diasSinGestion = Math.floor((today - ultimaGestion) / (1000 * 60 * 60 * 24));

                if (diasSinGestion >= diasUmbral) {
                    let severity = this.SEVERITY.MEDIUM;
                    if (diasSinGestion >= diasUmbral * 2) {
                        severity = this.SEVERITY.HIGH;
                    }
                    if (diasSinGestion >= diasUmbral * 3) {
                        severity = this.SEVERITY.CRITICAL;
                    }

                    alerts.push({
                        id: `SIN_GESTION_${ciclo.idCiclo}_${Date.now()}`,
                        type: this.ALERT_TYPE.SIN_GESTION,
                        severity: severity,
                        titulo: `Sin gestión: ${ciclo.asegurado}`,
                        mensaje: `${diasSinGestion} días sin gestión. Última: ${ultimaGestion.toLocaleDateString('es-PE')}`,
                        asegurado: ciclo.asegurado,
                        ruc: ciclo.ruc || '',
                        responsable: ciclo.responsable || '',
                        diasSinGestion: diasSinGestion,
                        ultimaGestion: ultimaGestion.toISOString(),
                        idCiclo: ciclo.idCiclo,
                        acciones: [
                            { id: 'registrar_gestion', label: 'Registrar Gestión' }
                        ],
                        createdAt: new Date().toISOString()
                    });
                }
            });

        } catch (error) {
            Logger.error(context, 'Error generando alertas sin gestión', error);
        }

        return alerts;
    },

    // ========== MÉTODOS PRIVADOS ==========

    _isEnabled() {
        return getConfig('FEATURES.ENABLE_ALERT_SERVICE', true);
    }
};

// ========== FUNCIONES API ==========

/**
 * API: Obtener alertas activas
 */
function getActiveAlerts_API(options) {
    return AlertService.getActiveAlerts(options || {});
}

/**
 * API: Obtener resumen de alertas
 */
function getAlertSummary_API() {
    return AlertService.getAlertSummary();
}

/**
 * API: Obtener alertas por asegurado
 */
function getAlertsByAsegurado_API(asegurado) {
    return AlertService.getAlertsByAsegurado(asegurado);
}

/**
 * API: Invalidar cache de alertas
 */
function invalidateAlertCache_API() {
    AlertService.invalidateCache();
    return { ok: true };
}
