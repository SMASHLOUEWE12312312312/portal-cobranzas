/**
 * @fileoverview Test de verificación de Fase 5 - UX & Optimización
 * @version 1.0.0
 *
 * EJECUTAR: runFase5Tests() desde Apps Script Editor
 */

function runFase5Tests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('           VERIFICACIÓN FASE 5 - UX & OPTIMIZACIÓN            ');
  console.log('══════════════════════════════════════════════════════════════');

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    passed: 0,
    failed: 0
  };

  // Test 1: Feature Flags
  console.log('\n📋 Test 1: Feature Flags Fase 5');
  console.log('─────────────────────────────────────────');
  try {
    const flags = ['ENABLE_UX_HELPERS', 'ENABLE_RESPONSE_FORMATTER', 'ENABLE_PERFORMANCE_MONITOR'];
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

  // Test 2: UXHelpers
  console.log('\n📋 Test 2: UXHelpers');
  console.log('─────────────────────────────────────────');
  try {
    if (typeof UXHelpers === 'undefined') throw new Error('UXHelpers no definido');
    console.log('   ✅ UXHelpers definido');

    // Test formatCurrency
    const currencyTest = UXHelpers.formatCurrency(1234.56, 'PEN');
    if (!currencyTest.includes('S/')) throw new Error('formatCurrency incorrecto');
    console.log(`   ✅ formatCurrency: ${currencyTest}`);

    // Test formatDate
    const dateTest = UXHelpers.formatDate(new Date());
    if (!dateTest || dateTest === '-') throw new Error('formatDate incorrecto');
    console.log(`   ✅ formatDate: ${dateTest}`);

    // Test validación
    const emailValid = UXHelpers.isValidEmail('test@example.com');
    const emailInvalid = UXHelpers.isValidEmail('invalid');
    if (!emailValid || emailInvalid) throw new Error('isValidEmail incorrecto');
    console.log('   ✅ isValidEmail funciona correctamente');

    // Test RUC
    const rucValid = UXHelpers.isValidRUC('20123456789');
    const rucInvalid = UXHelpers.isValidRUC('123');
    if (!rucValid || rucInvalid) throw new Error('isValidRUC incorrecto');
    console.log('   ✅ isValidRUC funciona correctamente');

    results.tests.push({ name: 'UXHelpers', passed: true });
    results.passed++;
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    results.tests.push({ name: 'UXHelpers', passed: false, error: e.message });
    results.failed++;
  }

  // Test 3: ResponseFormatter
  console.log('\n📋 Test 3: ResponseFormatter');
  console.log('─────────────────────────────────────────');
  try {
    if (typeof ResponseFormatter === 'undefined') throw new Error('ResponseFormatter no definido');
    console.log('   ✅ ResponseFormatter definido');

    // Test success response
    const successResp = ResponseFormatter.success({ test: 'data' });
    if (!successResp.ok || !successResp.apiVersion) throw new Error('success() incorrecto');
    console.log('   ✅ success() genera respuesta correcta');

    // Test error response
    const errorResp = ResponseFormatter.error('Test error', 'TEST_CODE');
    if (errorResp.ok || !errorResp.error) throw new Error('error() incorrecto');
    console.log('   ✅ error() genera respuesta correcta');

    // Test paginated
    const paginatedResp = ResponseFormatter.successPaginated([1,2,3], { page: 1, pageSize: 10, total: 100 });
    if (!paginatedResp.meta.pagination) throw new Error('successPaginated() incorrecto');
    console.log('   ✅ successPaginated() genera respuesta correcta');

    results.tests.push({ name: 'ResponseFormatter', passed: true });
    results.passed++;
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    results.tests.push({ name: 'ResponseFormatter', passed: false, error: e.message });
    results.failed++;
  }

  // Test 4: PerformanceMonitor
  console.log('\n📋 Test 4: PerformanceMonitor');
  console.log('─────────────────────────────────────────');
  try {
    if (typeof PerformanceMonitor === 'undefined') throw new Error('PerformanceMonitor no definido');
    console.log('   ✅ PerformanceMonitor definido');

    // Test timer
    const timerId = PerformanceMonitor.startTimer('TEST_OP', { test: true });
    Utilities.sleep(100); // Simular operación
    const metrics = PerformanceMonitor.endTimer(timerId);

    if (!metrics.duration || metrics.duration < 90) throw new Error('Timer incorrecto');
    console.log(`   ✅ Timer funciona: ${metrics.duration}ms`);

    // Test measure
    const measured = PerformanceMonitor.measure('TEST_MEASURE', () => {
      Utilities.sleep(50);
      return { ok: true, count: 5 };
    });
    if (!measured.result || !measured.metrics) throw new Error('measure() incorrecto');
    console.log('   ✅ measure() funciona correctamente');

    results.tests.push({ name: 'PerformanceMonitor', passed: true });
    results.passed++;
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    results.tests.push({ name: 'PerformanceMonitor', passed: false, error: e.message });
    results.failed++;
  }

  // Test 5: Integración con Fases Anteriores
  console.log('\n📋 Test 5: Integración con Fases Anteriores');
  console.log('─────────────────────────────────────────');
  try {
    // Fase 1-4
    const services = [
      'CacheHelper', 'KPIService',           // Fase 1
      'AlertService', 'PTPService',          // Fase 2
      'ReportScheduler',                     // Fase 3
      'AnalyticsService', 'DashboardService' // Fase 4
    ];

    services.forEach(s => {
      if (typeof eval(s) === 'undefined') throw new Error(`${s} no disponible`);
    });
    console.log('   ✅ Todos los servicios de fases anteriores disponibles');

    results.tests.push({ name: 'Integración Fases Anteriores', passed: true });
    results.passed++;
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    results.tests.push({ name: 'Integración Fases Anteriores', passed: false, error: e.message });
    results.failed++;
  }

  // Test 6: APIs Globales
  console.log('\n📋 Test 6: APIs Globales Fase 5');
  console.log('─────────────────────────────────────────');
  try {
    const apis = [
      'formatCurrency_API',
      'formatDate_API',
      'getStatusBadge_API',
      'validateInput_API',
      'formatSuccessResponse_API',
      'formatErrorResponse_API',
      'getPerformanceStats_API'
    ];

    apis.forEach(api => {
      if (typeof eval(api) !== 'function') throw new Error(`API ${api} no definida`);
    });
    console.log('   ✅ Todas las APIs globales de Fase 5 definidas');

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
    console.log('\n🎉 ¡FASE 5 VERIFICADA EXITOSAMENTE!');
    console.log('\n🏆 ¡ROADMAP DE 5 FASES COMPLETADO!');
  } else {
    console.log('\n⚠️  HAY TESTS FALLIDOS - Revisar errores');
  }
  console.log('══════════════════════════════════════════════════════════════');

  return results;
}

/**
 * Test de no-regresión para todas las fases
 */
function runFullRegressionTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('              TEST DE NO-REGRESIÓN - TODAS LAS FASES          ');
  console.log('══════════════════════════════════════════════════════════════');

  const phases = [
    { name: 'Fase 1', testFn: typeof runFase1Tests === 'function' ? runFase1Tests : null },
    { name: 'Fase 2', testFn: typeof runFase2Tests === 'function' ? runFase2Tests : null },
    { name: 'Fase 3', testFn: typeof runFase3Tests === 'function' ? runFase3Tests : null },
    { name: 'Fase 4', testFn: typeof runFase4Tests === 'function' ? runFase4Tests : null },
    { name: 'Fase 5', testFn: runFase5Tests }
  ];

  const summary = {
    timestamp: new Date().toISOString(),
    phases: [],
    totalPassed: 0,
    totalFailed: 0
  };

  phases.forEach(phase => {
    console.log(`\n🔄 Ejecutando tests de ${phase.name}...`);

    if (!phase.testFn) {
      console.log(`   ⚠️ Tests de ${phase.name} no disponibles`);
      summary.phases.push({ name: phase.name, status: 'SKIPPED' });
      return;
    }

    try {
      const result = phase.testFn();
      summary.phases.push({
        name: phase.name,
        status: result.failed === 0 ? 'PASSED' : 'FAILED',
        passed: result.passed,
        failed: result.failed
      });
      summary.totalPassed += result.passed;
      summary.totalFailed += result.failed;
    } catch (e) {
      console.log(`   ❌ Error ejecutando ${phase.name}: ${e.message}`);
      summary.phases.push({ name: phase.name, status: 'ERROR', error: e.message });
      summary.totalFailed++;
    }
  });

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('                    RESUMEN DE REGRESIÓN                       ');
  console.log('══════════════════════════════════════════════════════════════');

  summary.phases.forEach(p => {
    const icon = p.status === 'PASSED' ? '✅' : p.status === 'SKIPPED' ? '⏭️' : '❌';
    console.log(`${icon} ${p.name}: ${p.status}`);
  });

  console.log(`\nTotal: ${summary.totalPassed} passed, ${summary.totalFailed} failed`);

  if (summary.totalFailed === 0) {
    console.log('\n🎉 ¡NO HAY REGRESIONES! El sistema está estable.');
  } else {
    console.log('\n⚠️  SE DETECTARON REGRESIONES - REVISAR ANTES DE CONTINUAR');
  }

  return summary;
}

function checkFase5Status() {
  return {
    uxHelpers: typeof UXHelpers !== 'undefined',
    responseFormatter: typeof ResponseFormatter !== 'undefined',
    performanceMonitor: typeof PerformanceMonitor !== 'undefined',
    flags: {
      uxHelpers: getConfig('FEATURES.ENABLE_UX_HELPERS', false),
      responseFormatter: getConfig('FEATURES.ENABLE_RESPONSE_FORMATTER', false),
      performanceMonitor: getConfig('FEATURES.ENABLE_PERFORMANCE_MONITOR', false)
    }
  };
}
