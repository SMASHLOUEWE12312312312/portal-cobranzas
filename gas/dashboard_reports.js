/**
 * @fileoverview Dashboard Reports v3.0 - Reportes profesionales Power BI-level
 *
 * - Grid uniforme de 6 columnas (todas las tablas mismo ancho)
 * - Ranking integrado en nombre (sin columna # separada)
 * - Iconos de severidad ● con formato condicional
 * - TODOS los asegurados sin límites
 * - Agrupación RAM/Asegurado con collapse
 */

// ============================================================
// RAMO → ÁREA MAPPING
// ============================================================

var RAM_AREA_MAP = {
  'SCT': 'RIESGOS HUMANOS',
  'TR': 'RIESGOS GENERALES',
  'VLE': 'RIESGOS HUMANOS',
  'EPS': 'RIESGOS HUMANOS',
  'AUT': 'RIESGOS GENERALES',
  'EQE': 'RIESGOS GENERALES',
  'RC': 'RIESGOS GENERALES',
  'MULTIRIESGO': 'RIESGOS GENERALES',
  'RC Y D': 'RIESGOS GENERALES',
  'AP': 'RIESGOS HUMANOS',
  'AMF': 'RIESGOS HUMANOS',
  '3D': 'RIESGOS GENERALES',
  'CMA': 'RIESGOS GENERALES',
  'SOA': 'RIESGOS GENERALES',
  'DOM': 'RIESGOS GENERALES',
  'CAR': 'RIESGOS GENERALES',
  'CONS': 'RIESGOS GENERALES',
  'IN': 'RIESGOS GENERALES',
  'TREC': 'RIESGOS GENERALES',
  'DESH': 'RIESGOS GENERALES',
  'PATRIMONIAL': 'RIESGOS GENERALES',
  'DES': 'RIESGOS GENERALES',
  'VIN': 'RIESGOS GENERALES',
  'AVI': 'RIESGOS GENERALES',
  'ONCOLOGICO': 'RIESGOS HUMANOS',
  'VIAJE': 'RIESGOS HUMANOS',
  'CIBER': 'RIESGOS GENERALES',
  'RO': 'RIESGOS GENERALES',
  'FOLA': 'RIESGOS HUMANOS',
  'TRMO': 'RIESGOS GENERALES',
  'CAU': 'RIESGOS GENERALES',
  'EAR': 'RIESGOS GENERALES',
  'CREDITO': 'RIESGOS GENERALES',
  'INCE': 'RIESGOS GENERALES'
};

function _getArea(ram) {
  var key = String(ram || '').trim().toUpperCase();
  return RAM_AREA_MAP[key] || 'SIN ÁREA';
}

// ============================================================
// HELPERS
// ============================================================

function _loadBDForDashboard() {
  var sheetData = SheetsIO.readSheet(getConfig('SHEETS.BASE', 'BD'));
  if (!sheetData || !sheetData.rows || sheetData.rows.length === 0) {
    throw new Error('No hay datos en BD');
  }

  var colMap = sheetData.columnMap;
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
    aseguradoIdx: colMap['ASEGURADO'] != null ? colMap['ASEGURADO'] : -1,
    ciaIdx: colMap['CIA'] != null ? colMap['CIA'] : -1,
    importeIdx: colMap['IMPORTE'] != null ? colMap['IMPORTE'] : -1,
    monIdx: colMap['MON'] != null ? colMap['MON'] : -1,
    fecVencIdx: fecVencIdx,
    ramIdx: colMap['RAM'] != null ? colMap['RAM'] : -1
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
    var d = new Date(new Date(1899, 11, 30).getTime() + val * 86400000);
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

function _addFilteredDataSheet(tempSS, filtered, tabName) {
  var sheetName = getConfig('SHEETS.BASE', 'BD');
  var srcSS = SheetsIO._getSpreadsheet();
  var srcSheet = srcSS.getSheetByName(sheetName);
  if (!srcSheet) throw new Error('Hoja "' + sheetName + '" no encontrada');

  var copied = srcSheet.copyTo(tempSS);
  copied.setName(tabName);
  var startRow = getConfig('BD.START_ROW', 2);
  var lastRow = copied.getLastRow();
  var dataRowCount = lastRow - startRow + 1;
  if (dataRowCount > 0) copied.deleteRows(startRow, dataRowCount);

  if (filtered.length > 0) {
    var numCols = copied.getLastColumn();
    var normalized = filtered.map(function(row) {
      var r = row.slice(0, numCols);
      while (r.length < numCols) r.push('');
      return r;
    });
    if (filtered.length > 1) copied.insertRowsAfter(startRow, filtered.length - 1);
    copied.getRange(startRow, 1, normalized.length, numCols).setValues(normalized);
  }
  return copied;
}

function _exportDashboardSS(ssId) {
  SpreadsheetApp.flush();
  var exportUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=xlsx';
  var response = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Export HTTP ' + response.getResponseCode());
  return Utilities.base64Encode(response.getContent());
}

// ============================================================
// 1. DASHBOARD EJECUTIVO
// ============================================================

function generarDashboardEjecutivo() {
  try {
    var bd = _loadBDForDashboard();
    var rows = bd.rows;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var DE = DashboardEngine;

    var totalPEN = 0, totalUSD = 0, totalVencido = 0;
    var countPEN = 0, countUSD = 0;
    var asegurados = {};
    var ciaData = {};
    var areaData = {};
    var sumDiasMora = 0, sumImportes = 0;

    var agingBuckets = [
      { label: 'Corriente (0-30 días)', min: 0, max: 30, severity: 'VERDE', count: 0, montoPEN: 0, montoUSD: 0 },
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

      var ram = String(row[bd.ramIdx] || 'Sin RAM').trim();
      var area = _getArea(ram);
      if (!areaData[area]) areaData[area] = { cupones: 0, pen: 0, usd: 0, vencido: 0 };
      areaData[area].cupones++;
      if (mon === 'PEN') areaData[area].pen += importe;
      else areaData[area].usd += importe;

      var fecVenc = _parseDateDash(row[bd.fecVencIdx]);
      var diasMora = 0;
      if (fecVenc) {
        diasMora = Math.floor((today - fecVenc) / 86400000);
        if (diasMora > 0) { totalVencido += importe; ciaData[cia].vencido += importe; areaData[area].vencido += importe; }
        if (importe > 0) { sumDiasMora += Math.max(0, diasMora) * importe; sumImportes += importe; }
      }

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

    // ---- Build Dashboard ----
    var wb = DE.createTempWorkbook('Ejecutivo');
    var sheet = wb.sheet;
    DE.prepareCanvas(sheet);

    var r = DE.writeHeaderSection(sheet, 'DASHBOARD EJECUTIVO DE COBRANZAS', 'Resumen integral del portafolio', 1);

    r = DE.writeKPIRow(sheet, [
      { value: DE.formatCurrency(totalPEN, 'PEN'), label: 'CARTERA TOTAL PEN', color: DE.COLORS.BRAND_DARK },
      { value: DE.formatCurrency(totalUSD, 'USD'), label: 'CARTERA TOTAL USD', color: DE.COLORS.BRAND_DARK },
      { value: rows.length.toLocaleString(), label: 'CUPONES TOTALES', color: DE.COLORS.BRAND_DARK }
    ], r);

    var dsoColor = dso > 45 ? DE.COLORS.RED : dso > 35 ? DE.COLORS.ORANGE : DE.COLORS.GREEN;
    var vencColor = parseFloat(pctVencido) > 20 ? DE.COLORS.RED : parseFloat(pctVencido) > 10 ? DE.COLORS.ORANGE : DE.COLORS.GREEN;
    r = DE.writeKPIRow(sheet, [
      { value: dso + ' días', label: 'DSO (DAYS SALES OUTSTANDING)', color: dsoColor },
      { value: pctVencido + '%', label: '% CARTERA VENCIDA', color: vencColor },
      { value: DE.formatCurrency(totalVencido, 'PEN'), label: 'MONTO TOTAL VENCIDO', color: DE.COLORS.RED }
    ], r);

    // Aging (6 cols)
    r = DE.writeSectionTitle(sheet, 'ANTIGÜEDAD DE CARTERA (AGING)', r);
    r = DE.writeAgingTable(sheet, agingBuckets, r);

    // CIA (6 cols)
    r = DE.writeSectionTitle(sheet, 'DISTRIBUCIÓN POR ASEGURADORA', r);
    var ciaKeys = Object.keys(ciaData).sort(function(a, b) { return (ciaData[b].pen + ciaData[b].usd) - (ciaData[a].pen + ciaData[a].usd); });
    var ciaRows = [];
    for (var c = 0; c < ciaKeys.length; c++) {
      var cd = ciaData[ciaKeys[c]];
      var ciaTotal = cd.pen + cd.usd;
      ciaRows.push([ciaKeys[c], cd.cupones, cd.pen, cd.usd,
        totalCartera > 0 ? (ciaTotal / totalCartera * 100).toFixed(1) : '0.0',
        ciaTotal > 0 ? (cd.vencido / ciaTotal * 100).toFixed(1) : '0.0']);
    }
    r = DE.writeTable(sheet, {
      headers: ['Aseguradora', '# Cupones', 'Monto PEN', 'Monto USD', '% Cartera', '% Vencido'],
      rows: ciaRows
    }, r, { currencyCols: [2, 3], pctCols: [4, 5] });

    // Área (6 cols)
    r = DE.writeSectionTitle(sheet, 'DISTRIBUCIÓN POR ÁREA', r);
    var areaKeys = Object.keys(areaData).sort(function(a, b) { return (areaData[b].pen + areaData[b].usd) - (areaData[a].pen + areaData[a].usd); });
    var areaRows = [];
    for (var ar = 0; ar < areaKeys.length; ar++) {
      var arD = areaData[areaKeys[ar]];
      var arTotal = arD.pen + arD.usd;
      areaRows.push([areaKeys[ar], arD.cupones, arD.pen, arD.usd,
        totalCartera > 0 ? (arTotal / totalCartera * 100).toFixed(1) : '0.0',
        arTotal > 0 ? (arD.vencido / arTotal * 100).toFixed(1) : '0.0']);
    }
    r = DE.writeTable(sheet, {
      headers: ['Área', '# Cupones', 'Monto PEN', 'Monto USD', '% Cartera', '% Vencido'],
      rows: areaRows
    }, r, { currencyCols: [2, 3], pctCols: [4, 5] });

    // Asegurados (5 cols - rank in name, extends to full span)
    r = DE.writeSectionTitle(sheet, 'DETALLE COMPLETO POR ASEGURADO (' + Object.keys(asegurados).length + ')', r);
    var asegKeys = Object.keys(asegurados).sort(function(a, b) {
      return (asegurados[b].pen + asegurados[b].usd) - (asegurados[a].pen + asegurados[a].usd);
    });
    var asegRows = [];
    for (var t = 0; t < asegKeys.length; t++) {
      var ad = asegurados[asegKeys[t]];
      var asegTotal = ad.pen + ad.usd;
      asegRows.push([(t + 1) + '. ' + asegKeys[t], ad.count, ad.pen, ad.usd,
        totalCartera > 0 ? (asegTotal / totalCartera * 100).toFixed(1) : '0.0']);
    }
    r = DE.writeTable(sheet, {
      headers: ['Asegurado', '# Cupones', 'Monto PEN', 'Monto USD', '% Portafolio'],
      rows: asegRows
    }, r, { currencyCols: [2, 3], pctCols: [4] });

    // Moneda (4 cols - extends to full span)
    r = DE.writeSectionTitle(sheet, 'DISTRIBUCIÓN POR MONEDA', r);
    r = DE.writeTable(sheet, {
      headers: ['Moneda', '# Cupones', 'Monto Total', '% del Total'],
      rows: [
        ['PEN (S/.)', countPEN, totalPEN, totalCartera > 0 ? (totalPEN / totalCartera * 100).toFixed(1) : '0.0'],
        ['USD (US$)', countUSD, totalUSD, totalCartera > 0 ? (totalUSD / totalCartera * 100).toFixed(1) : '0.0'],
        ['TOTAL', rows.length, totalCartera, '100.0']
      ]
    }, r, { currencyCols: [2], pctCols: [3], totalRow: true });

    // Alertas
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

    r = DE.writeSectionTitle(sheet, 'INDICADORES DE ALERTA', r);
    r = DE.writeAlertTable(sheet, alerts, r);

    SpreadsheetApp.flush();
    var exportResult = DE.exportAndCleanup(wb.ss);
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

function generarReporteSaldosConDashboard() {
  try {
    var bd = _loadBDForDashboard();
    var rows = bd.rows;
    var DE = DashboardEngine;

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

    var totalPEN = 0, totalUSD = 0, countPEN = 0, countUSD = 0;
    var ciaData = {};
    var asegData = {};
    var ramData = {};
    var areaData = {};

    for (var f = 0; f < filtered.length; f++) {
      var row = filtered[f];
      var importe = Math.abs(_parseNum(row[bd.importeIdx]));
      var mon = _monKey(row[bd.monIdx]);
      var cia = String(row[bd.ciaIdx] || 'Sin CIA').trim();
      var aseg = String(row[bd.aseguradoIdx] || 'Sin Asegurado').trim();
      var ram = String(row[bd.ramIdx] || 'Sin RAM').trim();
      var area = _getArea(ram);

      if (mon === 'PEN') { totalPEN += importe; countPEN++; }
      else { totalUSD += importe; countUSD++; }

      if (!ciaData[cia]) ciaData[cia] = { count: 0, pen: 0, usd: 0 };
      ciaData[cia].count++;
      if (mon === 'PEN') ciaData[cia].pen += importe;
      else ciaData[cia].usd += importe;

      if (!asegData[aseg]) asegData[aseg] = { count: 0, pen: 0, usd: 0, rams: {} };
      asegData[aseg].count++;
      if (mon === 'PEN') asegData[aseg].pen += importe;
      else asegData[aseg].usd += importe;

      if (!asegData[aseg].rams[ram]) asegData[aseg].rams[ram] = { count: 0, pen: 0, usd: 0 };
      asegData[aseg].rams[ram].count++;
      if (mon === 'PEN') asegData[aseg].rams[ram].pen += importe;
      else asegData[aseg].rams[ram].usd += importe;

      if (!ramData[ram]) ramData[ram] = { count: 0, pen: 0, usd: 0, asegurados: {} };
      ramData[ram].count++;
      if (mon === 'PEN') ramData[ram].pen += importe;
      else ramData[ram].usd += importe;

      if (!ramData[ram].asegurados[aseg]) ramData[ram].asegurados[aseg] = { count: 0, pen: 0, usd: 0 };
      ramData[ram].asegurados[aseg].count++;
      if (mon === 'PEN') ramData[ram].asegurados[aseg].pen += importe;
      else ramData[ram].asegurados[aseg].usd += importe;

      if (!areaData[area]) areaData[area] = { count: 0, pen: 0, usd: 0 };
      areaData[area].count++;
      if (mon === 'PEN') areaData[area].pen += importe;
      else areaData[area].usd += importe;
    }

    var totalSaldos = totalPEN + totalUSD;
    var avgSaldo = filtered.length > 0 ? totalSaldos / filtered.length : 0;

    var tempSS = SpreadsheetApp.create('TMP_SALDOS_DASH_' + Date.now());
    var ssId = tempSS.getId();

    try {
      var dashSheet = tempSS.getSheets()[0];
      dashSheet.setName('Reporte');
      DE.prepareCanvas(dashSheet);

      var r = DE.writeHeaderSection(dashSheet, 'SALDOS A FAVOR Y AJUSTES', 'Registros con importe negativo, cero o vacío', 1);

      r = DE.writeKPIRow(dashSheet, [
        { value: filtered.length.toString(), label: 'REGISTROS TOTALES', color: DE.COLORS.BRAND_DARK },
        { value: DE.formatCurrency(totalPEN, 'PEN'), label: 'TOTAL SALDOS PEN', color: DE.COLORS.GREEN },
        { value: DE.formatCurrency(totalUSD, 'USD'), label: 'TOTAL SALDOS USD', color: DE.COLORS.GREEN }
      ], r);

      var topCiaPct = 0;
      var ciaKeysSorted = Object.keys(ciaData).sort(function(a, b) { return (ciaData[b].pen + ciaData[b].usd) - (ciaData[a].pen + ciaData[a].usd); });
      if (ciaKeysSorted.length > 0 && totalSaldos > 0) {
        var topCia = ciaData[ciaKeysSorted[0]];
        topCiaPct = ((topCia.pen + topCia.usd) / totalSaldos * 100);
      }
      var concColor = topCiaPct > 50 ? DE.COLORS.RED : topCiaPct > 30 ? DE.COLORS.ORANGE : DE.COLORS.GREEN;
      r = DE.writeKPIRow(dashSheet, [
        { value: DE.formatCurrency(avgSaldo, 'PEN'), label: 'SALDO PROMEDIO POR REGISTRO', color: DE.COLORS.BRAND_DARK },
        { value: topCiaPct.toFixed(1) + '%', label: 'CONCENTRACIÓN TOP 1 CIA', color: concColor },
        { value: Object.keys(asegData).length.toString(), label: 'ASEGURADOS CON SALDO', color: DE.COLORS.ORANGE }
      ], r);

      // CIA (6 cols with severity)
      r = DE.writeSectionTitle(dashSheet, 'CONCENTRACIÓN POR ASEGURADORA', r);
      var ciaKeys = ciaKeysSorted;
      var ciaRows = [];
      for (var c = 0; c < ciaKeys.length; c++) {
        var cd = ciaData[ciaKeys[c]];
        var ciaTotal = cd.pen + cd.usd;
        var ciaPct = totalSaldos > 0 ? (ciaTotal / totalSaldos * 100).toFixed(1) : '0.0';
        var ciaSev = parseFloat(ciaPct) > 40 ? 'CRITICO' : parseFloat(ciaPct) > 25 ? 'ALTO' : 'NORMAL';
        ciaRows.push([ciaKeys[c], cd.count, cd.pen, cd.usd, ciaPct, ciaSev]);
      }
      r = DE.writeTable(dashSheet, {
        headers: ['Aseguradora', '# Registros', 'Saldo PEN', 'Saldo USD', '% Concentración', 'Riesgo'],
        rows: ciaRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // Área (6 cols with severity)
      r = DE.writeSectionTitle(dashSheet, 'DISTRIBUCIÓN POR ÁREA', r);
      var sAreaKeys = Object.keys(areaData).sort(function(a, b) { return (areaData[b].pen + areaData[b].usd) - (areaData[a].pen + areaData[a].usd); });
      var sAreaRows = [];
      for (var sa = 0; sa < sAreaKeys.length; sa++) {
        var saD = areaData[sAreaKeys[sa]];
        var saTotal = saD.pen + saD.usd;
        var saPct = totalSaldos > 0 ? (saTotal / totalSaldos * 100).toFixed(1) : '0.0';
        var saSev = parseFloat(saPct) > 60 ? 'CRITICO' : parseFloat(saPct) > 40 ? 'ALTO' : 'NORMAL';
        sAreaRows.push([sAreaKeys[sa], saD.count, saD.pen, saD.usd, saPct, saSev]);
      }
      r = DE.writeTable(dashSheet, {
        headers: ['Área', '# Registros', 'Saldo PEN', 'Saldo USD', '% Concentración', 'Criticidad'],
        rows: sAreaRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // RAM with asegurado sub-rows (6 cols with severity + collapse)
      r = DE.writeSectionTitle(dashSheet, 'DISTRIBUCIÓN POR RAMO (RAM)', r);
      var ramKeys = Object.keys(ramData).sort(function(a, b) { return (ramData[b].pen + ramData[b].usd) - (ramData[a].pen + ramData[a].usd); });
      var ramDetailRows = [];
      var ramGroupRanges = [];
      var ramRowIdx = 0;

      for (var rm = 0; rm < ramKeys.length; rm++) {
        var rd = ramData[ramKeys[rm]];
        var ramTotal = rd.pen + rd.usd;
        var ramPct = totalSaldos > 0 ? (ramTotal / totalSaldos * 100) : 0;
        var ramSev = ramPct > 30 ? 'CRITICO' : ramPct > 15 ? 'ALTO' : ramPct > 5 ? 'NORMAL' : 'BAJO';
        ramDetailRows.push([ramKeys[rm] + '  [' + _getArea(ramKeys[rm]) + ']', rd.count, rd.pen, rd.usd, ramPct.toFixed(1), ramSev]);
        ramRowIdx++;

        var ramAsegKeys = Object.keys(rd.asegurados).sort(function(a, b) {
          return (rd.asegurados[b].pen + rd.asegurados[b].usd) - (rd.asegurados[a].pen + rd.asegurados[a].usd);
        });
        var ramGrpStart = ramRowIdx;
        for (var ra = 0; ra < ramAsegKeys.length; ra++) {
          var raData = rd.asegurados[ramAsegKeys[ra]];
          ramDetailRows.push(['    ' + ramAsegKeys[ra], raData.count, raData.pen, raData.usd, '', '']);
          ramRowIdx++;
        }
        if (ramAsegKeys.length > 0) {
          ramGroupRanges.push({ start: ramGrpStart, count: ramAsegKeys.length });
        }
      }

      var ramTableStart = r;
      r = DE.writeTable(dashSheet, {
        headers: ['Ramo / Asegurado', '# Registros', 'Saldo PEN', 'Saldo USD', '% del Total', 'Criticidad'],
        rows: ramDetailRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // Group + collapse RAM sub-rows
      var ramDataStart = ramTableStart + 1;
      for (var rg = 0; rg < ramGroupRanges.length; rg++) {
        var rgr = ramGroupRanges[rg];
        try {
          dashSheet.getRange(ramDataStart + rgr.start, 1, rgr.count).shiftRowGroupDepth(1);
        } catch (e) { /* ignore */ }
      }
      try {
        var ramCollapseReqs = [];
        for (var rgc = 0; rgc < ramGroupRanges.length; rgc++) {
          var rgrc = ramGroupRanges[rgc];
          ramCollapseReqs.push({
            updateDimensionProperties: {
              range: {
                sheetId: dashSheet.getSheetId(),
                dimension: 'ROWS',
                startIndex: ramDataStart + rgrc.start - 1,
                endIndex: ramDataStart + rgrc.start - 1 + rgrc.count
              },
              properties: { hiddenByUser: true },
              fields: 'hiddenByUser'
            }
          });
        }
        if (ramCollapseReqs.length > 0) {
          Sheets.Spreadsheets.batchUpdate({ requests: ramCollapseReqs }, dashSheet.getParent().getId());
        }
      } catch (e) { /* ignore */ }
      // Style sub-rows
      for (var rgs = 0; rgs < ramGroupRanges.length; rgs++) {
        var rgrs = ramGroupRanges[rgs];
        for (var rgi = 0; rgi < rgrs.count; rgi++) {
          var rSubRow = ramDataStart + rgrs.start + rgi;
          dashSheet.getRange(rSubRow, 2, 1, 1)
            .setFontColor(DE.COLORS.MEDIUM_TEXT).setFontWeight('normal').setFontSize(8);
          dashSheet.getRange(rSubRow, 3, 1, 3)
            .setFontColor(DE.COLORS.MEDIUM_TEXT).setFontSize(8);
        }
      }

      // Asegurado detail with RAM sub-rows (6 cols with severity + collapse)
      r = DE.writeSectionTitle(dashSheet, 'DETALLE - ASEGURADOS CON SALDO A FAVOR (' + Object.keys(asegData).length + ')', r);
      var asegKeys = Object.keys(asegData).sort(function(a, b) {
        return (asegData[b].pen + asegData[b].usd) - (asegData[a].pen + asegData[a].usd);
      });

      var detailHeaders = ['Asegurado / Ramo', '# Registros', 'Saldo PEN', 'Saldo USD', '% del Total', 'Criticidad'];
      var detailRows = [];
      var groupRanges = [];
      var rowIdx = 0;

      for (var t = 0; t < asegKeys.length; t++) {
        var ad = asegData[asegKeys[t]];
        var asegTotal = ad.pen + ad.usd;
        var asegPct = totalSaldos > 0 ? (asegTotal / totalSaldos * 100) : 0;
        var asegSev = asegPct > 10 ? 'CRITICO' : asegPct > 5 ? 'ALTO' : asegTotal > 10000 ? 'NARANJA' : 'NORMAL';
        detailRows.push([(t + 1) + '. ' + asegKeys[t], ad.count, ad.pen, ad.usd, asegPct.toFixed(1), asegSev]);
        rowIdx++;

        var ramSubKeys = Object.keys(ad.rams).sort(function(a, b) {
          return (ad.rams[b].pen + ad.rams[b].usd) - (ad.rams[a].pen + ad.rams[a].usd);
        });
        var groupStart = rowIdx;
        for (var rk = 0; rk < ramSubKeys.length; rk++) {
          var ramSub = ad.rams[ramSubKeys[rk]];
          detailRows.push(['    ' + ramSubKeys[rk] + '  [' + _getArea(ramSubKeys[rk]) + ']', ramSub.count, ramSub.pen, ramSub.usd, '', '']);
          rowIdx++;
        }
        if (ramSubKeys.length > 0) {
          groupRanges.push({ start: groupStart, count: ramSubKeys.length });
        }
      }

      var tableStartRow = r;
      r = DE.writeTable(dashSheet, {
        headers: detailHeaders,
        rows: detailRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // Group + collapse RAM sub-rows under asegurados
      var dataStartRow = tableStartRow + 1;
      for (var g = 0; g < groupRanges.length; g++) {
        var gr = groupRanges[g];
        try {
          dashSheet.getRange(dataStartRow + gr.start, 1, gr.count).shiftRowGroupDepth(1);
        } catch (e) { /* ignore */ }
      }

      try {
        var sheetId = dashSheet.getSheetId();
        var ssIdCollapse = dashSheet.getParent().getId();
        var requests = [];
        for (var gc = 0; gc < groupRanges.length; gc++) {
          var grc = groupRanges[gc];
          requests.push({
            updateDimensionProperties: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: dataStartRow + grc.start - 1,
                endIndex: dataStartRow + grc.start - 1 + grc.count
              },
              properties: { hiddenByUser: true },
              fields: 'hiddenByUser'
            }
          });
        }
        if (requests.length > 0) {
          Sheets.Spreadsheets.batchUpdate({ requests: requests }, ssIdCollapse);
        }
      } catch (e) { /* ignore */ }

      // Style sub-rows
      for (var g2 = 0; g2 < groupRanges.length; g2++) {
        var gr2 = groupRanges[g2];
        for (var gi = 0; gi < gr2.count; gi++) {
          var subRow = dataStartRow + gr2.start + gi;
          dashSheet.getRange(subRow, 2, 1, 1)
            .setFontColor(DE.COLORS.MEDIUM_TEXT).setFontWeight('normal').setFontSize(8);
          dashSheet.getRange(subRow, 3, 1, 3)
            .setFontColor(DE.COLORS.MEDIUM_TEXT).setFontSize(8);
        }
      }

      // Alerts
      var alerts = [];
      for (var ca = 0; ca < ciaKeys.length; ca++) {
        var cdA = ciaData[ciaKeys[ca]];
        var pctA = totalSaldos > 0 ? ((cdA.pen + cdA.usd) / totalSaldos * 100) : 0;
        if (pctA > 30) alerts.push({ indicator: ciaKeys[ca] + ' (concentración)', value: pctA.toFixed(1) + '%', status: 'CRITICO' });
      }
      if (filtered.length > 50) alerts.push({ indicator: 'Volumen de registros con saldo', value: filtered.length + ' registros', status: 'NARANJA' });
      if (totalSaldos > 100000) alerts.push({ indicator: 'Monto total saldos a favor', value: DE.formatCurrency(totalSaldos, 'PEN'), status: 'ROJO' });
      else if (totalSaldos > 50000) alerts.push({ indicator: 'Monto total saldos a favor', value: DE.formatCurrency(totalSaldos, 'PEN'), status: 'NARANJA' });

      if (alerts.length > 0) {
        r = DE.writeSectionTitle(dashSheet, 'ALERTAS DE CONCENTRACIÓN Y RIESGO', r);
        r = DE.writeAlertTable(dashSheet, alerts, r);
      }

      SpreadsheetApp.flush();
      _addFilteredDataSheet(tempSS, filtered, 'Saldos a Favor');
      SpreadsheetApp.flush();

      var base64 = _exportDashboardSS(ssId);
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

function generarReporteVencidos60ConDashboard() {
  try {
    var bd = _loadBDForDashboard();
    var rows = bd.rows;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var cutoffMs = 60 * 86400000;
    var DE = DashboardEngine;

    var filtered = [];
    for (var i = 0; i < rows.length; i++) {
      var importe = Number(rows[i][bd.importeIdx]);
      if (isNaN(importe) || importe <= 0) continue;
      var fecVenc = rows[i][bd.fecVencIdx];
      if (!fecVenc) continue;
      var fecha = _parseDateDash(fecVenc);
      if (!fecha) continue;
      if ((today.getTime() - fecha.getTime()) > cutoffMs) filtered.push(rows[i]);
    }

    if (filtered.length === 0) {
      return { ok: true, data: { base64: null, fileName: null, filas: 0, message: 'No hay cupones vencidos +60 días' } };
    }

    var totalPEN = 0, totalUSD = 0, countPEN = 0, countUSD = 0;
    var ciaData = {};
    var asegData = {};
    var ramData = {};
    var areaData = {};
    var sumDiasMora = 0, sumImportes = 0;

    var agingBuckets = [
      { label: '61-90 días', min: 61, max: 90, severity: 'NARANJA', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '91-120 días', min: 91, max: 120, severity: 'CRITICO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '121-180 días', min: 121, max: 180, severity: 'ROJO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '181-365 días', min: 181, max: 365, severity: 'SEVERO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '365+ días', min: 366, max: 99999, severity: 'INCOBRABLE', count: 0, montoPEN: 0, montoUSD: 0 }
    ];

    for (var f = 0; f < filtered.length; f++) {
      var row = filtered[f];
      var imp = _parseNum(row[bd.importeIdx]);
      var mon = _monKey(row[bd.monIdx]);
      var cia = String(row[bd.ciaIdx] || 'Sin CIA').trim();
      var aseg = String(row[bd.aseguradoIdx] || 'Sin Asegurado').trim();
      var ram = String(row[bd.ramIdx] || 'Sin RAM').trim();

      if (mon === 'PEN') { totalPEN += imp; countPEN++; }
      else { totalUSD += imp; countUSD++; }

      if (!ciaData[cia]) ciaData[cia] = { count: 0, pen: 0, usd: 0 };
      ciaData[cia].count++;
      if (mon === 'PEN') ciaData[cia].pen += imp;
      else ciaData[cia].usd += imp;

      if (!asegData[aseg]) asegData[aseg] = { count: 0, pen: 0, usd: 0, rams: {} };
      asegData[aseg].count++;
      if (mon === 'PEN') asegData[aseg].pen += imp;
      else asegData[aseg].usd += imp;

      if (!asegData[aseg].rams[ram]) asegData[aseg].rams[ram] = { count: 0, pen: 0, usd: 0 };
      asegData[aseg].rams[ram].count++;
      if (mon === 'PEN') asegData[aseg].rams[ram].pen += imp;
      else asegData[aseg].rams[ram].usd += imp;

      if (!ramData[ram]) ramData[ram] = { count: 0, pen: 0, usd: 0, asegurados: {} };
      ramData[ram].count++;
      if (mon === 'PEN') ramData[ram].pen += imp;
      else ramData[ram].usd += imp;

      var area = _getArea(ram);
      if (!areaData[area]) areaData[area] = { count: 0, pen: 0, usd: 0 };
      areaData[area].count++;
      if (mon === 'PEN') areaData[area].pen += imp;
      else areaData[area].usd += imp;

      if (!ramData[ram].asegurados[aseg]) ramData[ram].asegurados[aseg] = { count: 0, pen: 0, usd: 0 };
      ramData[ram].asegurados[aseg].count++;
      if (mon === 'PEN') ramData[ram].asegurados[aseg].pen += imp;
      else ramData[ram].asegurados[aseg].usd += imp;

      var fecha2 = _parseDateDash(row[bd.fecVencIdx]);
      if (fecha2) {
        var dm = Math.floor((today - fecha2) / 86400000);
        sumDiasMora += dm * imp;
        sumImportes += imp;

        for (var b = 0; b < agingBuckets.length; b++) {
          if (dm >= agingBuckets[b].min && dm <= agingBuckets[b].max) {
            agingBuckets[b].count++;
            if (mon === 'PEN') agingBuckets[b].montoPEN += imp;
            else agingBuckets[b].montoUSD += imp;
            break;
          }
        }
      }
    }

    var totalVencido = totalPEN + totalUSD;
    var dsoVencido = sumImportes > 0 ? Math.round(sumDiasMora / sumImportes) : 0;

    var tempSS = SpreadsheetApp.create('TMP_VENC60_DASH_' + Date.now());
    var ssId = tempSS.getId();

    try {
      var dashSheet = tempSS.getSheets()[0];
      dashSheet.setName('Reporte');
      DE.prepareCanvas(dashSheet);

      var r = DE.writeHeaderSection(dashSheet, 'VENCIDOS +60 DÍAS SIN COBERTURA', 'Cupones con más de 60 días de vencimiento e importe positivo', 1);

      var dsoColor = dsoVencido > 180 ? DE.COLORS.RED : dsoVencido > 120 ? DE.COLORS.ORANGE : DE.COLORS.YELLOW;
      r = DE.writeKPIRow(dashSheet, [
        { value: filtered.length.toString(), label: 'CUPONES VENCIDOS +60d', color: DE.COLORS.RED },
        { value: DE.formatCurrency(totalPEN, 'PEN'), label: 'MONTO VENCIDO PEN', color: DE.COLORS.RED },
        { value: DE.formatCurrency(totalUSD, 'USD'), label: 'MONTO VENCIDO USD', color: DE.COLORS.RED }
      ], r);

      var totalCarteraFull = 0;
      for (var j = 0; j < rows.length; j++) totalCarteraFull += _parseNum(rows[j][bd.importeIdx]);
      var pctCartera = totalCarteraFull > 0 ? (totalVencido / totalCarteraFull * 100).toFixed(1) : '0.0';

      r = DE.writeKPIRow(dashSheet, [
        { value: dsoVencido + ' días', label: 'MORA PROMEDIO PONDERADA', color: dsoColor },
        { value: pctCartera + '%', label: '% DE CARTERA TOTAL', color: DE.COLORS.RED },
        { value: Object.keys(asegData).length.toString(), label: 'ASEGURADOS MOROSOS', color: DE.COLORS.ORANGE }
      ], r);

      // Aging (6 cols)
      r = DE.writeSectionTitle(dashSheet, 'ANTIGÜEDAD EXTENDIDA DE MORA (+60 DÍAS)', r);
      r = DE.writeAgingTable(dashSheet, agingBuckets, r);

      // CIA (6 cols)
      r = DE.writeSectionTitle(dashSheet, 'CONCENTRACIÓN POR ASEGURADORA', r);
      var ciaKeys = Object.keys(ciaData).sort(function(a, b) { return (ciaData[b].pen + ciaData[b].usd) - (ciaData[a].pen + ciaData[a].usd); });
      var ciaRows = [];
      for (var c = 0; c < ciaKeys.length; c++) {
        var cd = ciaData[ciaKeys[c]];
        var ciaTotal = cd.pen + cd.usd;
        var pct = totalVencido > 0 ? (ciaTotal / totalVencido * 100).toFixed(1) : '0.0';
        var severity = parseFloat(pct) > 40 ? 'CRITICO' : parseFloat(pct) > 25 ? 'ALTO' : 'NORMAL';
        ciaRows.push([ciaKeys[c], cd.count, cd.pen, cd.usd, pct, severity]);
      }
      r = DE.writeTable(dashSheet, {
        headers: ['Aseguradora', '# Cupones', 'Vencido PEN', 'Vencido USD', '% Concentración', 'Riesgo'],
        rows: ciaRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // Área (6 cols)
      r = DE.writeSectionTitle(dashSheet, 'DISTRIBUCIÓN POR ÁREA', r);
      var vAreaKeys = Object.keys(areaData).sort(function(a, b) { return (areaData[b].pen + areaData[b].usd) - (areaData[a].pen + areaData[a].usd); });
      var vAreaRows = [];
      for (var va = 0; va < vAreaKeys.length; va++) {
        var vaD = areaData[vAreaKeys[va]];
        var vaTotal = vaD.pen + vaD.usd;
        var vaPct = totalVencido > 0 ? (vaTotal / totalVencido * 100).toFixed(1) : '0.0';
        var vaSev = parseFloat(vaPct) > 60 ? 'CRITICO' : parseFloat(vaPct) > 40 ? 'ALTO' : 'NORMAL';
        vAreaRows.push([vAreaKeys[va], vaD.count, vaD.pen, vaD.usd, vaPct, vaSev]);
      }
      r = DE.writeTable(dashSheet, {
        headers: ['Área', '# Cupones', 'Vencido PEN', 'Vencido USD', '% Concentración', 'Criticidad'],
        rows: vAreaRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // RAM with asegurado sub-rows (6 cols)
      r = DE.writeSectionTitle(dashSheet, 'DISTRIBUCIÓN POR RAMO (RAM)', r);
      var ramKeys = Object.keys(ramData).sort(function(a, b) { return (ramData[b].pen + ramData[b].usd) - (ramData[a].pen + ramData[a].usd); });
      var ramDetailRows = [];
      var ramGroupRanges = [];
      var ramRowIdx = 0;

      for (var rm = 0; rm < ramKeys.length; rm++) {
        var rd = ramData[ramKeys[rm]];
        var ramTotal = rd.pen + rd.usd;
        var ramPct = totalVencido > 0 ? (ramTotal / totalVencido * 100) : 0;
        var ramSev = ramPct > 30 ? 'CRITICO' : ramPct > 15 ? 'ALTO' : ramPct > 5 ? 'NORMAL' : 'BAJO';
        ramDetailRows.push([ramKeys[rm] + '  [' + _getArea(ramKeys[rm]) + ']', rd.count, rd.pen, rd.usd, ramPct.toFixed(1), ramSev]);
        ramRowIdx++;

        var ramAsegKeys = Object.keys(rd.asegurados).sort(function(a, b) {
          return (rd.asegurados[b].pen + rd.asegurados[b].usd) - (rd.asegurados[a].pen + rd.asegurados[a].usd);
        });
        var ramGrpStart = ramRowIdx;
        for (var ra = 0; ra < ramAsegKeys.length; ra++) {
          var raData = rd.asegurados[ramAsegKeys[ra]];
          ramDetailRows.push(['    ' + ramAsegKeys[ra], raData.count, raData.pen, raData.usd, '', '']);
          ramRowIdx++;
        }
        if (ramAsegKeys.length > 0) {
          ramGroupRanges.push({ start: ramGrpStart, count: ramAsegKeys.length });
        }
      }

      var ramTableStart = r;
      r = DE.writeTable(dashSheet, {
        headers: ['Ramo / Asegurado', '# Cupones', 'Vencido PEN', 'Vencido USD', '% del Total', 'Criticidad'],
        rows: ramDetailRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // Group + collapse RAM sub-rows
      var ramDataStart = ramTableStart + 1;
      for (var rg = 0; rg < ramGroupRanges.length; rg++) {
        var rgr = ramGroupRanges[rg];
        try {
          dashSheet.getRange(ramDataStart + rgr.start, 1, rgr.count).shiftRowGroupDepth(1);
        } catch (e) { /* ignore */ }
      }
      try {
        var ramCollapseReqs = [];
        for (var rgc = 0; rgc < ramGroupRanges.length; rgc++) {
          var rgrc = ramGroupRanges[rgc];
          ramCollapseReqs.push({
            updateDimensionProperties: {
              range: {
                sheetId: dashSheet.getSheetId(),
                dimension: 'ROWS',
                startIndex: ramDataStart + rgrc.start - 1,
                endIndex: ramDataStart + rgrc.start - 1 + rgrc.count
              },
              properties: { hiddenByUser: true },
              fields: 'hiddenByUser'
            }
          });
        }
        if (ramCollapseReqs.length > 0) {
          Sheets.Spreadsheets.batchUpdate({ requests: ramCollapseReqs }, dashSheet.getParent().getId());
        }
      } catch (e) { /* ignore */ }
      // Style sub-rows
      for (var rgs = 0; rgs < ramGroupRanges.length; rgs++) {
        var rgrs = ramGroupRanges[rgs];
        for (var rgi = 0; rgi < rgrs.count; rgi++) {
          var rSubRow = ramDataStart + rgrs.start + rgi;
          dashSheet.getRange(rSubRow, 2, 1, 1)
            .setFontColor(DE.COLORS.MEDIUM_TEXT).setFontWeight('normal').setFontSize(8);
          dashSheet.getRange(rSubRow, 3, 1, 3)
            .setFontColor(DE.COLORS.MEDIUM_TEXT).setFontSize(8);
        }
      }

      // Asegurado detail with RAM sub-rows (6 cols - rank in name)
      r = DE.writeSectionTitle(dashSheet, 'DETALLE COMPLETO - ASEGURADOS MOROSOS +60 DÍAS (' + Object.keys(asegData).length + ')', r);
      var asegKeys = Object.keys(asegData).sort(function(a, b) {
        return (asegData[b].pen + asegData[b].usd) - (asegData[a].pen + asegData[a].usd);
      });

      var detailHeaders = ['Asegurado / Ramo', '# Cupones', 'Vencido PEN', 'Vencido USD', '% del Total', 'Criticidad'];
      var detailRows = [];
      var groupRanges = [];
      var rowIdx = 0;

      for (var t = 0; t < asegKeys.length; t++) {
        var ad = asegData[asegKeys[t]];
        var asegTotal = ad.pen + ad.usd;
        var asegPct = totalVencido > 0 ? (asegTotal / totalVencido * 100) : 0;
        var asegSev = asegPct > 10 ? 'CRITICO' : asegPct > 5 ? 'ALTO' : asegTotal > 10000 ? 'NARANJA' : 'NORMAL';
        detailRows.push([(t + 1) + '. ' + asegKeys[t], ad.count, ad.pen, ad.usd, asegPct.toFixed(1), asegSev]);
        rowIdx++;

        var ramSubKeys = Object.keys(ad.rams).sort(function(a, b) {
          return (ad.rams[b].pen + ad.rams[b].usd) - (ad.rams[a].pen + ad.rams[a].usd);
        });
        var groupStart = rowIdx;
        for (var rk = 0; rk < ramSubKeys.length; rk++) {
          var ramSub = ad.rams[ramSubKeys[rk]];
          detailRows.push(['    ' + ramSubKeys[rk] + '  [' + _getArea(ramSubKeys[rk]) + ']', ramSub.count, ramSub.pen, ramSub.usd, '', '']);
          rowIdx++;
        }
        if (ramSubKeys.length > 0) {
          groupRanges.push({ start: groupStart, count: ramSubKeys.length });
        }
      }

      var tableStartRow = r;
      r = DE.writeTable(dashSheet, {
        headers: detailHeaders,
        rows: detailRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // Group + collapse RAM sub-rows under asegurados
      var dataStartRow = tableStartRow + 1;
      for (var g = 0; g < groupRanges.length; g++) {
        var gr = groupRanges[g];
        try {
          dashSheet.getRange(dataStartRow + gr.start, 1, gr.count).shiftRowGroupDepth(1);
        } catch (e) { /* ignore */ }
      }

      try {
        var sheetId = dashSheet.getSheetId();
        var ssIdCollapse = dashSheet.getParent().getId();
        var requests = [];
        for (var gc = 0; gc < groupRanges.length; gc++) {
          var grc = groupRanges[gc];
          requests.push({
            updateDimensionProperties: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: dataStartRow + grc.start - 1,
                endIndex: dataStartRow + grc.start - 1 + grc.count
              },
              properties: { hiddenByUser: true },
              fields: 'hiddenByUser'
            }
          });
        }
        if (requests.length > 0) {
          Sheets.Spreadsheets.batchUpdate({ requests: requests }, ssIdCollapse);
        }
      } catch (e) { /* ignore */ }

      // Style sub-rows
      for (var g2 = 0; g2 < groupRanges.length; g2++) {
        var gr2 = groupRanges[g2];
        for (var gi = 0; gi < gr2.count; gi++) {
          var subRow = dataStartRow + gr2.start + gi;
          dashSheet.getRange(subRow, 2, 1, 1)
            .setFontColor(DE.COLORS.MEDIUM_TEXT).setFontWeight('normal').setFontSize(8);
          dashSheet.getRange(subRow, 3, 1, 3)
            .setFontColor(DE.COLORS.MEDIUM_TEXT).setFontSize(8);
        }
      }

      // Alerts
      var alerts = [];
      for (var ca = 0; ca < ciaKeys.length; ca++) {
        var cdA = ciaData[ciaKeys[ca]];
        var pctA = totalVencido > 0 ? ((cdA.pen + cdA.usd) / totalVencido * 100) : 0;
        if (pctA > 30) alerts.push({ indicator: ciaKeys[ca] + ' (concentración)', value: pctA.toFixed(1) + '%', status: 'CRITICO' });
      }
      if (dsoVencido > 180) alerts.push({ indicator: 'Mora promedio ponderada', value: dsoVencido + ' días', status: 'ROJO' });
      else if (dsoVencido > 120) alerts.push({ indicator: 'Mora promedio ponderada', value: dsoVencido + ' días', status: 'NARANJA' });
      if (filtered.length > 100) alerts.push({ indicator: 'Volumen de cupones morosos', value: filtered.length + ' cupones', status: 'CRITICO' });

      if (alerts.length > 0) {
        r = DE.writeSectionTitle(dashSheet, 'ALERTAS DE CONCENTRACIÓN Y RIESGO', r);
        r = DE.writeAlertTable(dashSheet, alerts, r);
      }

      SpreadsheetApp.flush();
      _addFilteredDataSheet(tempSS, filtered, 'Vencidos +60');
      SpreadsheetApp.flush();

      var base64 = _exportDashboardSS(ssId);
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
