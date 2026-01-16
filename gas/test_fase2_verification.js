/**
 * @fileoverview Test de verificación de Fase 2 - Core de Cobranzas
 * @version 1.0.0
 * 
 * EJECUTAR: runFase2Tests() desde Apps Script Editor
 */

function runFase2Tests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('           VERIFICACIÓN FASE 2 - CORE DE COBRANZAS            ');
    console.log('══════════════════════════════════════════════════════════════');

    const results = { timestamp: new Date().toISOString(), tests: [], passed: 0, failed: 0 };

    // Test 1: Feature Flags
    console.log('\n📋 Test 1: Feature Flags Fase 2');
    console.log('─────────────────────────────────────────');
    try {
        const flags = ['ENABLE_ALERT_SERVICE', 'ENABLE_PTP_SERVICE', 'ENABLE_COLLECTION_WORKFLOW'];
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

    // Test 2: AlertService
    console.log('\n📋 Test 2: AlertService');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof AlertService === 'undefined') throw new Error('AlertService no definido');
        console.log('   ✅ AlertService definido');
        ['getActiveAlerts', 'getAlertSummary', 'getAlertsByAsegurado'].forEach(m => {
            if (typeof AlertService[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        const alerts = AlertService.getActiveAlerts();
        console.log(`   ✅ getActiveAlerts(): ${alerts.ok ? (alerts.summary?.total || 0) + ' alertas' : 'error'}`);
        results.tests.push({ name: 'AlertService', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'AlertService', passed: false, error: e.message });
        results.failed++;
    }

    // Test 3: PTPService
    console.log('\n📋 Test 3: PTPService');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof PTPService === 'undefined') throw new Error('PTPService no definido');
        console.log('   ✅ PTPService definido');
        ['registrarPTP', 'actualizarPTP', 'getPTPsPendientes', 'getMetricasCumplimiento'].forEach(m => {
            if (typeof PTPService[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        if (!PTPService.STATUS || !PTPService.STATUS.PENDIENTE) throw new Error('Estados PTP no definidos');
        console.log('   ✅ Estados PTP definidos');
        const metricas = PTPService.getMetricasCumplimiento();
        console.log(`   ✅ getMetricasCumplimiento(): ${metricas.ok ? 'OK' : 'error'}`);
        results.tests.push({ name: 'PTPService', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'PTPService', passed: false, error: e.message });
        results.failed++;
    }

    // Test 4: CollectionWorkflow
    console.log('\n📋 Test 4: CollectionWorkflow');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof CollectionWorkflow === 'undefined') throw new Error('CollectionWorkflow no definido');
        console.log('   ✅ CollectionWorkflow definido');
        ['getNextAction', 'getWorkQueue', 'evaluateEscalation', 'getWorkflowStats'].forEach(m => {
            if (typeof CollectionWorkflow[m] !== 'function') throw new Error(`Método ${m} no encontrado`);
        });
        console.log('   ✅ Métodos principales presentes');
        if (!CollectionWorkflow.CADENCE || CollectionWorkflow.CADENCE.PRIMER_CONTACTO === undefined) throw new Error('Cadencia no definida');
        console.log(`   ✅ Cadencia definida (escalamiento soft: ${CollectionWorkflow.CADENCE.ESCALAMIENTO_SOFT} días)`);
        const stats = CollectionWorkflow.getWorkflowStats();
        console.log(`   ✅ getWorkflowStats(): ${stats.ok ? stats.totalCiclos + ' ciclos' : 'error'}`);
        results.tests.push({ name: 'CollectionWorkflow', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'CollectionWorkflow', passed: false, error: e.message });
        results.failed++;
    }

    // Test 5: Integración con Fase 1
    console.log('\n📋 Test 5: Integración con Fase 1');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof ErrorHandler === 'undefined') throw new Error('ErrorHandler (Fase 1) no disponible');
        if (typeof CacheHelper === 'undefined') throw new Error('CacheHelper (Fase 1) no disponible');
        if (typeof KPIService === 'undefined') throw new Error('KPIService (Fase 1) no disponible');
        console.log('   ✅ Servicios Fase 1 disponibles');
        AlertService.getActiveAlerts({ forceRefresh: true });
        console.log('   ✅ AlertService integrado con KPIService');
        results.tests.push({ name: 'Integración Fase 1', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'Integración Fase 1', passed: false, error: e.message });
        results.failed++;
    }

    // Test 6: APIs Globales
    console.log('\n📋 Test 6: APIs Globales');
    console.log('─────────────────────────────────────────');
    try {
        const apis = ['getActiveAlerts_API', 'registrarPTP_API', 'getPTPsPendientes_API', 'getWorkQueue_API', 'getWorkflowStats_API'];
        apis.forEach(api => { if (typeof eval(api) !== 'function') throw new Error(`API ${api} no definida`); });
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
    if (results.failed === 0) console.log('\n🎉 ¡FASE 2 VERIFICADA EXITOSAMENTE!');
    else console.log('\n⚠️  HAY TESTS FALLIDOS - Revisar errores');
    console.log('══════════════════════════════════════════════════════════════');
    return results;
}

function checkFase2Status() {
    return {
        alertService: typeof AlertService !== 'undefined',
        ptpService: typeof PTPService !== 'undefined',
        collectionWorkflow: typeof CollectionWorkflow !== 'undefined',
        flags: {
            alertService: getConfig('FEATURES.ENABLE_ALERT_SERVICE', false),
            ptpService: getConfig('FEATURES.ENABLE_PTP_SERVICE', false),
            collectionWorkflow: getConfig('FEATURES.ENABLE_COLLECTION_WORKFLOW', false)
        }
    };
}
