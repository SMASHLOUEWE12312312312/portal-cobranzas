/**
 * @fileoverview Test de verificación de Fase 1 - Fundamentos Críticos
 * @version 1.0.0
 * 
 * EJECUTAR: runFase1Tests() desde Apps Script Editor
 */

function runFase1Tests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('           VERIFICACIÓN FASE 1 - FUNDAMENTOS CRÍTICOS         ');
    console.log('══════════════════════════════════════════════════════════════');

    const results = {
        timestamp: new Date().toISOString(),
        tests: [],
        passed: 0,
        failed: 0
    };

    // Test 1: Feature Flags
    console.log('\n📋 Test 1: Feature Flags');
    console.log('─────────────────────────────────────────');
    try {
        const flags = ['ENABLE_ERROR_HANDLER', 'ENABLE_CACHE_HELPER', 'ENABLE_AUTO_BACKUP', 'ENABLE_KPI_DASHBOARD'];
        let allPresent = true;
        flags.forEach(flag => {
            const value = getConfig(`FEATURES.${flag}`, null);
            if (value === null) {
                console.log(`   ❌ ${flag}: NO CONFIGURADO`);
                allPresent = false;
            } else {
                console.log(`   ✅ ${flag}: ${value}`);
            }
        });
        results.tests.push({ name: 'Feature Flags', passed: allPresent });
        if (allPresent) results.passed++; else results.failed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'Feature Flags', passed: false, error: e.message });
        results.failed++;
    }

    // Test 2: ErrorHandler
    console.log('\n📋 Test 2: ErrorHandler');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof ErrorHandler === 'undefined') throw new Error('ErrorHandler no definido');
        console.log('   ✅ ErrorHandler definido');

        const testError = new Error('Test error');
        const handleResult = ErrorHandler.handle('TestContext', testError);
        console.log(`   ✅ handle() funcionando (category: ${handleResult.category})`);

        const softResult = ErrorHandler.softExec('Test', () => { throw new Error('Expected'); }, 'fallback');
        if (softResult !== 'fallback') throw new Error('softExec no retornó fallback');
        console.log('   ✅ softExec() funcionando');

        ErrorHandler.flush();
        console.log('   ✅ flush() ejecutado');

        results.tests.push({ name: 'ErrorHandler', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'ErrorHandler', passed: false, error: e.message });
        results.failed++;
    }

    // Test 3: CacheHelper
    console.log('\n📋 Test 3: CacheHelper');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof CacheHelper === 'undefined') throw new Error('CacheHelper no definido');
        console.log('   ✅ CacheHelper definido');

        const testKey = 'FASE1_TEST_' + Date.now();
        CacheHelper.set(testKey, { test: true }, 60);
        console.log('   ✅ set() funcionando');

        const getResult = CacheHelper.get(testKey);
        if (!getResult || !getResult.test) throw new Error('get() no retornó valor esperado');
        console.log('   ✅ get() funcionando');

        CacheHelper.remove(testKey);
        console.log('   ✅ remove() funcionando');

        const stats = CacheHelper.getStats();
        console.log(`   ✅ Stats: hits=${stats.hits}, misses=${stats.misses}`);

        results.tests.push({ name: 'CacheHelper', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'CacheHelper', passed: false, error: e.message });
        results.failed++;
    }

    // Test 4: BackupService
    console.log('\n📋 Test 4: BackupService');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof BackupService === 'undefined') throw new Error('BackupService no definido');
        console.log('   ✅ BackupService definido');

        const folder = BackupService._getOrCreateBackupFolder();
        console.log(`   ✅ Carpeta de backups: ${folder.getName()}`);

        const backups = BackupService.listBackups();
        console.log(`   ✅ listBackups(): ${backups.length} backups encontrados`);

        if (typeof runScheduledBackup !== 'function') throw new Error('runScheduledBackup no definida');
        if (typeof setupBackupTrigger !== 'function') throw new Error('setupBackupTrigger no definida');
        console.log('   ✅ Funciones de trigger presentes');

        results.tests.push({ name: 'BackupService', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'BackupService', passed: false, error: e.message });
        results.failed++;
    }

    // Test 5: KPIService
    console.log('\n📋 Test 5: KPIService');
    console.log('─────────────────────────────────────────');
    try {
        if (typeof KPIService === 'undefined') throw new Error('KPIService no definido');
        console.log('   ✅ KPIService definido');

        console.log('   ⏳ Calculando KPIs...');
        const startTime = Date.now();
        const kpis = KPIService.getDashboardKPIs(true);
        const elapsed = Date.now() - startTime;

        if (!kpis.ok) throw new Error(`getDashboardKPIs falló: ${kpis.error || kpis.reason}`);
        console.log(`   ✅ getDashboardKPIs() OK (${elapsed}ms)`);

        if (kpis.available) {
            console.log(`   📊 Registros: ${kpis.summary.totalRegistros}`);
            console.log(`   📊 Asegurados: ${kpis.summary.totalAsegurados}`);
            console.log(`   📊 % Vencido: ${kpis.summary.porcentajeVencido}%`);
            console.log(`   📊 DSO: ${kpis.dso.value} días`);
        } else {
            console.log(`   ⚠️  KPIs no disponibles: ${kpis.reason}`);
        }

        results.tests.push({ name: 'KPIService', passed: true });
        results.passed++;
    } catch (e) {
        console.log(`   ❌ Error: ${e.message}`);
        results.tests.push({ name: 'KPIService', passed: false, error: e.message });
        results.failed++;
    }

    // Resumen
    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('                         RESUMEN                                ');
    console.log('══════════════════════════════════════════════════════════════');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.failed === 0) {
        console.log('\n🎉 ¡FASE 1 VERIFICADA EXITOSAMENTE!');
    } else {
        console.log('\n⚠️  HAY TESTS FALLIDOS - Revisar errores antes de continuar');
    }
    console.log('══════════════════════════════════════════════════════════════');

    return results;
}

function checkFase1Status() {
    return {
        errorHandler: typeof ErrorHandler !== 'undefined',
        cacheHelper: typeof CacheHelper !== 'undefined',
        backupService: typeof BackupService !== 'undefined',
        kpiService: typeof KPIService !== 'undefined',
        flags: {
            errorHandler: getConfig('FEATURES.ENABLE_ERROR_HANDLER', false),
            cacheHelper: getConfig('FEATURES.ENABLE_CACHE_HELPER', false),
            autoBackup: getConfig('FEATURES.ENABLE_AUTO_BACKUP', false),
            kpiDashboard: getConfig('FEATURES.ENABLE_KPI_DASHBOARD', false)
        }
    };
}
