/**
 * TEST DIRECTO - Ejecutar desde Apps Script Editor
 */

function testBitacoraDirectoEditor() {
  Logger.log('========================================');
  Logger.log('TEST: Lectura Directa de Bitácora');
  Logger.log('========================================');
  
  try {
    // Test 1: Verificar SPREADSHEET_ID
    var ssId = getConfig('SPREADSHEET_ID', '');
    Logger.log('1. SPREADSHEET_ID: ' + (ssId ? ssId.substring(0, 20) + '...' : 'VACÍO'));
    
    if (!ssId) {
      Logger.log('ERROR: SPREADSHEET_ID no configurado');
      return { ok: false, error: 'SPREADSHEET_ID vacío' };
    }
    
    // Test 2: Abrir spreadsheet
    Logger.log('2. Abriendo spreadsheet...');
    var ss = SpreadsheetApp.openById(ssId);
    Logger.log('   Spreadsheet: ' + ss.getName());
    
    // Test 3: Obtener hoja
    Logger.log('3. Buscando hoja Bitacora_Gestiones_EECC...');
    var sheet = ss.getSheetByName('Bitacora_Gestiones_EECC');
    
    if (!sheet) {
      Logger.log('ERROR: Hoja no encontrada');
      return { ok: false, error: 'Hoja no existe' };
    }
    
    Logger.log('   Hoja encontrada');
    
    // Test 4: Leer datos
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    Logger.log('4. Últimas fila/columna: ' + lastRow + '/' + lastCol);
    
    if (lastRow < 2) {
      Logger.log('   Hoja vacía (solo headers)');
      return { ok: true, filas: 0, mensaje: 'Hoja vacía' };
    }
    
    // Leer headers y datos
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    Logger.log('5. Headers: ' + headers.join(', '));
    Logger.log('6. Filas de datos: ' + data.length);
    
    if (data.length > 0) {
      Logger.log('7. Primera fila:');
      Logger.log('   ID_CICLO: ' + data[0][0]);
      Logger.log('   ASEGURADO: ' + data[0][5]);
      Logger.log('   ESTADO: ' + data[0][9]);
    }
    
    Logger.log('========================================');
    Logger.log('✅ TEST EXITOSO - ' + data.length + ' gestiones encontradas');
    Logger.log('========================================');
    
    return {
      ok: true,
      filas: data.length,
      headers: headers,
      primeraFila: data[0]
    };
    
  } catch (error) {
    Logger.log('========================================');
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    Logger.log('========================================');
    
    return {
      ok: false,
      error: error.message,
      stack: error.stack
    };
  }
}


/**
 * TEST USANDO getActive() - Debe funcionar si el script está vinculado
 */
function testBitacoraUsandoGetActive() {
  Logger.log('========================================');
  Logger.log('TEST: Usando getActive()');
  Logger.log('========================================');
  
  try {
    // Test 1: getActive()
    Logger.log('1. Llamando SpreadsheetApp.getActive()...');
    var ss = SpreadsheetApp.getActive();
    
    if (!ss) {
      Logger.log('ERROR: getActive() devolvió null');
      return { ok: false, error: 'getActive() falló' };
    }
    
    Logger.log('✅ Spreadsheet: ' + ss.getName());
    Logger.log('   ID: ' + ss.getId());
    Logger.log('   URL: ' + ss.getUrl());
    
    // Test 2: Obtener hoja
    Logger.log('2. Buscando hoja Bitacora_Gestiones_EECC...');
    var sheet = ss.getSheetByName('Bitacora_Gestiones_EECC');
    
    if (!sheet) {
      Logger.log('ERROR: Hoja no encontrada');
      return { ok: false, error: 'Hoja no existe' };
    }
    
    Logger.log('   ✅ Hoja encontrada');
    
    // Test 3: Leer datos
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    Logger.log('3. Dimensiones: ' + lastRow + ' filas x ' + lastCol + ' columnas');
    
    if (lastRow < 2) {
      Logger.log('   ⚠️ Hoja vacía (solo headers)');
      return { ok: true, filas: 0, mensaje: 'Hoja vacía' };
    }
    
    // Leer todas las filas
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    
    Logger.log('4. Datos leídos:');
    Logger.log('   Headers: ' + headers.length);
    Logger.log('   Filas: ' + data.length);
    
    if (data.length > 0) {
      Logger.log('5. Primera gestión:');
      Logger.log('   ' + headers[0] + ': ' + data[0][0]);
      Logger.log('   ' + headers[5] + ': ' + data[0][5]);
      Logger.log('   ' + headers[9] + ': ' + data[0][9]);
    }
    
    Logger.log('========================================');
    Logger.log('✅ TEST COMPLETADO - ' + data.length + ' gestiones');
    Logger.log('========================================');
    
    return {
      ok: true,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      filas: data.length,
      columnas: lastCol
    };
    
  } catch (error) {
    Logger.log('========================================');
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    Logger.log('========================================');
    
    return {
      ok: false,
      error: error.message,
      stack: error.stack
    };
  }
}
