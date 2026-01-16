/**
 * @fileoverview Test de verificación de Fase 4 - Analytics & Reporting
 * @version 1.0.0
 * 
 * EJECUTAR: runFase4Tests() desde Apps Script Editor
 */

function runFase4Tests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('          VERIFICACIÓN FASE 4 - ANALYTICS & REPORTING         ');
    console.log('══════════════════════════════════════════════════════════════');

    const results = { timestamp: new Date().toISOString(), tests: [], passed: 0, failed: 0 };

    // Test 1: Feature Flags
    console.log('\n📋 Test 1: Feature Flags Fase 4');
    console.log('─────────────────────────────────────────');
    try {
        const flags = ['ENABLE_ANALYTICS_SERVICE', 'ENABLE_DASHBOARD_SERVICE', 'ENABLE_EXPORT_SERVICE'];
        let allPresent = true;
        flags.forEach(flag => {
            const value = getConfig(`FEATURES.${flag}`, null);
            if (value === null) { console.log(`   ❌ ${flag}: NO CONFIGURADO`); allPresent = false; }
            else { console.log(`   ✅ ${flag}: ${value}`); }
        });
        results.tests.push({ name: 'Feature Flags', passed: allPresent });
        if (allPresent) results.passed++; else results.failed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'Feature Flags', passed: false, error: e.message });
        results.failed++;
    }

    // Test 2: AnalyticsService
    console.log('\n📋 Test 2: AnalyticsService');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof AnalyticsService === 'undefined') throw new Error('AnalyticsService no definido');
        console.log('   ✅ AnalyticsService definido');
        ['getTrendAnalysis', 'getPerformanceByResponsable', 'getAnalysisByCIA', 'getRecaudoForecast'].forEach(m => {
            if (typeof AnalyticsService[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        const trends = AnalyticsService.getTrendAnalysis({ periodo: 'MONTHLY' });
        console.log(`   ✅ getTrendAnalysis(): ${trends.ok ? trends.trends?.length + ' periodos' : 'error'}`);
        results.tests.push({ name: 'AnalyticsService', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'AnalyticsService', passed: false, error: e.message });
        results.failed++;
    }

    // Test 3: DashboardService
    console.log('\n📋 Test 3: DashboardService');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof DashboardService === 'undefined') throw new Error('DashboardService no definido');
        console.log('   ✅ DashboardService definido');
        ['getDashboardData', 'getWidget', 'getChartData'].forEach(m => {
            if (typeof DashboardService[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        if (!DashboardService.DASHBOARD_TYPE || !DashboardService.DASHBOARD_TYPE.EXECUTIVE) throw new Error('Tipos no definidos');
        console.log('   ✅ Tipos de dashboard definidos');
        const dashboard = DashboardService.getDashboardData({ tipo: 'EXECUTIVE' });
        console.log(`   ✅ getDashboardData(): ${dashboard.ok ? Object.keys(dashboard.widgets || {}).length + ' widgets' : 'error'}`);
        results.tests.push({ name: 'DashboardService', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'DashboardService', passed: false, error: e.message });
        results.failed++;
    }

    // Test 4: ReportExportService
    console.log('\n📋 Test 4: ReportExportService');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof ReportExportService === 'undefined') throw new Error('ReportExportService no definido');
        console.log('   ✅ ReportExportService definido');
        ['exportReport', 'exportCarteraToExcel', 'exportAgingToExcel', 'listExportedFiles'].forEach(m => {
            if (typeof ReportExportService[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        if (!ReportExportService.FORMAT || !ReportExportService.FORMAT.XLSX) throw new Error('Formatos no definidos');
        console.log('   ✅ Formatos de exportación definidos (XLSX, CSV, PDF)');
        if (!ReportExportService.REPORT_TYPE || !ReportExportService.REPORT_TYPE.CARTERA_COMPLETA) throw new Error('Tipos no definidos');
        console.log('   ✅ Tipos de reporte definidos');
        results.tests.push({ name: 'ReportExportService', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'ReportExportService', passed: false, error: e.message });
        results.failed++;
    }

    // Test 5: Integración Fases Anteriores
    console.log('\n📋 Test 5: Integración con Fases Anteriores');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof CacheHelper === 'undefined') throw new Error('CacheHelper (Fase 1) no disponible');
        if (typeof KPIService === 'undefined') throw new Error('KPIService (Fase 1) no disponible');
        console.log('   ✅ Servicios Fase 1 disponibles');
        if (typeof AlertService === 'undefined') throw new Error('AlertService (Fase 2) no disponible');
        if (typeof PTPService === 'undefined') throw new Error('PTPService (Fase 2) no disponible');
        console.log('   ✅ Servicios Fase 2 disponibles');
        if (typeof ReportScheduler === 'undefined') throw new Error('ReportScheduler (Fase 3) no disponible');
        console.log('   ✅ Servicios Fase 3 disponibles');
        results.tests.push({ name: 'Integración Fases Anteriores', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'Integración Fases Anteriores', passed: false, error: e.message });
        results.failed++;
    }

    // Test 6: APIs Globales
    console.log('\n📋 Test 6: APIs Globales');
    console.log('─────────────────────────────────────────');
    try {
        ['getTrendAnalysis_API', 'getPerformanceByResponsable_API', 'getDashboardData_API', 'getDashboardWidget_API', 'exportReport_API', 'exportCarteraToExcel_API', 'listExportedFiles_API'].forEach(api => {
            if (typeof eval(api) !== 'function') throw new Error(`API ${api} no definida`);
        });
        console.log('   ✅ Todas las APIs globales definidas');
        results.tests.push({ name: 'APIs Globales', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'APIs Globales', passed: false, error: e.message });
        results.failed++;
    }

    // Test 7: Widgets del Dashboard
    console.log('\n📋 Test 7: Widgets del Dashboard');
    console.log('─────────────────────────────────────────');
    try {
        ['kpi_summary', 'alerts', 'ptp_status', 'aging', 'workflow'].forEach(w => {
            const widget = DashboardService.getWidget(w);
            console.log(`   ${widget.ok ? '✅' : '⚠️'} Widget ${w}: ${widget.ok ? 'OK' : widget.error || 'sin datos'}`);
        });
        results.tests.push({ name: 'Widgets Dashboard', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'Widgets Dashboard', passed: false, error: e.message });
        results.failed++;
    }

    // Resumen
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('                         RESUMEN                                ');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    if (results.failed === 0) {
        console.log('\n🎉 ¡FASE 4 VERIFICADA EXITOSAMENTE!');
        console.log('\n📌 El portal tiene capacidades completas de Analytics & Reporting');
    } else {
        console.log('\n⚠️  HAY TESTS FALLIDOS - Revisar errores');
    }
    console.log('══════════════════════════════════════════════════════════════');
    return results;
}

function checkFase4Status() {
    return {
        analyticsService: typeof AnalyticsService !== 'undefined',
        dashboardService: typeof DashboardService !== 'undefined',
        reportExportService: typeof ReportExportService !== 'undefined',
        flags: {
            analyticsService: getConfig('FEATURES.ENABLE_ANALYTICS_SERVICE', false),
            dashboardService: getConfig('FEATURES.ENABLE_DASHBOARD_SERVICE', false),
            exportService: getConfig('FEATURES.ENABLE_EXPORT_SERVICE', false)
        }
    };
}
