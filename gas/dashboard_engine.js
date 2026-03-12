/**
 * @fileoverview Dashboard Engine - Motor de formateo profesional para reportes Excel
 * @version 1.0.0
 *
 * Genera hojas de dashboard con estilo profesional tipo Power BI
 * usando SpreadsheetApp para formateo completo (colores, bordes, merges).
 *
 * Cada método recibe un sheet + startRow y retorna el siguiente row disponible.
 */

const DashboardEngine = {
  COLORS: {
    HEADER_BG: '#1B2A4A',
    HEADER_TEXT: '#FFFFFF',
    SUBTITLE_TEXT: '#5D6D7E',
    KPI_BG: '#F0F3F8',
    KPI_BORDER: '#D5DBEE',
    TABLE_HEADER_BG: '#2C3E50',
    TABLE_HEADER_TEXT: '#FFFFFF',
    TABLE_TITLE_BG: '#EBF0F5',
    ALT_ROW: '#F8FAFC',
    WHITE: '#FFFFFF',
    BORDER: '#D5D8DC',
    BORDER_LIGHT: '#E8ECF0',
    BRAND_RED: '#D32F2F',
    GREEN: '#27AE60',
    GREEN_BG: '#E8F8F0',
    YELLOW: '#F39C12',
    YELLOW_BG: '#FEF9E7',
    ORANGE: '#E67E22',
    ORANGE_BG: '#FDF2E9',
    RED: '#E74C3C',
    RED_BG: '#FDEDEC',
    RED_DARK: '#922B21',
    RED_DARK_BG: '#F2D7D5',
    DARK_TEXT: '#1B2631',
    MEDIUM_TEXT: '#566573',
    LIGHT_TEXT: '#ABB2B9'
  },

  NUM_COLS: 10,

  /**
   * Creates temp workbook for dashboard export
   */
  createTempWorkbook(name) {
    const ss = SpreadsheetApp.create('TMP_DASH_' + name + '_' + Date.now());
    const sheet = ss.getSheets()[0];
    sheet.setName('Dashboard');
    return { ss, sheet };
  },

  /**
   * Writes company header block (3 rows)
   * @returns {number} Next available row
   */
  writeHeaderSection(sheet, title, subtitle, startRow) {
    const nc = this.NUM_COLS;
    const r = startRow || 1;

    // Row 1: Company name
    sheet.getRange(r, 1, 1, nc).merge()
      .setValue('TRANSPERUANA CORREDORES DE SEGUROS S.A.')
      .setFontFamily('Calibri').setFontSize(14).setFontWeight('bold')
      .setFontColor(this.COLORS.BRAND_RED)
      .setVerticalAlignment('middle').setHorizontalAlignment('left');
    sheet.setRowHeight(r, 32);

    // Row 2: Report title
    sheet.getRange(r + 1, 1, 1, nc).merge()
      .setValue(title)
      .setFontFamily('Calibri').setFontSize(18).setFontWeight('bold')
      .setFontColor(this.COLORS.HEADER_BG)
      .setVerticalAlignment('middle');
    sheet.setRowHeight(r + 1, 36);

    // Row 3: Subtitle + date
    const fecha = Utilities.formatDate(new Date(), 'America/Lima', 'dd/MM/yyyy HH:mm');
    const subText = subtitle ? subtitle + '  |  Generado: ' + fecha : 'Generado: ' + fecha;
    sheet.getRange(r + 2, 1, 1, nc).merge()
      .setValue(subText)
      .setFontFamily('Calibri').setFontSize(9).setFontColor(this.COLORS.SUBTITLE_TEXT);

    // Row 4: Divider line
    sheet.getRange(r + 3, 1, 1, nc)
      .setBorder(true, false, false, false, false, false, this.COLORS.BRAND_RED, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    sheet.setRowHeight(r + 3, 8);

    return r + 4;
  },

  /**
   * Writes a row of KPI cards
   * kpis: [{ value, label, color? }]
   * @returns {number} Next available row
   */
  writeKPIRow(sheet, kpis, startRow) {
    const r = startRow;
    const count = kpis.length;
    const colsPerKpi = Math.floor(this.NUM_COLS / count);

    // Spacer row
    sheet.setRowHeight(r, 10);

    const valueRow = r + 1;
    const labelRow = r + 2;
    sheet.setRowHeight(valueRow, 42);
    sheet.setRowHeight(labelRow, 22);

    for (let i = 0; i < count; i++) {
      const kpi = kpis[i];
      const startCol = i * colsPerKpi + 1;
      const endCol = (i === count - 1) ? this.NUM_COLS : startCol + colsPerKpi - 1;
      const span = endCol - startCol + 1;

      // Value cell
      const valRange = sheet.getRange(valueRow, startCol, 1, span).merge();
      valRange.setValue(kpi.value)
        .setFontFamily('Calibri').setFontSize(20).setFontWeight('bold')
        .setFontColor(kpi.color || this.COLORS.HEADER_BG)
        .setHorizontalAlignment('center').setVerticalAlignment('middle')
        .setBackground(this.COLORS.KPI_BG);

      // Label cell
      const lblRange = sheet.getRange(labelRow, startCol, 1, span).merge();
      lblRange.setValue(kpi.label)
        .setFontFamily('Calibri').setFontSize(8).setFontWeight('bold')
        .setFontColor(this.COLORS.MEDIUM_TEXT)
        .setHorizontalAlignment('center').setVerticalAlignment('top')
        .setBackground(this.COLORS.KPI_BG);

      // Border around KPI card
      sheet.getRange(valueRow, startCol, 2, span)
        .setBorder(true, true, true, true, false, false, this.COLORS.KPI_BORDER, SpreadsheetApp.BorderStyle.SOLID);
    }

    // Spacer after
    sheet.setRowHeight(labelRow + 1, 12);
    return labelRow + 2;
  },

  /**
   * Writes a section title
   * @returns {number} Next row
   */
  writeSectionTitle(sheet, title, startRow) {
    const r = startRow;
    sheet.getRange(r, 1, 1, this.NUM_COLS).merge()
      .setValue(title)
      .setFontFamily('Calibri').setFontSize(11).setFontWeight('bold')
      .setFontColor(this.COLORS.HEADER_BG)
      .setBackground(this.COLORS.TABLE_TITLE_BG)
      .setVerticalAlignment('middle');
    sheet.setRowHeight(r, 26);
    sheet.getRange(r, 1, 1, this.NUM_COLS)
      .setBorder(false, false, true, false, false, false, this.COLORS.HEADER_BG, SpreadsheetApp.BorderStyle.SOLID);
    return r + 1;
  },

  /**
   * Writes a formatted data table
   * @param {Object} tableData - { headers: string[], rows: any[][], colWidths?: number[] }
   * @param {Object} opts - { severityCol?, startCol? }
   * @returns {number} Next available row
   */
  writeTable(sheet, tableData, startRow, opts) {
    opts = opts || {};
    const r = startRow;
    const headers = tableData.headers;
    const rows = tableData.rows;
    const numCols = headers.length;
    const startCol = opts.startCol || 1;

    // Header row
    const headerRange = sheet.getRange(r, startCol, 1, numCols);
    headerRange.setValues([headers])
      .setFontFamily('Calibri').setFontSize(9).setFontWeight('bold')
      .setFontColor(this.COLORS.TABLE_HEADER_TEXT)
      .setBackground(this.COLORS.TABLE_HEADER_BG)
      .setHorizontalAlignment('center').setVerticalAlignment('middle')
      .setBorder(true, true, true, true, true, true, this.COLORS.TABLE_HEADER_BG, SpreadsheetApp.BorderStyle.SOLID);
    sheet.setRowHeight(r, 28);

    if (rows.length === 0) return r + 1;

    // Data rows
    const dataRange = sheet.getRange(r + 1, startCol, rows.length, numCols);
    dataRange.setValues(rows)
      .setFontFamily('Calibri').setFontSize(9)
      .setFontColor(this.COLORS.DARK_TEXT)
      .setVerticalAlignment('middle')
      .setBorder(true, true, true, true, true, true, this.COLORS.BORDER_LIGHT, SpreadsheetApp.BorderStyle.SOLID);

    // Alternating row colors
    for (let i = 0; i < rows.length; i++) {
      const bg = i % 2 === 0 ? this.COLORS.WHITE : this.COLORS.ALT_ROW;
      sheet.getRange(r + 1 + i, startCol, 1, numCols).setBackground(bg);
      sheet.setRowHeight(r + 1 + i, 22);
    }

    // Severity column coloring
    if (opts.severityCol !== undefined) {
      for (let i = 0; i < rows.length; i++) {
        const val = String(rows[i][opts.severityCol] || '');
        const colors = this._severityColors(val);
        if (colors) {
          const cell = sheet.getRange(r + 1 + i, startCol + opts.severityCol);
          cell.setBackground(colors.bg).setFontColor(colors.text).setFontWeight('bold')
            .setHorizontalAlignment('center');
        }
      }
    }

    // Number format for currency columns
    if (opts.currencyCols) {
      opts.currencyCols.forEach(function(colIdx) {
        sheet.getRange(r + 1, startCol + colIdx, rows.length, 1).setNumberFormat('#,##0.00');
      });
    }

    // Percentage columns
    if (opts.pctCols) {
      opts.pctCols.forEach(function(colIdx) {
        sheet.getRange(r + 1, startCol + colIdx, rows.length, 1)
          .setNumberFormat('0.0"%"').setHorizontalAlignment('center');
      });
    }

    // Bold last row if it's a total
    if (opts.totalRow) {
      const lastDataRow = r + rows.length;
      sheet.getRange(lastDataRow, startCol, 1, numCols)
        .setFontWeight('bold')
        .setBackground('#E8ECF0')
        .setBorder(true, false, true, false, false, false, this.COLORS.HEADER_BG, SpreadsheetApp.BorderStyle.SOLID);
    }

    return r + 1 + rows.length + 1; // +1 spacer
  },

  /**
   * Writes aging bar visualization with colored cells
   */
  writeAgingTable(sheet, buckets, startRow) {
    const r = startRow;
    const headers = ['Tramo', '# Cupones', 'Monto PEN', 'Monto USD', '% del Total', 'Criticidad'];
    const rows = [];
    let totalCupones = 0, totalPEN = 0, totalUSD = 0;

    buckets.forEach(function(b) {
      totalCupones += b.count;
      totalPEN += b.montoPEN;
      totalUSD += b.montoUSD;
    });

    buckets.forEach(function(b) {
      const pct = totalPEN + totalUSD > 0 ? ((b.montoPEN + b.montoUSD) / (totalPEN + totalUSD) * 100) : 0;
      rows.push([b.label, b.count, b.montoPEN, b.montoUSD, pct.toFixed(1) + '%', b.severity]);
    });

    rows.push(['TOTAL', totalCupones, totalPEN, totalUSD, '100.0%', '']);

    return this.writeTable(sheet, { headers: headers, rows: rows }, r, {
      severityCol: 5,
      currencyCols: [2, 3],
      totalRow: true
    });
  },

  /**
   * Writes alert indicators table
   */
  writeAlertTable(sheet, alerts, startRow) {
    const headers = ['Indicador', 'Valor', 'Estado'];
    const rows = alerts.map(function(a) { return [a.indicator, a.value, a.status]; });

    return this.writeTable(sheet, { headers: headers, rows: rows }, startRow, {
      severityCol: 2
    });
  },

  /**
   * Sets standard column widths for dashboard
   */
  setDashboardWidths(sheet) {
    var widths = [180, 100, 110, 110, 90, 90, 90, 100, 100, 100];
    for (var i = 0; i < widths.length; i++) {
      sheet.setColumnWidth(i + 1, widths[i]);
    }
  },

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

  /**
   * Adds a data sheet from BD (copies format from original BD sheet)
   */
  addDataSheet(ss, filteredRows, tabName) {
    var sheetName = getConfig('SHEETS.BASE', 'BD');
    var srcSS = SheetsIO._getSpreadsheet();
    var srcSheet = srcSS.getSheetByName(sheetName);
    if (!srcSheet) throw new Error('Hoja "' + sheetName + '" no encontrada');

    var copied = srcSheet.copyTo(ss);
    copied.setName(tabName);

    var startRow = getConfig('BD.START_ROW', 2);
    var lastRow = copied.getLastRow();
    var dataRowCount = lastRow - startRow + 1;

    if (dataRowCount > 0) {
      copied.deleteRows(startRow, dataRowCount);
    }

    if (filteredRows.length > 0) {
      var numCols = copied.getLastColumn();
      var normalizedRows = filteredRows.map(function(row) {
        var r = row.slice(0, numCols);
        while (r.length < numCols) r.push('');
        return r;
      });
      if (filteredRows.length > 1) {
        copied.insertRowsAfter(startRow, filteredRows.length - 1);
      }
      copied.getRange(startRow, 1, normalizedRows.length, numCols).setValues(normalizedRows);
    }

    return copied;
  },

  // ======== HELPERS ========

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
