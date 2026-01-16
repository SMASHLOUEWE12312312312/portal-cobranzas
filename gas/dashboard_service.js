/**
 * @fileoverview DashboardService - Fase 4 Analytics & Reporting
 * @version 1.0.0
 * FEATURE FLAG: FEATURES.ENABLE_DASHBOARD_SERVICE
 */

const DashboardService = {
    CACHE_KEY: 'DASHBOARD_DATA_V1',
    CACHE_TTL: 180,
    DASHBOARD_TYPE: { EXECUTIVE: 'EXECUTIVE', OPERATIONS: 'OPERATIONS', INDIVIDUAL: 'INDIVIDUAL', ANALYTICS: 'ANALYTICS' },

    getDashboardData(options = {}) {
        const context = 'DashboardService.getDashboardData';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const tipo = options.tipo || this.DASHBOARD_TYPE.EXECUTIVE;
            const cacheKey = options.responsable ? `${this.CACHE_KEY}_${tipo}_${options.responsable}` : `${this.CACHE_KEY}_${tipo}`;

            if (!options.forceRefresh && typeof CacheHelper !== 'undefined') {
                const cached = CacheHelper.get(cacheKey);
                if (cached) return { ...cached, fromCache: true };
            }

            Logger.info(context, 'Construyendo dashboard...', { tipo });
            const startTime = Date.now();
            const dashboard = { ok: true, tipo, timestamp: new Date().toISOString(), widgets: {}, calculationMs: 0 };

            switch (tipo) {
                case this.DASHBOARD_TYPE.EXECUTIVE: dashboard.widgets = this._buildExecutiveDashboard(); break;
                case this.DASHBOARD_TYPE.OPERATIONS: dashboard.widgets = this._buildOperationsDashboard(); break;
                case this.DASHBOARD_TYPE.INDIVIDUAL: dashboard.widgets = this._buildIndividualDashboard(options.responsable); break;
                case this.DASHBOARD_TYPE.ANALYTICS: dashboard.widgets = this._buildAnalyticsDashboard(); break;
                default: dashboard.widgets = this._buildExecutiveDashboard();
            }

            dashboard.calculationMs = Date.now() - startTime;
            if (typeof CacheHelper !== 'undefined') CacheHelper.set(cacheKey, dashboard, this.CACHE_TTL);
            Logger.info(context, 'Dashboard construido', { ms: dashboard.calculationMs });
            return dashboard;
        } catch (error) {
            Logger.error(context, 'Error construyendo dashboard', error);
            return { ok: false, error: error.message };
        }
    },

    getWidget(widgetId) {
        try {
            switch (widgetId) {
                case 'kpi_summary': return this._buildKPISummaryWidget();
                case 'alerts': return this._buildAlertsWidget();
                case 'ptp_status': return this._buildPTPStatusWidget();
                case 'aging': return this._buildAgingWidget();
                case 'workflow': return this._buildWorkflowWidget();
                case 'recent_activity': return this._buildRecentActivityWidget();
                case 'forecast': return this._buildForecastWidget();
                case 'top_performers': return this._buildTopPerformersWidget();
                default: return { ok: false, error: 'Widget no encontrado' };
            }
        } catch (error) {
            Logger.error('DashboardService.getWidget', `Error en widget ${widgetId}`, error);
            return { ok: false, error: error.message };
        }
    },

    getChartData(chartId) {
        try {
            switch (chartId) {
                case 'aging_pie': return this._buildAgingPieChart();
                case 'trend_line': return this._buildTrendLineChart();
                case 'cia_bar': return this._buildCIABarChart();
                case 'performance_radar': return this._buildPerformanceRadarChart();
                default: return { ok: false, error: 'Gráfico no encontrado' };
            }
        } catch (error) {
            Logger.error('DashboardService.getChartData', `Error en gráfico ${chartId}`, error);
            return { ok: false, error: error.message };
        }
    },

    invalidateCache() { if (typeof CacheHelper !== 'undefined') CacheHelper.removeByPrefix('DASHBOARD_'); Logger.info('DashboardService.invalidateCache', 'Cache invalidado'); },

    _buildExecutiveDashboard() { return { kpiSummary: this._buildKPISummaryWidget(), alerts: this._buildAlertsWidget(), aging: this._buildAgingWidget(), ptpStatus: this._buildPTPStatusWidget(), forecast: this._buildForecastWidget(), topPerformers: this._buildTopPerformersWidget() }; },
    _buildOperationsDashboard() { return { kpiSummary: this._buildKPISummaryWidget(), workflow: this._buildWorkflowWidget(), alerts: this._buildAlertsWidget(), recentActivity: this._buildRecentActivityWidget(), ptpStatus: this._buildPTPStatusWidget() }; },
    _buildIndividualDashboard(resp) { const w = { kpiSummary: this._buildKPISummaryWidget(), myAlerts: this._buildAlertsWidget({ responsable: resp }), myPTPs: this._buildPTPStatusWidget({ responsable: resp }), myActivity: this._buildRecentActivityWidget({ responsable: resp }) }; if (typeof AnalyticsService !== 'undefined') { const p = AnalyticsService.getPerformanceByResponsable(); if (p.ok) { const mp = p.responsables.find(r => r.responsable === resp); if (mp) w.myPerformance = { ok: true, data: mp, ranking: p.ranking.find(r => r.responsable === resp)?.posicion || 0, totalResponsables: p.responsables.length }; } } return w; },
    _buildAnalyticsDashboard() { const w = { trends: null, ciaAnalysis: null, performanceRanking: null, forecast: this._buildForecastWidget() }; if (typeof AnalyticsService !== 'undefined') { w.trends = AnalyticsService.getTrendAnalysis({ periodo: 'MONTHLY' }); w.ciaAnalysis = AnalyticsService.getAnalysisByCIA(); w.performanceRanking = AnalyticsService.getPerformanceByResponsable(); } return w; },

    _buildKPISummaryWidget() {
        const widget = { ok: true, widgetId: 'kpi_summary', title: 'Resumen de KPIs', kpis: [] };
        if (typeof KPIService !== 'undefined') {
            const kpis = KPIService.getDashboardKPIs();
            if (kpis.ok && kpis.available) {
                widget.kpis = [
                    { id: 'dso', label: 'DSO', value: kpis.dso.value, unit: 'días', status: kpis.dso.status, trend: kpis.dso.trend, benchmark: kpis.dso.benchmark },
                    { id: 'cartera_vencida', label: 'Cartera Vencida', value: kpis.summary.porcentajeVencido, unit: '%', status: kpis.summary.porcentajeVencido > 25 ? 'CRITICAL' : kpis.summary.porcentajeVencido > 15 ? 'WARNING' : 'OK' },
                    { id: 'total_registros', label: 'Registros Activos', value: kpis.summary.totalRegistros, unit: '' },
                    { id: 'monto_total', label: 'Monto Total', value: kpis.summary.montoTotal, unit: 'PEN', format: 'currency' }
                ];
            }
        }
        return widget;
    },

    _buildAlertsWidget(options = {}) {
        const widget = { ok: true, widgetId: 'alerts', title: 'Alertas Activas', alerts: [], summary: { critical: 0, high: 0, medium: 0, total: 0 } };
        if (typeof AlertService !== 'undefined') { const a = AlertService.getActiveAlerts(options); if (a.ok) { widget.alerts = a.alerts.slice(0, 10); widget.summary = a.summary; } }
        return widget;
    },

    _buildPTPStatusWidget(options = {}) {
        const widget = { ok: true, widgetId: 'ptp_status', title: 'Estado de Compromisos', pendientes: 0, vencidos: 0, proximosVencer: 0, tasaCumplimiento: 0, topPendientes: [] };
        if (typeof PTPService !== 'undefined') {
            const ptps = PTPService.getPTPsPendientes();
            const metricas = PTPService.getMetricasCumplimiento();
            widget.pendientes = ptps.length;
            widget.vencidos = ptps.filter(p => p.vencido).length;
            widget.proximosVencer = ptps.filter(p => !p.vencido && p.diasRestantes <= 3).length;
            widget.tasaCumplimiento = metricas.ok ? parseFloat(metricas.tasaCumplimiento) : 0;
            widget.topPendientes = ptps.slice(0, 5).map(p => ({ asegurado: p.asegurado, monto: p.montoComprometido, fechaCompromiso: p.fechaCompromiso, diasRestantes: p.diasRestantes, vencido: p.vencido }));
        }
        return widget;
    },

    _buildAgingWidget() {
        const widget = { ok: true, widgetId: 'aging', title: 'Distribución por Antigüedad', buckets: [], totalMonto: 0 };
        if (typeof KPIService !== 'undefined') { const kpis = KPIService.getDashboardKPIs(); if (kpis.ok && kpis.available && kpis.aging) { widget.buckets = kpis.aging.buckets; widget.totalMonto = kpis.aging.buckets.reduce((s, b) => s + (b.amount || 0), 0); } }
        return widget;
    },

    _buildWorkflowWidget() {
        const widget = { ok: true, widgetId: 'workflow', title: 'Cola de Trabajo', pendientes: 0, urgentes: 0, items: [] };
        if (typeof CollectionWorkflow !== 'undefined') { const q = CollectionWorkflow.getWorkQueue({ limit: 10 }); if (q.ok) { widget.pendientes = q.total; widget.urgentes = q.items.filter(i => i.urgencia === 'CRITICA' || i.urgencia === 'ALTA').length; widget.items = q.items; } }
        return widget;
    },

    _buildRecentActivityWidget(options = {}) {
        const widget = { ok: true, widgetId: 'recent_activity', title: 'Actividad Reciente', activities: [] };
        if (typeof BitacoraService !== 'undefined') {
            try {
                let gestiones = BitacoraService.obtenerGestiones({ limit: 20 });
                if (options.responsable) gestiones = gestiones.filter(g => g.responsable === options.responsable);
                widget.activities = gestiones.slice(0, 10).map(g => ({ fecha: g.fechaRegistro, asegurado: g.asegurado, tipo: g.tipoGestion, estado: g.estadoGestion, responsable: g.responsable }));
            } catch (e) { }
        }
        return widget;
    },

    _buildForecastWidget() {
        const widget = { ok: true, widgetId: 'forecast', title: 'Proyección de Recaudo', montoEsperado: 0, confianza: 'BAJA', desglose: [] };
        if (typeof AnalyticsService !== 'undefined') { const f = AnalyticsService.getRecaudoForecast(30); if (f.ok) { widget.montoEsperado = f.proyeccion.montoEsperado; widget.montoOptimista = f.proyeccion.montoOptimista; widget.montoPesimista = f.proyeccion.montoPesimista; widget.confianza = f.confianza; widget.desglose = f.desglose; } }
        return widget;
    },

    _buildTopPerformersWidget() {
        const widget = { ok: true, widgetId: 'top_performers', title: 'Top Performers', performers: [] };
        if (typeof AnalyticsService !== 'undefined') { const p = AnalyticsService.getPerformanceByResponsable(); if (p.ok) widget.performers = p.ranking.slice(0, 5).map(r => ({ posicion: r.posicion, responsable: r.responsable, efectividad: r.efectividad, gestiones: r.totalGestiones, tasaCumplimiento: r.tasaCumplimiento })); }
        return widget;
    },

    _buildAgingPieChart() { const a = this._buildAgingWidget(); return { ok: true, chartId: 'aging_pie', type: 'pie', data: a.buckets.map(b => ({ label: b.label, value: b.percentage, color: b.id === 'BUCKET_90_PLUS' ? '#c62828' : b.id === 'BUCKET_61_90' ? '#ef6c00' : b.id === 'BUCKET_31_60' ? '#f9a825' : '#2e7d32' })) }; },
    _buildTrendLineChart() { if (typeof AnalyticsService === 'undefined') return { ok: false, error: 'AnalyticsService no disponible' }; const t = AnalyticsService.getTrendAnalysis({ periodo: 'MONTHLY' }); if (!t.ok) return t; return { ok: true, chartId: 'trend_line', type: 'line', labels: t.trends.map(x => x.periodo), datasets: [{ label: 'Gestiones', data: t.trends.map(x => x.gestiones), borderColor: '#1565c0' }] }; },
    _buildCIABarChart() { if (typeof AnalyticsService === 'undefined') return { ok: false, error: 'AnalyticsService no disponible' }; const c = AnalyticsService.getAnalysisByCIA(); if (!c.ok) return c; return { ok: true, chartId: 'cia_bar', type: 'bar', labels: c.porCIA.slice(0, 10).map(x => x.name), datasets: [{ label: 'Monto', data: c.porCIA.slice(0, 10).map(x => x.amount), backgroundColor: '#1565c0' }] }; },
    _buildPerformanceRadarChart() { return { ok: true, chartId: 'performance_radar', type: 'radar', labels: ['Gestiones', 'Cumplimiento PTP', 'Monto Recuperado', 'Efectividad'], datasets: [] }; },

    _isEnabled() { return getConfig('FEATURES.ENABLE_DASHBOARD_SERVICE', true); }
};

function getDashboardData_API(options) { return DashboardService.getDashboardData(options || {}); }
function getDashboardWidget_API(widgetId) { return DashboardService.getWidget(widgetId); }
function getDashboardChart_API(chartId) { return DashboardService.getChartData(chartId); }
function invalidateDashboardCache_API() { DashboardService.invalidateCache(); return { ok: true }; }
