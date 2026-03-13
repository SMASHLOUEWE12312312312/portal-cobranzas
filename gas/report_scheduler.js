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
            gestionesAyer: 0,
            ptpsPendientes: 0,
            ptpsVencidos: 0,
            alertasCriticas: 0,
            alertasAltas: 0,
            dso: 0,
            porcentajeVencido: 0,
            topPendientes: [],
            ciclosActivos: 0,
            byCurrency: null
        };

        if (typeof BitacoraService !== 'undefined') {
            try {
                const gestiones = BitacoraService.obtenerGestiones({ limit: 5000 });

                // Contar gestiones de AYER (el trigger corre a las 7AM, no hay data de hoy aún)
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayLocal = Utilities.formatDate(yesterday, 'America/Lima', 'yyyy-MM-dd');

                data.gestionesAyer = gestiones.filter(g => {
                    if (!g.fechaRegistro) return false;
                    const fechaGestion = new Date(g.fechaRegistro);
                    const fechaLocal = Utilities.formatDate(fechaGestion, 'America/Lima', 'yyyy-MM-dd');
                    return fechaLocal === yesterdayLocal;
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
                    data.byCurrency = kpis.byCurrency;
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
            casosCerradosPagados: 0,
            agingDistribution: [],
            byCompany: [],
            byAsegurado: [],
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
        
        // Fallback: usar BitacoraService para métricas de gestión (NO PTP)
        // IMPORTANTE: CERRADO_PAGADO ≠ PTP cumplido. Son conceptos distintos.
        // Solo PTPService tiene datos reales de compromisos cumplidos/incumplidos.
        if (!ptpMetricsObtained && typeof BitacoraService !== 'undefined') {
            try {
                const compromisos = BitacoraService.obtenerCompromisosActivos();
                const gestiones = BitacoraService.obtenerGestiones({ limit: 5000 });

                // Compromisos activos (solo datos reales de PTPs)
                if (compromisos && compromisos.length > 0) {
                    const todayMid = new Date();
                    todayMid.setHours(0, 0, 0, 0);

                    let pendientes = 0, vencidos = 0, montoComprometidoTotal = 0;
                    compromisos.forEach(c => {
                        const monto = c.montoCompromiso || c.montoComprometido || c.snapshotVencidoPEN || c.montoPEN || c.monto || 0;
                        if (monto > 0) montoComprometidoTotal += monto;
                        if (c.fechaCompromiso) {
                            const fechaComp = new Date(c.fechaCompromiso);
                            if (fechaComp < todayMid) {
                                vencidos++;
                            } else {
                                pendientes++;
                            }
                        }
                    });

                    data.ptpsPendientes = pendientes;
                    data.ptpsIncumplidos = vencidos;
                    data.montoComprometido = montoComprometidoTotal;
                }

                // Casos cerrados pagados en la semana (métrica de gestión, NO de PTP)
                const weekStartDate = new Date();
                weekStartDate.setHours(0, 0, 0, 0);
                weekStartDate.setDate(weekStartDate.getDate() - 7);
                let montoRecuperadoPEN = 0;
                let montoRecuperadoUSD = 0;
                let casosCerradosSemana = 0;
                gestiones.forEach(g => {
                    if (g.estadoGestion !== 'CERRADO_PAGADO') return;
                    const fecha = new Date(g.fechaRegistro);
                    if (fecha >= weekStartDate) {
                        casosCerradosSemana++;
                        const montoRec = g.montoRecuperado || g.montoCompromiso || g.montoComprometido || g.snapshotVencidoPEN || g.montoPEN || 0;
                        if (montoRec > 0) {
                            const moneda = (g.moneda || '').toUpperCase();
                            if (moneda.includes('USD') || moneda.includes('US$') || moneda.includes('DOLAR')) {
                                montoRecuperadoUSD += montoRec;
                            } else {
                                montoRecuperadoPEN += montoRec;
                            }
                        }
                    }
                });

                data.casosCerradosPagados = casosCerradosSemana;
                data.montoRecuperado = montoRecuperadoPEN + montoRecuperadoUSD;
                data.montoRecuperadoPEN = montoRecuperadoPEN;
                data.montoRecuperadoUSD = montoRecuperadoUSD;

                // NO calcular tasaCumplimiento desde BitacoraService (sería engañoso)
                // tasaCumplimiento queda en 0 → el KPI card lo mostrará como "Sin datos PTP"
                data.ptpsCumplidos = 0; // No tenemos datos reales de PTPs cumplidos
                data.tasaCumplimiento = -1; // -1 = sin datos de PTPService

                // Tasa de recuperación basada en montos
                data.tasaRecuperacion = data.montoComprometido > 0
                    ? parseFloat(((data.montoRecuperado / data.montoComprometido) * 100).toFixed(1))
                    : 0;

                Logger.info('ReportScheduler._collectWeeklyDataEnriched', 'Datos de BitacoraService (sin PTP real)', {
                    pendientes: data.ptpsPendientes,
                    vencidos: data.ptpsIncumplidos,
                    casosCerrados: data.casosCerradosPagados,
                    montoRecuperado: data.montoRecuperado
                });
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
                        label: b.label,
                        count: b.count,
                        percentage: b.percentage,
                        amount: b.amount,
                        amountPEN: b.amountPEN || 0,
                        amountUSD: b.amountUSD || 0,
                        amountPercentage: b.amountPercentage,
                        color: b.color,
                        severity: b.severity
                    }));
                    data.byCompany = kpis.byCompany || [];
                    data.byAsegurado = kpis.byAsegurado || [];
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

        // Cobertura de gestión: % de cuentas vencidas que fueron gestionadas
        data.coberturaGestion = 0;
        if (typeof BitacoraService !== 'undefined' && data.agingDistribution.length > 0) {
            try {
                const gestiones = BitacoraService.obtenerGestiones({ limit: 5000 });
                const weekStartStr = weekAgo.toISOString().split('T')[0];
                const weekEndStr = today.toISOString().split('T')[0];

                // Cuentas únicas gestionadas esta semana
                const cuentasGestionadas = new Set();
                gestiones.forEach(g => {
                    if (!g.fechaRegistro) return;
                    const fecha = new Date(g.fechaRegistro).toISOString().split('T')[0];
                    if (fecha >= weekStartStr && fecha <= weekEndStr && g.asegurado) {
                        cuentasGestionadas.add(g.asegurado);
                    }
                });
                data.cuentasGestionadasSemana = cuentasGestionadas.size;

                // Total de cuentas vencidas (31+ días)
                const totalVencidas = data.agingDistribution
                    .filter(b => b.id !== 'CURRENT')
                    .reduce((sum, b) => sum + (b.count || 0), 0);
                data.totalCuentasVencidas = totalVencidas;
                data.coberturaGestion = totalVencidas > 0
                    ? parseFloat(((cuentasGestionadas.size / totalVencidas) * 100).toFixed(1))
                    : 0;

                // Intensidad de gestión: gestiones/cuenta
                data.intensidadGestion = cuentasGestionadas.size > 0
                    ? parseFloat((data.totalGestiones / cuentasGestionadas.size).toFixed(1))
                    : 0;
            } catch (e) {
                Logger.warn('ReportScheduler._collectWeeklyDataEnriched', 'Error calculando cobertura', e);
            }
        }

        // Top 10 asegurados con mayor deuda vencida (con desglose PEN/USD)
        data.topAsegurados = [];
        if (data.byAsegurado && data.byAsegurado.length > 0) {
            data.topAsegurados = data.byAsegurado.slice(0, 10);
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
        if (data.tasaCumplimiento > 0 && data.tasaCumplimiento > (parseFloat(lastWeek['Tasa Cumplimiento']) || 0)) {
            improvements.push(`Tasa de cumplimiento mejoró a ${data.tasaCumplimiento}%`);
        }
        if (data.casosCerradosPagados > 0) {
            improvements.push(`${data.casosCerradosPagados} caso(s) cerrado(s) pagado(s) esta semana`);
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

        // Agregar indicador de cobertura si es bajo
        if (summary.length < 3 && data.coberturaGestion > 0 && data.coberturaGestion < 50) {
            summary.push({
                type: 'negative',
                text: `Cobertura de gestión baja: solo ${data.coberturaGestion}% de cuentas vencidas fueron gestionadas`
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
        sheet.appendRow([data.fechaFormateada, data.gestionesAyer, data.ptpsPendientes, data.ptpsVencidos, data.alertasCriticas, data.alertasAltas, data.dso, data.porcentajeVencido, data.ciclosActivos]);
        this._trimSheet(sheet, 90);
        return `DAILY_${data.fechaFormateada}`;
    },

    _saveWeeklyReport(data) {
        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName(this.WEEKLY_SHEET);
        if (!sheet) {
            sheet = ss.insertSheet(this.WEEKLY_SHEET);
            sheet.getRange(1, 1, 1, 12).setValues([['Semana', 'Fecha Inicio', 'Fecha Fin', 'Casos Pagados', 'Compromisos Vencidos', 'Tasa Cumplimiento', 'DSO Promedio', 'Tendencia DSO', 'Monto Recuperado', '% Vencido', 'Total Gestiones', 'Compromisos Pendientes']]).setFontWeight('bold').setBackground('#e8f5e9');
            sheet.setFrozenRows(1);
        }
        sheet.appendRow([
            data.semana,
            new Date(data.fechaInicio).toLocaleDateString('es-PE'),
            new Date(data.fechaFin).toLocaleDateString('es-PE'),
            data.casosCerradosPagados || data.ptpsCumplidos,
            data.ptpsIncumplidos,
            data.tasaCumplimiento >= 0 ? data.tasaCumplimiento + '%' : 'N/D',
            data.dsoPromedio,
            data.tendenciaDSO,
            data.montoRecuperado,
            data.porcentajeVencido,
            data.totalGestiones,
            data.ptpsPendientes
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
        let agingHtml = data.agingDistribution && data.agingDistribution.length > 0
            ? kit.agingTable(data.agingDistribution, { showAmount: true })
            : '';
        // Nota: los montos en aging mezclan PEN y USD (no se pueden separar por bucket)
        if (agingHtml && data.byCurrency) {
            const pen = data.byCurrency.PEN || {};
            const usd = data.byCurrency.USD || {};
            if ((usd.total || 0) > 0) {
                agingHtml += `<div style="font-size:10px;color:#9E9E9E;margin-top:4px;padding:0 4px;">* Montos incluyen PEN y USD sin conversión. Cartera: ${kit.formatCurrency(pen.total, 'PEN')} + ${kit.formatCurrency(usd.total, 'USD')}</div>`;
            }
        }

        // 4. Performance por responsable
        const performanceHtml = data.performanceByResponsable && data.performanceByResponsable.length > 0
            ? kit.performanceTable(data.performanceByResponsable, { showTop: 5 })
            : '';

        // 5. Top Asegurados con mayor deuda (PEN/USD)
        const aseguradorasHtml = this._buildTopAseguradosSection(data, kit);

        // 6. Cobertura e intensidad de gestión
        const coberturaHtml = this._buildCoberturaSection(data, kit);

        // 7. Pipeline & Forecast mejorado
        const pipelineHtml = this._buildPipelineSection(data, kit);

        // 8. Acciones recomendadas
        const actionsHtml = data.recommendedActions && data.recommendedActions.length > 0
            ? kit.recommendedActions(data.recommendedActions)
            : '';

        // 9. CTAs
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
            ${aseguradorasHtml}
            ${kit.divider('16px')}
            ${performanceHtml}
            ${coberturaHtml}
            ${pipelineHtml}
            ${kit.divider('24px')}
            ${actionsHtml}
            ${ctasHtml}
        `;

        // Período formateado
        const periodoStr = `${kit.formatDate(data.fechaInicio)} - ${kit.formatDate(data.fechaFin)}`;

        // Preheader
        const tasaLabel = data.tasaCumplimiento >= 0 ? `Tasa ${data.tasaCumplimiento}%` : `${data.casosCerradosPagados || 0} pagados`;
        const preheader = `Semana ${data.semana}: ${tasaLabel}, DSO ${data.dsoPromedio}d, ${data.totalGestiones} gestiones, Cobertura ${data.coberturaGestion || 0}%`;

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

        // 1. Tasa Cumplimiento PTP o Casos Cerrados (según fuente de datos)
        if (data.tasaCumplimiento >= 0) {
            // Datos reales de PTPService
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
        } else {
            // Sin PTPService: mostrar casos cerrados pagados (dato real de Bitácora)
            const cerrados = data.casosCerradosPagados || 0;
            kpis.push({
                label: 'Casos Pagados',
                value: kit.formatInt(cerrados),
                delta: cerrados > 0
                    ? `<span style="color:#2E7D32;font-size:11px;">esta semana</span>`
                    : '',
                severity: cerrados > 0 ? 'OK' : 'NEUTRAL',
                icon: '✅'
            });
        }

        // 2. DSO Promedio
        const dsoLastWeek = lastWeek['DSO Promedio'] || null;
        const dsoSeverity = data.dsoPromedio <= data.dsoBenchmark ? 'OK' :
                          data.dsoPromedio <= data.dsoBenchmark + 10 ? 'WARN' : 'CRITICAL';
        kpis.push({
            label: 'DSO Promedio',
            value: `${data.dsoPromedio} días`,
            delta: kit.getDeltaDisplay(data.dsoPromedio, dsoLastWeek, { format: 'number' }),
            severity: dsoSeverity,
            benchmark: `${data.dsoBenchmark}d`,
            trend: data.tendenciaDSO
        });

        // 3. Monto Recuperado (PEN + USD separados)
        const recPEN = data.montoRecuperadoPEN || 0;
        const recUSD = data.montoRecuperadoUSD || 0;
        const recParts = [];
        if (recPEN > 0) recParts.push(kit.formatCurrency(recPEN, 'PEN'));
        if (recUSD > 0) recParts.push(kit.formatCurrency(recUSD, 'USD'));
        kpis.push({
            label: 'Monto Recuperado',
            value: recParts.length > 0 ? recParts.join(' + ') : 'S/. 0',
            severity: (recPEN + recUSD) > 0 ? 'OK' : 'NEUTRAL',
            icon: '💰'
        });

        // 4. % Cartera Vencida (desglose PEN/USD)
        const vencidoLastWeek = lastWeek['% Vencido'] || null;
        const vencidoSeverity = data.porcentajeVencido <= 15 ? 'OK' :
                               data.porcentajeVencido <= 25 ? 'WARN' : 'CRITICAL';
        const byCur = data.byCurrency || {};
        const penPct = byCur.PEN ? byCur.PEN.porcentajeVencido : null;
        const usdPct = byCur.USD ? byCur.USD.porcentajeVencido : null;
        const vencidoDetail = [];
        if (penPct != null && penPct > 0) vencidoDetail.push(`PEN: ${kit.formatPct(penPct)}`);
        if (usdPct != null && usdPct > 0) vencidoDetail.push(`USD: ${kit.formatPct(usdPct)}`);
        kpis.push({
            label: '% Cartera Vencida',
            value: kit.formatPct(data.porcentajeVencido),
            delta: vencidoDetail.length > 0
                ? `<span style="font-size:10px;color:#757575;">${vencidoDetail.join(' · ')}</span>`
                : kit.getDeltaDisplay(data.porcentajeVencido, vencidoLastWeek, { format: 'pct' }),
            severity: vencidoSeverity,
            icon: '📉'
        });

        // 5. Compromisos activos
        const totalCompromisos = (data.ptpsPendientes || 0) + (data.ptpsIncumplidos || 0);
        kpis.push({
            label: 'Compromisos Activos',
            value: kit.formatInt(totalCompromisos),
            delta: data.ptpsIncumplidos > 0
                ? `<span style="color:#C62828;font-size:11px;">${data.ptpsIncumplidos} vencido(s)</span>`
                : totalCompromisos > 0 ? `<span style="color:#2E7D32;font-size:11px;">${data.ptpsPendientes} pendiente(s)</span>` : '',
            severity: data.ptpsIncumplidos > 3 ? 'CRITICAL' : data.ptpsIncumplidos > 0 ? 'WARN' : 'OK',
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
     * Construye sección de Cartera por Aseguradora
     */
    _buildTopAseguradosSection(data, kit) {
        if (!data.topAsegurados || data.topAsegurados.length === 0) return '';

        let html = kit.sectionTitle('Top Asegurados con Mayor Deuda Vencida', '👤', `Top ${data.topAsegurados.length} por monto vencido`);

        const headers = [
            { label: 'Asegurado', align: 'left' },
            { label: 'Vencido PEN', align: 'right', width: '110px' },
            { label: 'Vencido USD', align: 'right', width: '110px' }
        ];

        const rows = data.topAsegurados.map(a => {
            return [
                `<strong style="font-size:12px;">${a.name}</strong>`,
                a.penVencido > 0
                    ? `<span style="color:#C62828;font-weight:600;">${kit.formatCurrency(a.penVencido, 'PEN')}</span>`
                    : '<span style="color:#9E9E9E;">—</span>',
                a.usdVencido > 0
                    ? `<span style="color:#C62828;font-weight:600;">${kit.formatCurrency(a.usdVencido, 'USD')}</span>`
                    : '<span style="color:#9E9E9E;">—</span>'
            ];
        });

        html += kit.dataTable({ headers, rows, compact: true });

        // Resumen total por moneda
        if (data.byCurrency) {
            const pen = data.byCurrency.PEN || {};
            const usd = data.byCurrency.USD || {};
            html += `
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:8px;background:#F5F5F5;border-radius:6px;">
                    <tr>
                        <td style="font-size:11px;color:#616161;padding:8px 12px;">
                            <strong>Cartera Total:</strong>
                            ${(pen.total || 0) > 0 ? `<span style="margin-left:8px;">🇵🇪 ${kit.formatCurrency(pen.total, 'PEN')} (vencido: ${kit.formatCurrency(pen.vencido, 'PEN')})</span>` : ''}
                            ${(usd.total || 0) > 0 ? `<span style="margin-left:8px;">🇺🇸 ${kit.formatCurrency(usd.total, 'USD')} (vencido: ${kit.formatCurrency(usd.vencido, 'USD')})</span>` : ''}
                        </td>
                    </tr>
                </table>
            `;
        }

        return html;
    },

    /**
     * Construye sección de Cobertura e Intensidad de Gestión
     */
    _buildCoberturaSection(data, kit) {
        if (!data.coberturaGestion && !data.intensidadGestion) return '';

        const coberturaColor = data.coberturaGestion >= 80 ? '#2E7D32' :
                              data.coberturaGestion >= 50 ? '#E65100' : '#C62828';
        const coberturaLabel = data.coberturaGestion >= 80 ? 'Excelente' :
                              data.coberturaGestion >= 50 ? 'Mejorable' : 'Insuficiente';

        return `
            ${kit.sectionTitle('Eficiencia Operativa', '⚡', 'Cobertura e intensidad de gestión semanal')}
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FAFAFA;border-radius:8px;border:1px solid #EEEEEE;">
                <tr>
                    <td style="padding:16px;text-align:center;border-right:1px solid #EEEEEE;" width="33%">
                        <div style="font-size:24px;font-weight:700;color:${coberturaColor};">${kit.formatPct(data.coberturaGestion)}</div>
                        <div style="font-size:11px;color:#757575;text-transform:uppercase;margin-top:4px;">Cobertura de Gestión</div>
                        <div style="font-size:10px;color:${coberturaColor};margin-top:2px;">${coberturaLabel}</div>
                    </td>
                    <td style="padding:16px;text-align:center;border-right:1px solid #EEEEEE;" width="33%">
                        <div style="font-size:24px;font-weight:700;color:#1565C0;">${data.intensidadGestion || 0}x</div>
                        <div style="font-size:11px;color:#757575;text-transform:uppercase;margin-top:4px;">Intensidad</div>
                        <div style="font-size:10px;color:#9E9E9E;margin-top:2px;">Gestiones/cuenta</div>
                    </td>
                    <td style="padding:16px;text-align:center;" width="33%">
                        <div style="font-size:24px;font-weight:700;color:#424242;">${kit.formatInt(data.cuentasGestionadasSemana || 0)}<span style="font-size:14px;color:#9E9E9E;">/${kit.formatInt(data.totalCuentasVencidas || 0)}</span></div>
                        <div style="font-size:11px;color:#757575;text-transform:uppercase;margin-top:4px;">Cuentas Gestionadas</div>
                        <div style="font-size:10px;color:#9E9E9E;margin-top:2px;">de cuentas vencidas</div>
                    </td>
                </tr>
            </table>
        `;
    },

    /**
     * Construye sección de Pipeline & Forecast mejorado
     */
    _buildPipelineSection(data, kit) {
        if (!data.ptpsPendientes && !data.montoComprometido) return '';

        const pipelineItems = [];

        if (data.ptpsPendientes > 0) {
            pipelineItems.push({
                label: 'PTPs Pendientes',
                value: data.ptpsPendientes,
                detail: 'compromisos activos'
            });
        }
        if (data.montoComprometido > 0) {
            pipelineItems.push({
                label: 'Monto Comprometido',
                value: kit.formatCurrency(data.montoComprometido),
                detail: 'en PTPs activos'
            });
        }

        // Proyección de cobro basada en tasa de recuperación
        let proyeccionHtml = '';
        if (data.montoComprometido > 0 && data.tasaRecuperacion > 0) {
            const proyeccion = data.montoComprometido * (data.tasaRecuperacion / 100);
            proyeccionHtml = `
                <tr>
                    <td style="padding:12px 16px;background:#E8F5E9;border-radius:0 0 8px 8px;border-top:1px dashed #4CAF50;">
                        <div style="font-size:12px;color:#2E7D32;">
                            <strong>📊 Proyección:</strong> Con tasa histórica de ${kit.formatPct(data.tasaRecuperacion)}, se estima recuperar
                            <strong>${kit.formatCurrency(proyeccion)}</strong> de los compromisos activos.
                        </div>
                    </td>
                </tr>
            `;
        } else if (data.tasaRecuperacion > 0) {
             proyeccionHtml = `
                <tr>
                    <td style="padding:12px 16px;background:#F5F5F5;border-radius:0 0 8px 8px;border-top:1px solid #EEEEEE;">
                        <div style="font-size:12px;color:#616161;">
                            Tasa de recuperación histórica: <strong>${kit.formatPct(data.tasaRecuperacion)}</strong>
                        </div>
                    </td>
                </tr>
            `;
        }

        return `
            ${kit.sectionTitle('Pipeline de Cobranza', '🔄', 'Estado actual y proyección')}
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F5F5F5;border-radius:8px;">
                <tr>
                    <td style="padding:16px;">
                        ${pipelineItems.map(item => `
                            <div style="margin-bottom:8px;font-size:14px;color:#424242;">
                                <strong>${item.value}</strong> ${item.detail}
                            </div>
                        `).join('')}
                    </td>
                </tr>
                ${proyeccionHtml}
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

/**
 * TEST: Enviar reporte diario solo a mi correo
 * Ejecutar manualmente desde el editor de Apps Script
 */
function TEST_sendDailyToMe() {
    const myEmail = 'csarapura@transperuana.com.pe';
    try {
        const summaryData = ReportScheduler._collectDailyData();
        const enrichedData = EmailAutomation._enrichDailyData(summaryData);
        const html = EmailAutomation._buildDailySummaryEmailPro(enrichedData);

        const fecha = new Date().toLocaleDateString('es-PE', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        MailApp.sendEmail({
            to: myEmail,
            subject: `[TEST] Resumen Diario de Cobranzas - ${fecha}`,
            htmlBody: html,
            name: 'Portal de Cobranzas'
        });

        return { ok: true, sentTo: myEmail, sizeKB: (html.length / 1024).toFixed(2) };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

/**
 * TEST: Enviar reporte semanal solo a mi correo
 * Ejecutar manualmente desde el editor de Apps Script
 */
function TEST_sendWeeklyToMe() {
    const myEmail = 'csarapura@transperuana.com.pe';
    try {
        const weeklyData = ReportScheduler._collectWeeklyDataEnriched();
        const html = ReportScheduler._buildWeeklyReportEmailPro(weeklyData);

        MailApp.sendEmail({
            to: myEmail,
            subject: `[TEST] Reporte Semanal de Cobranzas - Semana ${weeklyData.semana} · ${weeklyData.year}`,
            htmlBody: html,
            name: 'Portal de Cobranzas'
        });

        return { ok: true, sentTo: myEmail, sizeKB: (html.length / 1024).toFixed(2) };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}
