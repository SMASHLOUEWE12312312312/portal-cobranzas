/**
 * @fileoverview Generación de previews para correos
 */

const PreviewService = {

  /**
   * Genera preview HTML para un asegurado
   * @param {string} aseguradoId - ID del asegurado
   * @param {Object} opts - Opciones { includeObs, obsForRAM, fechaCorte }
   * @return {Object} { htmlPreview, meta }
   */
  generatePreviewForAsegurado(aseguradoId, opts = {}) {
    const context = 'PreviewService.generatePreviewForAsegurado';
    Logger.debug(context, 'Generating preview', { aseguradoId, opts });

    try {
      // Reusar previewAsegurado existente pero sin colores
      const previewData = this._getPreviewData(aseguradoId, opts);

      if (!previewData || !previewData.rows) {
        return { htmlPreview: '<p>No hay datos para este asegurado</p>', meta: {} };
      }

      const html = this._buildPreviewHTML(previewData, aseguradoId, opts);

      const meta = {
        aseguradoId,
        totalRows: previewData.total,
        fechaCorte: opts.fechaCorte || Utils.formatDate(new Date()),
        monedas: this._getMonedas(previewData.rows)
      };

      Logger.info(context, 'Preview generated', { aseguradoId, rows: previewData.total });

      return { htmlPreview: html, meta };

    } catch (error) {
      Logger.error(context, 'Preview generation failed', error);
      throw error;
    }
  },

  _getPreviewData(aseguradoId, opts) {
    const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
    const aseguradoCol = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.ASEGURADO'));

    if (aseguradoCol === -1) {
      throw new Error('Columna ASEGURADO no encontrada');
    }

    const rows = baseData.rows.filter(row =>
      Utils.cleanText(row[aseguradoCol]) === Utils.cleanText(aseguradoId)
    );

    const columnMap = {};
    ['CIA', 'POLIZA', 'RAM', 'NUM_CUOTA', 'CUPON', 'MON', 'IMPORTE',
      'VIG_DEL', 'VIG_AL', 'FEC_VENCIMIENTO_COB', 'MOTIVO'].forEach(col => {
        const idx = Utils.findColumnIndex(baseData.headers, getConfig(`BD.COLUMNS.${col}`, col));
        if (idx >= 0) columnMap[col] = idx;
      });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const output = rows.map(row => {
      const fecVenc = row[columnMap.FEC_VENCIMIENTO_COB];
      let dias = '';
      if (fecVenc instanceof Date && !isNaN(fecVenc)) {
        dias = Utils.daysBetween(today, fecVenc);
      }

      let obs = '';
      if (opts.includeObs && columnMap.MOTIVO !== undefined) {
        const ram = Utils.cleanText(row[columnMap.RAM]);
        if (opts.obsForRAM === '__ALL__' || (opts.obsForRAM && opts.obsForRAM.has && opts.obsForRAM.has(ram))) {
          obs = row[columnMap.MOTIVO] || '';
        }
      }

      return {
        cia: row[columnMap.CIA],
        poliza: row[columnMap.POLIZA],
        ram: row[columnMap.RAM],
        numCuota: row[columnMap.NUM_CUOTA],
        cupon: row[columnMap.CUPON],
        mon: Utils.currencyDisplay(row[columnMap.MON]),
        importe: row[columnMap.IMPORTE],
        vigDel: Utils.formatDate(row[columnMap.VIG_DEL]),
        vigAl: Utils.formatDate(row[columnMap.VIG_AL]),
        fecVenc: Utils.formatDate(fecVenc),
        dias,
        obs
      };
    });

    return { rows: output, total: output.length };
  },

  _buildPreviewHTML(data, aseguradoId, opts) {
    const rows = data.rows.map(r => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.cia || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.poliza || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.ram || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.numCuota || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.cupon || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.mon || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${r.importe || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.fecVenc || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.dias || ''}</td>
        ${opts.includeObs ? `<td style="padding: 8px; border: 1px solid #ddd;">${r.obs || ''}</td>` : ''}
      </tr>
    `).join('');

    const headers = ['CIA', 'PÓLIZA', 'RAM', 'N°', 'CUPÓN', 'MON', 'IMPORTE', 'FEC. VENC', 'DÍAS'];
    if (opts.includeObs) headers.push('OBS');

    const headerRow = headers.map(h => `<th style="padding: 10px; background: #f3f3f3; border: 1px solid #ddd; text-align: left; font-weight: 600;">${h}</th>`).join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 100%; overflow-x: auto;">
        <h3 style="color: #333; margin-bottom: 16px;">Estado de Cuenta: ${aseguradoId}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr>${headerRow}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top: 16px; font-size: 12px; color: #666;">Total de registros: ${data.total}</p>
      </div>
    `;
  },

  _getMonedas(rows) {
    const monedas = new Set();
    rows.forEach(r => {
      if (r.mon) monedas.add(r.mon);
    });
    return Array.from(monedas);
  },

  /**
   * Genera PDF preview y retorna dataURL
   * @param {string} aseguradoId - ID del asegurado
   * @param {Object} opts - Opciones
   * @return {string} Data URL del PDF
   */
  getPreviewPdfDataUrl(aseguradoId, opts = {}) {
    const context = 'PreviewService.getPreviewPdfDataUrl';
    Logger.debug(context, 'Generating PDF preview', { aseguradoId });

    try {
      // Generar EECC temporal sin guardarlo
      const result = EECCCore.generateHeadless(aseguradoId, {
        exportPdf: true,
        exportXlsx: false,
        includeObs: opts.includeObs || false,
        obsForRAM: opts.obsForRAM || '__ALL__'
      });

      if (!result.ok || !result.pdfUrl) {
        throw new Error('No se pudo generar el PDF');
      }

      // Obtener el archivo
      const fileId = result.pdfUrl.match(/[-\w]{25,}/);
      if (!fileId) {
        throw new Error('No se pudo extraer ID del PDF');
      }

      const file = DriveApp.getFileById(fileId[0]);
      const blob = file.getBlob();
      const bytes = blob.getBytes();
      const base64 = Utilities.base64Encode(bytes);

      // Limpiar archivo temporal
      file.setTrashed(true);

      Logger.info(context, 'PDF preview generated', { aseguradoId, sizeKB: Math.round(bytes.length / 1024) });

      return `data:application/pdf;base64,${base64}`;

    } catch (error) {
      Logger.error(context, 'PDF preview failed', error);
      throw error;
    }
  }
};
