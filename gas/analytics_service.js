/**
 * @fileoverview AnalyticsService - Fase 4 Analytics & Reporting
 * @version 1.0.0
 * FEATURE FLAG: FEATURES.ENABLE_ANALYTICS_SERVICE
 */

const AnalyticsService = {
    CACHE_PREFIX: 'ANALYTICS_',
    CACHE_TTL: 600,
    PERIODS: { DAILY: 'DAILY', WEEKLY: 'WEEKLY', MONTHLY: 'MONTHLY', QUARTERLY: 'QUARTERLY', YEARLY: 'YEARLY' },

    getTrendAnalysis(options = {}) {
        const context = 'AnalyticsService.getTrendAnalysis';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const periodo = options.periodo || this.PERIODS.MONTHLY;
            const cacheKey = `${this.CACHE_PREFIX}TREND_${periodo}`;

            if (!options.forceRefresh && typeof CacheHelper !== 'undefined') {
                const cached = CacheHelper.get(cacheKey);
                if (cached) return { ...cached, fromCache: true };
            }

            Logger.info(context, 'Calculando tendencias...', { periodo });

            const result = { ok: true, timestamp: new Date().toISOString(), periodo: periodo, trends: [], comparativa: {}, insights: [] };
            const datos = this._getHistoricalData(options);
            result.trends = this._calculateTrends(datos, periodo);
            result.comparativa = this._calculateComparativa(result.trends);
            result.insights = this._generateInsights(result.trends, result.comparativa);

            if (typeof CacheHelper !== 'undefined') CacheHelper.set(cacheKey, result, this.CACHE_TTL);
            return result;
        } catch (error) {
            Logger.error(context, 'Error en análisis de tendencias', error);
            return { ok: false, error: error.message };
        }
    },

    getPerformanceByResponsable(options = {}) {
        const context = 'AnalyticsService.getPerformanceByResponsable';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const cacheKey = `${this.CACHE_PREFIX}PERFORMANCE_RESP`;
            if (!options.forceRefresh && typeof CacheHelper !== 'undefined') {
                const cached = CacheHelper.get(cacheKey);
                if (cached) return { ...cached, fromCache: true };
            }

            Logger.info(context, 'Calculando performance por responsable...');
            const result = { ok: true, timestamp: new Date().toISOString(), responsables: [], ranking: [], promedioGlobal: {} };

            const gestiones = this._getGestionesData(options);
            const ptps = this._getPTPsData(options);
            const porResponsable = this._groupBy(gestiones, 'responsable');
            const ptpsPorResponsable = this._groupBy(ptps, 'responsable');

            for (const [responsable, gestionesResp] of Object.entries(porResponsable)) {
                if (!responsable || responsable === 'undefined') continue;
                const ptpsResp = ptpsPorResponsable[responsable] || [];
                const ptpsCumplidos = ptpsResp.filter(p => p.estado === 'CUMPLIDO' || p.estado === 'CUMPLIDO_PARCIAL');

                const metrics = {
                    responsable, totalGestiones: gestionesResp.length, gestionesPorDia: this._calcularPromedioDiario(gestionesResp),
                    totalPTPs: ptpsResp.length, ptpsCumplidos: ptpsCumplidos.length,
                    tasaCumplimiento: ptpsResp.length > 0 ? ((ptpsCumplidos.length / ptpsResp.length) * 100).toFixed(1) : 0,
                    montoRecuperado: ptpsCumplidos.reduce((sum, p) => sum + (p.montoPagado || 0), 0), efectividad: 0
                };
                metrics.efectividad = this._calcularEfectividad(metrics);
                result.responsables.push(metrics);
            }

            result.ranking = [...result.responsables].sort((a, b) => b.efectividad - a.efectividad).map((r, idx) => ({ ...r, posicion: idx + 1 }));
            result.promedioGlobal = this._calcularPromediosGlobales(result.responsables);

            if (typeof CacheHelper !== 'undefined') CacheHelper.set(cacheKey, result, this.CACHE_TTL);
            return result;
        } catch (error) {
            Logger.error(context, 'Error en performance', error);
            return { ok: false, error: error.message };
        }
    },

    getAnalysisByCIA(options = {}) {
        const context = 'AnalyticsService.getAnalysisByCIA';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const cacheKey = `${this.CACHE_PREFIX}CIA_ANALYSIS`;
            if (!options.forceRefresh && typeof CacheHelper !== 'undefined') {
                const cached = CacheHelper.get(cacheKey);
                if (cached) return { ...cached, fromCache: true };
            }

            Logger.info(context, 'Calculando análisis por CIA...');
            const result = { ok: true, timestamp: new Date().toISOString(), porCIA: [], porMoneda: { PEN: { count: 0, monto: 0 }, USD: { count: 0, monto: 0 } }, concentracion: {} };

            if (typeof KPIService !== 'undefined') {
                const kpis = KPIService.getDashboardKPIs({ forceRefresh: options.forceRefresh });
                if (kpis.ok && kpis.available) {
                    result.porCIA = kpis.distribution?.topCompanies || [];
                    result.porMoneda = kpis.distribution?.byMoney || result.porMoneda;
                }
            }

            if (result.porCIA.length > 0) {
                const totalMonto = result.porCIA.reduce((sum, c) => sum + (c.amount || 0), 0);
                const top3Monto = result.porCIA.slice(0, 3).reduce((sum, c) => sum + (c.amount || 0), 0);
                result.concentracion = {
                    top3Percentage: totalMonto > 0 ? ((top3Monto / totalMonto) * 100).toFixed(1) : 0,
                    herfindahlIndex: this._calcularHerfindahl(result.porCIA),
                    riesgoConcentracion: top3Monto / totalMonto > 0.7 ? 'ALTO' : top3Monto / totalMonto > 0.5 ? 'MEDIO' : 'BAJO'
                };
            }

            if (typeof CacheHelper !== 'undefined') CacheHelper.set(cacheKey, result, this.CACHE_TTL);
            return result;
        } catch (error) {
            Logger.error(context, 'Error en análisis por CIA', error);
            return { ok: false, error: error.message };
        }
    },

    getRecaudoForecast(diasProyeccion = 30) {
        const context = 'AnalyticsService.getRecaudoForecast';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            Logger.info(context, 'Calculando proyección...', { dias: diasProyeccion });
            const result = { ok: true, timestamp: new Date().toISOString(), diasProyeccion, proyeccion: { montoEsperado: 0, montoOptimista: 0, montoPesimista: 0 }, desglose: [], confianza: 'MEDIA', factores: [] };

            if (typeof PTPService !== 'undefined') {
                const ptpsPendientes = PTPService.getPTPsPendientes();
                const metricas = PTPService.getMetricasCumplimiento();
                const tasaCumplimiento = metricas.ok ? parseFloat(metricas.tasaCumplimiento) / 100 : 0.5;

                const hoy = new Date();
                const limite = new Date(); limite.setDate(limite.getDate() + diasProyeccion);
                const ptpsEnPeriodo = ptpsPendientes.filter(p => { const fecha = new Date(p.fechaCompromiso); return fecha >= hoy && fecha <= limite; });
                const montoTotal = ptpsEnPeriodo.reduce((sum, p) => sum + (p.montoComprometido || 0), 0);

                result.proyeccion.montoEsperado = montoTotal * tasaCumplimiento;
                result.proyeccion.montoOptimista = montoTotal * Math.min(tasaCumplimiento * 1.2, 1);
                result.proyeccion.montoPesimista = montoTotal * tasaCumplimiento * 0.7;
                result.desglose = this._desglosePorSemana(ptpsEnPeriodo, tasaCumplimiento);
                result.confianza = ptpsEnPeriodo.length > 20 ? 'ALTA' : ptpsEnPeriodo.length > 5 ? 'MEDIA' : 'BAJA';
                result.factores = [{ factor: 'Tasa histórica', valor: `${(tasaCumplimiento * 100).toFixed(0)}%` }, { factor: 'PTPs en periodo', valor: ptpsEnPeriodo.length }, { factor: 'Monto total', valor: montoTotal }];
            }
            return result;
        } catch (error) {
            Logger.error(context, 'Error en proyección', error);
            return { ok: false, error: error.message };
        }
    },

    getPeriodComparison(periodo1, periodo2) {
        const context = 'AnalyticsService.getPeriodComparison';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };
        try {
            const result = { ok: true, timestamp: new Date().toISOString(), periodo1: { ...periodo1, metricas: {} }, periodo2: { ...periodo2, metricas: {} }, variaciones: {} };
            result.periodo1.metricas = this._calcularMetricasPeriodo(periodo1);
            result.periodo2.metricas = this._calcularMetricasPeriodo(periodo2);
            const m1 = result.periodo1.metricas, m2 = result.periodo2.metricas;
            result.variaciones = { gestiones: this._calcularVariacion(m1.totalGestiones, m2.totalGestiones), ptpsCumplidos: this._calcularVariacion(m1.ptpsCumplidos, m2.ptpsCumplidos), montoRecuperado: this._calcularVariacion(m1.montoRecuperado, m2.montoRecuperado) };
            return result;
        } catch (error) {
            Logger.error(context, 'Error en comparación', error);
            return { ok: false, error: error.message };
        }
    },

    invalidateCache() { if (typeof CacheHelper !== 'undefined') CacheHelper.removeByPrefix(this.CACHE_PREFIX); Logger.info('AnalyticsService.invalidateCache', 'Cache invalidado'); },

    _isEnabled() { return getConfig('FEATURES.ENABLE_ANALYTICS_SERVICE', true); },

    _getHistoricalData(options) {
        const datos = [];
        if (typeof BitacoraService !== 'undefined') {
            try { const gestiones = BitacoraService.obtenerGestiones({ limit: 5000 }); gestiones.forEach(g => { datos.push({ fecha: g.fechaRegistro, tipo: 'gestion', asegurado: g.asegurado, responsable: g.responsable }); }); } catch (e) { }
        }
        return datos;
    },

    _getGestionesData(options) { if (typeof BitacoraService !== 'undefined') { try { return BitacoraService.obtenerGestiones({ limit: 5000 }); } catch (e) { } } return []; },

    _getPTPsData(options) {
        if (typeof PTPService !== 'undefined') {
            try {
                const sheet = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID')).getSheetByName('PTP_Compromisos');
                if (sheet) { const data = sheet.getDataRange().getValues(); return data.slice(1).map(row => ({ idPTP: row[0], responsable: row[5], montoComprometido: row[6], estado: row[9], montoPagado: row[11] })); }
            } catch (e) { }
        }
        return [];
    },

    _calculateTrends(datos, periodo) {
        const trends = [], agrupado = {};
        datos.forEach(d => {
            if (!d.fecha) return;
            const fecha = new Date(d.fecha);
            let key;
            switch (periodo) {
                case this.PERIODS.DAILY: key = fecha.toISOString().split('T')[0]; break;
                case this.PERIODS.WEEKLY: key = `${fecha.getFullYear()}-W${this._getWeekNumber(fecha)}`; break;
                case this.PERIODS.MONTHLY: key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`; break;
                default: key = fecha.toISOString().split('T')[0];
            }
            agrupado[key] = agrupado[key] || { count: 0, asegurados: new Set() };
            agrupado[key].count++;
            if (d.asegurado) agrupado[key].asegurados.add(d.asegurado);
        });
        Object.entries(agrupado).sort((a, b) => a[0].localeCompare(b[0])).forEach(([periodo, data]) => { trends.push({ periodo, gestiones: data.count, clientesUnicos: data.asegurados.size }); });
        return trends.slice(-12);
    },

    _calculateComparativa(trends) {
        if (trends.length < 2) return {};
        const actual = trends[trends.length - 1], anterior = trends[trends.length - 2];
        return { periodoActual: actual.periodo, periodoAnterior: anterior.periodo, variacionGestiones: this._calcularVariacion(actual.gestiones, anterior.gestiones), variacionClientes: this._calcularVariacion(actual.clientesUnicos, anterior.clientesUnicos) };
    },

    _generateInsights(trends, comparativa) {
        const insights = [];
        if (comparativa.variacionGestiones) {
            const var_ = parseFloat(comparativa.variacionGestiones.porcentaje);
            if (var_ > 20) insights.push({ tipo: 'POSITIVO', mensaje: `Gestiones +${var_.toFixed(0)}% vs periodo anterior`, icono: '📈' });
            else if (var_ < -20) insights.push({ tipo: 'ALERTA', mensaje: `Gestiones ${var_.toFixed(0)}% vs periodo anterior`, icono: '📉' });
        }
        if (trends.length >= 3) {
            const ultimos3 = trends.slice(-3);
            const tendencia = ultimos3[2].gestiones > ultimos3[0].gestiones ? 'creciente' : 'decreciente';
            insights.push({ tipo: 'INFO', mensaje: `Tendencia ${tendencia} en últimos 3 periodos`, icono: tendencia === 'creciente' ? '↗️' : '↘️' });
        }
        return insights;
    },

    _calcularPromedioDiario(gestiones) { if (gestiones.length === 0) return 0; const fechas = gestiones.map(g => new Date(g.fechaRegistro).toISOString().split('T')[0]); const diasUnicos = new Set(fechas).size; return diasUnicos > 0 ? (gestiones.length / diasUnicos).toFixed(1) : 0; },
    _calcularEfectividad(m) { const tasaNorm = parseFloat(m.tasaCumplimiento) || 0; const gNorm = Math.min(parseFloat(m.gestionesPorDia) * 10, 100); const mNorm = Math.min(m.montoRecuperado / 10000, 100); return ((tasaNorm * 0.4) + (gNorm * 0.3) + (mNorm * 0.3)).toFixed(1); },
    _calcularPromediosGlobales(responsables) { if (responsables.length === 0) return {}; const n = responsables.length, suma = responsables.reduce((acc, r) => ({ gestiones: acc.gestiones + r.totalGestiones, gDia: acc.gDia + parseFloat(r.gestionesPorDia), tasa: acc.tasa + parseFloat(r.tasaCumplimiento), efect: acc.efect + parseFloat(r.efectividad) }), { gestiones: 0, gDia: 0, tasa: 0, efect: 0 }); return { promedioGestiones: (suma.gestiones / n).toFixed(0), promedioGestionesDia: (suma.gDia / n).toFixed(1), promedioTasaCumplimiento: (suma.tasa / n).toFixed(1), promedioEfectividad: (suma.efect / n).toFixed(1) }; },
    _calcularHerfindahl(companies) { if (companies.length === 0) return 0; const total = companies.reduce((s, c) => s + (c.amount || 0), 0); if (total === 0) return 0; return (companies.reduce((s, c) => { const share = (c.amount || 0) / total; return s + (share * share); }, 0) * 10000).toFixed(0); },
    _desglosePorSemana(ptps, tasa) { const semanas = {}, hoy = new Date(); ptps.forEach(p => { const fecha = new Date(p.fechaCompromiso), diff = Math.floor((fecha - hoy) / (1000 * 60 * 60 * 24)), semana = Math.floor(diff / 7) + 1, key = `Semana ${semana}`; semanas[key] = semanas[key] || { monto: 0, count: 0 }; semanas[key].monto += (p.montoComprometido || 0); semanas[key].count++; }); return Object.entries(semanas).map(([s, d]) => ({ semana: s, montoComprometido: d.monto, montoEsperado: d.monto * tasa, cantidadPTPs: d.count })); },
    _calcularMetricasPeriodo(p) { return { totalGestiones: 0, ptpsCumplidos: 0, montoRecuperado: 0, dso: 0, tasaCumplimiento: 0 }; },
    _calcularVariacion(actual, anterior) { if (!anterior || anterior === 0) return { absoluta: actual || 0, porcentaje: 0, tendencia: 'stable' }; const abs = (actual || 0) - anterior, pct = ((abs / anterior) * 100); return { absoluta: abs.toFixed(2), porcentaje: pct.toFixed(1), tendencia: pct > 5 ? 'up' : pct < -5 ? 'down' : 'stable' }; },
    _groupBy(array, key) { return array.reduce((g, i) => { const v = i[key] || 'unknown'; g[v] = g[v] || []; g[v].push(i); return g; }, {}); },
    _getWeekNumber(d) { const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dayNum = dt.getUTCDay() || 7; dt.setUTCDate(dt.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1)); return Math.ceil((((dt - yearStart) / 86400000) + 1) / 7); }
};

function getTrendAnalysis_API(options) { return AnalyticsService.getTrendAnalysis(options || {}); }
function getPerformanceByResponsable_API(options) { return AnalyticsService.getPerformanceByResponsable(options || {}); }
function getAnalysisByCIA_API(options) { return AnalyticsService.getAnalysisByCIA(options || {}); }
function getRecaudoForecast_API(dias) { return AnalyticsService.getRecaudoForecast(dias || 30); }
function getPeriodComparison_API(p1, p2) { return AnalyticsService.getPeriodComparison(p1, p2); }
function invalidateAnalyticsCache_API() { AnalyticsService.invalidateCache(); return { ok: true }; }
