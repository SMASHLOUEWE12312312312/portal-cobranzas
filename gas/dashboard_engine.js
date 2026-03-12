/**
 * @fileoverview Dashboard Engine v2.0 - Motor de formateo profesional para reportes Excel
 *
 * Diseño nivel Power BI / Executive Report:
 * - Canvas blanco sin gridlines
 * - Columnas anchas con espacio generoso
 * - KPI cards grandes e impactantes
 * - Tablas limpias con bordes sutiles
 * - Secciones bien separadas con breathing room
 * - Tipografía profesional Calibri
 *
 * Cada método recibe un sheet + startRow y retorna el siguiente row disponible.
 */

const DashboardEngine = {
  COLORS: {
    // === Brand ===
    BRAND_RED: '#C62828',
    BRAND_DARK: '#1B2A4A',

    // === Canvas ===
    WHITE: '#FFFFFF',
    CANVAS: '#FFFFFF',

    // === Text ===
    DARK_TEXT: '#1A1A2E',
    MEDIUM_TEXT: '#4A5568',
    LIGHT_TEXT: '#A0AEC0',
    SUBTITLE_TEXT: '#718096',

    // === KPI Cards ===
    KPI_BG: '#F7FAFC',
    KPI_BORDER: '#E2E8F0',
    KPI_ACCENT: '#EBF4FF',

    // === Tables ===
    TABLE_HEADER_BG: '#1A202C',
    TABLE_HEADER_TEXT: '#FFFFFF',
    SECTION_BG: '#EDF2F7',
    SECTION_BORDER: '#1A202C',
    ALT_ROW: '#F7FAFC',
    ROW_BORDER: '#EDF2F7',

    // === Severity ===
    GREEN: '#276749',
    GREEN_BG: '#F0FFF4',
    GREEN_ACCENT: '#C6F6D5',
    YELLOW: '#975A16',
    YELLOW_BG: '#FFFFF0',
    YELLOW_ACCENT: '#FEFCBF',
    ORANGE: '#C05621',
    ORANGE_BG: '#FFFAF0',
    ORANGE_ACCENT: '#FEEBC8',
    RED: '#C53030',
    RED_BG: '#FFF5F5',
    RED_ACCENT: '#FED7D7',
    RED_DARK: '#742A2A',
    RED_DARK_BG: '#FFF5F5',

    // === Dividers ===
    DIVIDER: '#E2E8F0',
    DIVIDER_STRONG: '#CBD5E0'
  },

  NUM_COLS: 8,

  // ==================================================================
  // CANVAS SETUP
  // ==================================================================

  /**
   * Creates temp workbook for dashboard export
   */
  createTempWorkbook(name) {
    var ss = SpreadsheetApp.create('TMP_DASH_' + name + '_' + Date.now());
    var sheet = ss.getSheets()[0];
    sheet.setName('Reporte');
    return { ss: ss, sheet: sheet };
  },

  /**
   * Prepares the dashboard canvas: white background, no gridlines, column widths
   */
  prepareCanvas(sheet) {
    // Hide gridlines via Sheets API
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
    } catch (e) {
      // Fallback: paint white background on visible area
    }

    // White canvas background on entire visible area (26 cols = Z)
    sheet.getRange(1, 1, 300, 26).setBackground(this.COLORS.WHITE);

    // Professional column widths - wider, more breathing room
    var widths = [50, 280, 120, 150, 150, 130, 130, 130];
    for (var i = 0; i < widths.length; i++) {
      sheet.setColumnWidth(i + 1, widths[i]);
    }

    // Left margin column (col A) - narrow spacer
    sheet.setColumnWidth(1, 50);
  },

  // ==================================================================
  // HEADER SECTION
  // ==================================================================

  /**
   * Writes executive header block
   * @returns {number} Next available row
   */
  writeHeaderSection(sheet, title, subtitle, startRow) {
    var nc = this.NUM_COLS;
    var r = startRow || 1;

    // Spacer top
    sheet.setRowHeight(r, 20);
    r++;

    // Brand accent line (thin red line across top)
    sheet.getRange(r, 2, 1, nc - 1)
      .setBorder(true, false, false, false, false, false, this.COLORS.BRAND_RED, SpreadsheetApp.BorderStyle.SOLID_THICK);
    sheet.setRowHeight(r, 4);
    r++;

    // Spacer
    sheet.setRowHeight(r, 12);
    r++;

    // Company name
    sheet.getRange(r, 2, 1, nc - 1).merge()
      .setValue('TRANSPERUANA CORREDORES DE SEGUROS S.A.')
      .setFontFamily('Calibri').setFontSize(10).setFontWeight('bold')
      .setFontColor(this.COLORS.BRAND_RED)
      .setVerticalAlignment('middle').setHorizontalAlignment('left');
    sheet.setRowHeight(r, 24);
    r++;

    // Report title
    sheet.getRange(r, 2, 1, nc - 1).merge()
      .setValue(title)
      .setFontFamily('Calibri').setFontSize(20).setFontWeight('bold')
      .setFontColor(this.COLORS.BRAND_DARK)
      .setVerticalAlignment('middle');
    sheet.setRowHeight(r, 44);
    r++;

    // Subtitle + date
    var fecha = Utilities.formatDate(new Date(), 'America/Lima', 'dd/MM/yyyy HH:mm');
    var subText = subtitle ? subtitle + '   |   Generado: ' + fecha : 'Generado: ' + fecha;
    sheet.getRange(r, 2, 1, nc - 1).merge()
      .setValue(subText)
      .setFontFamily('Calibri').setFontSize(9).setFontColor(this.COLORS.SUBTITLE_TEXT);
    sheet.setRowHeight(r, 20);
    r++;

    // Divider line
    sheet.getRange(r, 2, 1, nc - 1)
      .setBorder(false, false, true, false, false, false, this.COLORS.DIVIDER_STRONG, SpreadsheetApp.BorderStyle.SOLID);
    sheet.setRowHeight(r, 6);
    r++;

    // Spacer
    sheet.setRowHeight(r, 20);
    return r + 1;
  },

  // ==================================================================
  // KPI CARDS
  // ==================================================================

  /**
   * Writes a row of KPI cards - large, impactful
   * kpis: [{ value, label, color?, sub? }]
   * @returns {number} Next available row
   */
  writeKPIRow(sheet, kpis, startRow) {
    var r = startRow;
    var count = kpis.length;

    // Available columns for KPIs (cols 2 through NUM_COLS)
    var availCols = this.NUM_COLS - 1; // exclude margin col A
    var colsPerKpi = Math.floor(availCols / count);

    // Spacer before
    sheet.setRowHeight(r, 8);
    r++;

    var valueRow = r;
    var labelRow = r + 1;
    sheet.setRowHeight(valueRow, 56);
    sheet.setRowHeight(labelRow, 24);

    for (var i = 0; i < count; i++) {
      var kpi = kpis[i];
      var startCol = 2 + (i * colsPerKpi);
      var endCol = (i === count - 1) ? this.NUM_COLS : startCol + colsPerKpi - 1;
      var span = endCol - startCol + 1;

      // Value cell
      sheet.getRange(valueRow, startCol, 1, span).merge()
        .setValue(kpi.value)
        .setFontFamily('Calibri').setFontSize(22).setFontWeight('bold')
        .setFontColor(kpi.color || this.COLORS.BRAND_DARK)
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setBackground(this.COLORS.KPI_BG);

      // Label cell
      sheet.getRange(labelRow, startCol, 1, span).merge()
        .setValue(kpi.label)
        .setFontFamily('Calibri').setFontSize(8).setFontWeight('bold')
        .setFontColor(this.COLORS.LIGHT_TEXT)
        .setHorizontalAlignment('center').setVerticalAlignment('top')
        .setBackground(this.COLORS.KPI_BG);

      // Subtle card border
      sheet.getRange(valueRow, startCol, 2, span)
        .setBorder(true, true, true, true, false, false, this.COLORS.KPI_BORDER, SpreadsheetApp.BorderStyle.SOLID);

      // Top accent line on card
      sheet.getRange(valueRow, startCol, 1, span)
        .setBorder(true, null, null, null, false, false, kpi.color || this.COLORS.BRAND_DARK, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    }

    // Spacer after
    r = labelRow + 1;
    sheet.setRowHeight(r, 20);
    return r + 1;
  },

  // ==================================================================
  // SECTION TITLE
  // ==================================================================

  /**
   * Writes a section title with clean divider
   * @returns {number} Next row
   */
  writeSectionTitle(sheet, title, startRow) {
    var r = startRow;

    // Spacer before section
    sheet.setRowHeight(r, 14);
    r++;

    // Title row
    sheet.getRange(r, 2, 1, this.NUM_COLS - 1).merge()
      .setValue(title)
      .setFontFamily('Calibri').setFontSize(11).setFontWeight('bold')
      .setFontColor(this.COLORS.BRAND_DARK)
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('left');
    sheet.setRowHeight(r, 30);

    // Bottom border accent
    sheet.getRange(r, 2, 1, this.NUM_COLS - 1)
      .setBorder(false, false, true, false, false, false, this.COLORS.BRAND_RED, SpreadsheetApp.BorderStyle.SOLID);
    r++;

    // Small spacer
    sheet.setRowHeight(r, 6);
    return r + 1;
  },

  // ==================================================================
  // DATA TABLE
  // ==================================================================

  /**
   * Writes a formatted data table
   * @param {Object} tableData - { headers: string[], rows: any[][] }
   * @param {Object} opts - { severityCol?, startCol?, currencyCols?, pctCols?, totalRow? }
   * @returns {number} Next available row
   */
  writeTable(sheet, tableData, startRow, opts) {
    opts = opts || {};
    var r = startRow;
    var headers = tableData.headers;
    var rows = tableData.rows;
    var numCols = headers.length;
    var startCol = opts.startCol || 2; // Start from col B (col A is margin)

    // Header row
    var headerRange = sheet.getRange(r, startCol, 1, numCols);
    headerRange.setValues([headers])
      .setFontFamily('Calibri').setFontSize(9).setFontWeight('bold')
      .setFontColor(this.COLORS.TABLE_HEADER_TEXT)
      .setBackground(this.COLORS.TABLE_HEADER_BG)
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(r, 32);

    if (rows.length === 0) {
      r++;
      sheet.setRowHeight(r, 16);
      return r + 1;
    }

    // Data rows
    var dataRange = sheet.getRange(r + 1, startCol, rows.length, numCols);
    dataRange.setValues(rows)
      .setFontFamily('Calibri').setFontSize(9)
      .setFontColor(this.COLORS.DARK_TEXT)
      .setVerticalAlignment('middle');

    // Alternating row colors + subtle horizontal borders only
    for (var i = 0; i < rows.length; i++) {
      var bg = i % 2 === 0 ? this.COLORS.WHITE : this.COLORS.ALT_ROW;
      var rowRange = sheet.getRange(r + 1 + i, startCol, 1, numCols);
      rowRange.setBackground(bg);
      sheet.setRowHeight(r + 1 + i, 24);

      // Subtle bottom border only (clean look)
      rowRange.setBorder(false, false, true, false, false, false, this.COLORS.ROW_BORDER, SpreadsheetApp.BorderStyle.SOLID);
    }

    // Left/right outer borders on whole table
    sheet.getRange(r, startCol, rows.length + 1, 1)
      .setBorder(null, true, null, null, false, false, this.COLORS.DIVIDER, SpreadsheetApp.BorderStyle.SOLID);
    sheet.getRange(r, startCol + numCols - 1, rows.length + 1, 1)
      .setBorder(null, null, null, true, false, false, this.COLORS.DIVIDER, SpreadsheetApp.BorderStyle.SOLID);

    // Bottom border on last row
    sheet.getRange(r + rows.length, startCol, 1, numCols)
      .setBorder(false, false, true, false, false, false, this.COLORS.DIVIDER_STRONG, SpreadsheetApp.BorderStyle.SOLID);

    // First column left-aligned, bold for labels
    sheet.getRange(r + 1, startCol, rows.length, 1)
      .setHorizontalAlignment('left').setFontWeight('bold');

    // Center numeric columns
    if (numCols > 2) {
      sheet.getRange(r + 1, startCol + 1, rows.length, numCols - 1)
        .setHorizontalAlignment('right');
    }

    // Severity column coloring
    if (opts.severityCol !== undefined) {
      for (var s = 0; s < rows.length; s++) {
        var val = String(rows[s][opts.severityCol] || '');
        var colors = this._severityColors(val);
        if (colors) {
          var cell = sheet.getRange(r + 1 + s, startCol + opts.severityCol);
          cell.setBackground(colors.bg).setFontColor(colors.text).setFontWeight('bold')
            .setHorizontalAlignment('center');
        }
      }
    }

    // Currency format
    if (opts.currencyCols) {
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

    // Bold total row
    if (opts.totalRow) {
      var lastDataRow = r + rows.length;
      sheet.getRange(lastDataRow, startCol, 1, numCols)
        .setFontWeight('bold')
        .setBackground(this.COLORS.SECTION_BG)
        .setBorder(true, null, true, null, false, false, this.COLORS.SECTION_BORDER, SpreadsheetApp.BorderStyle.SOLID);
    }

    // Spacer after table
    var nextRow = r + 1 + rows.length;
    sheet.setRowHeight(nextRow, 20);
    return nextRow + 1;
  },

  // ==================================================================
  // SPECIALIZED TABLES
  // ==================================================================

  /**
   * Writes aging table with severity indicators
   */
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

  /**
   * Writes alert indicators table
   */
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

  /**
   * Exports temp spreadsheet as base64 XLSX and trashes it
   */
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
