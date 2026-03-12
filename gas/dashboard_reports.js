/**
 * @fileoverview Dashboard Reports - Generación de reportes con hojas Dashboard profesionales
 * @version 1.0.0
 *
 * Tres reportes con estilo Power BI:
 * 1. Dashboard Ejecutivo - Visión completa del portafolio
 * 2. Saldos a Favor con Dashboard - Créditos y ajustes
 * 3. Vencidos +60 con Dashboard - Cartera morosa extendida
 *
 * Usa DashboardEngine para formateo SpreadsheetApp profesional.
 * Exporta via Drive API → base64 XLSX.
 */

// ============================================================
// HELPERS COMPARTIDOS
// ============================================================

/**
 * Lee BD y construye estructuras de datos para dashboards
 * @returns {Object} { headers, rows, colMap, aseguradoIdx, ciaIdx, importeIdx, monIdx, fecVencIdx, ramIdx }
 */
function _loadBDForDashboard() {
  var sheetData = SheetsIO.readSheet(getConfig('SHEETS.BASE', 'BD'));
  if (!sheetData || !sheetData.rows || sheetData.rows.length === 0) {
    throw new Error('No hay datos en BD');
  }

  var colMap = sheetData.columnMap;
  var aseguradoIdx = colMap['ASEGURADO'] != null ? colMap['ASEGURADO'] : -1;
  var ciaIdx = colMap['CIA'] != null ? colMap['CIA'] : -1;
  var importeIdx = colMap['IMPORTE'] != null ? colMap['IMPORTE'] : -1;
  var monIdx = colMap['MON'] != null ? colMap['MON'] : -1;
  var ramIdx = colMap['RAM'] != null ? colMap['RAM'] : -1;

  // Fecha vencimiento - búsqueda flexible
  var fecVencIdx = -1;
  var variants = ['FEC VENCIMIENTO COB', 'FEC_VENCIMIENTO COB', 'FEC_VENCIMIENTO_COB'];
  for (var v = 0; v < variants.length; v++) {
    if (colMap[variants[v]] !== undefined) { fecVencIdx = colMap[variants[v]]; break; }
  }
  if (fecVencIdx === -1) {
    var keys = Object.keys(colMap);
    for (var k = 0; k < keys.length; k++) {
      if (keys[k].indexOf('VENCIMIENTO') !== -1 && keys[k].indexOf('COB') !== -1) {
        fecVencIdx = colMap[keys[k]]; break;
      }
    }
  }

  return {
    headers: sheetData.headers,
    rows: sheetData.rows,
    colMap: colMap,
    aseguradoIdx: aseguradoIdx,
    ciaIdx: ciaIdx,
    importeIdx: importeIdx,
    monIdx: monIdx,
    fecVencIdx: fecVencIdx,
    ramIdx: ramIdx
  };
}

function _parseNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  var n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function _parseDateDash(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    var epoch = new Date(1899, 11, 30);
    var d = new Date(epoch.getTime() + val * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  var str = String(val).trim();
  var m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) { var d2 = new Date(+m[3], +m[2] - 1, +m[1]); return isNaN(d2.getTime()) ? null : d2; }
  m = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) { var d3 = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d3.getTime()) ? null : d3; }
  return null;
}

function _monKey(val) {
  var s = String(val || 'PEN').toUpperCase();
  return (s.indexOf('USD') !== -1 || s.indexOf('US$') !== -1 || s.indexOf('DOLAR') !== -1) ? 'USD' : 'PEN';
}

// ============================================================
// 1. DASHBOARD EJECUTIVO
// ============================================================

/**
 * Genera Dashboard Ejecutivo completo del portafolio
 * @returns {Object} { ok, data: { base64, fileName, filas } }
 */
function generarDashboardEjecutivo() {
  try {
    var bd = _loadBDForDashboard();
    var rows = bd.rows;
    var today = new Date(); today.setHours(0, 0, 0, 0);

    // ---- Compute metrics ----
    var totalPEN = 0, totalUSD = 0, totalVencido = 0;
    var countPEN = 0, countUSD = 0;
    var asegurados = {};
    var ciaData = {};
    var sumDiasMora = 0, sumImportes = 0;

    // Extended aging buckets
    var agingBuckets = [
      { label: 'Corriente (0-30)', min: 0, max: 30, severity: 'VERDE', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '31-60 días', min: 31, max: 60, severity: 'AMARILLO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '61-90 días', min: 61, max: 90, severity: 'NARANJA', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '91-120 días', min: 91, max: 120, severity: 'ROJO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '120+ días', min: 121, max: 99999, severity: 'INCOBRABLE', count: 0, montoPEN: 0, montoUSD: 0 }
    ];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var importe = _parseNum(row[bd.importeIdx]);
      var mon = _monKey(row[bd.monIdx]);
      var cia = String(row[bd.ciaIdx] || 'Sin CIA').trim();
      var aseg = String(row[bd.aseguradoIdx] || '').trim();

      if (mon === 'PEN') { totalPEN += importe; countPEN++; }
      else { totalUSD += importe; countUSD++; }

      if (aseg) {
        if (!asegurados[aseg]) asegurados[aseg] = { pen: 0, usd: 0, count: 0 };
        asegurados[aseg].count++;
        if (mon === 'PEN') asegurados[aseg].pen += importe;
        else asegurados[aseg].usd += importe;
      }

      if (!ciaData[cia]) ciaData[cia] = { cupones: 0, pen: 0, usd: 0, vencido: 0 };
      ciaData[cia].cupones++;
      if (mon === 'PEN') ciaData[cia].pen += importe;
      else ciaData[cia].usd += importe;

      var fecVenc = _parseDateDash(row[bd.fecVencIdx]);
      var diasMora = 0;
      if (fecVenc) {
        diasMora = Math.floor((today - fecVenc) / 86400000);
        if (diasMora > 0) {
          totalVencido += importe;
          ciaData[cia].vencido += importe;
        }
        if (importe > 0) { sumDiasMora += Math.max(0, diasMora) * importe; sumImportes += importe; }
      }

      // Aging
      var dm = Math.max(0, diasMora);
      for (var b = 0; b < agingBuckets.length; b++) {
        if (dm >= agingBuckets[b].min && dm <= agingBuckets[b].max) {
          agingBuckets[b].count++;
          if (mon === 'PEN') agingBuckets[b].montoPEN += importe;
          else agingBuckets[b].montoUSD += importe;
          break;
        }
      }
    }

    var totalCartera = totalPEN + totalUSD;
    var pctVencido = totalCartera > 0 ? (totalVencido / totalCartera * 100).toFixed(1) : '0.0';
    var dso = sumImportes > 0 ? Math.round(sumDiasMora / sumImportes) : 0;
    var numAsegurados = Object.keys(asegurados).length;

    // ---- Build Dashboard ----
    var wb = DashboardEngine.createTempWorkbook('Ejecutivo');
    var sheet = wb.sheet;
    DashboardEngine.setDashboardWidths(sheet);

    var r = DashboardEngine.writeHeaderSection(sheet, 'DASHBOARD EJECUTIVO DE COBRANZAS', 'Resumen integral del portafolio', 1);

    // KPIs Row 1
    r = DashboardEngine.writeKPIRow(sheet, [
      { value: DashboardEngine.formatCurrency(totalPEN, 'PEN'), label: 'CARTERA TOTAL PEN', color: DashboardEngine.COLORS.HEADER_BG },
      { value: DashboardEngine.formatCurrency(totalUSD, 'USD'), label: 'CARTERA TOTAL USD', color: DashboardEngine.COLORS.HEADER_BG },
      { value: rows.length.toLocaleString(), label: 'CUPONES TOTALES', color: DashboardEngine.COLORS.HEADER_BG },
      { value: numAsegurados.toString(), label: 'ASEGURADOS', color: DashboardEngine.COLORS.HEADER_BG }
    ], r);

    // KPIs Row 2
    var dsoColor = dso > 45 ? DashboardEngine.COLORS.RED : dso > 35 ? DashboardEngine.COLORS.ORANGE : DashboardEngine.COLORS.GREEN;
    var vencColor = parseFloat(pctVencido) > 20 ? DashboardEngine.COLORS.RED : parseFloat(pctVencido) > 10 ? DashboardEngine.COLORS.ORANGE : DashboardEngine.COLORS.GREEN;
    r = DashboardEngine.writeKPIRow(sheet, [
      { value: dso + ' días', label: 'DSO (DAYS SALES OUTSTANDING)', color: dsoColor },
      { value: pctVencido + '%', label: '% CARTERA VENCIDA', color: vencColor },
      { value: DashboardEngine.formatCurrency(totalVencido, 'PEN'), label: 'MONTO TOTAL VENCIDO', color: DashboardEngine.COLORS.RED }
    ], r);

    // Aging Table
    r = DashboardEngine.writeSectionTitle(sheet, 'ANTIGUEDAD DE CARTERA (AGING)', r);
    r = DashboardEngine.writeAgingTable(sheet, agingBuckets, r);

    // CIA Distribution
    r = DashboardEngine.writeSectionTitle(sheet, 'DISTRIBUCION POR ASEGURADORA', r);
    var ciaKeys = Object.keys(ciaData).sort(function(a, b) { return (ciaData[b].pen + ciaData[b].usd) - (ciaData[a].pen + ciaData[a].usd); });
    var ciaRows = [];
    for (var c = 0; c < ciaKeys.length; c++) {
      var cd = ciaData[ciaKeys[c]];
      var ciaTotal = cd.pen + cd.usd;
      var pctCartera = totalCartera > 0 ? (ciaTotal / totalCartera * 100).toFixed(1) : '0.0';
      var vencPct = ciaTotal > 0 ? (cd.vencido / ciaTotal * 100).toFixed(1) : '0.0';
      ciaRows.push([ciaKeys[c], cd.cupones, cd.pen, cd.usd, pctCartera, vencPct]);
    }
    r = DashboardEngine.writeTable(sheet, {
      headers: ['Aseguradora', '# Cupones', 'Monto PEN', 'Monto USD', '% Cartera', '% Vencido'],
      rows: ciaRows
    }, r, { currencyCols: [2, 3], pctCols: [4, 5] });

    // Top 10 Asegurados
    r = DashboardEngine.writeSectionTitle(sheet, 'TOP 10 ASEGURADOS POR MONTO', r);
    var asegKeys = Object.keys(asegurados).sort(function(a, b) {
      return (asegurados[b].pen + asegurados[b].usd) - (asegurados[a].pen + asegurados[a].usd);
    }).slice(0, 10);
    var topRows = [];
    for (var t = 0; t < asegKeys.length; t++) {
      var ad = asegurados[asegKeys[t]];
      var asegTotal = ad.pen + ad.usd;
      var pctPort = totalCartera > 0 ? (asegTotal / totalCartera * 100).toFixed(1) : '0.0';
      topRows.push([t + 1, asegKeys[t], ad.count, ad.pen, ad.usd, pctPort]);
    }
    r = DashboardEngine.writeTable(sheet, {
      headers: ['#', 'Asegurado', '# Cupones', 'Monto PEN', 'Monto USD', '% Portafolio'],
      rows: topRows
    }, r, { currencyCols: [3, 4], pctCols: [5] });

    // Currency Distribution
    r = DashboardEngine.writeSectionTitle(sheet, 'DISTRIBUCION POR MONEDA', r);
    r = DashboardEngine.writeTable(sheet, {
      headers: ['Moneda', '# Cupones', 'Monto Total', '% del Total'],
      rows: [
        ['PEN (S/.)', countPEN, totalPEN, totalCartera > 0 ? (totalPEN / totalCartera * 100).toFixed(1) : '0.0'],
        ['USD (US$)', countUSD, totalUSD, totalCartera > 0 ? (totalUSD / totalCartera * 100).toFixed(1) : '0.0'],
        ['TOTAL', rows.length, totalCartera, '100.0']
      ]
    }, r, { currencyCols: [2], pctCols: [3], totalRow: true });

    // Alerts
    var alerts = [];
    if (parseFloat(pctVencido) > 20) alerts.push({ indicator: '% Cartera Vencida', value: pctVencido + '%', status: 'ROJO' });
    else if (parseFloat(pctVencido) > 10) alerts.push({ indicator: '% Cartera Vencida', value: pctVencido + '%', status: 'NARANJA' });
    else alerts.push({ indicator: '% Cartera Vencida', value: pctVencido + '%', status: 'VERDE' });

    if (dso > 45) alerts.push({ indicator: 'DSO', value: dso + ' días', status: 'ROJO' });
    else if (dso > 35) alerts.push({ indicator: 'DSO', value: dso + ' días', status: 'NARANJA' });
    else alerts.push({ indicator: 'DSO', value: dso + ' días', status: 'VERDE' });

    var pct90 = 0;
    for (var ab = 0; ab < agingBuckets.length; ab++) {
      if (agingBuckets[ab].min >= 91) pct90 += agingBuckets[ab].count;
    }
    var pct90val = rows.length > 0 ? (pct90 / rows.length * 100).toFixed(1) : '0.0';
    if (parseFloat(pct90val) > 10) alerts.push({ indicator: 'Cupones 90+ días', value: pct90val + '%', status: 'ROJO' });
    else if (parseFloat(pct90val) > 5) alerts.push({ indicator: 'Cupones 90+ días', value: pct90val + '%', status: 'NARANJA' });
    else alerts.push({ indicator: 'Cupones 90+ días', value: pct90val + '%', status: 'VERDE' });

    r = DashboardEngine.writeSectionTitle(sheet, 'INDICADORES DE ALERTA', r);
    r = DashboardEngine.writeAlertTable(sheet, alerts, r);

    SpreadsheetApp.flush();

    // Export
    var exportResult = DashboardEngine.exportAndCleanup(wb.ss);
    var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');

    return {
      ok: true,
      data: {
        base64: exportResult.base64,
        fileName: 'Dashboard_Ejecutivo_Cobranzas_' + timestamp + '.xlsx',
        filas: rows.length
      }
    };

  } catch (error) {
    Logger.log('[generarDashboardEjecutivo] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}

// ============================================================
// 2. SALDOS A FAVOR CON DASHBOARD
// ============================================================

/**
 * Genera reporte de Saldos a Favor con hoja Dashboard profesional
 * @returns {Object} { ok, data: { base64, fileName, filas } }
 */
function generarReporteSaldosConDashboard() {
  try {
    var bd = _loadBDForDashboard();
    var rows = bd.rows;

    // Filter: IMPORTE <= 0 or empty
    var filtered = [];
    for (var i = 0; i < rows.length; i++) {
      var val = rows[i][bd.importeIdx];
      if (val === null || val === undefined || val === '') { filtered.push(rows[i]); continue; }
      var num = Number(val);
      if (!isNaN(num) && num <= 0) filtered.push(rows[i]);
    }

    if (filtered.length === 0) {
      return { ok: true, data: { base64: null, fileName: null, filas: 0, message: 'No hay registros de saldos a favor' } };
    }

    // ---- Compute dashboard metrics from filtered rows ----
    var totalPEN = 0, totalUSD = 0, countPEN = 0, countUSD = 0;
    var ciaData = {};
    var asegData = {};
    var ramData = {};

    for (var f = 0; f < filtered.length; f++) {
      var row = filtered[f];
      var importe = Math.abs(_parseNum(row[bd.importeIdx]));
      var mon = _monKey(row[bd.monIdx]);
      var cia = String(row[bd.ciaIdx] || 'Sin CIA').trim();
      var aseg = String(row[bd.aseguradoIdx] || 'Sin Asegurado').trim();
      var ram = String(row[bd.ramIdx] || 'Sin RAM').trim();

      if (mon === 'PEN') { totalPEN += importe; countPEN++; }
      else { totalUSD += importe; countUSD++; }

      if (!ciaData[cia]) ciaData[cia] = { count: 0, pen: 0, usd: 0 };
      ciaData[cia].count++;
      if (mon === 'PEN') ciaData[cia].pen += importe;
      else ciaData[cia].usd += importe;

      if (!asegData[aseg]) asegData[aseg] = { count: 0, pen: 0, usd: 0 };
      asegData[aseg].count++;
      if (mon === 'PEN') asegData[aseg].pen += importe;
      else asegData[aseg].usd += importe;

      if (!ramData[ram]) ramData[ram] = { count: 0, total: 0 };
      ramData[ram].count++;
      ramData[ram].total += importe;
    }

    var totalSaldos = totalPEN + totalUSD;

    // ---- Build workbook with Dashboard + Data ----
    var sheetName = getConfig('SHEETS.BASE', 'BD');
    var ss = SheetsIO._getSpreadsheet();
    var srcSheet = ss.getSheetByName(sheetName);
    if (!srcSheet) throw new Error('Hoja "' + sheetName + '" no encontrada');

    var tempSS = SpreadsheetApp.create('TMP_SALDOS_DASH_' + Date.now());
    var ssId = tempSS.getId();

    try {
      // Create Dashboard sheet first
      var dashSheet = tempSS.getSheets()[0];
      dashSheet.setName('Dashboard');
      DashboardEngine.setDashboardWidths(dashSheet);

      var r = DashboardEngine.writeHeaderSection(dashSheet, 'DASHBOARD - SALDOS A FAVOR Y AJUSTES', 'Registros con importe negativo, cero o vacío', 1);

      // KPIs
      r = DashboardEngine.writeKPIRow(dashSheet, [
        { value: filtered.length.toString(), label: 'REGISTROS TOTALES', color: DashboardEngine.COLORS.HEADER_BG },
        { value: DashboardEngine.formatCurrency(totalPEN, 'PEN'), label: 'TOTAL SALDOS PEN', color: DashboardEngine.COLORS.GREEN },
        { value: DashboardEngine.formatCurrency(totalUSD, 'USD'), label: 'TOTAL SALDOS USD', color: DashboardEngine.COLORS.GREEN },
        { value: Object.keys(asegData).length.toString(), label: 'ASEGURADOS CON SALDO', color: DashboardEngine.COLORS.HEADER_BG }
      ], r);

      // CIA Concentration
      r = DashboardEngine.writeSectionTitle(dashSheet, 'CONCENTRACION POR ASEGURADORA', r);
      var ciaKeys = Object.keys(ciaData).sort(function(a, b) { return (ciaData[b].pen + ciaData[b].usd) - (ciaData[a].pen + ciaData[a].usd); });
      var ciaRows = [];
      for (var c = 0; c < ciaKeys.length; c++) {
        var cd = ciaData[ciaKeys[c]];
        var ciaTotal = cd.pen + cd.usd;
        var pct = totalSaldos > 0 ? (ciaTotal / totalSaldos * 100).toFixed(1) : '0.0';
        ciaRows.push([ciaKeys[c], cd.count, cd.pen, cd.usd, pct]);
      }
      ciaRows.push(['TOTAL', filtered.length, totalPEN, totalUSD, '100.0']);
      r = DashboardEngine.writeTable(dashSheet, {
        headers: ['Aseguradora', '# Registros', 'Saldo PEN', 'Saldo USD', '% Concentración'],
        rows: ciaRows
      }, r, { currencyCols: [2, 3], pctCols: [4], totalRow: true });

      // Top 15 Asegurados
      r = DashboardEngine.writeSectionTitle(dashSheet, 'TOP 15 ASEGURADOS CON MAYOR SALDO A FAVOR', r);
      var asegKeys = Object.keys(asegData).sort(function(a, b) {
        return (asegData[b].pen + asegData[b].usd) - (asegData[a].pen + asegData[a].usd);
      }).slice(0, 15);
      var topRows = [];
      for (var t = 0; t < asegKeys.length; t++) {
        var ad = asegData[asegKeys[t]];
        topRows.push([t + 1, asegKeys[t], ad.count, ad.pen, ad.usd]);
      }
      r = DashboardEngine.writeTable(dashSheet, {
        headers: ['#', 'Asegurado', '# Registros', 'Saldo PEN', 'Saldo USD'],
        rows: topRows
      }, r, { currencyCols: [3, 4] });

      // RAM Distribution
      r = DashboardEngine.writeSectionTitle(dashSheet, 'DISTRIBUCION POR RAM', r);
      var ramKeys = Object.keys(ramData).sort(function(a, b) { return ramData[b].total - ramData[a].total; });
      var ramRows = [];
      for (var rm = 0; rm < ramKeys.length; rm++) {
        var rd = ramData[ramKeys[rm]];
        var pctRam = totalSaldos > 0 ? (rd.total / totalSaldos * 100).toFixed(1) : '0.0';
        ramRows.push([ramKeys[rm], rd.count, rd.total, pctRam]);
      }
      r = DashboardEngine.writeTable(dashSheet, {
        headers: ['RAM', '# Registros', 'Monto Total', '% del Total'],
        rows: ramRows
      }, r, { currencyCols: [2], pctCols: [3] });

      SpreadsheetApp.flush();

      // Add data sheet (copy BD with filtered rows)
      var copied = srcSheet.copyTo(tempSS);
      copied.setName('Saldos a Favor');
      var startRow = getConfig('BD.START_ROW', 2);
      var lastRow = copied.getLastRow();
      var dataRowCount = lastRow - startRow + 1;
      if (dataRowCount > 0) copied.deleteRows(startRow, dataRowCount);
      if (filtered.length > 0) {
        var numCols = copied.getLastColumn();
        var normalized = filtered.map(function(row) {
          var r2 = row.slice(0, numCols);
          while (r2.length < numCols) r2.push('');
          return r2;
        });
        if (filtered.length > 1) copied.insertRowsAfter(startRow, filtered.length - 1);
        copied.getRange(startRow, 1, normalized.length, numCols).setValues(normalized);
      }

      SpreadsheetApp.flush();

      // Export
      var exportUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=xlsx';
      var response = UrlFetchApp.fetch(exportUrl, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (response.getResponseCode() !== 200) throw new Error('Export HTTP ' + response.getResponseCode());
      var base64 = Utilities.base64Encode(response.getContent());

      var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
      return {
        ok: true,
        data: {
          base64: base64,
          fileName: 'Reporte_Saldos_a_Favor_Dashboard_' + timestamp + '.xlsx',
          filas: filtered.length
        }
      };

    } finally {
      try { DriveApp.getFileById(ssId).setTrashed(true); } catch (e) { /* ignore */ }
    }

  } catch (error) {
    Logger.log('[generarReporteSaldosConDashboard] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}

// ============================================================
// 3. VENCIDOS +60 CON DASHBOARD
// ============================================================

/**
 * Genera reporte de Vencidos +60 días con hoja Dashboard profesional
 * @returns {Object} { ok, data: { base64, fileName, filas } }
 */
function generarReporteVencidos60ConDashboard() {
  try {
    var bd = _loadBDForDashboard();
    var rows = bd.rows;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cutoffMs = 60 * 86400000;

    // Filter: IMPORTE > 0 AND FEC_VENCIMIENTO COB > 60 days
    var filtered = [];
    for (var i = 0; i < rows.length; i++) {
      var importe = Number(rows[i][bd.importeIdx]);
      if (isNaN(importe) || importe <= 0) continue;
      var fecVenc = rows[i][bd.fecVencIdx];
      if (!fecVenc) continue;
      var fecha = _parseDateDash(fecVenc);
      if (!fecha) continue;
      if ((today.getTime() - fecha.getTime()) > cutoffMs) {
        filtered.push(rows[i]);
      }
    }

    if (filtered.length === 0) {
      return { ok: true, data: { base64: null, fileName: null, filas: 0, message: 'No hay cupones vencidos +60 días' } };
    }

    // ---- Compute dashboard metrics from filtered ----
    var totalPEN = 0, totalUSD = 0, countPEN = 0, countUSD = 0;
    var ciaData = {};
    var asegData = {};
    var sumDiasMora = 0, sumImportes = 0;

    // Extended aging for +60
    var agingBuckets = [
      { label: '61-90 días', min: 61, max: 90, severity: 'NARANJA', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '91-120 días', min: 91, max: 120, severity: 'CRITICO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '121-180 días', min: 121, max: 180, severity: 'ROJO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '181-365 días', min: 181, max: 365, severity: 'SEVERO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '365+ días', min: 366, max: 99999, severity: 'INCOBRABLE', count: 0, montoPEN: 0, montoUSD: 0 }
    ];

    for (var f = 0; f < filtered.length; f++) {
      var row = filtered[f];
      var importe2 = _parseNum(row[bd.importeIdx]);
      var mon = _monKey(row[bd.monIdx]);
      var cia = String(row[bd.ciaIdx] || 'Sin CIA').trim();
      var aseg = String(row[bd.aseguradoIdx] || 'Sin Asegurado').trim();

      if (mon === 'PEN') { totalPEN += importe2; countPEN++; }
      else { totalUSD += importe2; countUSD++; }

      if (!ciaData[cia]) ciaData[cia] = { count: 0, pen: 0, usd: 0 };
      ciaData[cia].count++;
      if (mon === 'PEN') ciaData[cia].pen += importe2;
      else ciaData[cia].usd += importe2;

      if (!asegData[aseg]) asegData[aseg] = { count: 0, pen: 0, usd: 0 };
      asegData[aseg].count++;
      if (mon === 'PEN') asegData[aseg].pen += importe2;
      else asegData[aseg].usd += importe2;

      var fecha2 = _parseDateDash(row[bd.fecVencIdx]);
      if (fecha2) {
        var dm = Math.floor((today - fecha2) / 86400000);
        sumDiasMora += dm * importe2;
        sumImportes += importe2;

        for (var b = 0; b < agingBuckets.length; b++) {
          if (dm >= agingBuckets[b].min && dm <= agingBuckets[b].max) {
            agingBuckets[b].count++;
            if (mon === 'PEN') agingBuckets[b].montoPEN += importe2;
            else agingBuckets[b].montoUSD += importe2;
            break;
          }
        }
      }
    }

    var totalVencido = totalPEN + totalUSD;
    var dsoVencido = sumImportes > 0 ? Math.round(sumDiasMora / sumImportes) : 0;

    // ---- Build workbook ----
    var sheetNameBD = getConfig('SHEETS.BASE', 'BD');
    var ssBD = SheetsIO._getSpreadsheet();
    var srcSheet = ssBD.getSheetByName(sheetNameBD);
    if (!srcSheet) throw new Error('Hoja "' + sheetNameBD + '" no encontrada');

    var tempSS = SpreadsheetApp.create('TMP_VENC60_DASH_' + Date.now());
    var ssId = tempSS.getId();

    try {
      var dashSheet = tempSS.getSheets()[0];
      dashSheet.setName('Dashboard');
      DashboardEngine.setDashboardWidths(dashSheet);

      var r = DashboardEngine.writeHeaderSection(dashSheet, 'DASHBOARD - VENCIDOS +60 DIAS SIN COBERTURA', 'Cupones con más de 60 días de vencimiento e importe positivo', 1);

      // KPIs
      var dsoColor = dsoVencido > 180 ? DashboardEngine.COLORS.RED : dsoVencido > 120 ? DashboardEngine.COLORS.ORANGE : DashboardEngine.COLORS.YELLOW;
      r = DashboardEngine.writeKPIRow(dashSheet, [
        { value: filtered.length.toString(), label: 'CUPONES VENCIDOS +60d', color: DashboardEngine.COLORS.RED },
        { value: DashboardEngine.formatCurrency(totalPEN, 'PEN'), label: 'MONTO VENCIDO PEN', color: DashboardEngine.COLORS.RED },
        { value: DashboardEngine.formatCurrency(totalUSD, 'USD'), label: 'MONTO VENCIDO USD', color: DashboardEngine.COLORS.RED },
        { value: dsoVencido + ' días', label: 'MORA PROMEDIO PONDERADA', color: dsoColor }
      ], r);

      // KPIs Row 2
      var totalCarteraFull = 0;
      for (var j = 0; j < rows.length; j++) {
        totalCarteraFull += _parseNum(rows[j][bd.importeIdx]);
      }
      var pctCartera = totalCarteraFull > 0 ? (totalVencido / totalCarteraFull * 100).toFixed(1) : '0.0';
      r = DashboardEngine.writeKPIRow(dashSheet, [
        { value: pctCartera + '%', label: '% DE CARTERA TOTAL VENCIDA +60d', color: DashboardEngine.COLORS.RED },
        { value: Object.keys(asegData).length.toString(), label: 'ASEGURADOS MOROSOS', color: DashboardEngine.COLORS.ORANGE },
        { value: Object.keys(ciaData).length.toString(), label: 'ASEGURADORAS AFECTADAS', color: DashboardEngine.COLORS.ORANGE }
      ], r);

      // Extended Aging
      r = DashboardEngine.writeSectionTitle(dashSheet, 'ANTIGUEDAD EXTENDIDA DE MORA (+60 DIAS)', r);
      r = DashboardEngine.writeAgingTable(dashSheet, agingBuckets, r);

      // CIA Concentration
      r = DashboardEngine.writeSectionTitle(dashSheet, 'CONCENTRACION POR ASEGURADORA', r);
      var ciaKeys = Object.keys(ciaData).sort(function(a, b) { return (ciaData[b].pen + ciaData[b].usd) - (ciaData[a].pen + ciaData[a].usd); });
      var ciaRows = [];
      for (var c2 = 0; c2 < ciaKeys.length; c2++) {
        var cd = ciaData[ciaKeys[c2]];
        var ciaTotal = cd.pen + cd.usd;
        var pct = totalVencido > 0 ? (ciaTotal / totalVencido * 100).toFixed(1) : '0.0';
        var severity = parseFloat(pct) > 40 ? 'CRITICO' : parseFloat(pct) > 25 ? 'ALTO' : 'NORMAL';
        ciaRows.push([ciaKeys[c2], cd.count, cd.pen, cd.usd, pct, severity]);
      }
      r = DashboardEngine.writeTable(dashSheet, {
        headers: ['Aseguradora', '# Cupones', 'Vencido PEN', 'Vencido USD', '% Concentración', 'Riesgo'],
        rows: ciaRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // Top 15 Debtors
      r = DashboardEngine.writeSectionTitle(dashSheet, 'TOP 15 DEUDORES MOROSOS (+60 DIAS)', r);
      var asegKeys = Object.keys(asegData).sort(function(a, b) {
        return (asegData[b].pen + asegData[b].usd) - (asegData[a].pen + asegData[a].usd);
      }).slice(0, 15);
      var topRows = [];
      for (var t2 = 0; t2 < asegKeys.length; t2++) {
        var ad = asegData[asegKeys[t2]];
        topRows.push([t2 + 1, asegKeys[t2], ad.count, ad.pen, ad.usd]);
      }
      r = DashboardEngine.writeTable(dashSheet, {
        headers: ['#', 'Asegurado', '# Cupones', 'Vencido PEN', 'Vencido USD'],
        rows: topRows
      }, r, { currencyCols: [3, 4] });

      // Concentration Alerts
      var alerts = [];
      for (var ca = 0; ca < ciaKeys.length; ca++) {
        var cdAlert = ciaData[ciaKeys[ca]];
        var ciaTotalA = cdAlert.pen + cdAlert.usd;
        var pctA = totalVencido > 0 ? (ciaTotalA / totalVencido * 100) : 0;
        if (pctA > 30) {
          alerts.push({ indicator: ciaKeys[ca] + ' (concentración)', value: pctA.toFixed(1) + '%', status: 'CRITICO' });
        }
      }
      if (dsoVencido > 180) alerts.push({ indicator: 'Mora promedio ponderada', value: dsoVencido + ' días', status: 'ROJO' });
      else if (dsoVencido > 120) alerts.push({ indicator: 'Mora promedio ponderada', value: dsoVencido + ' días', status: 'NARANJA' });
      if (filtered.length > 100) alerts.push({ indicator: 'Volumen de cupones morosos', value: filtered.length + ' cupones', status: 'CRITICO' });

      if (alerts.length > 0) {
        r = DashboardEngine.writeSectionTitle(dashSheet, 'ALERTAS DE CONCENTRACION Y RIESGO', r);
        r = DashboardEngine.writeAlertTable(dashSheet, alerts, r);
      }

      SpreadsheetApp.flush();

      // Add data sheet
      var copied = srcSheet.copyTo(tempSS);
      copied.setName('Vencidos +60');
      var startRow = getConfig('BD.START_ROW', 2);
      var lastRow = copied.getLastRow();
      var dataRowCount = lastRow - startRow + 1;
      if (dataRowCount > 0) copied.deleteRows(startRow, dataRowCount);
      if (filtered.length > 0) {
        var numCols = copied.getLastColumn();
        var normalized = filtered.map(function(row) {
          var r2 = row.slice(0, numCols);
          while (r2.length < numCols) r2.push('');
          return r2;
        });
        if (filtered.length > 1) copied.insertRowsAfter(startRow, filtered.length - 1);
        copied.getRange(startRow, 1, normalized.length, numCols).setValues(normalized);
      }

      SpreadsheetApp.flush();

      // Export
      var exportUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=xlsx';
      var response = UrlFetchApp.fetch(exportUrl, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });
      if (response.getResponseCode() !== 200) throw new Error('Export HTTP ' + response.getResponseCode());
      var base64 = Utilities.base64Encode(response.getContent());

      var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
      return {
        ok: true,
        data: {
          base64: base64,
          fileName: 'Reporte_Vencidos_60_Dashboard_' + timestamp + '.xlsx',
          filas: filtered.length
        }
      };

    } finally {
      try { DriveApp.getFileById(ssId).setTrashed(true); } catch (e) { /* ignore */ }
    }

  } catch (error) {
    Logger.log('[generarReporteVencidos60ConDashboard] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}
