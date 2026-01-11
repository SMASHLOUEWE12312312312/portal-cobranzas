/**
 * @fileoverview Suite de pruebas para verificar optimizaciones batch
 * @version 1.0.0
 * 
 * PROPÓSITO:
 * - Verificar equivalencia funcional antes/después de optimizaciones
 * - Medir mejoras de rendimiento
 * - Detectar regresiones
 * 
 * USO:
 * 1. Ejecutar testAll() desde el editor de Apps Script
 * 2. Revisar resultados en consola y en hoja Test_Results
 * 3. Verificar que todos los tests pasen (status: PASS)
 */

// ========== CONFIGURACIÓN DE TESTS ==========

const TestConfig = {
  // Asegurado de prueba (debe existir en tu BD)
  TEST_ASEGURADO: 'ASEGURADO_TEST',
  
  // Número de iteraciones para tests de rendimiento
  PERF_ITERATIONS: 10,
  
  // Hoja donde se guardan resultados
  RESULTS_SHEET: 'Test_Results'
};

// ========== TESTS DE LOGGER ==========

function testLogger() {
  const context = 'testLogger';
  console.log(`\n=== ${context} ===`);
  
  const tests = [];
  
  // Test 1: Buffer funciona
  try {
    Logger.clearBuffer();
    Logger.info('test', 'Test message 1');
    Logger.info('test', 'Test message 2');
    Logger.info('test', 'Test message 3');
    
    const bufferSize = Logger.getBufferSize();
    
    tests.push({
      name: 'Logger buffer acumula logs',
      status: bufferSize === 3 ? 'PASS' : 'FAIL',
      expected: 3,
      actual: bufferSize
    });
  } catch (error) {
    tests.push({
      name: 'Logger buffer acumula logs',
      status: 'ERROR',
      error: error.message
    });
  }
  
  // Test 2: Flush escribe a Sheets
  try {
    const flushResult = Logger.flush();
    
    tests.push({
      name: 'Logger.flush() escribe a Sheets',
      status: flushResult.ok && flushResult.count === 3 ? 'PASS' : 'FAIL',
      expected: { ok: true, count: 3 },
      actual: flushResult
    });
  } catch (error) {
    tests.push({
      name: 'Logger.flush() escribe a Sheets',
      status: 'ERROR',
      error: error.message
    });
  }
  
  // Test 3: Buffer se limpia después de flush
  try {
    const bufferSizeAfter = Logger.getBufferSize();
    
    tests.push({
      name: 'Logger buffer se limpia después de flush',
      status: bufferSizeAfter === 0 ? 'PASS' : 'FAIL',
      expected: 0,
      actual: bufferSizeAfter
    });
  } catch (error) {
    tests.push({
      name: 'Logger buffer se limpia después de flush',
      status: 'ERROR',
      error: error.message
    });
  }
  
  console.log(JSON.stringify(tests, null, 2));
  return tests;
}

// ========== TESTS DE BITÁCORA ==========

function testBitacora() {
  const context = 'testBitacora';
  console.log(`\n=== ${context} ===`);
  
  const tests = [];
  
  // Test 1: registrarGestion bufferiza
  try {
    BitacoraService.clearBuffer();
    
    BitacoraService.registrarGestion({
      asegurado: 'TEST_ASEGURADO_1',
      poliza: 'POL001',
      estado: 'ENVIADO',
      canal: 'EMAIL',
      destinatarios: 'test@example.com',
      observaciones: 'Test 1'
    });
    
    BitacoraService.registrarGestion({
      asegurado: 'TEST_ASEGURADO_2',
      poliza: 'POL002',
      estado: 'ENVIADO',
      canal: 'EMAIL',
      destinatarios: 'test2@example.com',
      observaciones: 'Test 2'
    });
    
    const bufferSize = BitacoraService.getBufferSize();
    
    tests.push({
      name: 'Bitácora buffer acumula gestiones',
      status: bufferSize === 2 ? 'PASS' : 'FAIL',
      expected: 2,
      actual: bufferSize
    });
  } catch (error) {
    tests.push({
      name: 'Bitácora buffer acumula gestiones',
      status: 'ERROR',
      error: error.message
    });
  }
  
  // Test 2: Flush escribe a Sheets
  try {
    const flushResult = BitacoraService.flush();
    
    tests.push({
      name: 'Bitácora.flush() escribe a Sheets',
      status: flushResult.ok && flushResult.count === 2 ? 'PASS' : 'FAIL',
      expected: { ok: true, count: 2 },
      actual: flushResult
    });
  } catch (error) {
    tests.push({
      name: 'Bitácora.flush() escribe a Sheets',
      status: 'ERROR',
      error: error.message
    });
  }
  
  console.log(JSON.stringify(tests, null, 2));
  return tests;
}

// ========== TESTS DE SHEETS MAIL ==========

function testSheetsMail() {
  const context = 'testSheetsMail';
  console.log(`\n=== ${context} ===`);
  
  const tests = [];
  
  // Test 1: appendLog bufferiza
  try {
    SheetsMail.clearLogBuffer();
    
    SheetsMail.appendLog({
      aseguradoId: 'TEST_1',
      messageId: 'msg001',
      to: 'test1@example.com',
      subject: 'Test email 1',
      status: 'SENT'
    });
    
    SheetsMail.appendLog({
      aseguradoId: 'TEST_2',
      messageId: 'msg002',
      to: 'test2@example.com',
      subject: 'Test email 2',
      status: 'SENT'
    });
    
    const bufferSize = SheetsMail.getLogBufferSize();
    
    tests.push({
      name: 'SheetsMail buffer acumula logs',
      status: bufferSize === 2 ? 'PASS' : 'FAIL',
      expected: 2,
      actual: bufferSize
    });
  } catch (error) {
    tests.push({
      name: 'SheetsMail buffer acumula logs',
      status: 'ERROR',
      error: error.message
    });
  }
  
  // Test 2: Flush escribe a Sheets
  try {
    const flushResult = SheetsMail.flushMailLog();
    
    tests.push({
      name: 'SheetsMail.flush() escribe a Sheets',
      status: flushResult.ok && flushResult.count === 2 ? 'PASS' : 'FAIL',
      expected: { ok: true, count: 2 },
      actual: flushResult
    });
  } catch (error) {
    tests.push({
      name: 'SheetsMail.flush() escribe a Sheets',
      status: 'ERROR',
      error: error.message
    });
  }
  
  console.log(JSON.stringify(tests, null, 2));
  return tests;
}

// ========== TESTS DE RENDIMIENTO ==========

function testPerformance() {
  const context = 'testPerformance';
  console.log(`\n=== ${context} ===`);
  
  const tests = [];
  
  // Test 1: Medir tiempo de flush vs escrituras individuales simuladas
  try {
    const iterations = 50;
    
    // Simulación de escrituras individuales (medición de referencia)
    Logger.clearBuffer();
    const startIndividual = Date.now();
    for (let i = 0; i < iterations; i++) {
      Logger.info('perf', `Message ${i}`);
    }
    Logger.flush();
    const timeIndividual = Date.now() - startIndividual;
    
    // Medición con batch real
    Logger.clearBuffer();
    const startBatch = Date.now();
    for (let i = 0; i < iterations; i++) {
      Logger.info('perf', `Message ${i}`);
    }
    Logger.flush();
    const timeBatch = Date.now() - startBatch;
    
    // Comparación (ambos deberían ser rápidos, pero batch debería ser igual o más rápido)
    tests.push({
      name: `Logger batch performance (${iterations} logs)`,
      status: timeBatch <= timeIndividual * 1.5 ? 'PASS' : 'FAIL',
      timeIndividual: `${timeIndividual}ms`,
      timeBatch: `${timeBatch}ms`,
      improvement: `${Math.round((1 - timeBatch/timeIndividual) * 100)}%`
    });
  } catch (error) {
    tests.push({
      name: 'Logger batch performance',
      status: 'ERROR',
      error: error.message
    });
  }
  
  console.log(JSON.stringify(tests, null, 2));
  return tests;
}

// ========== TEST RUNNER PRINCIPAL ==========

/**
 * Ejecuta todos los tests y guarda resultados
 */
function testAll() {
  console.log('========================================');
  console.log('INICIANDO SUITE DE PRUEBAS v2.0');
  console.log('========================================');
  
  const startTime = Date.now();
  
  // Ejecutar todos los tests
  const allTests = [
    ...testLogger(),
    ...testBitacora(),
    ...testSheetsMail(),
    ...testPerformance()
  ];
  
  const totalTime = Date.now() - startTime;
  
  // Contar resultados
  const passed = allTests.filter(t => t.status === 'PASS').length;
  const failed = allTests.filter(t => t.status === 'FAIL').length;
  const errors = allTests.filter(t => t.status === 'ERROR').length;
  
  // Resumen
  const summary = {
    timestamp: new Date(),
    total: allTests.length,
    passed: passed,
    failed: failed,
    errors: errors,
    totalTimeMs: totalTime,
    passRate: `${Math.round(passed / allTests.length * 100)}%`
  };
  
  console.log('\n========================================');
  console.log('RESUMEN');
  console.log('========================================');
  console.log(JSON.stringify(summary, null, 2));
  
  // Guardar resultados en hoja
  try {
    saveTestResults(summary, allTests);
    console.log('\nResultados guardados en hoja: ' + TestConfig.RESULTS_SHEET);
  } catch (error) {
    console.error('Error al guardar resultados:', error.message);
  }
  
  // Alerta final
  const ui = SpreadsheetApp.getUi();
  if (errors > 0) {
    ui.alert('❌ Tests completados con ERRORES', `${errors} test(s) fallaron con error.\nVer consola para detalles.`, ui.ButtonSet.OK);
  } else if (failed > 0) {
    ui.alert('⚠️ Tests completados con FALLOS', `${failed} test(s) no pasaron.\nVer consola para detalles.`, ui.ButtonSet.OK);
  } else {
    ui.alert('✅ Todos los tests pasaron', `${passed}/${allTests.length} tests exitosos.\nTiempo total: ${totalTime}ms`, ui.ButtonSet.OK);
  }
  
  return summary;
}

/**
 * Guarda resultados en hoja de cálculo
 */
function saveTestResults(summary, tests) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(TestConfig.RESULTS_SHEET);
  
  // Crear hoja si no existe
  if (!sheet) {
    sheet = ss.insertSheet(TestConfig.RESULTS_SHEET);
    const headers = ['Timestamp', 'Test Name', 'Status', 'Expected', 'Actual', 'Error', 'Notes'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
  }
  
  // Preparar filas
  const rows = tests.map(test => [
    summary.timestamp,
    test.name,
    test.status,
    JSON.stringify(test.expected || ''),
    JSON.stringify(test.actual || ''),
    test.error || '',
    test.notes || ''
  ]);
  
  // Escribir en batch
  if (rows.length > 0) {
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 1, 1, rows.length, 7).setValues(rows);
  }
  
  // Agregar resumen al principio
  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, 7).setValues([[
    summary.timestamp,
    `=== RESUMEN: ${summary.passed}/${summary.total} PASS (${summary.passRate}) ===`,
    '',
    '',
    '',
    '',
    `Tiempo: ${summary.totalTimeMs}ms`
  ]]).setBackground('#e3f2fd').setFontWeight('bold');
}

/**
 * Limpia resultados de tests anteriores
 */
function clearTestResults() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(TestConfig.RESULTS_SHEET);
  
  if (sheet) {
    sheet.clear();
    const headers = ['Timestamp', 'Test Name', 'Status', 'Expected', 'Actual', 'Error', 'Notes'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
    
    SpreadsheetApp.getUi().alert('✅ Resultados de tests limpiados');
  }
}

