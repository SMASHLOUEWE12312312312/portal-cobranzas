/**
 * @fileoverview Servicio de exportación a PDF/XLSX
 * @version 2.0.0 - Ya optimizado
 * 
 * ESTADO v2.0:
 * ✅ Usa setValues() batch para escribir datos
 * ✅ Usa Utils.retryWithBackoff() para reintentos robustos
 * ✅ Sin loops problemáticos
 * ✅ Limpieza de archivos temporales
 * ✅ Un solo flush() por exportación
 * 
 * NO REQUIERE CAMBIOS ADICIONALES
 */

const ExportService = {
  /**
   * Exporta spreadsheet a PDF
   * @param {string} spreadsheetId - ID del spreadsheet
   * @return {GoogleAppsScript.Base.Blob} Blob del PDF
   */
  exportToPDF(spreadsheetId) {
    const context = 'ExportService.exportToPDF';
    Logger.debug(context, 'Starting PDF export', { id: spreadsheetId });
    
    const pdfConfig = getConfig('EXPORT.PDF');
    
    const params = {
      format: 'pdf',
      portrait: pdfConfig.PORTRAIT,
      size: pdfConfig.SIZE,
      scale: 2, // fit to width
      fitw: pdfConfig.FIT_WIDTH,
      horizontal_center: true,
      vertical_center: false,
      top_margin: pdfConfig.MARGINS.top,
      bottom_margin: pdfConfig.MARGINS.bottom,
      left_margin: pdfConfig.MARGINS.left,
      right_margin: pdfConfig.MARGINS.right,
      gridlines: false,
      sheetnames: false,
      printnotes: false,
      printtitle: false,
      fzr: true, // repetir filas congeladas
      pagenum: pdfConfig.SHOW_PAGE_NUMBERS ? 'CENTER' : 'UNDEFINED',
      attachment: false
    };
    
    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${queryString}`;
    
    try {
      const response = Utils.retryWithBackoff(() => {
        return UrlFetchApp.fetch(url, {
          headers: {
            Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
          },
          muteHttpExceptions: true
        });
      }, 3, 2000);
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`PDF export failed with code ${response.getResponseCode()}`);
      }
      
      Logger.debug(context, 'PDF export complete');
      return response.getBlob();
      
    } catch (error) {
      Logger.error(context, 'PDF export failed', error);
      throw error;
    }
  },
  
  /**
   * Exporta spreadsheet a XLSX
   * @param {string} spreadsheetId - ID del spreadsheet
   * @return {GoogleAppsScript.Base.Blob} Blob del XLSX
   */
  exportToXLSX(spreadsheetId) {
    const context = 'ExportService.exportToXLSX';
    Logger.debug(context, 'Starting XLSX export', { id: spreadsheetId });
    
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    
    try {
      const response = Utils.retryWithBackoff(() => {
        return UrlFetchApp.fetch(url, {
          headers: {
            Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
          },
          muteHttpExceptions: true
        });
      }, 3, 2000);
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`XLSX export failed with code ${response.getResponseCode()}`);
      }
      
      Logger.debug(context, 'XLSX export complete');
      return response.getBlob();
      
    } catch (error) {
      Logger.error(context, 'XLSX export failed', error);
      throw error;
    }
  },
  
  /**
   * Exporta vista filtrada actual del portal a XLSX
   * Mantiene los mismos encabezados que se ven en la UI
   * @param {Array<Array>} rows - Filas filtradas
   * @param {Array<string>} uiHeaders - Encabezados de la UI
   * @param {string} asegurado - Nombre del asegurado
   * @return {GoogleAppsScript.Base.Blob} Blob del XLSX
   */
  exportFilteredView(rows, uiHeaders, asegurado) {
    const context = 'ExportService.exportFilteredView';
    Logger.debug(context, 'Exporting filtered view', { rows: rows.length, asegurado });
    
    try {
      // Crear spreadsheet temporal
      const tempSS = SpreadsheetApp.create('TMP_Filtered_' + Date.now());
      const tempId = tempSS.getId();
      const sheet = tempSS.getSheets()[0];
      sheet.setName('Vista_Filtrada');
      
      // Escribir encabezados (igual que UI)
      sheet.getRange(1, 1, 1, uiHeaders.length).setValues([uiHeaders])
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      
      // Escribir datos
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, uiHeaders.length).setValues(rows);
      }
      
      sheet.setFrozenRows(1);
      
      // Ajustar anchos automáticamente
      for (let i = 1; i <= uiHeaders.length; i++) {
        sheet.autoResizeColumn(i);
      }
      
      SpreadsheetApp.flush();
      
      // Exportar a XLSX
      const blob = this.exportToXLSX(tempId);
      const tz = getConfig('FORMAT.TIMEZONE');
      const dateStr = Utilities.formatDate(new Date(), tz, 'yyyyMMdd_HHmm');
      blob.setName(`Vista_${Utils.safeName(asegurado)}_${dateStr}.xlsx`);
      
      // Limpiar
      DriveIO.deleteFile(tempId);
      
      Logger.info(context, 'Filtered view exported', { rows: rows.length });
      return blob;
      
    } catch (error) {
      Logger.error(context, 'Filtered export failed', error);
      throw error;
    }
  }
};
