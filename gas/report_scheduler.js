/**
 * @fileoverview ReportScheduler - Fase 3 Automatización (v2.0 PRO)
 * @version 2.0.0
 * @author Portal Cobranzas Team
 * @lastModified 2026-01-27
 * 
 * FEATURE FLAG: FEATURES.ENABLE_REPORT_SCHEDULER
 * 
 * v2.0: Weekly Performance Pack con EmailTemplateKit
 * - Executive Summary con bullets
 * - Scoreboard semanal con deltas vs semana anterior
 * - Aging distribution mejorada con barras
 * - Performance por responsable
 * - Pipeline & Forecast
 * - Acciones recomendadas
 */

const ReportScheduler = {
    REPORTS_FOLDER: 'Portal_Cobranzas_Reports',
    DAILY_SHEET: 'Reporte_Diario',
    WEEKLY_SHEET: 'Reporte_Semanal',

    // ==================== MÉTODOS PÚBLICOS ====================

    generateDailySummary() {
        const context = 'ReportScheduler.generateDailySummary';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            Logger.info(context, 'Generando resumen diario...');
            const summaryData = this._collectDailyData();
            const reportId = this._saveDailyReport(summaryData);
            let emailsSent = 0;
            if (typeof EmailAutomation !== 'undefined') {
                const emailResult = EmailAutomation.sendDailySummaryEmail(summaryData);
                emailsSent = emailResult.sent || 0;
            }
            Logger.info(context, 'Resumen diario completado', { reportId, emailsSent });
            return { ok: true, reportId, emailsSent, summary: summaryData };
        } catch (error) {
            Logger.error(context, 'Error generando resumen diario', error);
            return { ok: false, error: error.message };
        }
    },

    generateWeeklyReport() {
        const context = 'ReportScheduler.generateWeeklyReport';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            Logger.info(context, 'Generando reporte semanal PRO...');
            const weeklyData = this._collectWeeklyDataEnriched();
            const reportId = this._saveWeeklyReport(weeklyData);
            let emailsSent = 0;
            
            const emailResult = this._sendWeeklyReportEmailPro(weeklyData);
            emailsSent = emailResult.sent || 0;
            
            Logger.info(context, 'Reporte semanal completado', { reportId, emailsSent });
            return { ok: true, reportId, emailsSent, data: weeklyData };
        } catch (error) {
            Logger.error(context, 'Error generando reporte semanal', error);
            return { ok: false, error: error.message };
        }
    },

    getReportHistory(options = {}) {
        try {
            const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
            const sheetName = options.tipo === 'weekly' ? this.WEEKLY_SHEET : this.DAILY_SHEET;
            const sheet = ss.getSheetByName(sheetName);
            if (!sheet) return [];

            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const reports = [];
            for (let i = Math.max(1, data.length - (options.limit || 30)); i < data.length; i++) {
                const row = data[i];
                const report = {};
                headers.forEach((h, idx) => { report[h] = row[idx]; });
                reports.push(report);
            }
            return reports.reverse();
        } catch (error) {
            Logger.error('ReportScheduler.getReportHistory', 'Error', error);
            return [];
        }
    },

    // ==================== RECOLECCIÓN DE DATOS ====================

    _collectDailyData() {
        const today = new Date();
        const data = { 
            fecha: today.toISOString(), 
            fechaFormateada: today.toLocaleDateString('es-PE'), 
            gestionesHoy: 0, 
            ptpsPendientes: 0, 
            ptpsVencidos: 0, 
            alertasCriticas: 0, 
            alertasAltas: 0, 
            dso: 0, 
            porcentajeVencido: 0, 
            topPendientes: [], 
            ciclosActivos: 0 
        };

        if (typeof BitacoraService !== 'undefined') {
            try {
                const gestiones = BitacoraService.obtenerGestiones({ limit: 5000 });
                
                // Usar fecha local de Perú para comparación
                const todayLocal = Utilities.formatDate(today, 'America/Lima', 'yyyy-MM-dd');
                
                data.gestionesHoy = gestiones.filter(g => { 
                    if (!g.fechaRegistro) return false;
                    const fechaGestion = new Date(g.fechaRegistro);
                    const fechaLocal = Utilities.formatDate(fechaGestion, 'America/Lima', 'yyyy-MM-dd');
                    return fechaLocal === todayLocal; 
                }).length;
                
                // También contar ciclos activos
                const ciclosUnicos = new Set(gestiones.map(g => g.idCiclo).filter(Boolean));
                data.ciclosActivos = ciclosUnicos.size;
                
            } catch (e) { 
                Logger.warn('ReportScheduler._collectDailyData', 'Error en BitacoraService', e); 
            }
        }

        // Obtener PTPs - primero PTPService, luego fallback a BitacoraService
        let ptpsFound = false;
        if (typeof PTPService !== 'undefined') {
            try {
                const ptps = PTPService.getPTPsPendientes();
                if (ptps && ptps.length > 0) {
                    data.ptpsPendientes = ptps.length;
                    data.ptpsVencidos = ptps.filter(p => p.vencido).length;
                    ptpsFound = true;
                }
            } catch (e) { 
                Logger.warn('ReportScheduler._collectDailyData', 'Error en PTPService', e); 
            }
        }
        
        // Fallback a BitacoraService para PTPs
        if (!ptpsFound && typeof BitacoraService !== 'undefined') {
            try {
                const compromisos = BitacoraService.obtenerCompromisosActivos();
                if (compromisos && compromisos.length > 0) {
                    const todayMidnight = new Date(today);
                    todayMidnight.setHours(0, 0, 0, 0);
                    
                    data.ptpsPendientes = compromisos.length;
                    data.ptpsVencidos = compromisos.filter(c => {
                        if (!c.fechaCompromiso) return false;
                        const fechaComp = new Date(c.fechaCompromiso);
                        return fechaComp < todayMidnight;
                    }).length;
                }
            } catch (e) {
                Logger.warn('ReportScheduler._collectDailyData', 'Error en BitacoraService fallback', e);
            }
        }

        if (typeof AlertService !== 'undefined') {
            try {
                const alerts = AlertService.getActiveAlerts();
                if (alerts.ok) { 
                    data.alertasCriticas = alerts.summary.critical; 
                    data.alertasAltas = alerts.summary.high; 
                }
            } catch (e) { 
                Logger.warn('ReportScheduler._collectDailyData', 'Error en AlertService', e); 
            }
        }

        if (typeof KPIService !== 'undefined') {
            try {
                const kpis = KPIService.getDashboardKPIs();
                if (kpis.ok && kpis.available) { 
                    data.dso = kpis.dso.value; 
                    data.porcentajeVencido = kpis.summary.porcentajeVencido; 
                }
            } catch (e) { 
                Logger.warn('ReportScheduler._collectDailyData', 'Error en KPIService', e); 
            }
        }

        return data;
    },

    /**
     * Recolecta datos semanales enriquecidos para el email PRO
     */
    _collectWeeklyDataEnriched() {
        const today = new Date();
        const weekAgo = new Date(today); 
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const data = { 
            fechaInicio: weekAgo.toISOString(), 
            fechaFin: today.toISOString(), 
            semana: this._getWeekNumber(today),
            year: today.getFullYear(),
            totalGestiones: 0, 
            ptpsCreados: 0, 
            ptpsCumplidos: 0, 
            ptpsIncumplidos: 0,
            ptpsPendientes: 0,
            tasaCumplimiento: 0, 
            cei: 0,
            dsoPromedio: 0, 
            tendenciaDSO: 'stable',
            dsoBenchmark: getConfig('KPI.DSO_BENCHMARK', 35),
            alertasGeneradas: 0, 
            ciclosCerrados: 0, 
            montoRecuperado: 0,
            montoComprometido: 0,
            tasaRecuperacion: 0,
            porcentajeVencido: 0,
            totalMonto: 0,
            totalVencido: 0,
            agingDistribution: [],
            byCompany: [],
            byCurrency: null,
            lastWeek: null,
            executiveSummary: [],
            recommendedActions: [],
            performanceByResponsable: []
        };

        // Obtener datos de semana anterior para deltas
        data.lastWeek = this._getLastWeekData();

        // Métricas de PTP - intentar PTPService, si no hay datos usar BitacoraService
        let ptpMetricsObtained = false;
        if (typeof PTPService !== 'undefined') {
            try {
                const metricas = PTPService.getMetricasCumplimiento({ forceRefresh: true });
                if (metricas.ok && (metricas.cumplidos > 0 || metricas.pendientes > 0 || metricas.incumplidos > 0)) { 
                    data.ptpsCumplidos = metricas.cumplidos; 
                    data.ptpsIncumplidos = metricas.incumplidos;
                    data.ptpsPendientes = metricas.pendientes;
                    data.tasaCumplimiento = parseFloat(metricas.tasaCumplimiento) || 0; 
                    data.montoRecuperado = metricas.montoRecuperado;
                    data.montoComprometido = metricas.montoComprometido;
                    data.tasaRecuperacion = parseFloat(metricas.tasaRecuperacion) || 0;
                    data.cei = parseFloat(metricas.cei) || 0;
                    ptpMetricsObtained = true;
                }
            } catch (e) { 
                Logger.warn('ReportScheduler._collectWeeklyDataEnriched', 'Error en PTPService', e); 
            }
        }
        
        // Fallback: usar compromisos de BitacoraService para métricas de PTP
        if (!ptpMetricsObtained && typeof BitacoraService !== 'undefined') {
            try {
                const compromisos = BitacoraService.obtenerCompromisosActivos();
                const gestiones = BitacoraService.obtenerGestiones({ limit: 5000 });
                
                if (compromisos && compromisos.length > 0) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    // Contar pendientes vs vencidos
                    let pendientes = 0, vencidos = 0;
                    compromisos.forEach(c => {
                        if (c.fechaCompromiso) {
                            const fechaComp = new Date(c.fechaCompromiso);
                            if (fechaComp < today) {
                                vencidos++;
                            } else {
                                pendientes++;
                            }
                        }
                    });
                    
                    // Contar cerrados/pagados en la semana (aproximación)
                    const weekStart = new Date(today);
                    weekStart.setDate(weekStart.getDate() - 7);
                    const cerradosPagados = gestiones.filter(g => {
                        if (g.estadoGestion !== 'CERRADO_PAGADO') return false;
                        const fecha = new Date(g.fechaRegistro);
                        return fecha >= weekStart && fecha <= today;
                    }).length;
                    
                    data.ptpsPendientes = pendientes;
                    data.ptpsIncumplidos = vencidos;
                    data.ptpsCumplidos = cerradosPagados;
                    
                    // Calcular tasa de cumplimiento
                    const totalProcessed = data.ptpsCumplidos + data.ptpsIncumplidos;
                    data.tasaCumplimiento = totalProcessed > 0 
                        ? parseFloat(((data.ptpsCumplidos / totalProcessed) * 100).toFixed(1))
                        : 0;
                    
                    Logger.info('ReportScheduler._collectWeeklyDataEnriched', 'PTPs obtenidos de BitacoraService', {
                        pendientes: data.ptpsPendientes,
                        vencidos: data.ptpsIncumplidos,
                        cumplidos: data.ptpsCumplidos,
                        tasa: data.tasaCumplimiento
                    });
                }
            } catch (e) {
                Logger.warn('ReportScheduler._collectWeeklyDataEnriched', 'Error en BitacoraService fallback', e);
            }
        }

        // Métricas de KPI
        if (typeof KPIService !== 'undefined') {
            try {
                const kpis = KPIService.getDashboardKPIs({ forceRefresh: true });
                if (kpis.ok && kpis.available) { 
                    data.dsoPromedio = kpis.dso.value; 
                    data.tendenciaDSO = kpis.dso.trend;
                    data.porcentajeVencido = kpis.summary.porcentajeVencido;
                    data.totalMonto = kpis.summary.totalMonto;
                    data.totalVencido = kpis.summary.totalVencido;
                    data.agingDistribution = kpis.aging.buckets.map(b => ({ 
                        id: b.id,
                        label: b.label,   // Corregido: era "bucket", template espera "label"
                        count: b.count, 
                        percentage: b.percentage,
                        amount: b.amount,
                        amountPercentage: b.amountPercentage,
                        color: b.color,
                        severity: b.severity
                    }));
                    data.byCompany = kpis.byCompany || [];
                    data.byCurrency = kpis.byCurrency;
                }
            } catch (e) { 
                Logger.warn('ReportScheduler._collectWeeklyDataEnriched', 'Error en KPIService', e); 
            }
        }

        // Métricas de gestiones (conteo semanal)
        if (typeof BitacoraService !== 'undefined') {
            try {
                const gestiones = BitacoraService.obtenerGestiones({ limit: 5000 });
                const weekStart = weekAgo.toISOString().split('T')[0];
                const weekEnd = today.toISOString().split('T')[0];
                
                data.totalGestiones = gestiones.filter(g => {
                    if (!g.fechaRegistro) return false;
                    const fecha = new Date(g.fechaRegistro).toISOString().split('T')[0];
                    return fecha >= weekStart && fecha <= weekEnd;
                }).length;
            } catch (e) {
                Logger.warn('ReportScheduler._collectWeeklyDataEnriched', 'Error en BitacoraService', e);
            }
        }

        // Performance por responsable (si AnalyticsService está disponible)
        if (typeof AnalyticsService !== 'undefined') {
            try {
                const perf = AnalyticsService.getPerformanceByResponsable({ forceRefresh: true });
                if (perf.ok && perf.responsables) {
                    data.performanceByResponsable = perf.responsables.slice(0, 10);
                }
            } catch (e) {
                Logger.warn('ReportScheduler._collectWeeklyDataEnriched', 'Error en AnalyticsService', e);
            }
        }

        // Generar Executive Summary
        data.executiveSummary = this._generateExecutiveSummary(data);

        // Generar Acciones Recomendadas
        data.recommendedActions = this._generateRecommendedActions(data);

        return data;
    },

    /**
     * Obtiene datos de la semana anterior del histórico
     */
    _getLastWeekData() {
        try {
            const history = this.getReportHistory({ tipo: 'weekly', limit: 2 });
            if (history && history.length >= 2) {
                return history[1];
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Genera los 3 bullets del Executive Summary
     */
    _generateExecutiveSummary(data) {
        const summary = [];
        const lastWeek = data.lastWeek || {};

        // Qué mejoró
        const improvements = [];
        if (data.tasaCumplimiento > (parseFloat(lastWeek['Tasa Cumplimiento']) || 0)) {
            improvements.push(`Tasa de cumplimiento mejoró a ${data.tasaCumplimiento}%`);
        }
        if (data.dsoPromedio < (lastWeek['DSO Promedio'] || 999)) {
            improvements.push(`DSO bajó a ${data.dsoPromedio} días`);
        }
        if (data.montoRecuperado > 0) {
            const kit = typeof EmailTemplateKit !== 'undefined' ? EmailTemplateKit : getEmailTemplateKit();
            improvements.push(`Se recuperaron ${kit.formatCurrency(data.montoRecuperado)}`);
        }
        
        if (improvements.length > 0) {
            summary.push({
                type: 'positive',
                text: improvements[0]
            });
        }

        // Qué empeoró
        const concerns = [];
        if (data.ptpsIncumplidos > (lastWeek['PTPs Incumplidos'] || 0)) {
            concerns.push(`PTPs incumplidos aumentaron a ${data.ptpsIncumplidos}`);
        }
        if (data.porcentajeVencido > (lastWeek['% Vencido'] || 0)) {
            concerns.push(`Cartera vencida subió a ${data.porcentajeVencido.toFixed(1)}%`);
        }
        const bucket90 = data.agingDistribution.find(b => b.id === 'BUCKET_90_PLUS');
        if (bucket90 && bucket90.percentage > getConfig('KPI.BUCKET_90_WARN', 5)) {
            concerns.push(`${bucket90.percentage.toFixed(1)}% de cartera en 90+ días`);
        }

        if (concerns.length > 0) {
            summary.push({
                type: 'negative',
                text: concerns[0]
            });
        }

        // Riesgo/Oportunidad
        const bucket6190 = data.agingDistribution.find(b => b.id === 'BUCKET_61_90');
        if (bucket6190 && bucket6190.count > 0) {
            summary.push({
                type: 'neutral',
                text: `${bucket6190.count} cuentas en 61-90 días requieren gestión preventiva`
            });
        } else if (data.ptpsPendientes > 0) {
            summary.push({
                type: 'neutral',
                text: `${data.ptpsPendientes} PTPs pendientes de seguimiento`
            });
        }

        return summary.slice(0, 3);
    },

    /**
     * Genera las acciones recomendadas para la próxima semana
     */
    _generateRecommendedActions(data) {
        const actions = [];

        // Acción 1: Bucket crítico
        const bucket90 = data.agingDistribution.find(b => b.id === 'BUCKET_90_PLUS');
        if (bucket90 && bucket90.count > 0) {
            actions.push({
                accion: `Gestionar ${bucket90.count} cuentas en bucket 90+ días`,
                responsable: 'Equipo Cobranzas',
                objetivo: 'Reducir cartera crítica en 20%'
            });
        }

        // Acción 2: PTPs incumplidos
        if (data.ptpsIncumplidos > 0) {
            actions.push({
                accion: `Contactar ${data.ptpsIncumplidos} clientes con PTPs incumplidos`,
                responsable: 'Gestores asignados',
                objetivo: 'Reprogramar o escalar casos'
            });
        }

        // Acción 3: Prevención bucket 61-90
        const bucket6190 = data.agingDistribution.find(b => b.id === 'BUCKET_61_90');
        if (bucket6190 && bucket6190.count > 0) {
            actions.push({
                accion: `Intensificar gestión de ${bucket6190.count} cuentas en 61-90 días`,
                responsable: 'Equipo Cobranzas',
                objetivo: 'Evitar migración a bucket crítico'
            });
        }

        // Acción 4: DSO
        if (data.dsoPromedio > data.dsoBenchmark) {
            actions.push({
                accion: 'Implementar plan de reducción de DSO',
                responsable: 'Supervisión',
                objetivo: `Reducir DSO de ${data.dsoPromedio} a ${data.dsoBenchmark} días`
            });
        }

        // Acción 5: Top companies
        if (data.byCompany && data.byCompany.length > 0) {
            const topVencida = data.byCompany.find(c => c.vencidoPct > 30);
            if (topVencida) {
                actions.push({
                    accion: `Reunión con ${topVencida.name} (${topVencida.vencidoPct.toFixed(0)}% vencido)`,
                    responsable: 'Gerencia Comercial',
                    objetivo: 'Definir plan de regularización'
                });
            }
        }

        return actions.slice(0, 5);
    },

    // ==================== GUARDADO DE REPORTES ====================

    _saveDailyReport(data) {
        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName(this.DAILY_SHEET);
        if (!sheet) {
            sheet = ss.insertSheet(this.DAILY_SHEET);
            sheet.getRange(1, 1, 1, 9).setValues([['Fecha', 'Gestiones', 'PTPs Pendientes', 'PTPs Vencidos', 'Alertas Críticas', 'Alertas Altas', 'DSO', '% Vencido', 'Ciclos Activos']]).setFontWeight('bold').setBackground('#e3f2fd');
            sheet.setFrozenRows(1);
        }
        sheet.appendRow([data.fechaFormateada, data.gestionesHoy, data.ptpsPendientes, data.ptpsVencidos, data.alertasCriticas, data.alertasAltas, data.dso, data.porcentajeVencido, data.ciclosActivos]);
        this._trimSheet(sheet, 90);
        return `DAILY_${data.fechaFormateada}`;
    },

    _saveWeeklyReport(data) {
        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName(this.WEEKLY_SHEET);
        if (!sheet) {
            sheet = ss.insertSheet(this.WEEKLY_SHEET);
            sheet.getRange(1, 1, 1, 11).setValues([['Semana', 'Fecha Inicio', 'Fecha Fin', 'PTPs Cumplidos', 'PTPs Incumplidos', 'Tasa Cumplimiento', 'DSO Promedio', 'Tendencia DSO', 'Monto Recuperado', '% Vencido', 'Total Gestiones']]).setFontWeight('bold').setBackground('#e8f5e9');
            sheet.setFrozenRows(1);
        }
        sheet.appendRow([
            data.semana, 
            new Date(data.fechaInicio).toLocaleDateString('es-PE'), 
            new Date(data.fechaFin).toLocaleDateString('es-PE'), 
            data.ptpsCumplidos, 
            data.ptpsIncumplidos, 
            data.tasaCumplimiento + '%', 
            data.dsoPromedio, 
            data.tendenciaDSO, 
            data.montoRecuperado,
            data.porcentajeVencido,
            data.totalGestiones
        ]);
        this._trimSheet(sheet, 52);
        return `WEEKLY_${data.semana}`;
    },

    _trimSheet(sheet, maxRows) {
        const currentRows = sheet.getLastRow();
        if (currentRows > maxRows + 1) sheet.deleteRows(2, currentRows - maxRows - 1);
    },

    // ==================== EMAIL SEMANAL PRO ====================

    /**
     * Envía email semanal PRO usando EmailTemplateKit
     */
    _sendWeeklyReportEmailPro(data) {
        const admins = getConfig('AUTOMATION.ADMIN_EMAILS', []);
        if (admins.length === 0) return { ok: true, sent: 0 };

        const html = this._buildWeeklyReportEmailPro(data);

        let sent = 0;
        for (const admin of admins) {
            try { 
                MailApp.sendEmail({ 
                    to: admin, 
                    subject: `[REPORTE SEMANAL] Cobranzas - Semana ${data.semana} · ${data.year}`, 
                    htmlBody: html, 
                    name: 'Portal de Cobranzas' 
                }); 
                sent++; 
            }
            catch (e) { 
                Logger.error('ReportScheduler._sendWeeklyReportEmailPro', `Error enviando a ${admin}`, e); 
            }
        }
        return { ok: true, sent, htmlSize: html.length };
    },

    /**
     * Construye el HTML del email semanal PRO
     */
    _buildWeeklyReportEmailPro(data) {
        const kit = typeof EmailTemplateKit !== 'undefined' ? EmailTemplateKit : getEmailTemplateKit();
        const lastWeek = data.lastWeek || {};

        // 1. Executive Summary
        const execSummaryHtml = data.executiveSummary && data.executiveSummary.length > 0
            ? kit.executiveSummary(data.executiveSummary)
            : '';

        // 2. Scoreboard semanal
        const kpis = this._buildWeeklyKPICards(data, kit, lastWeek);
        const scoreboardHtml = kit.kpiGrid(kpis, 3);

        // 3. Aging Distribution mejorada
        const agingHtml = data.agingDistribution && data.agingDistribution.length > 0
            ? kit.agingTable(data.agingDistribution, { showAmount: true })
            : '';

        // 4. Performance por responsable
        const performanceHtml = data.performanceByResponsable && data.performanceByResponsable.length > 0
            ? kit.performanceTable(data.performanceByResponsable, { showTop: 5 })
            : '';

        // 5. Pipeline & Forecast (simplificado)
        const pipelineHtml = this._buildPipelineSection(data, kit);

        // 6. Acciones recomendadas
        const actionsHtml = data.recommendedActions && data.recommendedActions.length > 0
            ? kit.recommendedActions(data.recommendedActions)
            : '';

        // 7. CTAs
        const portalUrl = getConfig('PORTAL.BASE_URL', '');
        const ctasHtml = portalUrl ? kit.ctaGroup([
            { text: 'Ver Dashboard Completo', url: portalUrl + getConfig('PORTAL.ROUTES.DASHBOARD', ''), options: { primary: true, icon: '📊' } },
            { text: 'Ver Reportes', url: portalUrl + getConfig('PORTAL.ROUTES.REPORTES', '/reportes'), options: { primary: false, icon: '📈' } }
        ], 'center') : '';

        // Ensamblar contenido
        const contentHtml = `
            ${execSummaryHtml}
            ${kit.sectionTitle('Métricas de la Semana', '📈', 'Comparativo vs semana anterior')}
            ${scoreboardHtml}
            ${kit.divider('24px')}
            ${agingHtml}
            ${kit.divider('16px')}
            ${performanceHtml}
            ${pipelineHtml}
            ${kit.divider('24px')}
            ${actionsHtml}
            ${ctasHtml}
        `;

        // Período formateado
        const periodoStr = `${kit.formatDate(data.fechaInicio)} - ${kit.formatDate(data.fechaFin)}`;

        // Preheader
        const preheader = `Semana ${data.semana}: Tasa ${data.tasaCumplimiento}%, DSO ${data.dsoPromedio}d, ${data.totalGestiones} gestiones`;

        return kit.buildLayout({
            brandColor: '#2E7D32',
            brandColorDark: '#1B5E20',
            title: '📈 Reporte Semanal de Cobranzas',
            subtitle: `Semana ${data.semana} · ${data.year} (${periodoStr})`,
            contentHtml: contentHtml,
            preheader: preheader
        });
    },

    /**
     * Construye las tarjetas de KPIs semanales
     */
    _buildWeeklyKPICards(data, kit, lastWeek) {
        const kpis = [];

        // 1. Tasa de Cumplimiento PTP
        const tasaLastWeek = parseFloat(lastWeek['Tasa Cumplimiento']) || null;
        const tasaSeverity = data.tasaCumplimiento >= 80 ? 'OK' : 
                           data.tasaCumplimiento >= 60 ? 'WARN' : 'CRITICAL';
        kpis.push({
            label: 'Tasa Cumplimiento',
            value: kit.formatPct(data.tasaCumplimiento),
            delta: kit.getDeltaDisplay(data.tasaCumplimiento, tasaLastWeek, { format: 'pct', invertColors: true }),
            severity: tasaSeverity,
            icon: '✅'
        });

        // 2. DSO Promedio
        const dsoLastWeek = lastWeek['DSO Promedio'] || null;
        const dsoSeverity = data.dsoPromedio <= data.dsoBenchmark ? 'OK' :
                          data.dsoPromedio <= data.dsoBenchmark + 10 ? 'WARN' : 'CRITICAL';
        kpis.push({
            label: 'DSO Promedio',
            value: `${data.dsoPromedio} días`,
            delta: kit.getDeltaDisplay(data.dsoPromedio, dsoLastWeek, { format: 'number' }),
            severity: dsoSeverity,
            benchmark: `Meta: ${data.dsoBenchmark}d`,
            trend: data.tendenciaDSO
        });

        // 3. Monto Recuperado
        kpis.push({
            label: 'Monto Recuperado',
            value: kit.formatCurrency(data.montoRecuperado),
            severity: data.montoRecuperado > 0 ? 'OK' : 'NEUTRAL',
            icon: '💰'
        });

        // 4. % Cartera Vencida
        const vencidoLastWeek = lastWeek['% Vencido'] || null;
        const vencidoSeverity = data.porcentajeVencido <= 15 ? 'OK' :
                               data.porcentajeVencido <= 25 ? 'WARN' : 'CRITICAL';
        kpis.push({
            label: '% Cartera Vencida',
            value: kit.formatPct(data.porcentajeVencido),
            delta: kit.getDeltaDisplay(data.porcentajeVencido, vencidoLastWeek, { format: 'pct' }),
            severity: vencidoSeverity,
            icon: '📉'
        });

        // 5. PTPs Cumplidos vs Incumplidos
        kpis.push({
            label: 'PTPs Cumplidos',
            value: kit.formatInt(data.ptpsCumplidos),
            delta: data.ptpsIncumplidos > 0 
                ? `<span style="color:#C62828;font-size:11px;">${data.ptpsIncumplidos} incumplido(s)</span>` 
                : '<span style="color:#2E7D32;font-size:11px;">0 incumplidos</span>',
            severity: data.ptpsIncumplidos === 0 ? 'OK' : data.ptpsIncumplidos <= 3 ? 'WARN' : 'CRITICAL',
            icon: '📋'
        });

        // 6. Total Gestiones
        const gestionesLastWeek = lastWeek['Total Gestiones'] || null;
        kpis.push({
            label: 'Gestiones Semana',
            value: kit.formatInt(data.totalGestiones),
            delta: kit.getDeltaDisplay(data.totalGestiones, gestionesLastWeek, { invertColors: true }),
            severity: data.totalGestiones > 0 ? 'OK' : 'NEUTRAL',
            icon: '📊'
        });

        return kpis;
    },

    /**
     * Construye sección de Pipeline & Forecast
     */
    _buildPipelineSection(data, kit) {
        if (!data.ptpsPendientes && !data.montoComprometido) return '';

        const pipelineInfo = [];
        
        if (data.ptpsPendientes > 0) {
            pipelineInfo.push(`<strong>${data.ptpsPendientes}</strong> PTPs pendientes de resolución`);
        }
        if (data.montoComprometido > 0) {
            pipelineInfo.push(`<strong>${kit.formatCurrency(data.montoComprometido)}</strong> en compromisos activos`);
        }
        if (data.tasaRecuperacion > 0) {
            pipelineInfo.push(`Tasa de recuperación histórica: <strong>${kit.formatPct(data.tasaRecuperacion)}</strong>`);
        }

        if (pipelineInfo.length === 0) return '';

        return `
            ${kit.sectionTitle('Pipeline de Cobranza', '🔄', 'Estado actual y proyección')}
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F5F5F5;border-radius:8px;">
                <tr>
                    <td style="padding:16px;">
                        ${pipelineInfo.map(info => `<div style="margin-bottom:8px;font-size:14px;color:#424242;">${info}</div>`).join('')}
                    </td>
                </tr>
            </table>
        `;
    },

    // ==================== MÉTODO LEGACY ====================

    _sendWeeklyReportEmail(data) {
        // Redirige al método PRO
        return this._sendWeeklyReportEmailPro(data);
    },

    _collectWeeklyData() {
        // Para compatibilidad, redirige al método enriquecido
        return this._collectWeeklyDataEnriched();
    },

    // ==================== HELPERS ====================

    _isEnabled() { 
        return getConfig('FEATURES.ENABLE_REPORT_SCHEDULER', true); 
    },
    
    _getWeekNumber(date) { 
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); 
        const dayNum = d.getUTCDay() || 7; 
        d.setUTCDate(d.getUTCDate() + 4 - dayNum); 
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); 
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7); 
    }
};

// ==================== FUNCIONES API ====================

function generateDailySummary_API() { 
    return ReportScheduler.generateDailySummary(); 
}

function generateWeeklyReport_API() { 
    return ReportScheduler.generateWeeklyReport(); 
}

function getReportHistory_API(options) { 
    return ReportScheduler.getReportHistory(options || {}); 
}

/**
 * API: Previsualizar email semanal con datos reales
 */
function previewWeeklyEmail_API() {
    const context = 'previewWeeklyEmail_API';
    try {
        const data = ReportScheduler._collectWeeklyDataEnriched();
        const html = ReportScheduler._buildWeeklyReportEmailPro(data);
        
        return {
            ok: true,
            html: html,
            sizeKB: (html.length / 1024).toFixed(2),
            data: data
        };
    } catch (error) {
        Logger.error(context, 'Error previsualizando email semanal', error);
        return { ok: false, error: error.message };
    }
}
