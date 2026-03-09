/**
 * @fileoverview Servicio de generación de reportes Excel
 * Módulo Reportes: Saldos a Favor y Vencidos +60 días
 *
 * Estrategia: Copia la hoja BD con todo su formato original,
 * luego elimina las filas que NO cumplen el filtro.
 * Así se preservan formatos de número, colores, anchos de columna, etc.
 */

/**
 * Busca índice de columna por nombre en headers (1-indexed para Sheets)
 * @param {string[]} headers - Headers de la hoja
 * @param {string} name - Nombre a buscar
 * @return {number} Índice 0-based, o -1 si no se encuentra
 */
function _findColIdx(headers, name) {
  var target = String(name).toUpperCase().replace(/[_\s]+/g, ' ').trim();
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toUpperCase().replace(/[_\s]+/g, ' ').trim();
    if (h === target) return i;
  }
  return -1;
}

/**
 * Copia la hoja BD a un spreadsheet temporal preservando todo el formato
 * @param {string} sheetName - Nombre de la hoja a copiar
 * @return {Object} { tempSS, sheet, ssId }
 */
function _copiarHojaBD(sheetName) {
  var ss = SheetsIO._getSpreadsheet();
  var srcSheet = ss.getSheetByName(sheetName);
  if (!srcSheet) throw new Error('Hoja "' + sheetName + '" no encontrada');

  // Crear spreadsheet temporal y copiar la hoja BD completa (con formato)
  var tempSS = SpreadsheetApp.create('temp_reporte');
  var copied = srcSheet.copyTo(tempSS);
  copied.setName(sheetName);

  // Eliminar la hoja vacía por defecto
  var defaultSheet = tempSS.getSheetByName('Sheet1') || tempSS.getSheetByName('Hoja 1');
  if (defaultSheet && tempSS.getSheets().length > 1) {
    tempSS.deleteSheet(defaultSheet);
  }

  return { tempSS: tempSS, sheet: copied, ssId: tempSS.getId() };
}

/**
 * Exporta spreadsheet temporal como XLSX y retorna base64
 * @param {string} ssId - ID del spreadsheet temporal
 * @param {string} fileName - Nombre del archivo
 * @return {Object} { base64, fileName }
 */
function _exportarYLimpiar(ssId, fileName) {
  SpreadsheetApp.flush();

  var exportUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=xlsx';
  var response = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    DriveApp.getFileById(ssId).setTrashed(true);
    throw new Error('Error exportando XLSX: HTTP ' + response.getResponseCode());
  }

  var base64 = Utilities.base64Encode(response.getContent());
  DriveApp.getFileById(ssId).setTrashed(true);

  return { base64: base64, fileName: fileName };
}

/**
 * Genera reporte de Saldos a Favor y Ajustes
 * Registros con IMPORTE negativo, cero o vacío
 */
function generarReporteSaldos() {
  var context = 'generarReporteSaldos';
  try {
    var sheetName = getConfig('SHEETS.BASE', 'BD');

    // 1. Copiar hoja BD con formato
    var copy = _copiarHojaBD(sheetName);
    var sheet = copy.sheet;

    // 2. Leer headers para encontrar columna IMPORTE
    var headerRow = getConfig('BD.HEADER_ROW', 1);
    var startRow = getConfig('BD.START_ROW', 2);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    var importeIdx = _findColIdx(headers, 'IMPORTE');
    if (importeIdx === -1) {
      DriveApp.getFileById(copy.ssId).setTrashed(true);
      return { ok: false, error: 'Columna IMPORTE no encontrada en BD' };
    }

    // 3. Leer valores de IMPORTE y determinar qué filas ELIMINAR
    var dataRows = lastRow - startRow + 1;
    if (dataRows <= 0) {
      DriveApp.getFileById(copy.ssId).setTrashed(true);
      return { ok: true, data: { base64: '', fileName: '', filas: 0 } };
    }

    var importeValues = sheet.getRange(startRow, importeIdx + 1, dataRows, 1).getValues();

    // Recopilar filas a eliminar (de abajo hacia arriba para no alterar índices)
    var rowsToDelete = [];
    for (var i = 0; i < importeValues.length; i++) {
      var val = importeValues[i][0];
      var keep = false;
      if (val === null || val === undefined || val === '') {
        keep = true; // vacío → incluir
      } else {
        var num = Number(val);
        keep = !isNaN(num) && num <= 0; // negativo o cero → incluir
      }
      if (!keep) {
        rowsToDelete.push(startRow + i); // fila 1-indexed
      }
    }

    // 4. Eliminar filas de abajo hacia arriba
    for (var j = rowsToDelete.length - 1; j >= 0; j--) {
      sheet.deleteRow(rowsToDelete[j]);
    }

    var filas = dataRows - rowsToDelete.length;

    // 5. Renombrar hoja
    sheet.setName('Saldos a Favor');

    // 6. Exportar
    var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
    var fileName = 'Reporte de Saldos a Favor y Ajustes_' + timestamp + '.xlsx';
    var result = _exportarYLimpiar(copy.ssId, fileName);
    result.filas = filas;

    Logger.log('[' + context + '] OK: ' + filas + ' registros');
    return { ok: true, data: result };

  } catch (error) {
    Logger.log('[' + context + '] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Genera reporte de Vencidos +60 Días sin Cobertura
 * Cupones con FEC_VENCIMIENTO COB > 60 días Y IMPORTE > 0
 */
function generarReporteVencidos60() {
  var context = 'generarReporteVencidos60';
  try {
    var sheetName = getConfig('SHEETS.BASE', 'BD');

    // 1. Copiar hoja BD con formato
    var copy = _copiarHojaBD(sheetName);
    var sheet = copy.sheet;

    // 2. Leer headers
    var headerRow = getConfig('BD.HEADER_ROW', 1);
    var startRow = getConfig('BD.START_ROW', 2);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];

    var fecVencIdx = _findColIdx(headers, 'FEC_VENCIMIENTO COB');
    if (fecVencIdx === -1) fecVencIdx = 9; // Fallback: col J (idx 9)

    var importeIdx = _findColIdx(headers, 'IMPORTE');
    if (importeIdx === -1) importeIdx = 11; // Fallback: col L (idx 11)

    // 3. Leer valores de ambas columnas
    var dataRows = lastRow - startRow + 1;
    if (dataRows <= 0) {
      DriveApp.getFileById(copy.ssId).setTrashed(true);
      return { ok: true, data: { base64: '', fileName: '', filas: 0 } };
    }

    // Leer todas las filas de datos para evaluar
    var allData = sheet.getRange(startRow, 1, dataRows, lastCol).getValues();

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var cutoffMs = 60 * 24 * 60 * 60 * 1000;

    // Determinar filas a eliminar
    var rowsToDelete = [];
    for (var i = 0; i < allData.length; i++) {
      var importe = Number(allData[i][importeIdx]);
      var fecVenc = allData[i][fecVencIdx];

      var keep = false;
      if (!isNaN(importe) && importe > 0 &&
          fecVenc instanceof Date && !isNaN(fecVenc.getTime())) {
        var diffMs = today.getTime() - fecVenc.getTime();
        keep = diffMs > cutoffMs;
      }

      if (!keep) {
        rowsToDelete.push(startRow + i);
      }
    }

    // 4. Eliminar filas de abajo hacia arriba
    for (var j = rowsToDelete.length - 1; j >= 0; j--) {
      sheet.deleteRow(rowsToDelete[j]);
    }

    var filas = dataRows - rowsToDelete.length;

    // 5. Renombrar hoja
    sheet.setName('Vencidos +60');

    // 6. Exportar
    var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
    var fileName = 'Reporte de Cupones Vencidos +60 Dias sin Cobertura_' + timestamp + '.xlsx';
    var result = _exportarYLimpiar(copy.ssId, fileName);
    result.filas = filas;

    Logger.log('[' + context + '] OK: ' + filas + ' registros');
    return { ok: true, data: result };

  } catch (error) {
    Logger.log('[' + context + '] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}
