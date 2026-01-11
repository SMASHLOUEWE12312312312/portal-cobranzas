/**
 * TESTS DEFINITIVOS PARA IDENTIFICAR EL PROBLEMA
 * 
 * Estas funciones son ULTRA-SIMPLES para aislar el problema
 */

// ========== TEST 1: Función más simple posible ==========
function testUltraSimple() {
  return {
    test: 'ultra-simple',
    version: 'v5.0',
    timestamp: new Date().toISOString(),
    message: 'Si ves esto, el deployment funciona'
  };
}

// ========== TEST 2: Verificar que el código nuevo existe ==========
function testVerificarCodigoNuevo() {
  var tests = {
    version: 'v5.0-TEST-DEFINITIVO',
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Test 1: ¿Existe getDeploymentVersion?
  tests.tests.getDeploymentVersion = typeof getDeploymentVersion === 'function';
  
  // Test 2: ¿Existe bitacoraGetAllDataV3Final?
  tests.tests.bitacoraGetAllDataV3Final = typeof bitacoraGetAllDataV3Final === 'function';
  
  // Test 3: ¿Está configurado el SPREADSHEET_ID?
  try {
    var ssId = getConfig('SPREADSHEET_ID', '');
    tests.tests.spreadsheetIdConfigured = ssId !== '';
    tests.tests.spreadsheetIdValue = ssId ? ssId.substring(0, 20) + '...' : 'VACIO';
  } catch (e) {
    tests.tests.spreadsheetIdConfigured = false;
    tests.tests.spreadsheetIdError = e.message;
  }
  
  // Test 4: ¿Existe SheetsIO._getSpreadsheet?
  tests.tests.sheetsIOGetSpreadsheet = typeof SheetsIO !== 'undefined' && typeof SheetsIO._getSpreadsheet === 'function';
  
  return tests;
}

// ========== TEST 3: Probar lectura directa SIN SheetsIO ==========
function testLeerBitacoraDirecto() {
  var resultado = {
    version: 'v5.0-TEST-DIRECTO',
    timestamp: new Date().toISOString(),
    pasos: []
  };
  
  try {
    resultado.pasos.push('1. Iniciando lectura directa');
    
    // Intentar obtener el ID
    var ssId = getConfig('SPREADSHEET_ID', '');
    resultado.pasos.push('2. SPREADSHEET_ID obtenido: ' + (ssId ? ssId.substring(0, 20) + '...' : 'VACIO'));
    
    if (!ssId) {
      resultado.error = 'SPREADSHEET_ID no configurado';
      return resultado;
    }
    
    // Intentar abrir el spreadsheet
    resultado.pasos.push('3. Abriendo spreadsheet...');
    var ss = SpreadsheetApp.openById(ssId);
    resultado.pasos.push('4. Spreadsheet abierto: ' + ss.getName());
    
    // Intentar obtener la hoja
    resultado.pasos.push('5. Buscando hoja Bitacora_Gestiones_EECC...');
    var sheet = ss.getSheetByName('Bitacora_Gestiones_EECC');
    
    if (!sheet) {
      resultado.error = 'Hoja Bitacora_Gestiones_EECC no encontrada';
      return resultado;
    }
    
    resultado.pasos.push('6. Hoja encontrada');
    
    // Obtener datos
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    resultado.pasos.push('7. Últimas fila/columna: ' + lastRow + '/' + lastCol);
    
    if (lastRow < 2) {
      resultado.ok = true;
      resultado.filas = 0;
      resultado.mensaje = 'Hoja vacía (solo headers)';
      return resultado;
    }
    
    // Leer headers
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    resultado.pasos.push('8. Headers leídos: ' + headers.length + ' columnas');
    
    // Leer datos
    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    resultado.pasos.push('9. Datos leídos: ' + data.length + ' filas');
    
    resultado.ok = true;
    resultado.filas = data.length;
    resultado.headers = headers;
    resultado.primeraFila = data[0];
    
    return resultado;
    
  } catch (error) {
    resultado.ok = false;
    resultado.error = error.message;
    resultado.stack = error.stack;
    return resultado;
  }
}

// ========== TEST 4: Ejecutar todos los tests ==========
function ejecutarTodosLosTests() {
  var resultados = {
    version: 'v5.0-SUITE-COMPLETA',
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Test 1
  try {
    resultados.tests.test1_ultraSimple = testUltraSimple();
  } catch (e) {
    resultados.tests.test1_ultraSimple = { error: e.message };
  }
  
  // Test 2
  try {
    resultados.tests.test2_verificarCodigo = testVerificarCodigoNuevo();
  } catch (e) {
    resultados.tests.test2_verificarCodigo = { error: e.message };
  }
  
  // Test 3
  try {
    resultados.tests.test3_lecturaDirecta = testLeerBitacoraDirecto();
  } catch (e) {
    resultados.tests.test3_lecturaDirecta = { error: e.message };
  }
  
  return resultados;
}

