/**
 * @fileoverview Test de verificación de Fase 3 - Automatización
 * @version 1.0.0
 * 
 * EJECUTAR: runFase3Tests() desde Apps Script Editor
 */

function runFase3Tests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('             VERIFICACIÓN FASE 3 - AUTOMATIZACIÓN             ');
    console.log('══════════════════════════════════════════════════════════════');

    const results = { timestamp: new Date().toISOString(), tests: [], passed: 0, failed: 0 };

    // Test 1: Feature Flags
    console.log('\n📋 Test 1: Feature Flags Fase 3');
    console.log('─────────────────────────────────────────');
    try {
        const flags = ['ENABLE_AUTOMATION_ENGINE', 'ENABLE_EMAIL_AUTOMATION', 'ENABLE_REPORT_SCHEDULER'];
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

    // Test 2: AutomationEngine
    console.log('\n📋 Test 2: AutomationEngine');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof AutomationEngine === 'undefined') throw new Error('AutomationEngine no definido');
        console.log('   ✅ AutomationEngine definido');
        ['runScheduledTasks', 'scheduleTask', 'getStatus', 'setupTriggers'].forEach(m => {
            if (typeof AutomationEngine[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        if (!AutomationEngine.TASK_TYPE || !AutomationEngine.TASK_TYPE.DAILY_SUMMARY) throw new Error('Tipos no definidos');
        console.log('   ✅ Tipos de tarea definidos');
        const status = AutomationEngine.getStatus();
        console.log(`   ✅ getStatus(): ${status.ok ? 'OK' : 'error'} (${status.pendingTasks} tareas pendientes)`);
        results.tests.push({ name: 'AutomationEngine', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'AutomationEngine', passed: false, error: e.message });
        results.failed++;
    }

    // Test 3: EmailAutomation
    console.log('\n📋 Test 3: EmailAutomation');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof EmailAutomation === 'undefined') throw new Error('EmailAutomation no definido');
        console.log('   ✅ EmailAutomation definido');
        ['sendPTPReminders', 'sendAgingAlerts', 'sendEscalationNotification', 'sendDailySummaryEmail'].forEach(m => {
            if (typeof EmailAutomation[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        if (!EmailAutomation.TEMPLATES || !EmailAutomation.TEMPLATES.PTP_REMINDER) throw new Error('Templates no definidos');
        console.log('   ✅ Templates definidos');
        results.tests.push({ name: 'EmailAutomation', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'EmailAutomation', passed: false, error: e.message });
        results.failed++;
    }

    // Test 4: ReportScheduler
    console.log('\n📋 Test 4: ReportScheduler');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof ReportScheduler === 'undefined') throw new Error('ReportScheduler no definido');
        console.log('   ✅ ReportScheduler definido');
        ['generateDailySummary', 'generateWeeklyReport', 'getReportHistory'].forEach(m => {
            if (typeof ReportScheduler[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        if (!ReportScheduler.DAILY_SHEET || !ReportScheduler.WEEKLY_SHEET) throw new Error('Hojas no configuradas');
        console.log('   ✅ Configuración de hojas presente');
        results.tests.push({ name: 'ReportScheduler', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'ReportScheduler', passed: false, error: e.message });
        results.failed++;
    }

    // Test 5: Integración con Fases 1 y 2
    console.log('\n📋 Test 5: Integración con Fases Anteriores');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof CacheHelper === 'undefined') throw new Error('CacheHelper (Fase 1) no disponible');
        if (typeof KPIService === 'undefined') throw new Error('KPIService (Fase 1) no disponible');
        console.log('   ✅ Servicios Fase 1 disponibles');
        if (typeof AlertService === 'undefined') throw new Error('AlertService (Fase 2) no disponible');
        if (typeof PTPService === 'undefined') throw new Error('PTPService (Fase 2) no disponible');
        if (typeof CollectionWorkflow === 'undefined') throw new Error('CollectionWorkflow (Fase 2) no disponible');
        console.log('   ✅ Servicios Fase 2 disponibles');
        results.tests.push({ name: 'Integración Fases Anteriores', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'Integración Fases Anteriores', passed: false, error: e.message });
        results.failed++;
    }

    // Test 6: Funciones de Trigger
    console.log('\n📋 Test 6: Funciones de Trigger');
    console.log('─────────────────────────────────────────');
    try {
        ['runAutomationEngine', 'runDailySummary', 'runWeeklyReport'].forEach(fn => {
            if (typeof eval(fn) !== 'function') throw new Error(`Función ${fn} no definida`);
        });
        console.log('   ✅ Funciones de trigger definidas');
        results.tests.push({ name: 'Funciones de Trigger', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'Funciones de Trigger', passed: false, error: e.message });
        results.failed++;
    }

    // Test 7: APIs Globales
    console.log('\n📋 Test 7: APIs Globales');
    console.log('─────────────────────────────────────────');
    try {
        ['getAutomationStatus_API', 'setupAutomationTriggers_API', 'sendPTPReminders_API', 'generateDailySummary_API', 'generateWeeklyReport_API'].forEach(api => {
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

    // Resumen
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('                         RESUMEN                                ');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    if (results.failed === 0) {
        console.log('\n🎉 ¡FASE 3 VERIFICADA EXITOSAMENTE!');
        console.log('\n📌 SIGUIENTE: Ejecutar setupAutomationTriggers_API() para activar triggers');
    } else {
        console.log('\n⚠️  HAY TESTS FALLIDOS - Revisar errores');
    }
    console.log('══════════════════════════════════════════════════════════════');
    return results;
}

function checkFase3Status() {
    return {
        automationEngine: typeof AutomationEngine !== 'undefined',
        emailAutomation: typeof EmailAutomation !== 'undefined',
        reportScheduler: typeof ReportScheduler !== 'undefined',
        flags: {
            automationEngine: getConfig('FEATURES.ENABLE_AUTOMATION_ENGINE', false),
            emailAutomation: getConfig('FEATURES.ENABLE_EMAIL_AUTOMATION', false),
            reportScheduler: getConfig('FEATURES.ENABLE_REPORT_SCHEDULER', false)
        },
        triggers: typeof AutomationEngine !== 'undefined' ? AutomationEngine.getStatus().triggersActive : 0
    };
}
