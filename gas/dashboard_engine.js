/**
 * @fileoverview Dashboard Engine v3.0 - Motor profesional Power BI-level
 *
 * Rediseño completo:
 * - Grid fijo de 6 columnas (B-G) - TODAS las tablas mismo ancho
 * - Tablas cortas se extienden visualmente al ancho completo
 * - Iconos de severidad (●) con formato condicional
 * - Canvas blanco sin gridlines
 * - KPI cards impactantes
 * - Tipografía Calibri profesional
 */

const DashboardEngine = {
  COLORS: {
    BRAND_RED: '#C62828',
    BRAND_DARK: '#1B2A4A',
    WHITE: '#FFFFFF',
    CANVAS: '#FFFFFF',
    DARK_TEXT: '#1A1A2E',
    MEDIUM_TEXT: '#4A5568',
    LIGHT_TEXT: '#A0AEC0',
    SUBTITLE_TEXT: '#718096',
    KPI_BG: '#F7FAFC',
    KPI_BORDER: '#E2E8F0',
    TABLE_HEADER_BG: '#1A202C',
    TABLE_HEADER_TEXT: '#FFFFFF',
    SECTION_BG: '#EDF2F7',
    SECTION_BORDER: '#1A202C',
    ALT_ROW: '#F7FAFC',
    ROW_BORDER: '#EDF2F7',
    GREEN: '#276749',
    GREEN_BG: '#F0FFF4',
    YELLOW: '#975A16',
    YELLOW_BG: '#FFFFF0',
    ORANGE: '#C05621',
    ORANGE_BG: '#FFFAF0',
    RED: '#C53030',
    RED_BG: '#FFF5F5',
    RED_DARK: '#742A2A',
    RED_DARK_BG: '#FFF5F5',
    DIVIDER: '#E2E8F0',
    DIVIDER_STRONG: '#CBD5E0'
  },

  // Base 6-column grid: tables may extend beyond for extra columns
  TABLE_SPAN: 6,
  COL_WIDTHS: [280, 100, 115, 115, 95, 95, 95, 95],  // B-I (extra H, I for wider tables)

  // ==================================================================
  // CANVAS SETUP
  // ==================================================================

  createTempWorkbook(name) {
    var ss = SpreadsheetApp.create('TMP_DASH_' + name + '_' + Date.now());
    var sheet = ss.getSheets()[0];
    sheet.setName('Reporte');
    return { ss: ss, sheet: sheet };
  },

  prepareCanvas(sheet) {
    // Hide gridlines
    try {
      Sheets.Spreadsheets.batchUpdate({
        requests: [{
          updateSheetProperties: {
            properties: {
              sheetId: sheet.getSheetId(),
              gridProperties: { hideGridlines: true }
            },
            fields: 'gridProperties.hideGridlines'
          }
        }]
      }, sheet.getParent().getId());
    } catch (e) { /* Sheets API fallback */ }

    // White canvas
    sheet.getRange(1, 1, 500, 30).setBackground(this.COLORS.WHITE);

    // Column A = margin
    sheet.setColumnWidth(1, 30);

    // Fixed widths B through I (set ONCE, never changed)
    for (var i = 0; i < this.COL_WIDTHS.length; i++) {
      sheet.setColumnWidth(i + 2, this.COL_WIDTHS[i]);
    }

    // Hide columns J onwards
    try { sheet.hideColumns(2 + this.COL_WIDTHS.length, 20); } catch (e) { /* ignore */ }
  },

  // ==================================================================
  // HEADER
  // ==================================================================

  writeHeaderSection(sheet, title, subtitle, startRow) {
    var span = this.TABLE_SPAN;
    var r = startRow || 1;

    sheet.setRowHeight(r, 20);
    r++;

    // Brand accent line
    sheet.getRange(r, 2, 1, span)
      .setBorder(true, false, false, false, false, false, this.COLORS.BRAND_RED, SpreadsheetApp.BorderStyle.SOLID_THICK);
    sheet.setRowHeight(r, 4);
    r++;

    sheet.setRowHeight(r, 12);
    r++;

    // Company name
    sheet.getRange(r, 2, 1, span).merge()
      .setValue('TRANSPERUANA CORREDORES DE SEGUROS S.A.')
      .setFontFamily('Calibri').setFontSize(10).setFontWeight('bold')
      .setFontColor(this.COLORS.BRAND_RED)
      .setVerticalAlignment('middle').setHorizontalAlignment('left');
    sheet.setRowHeight(r, 24);
    r++;

    // Title
    sheet.getRange(r, 2, 1, span).merge()
      .setValue(title)
      .setFontFamily('Calibri').setFontSize(20).setFontWeight('bold')
      .setFontColor(this.COLORS.BRAND_DARK)
      .setVerticalAlignment('middle');
    sheet.setRowHeight(r, 44);
    r++;

    // Subtitle + date
    var fecha = Utilities.formatDate(new Date(), 'America/Lima', 'dd/MM/yyyy HH:mm');
    var subText = subtitle ? subtitle + '   |   Generado: ' + fecha : 'Generado: ' + fecha;
    sheet.getRange(r, 2, 1, span).merge()
      .setValue(subText)
      .setFontFamily('Calibri').setFontSize(9).setFontColor(this.COLORS.SUBTITLE_TEXT);
    sheet.setRowHeight(r, 20);
    r++;

    // Divider
    sheet.getRange(r, 2, 1, span)
      .setBorder(false, false, true, false, false, false, this.COLORS.DIVIDER_STRONG, SpreadsheetApp.BorderStyle.SOLID);
    sheet.setRowHeight(r, 6);
    r++;

    sheet.setRowHeight(r, 20);
    return r + 1;
  },

  // ==================================================================
  // KPI CARDS
  // ==================================================================

  writeKPIRow(sheet, kpis, startRow) {
    var r = startRow;
    var count = kpis.length;
    var availCols = this.TABLE_SPAN;
    var colsPerKpi = Math.floor(availCols / count);

    sheet.setRowHeight(r, 8);
    r++;

    var valueRow = r;
    var labelRow = r + 1;
    sheet.setRowHeight(valueRow, 56);
    sheet.setRowHeight(labelRow, 24);

    for (var i = 0; i < count; i++) {
      var kpi = kpis[i];
      var startCol = 2 + (i * colsPerKpi);
      var endCol = (i === count - 1) ? (2 + availCols - 1) : startCol + colsPerKpi - 1;
      var span = endCol - startCol + 1;

      sheet.getRange(valueRow, startCol, 1, span).merge()
        .setValue(kpi.value)
        .setFontFamily('Calibri').setFontSize(22).setFontWeight('bold')
        .setFontColor(kpi.color || this.COLORS.BRAND_DARK)
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setBackground(this.COLORS.KPI_BG);

      sheet.getRange(labelRow, startCol, 1, span).merge()
        .setValue(kpi.label)
        .setFontFamily('Calibri').setFontSize(8).setFontWeight('bold')
        .setFontColor(this.COLORS.LIGHT_TEXT)
        .setHorizontalAlignment('center').setVerticalAlignment('top')
        .setBackground(this.COLORS.KPI_BG);

      sheet.getRange(valueRow, startCol, 2, span)
        .setBorder(true, true, true, true, false, false, this.COLORS.KPI_BORDER, SpreadsheetApp.BorderStyle.SOLID);

      sheet.getRange(valueRow, startCol, 1, span)
        .setBorder(true, null, null, null, false, false, kpi.color || this.COLORS.BRAND_DARK, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }

    r = labelRow + 1;
    sheet.setRowHeight(r, 20);
    return r + 1;
  },

  // ==================================================================
  // SECTION TITLE
  // ==================================================================

  writeSectionTitle(sheet, title, startRow) {
    var r = startRow;

    sheet.setRowHeight(r, 14);
    r++;

    sheet.getRange(r, 2, 1, this.TABLE_SPAN).merge()
      .setValue(title)
      .setFontFamily('Calibri').setFontSize(11).setFontWeight('bold')
      .setFontColor(this.COLORS.BRAND_DARK)
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('left');
    sheet.setRowHeight(r, 30);

    sheet.getRange(r, 2, 1, this.TABLE_SPAN)
      .setBorder(false, false, true, false, false, false, this.COLORS.BRAND_RED, SpreadsheetApp.BorderStyle.SOLID);
    r++;

    sheet.setRowHeight(r, 6);
    return r + 1;
  },

  // ==================================================================
  // DATA TABLE (uniform width, severity icons)
  // ==================================================================

  writeTable(sheet, tableData, startRow, opts) {
    opts = opts || {};
    var r = startRow;
    var headers = tableData.headers;
    var rows = tableData.rows;
    var numCols = headers.length;
    var startCol = 2; // Always col B
    var fullSpan = Math.max(numCols, this.TABLE_SPAN);

    // --- Header row (full span) ---
    var headerRange = sheet.getRange(r, startCol, 1, numCols);
    headerRange.setValues([headers])
      .setFontFamily('Calibri').setFontSize(9).setFontWeight('bold')
      .setFontColor(this.COLORS.TABLE_HEADER_TEXT)
      .setBackground(this.COLORS.TABLE_HEADER_BG)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(r, 32);

    // Extend header background to full span
    if (numCols < fullSpan) {
      sheet.getRange(r, startCol + numCols, 1, fullSpan - numCols)
        .setBackground(this.COLORS.TABLE_HEADER_BG);
    }

    if (rows.length === 0) {
      r++;
      sheet.setRowHeight(r, 16);
      return r + 1;
    }

    // --- Data rows ---
    var dataRange = sheet.getRange(r + 1, startCol, rows.length, numCols);
    dataRange.setValues(rows)
      .setFontFamily('Calibri').setFontSize(9)
      .setFontColor(this.COLORS.DARK_TEXT)
      .setVerticalAlignment('middle');

    // Alternating rows + borders (full span)
    for (var i = 0; i < rows.length; i++) {
      var bg = i % 2 === 0 ? this.COLORS.WHITE : this.COLORS.ALT_ROW;
      // Full span background (data cols + extension)
      sheet.getRange(r + 1 + i, startCol, 1, fullSpan)
        .setBackground(bg)
        .setBorder(false, false, true, false, false, false, this.COLORS.ROW_BORDER, SpreadsheetApp.BorderStyle.SOLID);
      sheet.setRowHeight(r + 1 + i, 24);
    }

    // Outer borders on full span
    sheet.getRange(r, startCol, rows.length + 1, 1)
      .setBorder(null, true, null, null, false, false, this.COLORS.DIVIDER, SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(r, startCol + fullSpan - 1, rows.length + 1, 1)
      .setBorder(null, null, null, true, false, false, this.COLORS.DIVIDER, SpreadsheetApp.BorderStyle.SOLID);

    // Bottom border full span
    sheet.getRange(r + rows.length, startCol, 1, fullSpan)
      .setBorder(false, false, true, false, false, false, this.COLORS.DIVIDER_STRONG, SpreadsheetApp.BorderStyle.SOLID);

    // First column left-aligned, bold
    sheet.getRange(r + 1, startCol, rows.length, 1)
      .setHorizontalAlignment('left').setFontWeight('bold');

    // Numeric columns right-aligned
    if (numCols > 2) {
      sheet.getRange(r + 1, startCol + 1, rows.length, numCols - 1)
        .setHorizontalAlignment('right');
    }

    // --- Severity column with ● icons ---
    if (opts.severityCol !== undefined) {
      for (var s = 0; s < rows.length; s++) {
        var val = String(rows[s][opts.severityCol] || '');
        if (!val) continue;
        var colors = this._severityColors(val);
        if (colors) {
          var cell = sheet.getRange(r + 1 + s, startCol + opts.severityCol);
          cell.setValue('● ' + val)
            .setBackground(colors.bg).setFontColor(colors.text).setFontWeight('bold')
            .setHorizontalAlignment('center');
        }
      }
    }

    // Currency format
    if (opts.currencyCols) {
      var self = this;
      opts.currencyCols.forEach(function(colIdx) {
        sheet.getRange(r + 1, startCol + colIdx, rows.length, 1)
          .setNumberFormat('#,##0.00').setHorizontalAlignment('right');
      });
    }

    // Percentage columns
    if (opts.pctCols) {
      opts.pctCols.forEach(function(colIdx) {
        sheet.getRange(r + 1, startCol + colIdx, rows.length, 1)
          .setNumberFormat('0.0"%"').setHorizontalAlignment('center');
      });
    }

    // Bold total row (full span)
    if (opts.totalRow) {
      var lastDataRow = r + rows.length;
      sheet.getRange(lastDataRow, startCol, 1, fullSpan)
        .setFontWeight('bold')
        .setBackground(this.COLORS.SECTION_BG)
        .setBorder(true, null, true, null, false, false, this.COLORS.SECTION_BORDER, SpreadsheetApp.BorderStyle.SOLID);
    }

    var nextRow = r + 1 + rows.length;
    sheet.setRowHeight(nextRow, 20);
    return nextRow + 1;
  },

  // ==================================================================
  // SPECIALIZED TABLES
  // ==================================================================

  writeAgingTable(sheet, buckets, startRow) {
    var headers = ['Tramo', '# Cupones', 'Monto PEN', 'Monto USD', '% del Total', 'Criticidad'];
    var rows = [];
    var totalCupones = 0, totalPEN = 0, totalUSD = 0;

    buckets.forEach(function(b) {
      totalCupones += b.count;
      totalPEN += b.montoPEN;
      totalUSD += b.montoUSD;
    });

    buckets.forEach(function(b) {
      var pct = totalPEN + totalUSD > 0 ? ((b.montoPEN + b.montoUSD) / (totalPEN + totalUSD) * 100) : 0;
      rows.push([b.label, b.count, b.montoPEN, b.montoUSD, pct.toFixed(1) + '%', b.severity]);
    });

    rows.push(['TOTAL', totalCupones, totalPEN, totalUSD, '100.0%', '']);

    return this.writeTable(sheet, { headers: headers, rows: rows }, startRow, {
      severityCol: 5,
      currencyCols: [2, 3],
      totalRow: true
    });
  },

  writeAlertTable(sheet, alerts, startRow) {
    var headers = ['Indicador', 'Valor', 'Estado'];
    var rows = alerts.map(function(a) { return [a.indicator, a.value, a.status]; });

    return this.writeTable(sheet, { headers: headers, rows: rows }, startRow, {
      severityCol: 2
    });
  },

  // ==================================================================
  // EXPORT
  // ==================================================================

  exportAndCleanup(ss) {
    SpreadsheetApp.flush();
    var ssId = ss.getId();

    try {
      var exportUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?format=xlsx';
      var response = UrlFetchApp.fetch(exportUrl, {
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
        muteHttpExceptions: true
      });

      if (response.getResponseCode() !== 200) {
        throw new Error('Export HTTP ' + response.getResponseCode());
      }

      var base64 = Utilities.base64Encode(response.getContent());
      return { base64: base64, size: response.getContent().length };

    } finally {
      try { DriveApp.getFileById(ssId).setTrashed(true); } catch (e) { /* ignore */ }
    }
  },

  // ==================================================================
  // HELPERS
  // ==================================================================

  formatCurrency(value, currency) {
    var prefix = currency === 'USD' ? 'US$ ' : 'S/. ';
    var num = typeof value === 'number' ? value : parseFloat(value) || 0;
    return prefix + this._formatNumber(Math.abs(num));
  },

  _formatNumber(num) {
    var parts = num.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  },

  _severityColors(severity) {
    var s = String(severity).toUpperCase();
    var C = this.COLORS;
    switch (s) {
      case 'OK': case 'NORMAL': case 'VERDE': case 'BAJO':
        return { bg: C.GREEN_BG, text: C.GREEN };
      case 'WARN': case 'AMARILLO': case 'ALTO':
        return { bg: C.YELLOW_BG, text: C.YELLOW };
      case 'HIGH': case 'NARANJA': case 'CRITICO': case 'CRÍTICO':
        return { bg: C.ORANGE_BG, text: C.ORANGE };
      case 'CRITICAL': case 'ROJO': case 'SEVERO':
        return { bg: C.RED_BG, text: C.RED };
      case 'INCOBRABLE':
        return { bg: C.RED_DARK_BG, text: C.RED_DARK };
      default:
        return null;
    }
  }
};
