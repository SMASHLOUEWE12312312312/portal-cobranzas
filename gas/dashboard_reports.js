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
// GRUPO ECONÓMICO → ASEGURADO MAPPING
// ============================================================

var GRUPO_ECONOMICO_MAP = {
  'UNIVERSIDAD ALAS PERUANAS S.A.': 'GRUPO ALAS PERUANAS',
  'UNIVERSIDAD POLITÉCNICA DEL PERÚ S.A': 'GRUPO ALAS PERUANAS',
  'CORPORACION & TRANSPORTES SOLRAC S.A.C.': 'GRUPO CARLEY',
  'CORPORACION DE TRANSPORTES CARLEY SOCIEDAD ANONIMA CERRADA': 'GRUPO CARLEY',
  'CORPORATIVO EMPRESARIAL SEVEN SAC': 'GRUPO CARLEY',
  'EMPRESA DE SERVICIOS GENERALES BEMCAR S.R.L.': 'GRUPO CARLEY',
  'EMPRESA DE TRANSPORTE CRIS & MW Y SERVICIOS MULTIPLES S.A.C': 'GRUPO CARLEY',
  'EMPRESA DE TRANSPORTES RB CAR S.R.L.': 'GRUPO CARLEY',
  'GRUPO CRJ SERVICES S.A.C.': 'GRUPO CARLEY',
  'GUEVARA ALMONACID JHON ROLY': 'GRUPO CARLEY',
  'OLGA MARLENI GARCIA BASILIO': 'GRUPO CARLEY',
  'OPERACIONES GENERALES GUEVAR SAC': 'GRUPO CARLEY',
  'SOLUCIONES INTEGRALES CBC TRUCKS & PARTS S.A.C.': 'GRUPO CARLEY',
  'TRANSPORTES CARLEY S.R.L.': 'GRUPO CARLEY',
  'METAL MECANICA SOLRAC S.A.C.': 'GRUPO CARLEY',
  'LAB INFINITE SOLUTIONS S.A.C.': 'GRUPO CARLEY',
  'CCAMARZSE REFRIGERACION S.A.C.': 'GRUPO CARLEY',
  'KFJ INMOBILIARIA SOCIEDAD COMERCIAL DE RESPONSABILIDAD LIMITADA': 'GRUPO ENERGY',
  'LNG HOLDING S.A.C.': 'GRUPO ENERGY',
  'SERVICIOS ENERGETICOS AMBIENTALES SRL': 'GRUPO ENERGY',
  'UPLAND OIL AND GAS LLC SUCURSAL DEL PERU': 'GRUPO ENERGY',
  'UPLAND OIL AND GAS LORETO SAC': 'GRUPO ENERGY',
  'SERVICIOS ENERGETICOS LOGISTICOS SELVA S.A.C.': 'GRUPO ENERGY',
  'ASEO Y MANTENIMIENTO SOCIEDAD ANONIMA CERRADA': 'GRUPO ASEO, VIGILANCIA Y SALUD',
  'PREVENCION Y VIGILANCIA SOCIEDAD ANONIMA CERRADA': 'GRUPO ASEO, VIGILANCIA Y SALUD',
  'HIGIENE & SALUD SOCIEDAD ANONIMA CERRADA': 'GRUPO ASEO, VIGILANCIA Y SALUD',
  'CONSTRUCTORA JAS SAC': 'GRUPO LOMAS DORADAS',
  'CORPORACION MLD SOCIEDAD ANONIMA CERRADA - CORPORACION MLD S.A.C.': 'GRUPO LOMAS DORADAS',
  'INVERSIONES NOGAL DEL NORTE S.A.C.': 'GRUPO LOMAS DORADAS',
  'LOMERSA EMPRESARIAL SRL': 'GRUPO LOMAS DORADAS',
  'Q R L INVERSIONES SOCIEDAD ANONIMA CERRADA': 'GRUPO LOMAS DORADAS',
  'SERVICIOS EMPRESARIALES LOMER S.A.': 'GRUPO LOMAS DORADAS',
  'FINANCIERA COMERCIAL PESQUERA S.A.': 'GRUPO CAVENAGO',
  'J.C. ASTILLEROS S.A.': 'GRUPO CAVENAGO',
  'JACOBO E. CAVENAGO REBAZA': 'GRUPO CAVENAGO',
  'JACOBO ESTUARDO CAVENAGO REBAZA': 'GRUPO CAVENAGO',
  'JACZOL TRADING S.A.C.': 'GRUPO CAVENAGO',
  'LEAL REYES ROSA HERMINIA': 'GRUPO CAVENAGO',
  'PESQUERA JAAL S.R.L.': 'GRUPO CAVENAGO',
  'PESQUERA JADA S.A.': 'GRUPO CAVENAGO',
  'AGN INGENIEROS S.A.C.': 'GRUPO GLP Y GNV',
  'AUTOCARH PERCY SAC': 'GRUPO GLP Y GNV',
  'AUTOGAS ENERGY S.A.C.': 'GRUPO GLP Y GNV',
  'AUTOMOTRIZ MULTIMARCA KOREAN MOTORS E.I.R.L.': 'GRUPO GLP Y GNV',
  'BGNGAS S.A.C.': 'GRUPO GLP Y GNV',
  'CONSORCIO MEGATEX SAC': 'GRUPO GLP Y GNV',
  'CORPORACION HUVI GAS SAC': 'GRUPO GLP Y GNV',
  'CORPORACION MOTORS EIRL': 'GRUPO GLP Y GNV',
  'DALLAS AUTOGAS PERU SAC': 'GRUPO GLP Y GNV',
  'DIONE INGENIEROS GLP GNV SAC': 'GRUPO GLP Y GNV',
  'GM CONVERSIONES SOCIEDAD ANONIMA CERRADA': 'GRUPO GLP Y GNV',
  'GM CYLINDERS PERU SOCIEDAD ANONIMA CERRADA': 'GRUPO GLP Y GNV',
  'NEWGAS IMPORT S.A.C.': 'GRUPO GLP Y GNV',
  'S.A. LUIS GNV E.I.R.L.': 'GRUPO GLP Y GNV',
  'SISTEMI ECOGAS ROMANO DE PERU SA': 'GRUPO GLP Y GNV',
  'TALLER AUTOMOTRIZ MULTIMARCAS FULL INYECCION VARGAS SAC': 'GRUPO GLP Y GNV',
  'TALLERES PERUANOS DE GAS NATURAL DEL NORTE SAC': 'GRUPO GLP Y GNV',
  'TECNIGAS PERU SAC': 'GRUPO GLP Y GNV',
  'VCO GROUP EIRL': 'GRUPO GLP Y GNV',
  'YHK CORPORATION SAC': 'GRUPO GLP Y GNV',
  'MEGA FLASH GNV S.A.C.': 'GRUPO GLP Y GNV',
  'MARIA ELENA ESTRADA HERAZO': 'GRUPO FEPAD',
  'RAYMA E HIJOS S.A.C.': 'GRUPO FEPAD',
  'SP SERVICES HOLDING S.A.C.': 'GRUPO SP',
  'SP SERVICIOS PUBLICITARIOS S.A.C.': 'GRUPO SP',
  'CORPORACION SUPERNOVA SAC': 'GRUPO SP',
  'INFINITY GAMING PERU S.A.C.': 'GRUPO SP',
  'PUBLIC PARTNERS S.A.C.': 'GRUPO SP',
  'INSUMOS NO METALICOS Y QUIMICOS DE EXPORTACION E IMPORTACION S.A.': 'GRUPO INSUMEX',
  'ORE GOLD PLC S.A.C.': 'GRUPO INSUMEX',
  'PRODUCTORA SAN GABRIEL S.A.C.': 'GRUPO INSUMEX',
  'CORPORACION INSUMEX S.A.C.': 'GRUPO INSUMEX',
  'PANACA UNIDA S.A.C.': 'GRUPO TACAMA',
  'VIÑA TACAMA S.A.': 'GRUPO TACAMA',
  'CORPORACIÓN UEZU SOCIEDAD ANÓNIMA CERRADA-CORPORACIÓN UEZU S.A.C.': 'GRUPO UEZU',
  'UEZU GROUP S.A.C.': 'GRUPO UEZU',
  'APOYO CARDIOVASCULAR SRLTDA': 'GRUPO CARDIOVASCULAR',
  'TALLEDO CIRUJANOS CARDIOVASCULARES S.A.': 'GRUPO CARDIOVASCULAR'
};

// Build uppercase lookup for case-insensitive matching
var _GRUPO_LOOKUP = {};
(function() {
  var keys = Object.keys(GRUPO_ECONOMICO_MAP);
  for (var i = 0; i < keys.length; i++) {
    _GRUPO_LOOKUP[keys[i].toUpperCase()] = GRUPO_ECONOMICO_MAP[keys[i]];
  }
})();

function _getGrupoEconomico(asegurado) {
  var key = String(asegurado || '').trim().toUpperCase();
  return _GRUPO_LOOKUP[key] || String(asegurado || '').trim();
}

// ============================================================
// HELPERS
// ============================================================

var _bdDashboardCache = null;
var _bdDashboardCacheTime = 0;
var BD_DASHBOARD_CACHE_TTL = 60000; // 60s in-memory TTL

function _loadBDForDashboard() {
  // In-memory cache within same execution context
  var now = Date.now();
  if (_bdDashboardCache && (now - _bdDashboardCacheTime) < BD_DASHBOARD_CACHE_TTL) {
    return _bdDashboardCache;
  }

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

  var result = {
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

  // Cache for reuse within same report generation
  _bdDashboardCache = result;
  _bdDashboardCacheTime = Date.now();

  return result;
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

// ============================================================
// 4. REPORTE BITÁCORA DE COBRANZAS
// ============================================================

function generarReporteBitacoraConDashboard() {
  try {
    var DE = DashboardEngine;
    var today = new Date(); today.setHours(0, 0, 0, 0);

    // --- Load Bitácora data ---
    var bitSheet = SheetsIO._getSpreadsheet().getSheetByName(getConfig('SHEETS.BITACORA_GESTIONES', 'Bitacora_Gestiones_EECC'));
    if (!bitSheet) throw new Error('Hoja Bitácora no encontrada');
    var bitData = bitSheet.getDataRange().getValues();
    if (bitData.length < 2) throw new Error('Sin datos en Bitácora');
    var bitHeaders = bitData[0];

    // Column index map
    var bCol = {};
    for (var h = 0; h < bitHeaders.length; h++) {
      bCol[String(bitHeaders[h]).trim().toUpperCase()] = h;
    }
    var iAseg = bCol['ASEGURADO'] != null ? bCol['ASEGURADO'] : 5;
    var iEstado = bCol['ESTADO_GESTION'] != null ? bCol['ESTADO_GESTION'] : 9;
    var iTipo = bCol['TIPO_GESTION'] != null ? bCol['TIPO_GESTION'] : 8;
    var iCanal = bCol['CANAL_CONTACTO'] != null ? bCol['CANAL_CONTACTO'] : 10;
    var iResp = bCol['RESPONSABLE'] != null ? bCol['RESPONSABLE'] : 7;
    var iFecReg = bCol['FECHA_REGISTRO'] != null ? bCol['FECHA_REGISTRO'] : 4;
    var iFecComp = bCol['FECHA_COMPROMISO'] != null ? bCol['FECHA_COMPROMISO'] : 11;
    var iProxAcc = bCol['PROXIMA_ACCION'] != null ? bCol['PROXIMA_ACCION'] : 12;
    var iObs = bCol['OBSERVACIONES'] != null ? bCol['OBSERVACIONES'] : 13;
    var iVencPEN = bCol['SNAPSHOT_VENCIDO_PEN'] != null ? bCol['SNAPSHOT_VENCIDO_PEN'] : 14;
    var iVencUSD = bCol['SNAPSHOT_VENCIDO_USD'] != null ? bCol['SNAPSHOT_VENCIDO_USD'] : 15;
    var iIdCiclo = bCol['ID_CICLO'] != null ? bCol['ID_CICLO'] : 0;

    // --- Build per-asegurado summary (latest gesture per individual client) ---
    var asegMap = {};
    for (var i = 1; i < bitData.length; i++) {
      var row = bitData[i];
      var aseg = String(row[iAseg] || '').trim();
      if (!aseg) continue;
      var fecReg = _parseDateDash(row[iFecReg]);
      var key = aseg.toUpperCase();

      if (!asegMap[key]) {
        asegMap[key] = { nombre: aseg, gestiones: [], latestDate: null, latest: null };
      }
      asegMap[key].gestiones.push(row);
      if (!asegMap[key].latestDate || (fecReg && fecReg > asegMap[key].latestDate)) {
        asegMap[key].latestDate = fecReg;
        asegMap[key].latest = row;
      }
    }

    // --- Aggregate by GRUPO ECONÓMICO ---
    // First build individual client records, then group them
    var grupoMap = {};
    var asegKeys = Object.keys(asegMap);

    for (var a = 0; a < asegKeys.length; a++) {
      var am = asegMap[asegKeys[a]];
      var latest = am.latest;
      var estado = String(latest[iEstado] || 'SIN_RESPUESTA').trim();
      var respRaw = String(latest[iResp] || 'Sin Asignar').trim();
      var resp = (respRaw.indexOf('@') !== -1 ? respRaw.split('@')[0] : respRaw).toUpperCase();
      var vPEN = _parseNum(latest[iVencPEN]);
      var vUSD = _parseNum(latest[iVencUSD]);
      var fecReg2 = _parseDateDash(latest[iFecReg]);
      var dias = fecReg2 ? Math.floor((today - fecReg2) / 86400000) : 0;
      var fecComp = _parseDateDash(latest[iFecComp]);
      var obs = String(latest[iObs] || '').trim();

      // Calculate tendencia from previous gesture
      var tendenciaPEN = 'SIN_CAMBIO';
      var deltaPEN = 0;
      var tendenciaUSD = 'SIN_CAMBIO';
      var deltaUSD = 0;
      if (am.gestiones.length >= 2) {
        var sorted = am.gestiones.slice().sort(function(x, y) {
          var dx = _parseDateDash(x[iFecReg]) || new Date(0);
          var dy = _parseDateDash(y[iFecReg]) || new Date(0);
          return dy - dx;
        });
        var prevPEN = _parseNum(sorted[1][iVencPEN]);
        var prevUSD = _parseNum(sorted[1][iVencUSD]);
        deltaPEN = vPEN - prevPEN;
        deltaUSD = vUSD - prevUSD;
        if (deltaPEN > 0) tendenciaPEN = 'AUMENTO';
        else if (deltaPEN < 0) tendenciaPEN = 'DISMINUCION';
        if (deltaUSD > 0) tendenciaUSD = 'AUMENTO';
        else if (deltaUSD < 0) tendenciaUSD = 'DISMINUCION';
      }

      var isActive = estado !== 'CERRADO_PAGADO' && estado !== 'NO_COBRABLE' && estado !== 'NO_CONTACTABLE'
        && estado.indexOf('DERIVADO') === -1;

      // Resolve grupo económico
      var grupoNombre = _getGrupoEconomico(am.nombre);
      var grupoKey = grupoNombre.toUpperCase();

      if (!grupoMap[grupoKey]) {
        grupoMap[grupoKey] = {
          nombre: grupoNombre, vPEN: 0, vUSD: 0, deltaPEN: 0, deltaUSD: 0,
          dias: 0, maxDias: 0, numGestiones: 0,
          estados: {}, resp: resp, fecComp: null, obs: '',
          miembros: [], isActive: false, tendenciaPEN: 'SIN_CAMBIO', tendenciaUSD: 'SIN_CAMBIO',
          latestDate: null, latestEstado: 'SIN_RESPUESTA'
        };
      }
      var gm = grupoMap[grupoKey];
      gm.vPEN += vPEN;
      gm.vUSD += vUSD;
      gm.deltaPEN += deltaPEN;
      gm.deltaUSD += deltaUSD;
      gm.numGestiones += am.gestiones.length;
      if (dias > gm.maxDias) { gm.maxDias = dias; gm.dias = dias; }
      if (!gm.estados[estado]) gm.estados[estado] = 0;
      gm.estados[estado]++;
      if (isActive) gm.isActive = true;
      // Track the estado from the most recent gestión in the grupo
      if (am.latestDate && (!gm.latestDate || am.latestDate > gm.latestDate)) {
        gm.latestDate = am.latestDate;
        gm.latestEstado = estado;
      }
      if (fecComp && (!gm.fecComp || fecComp < gm.fecComp)) gm.fecComp = fecComp;
      if (obs && !gm.obs) gm.obs = obs;
      gm.miembros.push({
        nombre: am.nombre, estado: estado, resp: resp,
        vPEN: vPEN, vUSD: vUSD, dias: dias, isActive: isActive,
        tendenciaPEN: tendenciaPEN, deltaPEN: deltaPEN,
        tendenciaUSD: tendenciaUSD, deltaUSD: deltaUSD
      });
    }

    // --- Determine dominant estado and tendencia per grupo ---
    var clientes = [];
    var totalVencPEN = 0, totalVencUSD = 0;
    var estadoCount = {};
    var respData = {};
    var grupoKeys = Object.keys(grupoMap);

    for (var g = 0; g < grupoKeys.length; g++) {
      var gd = grupoMap[grupoKeys[g]];
      // Use the estado from the most recent gestión in the grupo
      var dominantEstado = gd.latestEstado || 'EN_SEGUIMIENTO';

      // Tendencia: based on aggregate delta
      var tendencia = 'SIN_CAMBIO';
      if (gd.deltaPEN > 0) tendencia = 'AUMENTO';
      else if (gd.deltaPEN < 0) tendencia = 'DISMINUCION';
      if (gd.numGestiones <= gd.miembros.length) tendencia = 'PRIMERA_VEZ_FLAG';
      gd.tendenciaPEN = tendencia === 'PRIMERA_VEZ_FLAG' ? 'SIN_CAMBIO' : tendencia;

      var tendenciaU = 'SIN_CAMBIO';
      if (gd.deltaUSD > 0) tendenciaU = 'AUMENTO';
      else if (gd.deltaUSD < 0) tendenciaU = 'DISMINUCION';
      if (gd.numGestiones <= gd.miembros.length) tendenciaU = 'PRIMERA_VEZ_FLAG';
      gd.tendenciaUSD = tendenciaU === 'PRIMERA_VEZ_FLAG' ? 'SIN_CAMBIO' : tendenciaU;

      // Dominant responsable
      var respCount = {};
      for (var mi = 0; mi < gd.miembros.length; mi++) {
        var mr = gd.miembros[mi].resp;
        respCount[mr] = (respCount[mr] || 0) + 1;
      }
      var dominantResp = gd.resp;
      var maxR = 0;
      var rks = Object.keys(respCount);
      for (var ri = 0; ri < rks.length; ri++) {
        if (respCount[rks[ri]] > maxR) { maxR = respCount[rks[ri]]; dominantResp = rks[ri]; }
      }

      var cliente = {
        nombre: gd.nombre, estado: dominantEstado, resp: dominantResp,
        vPEN: gd.vPEN, vUSD: gd.vUSD, dias: gd.maxDias,
        fecComp: gd.fecComp, obs: gd.obs,
        tendenciaPEN: gd.tendenciaPEN, deltaPEN: gd.deltaPEN,
        tendenciaUSD: gd.tendenciaUSD, deltaUSD: gd.deltaUSD,
        numGestiones: gd.numGestiones, isActive: gd.isActive,
        miembros: gd.miembros,
        isPrimeraVez: tendencia === 'PRIMERA_VEZ_FLAG'
      };
      clientes.push(cliente);

      totalVencPEN += gd.vPEN;
      totalVencUSD += gd.vUSD;

      if (!estadoCount[dominantEstado]) estadoCount[dominantEstado] = { count: 0, pen: 0, usd: 0 };
      estadoCount[dominantEstado].count++;
      estadoCount[dominantEstado].pen += gd.vPEN;
      estadoCount[dominantEstado].usd += gd.vUSD;

      if (!respData[dominantResp]) respData[dominantResp] = { total: 0, pen: 0, usd: 0, enSeg: 0, sinResp: 0, cerrados: 0, activos: 0 };
      respData[dominantResp].total++;
      respData[dominantResp].pen += gd.vPEN;
      respData[dominantResp].usd += gd.vUSD;
      if (dominantEstado === 'EN_SEGUIMIENTO') respData[dominantResp].enSeg++;
      if (dominantEstado === 'SIN_RESPUESTA') respData[dominantResp].sinResp++;
      if (dominantEstado === 'CERRADO_PAGADO') respData[dominantResp].cerrados++;
      if (gd.isActive) respData[dominantResp].activos++;
    }

    var totalClientes = clientes.length;
    var clientesActivos = clientes.filter(function(c) { return c.isActive; });
    var cerrados = estadoCount['CERRADO_PAGADO'] ? estadoCount['CERRADO_PAGADO'].count : 0;
    var tasaCierre = totalClientes > 0 ? (cerrados / totalClientes * 100).toFixed(0) : '0';

    // --- Aging buckets from BD (FEC_VENCIMIENTO COB), filtered to active bitacora groups only ---
    var bd = _loadBDForDashboard();
    var agingBuckets = [
      { label: '0-30 días', min: 0, max: 30, severity: 'VERDE', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '31-60 días', min: 31, max: 60, severity: 'AMARILLO', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '61-90 días', min: 61, max: 90, severity: 'NARANJA', count: 0, montoPEN: 0, montoUSD: 0 },
      { label: '90+ días', min: 91, max: 99999, severity: 'ROJO', count: 0, montoPEN: 0, montoUSD: 0 }
    ];
    // Build set of active grupo names for filtering
    var activeGrupos = {};
    for (var cag = 0; cag < clientesActivos.length; cag++) {
      activeGrupos[clientesActivos[cag].nombre.toUpperCase()] = true;
    }
    // Count unique grupos per bucket
    var agingGrupoSets = [];
    for (var bs = 0; bs < agingBuckets.length; bs++) agingGrupoSets.push({});

    for (var bi = 0; bi < bd.rows.length; bi++) {
      var bRow = bd.rows[bi];
      var bImp = _parseNum(bRow[bd.importeIdx]);
      if (bImp <= 0) continue;
      var bFec = _parseDateDash(bRow[bd.fecVencIdx]);
      if (!bFec) continue;
      var bDias = Math.floor((today - bFec) / 86400000);
      if (bDias < 0) continue; // not yet due
      var bAseg = String(bRow[bd.aseguradoIdx] || '').trim();
      var bGrupo = _getGrupoEconomico(bAseg).toUpperCase();
      // Only include if this grupo/asegurado is active in bitacora
      if (!activeGrupos[bGrupo]) continue;
      var bMon = _monKey(bRow[bd.monIdx]);

      for (var bb = 0; bb < agingBuckets.length; bb++) {
        if (bDias >= agingBuckets[bb].min && bDias <= agingBuckets[bb].max) {
          if (bMon === 'PEN') agingBuckets[bb].montoPEN += bImp;
          else agingBuckets[bb].montoUSD += bImp;
          agingGrupoSets[bb][bGrupo] = true;
          break;
        }
      }
    }
    // Set count as unique grupos per bucket
    for (var bc = 0; bc < agingBuckets.length; bc++) {
      agingBuckets[bc].count = Object.keys(agingGrupoSets[bc]).length;
    }

    // --- Tendencia buckets ---
    var tendBuckets = { AUMENTO: { count: 0, pen: 0 }, SIN_CAMBIO: { count: 0, pen: 0 }, DISMINUCION: { count: 0, pen: 0 }, PRIMERA_VEZ: { count: 0, pen: 0 } };
    var tendBucketsUSD = { AUMENTO: { count: 0, usd: 0 }, SIN_CAMBIO: { count: 0, usd: 0 }, DISMINUCION: { count: 0, usd: 0 }, PRIMERA_VEZ: { count: 0, usd: 0 } };
    for (var ct = 0; ct < clientesActivos.length; ct++) {
      var clt = clientesActivos[ct];
      if (clt.isPrimeraVez) {
        tendBuckets.PRIMERA_VEZ.count++;
        tendBuckets.PRIMERA_VEZ.pen += clt.vPEN;
        if (clt.vUSD > 0) { tendBucketsUSD.PRIMERA_VEZ.count++; tendBucketsUSD.PRIMERA_VEZ.usd += clt.vUSD; }
      } else {
        var tb = tendBuckets[clt.tendenciaPEN] || tendBuckets.SIN_CAMBIO;
        tb.count++;
        tb.pen += clt.vPEN;
        if (clt.vUSD > 0) {
          var tbU = tendBucketsUSD[clt.tendenciaUSD] || tendBucketsUSD.SIN_CAMBIO;
          tbU.count++;
          tbU.usd += clt.vUSD;
        }
      }
    }

    // ---- Build Dashboard ----
    var tempSS = SpreadsheetApp.create('TMP_BITACORA_DASH_' + Date.now());
    var ssId = tempSS.getId();

    try {
      var dashSheet = tempSS.getSheets()[0];
      dashSheet.setName('Reporte');
      DE.prepareCanvas(dashSheet);

      var r = DE.writeHeaderSection(dashSheet, 'REPORTE BITÁCORA DE COBRANZAS',
        'Gestión de Cartera Vencida   |   ' + totalClientes + ' registros   |   ' + clientesActivos.length + ' clientes activos   |   ' + tasaCierre + '% tasa de cierre', 1);

      // ① KPI ROW 1
      r = DE.writeKPIRow(dashSheet, [
        { value: DE.formatCurrency(totalVencPEN, 'PEN'), label: 'CARTERA VENCIDA TOTAL PEN', color: DE.COLORS.RED },
        { value: DE.formatCurrency(totalVencUSD, 'USD'), label: 'CARTERA VENCIDA TOTAL USD', color: DE.COLORS.RED },
        { value: clientesActivos.length.toString(), label: 'CLIENTES ACTIVOS', color: DE.COLORS.BRAND_DARK }
      ], r);

      // KPI ROW 2 - estados clave
      var enSeg = estadoCount['EN_SEGUIMIENTO'] ? estadoCount['EN_SEGUIMIENTO'].count : 0;
      var sinResp = estadoCount['SIN_RESPUESTA'] ? estadoCount['SIN_RESPUESTA'].count : 0;
      var compPago = estadoCount['COMPROMISO_PAGO'] ? estadoCount['COMPROMISO_PAGO'].count : 0;
      r = DE.writeKPIRow(dashSheet, [
        { value: enSeg.toString(), label: 'EN SEGUIMIENTO', color: DE.COLORS.ORANGE },
        { value: sinResp.toString(), label: 'SIN RESPUESTA', color: DE.COLORS.RED },
        { value: cerrados.toString(), label: 'CERRADOS / PAGADOS', color: DE.COLORS.GREEN }
      ], r);

      // ② CARTERA POR ESTADO
      r = DE.writeSectionTitle(dashSheet, 'CARTERA POR ESTADO', r);
      var estadoLabels = {
        'EN_SEGUIMIENTO': 'En Seguimiento', 'SIN_RESPUESTA': 'Sin Respuesta',
        'COMPROMISO_PAGO': 'Compromiso Pago', 'CERRADO_PAGADO': 'Cerrado Pagado',
        'DERIVADO_COMERCIAL': 'Derivado Comercial', 'DERIVADO_RRHH': 'Derivado RRHH',
        'DERIVADO_RIESGOS_GENERALES': 'Derivado Riesgos Gral.', 'NO_COBRABLE': 'No Cobrable',
        'NO_CONTACTABLE': 'No Contactable', 'REPROGRAMADO': 'Reprogramado'
      };
      var estadoOrder = ['EN_SEGUIMIENTO', 'SIN_RESPUESTA', 'COMPROMISO_PAGO', 'CERRADO_PAGADO',
        'DERIVADO_COMERCIAL', 'DERIVADO_RRHH', 'DERIVADO_RIESGOS_GENERALES', 'NO_COBRABLE', 'NO_CONTACTABLE', 'REPROGRAMADO'];
      var estadoRows = [];
      for (var eo = 0; eo < estadoOrder.length; eo++) {
        var est = estadoOrder[eo];
        var ed = estadoCount[est];
        if (!ed) continue;
        var pctClientes = totalClientes > 0 ? (ed.count / totalClientes * 100).toFixed(1) : '0.0';
        var pctPEN = totalVencPEN > 0 ? (ed.pen / totalVencPEN * 100).toFixed(1) : '0.0';
        var sev = est === 'SIN_RESPUESTA' ? 'ALTO' : est === 'CERRADO_PAGADO' ? 'VERDE' :
          (est === 'NO_COBRABLE' || est.indexOf('DERIVADO') !== -1) ? 'NARANJA' : 'NORMAL';
        estadoRows.push([estadoLabels[est] || est, ed.count, ed.pen, ed.usd, pctClientes, sev]);
      }
      estadoRows.push(['TOTAL', totalClientes, totalVencPEN, totalVencUSD, '100.0', '']);
      r = DE.writeTable(dashSheet, {
        headers: ['Estado', '# Clientes', 'Vencido PEN', 'Vencido USD', '% Clientes', 'Criticidad'],
        rows: estadoRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5, totalRow: true });

      // ③ PERFORMANCE POR RESPONSABLE
      r = DE.writeSectionTitle(dashSheet, 'PERFORMANCE POR RESPONSABLE', r);
      var respKeys = Object.keys(respData).sort(function(a, b) { return respData[b].total - respData[a].total; });
      var respRows = [];
      for (var rk = 0; rk < respKeys.length; rk++) {
        var rd = respData[respKeys[rk]];
        var efectividad = rd.total > 0 ? (rd.cerrados / rd.total * 100).toFixed(0) : '0';
        var efSev = parseInt(efectividad) >= 60 ? 'VERDE' : parseInt(efectividad) >= 30 ? 'AMARILLO' : 'NARANJA';
        respRows.push([respKeys[rk], rd.total, rd.pen, rd.usd, efectividad, efSev]);
      }
      r = DE.writeTable(dashSheet, {
        headers: ['Responsable', 'Total Casos', 'Vencido PEN', 'Vencido USD', '% Efectividad', 'Nivel'],
        rows: respRows
      }, r, { currencyCols: [2, 3], pctCols: [4], severityCol: 5 });

      // ④ ANTIGÜEDAD + TENDENCIA
      r = DE.writeSectionTitle(dashSheet, 'ANTIGÜEDAD CARTERA ACTIVA', r);
      r = DE.writeAgingTable(dashSheet, agingBuckets, r);

      r = DE.writeSectionTitle(dashSheet, 'TENDENCIA DE CARTERA PEN', r);
      var tendRows = [
        ['AUMENTO', tendBuckets.AUMENTO.count, tendBuckets.AUMENTO.pen, 'ROJO'],
        ['SIN CAMBIO', tendBuckets.SIN_CAMBIO.count, tendBuckets.SIN_CAMBIO.pen, 'AMARILLO'],
        ['DISMINUCIÓN', tendBuckets.DISMINUCION.count, tendBuckets.DISMINUCION.pen, 'VERDE'],
        ['PRIMERA VEZ', tendBuckets.PRIMERA_VEZ.count, tendBuckets.PRIMERA_VEZ.pen, 'NORMAL']
      ];
      r = DE.writeTable(dashSheet, {
        headers: ['Tendencia', '# Clientes', 'Cartera PEN S/.', 'Señal'],
        rows: tendRows
      }, r, { currencyCols: [2], severityCol: 3 });

      // TENDENCIA DE CARTERA USD
      var totalTendUSD = tendBucketsUSD.AUMENTO.count + tendBucketsUSD.SIN_CAMBIO.count + tendBucketsUSD.DISMINUCION.count + tendBucketsUSD.PRIMERA_VEZ.count;
      if (totalTendUSD > 0) {
        r = DE.writeSectionTitle(dashSheet, 'TENDENCIA DE CARTERA USD', r);
        var tendRowsUSD = [
          ['AUMENTO', tendBucketsUSD.AUMENTO.count, tendBucketsUSD.AUMENTO.usd, 'ROJO'],
          ['SIN CAMBIO', tendBucketsUSD.SIN_CAMBIO.count, tendBucketsUSD.SIN_CAMBIO.usd, 'AMARILLO'],
          ['DISMINUCIÓN', tendBucketsUSD.DISMINUCION.count, tendBucketsUSD.DISMINUCION.usd, 'VERDE'],
          ['PRIMERA VEZ', tendBucketsUSD.PRIMERA_VEZ.count, tendBucketsUSD.PRIMERA_VEZ.usd, 'NORMAL']
        ];
        r = DE.writeTable(dashSheet, {
          headers: ['Tendencia', '# Clientes', 'Cartera USD US$', 'Señal'],
          rows: tendRowsUSD
        }, r, { currencyCols: [2], severityCol: 3 });
      }

      // ⑤ MATRIZ DE RIESGO - TOP 30 GRUPOS/CLIENTES ACTIVOS
      r = DE.writeSectionTitle(dashSheet, 'MATRIZ DE RIESGO — TOP 30 GRUPOS / CLIENTES ACTIVOS', r);
      var scored = clientesActivos.map(function(c) {
        var score = 0;
        var montoTotal = c.vPEN + c.vUSD;
        if (montoTotal > 50000) score += 30; else if (montoTotal > 20000) score += 20; else if (montoTotal > 5000) score += 10;
        if (c.dias > 60) score += 25; else if (c.dias > 30) score += 15; else if (c.dias > 14) score += 5;
        if (c.estado === 'SIN_RESPUESTA') score += 20; else if (c.estado === 'COMPROMISO_PAGO') score += 10;
        if (c.tendenciaPEN === 'AUMENTO') score += 25; else if (c.tendenciaPEN === 'SIN_CAMBIO') score += 5;
        c.score = Math.min(score, 100);
        c.nivel = score >= 70 ? 'CRITICO' : score >= 45 ? 'ALTO' : score >= 20 ? 'AMARILLO' : 'NORMAL';
        return c;
      }).sort(function(a, b) { return b.score - a.score; });

      var top30 = scored.slice(0, 30);
      var riskRows = [];
      for (var tr = 0; tr < top30.length; tr++) {
        var tc = top30[tr];
        var estadoShort = tc.estado.replace('_', ' ');
        if (estadoShort.length > 12) estadoShort = estadoShort.substring(0, 12);
        var tendIcon = tc.tendenciaPEN === 'AUMENTO' ? 'SUBE' : tc.tendenciaPEN === 'DISMINUCION' ? 'BAJA' : 'IGUAL';
        riskRows.push([(tr + 1) + '. ' + tc.nombre, tc.resp, tc.dias, tc.vPEN, tc.vUSD, tc.score + '/100  ' + tc.nivel]);
      }
      r = DE.writeTable(dashSheet, {
        headers: ['Grupo / Asegurado', 'Resp.', 'Días', 'Vencido PEN', 'Vencido USD', 'Score / Nivel'],
        rows: riskRows
      }, r, { currencyCols: [3, 4], severityCol: 5 });

      // ⑥ SIN RESPUESTA - GESTIÓN URGENTE
      var sinRespClientes = clientesActivos.filter(function(c) { return c.estado === 'SIN_RESPUESTA'; })
        .sort(function(a, b) { return (b.vPEN + b.vUSD) - (a.vPEN + a.vUSD); });

      if (sinRespClientes.length > 0) {
        r = DE.writeSectionTitle(dashSheet, 'SIN RESPUESTA — GESTIÓN URGENTE (' + sinRespClientes.length + ')', r);
        var srRows = [];
        for (var sr = 0; sr < sinRespClientes.length; sr++) {
          var sc = sinRespClientes[sr];
          var srNivel = sc.score >= 70 ? 'CRITICO' : sc.score >= 45 ? 'ALTO' : 'AMARILLO';
          srRows.push([sc.nombre, sc.resp, sc.dias, sc.vPEN, sc.vUSD, srNivel]);
        }
        r = DE.writeTable(dashSheet, {
          headers: ['Grupo / Asegurado', 'Resp.', 'Días', 'Vencido PEN', 'Vencido USD', 'Nivel Riesgo'],
          rows: srRows
        }, r, { currencyCols: [3, 4], severityCol: 5 });
      }

      // ⑦ COMPROMISOS DE PAGO
      var compromisos = clientes.filter(function(c) { return c.estado === 'COMPROMISO_PAGO' && c.fecComp; })
        .sort(function(a, b) { return a.fecComp - b.fecComp; });

      if (compromisos.length > 0) {
        r = DE.writeSectionTitle(dashSheet, 'COMPROMISOS DE PAGO (' + compromisos.length + ')', r);
        var compRows = [];
        for (var cp = 0; cp < compromisos.length; cp++) {
          var cc = compromisos[cp];
          var diasRest = Math.floor((cc.fecComp - today) / 86400000);
          var compSev = diasRest < 0 ? 'CRITICO' : diasRest <= 3 ? 'ALTO' : diasRest <= 7 ? 'AMARILLO' : 'NORMAL';
          var fecStr = Utilities.formatDate(cc.fecComp, 'America/Lima', 'dd/MM/yyyy');
          compRows.push([cc.nombre, cc.resp, fecStr, diasRest, cc.vPEN, cc.vUSD, compSev]);
        }
        r = DE.writeTable(dashSheet, {
          headers: ['Grupo / Asegurado', 'Resp.', 'Fec. Compromiso', 'Días Rest.', 'Vencido PEN', 'Vencido USD', 'Alerta'],
          rows: compRows
        }, r, { currencyCols: [4, 5], severityCol: 6 });
      }

      // ⑧ CLIENTES CON DEUDA EN AUMENTO
      var enAumento = clientesActivos.filter(function(c) { return c.tendenciaPEN === 'AUMENTO' && c.deltaPEN > 0; })
        .sort(function(a, b) { return b.vPEN - a.vPEN; });

      if (enAumento.length > 0) {
        r = DE.writeSectionTitle(dashSheet, 'CLIENTES CON DEUDA EN AUMENTO (' + enAumento.length + ')', r);
        var aumRows = [];
        for (var ea = 0; ea < enAumento.length; ea++) {
          var ec = enAumento[ea];
          var estadoAbr = ec.estado.replace('_', ' ');
          if (estadoAbr.length > 12) estadoAbr = estadoAbr.substring(0, 12);
          aumRows.push([ec.nombre, ec.resp, ec.dias, ec.vPEN, ec.deltaPEN, ec.vUSD, ec.deltaUSD, 'ROJO']);
        }
        r = DE.writeTable(dashSheet, {
          headers: ['Grupo / Asegurado', 'Resp.', 'Días', 'Vencido PEN', 'Delta PEN', 'Vencido USD', 'Delta USD', 'Tendencia'],
          rows: aumRows
        }, r, { currencyCols: [3, 4, 5, 6], severityCol: 7 });
      }

      // ALERTAS FINALES
      var alerts = [];
      if (sinRespClientes.length > 5) alerts.push({ indicator: 'Clientes Sin Respuesta', value: sinRespClientes.length + ' clientes', status: 'CRITICO' });
      if (enAumento.length > 5) alerts.push({ indicator: 'Deuda en Aumento', value: enAumento.length + ' clientes', status: 'ROJO' });
      if (totalVencPEN > 500000) alerts.push({ indicator: 'Cartera Vencida PEN', value: DE.formatCurrency(totalVencPEN, 'PEN'), status: 'CRITICO' });
      if (totalVencUSD > 0) alerts.push({ indicator: 'Cartera Vencida USD', value: DE.formatCurrency(totalVencUSD, 'USD'), status: totalVencUSD > 50000 ? 'CRITICO' : totalVencUSD > 10000 ? 'ROJO' : 'NARANJA' });
      var pctSinResp = totalClientes > 0 ? (sinResp / totalClientes * 100) : 0;
      if (pctSinResp > 10) alerts.push({ indicator: '% Sin Respuesta', value: pctSinResp.toFixed(1) + '%', status: 'NARANJA' });
      if (compromisos.length > 0) {
        var vencidos = compromisos.filter(function(c2) { return c2.fecComp < today; });
        if (vencidos.length > 0) alerts.push({ indicator: 'Compromisos Vencidos', value: vencidos.length + ' vencidos', status: 'CRITICO' });
      }

      if (alerts.length > 0) {
        r = DE.writeSectionTitle(dashSheet, 'ALERTAS DE CONCENTRACIÓN Y RIESGO', r);
        r = DE.writeAlertTable(dashSheet, alerts, r);
      }

      // --- Hojas de detalle por aging (desde BD, agrupado por grupo económico) ---
      var agingSheets = [
        { name: 'Mas de 90', min: 91, max: 99999 },
        { name: '61-90', min: 61, max: 90 },
        { name: '31-60', min: 31, max: 60 }
      ];

      for (var as = 0; as < agingSheets.length; as++) {
        var aSh = agingSheets[as];
        var agingFiltered = [];
        var agingGrupos = {};

        for (var ai = 0; ai < bd.rows.length; ai++) {
          var aRow = bd.rows[ai];
          var aImp = _parseNum(aRow[bd.importeIdx]);
          if (aImp <= 0) continue;
          var aFec = _parseDateDash(aRow[bd.fecVencIdx]);
          if (!aFec) continue;
          var aDias = Math.floor((today - aFec) / 86400000);
          if (aDias >= aSh.min && aDias <= aSh.max) {
            agingFiltered.push(aRow);
            var aAseg = String(aRow[bd.aseguradoIdx] || 'Sin Asegurado').trim();
            var aMon = _monKey(aRow[bd.monIdx]);
            var aGrupo = _getGrupoEconomico(aAseg);
            if (!agingGrupos[aGrupo]) agingGrupos[aGrupo] = { pen: 0, usd: 0, estado: '', resp: '' };
            if (aMon === 'PEN') agingGrupos[aGrupo].pen += aImp;
            else agingGrupos[aGrupo].usd += aImp;
            // Get estado/resp from bitacora (check grupo first, then individual)
            var gKey = aGrupo.toUpperCase();
            if (grupoMap[gKey]) {
              agingGrupos[aGrupo].estado = grupoMap[gKey].latestEstado || 'SIN_RESPUESTA';
              agingGrupos[aGrupo].resp = grupoMap[gKey].resp;
            } else {
              var bKey = aAseg.toUpperCase();
              if (asegMap[bKey] && asegMap[bKey].latest) {
                agingGrupos[aGrupo].estado = String(asegMap[bKey].latest[iEstado] || '');
                var agRespRaw = String(asegMap[bKey].latest[iResp] || '');
                agingGrupos[aGrupo].resp = agRespRaw.indexOf('@') !== -1 ? agRespRaw.split('@')[0] : agRespRaw;
              }
            }
          }
        }

        // Create aging detail sheet
        var agSheet = tempSS.insertSheet(aSh.name);
        DE.prepareCanvas(agSheet);
        var ar = DE.writeHeaderSection(agSheet, aSh.name.toUpperCase() + ' DÍAS', agingFiltered.length + ' cupones encontrados', 1);

        var agKeys = Object.keys(agingGrupos).sort(function(a, b) {
          return (agingGrupos[b].pen + agingGrupos[b].usd) - (agingGrupos[a].pen + agingGrupos[a].usd);
        });
        var agRows = [];
        for (var ag = 0; ag < agKeys.length; ag++) {
          var agd = agingGrupos[agKeys[ag]];
          var agEst = agd.estado || 'N/A';
          var agResp = agd.resp || 'N/A';
          agRows.push([agKeys[ag], agd.pen, agd.usd, agEst, agResp]);
        }
        DE.writeTable(agSheet, {
          headers: ['GRUPO_ECONOMICO', 'MONTO PEN S/', 'MONTO USD US$', 'STATUS', 'RESPONSABLE'],
          rows: agRows
        }, ar, { currencyCols: [1, 2] });
      }

      // --- Hoja base de datos: última gestión por asegurado ---
      var bdBitSheet = tempSS.insertSheet('Bitacora_Gestiones');
      var bdBitHeaders = ['Asegurado', 'Estado', 'Tipo', 'Canal', 'Responsable',
        'Fecha Registro', 'Días Desde Registro', 'Fecha Compromiso', 'Próxima Acción',
        'Vencido PEN', 'Delta PEN', 'Tendencia PEN', 'Vencido USD', 'Delta USD',
        'Tendencia USD', 'Observaciones'];
      var bdBitRows = [];

      // Iterate all individual asegurados (not grouped) for the raw data
      var allAsegKeys = Object.keys(asegMap);
      allAsegKeys.sort(function(a, b) {
        var la = asegMap[a].latest, lb = asegMap[b].latest;
        var da = _parseDateDash(la[iFecReg]) || new Date(0);
        var db = _parseDateDash(lb[iFecReg]) || new Date(0);
        return db - da;
      });

      for (var bd2 = 0; bd2 < allAsegKeys.length; bd2++) {
        var am2 = asegMap[allAsegKeys[bd2]];
        var lt = am2.latest;
        var fReg = _parseDateDash(lt[iFecReg]);
        var diasReg = fReg ? Math.floor((today - fReg) / 86400000) : 0;
        var fComp2 = _parseDateDash(lt[iFecComp]);
        var vP = _parseNum(lt[iVencPEN]);
        var vU = _parseNum(lt[iVencUSD]);

        // Calculate delta and tendencia
        var dP = 0, dU = 0, tP = 'SIN_CAMBIO', tU = 'SIN_CAMBIO';
        if (am2.gestiones.length >= 2) {
          var srt = am2.gestiones.slice().sort(function(x, y) {
            var dx2 = _parseDateDash(x[iFecReg]) || new Date(0);
            var dy2 = _parseDateDash(y[iFecReg]) || new Date(0);
            return dy2 - dx2;
          });
          var prevP = _parseNum(srt[1][iVencPEN]);
          var prevU = _parseNum(srt[1][iVencUSD]);
          dP = vP - prevP;
          dU = vU - prevU;
          if (dP > 0) tP = 'AUMENTO'; else if (dP < 0) tP = 'DISMINUCION';
          if (dU > 0) tU = 'AUMENTO'; else if (dU < 0) tU = 'DISMINUCION';
        }

        bdBitRows.push([
          am2.nombre,
          String(lt[iEstado] || ''),
          String(lt[iTipo] || ''),
          String(lt[iCanal] || ''),
          (function(r) { return r.indexOf('@') !== -1 ? r.split('@')[0] : r; })(String(lt[iResp] || '')),
          fReg || '',
          diasReg,
          fComp2 || '',
          String(lt[iProxAcc] || ''),
          vP, dP, tP,
          vU, dU, tU,
          String(lt[iObs] || '')
        ]);
      }

      // Write headers + data
      bdBitSheet.getRange(1, 1, 1, bdBitHeaders.length).setValues([bdBitHeaders])
        .setFontWeight('bold').setBackground('#1A202C').setFontColor('#FFFFFF')
        .setFontFamily('Calibri').setFontSize(9);
      bdBitSheet.setFrozenRows(1);

      if (bdBitRows.length > 0) {
        bdBitSheet.getRange(2, 1, bdBitRows.length, bdBitHeaders.length).setValues(bdBitRows)
          .setFontFamily('Calibri').setFontSize(9);
        // Format currency columns
        bdBitSheet.getRange(2, 10, bdBitRows.length, 1).setNumberFormat('#,##0.00'); // Vencido PEN
        bdBitSheet.getRange(2, 11, bdBitRows.length, 1).setNumberFormat('#,##0.00'); // Delta PEN
        bdBitSheet.getRange(2, 13, bdBitRows.length, 1).setNumberFormat('#,##0.00'); // Vencido USD
        bdBitSheet.getRange(2, 14, bdBitRows.length, 1).setNumberFormat('#,##0.00'); // Delta USD
        // Format date columns
        bdBitSheet.getRange(2, 6, bdBitRows.length, 1).setNumberFormat('dd/mm/yyyy'); // Fecha Registro
        bdBitSheet.getRange(2, 8, bdBitRows.length, 1).setNumberFormat('dd/mm/yyyy'); // Fecha Compromiso
      }

      // Auto-resize columns
      for (var brc = 1; brc <= bdBitHeaders.length; brc++) {
        bdBitSheet.autoResizeColumn(brc);
      }

      SpreadsheetApp.flush();
      var base64 = _exportDashboardSS(ssId);
      var timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');

      return {
        ok: true,
        data: {
          base64: base64,
          fileName: 'Reporte_Bitacora_Cobranzas_' + timestamp + '.xlsx',
          filas: totalClientes
        }
      };

    } finally {
      try { DriveApp.getFileById(ssId).setTrashed(true); } catch (e) { /* ignore */ }
    }

  } catch (error) {
    Logger.log('[generarReporteBitacoraConDashboard] Error: ' + error.message);
    return { ok: false, error: error.message };
  }
}
