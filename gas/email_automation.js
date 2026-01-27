/**
 * @fileoverview EmailAutomation - Fase 3 Automatización (v2.0 PRO)
 * @version 2.0.0
 * @author Portal Cobranzas Team
 * @lastModified 2026-01-27
 * 
 * FEATURE FLAG: FEATURES.ENABLE_EMAIL_AUTOMATION
 * 
 * v2.0: Templates Premium con EmailTemplateKit
 * - Email diario con scoreboard ejecutivo, deltas, prioridades, riesgos
 * - Diseño responsive para Gmail/Outlook
 * - Componentes reutilizables
 */

const EmailAutomation = {
    FROM_NAME: 'Portal de Cobranzas',
    TEMPLATES: { 
        PTP_REMINDER: 'ptp_reminder', 
        AGING_ALERT: 'aging_alert', 
        ESCALATION: 'escalation', 
        DAILY_SUMMARY: 'daily_summary', 
        WEEKLY_REPORT: 'weekly_report' 
    },

    // ==================== MÉTODOS PÚBLICOS ====================

    sendPTPReminders() {
        const context = 'EmailAutomation.sendPTPReminders';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            Logger.info(context, 'Iniciando envío de recordatorios PTP...');
            const results = { ok: true, sent: 0, errors: [] };

            if (typeof PTPService === 'undefined') return { ok: false, error: 'PTPService no disponible' };

            const ptpsPendientes = PTPService.getPTPsPendientes();
            const ptpsProximos = ptpsPendientes.filter(p => p.diasRestantes >= 0 && p.diasRestantes <= 3);

            if (ptpsProximos.length === 0) {
                Logger.info(context, 'No hay PTPs próximos a vencer');
                return { ok: true, sent: 0, message: 'No hay recordatorios pendientes' };
            }

            const porResponsable = this._groupBy(ptpsProximos, 'responsable');

            for (const [responsable, ptps] of Object.entries(porResponsable)) {
                if (!responsable || !this._isValidEmail(responsable)) continue;
                try {
                    const html = this._buildPTPReminderEmailPro(ptps);
                    MailApp.sendEmail({ 
                        to: responsable, 
                        subject: `[RECORDATORIO] ${ptps.length} compromiso(s) de pago próximos`, 
                        htmlBody: html, 
                        name: this.FROM_NAME, 
                        replyTo: this._getReplyTo() 
                    });
                    results.sent++;
                    Logger.info(context, `Email enviado a ${responsable}`, { ptps: ptps.length });
                } catch (emailError) {
                    results.errors.push({ responsable, error: emailError.message });
                    Logger.error(context, `Error enviando a ${responsable}`, emailError);
                }
            }

            results.ok = results.errors.length === 0;
            return results;
        } catch (error) {
            Logger.error(context, 'Error en envío de recordatorios', error);
            return { ok: false, error: error.message };
        }
    },

    sendAgingAlerts() {
        const context = 'EmailAutomation.sendAgingAlerts';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const admins = this._getAdminEmails();
            if (admins.length === 0) return { ok: true, sent: 0, message: 'No hay administradores configurados' };

            if (typeof AlertService === 'undefined') return { ok: false, error: 'AlertService no disponible' };

            const alerts = AlertService.getActiveAlerts({ forceRefresh: true });
            if (!alerts.ok) return { ok: false, error: 'Error obteniendo alertas' };

            const criticalAlerts = alerts.alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
            if (criticalAlerts.length === 0) return { ok: true, sent: 0, message: 'No hay alertas críticas' };

            const html = this._buildAgingAlertEmailPro(criticalAlerts, alerts.summary);
            let sent = 0;
            for (const admin of admins) {
                try { 
                    MailApp.sendEmail({ 
                        to: admin, 
                        subject: `[ALERTA] ${criticalAlerts.length} alerta(s) crítica(s)`, 
                        htmlBody: html, 
                        name: this.FROM_NAME 
                    }); 
                    sent++; 
                }
                catch (e) { Logger.error(context, `Error enviando a ${admin}`, e); }
            }
            return { ok: true, sent };
        } catch (error) {
            Logger.error(context, 'Error en alertas de aging', error);
            return { ok: false, error: error.message };
        }
    },

    sendEscalationNotification(escalations) {
        const context = 'EmailAutomation.sendEscalationNotification';
        if (!this._isEnabled() || !escalations || escalations.length === 0) return { ok: true, sent: 0 };

        try {
            const admins = this._getAdminEmails();
            if (admins.length === 0) return { ok: true, sent: 0, message: 'No hay administradores' };

            const html = this._buildEscalationEmailPro(escalations);
            let sent = 0;
            for (const admin of admins) {
                try { 
                    MailApp.sendEmail({ 
                        to: admin, 
                        subject: `[ESCALAMIENTO] ${escalations.length} caso(s) urgentes`, 
                        htmlBody: html, 
                        name: this.FROM_NAME 
                    }); 
                    sent++; 
                }
                catch (e) { Logger.error(context, `Error enviando a ${admin}`, e); }
            }
            return { ok: true, sent };
        } catch (error) {
            Logger.error(context, 'Error en escalamiento', error);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Envía email de resumen diario PRO
     * @param {Object} summaryData - Datos del resumen (de ReportScheduler)
     * @return {Object} { ok, sent, html }
     */
    sendDailySummaryEmail(summaryData) {
        const context = 'EmailAutomation.sendDailySummaryEmail';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const admins = this._getAdminEmails();
            if (admins.length === 0) return { ok: true, sent: 0, message: 'No hay administradores' };

            // Enriquecer datos con información adicional
            const enrichedData = this._enrichDailyData(summaryData);
            
            // Construir HTML con template premium
            const html = this._buildDailySummaryEmailPro(enrichedData);
            
            const fecha = new Date().toLocaleDateString('es-PE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            let sent = 0;
            for (const admin of admins) {
                try { 
                    MailApp.sendEmail({ 
                        to: admin, 
                        subject: `[RESUMEN DIARIO] Cobranzas - ${fecha}`, 
                        htmlBody: html, 
                        name: this.FROM_NAME 
                    }); 
                    sent++; 
                }
                catch (e) { Logger.error(context, `Error enviando a ${admin}`, e); }
            }
            
            return { ok: true, sent, htmlSize: html.length };
        } catch (error) {
            Logger.error(context, 'Error en resumen diario', error);
            return { ok: false, error: error.message };
        }
    },

    // ==================== ENRIQUECIMIENTO DE DATOS ====================

    /**
     * Enriquece los datos diarios con información adicional para el email PRO
     */
    _enrichDailyData(baseData) {
        const data = { ...baseData };
        const context = 'EmailAutomation._enrichDailyData';

        // Obtener datos del día anterior para deltas
        data.yesterday = this._getYesterdayData();

        // Obtener KPIs completos
        if (typeof KPIService !== 'undefined') {
            try {
                const kpis = KPIService.getDashboardKPIs();
                if (kpis.ok && kpis.available) {
                    data.kpis = kpis;
                    data.dso = kpis.dso.value;
                    data.dsoBenchmark = kpis.dso.benchmark;
                    data.dsoTrend = kpis.dso.trend;
                    data.dsoStatus = kpis.dso.status;
                    data.porcentajeVencido = kpis.summary.porcentajeVencido;
                    data.totalMonto = kpis.summary.totalMonto;
                    data.totalVencido = kpis.summary.totalVencido;
                    data.agingBuckets = kpis.aging.buckets;
                    data.bucket90 = kpis.aging.buckets.find(b => b.id === 'BUCKET_90_PLUS') || {};
                    data.bucket6190 = kpis.aging.buckets.find(b => b.id === 'BUCKET_61_90') || {};
                    data.byCompany = kpis.byCompany;
                }
            } catch (e) { 
                Logger.warn(context, 'Error obteniendo KPIs', e); 
            }
        }

        // Obtener PTPs/Compromisos próximos y vencidos
        // Primero intentar PTPService, si no tiene datos usar BitacoraService
        let ptpsObtenidos = false;
        if (typeof PTPService !== 'undefined') {
            try {
                const ptps = PTPService.getPTPsPendientes();
                if (ptps && ptps.length > 0) {
                    data.ptpsPendientes = ptps.length;
                    data.ptpsVencidos = ptps.filter(p => p.vencido).length;
                    data.ptpsProximos = ptps.filter(p => !p.vencido && p.diasRestantes <= 3);
                    data.ptpsHoy = ptps.filter(p => p.diasRestantes === 0);
                    data.topPtpsProximos = ptps.filter(p => p.diasRestantes <= 3).slice(0, 10);
                    ptpsObtenidos = true;
                }
            } catch (e) { 
                Logger.warn(context, 'Error obteniendo PTPs de PTPService', e); 
            }
        }
        
        // Fallback: usar compromisos de BitacoraService
        if (!ptpsObtenidos && typeof BitacoraService !== 'undefined') {
            try {
                const compromisos = BitacoraService.obtenerCompromisosActivos();
                if (compromisos && compromisos.length > 0) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const ptpsFromBitacora = compromisos.map(c => {
                        const fechaComp = c.fechaCompromiso ? new Date(c.fechaCompromiso) : null;
                        const diasRestantes = fechaComp ? Math.floor((fechaComp - today) / (1000 * 60 * 60 * 24)) : 999;
                        return {
                            asegurado: c.asegurado,
                            ruc: c.ruc,
                            fechaCompromiso: c.fechaCompromiso,
                            montoComprometido: c.snapshotVencidoPEN || 0,
                            moneda: 'PEN',
                            responsable: c.responsable,
                            estado: c.estadoGestion,
                            diasRestantes: diasRestantes,
                            vencido: diasRestantes < 0
                        };
                    });
                    
                    data.ptpsPendientes = ptpsFromBitacora.length;
                    data.ptpsVencidos = ptpsFromBitacora.filter(p => p.vencido).length;
                    data.ptpsProximos = ptpsFromBitacora.filter(p => !p.vencido && p.diasRestantes <= 3);
                    data.ptpsHoy = ptpsFromBitacora.filter(p => p.diasRestantes === 0);
                    data.topPtpsProximos = ptpsFromBitacora
                        .filter(p => p.diasRestantes <= 7)
                        .sort((a, b) => a.diasRestantes - b.diasRestantes)
                        .slice(0, 10);
                    
                    Logger.info(context, 'PTPs obtenidos de BitacoraService', { 
                        total: data.ptpsPendientes, 
                        vencidos: data.ptpsVencidos 
                    });
                }
            } catch (e) { 
                Logger.warn(context, 'Error obteniendo compromisos de BitacoraService', e); 
            }
        }

        // Obtener alertas detalladas
        if (typeof AlertService !== 'undefined') {
            try {
                const alertsResult = AlertService.getActiveAlerts({ forceRefresh: true });
                if (alertsResult.ok) {
                    data.alertasCriticas = alertsResult.summary.critical;
                    data.alertasAltas = alertsResult.summary.high;
                    data.alertasMedium = alertsResult.summary.medium;
                    data.totalAlertas = alertsResult.summary.total;
                    // Top 5 alertas críticas para mostrar
                    data.topAlertas = alertsResult.alerts
                        .filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH')
                        .slice(0, 5);
                }
            } catch (e) { 
                Logger.warn(context, 'Error obteniendo alertas', e); 
            }
        }

        // Determinar estado del día
        data.dayStatus = this._determineDayStatus(data);

        // Generar prioridades automáticas
        data.priorities = this._generateDailyPriorities(data);

        // Generar lista de cuentas en riesgo
        data.riskAccounts = this._generateRiskAccounts(data);

        return data;
    },

    /**
     * Obtiene datos del día anterior del histórico
     */
    _getYesterdayData() {
        try {
            if (typeof ReportScheduler === 'undefined') return null;
            
            const history = ReportScheduler.getReportHistory({ tipo: 'daily', limit: 2 });
            if (history && history.length >= 2) {
                // El más reciente es el de hoy (en proceso), el segundo es ayer
                return history[1];
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Determina el estado general del día (OK/WARN/CRITICAL)
     */
    _determineDayStatus(data) {
        // Reglas de severidad
        const criticalConditions = [
            (data.alertasCriticas || 0) > 0,
            (data.ptpsVencidos || 0) > 3,
            (data.bucket90?.percentage || 0) > getConfig('KPI.BUCKET_90_CRITICAL', 10),
            (data.porcentajeVencido || 0) > getConfig('KPI.VENCIDO_THRESHOLD_ERROR', 25)
        ];

        const warnConditions = [
            (data.alertasAltas || 0) > 2,
            (data.ptpsVencidos || 0) > 0,
            (data.bucket90?.percentage || 0) > getConfig('KPI.BUCKET_90_WARN', 5),
            (data.porcentajeVencido || 0) > getConfig('KPI.VENCIDO_THRESHOLD_WARN', 15),
            (data.dso || 0) > (data.dsoBenchmark || 35) + 5
        ];

        if (criticalConditions.some(c => c)) return 'CRITICAL';
        if (warnConditions.some(c => c)) return 'WARN';
        return 'OK';
    },

    /**
     * Genera las top 3 prioridades del día basadas en data
     */
    _generateDailyPriorities(data) {
        const priorities = [];

        // Prioridad 1: PTPs vencidos
        if ((data.ptpsVencidos || 0) > 0) {
            priorities.push({
                title: `Resolver ${data.ptpsVencidos} PTP(s) vencido(s)`,
                description: 'Contactar clientes con compromisos incumplidos',
                severity: 'CRITICAL',
                badge: 'URGENTE'
            });
        }

        // Prioridad 2: Alertas críticas
        if ((data.alertasCriticas || 0) > 0) {
            priorities.push({
                title: `Atender ${data.alertasCriticas} alerta(s) crítica(s)`,
                description: 'Revisar casos en estado crítico que requieren acción inmediata',
                severity: 'CRITICAL',
                badge: 'CRÍTICO'
            });
        }

        // Prioridad 3: PTPs que vencen hoy
        if (data.ptpsHoy && data.ptpsHoy.length > 0) {
            priorities.push({
                title: `Verificar ${data.ptpsHoy.length} PTP(s) que vencen HOY`,
                description: 'Confirmar pagos o contactar para seguimiento',
                severity: 'WARN',
                badge: 'HOY'
            });
        }

        // Prioridad 4: Cuentas 61-90 días
        if ((data.bucket6190?.count || 0) > 0) {
            priorities.push({
                title: `Gestionar ${data.bucket6190.count} cuenta(s) en 61-90 días`,
                description: 'Evitar que pasen a bucket crítico (90+)',
                severity: 'WARN',
                badge: 'PREVENTIVO'
            });
        }

        // Prioridad 5: PTPs próximos
        if (data.ptpsProximos && data.ptpsProximos.length > 0) {
            priorities.push({
                title: `Dar seguimiento a ${data.ptpsProximos.length} PTP(s) próximos`,
                description: 'Recordar a clientes sus compromisos en los próximos 3 días',
                severity: 'INFO',
                badge: 'SEGUIMIENTO'
            });
        }

        // Retornar máximo 3
        return priorities.slice(0, 3);
    },

    /**
     * Genera lista de cuentas en riesgo para el email
     */
    _generateRiskAccounts(data) {
        const accounts = [];

        // Agregar de alertas críticas
        if (data.topAlertas) {
            data.topAlertas.forEach(alert => {
                if (alert.asegurado) {
                    accounts.push({
                        asegurado: alert.asegurado,
                        bucket: alert.type === 'AGING_CRITICO' ? '90+ días' : 
                               alert.type === 'AGING_ALTO' ? '61-90 días' : 
                               alert.type === 'SIN_GESTION' ? 'Sin gestión' : '',
                        dias: alert.diasVencimiento || alert.diasSinGestion || 0,
                        monto: alert.amount || 0,
                        moneda: 'PEN',
                        responsable: alert.responsable || '',
                        accionSugerida: this._suggestAction(alert),
                        severity: alert.severity === 'CRITICAL' ? 'CRITICAL' : 'WARN'
                    });
                }
            });
        }

        // Agregar de PTPs vencidos
        if (data.topPtpsProximos) {
            data.topPtpsProximos
                .filter(p => p.vencido)
                .slice(0, 3)
                .forEach(ptp => {
                    if (!accounts.find(a => a.asegurado === ptp.asegurado)) {
                        accounts.push({
                            asegurado: ptp.asegurado,
                            bucket: 'PTP Vencido',
                            dias: Math.abs(ptp.diasRestantes),
                            monto: ptp.montoComprometido,
                            moneda: ptp.moneda || 'PEN',
                            responsable: ptp.responsable || '',
                            accionSugerida: 'Contactar inmediatamente para regularizar compromiso',
                            severity: 'CRITICAL'
                        });
                    }
                });
        }

        return accounts.slice(0, 5);
    },

    /**
     * Sugiere acción basada en tipo de alerta
     */
    _suggestAction(alert) {
        const actions = {
            'PTP_VENCIDO': 'Contactar inmediatamente y reprogramar compromiso',
            'PTP_HOY': 'Verificar pago o contactar para confirmar',
            'PTP_PROXIMO': 'Enviar recordatorio de compromiso',
            'AGING_CRITICO': 'Escalar a gerencia y definir plan de recuperación',
            'AGING_ALTO': 'Intensificar gestión antes de pasar a crítico',
            'SIN_GESTION': 'Retomar contacto y registrar gestión',
            'ESCALAMIENTO': 'Revisar caso con supervisor'
        };
        return actions[alert.type] || 'Revisar y tomar acción apropiada';
    },

    // ==================== BUILDERS DE EMAIL PRO ====================

    /**
     * Construye email de resumen diario PRO
     */
    _buildDailySummaryEmailPro(data) {
        const kit = typeof EmailTemplateKit !== 'undefined' ? EmailTemplateKit : getEmailTemplateKit();
        
        // Construir scoreboard de KPIs
        const kpis = this._buildDailyKPICards(data, kit);
        const scoreboardHtml = kit.kpiGrid(kpis, 3);

        // Sección de prioridades
        const prioritiesHtml = data.priorities && data.priorities.length > 0
            ? kit.priorityList(data.priorities, 'Top Prioridades de Hoy', '🎯')
            : '';

        // Sección de cuentas en riesgo
        const riskAccountsHtml = data.riskAccounts && data.riskAccounts.length > 0
            ? kit.riskAccountList(data.riskAccounts, 'Cuentas que Requieren Atención', '⚠️')
            : '';

        // Sección de PTPs próximos
        const ptpsHtml = data.topPtpsProximos && data.topPtpsProximos.length > 0
            ? kit.ptpList(data.topPtpsProximos.slice(0, 8), 'Próximos Vencimientos (72h)', '📅')
            : '';

        // CTAs
        const portalUrl = getConfig('PORTAL.BASE_URL', '');
        const ctasHtml = portalUrl ? kit.ctaGroup([
            { text: 'Abrir Portal de Cobranzas', url: portalUrl + getConfig('PORTAL.ROUTES.DASHBOARD', ''), options: { primary: true, icon: '🚀' } },
            { text: 'Ver Alertas', url: portalUrl + getConfig('PORTAL.ROUTES.ALERTAS', '/alertas'), options: { primary: false, icon: '⚠️' } }
        ], 'center') : '';

        // Ensamblar contenido
        const contentHtml = `
            ${scoreboardHtml}
            ${kit.divider('24px')}
            ${prioritiesHtml}
            ${riskAccountsHtml}
            ${ptpsHtml}
            ${ctasHtml}
        `;

        // Preheader para Gmail
        const preheader = this._buildDailyPreheader(data);

        return kit.buildLayout({
            title: '📊 Resumen Diario de Cobranzas',
            subtitle: kit.formatDateLong(new Date()),
            statusBadge: kit.dayStatusBadge(data.dayStatus || 'OK'),
            contentHtml: contentHtml,
            preheader: preheader
        });
    },

    /**
     * Construye las tarjetas de KPIs para el email diario
     */
    _buildDailyKPICards(data, kit) {
        const yesterday = data.yesterday || {};
        const kpis = [];

        // 1. Gestiones Hoy
        kpis.push({
            label: 'Gestiones Hoy',
            value: kit.formatInt(data.gestionesHoy || 0),
            delta: kit.getDeltaDisplay(data.gestionesHoy || 0, yesterday.Gestiones, { invertColors: true }),
            severity: (data.gestionesHoy || 0) > 0 ? 'OK' : 'NEUTRAL',
            icon: '📊'
        });

        // 2. PTPs Pendientes
        const ptpSeverity = (data.ptpsVencidos || 0) > 0 ? 'CRITICAL' : 
                           (data.ptpsPendientes || 0) > 5 ? 'WARN' : 'INFO';
        kpis.push({
            label: 'PTPs Pendientes',
            value: kit.formatInt(data.ptpsPendientes || 0),
            delta: data.ptpsVencidos > 0 ? `<span style="color:#C62828;font-size:11px;">${data.ptpsVencidos} vencido(s)</span>` : '',
            severity: ptpSeverity,
            icon: '📋'
        });

        // 3. Alertas Críticas
        const alertSeverity = (data.alertasCriticas || 0) > 0 ? 'CRITICAL' :
                             (data.alertasAltas || 0) > 0 ? 'WARN' : 'OK';
        kpis.push({
            label: 'Alertas Críticas',
            value: kit.formatInt(data.alertasCriticas || 0),
            delta: data.alertasAltas > 0 ? `<span style="color:#E65100;font-size:11px;">+${data.alertasAltas} altas</span>` : '',
            severity: alertSeverity,
            icon: '⚠️'
        });

        // 4. DSO
        const dsoBenchmark = data.dsoBenchmark || getConfig('KPI.DSO_BENCHMARK', 35);
        const dsoSeverity = (data.dso || 0) > dsoBenchmark + 10 ? 'CRITICAL' :
                          (data.dso || 0) > dsoBenchmark ? 'WARN' : 'OK';
        kpis.push({
            label: 'DSO',
            value: `${data.dso || 0} días`,
            severity: dsoSeverity,
            benchmark: `Meta: ${dsoBenchmark}d`,
            trend: data.dsoTrend || 'stable',
            icon: '📈'
        });

        // 5. % Cartera Vencida
        const vencidoWarn = getConfig('KPI.VENCIDO_THRESHOLD_WARN', 15);
        const vencidoError = getConfig('KPI.VENCIDO_THRESHOLD_ERROR', 25);
        const vencidoSeverity = (data.porcentajeVencido || 0) > vencidoError ? 'CRITICAL' :
                               (data.porcentajeVencido || 0) > vencidoWarn ? 'WARN' : 'OK';
        kpis.push({
            label: '% Cartera Vencida',
            value: kit.formatPct(data.porcentajeVencido || 0),
            delta: kit.getDeltaDisplay(data.porcentajeVencido || 0, yesterday['% Vencido'], { format: 'pct' }),
            severity: vencidoSeverity,
            icon: '💰'
        });

        // 6. Bucket 90+ días
        const bucket90Warn = getConfig('KPI.BUCKET_90_WARN', 5);
        const bucket90Critical = getConfig('KPI.BUCKET_90_CRITICAL', 10);
        const bucket90Pct = data.bucket90?.percentage || 0;
        const bucket90Severity = bucket90Pct > bucket90Critical ? 'CRITICAL' :
                                bucket90Pct > bucket90Warn ? 'WARN' : 'OK';
        kpis.push({
            label: 'Bucket 90+ días',
            value: kit.formatInt(data.bucket90?.count || 0),
            delta: `<span style="font-size:11px;color:#757575;">${kit.formatPct(bucket90Pct)}</span>`,
            severity: bucket90Severity,
            icon: '🔴'
        });

        return kpis;
    },

    /**
     * Construye el preheader para Gmail
     */
    _buildDailyPreheader(data) {
        const parts = [];
        if (data.gestionesHoy) parts.push(`${data.gestionesHoy} gestiones`);
        if (data.ptpsPendientes) parts.push(`${data.ptpsPendientes} PTPs`);
        if (data.alertasCriticas) parts.push(`${data.alertasCriticas} alertas críticas`);
        if (data.dso) parts.push(`DSO: ${data.dso}d`);
        return parts.join(' · ') || 'Resumen ejecutivo del día';
    },

    /**
     * Construye email de recordatorio PTP PRO
     */
    _buildPTPReminderEmailPro(ptps) {
        const kit = typeof EmailTemplateKit !== 'undefined' ? EmailTemplateKit : getEmailTemplateKit();
        
        // Contar por estado
        const hoy = ptps.filter(p => p.diasRestantes === 0).length;
        const proximos = ptps.filter(p => p.diasRestantes > 0).length;
        const vencidos = ptps.filter(p => p.diasRestantes < 0).length;

        // KPIs de resumen
        const kpis = [];
        if (vencidos > 0) {
            kpis.push({ label: 'Vencidos', value: vencidos.toString(), severity: 'CRITICAL', icon: '🔴' });
        }
        if (hoy > 0) {
            kpis.push({ label: 'Vencen Hoy', value: hoy.toString(), severity: 'WARN', icon: '⚡' });
        }
        if (proximos > 0) {
            kpis.push({ label: 'Próximos', value: proximos.toString(), severity: 'INFO', icon: '📅' });
        }

        const scoreboardHtml = kpis.length > 0 ? kit.kpiGrid(kpis, kpis.length) : '';

        // Lista de PTPs
        let ptpListHtml = '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">';
        ptps.forEach(p => {
            ptpListHtml += kit.ptpCard(p);
        });
        ptpListHtml += '</table>';

        const contentHtml = `
            ${scoreboardHtml}
            ${kit.sectionTitle('Compromisos Pendientes', '📋', 'Requieren tu atención')}
            ${ptpListHtml}
        `;

        return kit.buildLayout({
            brandColor: '#FF6F00',
            brandColorDark: '#E65100',
            title: '📋 Recordatorio de Compromisos de Pago',
            subtitle: `${ptps.length} compromiso(s) requieren atención`,
            contentHtml: contentHtml,
            preheader: `Tienes ${ptps.length} PTP(s) pendientes: ${hoy} hoy, ${proximos} próximos`
        });
    },

    /**
     * Construye email de alertas de aging PRO
     */
    _buildAgingAlertEmailPro(alerts, summary) {
        const kit = typeof EmailTemplateKit !== 'undefined' ? EmailTemplateKit : getEmailTemplateKit();
        
        // KPIs de resumen
        const kpis = [
            { label: 'Críticas', value: summary.critical.toString(), severity: 'CRITICAL', icon: '🔴' },
            { label: 'Altas', value: summary.high.toString(), severity: 'WARN', icon: '🟠' },
            { label: 'Total', value: summary.total.toString(), severity: 'NEUTRAL', icon: '📊' }
        ];

        const scoreboardHtml = kit.kpiGrid(kpis, 3);

        // Tabla de alertas
        const headers = [
            { label: 'Severidad', align: 'center', width: '90px' },
            { label: 'Alerta', align: 'left' },
            { label: 'Detalle', align: 'left' }
        ];

        const rows = alerts.slice(0, 10).map(a => [
            kit.badge(a.severity, a.severity === 'CRITICAL' ? 'CRITICAL' : 'WARN', true),
            a.titulo,
            `<span style="font-size:12px;color:#666;">${a.mensaje}</span>`
        ]);

        const tableHtml = kit.dataTable({ headers, rows, compact: true });

        const contentHtml = `
            ${scoreboardHtml}
            ${kit.sectionTitle('Alertas Activas', '⚠️', `Mostrando ${Math.min(10, alerts.length)} de ${alerts.length}`)}
            ${tableHtml}
            ${alerts.length > 10 ? `<p style="color:#666;font-size:12px;margin-top:12px;text-align:center;">... y ${alerts.length - 10} alertas más en el portal</p>` : ''}
        `;

        return kit.buildLayout({
            brandColor: '#C62828',
            brandColorDark: '#B71C1C',
            title: '⚠️ Alertas de Cobranzas',
            subtitle: `${summary.critical} crítica(s), ${summary.high} alta(s)`,
            statusBadge: summary.critical > 0 ? kit.dayStatusBadge('CRITICAL') : kit.dayStatusBadge('WARN'),
            contentHtml: contentHtml,
            preheader: `ALERTA: ${summary.critical} alertas críticas, ${summary.high} altas requieren atención`
        });
    },

    /**
     * Construye email de escalamiento PRO
     */
    _buildEscalationEmailPro(escalations) {
        const kit = typeof EmailTemplateKit !== 'undefined' ? EmailTemplateKit : getEmailTemplateKit();
        
        const alertBox = kit.alertBox({
            type: 'CRITICAL',
            title: 'Escalamiento Requerido',
            message: `${escalations.length} caso(s) requieren atención urgente de supervisión.`
        });

        // Tabla de casos
        const headers = [
            { label: 'Asegurado', align: 'left' },
            { label: 'Días sin Gestión', align: 'center', width: '100px' },
            { label: 'Motivo', align: 'left' }
        ];

        const rows = escalations.map(e => [
            e.asegurado,
            `<strong style="color:#C62828;">${e.diasSinGestion || 'N/A'}</strong>`,
            e.motivo
        ]);

        const tableHtml = kit.dataTable({ headers, rows });

        const contentHtml = `
            ${alertBox}
            ${kit.sectionTitle('Casos para Escalamiento', '🚨')}
            ${tableHtml}
        `;

        return kit.buildLayout({
            brandColor: '#C62828',
            brandColorDark: '#B71C1C',
            title: '🚨 Casos que Requieren Escalamiento',
            subtitle: `${escalations.length} caso(s) urgente(s)`,
            statusBadge: kit.dayStatusBadge('CRITICAL'),
            contentHtml: contentHtml,
            preheader: `URGENTE: ${escalations.length} casos requieren escalamiento inmediato`
        });
    },

    // ==================== MÉTODOS LEGACY (para compatibilidad) ====================

    _buildPTPReminderEmail(ptps) {
        return this._buildPTPReminderEmailPro(ptps);
    },

    _buildAgingAlertEmail(alerts, summary) {
        return this._buildAgingAlertEmailPro(alerts, summary);
    },

    _buildEscalationEmail(escalations) {
        return this._buildEscalationEmailPro(escalations);
    },

    _buildDailySummaryEmail(data) {
        return this._buildDailySummaryEmailPro(this._enrichDailyData(data));
    },

    _wrapInTemplate(content) {
        // Método legacy - redirige al nuevo sistema
        const kit = typeof EmailTemplateKit !== 'undefined' ? EmailTemplateKit : getEmailTemplateKit();
        return kit.buildLayout({
            title: 'Portal de Cobranzas',
            contentHtml: content
        });
    },

    // ==================== HELPERS ====================

    _isEnabled() { 
        return getConfig('FEATURES.ENABLE_EMAIL_AUTOMATION', true); 
    },
    
    _getAdminEmails() { 
        const emails = getConfig('AUTOMATION.ADMIN_EMAILS', []); 
        return Array.isArray(emails) ? emails.filter(e => this._isValidEmail(e)) : []; 
    },
    
    _getReplyTo() { 
        return getConfig('AUTOMATION.REPLY_TO_EMAIL', ''); 
    },
    
    _isValidEmail(email) { 
        return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); 
    },
    
    _groupBy(array, key) { 
        return array.reduce((groups, item) => { 
            const value = item[key] || 'unknown'; 
            groups[value] = groups[value] || []; 
            groups[value].push(item); 
            return groups; 
        }, {}); 
    },
    
    _formatNumber(num) { 
        return (num || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); 
    }
};

// ==================== FUNCIONES API ====================

function sendPTPReminders_API() { 
    return EmailAutomation.sendPTPReminders(); 
}

function sendAgingAlerts_API() { 
    return EmailAutomation.sendAgingAlerts(); 
}

function sendDailySummary_API(data) { 
    return EmailAutomation.sendDailySummaryEmail(data); 
}

function testEmailTemplate_API(type) { 
    return { ok: true, message: 'Use sendPTPReminders_API or sendAgingAlerts_API' }; 
}

/**
 * API: Previsualizar email diario con datos reales
 */
function previewDailyEmail_API() {
    const context = 'previewDailyEmail_API';
    try {
        // Recolectar datos reales
        const data = typeof ReportScheduler !== 'undefined' 
            ? ReportScheduler._collectDailyData() 
            : { gestionesHoy: 0, ptpsPendientes: 0, alertasCriticas: 0, dso: 0 };
        
        const enrichedData = EmailAutomation._enrichDailyData(data);
        const html = EmailAutomation._buildDailySummaryEmailPro(enrichedData);
        
        return {
            ok: true,
            html: html,
            sizeKB: (html.length / 1024).toFixed(2),
            data: enrichedData
        };
    } catch (error) {
        Logger.error(context, 'Error previsualizando email', error);
        return { ok: false, error: error.message };
    }
}
