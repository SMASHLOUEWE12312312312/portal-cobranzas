/**
 * @fileoverview Servicio de generación de reportes Excel
 * Módulo Reportes: Saldos a Favor y Vencidos +60 días
 */

/**
 * Busca columna por nombre en columnMap (normalizado)
 * @param {Object} columnMap - Mapa de columnas normalizadas
 * @param {string} name - Nombre de columna a buscar
 * @return {number|undefined} Índice de la columna
 */
function _findCol(columnMap, name) {
  // normalizeHeader: uppercase, NFD strip, replace _/spaces with single space
  var normalized = String(name).toUpperCase().replace(/[_\s]+/g, ' ').trim();
  return columnMap[normalized];
}

/**
 * Genera reporte de Saldos a Favor y Ajustes
 * Registros con IMPORTE negativo, cero o vacío
 * @return {Object} { ok, data: { base64, fileName, filas } }
 */
function generarReporteSaldos() {
  var context = 'generarReporteSaldos';
  try {
    var sheetName = getConfig('SHEETS.BASE', 'BD');
    var sheetData = SheetsIO.readSheet(sheetName);
    var headers = sheetData.headers;
    var rows = sheetData.rows;
    var columnMap = sheetData.columnMap;

    var importeCol = _findCol(columnMap, 'IMPORTE');
    if (importeCol === undefined) {
      return { ok: false, error: 'Columna IMPORTE no encontrada en BD' };
    }

    // Filtrar: importe negativo, cero o vacío
    var filtered = rows.filter(function(row) {
      var val = row[importeCol];
      if (val === null || val === undefined || val === '') return true;
      var num = Number(val);
      return !isNaN(num) && num <= 0;
    });

    var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
    var fileName = 'Reporte de Saldos a Favor y Ajustes_' + timestamp + '.xlsx';

    var result = _generarXLSXReporte([headers].concat(filtered), 'Saldos a Favor', fileName);
    result.filas = filtered.length;

    Logger.log('[' + context + '] OK: ' + filtered.length + ' registros');
    return { ok: true, data: result };

  } catch (error) {
    Logger.log('[' + context + '] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Genera reporte de Vencidos +60 Días sin Cobertura
 * Cupones con FEC_VENCIMIENTO COB > 60 días atrás (columna J en BD)
 * @return {Object} { ok, data: { base64, fileName, filas } }
 */
function generarReporteVencidos60() {
  var context = 'generarReporteVencidos60';
  try {
    var sheetName = getConfig('SHEETS.BASE', 'BD');
    var sheetData = SheetsIO.readSheet(sheetName);
    var headers = sheetData.headers;
    var rows = sheetData.rows;
    var columnMap = sheetData.columnMap;

    // La columna se llama "FEC_VENCIMIENTO COB" en la hoja (col J)
    // normalizeHeader la convierte a "FEC VENCIMIENTO COB"
    var fecVencCol = _findCol(columnMap, 'FEC_VENCIMIENTO COB');
    if (fecVencCol === undefined) {
      // Fallback: columna J (índice 9)
      fecVencCol = 9;
      Logger.log('[' + context + '] Columna no encontrada por nombre, usando col J (idx 9)');
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var cutoffMs = 60 * 24 * 60 * 60 * 1000; // 60 días en ms

    // Filtrar: vencidos hace más de 60 días
    var filtered = rows.filter(function(row) {
      var val = row[fecVencCol];
      if (!val || !(val instanceof Date) || isNaN(val.getTime())) return false;
      var diffMs = today.getTime() - val.getTime();
      return diffMs > cutoffMs;
    });

    var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
    var fileName = 'Reporte de Cupones Vencidos +60 Dias sin Cobertura_' + timestamp + '.xlsx';

    var result = _generarXLSXReporte([headers].concat(filtered), 'Vencidos +60', fileName);
    result.filas = filtered.length;

    Logger.log('[' + context + '] OK: ' + filtered.length + ' registros');
    return { ok: true, data: result };

  } catch (error) {
    Logger.log('[' + context + '] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Genera XLSX usando SpreadsheetApp temporal + export via Drive API
 * @param {Array[]} data - Array de arrays [headers, ...rows]
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} fileName - Nombre del archivo
 * @return {Object} { base64, fileName }
 */
function _generarXLSXReporte(data, sheetName, fileName) {
  // Crear spreadsheet temporal
  var tempSS = SpreadsheetApp.create(fileName);
  var ssId = tempSS.getId();
  var sheet = tempSS.getActiveSheet();
  sheet.setName(sheetName);

  if (data.length > 0 && data[0].length > 0) {
    // Headers con formato
    sheet.getRange(1, 1, 1, data[0].length)
      .setValues([data[0]])
      .setFontWeight('bold')
      .setBackground('#D32F2F')
      .setFontColor('white');

    // Data rows
    if (data.length > 1) {
      sheet.getRange(2, 1, data.length - 1, data[0].length)
        .setValues(data.slice(1));
    }

    // Auto-resize columnas (max 26 para no exceder timeout)
    var colCount = Math.min(data[0].length, 26);
    for (var i = 1; i <= colCount; i++) {
      sheet.autoResizeColumn(i);
    }

    // Filtro automático
    sheet.getRange(1, 1, data.length, data[0].length).createFilter();
  }

  SpreadsheetApp.flush();

  // Exportar como XLSX real via Drive API
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

  // Limpiar archivo temporal
  DriveApp.getFileById(ssId).setTrashed(true);

  return { base64: base64, fileName: fileName };
}
