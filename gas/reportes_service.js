/**
 * @fileoverview Servicio de generación de reportes Excel
 * Módulo Reportes: Saldos a Favor y Vencidos +60 días
 *
 * Estrategia optimizada:
 * 1. Copia hoja BD (preserva formato de header + estructura)
 * 2. Lee todos los datos en memoria
 * 3. Borra TODAS las filas de datos de un golpe
 * 4. Pega solo las filas filtradas
 * 5. Exporta como XLSX via Drive API
 */

/**
 * Busca índice de columna por nombre en headers
 * @param {string[]} headers
 * @param {string} name
 * @return {number} Índice 0-based, o -1
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
 * Copia hoja BD, reemplaza datos con filas filtradas, exporta XLSX
 * @param {Array[]} filteredRows - Filas filtradas (valores crudos)
 * @param {string} tabName - Nombre de la pestaña en el Excel
 * @param {string} fileName - Nombre del archivo descargable
 * @return {Object} { base64, fileName, filas }
 */
function _generarReporteDesdeHojaBD(filteredRows, tabName, fileName) {
  var sheetName = getConfig('SHEETS.BASE', 'BD');
  var ss = SheetsIO._getSpreadsheet();
  var srcSheet = ss.getSheetByName(sheetName);
  if (!srcSheet) throw new Error('Hoja "' + sheetName + '" no encontrada');

  // 1. Crear temp SS y copiar hoja BD con formato
  var tempSS = SpreadsheetApp.create('temp_reporte');
  var ssId = tempSS.getId();
  var copied = srcSheet.copyTo(tempSS);
  copied.setName(tabName);

  // Eliminar hoja por defecto
  var sheets = tempSS.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    if (sheets[s].getSheetId() !== copied.getSheetId()) {
      tempSS.deleteSheet(sheets[s]);
      break;
    }
  }

  // 2. Borrar TODAS las filas de datos de un golpe
  var startRow = getConfig('BD.START_ROW', 2);
  var lastRow = copied.getLastRow();
  var dataRowCount = lastRow - startRow + 1;

  if (dataRowCount > 0) {
    copied.deleteRows(startRow, dataRowCount);
  }

  // 3. Insertar filas filtradas
  if (filteredRows.length > 0) {
    var numCols = copied.getLastColumn();
    // Asegurar que las filas tienen el ancho correcto
    var normalizedRows = filteredRows.map(function(row) {
      var r = row.slice(0, numCols);
      while (r.length < numCols) r.push('');
      return r;
    });
    // Insertar filas vacías si es necesario
    if (filteredRows.length > 1) {
      copied.insertRowsAfter(startRow, filteredRows.length - 1);
    }
    copied.getRange(startRow, 1, normalizedRows.length, numCols)
      .setValues(normalizedRows);
  }

  SpreadsheetApp.flush();

  // 4. Exportar como XLSX
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

  return { base64: base64, fileName: fileName, filas: filteredRows.length };
}

/**
 * Genera reporte de Saldos a Favor y Ajustes
 * Registros con IMPORTE negativo, cero o vacío
 */
function generarReporteSaldos() {
  var context = 'generarReporteSaldos';
  try {
    var sheetData = SheetsIO.readSheet(getConfig('SHEETS.BASE', 'BD'));
    var headers = sheetData.headers;
    var rows = sheetData.rows;

    var importeIdx = _findColIdx(headers, 'IMPORTE');
    if (importeIdx === -1) return { ok: false, error: 'Columna IMPORTE no encontrada en BD' };

    var filtered = rows.filter(function(row) {
      var val = row[importeIdx];
      if (val === null || val === undefined || val === '') return true;
      var num = Number(val);
      return !isNaN(num) && num <= 0;
    });

    var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
    var fileName = 'Reporte de Saldos a Favor y Ajustes_' + timestamp + '.xlsx';

    var result = _generarReporteDesdeHojaBD(filtered, 'Saldos a Favor', fileName);

    Logger.log('[' + context + '] OK: ' + result.filas + ' registros');
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
    var sheetData = SheetsIO.readSheet(getConfig('SHEETS.BASE', 'BD'));
    var headers = sheetData.headers;
    var rows = sheetData.rows;

    var fecVencIdx = _findColIdx(headers, 'FEC_VENCIMIENTO COB');
    if (fecVencIdx === -1) return { ok: false, error: 'Columna FEC_VENCIMIENTO COB no encontrada en BD' };

    var importeIdx = _findColIdx(headers, 'IMPORTE');
    if (importeIdx === -1) return { ok: false, error: 'Columna IMPORTE no encontrada en BD' };

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var cutoffMs = 60 * 24 * 60 * 60 * 1000;

    var filtered = rows.filter(function(row) {
      var importe = Number(row[importeIdx]);
      if (isNaN(importe) || importe <= 0) return false;

      var fecVenc = row[fecVencIdx];
      if (!fecVenc || !(fecVenc instanceof Date) || isNaN(fecVenc.getTime())) return false;
      return (today.getTime() - fecVenc.getTime()) > cutoffMs;
    });

    var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
    var fileName = 'Reporte de Cupones Vencidos +60 Dias sin Cobertura_' + timestamp + '.xlsx';

    var result = _generarReporteDesdeHojaBD(filtered, 'Vencidos +60', fileName);

    Logger.log('[' + context + '] OK: ' + result.filas + ' registros');
    return { ok: true, data: result };

  } catch (error) {
    Logger.log('[' + context + '] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}
