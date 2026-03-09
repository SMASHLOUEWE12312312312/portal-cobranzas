/**
 * @fileoverview Servicio de generación de reportes Excel
 * Módulo Reportes: Saldos a Favor y Vencidos +60 días
 */

/**
 * Genera reporte de Saldos a Favor y Ajustes
 * Registros con IMPORTE negativo, cero o vacío
 * @return {Object} { ok, data: { base64, fileName, filas } }
 */
function generarReporteSaldos() {
  const context = 'generarReporteSaldos';
  try {
    const sheetName = getConfig('SHEETS.BASE', 'BD');
    const { headers, rows, columnMap } = SheetsIO.readSheet(sheetName);

    const importeCol = columnMap['IMPORTE'];
    if (importeCol === undefined) {
      return { ok: false, error: 'Columna IMPORTE no encontrada en BD' };
    }

    // Filtrar: importe negativo, cero o vacío
    const filtered = rows.filter(row => {
      const val = row[importeCol];
      if (val === null || val === undefined || val === '') return true;
      const num = Number(val);
      return !isNaN(num) && num <= 0;
    });

    // Construir data con headers + rows filtrados
    const data = [headers, ...filtered];

    const timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
    const fileName = 'Reporte de Saldos a Favor y Ajustes_' + timestamp + '.xlsx';

    const result = _generarXLSXReporte(data, 'Saldos a Favor', fileName);
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
 * Cupones con FEC_VENCIMIENTO_COB > 60 días atrás
 * @return {Object} { ok, data: { base64, fileName, filas } }
 */
function generarReporteVencidos60() {
  const context = 'generarReporteVencidos60';
  try {
    const sheetName = getConfig('SHEETS.BASE', 'BD');
    const { headers, rows, columnMap } = SheetsIO.readSheet(sheetName);

    const fecVencCol = columnMap['FEC_VENCIMIENTO_COB'] || columnMap['FEC_VENCIMIENTO COB'];
    if (fecVencCol === undefined) {
      return { ok: false, error: 'Columna FEC_VENCIMIENTO COB no encontrada en BD' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoffMs = 60 * 24 * 60 * 60 * 1000; // 60 días en ms

    // Filtrar: vencidos hace más de 60 días
    const filtered = rows.filter(row => {
      const val = row[fecVencCol];
      if (!val || !(val instanceof Date) || isNaN(val.getTime())) return false;
      const diffMs = today.getTime() - val.getTime();
      return diffMs > cutoffMs;
    });

    const data = [headers, ...filtered];

    const timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
    const fileName = 'Reporte de Cupones Vencidos +60 Dias sin Cobertura_' + timestamp + '.xlsx';

    const result = _generarXLSXReporte(data, 'Vencidos +60', fileName);
    result.filas = filtered.length;

    Logger.log('[' + context + '] OK: ' + filtered.length + ' registros');
    return { ok: true, data: result };

  } catch (error) {
    Logger.log('[' + context + '] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Genera XLSX desde array de datos usando SheetJS o fallback
 * @param {Array[]} data - Array de arrays [headers, ...rows]
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} fileName - Nombre del archivo
 * @return {Object} { base64, fileName }
 */
function _generarXLSXReporte(data, sheetName, fileName) {
  // Intentar con SheetJS primero
  if (typeof XLSX !== 'undefined') {
    var wb = XLSX.utils.book_new();
    var ws = XLSX.utils.aoa_to_sheet(data, { cellDates: true });

    // Auto-width columnas
    var numCols = data[0] ? data[0].length : 0;
    var colWidths = [];
    for (var c = 0; c < numCols; c++) {
      var maxLen = 10;
      for (var r = 0; r < Math.min(data.length, 100); r++) {
        var cellVal = data[r][c];
        var strVal = cellVal instanceof Date ? '00/00/0000' : String(cellVal || '');
        maxLen = Math.max(maxLen, strVal.length);
      }
      colWidths.push({ wch: Math.min(maxLen + 2, 50) });
    }
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    var xlsxArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellDates: true });
    var base64 = Utilities.base64Encode(xlsxArray);

    return { base64: base64, fileName: fileName };
  }

  // Fallback: crear SpreadsheetApp temporal
  var tempSS = SpreadsheetApp.create(fileName);
  var sheet = tempSS.getActiveSheet();
  sheet.setName(sheetName);

  if (data.length > 0) {
    sheet.getRange(1, 1, 1, data[0].length).setValues([data[0]]).setFontWeight('bold');
    if (data.length > 1) {
      sheet.getRange(2, 1, data.length - 1, data[0].length).setValues(data.slice(1));
    }
  }

  var blob = tempSS.getBlob().setName(fileName);
  var base64 = Utilities.base64Encode(blob.getBytes());
  DriveApp.getFileById(tempSS.getId()).setTrashed(true);

  return { base64: base64, fileName: fileName };
}
