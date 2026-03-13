/**
 * Test Suite: Reportes Diario y Semanal
 * Ejecutar con: node gas/tests/test_reports.js
 */

const fs = require('fs');

// ==================== MOCK DEL ENTORNO GAS ====================

var Utilities = {
  formatDate(date, tz, format) {
    const d = date instanceof Date ? date : new Date(date);
    if (format === 'yyyy-MM-dd') return d.toISOString().split('T')[0];
    return d.toISOString();
  }
};

var Logger = { info: () => {}, warn: () => {}, error: () => {} };

function getConfig(key, defaultVal) {
  const config = {
    'FEATURES.ENABLE_REPORT_SCHEDULER': true,
    'FEATURES.ENABLE_EMAIL_AUTOMATION': true,
    'KPI.DSO_BENCHMARK': 35,
    'KPI.BUCKET_90_WARN': 5,
    'KPI.BUCKET_90_CRITICAL': 10,
    'KPI.VENCIDO_THRESHOLD_WARN': 15,
    'KPI.VENCIDO_THRESHOLD_ERROR': 25,
    'KPI.BUCKET_61_90_WARN': 7,
    'AUTOMATION.ADMIN_EMAILS': ['test@test.com'],
    'PORTAL.BASE_URL': 'https://example.com',
    'PORTAL.ROUTES.DASHBOARD': '?view=dashboard',
    'PORTAL.ROUTES.ALERTAS': '?view=alertas',
    'PORTAL.ROUTES.REPORTES': '?view=reportes',
    'SPREADSHEET_ID': 'test123'
  };
  return config[key] !== undefined ? config[key] : defaultVal;
}

var SpreadsheetApp = {
  openById: () => ({
    getSheetByName: () => null,
    insertSheet: () => ({
      getRange: () => ({ setValues: () => ({ setFontWeight: () => ({ setBackground: () => ({}) }) }) }),
      setFrozenRows: () => {},
      appendRow: () => {},
      getLastRow: () => 1
    })
  })
};

var MailApp = { sendEmail: (opts) => { MailApp._lastEmail = opts; }, _lastEmail: null };

// ==================== MOCK SERVICES ====================

var BitacoraService = {
  obtenerGestiones: () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return [
      { fechaRegistro: todayStr + 'T10:00:00', asegurado: 'CLIENTE A', estadoGestion: 'EN_SEGUIMIENTO', idCiclo: 'C1' },
      { fechaRegistro: todayStr + 'T11:00:00', asegurado: 'CLIENTE B', estadoGestion: 'CERRADO_PAGADO', idCiclo: 'C2', montoRecuperado: 5000, snapshotVencidoPEN: 5000 },
      { fechaRegistro: todayStr + 'T12:00:00', asegurado: 'CLIENTE C', estadoGestion: 'COMPROMISO_PAGO', idCiclo: 'C3' },
      { fechaRegistro: new Date(today - 86400000*2).toISOString(), asegurado: 'CLIENTE D', estadoGestion: 'EN_SEGUIMIENTO', idCiclo: 'C4' },
      { fechaRegistro: new Date(today - 86400000*3).toISOString(), asegurado: 'CLIENTE E', estadoGestion: 'CERRADO_PAGADO', idCiclo: 'C5', montoRecuperado: 3000 },
    ];
  },
  obtenerCompromisosActivos: () => {
    const today = new Date();
    return [
      { asegurado: 'HUAMAN OBREGON PATRICIA', fechaCompromiso: new Date(today.getTime() + 3*86400000).toISOString(), montoCompromiso: 1500, responsable: 'test@test.com', estadoGestion: 'COMPROMISO_PAGO' },
      { asegurado: 'YURIKO GENESIS PALOMINO', fechaCompromiso: new Date(today.getTime() + 3*86400000).toISOString(), montoCompromiso: 2300, responsable: 'test@test.com', estadoGestion: 'COMPROMISO_PAGO' },
      { asegurado: 'LUCARBAL RENT A CAR', fechaCompromiso: new Date(today.getTime() - 2*86400000).toISOString(), montoCompromiso: 800, responsable: 'test@test.com', estadoGestion: 'COMPROMISO_PAGO' },
    ];
  }
};

var KPIService = {
  getDashboardKPIs: () => ({
    ok: true, available: true,
    dso: { value: 12, benchmark: 35, trend: 'down', status: 'OK' },
    summary: { porcentajeVencido: 22.4, totalMonto: 6500000, totalVencido: 1456000 },
    aging: {
      buckets: [
        { id: 'CURRENT', label: 'Corriente (0-30)', count: 3361, percentage: 78.2, amount: 4879064.54, color: '#4CAF50', severity: 'OK' },
        { id: 'BUCKET_31_60', label: '31-60 días', count: 377, percentage: 8.8, amount: 489092.14, color: '#FFC107', severity: 'WARN' },
        { id: 'BUCKET_61_90', label: '61-90 días', count: 114, percentage: 2.7, amount: 250108.95, color: '#FF9800', severity: 'WARN' },
        { id: 'BUCKET_90_PLUS', label: '90+ días', count: 448, percentage: 10.4, amount: 68827.60, color: '#F44336', severity: 'CRITICAL' }
      ]
    },
    byCompany: [
      { name: 'RIMAC', total: 2000000, vencido: 600000, vencidoPct: 30, count: 150 },
      { name: 'PACIFICO', total: 1500000, vencido: 225000, vencidoPct: 15, count: 120 },
      { name: 'MAPFRE', total: 1000000, vencido: 180000, vencidoPct: 18, count: 80 },
      { name: 'LA POSITIVA', total: 800000, vencido: 120000, vencidoPct: 15, count: 60 },
      { name: 'INTERSEGURO', total: 500000, vencido: 75000, vencidoPct: 15, count: 40 }
    ],
    byCurrency: { PEN: { total: 5000000 }, USD: { total: 500000 } }
  })
};

var AlertService = {
  getActiveAlerts: () => ({
    ok: true,
    summary: { critical: 1, high: 3, medium: 5, low: 2, total: 11 },
    alerts: [
      { severity: 'CRITICAL', type: 'AGING_CRITICO', asegurado: 'EMPRESA XYZ', titulo: 'Aging Crítico', mensaje: '120 días sin pago', diasVencimiento: 120, amount: 45000 },
      { severity: 'HIGH', type: 'SIN_GESTION', asegurado: 'EMPRESA ABC', titulo: 'Sin gestión', mensaje: '15 días sin contacto', diasSinGestion: 15, amount: 12000 },
      { severity: 'HIGH', type: 'AGING_ALTO', asegurado: 'EMPRESA DEF', titulo: 'Aging Alto', mensaje: '75 días', diasVencimiento: 75, amount: 8000 }
    ]
  })
};

var PTPService = undefined;

var AnalyticsService = {
  getPerformanceByResponsable: () => ({
    ok: true,
    responsables: [
      { responsable: 'csarapura@transperuana.com.pe', totalGestiones: 738, tasaCumplimiento: 0, efectividad: 30 }
    ]
  })
};

// ==================== CARGAR MÓDULOS (const -> var) ====================

function loadGasFile(path) {
  let code = fs.readFileSync(path, 'utf8');
  // Reemplazar const/let de nivel superior por var para que sean globales
  code = code.replace(/^const\s+/gm, 'var ');
  code = code.replace(/^let\s+/gm, 'var ');
  return code;
}

eval(loadGasFile('gas/email_templates_v2.js'));
function getEmailTemplateKit() { return EmailTemplateKit; }

eval(loadGasFile('gas/email_automation.js'));
eval(loadGasFile('gas/report_scheduler.js'));

// ==================== TEST RUNNER ====================

let passed = 0;
let failed = 0;
let errors = [];

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    errors.push(testName);
    console.log(`  ❌ ${testName}`);
  }
}

function assertContains(str, search, testName) {
  assert(typeof str === 'string' && str.includes(search), testName);
}

function assertNotContains(str, search, testName) {
  assert(typeof str === 'string' && !str.includes(search), testName);
}

// ==================== TESTS ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: Reportes Diario y Semanal');
console.log('='.repeat(60));

// --- Test 1: Bug "Meta: Meta:" corregido ---
console.log('\n📋 Test 1: Bug "Meta: Meta:" corregido');
{
  const kit = EmailTemplateKit;
  const card = kit.kpiCard({
    label: 'DSO', value: '12 días', benchmark: '35d', severity: 'OK'
  });
  assertContains(card, 'Meta: 35d', 'Benchmark muestra "Meta: 35d" una sola vez');
  assertNotContains(card, 'Meta: Meta:', 'No hay doble "Meta:"');
}

// --- Test 2: Enriquecimiento de datos diarios ---
console.log('\n📋 Test 2: Enriquecimiento de datos diarios');
{
  const baseData = {
    fecha: new Date().toISOString(),
    gestionesHoy: 3, ptpsPendientes: 0, ptpsVencidos: 0,
    alertasCriticas: 0, alertasAltas: 0, dso: 0, porcentajeVencido: 0,
    topPendientes: [], ciclosActivos: 0
  };

  const enriched = EmailAutomation._enrichDailyData(baseData);

  assert(enriched.recaudacionHoy !== undefined, 'recaudacionHoy existe');
  assert(typeof enriched.recaudacionHoy === 'number', 'recaudacionHoy es número');
  assert(enriched.gestionesCerradasHoy !== undefined, 'gestionesCerradasHoy existe');
  assert(Array.isArray(enriched.agingBucketsForBar), 'agingBucketsForBar es array');
  assert(Array.isArray(enriched.topDeudores), 'topDeudores es array');
  assert(enriched.priorities !== undefined, 'priorities existe');
  assert(enriched.dayStatus !== undefined, 'dayStatus existe');
  assert(enriched.ptpsPendientes > 0, 'PTPs pendientes > 0 (fallback BitacoraService)');
  assert(enriched.totalMonto > 0, 'totalMonto enriquecido desde KPIService');
  assert(enriched.totalVencido > 0, 'totalVencido enriquecido');
  assert(enriched.agingBuckets && enriched.agingBuckets.length > 0, 'agingBuckets cargados');
  assert(enriched.byCompany && enriched.byCompany.length > 0, 'byCompany cargado');
}

// --- Test 3: PTPs con montos en fallback ---
console.log('\n📋 Test 3: PTPs con montos (fallback BitacoraService)');
{
  const baseData = {
    fecha: new Date().toISOString(),
    gestionesHoy: 0, ptpsPendientes: 0, ptpsVencidos: 0,
    alertasCriticas: 0, alertasAltas: 0, dso: 0, porcentajeVencido: 0
  };
  const enriched = EmailAutomation._enrichDailyData(baseData);

  if (enriched.topPtpsProximos && enriched.topPtpsProximos.length > 0) {
    const firstPtp = enriched.topPtpsProximos[0];
    assert(firstPtp.monto !== undefined, 'PTP tiene campo monto');
    assert(firstPtp.monto > 0 || firstPtp.montoComprometido > 0, 'PTP monto > 0');
    assert(firstPtp.asegurado, 'PTP tiene asegurado');
    assert(firstPtp.diasRestantes !== undefined, 'PTP tiene diasRestantes');
  } else {
    assert(true, 'Sin PTPs próximos (OK)');
  }
}

// --- Test 4: Top deudores ---
console.log('\n📋 Test 4: Top deudores');
{
  const deudores = EmailAutomation._generateTopDeudores({
    byCompany: [
      { name: 'RIMAC', total: 2000000, vencido: 600000, vencidoPct: 30 },
      { name: 'PACIFICO', total: 1500000, vencido: 225000, vencidoPct: 15 },
      { name: 'SIN_VENCIDO', total: 500000, vencido: 0, vencidoPct: 0 }
    ]
  });
  assert(deudores.length === 2, 'Filtra aseguradoras sin vencido');
  assert(deudores[0].nombre === 'RIMAC', 'Ordenado por monto vencido');
  assert(deudores[0].montoVencido === 600000, 'Monto vencido correcto');
}

// --- Test 5: HTML email diario - secciones completas ---
console.log('\n📋 Test 5: HTML email diario completo');
{
  const baseData = {
    fecha: new Date().toISOString(),
    gestionesHoy: 3, ptpsPendientes: 3, ptpsVencidos: 1,
    alertasCriticas: 1, alertasAltas: 3, dso: 12, porcentajeVencido: 22.4
  };
  const enriched = EmailAutomation._enrichDailyData(baseData);
  const html = EmailAutomation._buildDailySummaryEmailPro(enriched);

  assert(html.length > 0, 'HTML generado');
  assertContains(html, '<!DOCTYPE html>', 'HTML válido con DOCTYPE');
  assertContains(html, 'Resumen Diario de Cobranzas', 'Título');
  assertContains(html, 'Gestiones Hoy', 'KPI Gestiones');
  assertContains(html, 'PTPs Pendientes', 'KPI PTPs');
  assertContains(html, 'DSO', 'KPI DSO');
  assertContains(html, 'Cartera Vencida', 'KPI % Cartera Vencida');
  assertContains(html, 'Recaudación Hoy', 'NUEVO: KPI Recaudación');
  assertContains(html, 'Distribución de Cartera', 'NUEVO: Mini barra aging');
  assertContains(html, 'Cartera Total', 'NUEVO: Monto total cartera');
  assertContains(html, 'Monto Vencido', 'NUEVO: Monto vencido absoluto');
  assertContains(html, 'Top Prioridades de Hoy', 'Prioridades');
  assertContains(html, 'Top Aseguradoras', 'NUEVO: Top deudores');
  assertContains(html, 'Próximos Vencimientos', 'PTPs próximos');
  assertContains(html, 'Abrir Portal de Cobranzas', 'CTA principal');
  assertContains(html, 'Metodología', 'NUEVO: Footer mejorado');
  assertNotContains(html, 'Meta: Meta:', 'FIX: Sin doble Meta');
  assertContains(html, '@media only screen', 'NUEVO: CSS responsive');

  const sizeKB = (html.length / 1024).toFixed(1);
  console.log(`  📏 Tamaño: ${sizeKB} KB`);
}

// --- Test 6: Datos semanales ---
console.log('\n📋 Test 6: Recolección datos semanales');
{
  const data = ReportScheduler._collectWeeklyDataEnriched();
  assert(data.semana > 0, 'Número de semana > 0');
  assert(data.agingDistribution.length > 0, 'agingDistribution cargado');
  assert(data.executiveSummary.length > 0, 'executiveSummary generado');
  assert(data.recommendedActions.length > 0, 'recommendedActions generadas');
  assert(data.coberturaGestion !== undefined, 'NUEVO: coberturaGestion');
  assert(typeof data.coberturaGestion === 'number', 'coberturaGestion es número');
  assert(data.intensidadGestion !== undefined, 'NUEVO: intensidadGestion');
  assert(data.cuentasGestionadasSemana !== undefined, 'NUEVO: cuentasGestionadasSemana');
  assert(data.totalCuentasVencidas !== undefined, 'NUEVO: totalCuentasVencidas');
  assert(data.topAseguradoras !== undefined, 'NUEVO: topAseguradoras');
  assert(data.topAseguradoras.length > 0, 'topAseguradoras tiene datos');
  assert(typeof data.montoRecuperado === 'number', 'FIX: montoRecuperado es número');
  assert(typeof data.montoComprometido === 'number', 'FIX: montoComprometido es número');
  assert(data.montoComprometido >= 0, 'FIX: montoComprometido >= 0');
}

// --- Test 7: montoRecuperado fallback fix ---
console.log('\n📋 Test 7: montoRecuperado con BitacoraService fallback');
{
  const data = ReportScheduler._collectWeeklyDataEnriched();
  assert(data.ptpsCumplidos >= 0, 'ptpsCumplidos calculado');
  assert(typeof data.montoRecuperado === 'number', 'montoRecuperado es number');
  assert(typeof data.tasaRecuperacion === 'number', 'tasaRecuperacion calculada');
}

// --- Test 8: HTML email semanal - secciones completas ---
console.log('\n📋 Test 8: HTML email semanal completo');
{
  const data = ReportScheduler._collectWeeklyDataEnriched();
  const html = ReportScheduler._buildWeeklyReportEmailPro(data);

  assertContains(html, '<!DOCTYPE html>', 'HTML válido');
  assertContains(html, 'Reporte Semanal de Cobranzas', 'Título');
  assertContains(html, 'Resumen Ejecutivo', 'Executive Summary');
  assertContains(html, 'Métricas de la Semana', 'Sección métricas');
  assertContains(html, 'Tasa Cumplimiento', 'KPI Tasa');
  assertContains(html, 'DSO Promedio', 'KPI DSO');
  assertContains(html, 'Monto Recuperado', 'KPI Monto Recuperado');
  assertContains(html, 'Distribución por Antigüedad', 'Aging table');
  assertContains(html, 'Cartera por Aseguradora', 'NUEVO: Sección aseguradoras');
  assertContains(html, 'RIMAC', 'Datos aseguradora');
  assertContains(html, 'Eficiencia Operativa', 'NUEVO: Sección cobertura');
  assertContains(html, 'Cobertura de Gestión', 'NUEVO: Métrica cobertura');
  assertContains(html, 'Intensidad', 'NUEVO: Métrica intensidad');
  assertContains(html, 'Cuentas Gestionadas', 'NUEVO: Cuentas gestionadas');
  assertContains(html, 'Pipeline de Cobranza', 'Pipeline');
  assertContains(html, 'Acciones Recomendadas', 'Acciones');
  assertNotContains(html, 'Meta: Meta:', 'FIX: Sin doble Meta');
  assertContains(html, 'Metodología', 'NUEVO: Footer mejorado');
  assertContains(html, '@media only screen', 'NUEVO: CSS responsive');

  const sizeKB = (html.length / 1024).toFixed(1);
  console.log(`  📏 Tamaño: ${sizeKB} KB`);
}

// --- Test 9: Executive Summary ---
console.log('\n📋 Test 9: Executive Summary');
{
  const summary = ReportScheduler._generateExecutiveSummary({
    tasaCumplimiento: 80, dsoPromedio: 12, montoRecuperado: 5000,
    ptpsIncumplidos: 2, porcentajeVencido: 22.4,
    agingDistribution: [
      { id: 'BUCKET_90_PLUS', percentage: 10.4, count: 448 },
      { id: 'BUCKET_61_90', percentage: 2.7, count: 114 }
    ],
    lastWeek: { 'Tasa Cumplimiento': '1%', 'DSO Promedio': 10, 'PTPs Incumplidos': 1, '% Vencido': 20 },
    coberturaGestion: 45, ptpsPendientes: 3
  });
  assert(summary.length > 0, 'Summary generado');
  assert(summary.length <= 3, 'Máximo 3 bullets');
  assert(summary.some(s => s.type === 'positive'), 'Tiene bullet positivo');
  assert(summary.some(s => s.type === 'negative'), 'Tiene bullet negativo');
}

// --- Test 10: Acciones recomendadas ---
console.log('\n📋 Test 10: Acciones recomendadas');
{
  const actions = ReportScheduler._generateRecommendedActions({
    agingDistribution: [
      { id: 'BUCKET_90_PLUS', count: 448 },
      { id: 'BUCKET_61_90', count: 114 }
    ],
    ptpsIncumplidos: 2, dsoPromedio: 40, dsoBenchmark: 35,
    byCompany: [{ name: 'RIMAC', vencidoPct: 39 }]
  });
  assert(actions.length > 0, 'Acciones generadas');
  assert(actions.length <= 5, 'Máximo 5 acciones');
  assert(actions[0].responsable, 'Acción tiene responsable');
  assert(actions[0].objetivo, 'Acción tiene objetivo');
  assert(actions.some(a => a.accion.includes('DSO')), 'Hay acción de DSO');
  assert(actions.some(a => a.accion.includes('RIMAC')), 'Hay acción para RIMAC');
}

// --- Test 11: Estado del día ---
console.log('\n📋 Test 11: Determinación estado del día');
{
  let s = EmailAutomation._determineDayStatus({ alertasCriticas: 1, ptpsVencidos: 0 });
  assert(s === 'CRITICAL', 'CRITICAL con alertas críticas');

  s = EmailAutomation._determineDayStatus({ alertasCriticas: 0, ptpsVencidos: 4 });
  assert(s === 'CRITICAL', 'CRITICAL con PTPs vencidos > 3');

  s = EmailAutomation._determineDayStatus({ alertasCriticas: 0, ptpsVencidos: 1, alertasAltas: 0 });
  assert(s === 'WARN', 'WARN con PTPs vencidos > 0');

  s = EmailAutomation._determineDayStatus({ alertasCriticas: 0, ptpsVencidos: 0, alertasAltas: 0 });
  assert(s === 'OK', 'OK sin alertas ni vencidos');
}

// --- Test 12: Prioridades diarias ---
console.log('\n📋 Test 12: Prioridades diarias');
{
  const priorities = EmailAutomation._generateDailyPriorities({
    ptpsVencidos: 2, alertasCriticas: 1,
    ptpsHoy: [{ asegurado: 'TEST' }],
    bucket6190: { count: 114 },
    ptpsProximos: [{ asegurado: 'P1' }, { asegurado: 'P2' }]
  });
  assert(priorities.length === 3, 'Máximo 3 prioridades');
  assert(priorities[0].severity === 'CRITICAL', 'Primera CRITICAL');
  assert(priorities[0].badge === 'URGENTE', 'Badge URGENTE');
}

// --- Test 13: Nuevos componentes EmailTemplateKit ---
console.log('\n📋 Test 13: Nuevos componentes de EmailTemplateKit');
{
  const kit = EmailTemplateKit;

  const trend = kit.trendIndicator([10, 12, 11, 15, 14]);
  assert(trend.includes('↑'), 'trendIndicator tiene flechas');
  assert(trend.length > 0, 'trendIndicator genera HTML');

  const progress = kit.goalProgressBar(50000, 100000, { label: 'Meta Mensual' });
  assertContains(progress, '50%', 'goalProgressBar muestra %');
  assertContains(progress, 'Meta Mensual', 'goalProgressBar muestra label');

  const row = kit.compactSummaryRow([
    { label: 'Total', value: '100', color: '#212121' },
    { label: 'Vencido', value: '25', color: '#C62828' }
  ]);
  assertContains(row, 'Total', 'compactSummaryRow labels');
  assertContains(row, '100', 'compactSummaryRow valores');
}

// --- Test 14: PTP card con montos ---
console.log('\n📋 Test 14: PTP card con montos');
{
  const kit = EmailTemplateKit;

  const card1 = kit.ptpCard({
    asegurado: 'CLIENTE TEST', monto: 1500, moneda: 'PEN',
    fechaCompromiso: new Date().toISOString(), diasRestantes: 3, vencido: false
  });
  assertContains(card1, 'S/.', 'PTP card muestra monto');

  const card2 = kit.ptpCard({
    asegurado: 'CLIENTE 2', montoComprometido: 2300, moneda: 'PEN',
    fechaCompromiso: new Date().toISOString(), diasRestantes: 0, vencido: false
  });
  assertContains(card2, 'Vence HOY', 'PTP muestra "Vence HOY"');
  assertContains(card2, 'S/.', 'PTP muestra montoComprometido');

  const card3 = kit.ptpCard({
    asegurado: 'SIN MONTO',
    fechaCompromiso: new Date().toISOString(), diasRestantes: -2, vencido: true
  });
  assertContains(card3, 'Vencido hace 2', 'PTP muestra vencido');
}

// --- Test 15: Mini aging bar ---
console.log('\n📋 Test 15: Mini aging bar');
{
  const kit = EmailTemplateKit;
  const html = EmailAutomation._buildMiniAgingBar({
    agingBucketsForBar: [
      { id: 'CURRENT', label: 'Corriente (0-30)', count: 3361, percentage: 78.2 },
      { id: 'BUCKET_90_PLUS', label: '90+ días', count: 448, percentage: 10.4 }
    ]
  }, kit);
  assertContains(html, 'Distribución de Cartera', 'Título');
  assertContains(html, '#4CAF50', 'Color verde');
  assertContains(html, '#F44336', 'Color rojo');
}

// --- Test 16: Cartera summary ---
console.log('\n📋 Test 16: Cartera summary (montos absolutos)');
{
  const kit = EmailTemplateKit;
  const html = EmailAutomation._buildCarteraSummary({
    totalMonto: 6500000, totalVencido: 1456000,
    recaudacionHoy: 5000, gestionesCerradasHoy: 1
  }, kit);
  assertContains(html, 'Cartera Total', 'Etiqueta cartera');
  assertContains(html, 'Monto Vencido', 'Etiqueta vencido');
  assertContains(html, 'Recaudación Hoy', 'Etiqueta recaudación');
  assertContains(html, '1 caso(s) cerrado(s)', 'Casos cerrados');
}

// --- Test 17: Top deudores section ---
console.log('\n📋 Test 17: Sección Top Deudores HTML');
{
  const kit = EmailTemplateKit;
  const html = EmailAutomation._buildTopDeudoresSection({
    topDeudores: [
      { nombre: 'RIMAC', montoVencido: 600000, moneda: 'PEN', porcentajeVencido: 30 },
      { nombre: 'MAPFRE', montoVencido: 180000, moneda: 'PEN', porcentajeVencido: 18 }
    ]
  }, kit);
  assertContains(html, 'Top Aseguradoras', 'Título sección');
  assertContains(html, 'RIMAC', 'Primera aseguradora');
  assertContains(html, 'MAPFRE', 'Segunda aseguradora');
}

// --- Test 18: Sección aseguradoras semanal ---
console.log('\n📋 Test 18: Cartera por Aseguradora (semanal)');
{
  const data = ReportScheduler._collectWeeklyDataEnriched();
  const kit = EmailTemplateKit;
  const html = ReportScheduler._buildAseguradorasSection(data, kit);
  assertContains(html, 'Cartera por Aseguradora', 'Título');
  assertContains(html, 'RIMAC', 'Aseguradora principal');
  assertContains(html, 'Cartera Total', 'Header');
}

// --- Test 19: Eficiencia operativa semanal ---
console.log('\n📋 Test 19: Eficiencia Operativa (semanal)');
{
  const data = ReportScheduler._collectWeeklyDataEnriched();
  const kit = EmailTemplateKit;
  const html = ReportScheduler._buildCoberturaSection(data, kit);
  if (data.coberturaGestion > 0 || data.intensidadGestion > 0) {
    assertContains(html, 'Eficiencia Operativa', 'Título');
    assertContains(html, 'Cobertura de Gestión', 'Cobertura');
    assertContains(html, 'Intensidad', 'Intensidad');
  } else {
    assert(html === '', 'Vacío sin datos');
  }
}

// --- Test 20: Pipeline mejorado con proyección ---
console.log('\n📋 Test 20: Pipeline con proyección');
{
  const kit = EmailTemplateKit;
  const html = ReportScheduler._buildPipelineSection({
    ptpsPendientes: 5, montoComprometido: 50000, tasaRecuperacion: 30
  }, kit);
  assertContains(html, 'Pipeline de Cobranza', 'Título');
  assertContains(html, 'Proyección', 'Proyección de cobro');
  assertContains(html, '30.0%', 'Tasa de recuperación');
}

// --- Test 21: Tamaño de HTML ---
console.log('\n📋 Test 21: Validación de tamaño');
{
  const baseData = {
    fecha: new Date().toISOString(),
    gestionesHoy: 3, ptpsPendientes: 3, ptpsVencidos: 1,
    alertasCriticas: 1, alertasAltas: 3, dso: 12, porcentajeVencido: 22.4
  };
  const dailyHtml = EmailAutomation._buildDailySummaryEmailPro(EmailAutomation._enrichDailyData(baseData));
  const dailyKB = dailyHtml.length / 1024;
  assert(dailyKB < 150, `Email diario < 150KB (${dailyKB.toFixed(1)}KB)`);
  assert(dailyKB > 5, `Email diario > 5KB (${dailyKB.toFixed(1)}KB)`);

  const weeklyHtml = ReportScheduler._buildWeeklyReportEmailPro(ReportScheduler._collectWeeklyDataEnriched());
  const weeklyKB = weeklyHtml.length / 1024;
  assert(weeklyKB < 150, `Email semanal < 150KB (${weeklyKB.toFixed(1)}KB)`);
  assert(weeklyKB > 5, `Email semanal > 5KB (${weeklyKB.toFixed(1)}KB)`);
}

// ==================== RESULTADO ====================

console.log('\n' + '='.repeat(60));
if (failed === 0) {
  console.log(`✅ TODOS LOS TESTS PASARON: ${passed}/${passed + failed}`);
} else {
  console.log(`❌ RESULTADO: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('\nTests fallidos:');
  errors.forEach(e => console.log(`  - ${e}`));
}
console.log('='.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
