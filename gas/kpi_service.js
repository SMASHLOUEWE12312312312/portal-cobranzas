/**
 * @fileoverview KPIService - Fase 1 Enterprise Foundations
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * @lastModified 2026-01-15
 * 
 * KPIs IMPLEMENTADOS:
 * - DSO (Days Sales Outstanding)
 * - Aging Buckets (0-30, 31-60, 61-90, 90+)
 * - % Cartera Vencida
 * - Distribución por CIA
 * - Distribución por Moneda
 * 
 * FEATURE FLAG: FEATURES.ENABLE_KPI_DASHBOARD
 */

const KPIService = {
    CACHE_KEY: 'KPI_DASHBOARD_V1',
    CACHE_TTL: 300,

    AGING_BUCKETS: [
        { id: 'CURRENT', label: 'Corriente (0-30)', min: 0, max: 30, color: '#4CAF50', severity: 'ok' },
        { id: 'BUCKET_31_60', label: '31-60 días', min: 31, max: 60, color: '#FFC107', severity: 'warn' },
        { id: 'BUCKET_61_90', label: '61-90 días', min: 61, max: 90, color: '#FF9800', severity: 'high' },
        { id: 'BUCKET_90_PLUS', label: '90+ días', min: 91, max: 9999, color: '#F44336', severity: 'critical' }
    ],

    getDashboardKPIs(forceRefresh = false) {
        const context = 'KPIService.getDashboardKPIs';

        if (!this._isEnabled()) {
            return { ok: false, available: false, reason: 'Feature disabled' };
        }

        if (!forceRefresh && typeof CacheHelper !== 'undefined') {
            const cached = CacheHelper.get(this.CACHE_KEY);
            if (cached) {
                cached.fromCache = true;
                return cached;
            }
        }

        try {
            Logger.info(context, 'Calculando KPIs...');
            const startTime = Date.now();

            const bdData = SheetsIO.readSheet(getConfig('SHEETS.BASE', 'BD'));
            if (!bdData || !bdData.rows || bdData.rows.length === 0) {
                return { ok: true, available: false, reason: 'No hay datos en BD' };
            }

            const kpis = {
                ok: true,
                available: true,
                timestamp: new Date().toISOString(),
                fromCache: false,
                calculationMs: 0,
                summary: {
                    totalRegistros: bdData.rows.length,
                    totalAsegurados: 0,
                    totalMonto: 0,
                    totalVencido: 0,
                    porcentajeVencido: 0,
                    montoPromedio: 0
                },
                aging: {
                    buckets: [],
                    distribution: [],
                    healthStatus: 'OK'
                },
                byCompany: [],
                byAsegurado: [],
                byCurrency: {
                    PEN: { count: 0, total: 0, vencido: 0 },
                    USD: { count: 0, total: 0, vencido: 0 }
                },
                dso: {
                    value: 0,
                    trend: 'stable',
                    benchmark: getConfig('KPI.DSO_BENCHMARK', 35),
                    status: 'OK'
                },
                alerts: []
            };

            const colMap = bdData.columnMap;
            const aseguradoIdx = colMap['ASEGURADO'] ?? -1;
            const ciaIdx = colMap['CIA'] ?? -1;
            const importeIdx = colMap['IMPORTE'] ?? -1;
            const monIdx = colMap['MON'] ?? -1;
            
            // Buscar columna de fecha de vencimiento de forma flexible
            // El header original es "FEC_VENCIMIENTO COB" que se normaliza a "FEC VENCIMIENTO COB"
            let fecVencIdx = -1;
            const fecVencVariants = [
                'FEC VENCIMIENTO COB',
                'FEC_VENCIMIENTO COB', 
                'FEC_VENCIMIENTO_COB',
                'FECHA VENCIMIENTO COB',
                'FECHA VENCIMIENTO',
                'FEC VENC',
                'VENCIMIENTO'
            ];
            
            // Buscar directamente en colMap
            for (const variant of fecVencVariants) {
                if (colMap[variant] !== undefined) {
                    fecVencIdx = colMap[variant];
                    break;
                }
            }
            
            // Si no encontramos, buscar por coincidencia parcial
            if (fecVencIdx === -1) {
                const colKeys = Object.keys(colMap);
                const fecVencKey = colKeys.find(k => 
                    k.includes('VENCIMIENTO') && k.includes('COB')
                );
                if (fecVencKey) {
                    fecVencIdx = colMap[fecVencKey];
                    Logger.info(context, 'Columna fecha vencimiento encontrada por coincidencia', { 
                        columna: fecVencKey, 
                        index: fecVencIdx 
                    });
                }
            }
            
            // Log para debugging
            if (fecVencIdx === -1) {
                Logger.warn(context, 'Columna de fecha vencimiento NO encontrada', { 
                    columnasDisponibles: Object.keys(colMap).join(', ')
                });
            } else {
                Logger.debug(context, 'Columnas encontradas', {
                    asegurado: aseguradoIdx,
                    cia: ciaIdx,
                    importe: importeIdx,
                    mon: monIdx,
                    fecVenc: fecVencIdx
                });
            }

            const aseguradosSet = new Set();
            const ciaMap = {};
            const aseguradoMap = {};
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const bucketCounts = {};
            const bucketAmounts = {};
            const bucketAmountsPEN = {};
            const bucketAmountsUSD = {};
            this.AGING_BUCKETS.forEach(b => {
                bucketCounts[b.id] = 0;
                bucketAmounts[b.id] = 0;
                bucketAmountsPEN[b.id] = 0;
                bucketAmountsUSD[b.id] = 0;
            });

            let sumDiasMora = 0;
            let sumImportes = 0;
            let validRowCount = 0;

            bdData.rows.forEach(row => {
                const importe = this._parseNumber(row[importeIdx]);
                // Ignorar registros con importe <= 0 o vacío
                if (!importe || importe <= 0) return;

                const asegurado = String(row[aseguradoIdx] || '').trim();
                if (asegurado) aseguradosSet.add(asegurado);

                validRowCount++;
                kpis.summary.totalMonto += importe;

                const moneda = String(row[monIdx] || 'PEN').toUpperCase();
                const monKey = moneda.includes('USD') || moneda.includes('US$') || moneda.includes('DOLAR') ? 'USD' : 'PEN';
                kpis.byCurrency[monKey].count++;
                kpis.byCurrency[monKey].total += importe;

                const cia = String(row[ciaIdx] || 'Sin CIA').trim();
                if (!ciaMap[cia]) {
                    ciaMap[cia] = { count: 0, total: 0, vencido: 0 };
                }
                ciaMap[cia].count++;
                ciaMap[cia].total += importe;

                // Tracking por asegurado con desglose PEN/USD
                if (asegurado) {
                    if (!aseguradoMap[asegurado]) {
                        aseguradoMap[asegurado] = { penTotal: 0, penVencido: 0, usdTotal: 0, usdVencido: 0, count: 0 };
                    }
                    aseguradoMap[asegurado].count++;
                    if (monKey === 'USD') {
                        aseguradoMap[asegurado].usdTotal += importe;
                    } else {
                        aseguradoMap[asegurado].penTotal += importe;
                    }
                }

                const fecVenc = this._parseDate(row[fecVencIdx]);
                let diasMora = 0;
                let isVencido = false;

                if (fecVenc) {
                    diasMora = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                    isVencido = diasMora > 0;

                    // DSO solo sobre documentos vencidos
                    if (isVencido) {
                        sumDiasMora += diasMora * importe;
                        sumImportes += importe;
                    }
                }

                if (isVencido) {
                    kpis.summary.totalVencido += importe;
                    kpis.byCurrency[monKey].vencido += importe;
                    ciaMap[cia].vencido += importe;
                    if (asegurado && aseguradoMap[asegurado]) {
                        if (monKey === 'USD') {
                            aseguradoMap[asegurado].usdVencido += importe;
                        } else {
                            aseguradoMap[asegurado].penVencido += importe;
                        }
                    }
                }

                const bucket = this._getBucket(diasMora);
                bucketCounts[bucket.id]++;
                bucketAmounts[bucket.id] += importe;
                if (monKey === 'USD') {
                    bucketAmountsUSD[bucket.id] += importe;
                } else {
                    bucketAmountsPEN[bucket.id] += importe;
                }
            });

            kpis.summary.totalRegistros = validRowCount;
            kpis.summary.totalAsegurados = aseguradosSet.size;
            kpis.summary.porcentajeVencido = kpis.summary.totalMonto > 0
                ? parseFloat((kpis.summary.totalVencido / kpis.summary.totalMonto * 100).toFixed(2))
                : 0;
            kpis.summary.montoPromedio = kpis.summary.totalRegistros > 0
                ? parseFloat((kpis.summary.totalMonto / kpis.summary.totalRegistros).toFixed(2))
                : 0;

            // Porcentaje vencido por moneda
            ['PEN', 'USD'].forEach(cur => {
                const c = kpis.byCurrency[cur];
                c.porcentajeVencido = c.total > 0
                    ? parseFloat((c.vencido / c.total * 100).toFixed(2))
                    : 0;
            });

            const totalPEN = kpis.byCurrency.PEN.total;
            const totalUSD = kpis.byCurrency.USD.total;

            kpis.aging.buckets = this.AGING_BUCKETS.map(b => {
                const pctPEN = totalPEN > 0
                    ? parseFloat((bucketAmountsPEN[b.id] / totalPEN * 100).toFixed(1))
                    : 0;
                const pctUSD = totalUSD > 0
                    ? parseFloat((bucketAmountsUSD[b.id] / totalUSD * 100).toFixed(1))
                    : 0;
                return {
                    ...b,
                    count: bucketCounts[b.id],
                    amount: bucketAmounts[b.id],
                    amountPEN: bucketAmountsPEN[b.id],
                    amountUSD: bucketAmountsUSD[b.id],
                    percentage: kpis.summary.totalRegistros > 0
                        ? parseFloat((bucketCounts[b.id] / kpis.summary.totalRegistros * 100).toFixed(1))
                        : 0,
                    amountPercentage: kpis.summary.totalMonto > 0
                        ? parseFloat((bucketAmounts[b.id] / kpis.summary.totalMonto * 100).toFixed(1))
                        : 0,
                    amountPercentagePEN: pctPEN,
                    amountPercentageUSD: pctUSD
                };
            });

            const bucket90Data = kpis.aging.buckets.find(b => b.id === 'BUCKET_90_PLUS');
            const bucket6190Data = kpis.aging.buckets.find(b => b.id === 'BUCKET_61_90');
            const criticalPct = Math.max(bucket90Data?.amountPercentagePEN || 0, bucket90Data?.amountPercentageUSD || 0);
            const warnPct = Math.max(bucket6190Data?.amountPercentagePEN || 0, bucket6190Data?.amountPercentageUSD || 0);
            if (criticalPct > 10) {
                kpis.aging.healthStatus = 'CRITICAL';
                kpis.alerts.push({ type: 'AGING', severity: 'CRITICAL', message: `${criticalPct}% del monto en 90+ días` });
            } else if (warnPct > 15 || criticalPct > 5) {
                kpis.aging.healthStatus = 'WARN';
                kpis.alerts.push({ type: 'AGING', severity: 'WARN', message: 'Incremento en monto de cartera vencida' });
            }

            kpis.byCompany = Object.keys(ciaMap)
                .map(cia => ({
                    name: cia,
                    ...ciaMap[cia],
                    vencidoPct: ciaMap[cia].total > 0
                        ? parseFloat((ciaMap[cia].vencido / ciaMap[cia].total * 100).toFixed(1))
                        : 0
                }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            // Top asegurados por monto vencido total (PEN+USD) con desglose por moneda
            kpis.byAsegurado = Object.keys(aseguradoMap)
                .filter(name => {
                    const a = aseguradoMap[name];
                    return (a.penVencido + a.usdVencido) > 0;
                })
                .map(name => ({
                    name: name,
                    ...aseguradoMap[name],
                    totalVencido: aseguradoMap[name].penVencido + aseguradoMap[name].usdVencido
                }))
                .sort((a, b) => b.totalVencido - a.totalVencido)
                .slice(0, 20);

            kpis.dso.value = sumImportes > 0 ? Math.round(sumDiasMora / sumImportes) : 0;
            kpis.dso.trend = kpis.dso.value > kpis.dso.benchmark + 5 ? 'up' :
                kpis.dso.value < kpis.dso.benchmark - 5 ? 'down' : 'stable';
            kpis.dso.status = kpis.dso.value > kpis.dso.benchmark + 10 ? 'CRITICAL' :
                kpis.dso.value > kpis.dso.benchmark ? 'WARN' : 'OK';

            if (kpis.dso.status !== 'OK') {
                kpis.alerts.push({
                    type: 'DSO',
                    severity: kpis.dso.status,
                    message: `DSO de ${kpis.dso.value} días (benchmark: ${kpis.dso.benchmark})`
                });
            }

            const vencidoWarn = getConfig('KPI.VENCIDO_THRESHOLD_WARN', 15);
            const vencidoError = getConfig('KPI.VENCIDO_THRESHOLD_ERROR', 25);
            if (kpis.summary.porcentajeVencido > vencidoError) {
                kpis.alerts.push({
                    type: 'VENCIDO',
                    severity: 'CRITICAL',
                    message: `${kpis.summary.porcentajeVencido}% de cartera vencida`
                });
            } else if (kpis.summary.porcentajeVencido > vencidoWarn) {
                kpis.alerts.push({
                    type: 'VENCIDO',
                    severity: 'WARN',
                    message: `${kpis.summary.porcentajeVencido}% de cartera vencida`
                });
            }

            kpis.calculationMs = Date.now() - startTime;

            if (typeof CacheHelper !== 'undefined') {
                const ttl = getConfig('KPI.CACHE_TTL_SECONDS', this.CACHE_TTL);
                CacheHelper.set(this.CACHE_KEY, kpis, ttl);
            }

            Logger.info(context, 'KPIs calculados', {
                registros: kpis.summary.totalRegistros,
                ms: kpis.calculationMs
            });

            return kpis;

        } catch (error) {
            Logger.error(context, 'Error calculando KPIs', error);
            return { ok: false, error: error.message };
        }
    },

    getAgingDistribution() {
        const kpis = this.getDashboardKPIs();
        if (!kpis.ok || !kpis.available) return [];
        return kpis.aging.buckets;
    },

    getTopCompanies(top = 10) {
        const kpis = this.getDashboardKPIs();
        if (!kpis.ok || !kpis.available) return [];
        return kpis.byCompany.slice(0, top);
    },

    getSummary() {
        const kpis = this.getDashboardKPIs();
        if (!kpis.ok || !kpis.available) {
            return { ok: false, available: kpis.available, reason: kpis.reason };
        }
        return {
            ok: true,
            summary: kpis.summary,
            dso: kpis.dso,
            alerts: kpis.alerts,
            fromCache: kpis.fromCache
        };
    },

    invalidateCache() {
        if (typeof CacheHelper !== 'undefined') {
            CacheHelper.remove(this.CACHE_KEY);
        }
        Logger.info('KPIService.invalidateCache', 'Cache invalidado');
    },

    _isEnabled() {
        return getConfig('FEATURES.ENABLE_KPI_DASHBOARD', true);
    },

    _parseNumber(value) {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        const cleaned = String(value).replace(/[^\d.-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    },

    _parseDate(value) {
        if (!value) return null;
        
        // Si ya es Date, retornar directamente
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }
        
        // Si es número (serial de Excel/Sheets), convertir
        if (typeof value === 'number') {
            // Excel/Sheets serial date: días desde 1899-12-30
            const excelEpoch = new Date(1899, 11, 30);
            const d = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
            return isNaN(d.getTime()) ? null : d;
        }
        
        try {
            const str = String(value).trim();
            
            // Intentar formato dd/mm/yyyy o dd-mm-yyyy
            const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
            if (ddmmyyyy) {
                const d = new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
                return isNaN(d.getTime()) ? null : d;
            }
            
            // Intentar formato yyyy-mm-dd
            const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
            if (yyyymmdd) {
                const d = new Date(parseInt(yyyymmdd[1]), parseInt(yyyymmdd[2]) - 1, parseInt(yyyymmdd[3]));
                return isNaN(d.getTime()) ? null : d;
            }
            
            // Fallback: intentar parseo nativo
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        } catch (e) {
            return null;
        }
    },

    _getBucket(diasMora) {
        if (diasMora < 0) diasMora = 0;

        for (const bucket of this.AGING_BUCKETS) {
            if (diasMora >= bucket.min && diasMora <= bucket.max) {
                return bucket;
            }
        }
        return this.AGING_BUCKETS[this.AGING_BUCKETS.length - 1];
    }
};

// ========== FUNCIONES API ==========

function getKPIs_API() {
    return KPIService.getDashboardKPIs();
}

function refreshKPIs_API() {
    return KPIService.getDashboardKPIs(true);
}

function getAgingDistribution_API() {
    return KPIService.getAgingDistribution();
}

function getTopCompanies_API(top) {
    return KPIService.getTopCompanies(top || 10);
}

function getKPISummary_API() {
    return KPIService.getSummary();
}

function invalidateKPICache_API() {
    KPIService.invalidateCache();
    return { ok: true };
}
