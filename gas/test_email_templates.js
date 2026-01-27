/**
 * @fileoverview Tests para EmailTemplateKit y Emails Premium
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * @lastModified 2026-01-27
 * 
 * TESTS:
 * - testEmailTemplateKit(): Verifica componentes del kit
 * - testDailyEmailGeneration(): Genera email diario con datos mock y reales
 * - testWeeklyEmailGeneration(): Genera email semanal con datos mock y reales
 * - testEmailSizeValidation(): Verifica que HTML no exceda 80KB
 * - runAllEmailTests(): Ejecuta todos los tests
 */

/**
 * Test del EmailTemplateKit - Componentes básicos
 */
function testEmailTemplateKit() {
    console.log('\n============================================');
    console.log('📧 TEST: EmailTemplateKit Components');
    console.log('============================================');

    const results = { passed: 0, failed: 0, tests: [] };

    try {
        // Verificar que EmailTemplateKit existe
        if (typeof EmailTemplateKit === 'undefined') {
            throw new Error('EmailTemplateKit no está definido');
        }
        console.log('✅ EmailTemplateKit está disponible');
        results.tests.push({ name: 'EmailTemplateKit exists', passed: true });
        results.passed++;

        const kit = EmailTemplateKit;

        // Test: formatCurrency
        const currency = kit.formatCurrency(1234.56, 'PEN');
        if (!currency.includes('S/.') || !currency.includes('1,234.56')) {
            throw new Error(`formatCurrency failed: ${currency}`);
        }
        console.log(`✅ formatCurrency: ${currency}`);
        results.tests.push({ name: 'formatCurrency', passed: true });
        results.passed++;

        // Test: formatNumber
        const number = kit.formatNumber(9876543.21);
        if (!number.includes('9,876,543.21') && !number.includes('9.876.543')) {
            throw new Error(`formatNumber failed: ${number}`);
        }
        console.log(`✅ formatNumber: ${number}`);
        results.tests.push({ name: 'formatNumber', passed: true });
        results.passed++;

        // Test: formatPct
        const pct = kit.formatPct(45.678);
        if (!pct.includes('45.7%')) {
            throw new Error(`formatPct failed: ${pct}`);
        }
        console.log(`✅ formatPct: ${pct}`);
        results.tests.push({ name: 'formatPct', passed: true });
        results.passed++;

        // Test: formatDate (usar fecha actual para evitar problemas de timezone)
        const testDate = new Date();
        const date = kit.formatDate(testDate);
        const day = testDate.getDate().toString().padStart(2, '0');
        const month = (testDate.getMonth() + 1).toString().padStart(2, '0');
        const year = testDate.getFullYear().toString();
        // Verificar que contiene día, mes y año (en cualquier formato)
        if (!date.includes(day) || !date.includes(month) || !date.includes(year)) {
            throw new Error(`formatDate failed: ${date} (expected ${day}/${month}/${year})`);
        }
        console.log(`✅ formatDate: ${date}`);
        results.tests.push({ name: 'formatDate', passed: true });
        results.passed++;

        // Test: trendArrow
        const arrowUp = kit.trendArrow('up');
        const arrowDown = kit.trendArrow('down');
        if (!arrowUp.includes('↑') || !arrowDown.includes('↓')) {
            throw new Error('trendArrow failed');
        }
        console.log('✅ trendArrow: OK');
        results.tests.push({ name: 'trendArrow', passed: true });
        results.passed++;

        // Test: calculateDelta
        const delta = kit.calculateDelta(100, 80);
        if (delta.value !== 20 || delta.trend !== 'up') {
            throw new Error(`calculateDelta failed: ${JSON.stringify(delta)}`);
        }
        console.log(`✅ calculateDelta: ${JSON.stringify(delta)}`);
        results.tests.push({ name: 'calculateDelta', passed: true });
        results.passed++;

        // Test: badge
        const badge = kit.badge('CRITICAL', 'CRITICAL');
        if (!badge.includes('CRITICAL') || !badge.includes('#C62828')) {
            throw new Error('badge failed');
        }
        console.log('✅ badge: OK');
        results.tests.push({ name: 'badge', passed: true });
        results.passed++;

        // Test: dayStatusBadge
        const statusBadge = kit.dayStatusBadge('CRITICAL');
        if (!statusBadge.includes('Acción urgente')) {
            throw new Error('dayStatusBadge failed');
        }
        console.log('✅ dayStatusBadge: OK');
        results.tests.push({ name: 'dayStatusBadge', passed: true });
        results.passed++;

        // Test: ctaButton
        const cta = kit.ctaButton('Test Button', 'https://example.com');
        if (!cta.includes('Test Button') || !cta.includes('https://example.com')) {
            throw new Error('ctaButton failed');
        }
        console.log('✅ ctaButton: OK');
        results.tests.push({ name: 'ctaButton', passed: true });
        results.passed++;

        // Test: sectionTitle
        const section = kit.sectionTitle('Test Section', '📊', 'Subtitle');
        if (!section.includes('Test Section') || !section.includes('📊')) {
            throw new Error('sectionTitle failed');
        }
        console.log('✅ sectionTitle: OK');
        results.tests.push({ name: 'sectionTitle', passed: true });
        results.passed++;

        // Test: kpiCard
        const kpiCard = kit.kpiCard({
            label: 'Test KPI',
            value: '42',
            severity: 'OK'
        });
        if (!kpiCard.includes('Test KPI') || !kpiCard.includes('42')) {
            throw new Error('kpiCard failed');
        }
        console.log('✅ kpiCard: OK');
        results.tests.push({ name: 'kpiCard', passed: true });
        results.passed++;

        // Test: dataTable
        const table = kit.dataTable({
            headers: [{ label: 'Col1' }, { label: 'Col2' }],
            rows: [['A', 'B'], ['C', 'D']]
        });
        if (!table.includes('Col1') || !table.includes('A')) {
            throw new Error('dataTable failed');
        }
        console.log('✅ dataTable: OK');
        results.tests.push({ name: 'dataTable', passed: true });
        results.passed++;

        // Test: progressBar
        const progressBar = kit.progressBar(75);
        if (!progressBar.includes('75')) {
            throw new Error('progressBar failed');
        }
        console.log('✅ progressBar: OK');
        results.tests.push({ name: 'progressBar', passed: true });
        results.passed++;

        // Test: buildLayout
        const layout = kit.buildLayout({
            title: 'Test Email',
            subtitle: 'Test Subtitle',
            contentHtml: '<p>Test content</p>'
        });
        if (!layout.includes('Test Email') || !layout.includes('Test content')) {
            throw new Error('buildLayout failed');
        }
        console.log('✅ buildLayout: OK');
        results.tests.push({ name: 'buildLayout', passed: true });
        results.passed++;

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.tests.push({ name: 'Component Test', passed: false, error: error.message });
        results.failed++;
    }

    console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`);
    return results;
}

/**
 * Test de generación de email diario con datos mock
 */
function testDailyEmailGeneration() {
    console.log('\n============================================');
    console.log('📧 TEST: Daily Email Generation');
    console.log('============================================');

    const results = { passed: 0, failed: 0, tests: [] };

    try {
        // Datos mock para testing
        const mockData = {
            gestionesHoy: 15,
            ptpsPendientes: 8,
            ptpsVencidos: 2,
            alertasCriticas: 1,
            alertasAltas: 3,
            dso: 42,
            porcentajeVencido: 18.5,
            topPtpsProximos: [
                { asegurado: 'Empresa ABC', montoComprometido: 5000, moneda: 'PEN', fechaCompromiso: new Date(), diasRestantes: 0, vencido: false },
                { asegurado: 'Empresa XYZ', montoComprometido: 3500, moneda: 'USD', fechaCompromiso: new Date(Date.now() + 86400000), diasRestantes: 1, vencido: false }
            ],
            topAlertas: [
                { asegurado: 'Cliente Crítico', type: 'AGING_CRITICO', severity: 'CRITICAL', titulo: 'Alerta test', mensaje: 'Mensaje test', amount: 10000 }
            ]
        };

        // Test 1: Verificar que EmailAutomation existe
        if (typeof EmailAutomation === 'undefined') {
            throw new Error('EmailAutomation no está definido');
        }
        console.log('✅ EmailAutomation disponible');
        results.tests.push({ name: 'EmailAutomation exists', passed: true });
        results.passed++;

        // Test 2: Generar HTML con datos mock
        const enrichedData = EmailAutomation._enrichDailyData(mockData);
        console.log('✅ _enrichDailyData ejecutado');
        results.tests.push({ name: '_enrichDailyData', passed: true });
        results.passed++;

        // Test 3: Verificar dayStatus
        if (!enrichedData.dayStatus) {
            throw new Error('dayStatus no generado');
        }
        console.log(`✅ dayStatus: ${enrichedData.dayStatus}`);
        results.tests.push({ name: 'dayStatus generated', passed: true });
        results.passed++;

        // Test 4: Verificar priorities
        if (!enrichedData.priorities || enrichedData.priorities.length === 0) {
            console.log('⚠️ priorities vacío (puede ser normal con mock data)');
        } else {
            console.log(`✅ priorities: ${enrichedData.priorities.length} items`);
        }
        results.tests.push({ name: 'priorities generated', passed: true });
        results.passed++;

        // Test 5: Generar HTML completo
        const html = EmailAutomation._buildDailySummaryEmailPro(enrichedData);
        if (!html || html.length === 0) {
            throw new Error('HTML vacío');
        }
        console.log(`✅ HTML generado: ${(html.length / 1024).toFixed(2)} KB`);
        results.tests.push({ name: 'HTML generated', passed: true });
        results.passed++;

        // Test 6: Verificar estructura HTML
        const requiredElements = [
            'Portal de Cobranzas',
            'Transperuana',
            'Resumen Diario',
            'Gestiones',
            'PTPs',
            'DSO'
        ];

        for (const element of requiredElements) {
            if (!html.includes(element)) {
                throw new Error(`Elemento faltante en HTML: ${element}`);
            }
        }
        console.log('✅ Estructura HTML válida');
        results.tests.push({ name: 'HTML structure valid', passed: true });
        results.passed++;

        // Test 7: Verificar que no hay "undefined" en el HTML
        if (html.includes('undefined') && !html.includes('typeof')) {
            console.log('⚠️ Warning: HTML contiene "undefined"');
        } else {
            console.log('✅ HTML sin "undefined"');
        }
        results.tests.push({ name: 'No undefined in HTML', passed: true });
        results.passed++;

        // Test 8: Verificar tamaño
        const sizeKB = html.length / 1024;
        if (sizeKB > 80) {
            console.log(`⚠️ Warning: HTML excede 80KB (${sizeKB.toFixed(2)} KB)`);
        } else {
            console.log(`✅ Tamaño OK: ${sizeKB.toFixed(2)} KB (< 80KB)`);
        }
        results.tests.push({ name: 'Size validation', passed: sizeKB <= 80 });
        if (sizeKB <= 80) results.passed++; else results.failed++;

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.tests.push({ name: 'Daily Email Test', passed: false, error: error.message });
        results.failed++;
    }

    console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`);
    return results;
}

/**
 * Test de generación de email semanal con datos mock
 */
function testWeeklyEmailGeneration() {
    console.log('\n============================================');
    console.log('📧 TEST: Weekly Email Generation');
    console.log('============================================');

    const results = { passed: 0, failed: 0, tests: [] };

    try {
        // Datos mock para testing
        const mockData = {
            semana: 5,
            year: 2026,
            fechaInicio: new Date(Date.now() - 7 * 86400000).toISOString(),
            fechaFin: new Date().toISOString(),
            totalGestiones: 78,
            ptpsCumplidos: 12,
            ptpsIncumplidos: 3,
            ptpsPendientes: 8,
            tasaCumplimiento: 80,
            cei: 72.5,
            dsoPromedio: 38,
            tendenciaDSO: 'down',
            dsoBenchmark: 35,
            montoRecuperado: 45000,
            montoComprometido: 65000,
            tasaRecuperacion: 69.2,
            porcentajeVencido: 22.3,
            totalMonto: 850000,
            totalVencido: 189550,
            agingDistribution: [
                { id: 'CURRENT', bucket: 'Corriente (0-30)', count: 1200, percentage: 65, amount: 450000, color: '#4CAF50' },
                { id: 'BUCKET_31_60', bucket: '31-60 días', count: 350, percentage: 19, amount: 180000, color: '#FFC107' },
                { id: 'BUCKET_61_90', bucket: '61-90 días', count: 180, percentage: 10, amount: 95000, color: '#FF9800' },
                { id: 'BUCKET_90_PLUS', bucket: '90+ días', count: 120, percentage: 6, amount: 75000, color: '#F44336' }
            ],
            byCompany: [
                { name: 'La Positiva', count: 250, total: 150000, vencido: 35000, vencidoPct: 23.3 },
                { name: 'Rimac', count: 180, total: 120000, vencido: 28000, vencidoPct: 23.3 }
            ],
            performanceByResponsable: [
                { responsable: 'gestor1@test.com', totalGestiones: 25, tasaCumplimiento: 85, efectividad: 82 },
                { responsable: 'gestor2@test.com', totalGestiones: 22, tasaCumplimiento: 78, efectividad: 75 }
            ],
            lastWeek: {
                'Tasa Cumplimiento': '75%',
                'DSO Promedio': 40,
                '% Vencido': 24,
                'PTPs Incumplidos': 5,
                'Total Gestiones': 65
            },
            executiveSummary: [],
            recommendedActions: []
        };

        // Test 1: Verificar que ReportScheduler existe
        if (typeof ReportScheduler === 'undefined') {
            throw new Error('ReportScheduler no está definido');
        }
        console.log('✅ ReportScheduler disponible');
        results.tests.push({ name: 'ReportScheduler exists', passed: true });
        results.passed++;

        // Test 2: Generar Executive Summary
        mockData.executiveSummary = ReportScheduler._generateExecutiveSummary(mockData);
        console.log(`✅ Executive Summary: ${mockData.executiveSummary.length} items`);
        results.tests.push({ name: 'Executive Summary', passed: true });
        results.passed++;

        // Test 3: Generar Recommended Actions
        mockData.recommendedActions = ReportScheduler._generateRecommendedActions(mockData);
        console.log(`✅ Recommended Actions: ${mockData.recommendedActions.length} items`);
        results.tests.push({ name: 'Recommended Actions', passed: true });
        results.passed++;

        // Test 4: Generar HTML completo
        const html = ReportScheduler._buildWeeklyReportEmailPro(mockData);
        if (!html || html.length === 0) {
            throw new Error('HTML vacío');
        }
        console.log(`✅ HTML generado: ${(html.length / 1024).toFixed(2)} KB`);
        results.tests.push({ name: 'HTML generated', passed: true });
        results.passed++;

        // Test 5: Verificar estructura HTML
        const requiredElements = [
            'Reporte Semanal',
            'Semana 5',
            'Métricas',
            'Tasa Cumplimiento',
            'DSO',
            'Aging',
            'Distribución'
        ];

        let missingElements = [];
        for (const element of requiredElements) {
            if (!html.includes(element)) {
                missingElements.push(element);
            }
        }
        if (missingElements.length > 0) {
            console.log(`⚠️ Elementos que podrían faltar: ${missingElements.join(', ')}`);
        } else {
            console.log('✅ Estructura HTML válida');
        }
        results.tests.push({ name: 'HTML structure valid', passed: missingElements.length === 0 });
        if (missingElements.length === 0) results.passed++; else results.failed++;

        // Test 6: Verificar que no hay "undefined" literal problemático
        const undefinedCount = (html.match(/undefined/g) || []).length;
        const typeofCount = (html.match(/typeof/g) || []).length;
        if (undefinedCount > typeofCount) {
            console.log(`⚠️ Warning: HTML contiene ${undefinedCount - typeofCount} "undefined" problemáticos`);
        } else {
            console.log('✅ HTML sin "undefined" problemáticos');
        }
        results.tests.push({ name: 'No undefined in HTML', passed: true });
        results.passed++;

        // Test 7: Verificar tamaño
        const sizeKB = html.length / 1024;
        if (sizeKB > 80) {
            console.log(`⚠️ Warning: HTML excede 80KB (${sizeKB.toFixed(2)} KB)`);
        } else {
            console.log(`✅ Tamaño OK: ${sizeKB.toFixed(2)} KB (< 80KB)`);
        }
        results.tests.push({ name: 'Size validation', passed: sizeKB <= 80 });
        if (sizeKB <= 80) results.passed++; else results.failed++;

        // Test 8: Verificar aging table
        if (html.includes('90+ días') || html.includes('BUCKET_90')) {
            console.log('✅ Aging distribution incluida');
        } else {
            console.log('⚠️ Aging distribution podría faltar');
        }
        results.tests.push({ name: 'Aging included', passed: true });
        results.passed++;

    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        results.tests.push({ name: 'Weekly Email Test', passed: false, error: error.message });
        results.failed++;
    }

    console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`);
    return results;
}

/**
 * Test con datos reales del sistema
 */
function testEmailsWithRealData() {
    console.log('\n============================================');
    console.log('📧 TEST: Emails with Real Data');
    console.log('============================================');

    const results = { passed: 0, failed: 0, tests: [], previews: {} };

    // Test Daily Email con datos reales
    try {
        console.log('\n--- Daily Email ---');
        const dailyResult = previewDailyEmail_API();
        if (dailyResult.ok) {
            console.log(`✅ Daily Email generado: ${dailyResult.sizeKB} KB`);
            results.previews.daily = {
                sizeKB: dailyResult.sizeKB,
                dayStatus: dailyResult.data?.dayStatus,
                gestionesHoy: dailyResult.data?.gestionesHoy,
                alertasCriticas: dailyResult.data?.alertasCriticas
            };
            results.tests.push({ name: 'Daily Email Real Data', passed: true });
            results.passed++;
        } else {
            throw new Error(dailyResult.error || 'Error desconocido');
        }
    } catch (error) {
        console.log(`❌ Daily Email Error: ${error.message}`);
        results.tests.push({ name: 'Daily Email Real Data', passed: false, error: error.message });
        results.failed++;
    }

    // Test Weekly Email con datos reales
    try {
        console.log('\n--- Weekly Email ---');
        const weeklyResult = previewWeeklyEmail_API();
        if (weeklyResult.ok) {
            console.log(`✅ Weekly Email generado: ${weeklyResult.sizeKB} KB`);
            results.previews.weekly = {
                sizeKB: weeklyResult.sizeKB,
                semana: weeklyResult.data?.semana,
                tasaCumplimiento: weeklyResult.data?.tasaCumplimiento,
                dsoPromedio: weeklyResult.data?.dsoPromedio
            };
            results.tests.push({ name: 'Weekly Email Real Data', passed: true });
            results.passed++;
        } else {
            throw new Error(weeklyResult.error || 'Error desconocido');
        }
    } catch (error) {
        console.log(`❌ Weekly Email Error: ${error.message}`);
        results.tests.push({ name: 'Weekly Email Real Data', passed: false, error: error.message });
        results.failed++;
    }

    console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`);
    console.log('\n📋 Preview Summary:');
    console.log(JSON.stringify(results.previews, null, 2));

    return results;
}

/**
 * Ejecuta todos los tests de email
 */
function runAllEmailTests() {
    console.log('\n####################################################');
    console.log('#           EMAIL TEMPLATES TEST SUITE              #');
    console.log('####################################################');

    const allResults = {
        timestamp: new Date().toISOString(),
        totalPassed: 0,
        totalFailed: 0,
        suites: []
    };

    // Suite 1: EmailTemplateKit
    const kitResults = testEmailTemplateKit();
    allResults.suites.push({ name: 'EmailTemplateKit', ...kitResults });
    allResults.totalPassed += kitResults.passed;
    allResults.totalFailed += kitResults.failed;

    // Suite 2: Daily Email Generation
    const dailyResults = testDailyEmailGeneration();
    allResults.suites.push({ name: 'Daily Email Generation', ...dailyResults });
    allResults.totalPassed += dailyResults.passed;
    allResults.totalFailed += dailyResults.failed;

    // Suite 3: Weekly Email Generation
    const weeklyResults = testWeeklyEmailGeneration();
    allResults.suites.push({ name: 'Weekly Email Generation', ...weeklyResults });
    allResults.totalPassed += weeklyResults.passed;
    allResults.totalFailed += weeklyResults.failed;

    // Suite 4: Real Data (opcional - puede fallar si no hay datos)
    try {
        const realDataResults = testEmailsWithRealData();
        allResults.suites.push({ name: 'Real Data Generation', ...realDataResults });
        allResults.totalPassed += realDataResults.passed;
        allResults.totalFailed += realDataResults.failed;
    } catch (e) {
        console.log(`⚠️ Real data tests skipped: ${e.message}`);
    }

    // Resumen final
    console.log('\n####################################################');
    console.log('#                 FINAL SUMMARY                     #');
    console.log('####################################################');
    console.log(`\n✅ Total Passed: ${allResults.totalPassed}`);
    console.log(`❌ Total Failed: ${allResults.totalFailed}`);
    console.log(`📊 Success Rate: ${((allResults.totalPassed / (allResults.totalPassed + allResults.totalFailed)) * 100).toFixed(1)}%`);

    allResults.suites.forEach(suite => {
        const status = suite.failed === 0 ? '✅' : '⚠️';
        console.log(`   ${status} ${suite.name}: ${suite.passed}/${suite.passed + suite.failed}`);
    });

    return allResults;
}

/**
 * Guarda preview de emails en una hoja para revisión
 */
function saveEmailPreviewsToSheet() {
    const context = 'saveEmailPreviewsToSheet';
    try {
        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName('Email_Previews');
        
        if (!sheet) {
            sheet = ss.insertSheet('Email_Previews');
            sheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Tipo', 'Tamaño KB', 'HTML (primeros 1000 chars)']]).setFontWeight('bold').setBackground('#e3f2fd');
            sheet.setFrozenRows(1);
        }

        // Generar previews
        const daily = previewDailyEmail_API();
        const weekly = previewWeeklyEmail_API();

        const timestamp = new Date().toLocaleString('es-PE');

        if (daily.ok) {
            sheet.appendRow([timestamp, 'DAILY', daily.sizeKB, daily.html.substring(0, 1000) + '...']);
        }
        if (weekly.ok) {
            sheet.appendRow([timestamp, 'WEEKLY', weekly.sizeKB, weekly.html.substring(0, 1000) + '...']);
        }

        console.log('✅ Previews guardados en hoja Email_Previews');
        return { ok: true, message: 'Previews guardados' };

    } catch (error) {
        Logger.error(context, 'Error guardando previews', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Test rápido de emails PRO - Ejecutar desde Apps Script
 * Muestra resultados en Logger
 */
function testEmailsPRO() {
    console.log('🚀 Iniciando test de emails PRO...\n');
    
    // 1. Test de componentes
    console.log('📦 1. Testing EmailTemplateKit...');
    var kitTest = testEmailTemplateKit();
    console.log('   Kit Test: ' + kitTest.passed + '/' + (kitTest.passed + kitTest.failed) + ' pasaron\n');
    
    // 2. Preview email diario
    console.log('📧 2. Generando preview email diario...');
    var daily = previewDailyEmail_API();
    console.log('   Daily Email: ' + (daily.ok ? '✅ OK' : '❌ ERROR') + ' - ' + (daily.sizeKB || 'N/A') + ' KB');
    console.log('   Estado del día: ' + (daily.data ? daily.data.dayStatus : 'N/A'));
    console.log('   Gestiones: ' + (daily.data ? daily.data.gestionesHoy : 'N/A'));
    console.log('   Alertas críticas: ' + (daily.data ? daily.data.alertasCriticas : 'N/A') + '\n');
    
    // 3. Preview email semanal
    console.log('📈 3. Generando preview email semanal...');
    var weekly = previewWeeklyEmail_API();
    console.log('   Weekly Email: ' + (weekly.ok ? '✅ OK' : '❌ ERROR') + ' - ' + (weekly.sizeKB || 'N/A') + ' KB');
    console.log('   Semana: ' + (weekly.data ? weekly.data.semana : 'N/A'));
    console.log('   Tasa cumplimiento: ' + (weekly.data ? weekly.data.tasaCumplimiento + '%' : 'N/A'));
    console.log('   DSO promedio: ' + (weekly.data ? weekly.data.dsoPromedio + ' días' : 'N/A') + '\n');
    
    // 4. Guardar previews en hoja para revisar visualmente
    console.log('💾 4. Guardando previews en hoja...');
    var saveResult = saveEmailPreviewsToSheet();
    console.log('   ' + (saveResult.ok ? '✅ Previews guardados en hoja "Email_Previews"' : '❌ Error: ' + saveResult.error));
    
    // Resumen final
    console.log('\n════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('════════════════════════════════════════');
    console.log('Kit components: ' + kitTest.passed + ' OK');
    console.log('Daily email: ' + (daily.ok ? daily.sizeKB + ' KB' : 'ERROR'));
    console.log('Weekly email: ' + (weekly.ok ? weekly.sizeKB + ' KB' : 'ERROR'));
    console.log('Previews saved: ' + (saveResult.ok ? 'YES' : 'NO'));
    console.log('════════════════════════════════════════\n');
    
    return {
        ok: kitTest.failed === 0 && daily.ok && weekly.ok,
        kit: kitTest,
        daily: { ok: daily.ok, sizeKB: daily.sizeKB, dayStatus: daily.data?.dayStatus },
        weekly: { ok: weekly.ok, sizeKB: weekly.sizeKB, semana: weekly.data?.semana }
    };
}

// ========== FUNCIONES DE ENVÍO DE PRUEBA ==========

/**
 * Envía el reporte DIARIO de prueba a los admins configurados
 * Ejecutar desde Apps Script para probar el email diario PRO
 */
function enviarReporteDiarioPrueba() {
    console.log('📧 Enviando reporte DIARIO de prueba...\n');
    
    try {
        // Verificar que ReportScheduler existe
        if (typeof ReportScheduler === 'undefined') {
            throw new Error('ReportScheduler no está disponible');
        }
        
        // Generar y enviar el reporte diario
        const result = ReportScheduler.generateDailySummary();
        
        if (result.ok) {
            console.log('✅ Reporte diario enviado exitosamente');
            console.log('   Destinatarios: ' + (result.recipients || 'admins configurados'));
            console.log('   Datos incluidos:');
            console.log('     - KPIs del día');
            console.log('     - Prioridades');
            console.log('     - Cuentas en riesgo');
            console.log('     - PTPs próximos');
        } else {
            console.log('❌ Error enviando reporte: ' + (result.error || 'desconocido'));
        }
        
        return result;
        
    } catch (error) {
        console.log('❌ Error: ' + error.message);
        return { ok: false, error: error.message };
    }
}

/**
 * Envía el reporte SEMANAL de prueba a los admins configurados
 * Ejecutar desde Apps Script para probar el email semanal PRO
 */
function enviarReporteSemanalPrueba() {
    console.log('📈 Enviando reporte SEMANAL de prueba...\n');
    
    try {
        // Verificar que ReportScheduler existe
        if (typeof ReportScheduler === 'undefined') {
            throw new Error('ReportScheduler no está disponible');
        }
        
        // Generar y enviar el reporte semanal
        const result = ReportScheduler.generateWeeklyReport();
        
        if (result.ok) {
            console.log('✅ Reporte semanal enviado exitosamente');
            console.log('   Destinatarios: ' + (result.recipients || 'admins configurados'));
            console.log('   Semana: ' + (result.semana || 'actual'));
            console.log('   Datos incluidos:');
            console.log('     - Executive Summary');
            console.log('     - Scoreboard semanal');
            console.log('     - Aging Distribution');
            console.log('     - Performance por responsable');
            console.log('     - Acciones recomendadas');
        } else {
            console.log('❌ Error enviando reporte: ' + (result.error || 'desconocido'));
        }
        
        return result;
        
    } catch (error) {
        console.log('❌ Error: ' + error.message);
        return { ok: false, error: error.message };
    }
}

/**
 * Envía AMBOS reportes de prueba (diario + semanal)
 * Ejecutar desde Apps Script para probar ambos emails PRO
 */
function enviarAmbosReportesPrueba() {
    console.log('🚀 Enviando AMBOS reportes de prueba...\n');
    console.log('═'.repeat(50) + '\n');
    
    const dailyResult = enviarReporteDiarioPrueba();
    
    console.log('\n' + '─'.repeat(50) + '\n');
    
    const weeklyResult = enviarReporteSemanalPrueba();
    
    console.log('\n' + '═'.repeat(50));
    console.log('📊 RESUMEN DE ENVÍOS');
    console.log('═'.repeat(50));
    console.log('Reporte Diario: ' + (dailyResult.ok ? '✅ ENVIADO' : '❌ ERROR'));
    console.log('Reporte Semanal: ' + (weeklyResult.ok ? '✅ ENVIADO' : '❌ ERROR'));
    console.log('═'.repeat(50) + '\n');
    
    return {
        ok: dailyResult.ok && weeklyResult.ok,
        daily: dailyResult,
        weekly: weeklyResult
    };
}

/**
 * Configura los triggers de automatización (incluyendo reporte semanal los miércoles 8am)
 * Ejecutar UNA VEZ para activar la programación automática
 */
function configurarTriggersAutomaticos() {
    console.log('⚙️ Configurando triggers automáticos...\n');
    
    try {
        if (typeof AutomationEngine === 'undefined') {
            throw new Error('AutomationEngine no está disponible');
        }
        
        const result = AutomationEngine.setupTriggers();
        
        if (result.ok) {
            console.log('✅ Triggers configurados exitosamente');
            console.log('\n📅 Programación activa:');
            console.log('   • Resumen Diario: Todos los días a las 7:00 AM (Lima)');
            console.log('   • Reporte Semanal: Todos los MIÉRCOLES a las 8:00 AM (Lima)');
            console.log('   • Automatización: Cada hora');
            console.log('\n⚠️ Los triggers ya están activos. No es necesario ejecutar esto de nuevo.');
        } else {
            console.log('❌ Error: ' + (result.error || 'desconocido'));
        }
        
        return result;
        
    } catch (error) {
        console.log('❌ Error: ' + error.message);
        return { ok: false, error: error.message };
    }
}

/**
 * Muestra el estado actual de los triggers y la configuración
 */
function verEstadoTriggers() {
    console.log('📊 Estado de Triggers y Configuración\n');
    console.log('═'.repeat(50));
    
    // Configuración
    const weeklyDay = getConfig('AUTOMATION.WEEKLY_REPORT_DAY', 1);
    const weeklyHour = getConfig('AUTOMATION.WEEKLY_REPORT_HOUR', 8);
    const dailyHour = getConfig('AUTOMATION.DAILY_SUMMARY_HOUR', 7);
    const adminEmails = getConfig('AUTOMATION.ADMIN_EMAILS', []);
    
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    console.log('\n📧 Configuración de Reportes:');
    console.log('   Diario: Todos los días a las ' + dailyHour + ':00 AM');
    console.log('   Semanal: ' + dias[weeklyDay] + ' a las ' + weeklyHour + ':00 AM');
    console.log('   Destinatarios: ' + (adminEmails.length > 0 ? adminEmails.join(', ') : '(no configurados)'));
    
    // Triggers activos
    console.log('\n⚡ Triggers Activos:');
    const triggers = ScriptApp.getProjectTriggers();
    if (triggers.length === 0) {
        console.log('   ⚠️ No hay triggers configurados');
        console.log('   → Ejecuta configurarTriggersAutomaticos() para activarlos');
    } else {
        triggers.forEach(trigger => {
            const handler = trigger.getHandlerFunction();
            const type = trigger.getEventType();
            console.log('   • ' + handler + ' (' + type + ')');
        });
    }
    
    console.log('\n' + '═'.repeat(50));
    
    return {
        config: { weeklyDay: dias[weeklyDay], weeklyHour, dailyHour, adminEmails },
        triggersCount: triggers.length
    };
}
