/**
 * @fileoverview ExportService - Fase 4 Analytics & Reporting
 * @version 1.0.0
 * FEATURE FLAG: FEATURES.ENABLE_EXPORT_SERVICE
 */

const ExportService = {
    EXPORTS_FOLDER: 'Portal_Cobranzas_Exports',
    FORMAT: { XLSX: 'XLSX', CSV: 'CSV', PDF: 'PDF' },
    REPORT_TYPE: { CARTERA_COMPLETA: 'CARTERA_COMPLETA', AGING_DETALLE: 'AGING_DETALLE', PTP_PENDIENTES: 'PTP_PENDIENTES', GESTIONES: 'GESTIONES', PERFORMANCE: 'PERFORMANCE', RESUMEN_EJECUTIVO: 'RESUMEN_EJECUTIVO' },

    exportReport(options = {}) {
        const context = 'ExportService.exportReport';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const tipo = options.tipo || this.REPORT_TYPE.CARTERA_COMPLETA;
            const formato = options.formato || this.FORMAT.XLSX;
            Logger.info(context, 'Generando exportación...', { tipo, formato });

            const datos = this._getReportData(tipo, options.filtros);
            if (!datos.ok) return datos;

            let result;
            switch (formato) {
                case this.FORMAT.XLSX: result = this._generateXLSX(datos, tipo); break;
                case this.FORMAT.CSV: result = this._generateCSV(datos, tipo); break;
                case this.FORMAT.PDF: result = this._generatePDF(datos, tipo); break;
                default: return { ok: false, error: 'Formato no soportado' };
            }
            if (!result.ok) return result;

            const file = this._saveToFolder(result.blob, result.fileName);
            Logger.info(context, 'Exportación completada', { fileName: result.fileName, fileId: file.getId() });
            return { ok: true, fileId: file.getId(), fileName: result.fileName, downloadUrl: file.getDownloadUrl(), mimeType: result.mimeType, size: file.getSize() };
        } catch (error) {
            Logger.error(context, 'Error en exportación', error);
            return { ok: false, error: error.message };
        }
    },

    exportCarteraToExcel(filtros = {}) { return this.exportReport({ tipo: this.REPORT_TYPE.CARTERA_COMPLETA, formato: this.FORMAT.XLSX, filtros }); },
    exportAgingToExcel() { return this.exportReport({ tipo: this.REPORT_TYPE.AGING_DETALLE, formato: this.FORMAT.XLSX }); },
    exportPTPsToExcel() { return this.exportReport({ tipo: this.REPORT_TYPE.PTP_PENDIENTES, formato: this.FORMAT.XLSX }); },
    exportGestionesToCSV(filtros = {}) { return this.exportReport({ tipo: this.REPORT_TYPE.GESTIONES, formato: this.FORMAT.CSV, filtros }); },
    exportResumenEjecutivoPDF() { return this.exportReport({ tipo: this.REPORT_TYPE.RESUMEN_EJECUTIVO, formato: this.FORMAT.PDF }); },

    listExportedFiles(limit = 20) {
        try {
            const folder = this._getOrCreateFolder();
            const files = folder.getFiles();
            const result = [];
            while (files.hasNext() && result.length < limit) {
                const file = files.next();
                result.push({ id: file.getId(), name: file.getName(), size: file.getSize(), created: file.getDateCreated(), downloadUrl: file.getDownloadUrl(), mimeType: file.getMimeType() });
            }
            result.sort((a, b) => b.created - a.created);
            return result;
        } catch (error) {
            Logger.error('ExportService.listExportedFiles', 'Error', error);
            return [];
        }
    },

    cleanupOldExports(diasRetencion = 30) {
        try {
            const folder = this._getOrCreateFolder();
            const files = folder.getFiles();
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - diasRetencion);
            let deleted = 0;
            while (files.hasNext()) { const file = files.next(); if (file.getDateCreated() < cutoff) { file.setTrashed(true); deleted++; } }
            Logger.info('ExportService.cleanupOldExports', `Eliminados ${deleted} archivos`);
            return { ok: true, deleted };
        } catch (error) {
            Logger.error('ExportService.cleanupOldExports', 'Error', error);
            return { ok: false, error: error.message };
        }
    },

    _getReportData(tipo, filtros = {}) {
        switch (tipo) {
            case this.REPORT_TYPE.CARTERA_COMPLETA: return this._getCarteraData(filtros);
            case this.REPORT_TYPE.AGING_DETALLE: return this._getAgingData();
            case this.REPORT_TYPE.PTP_PENDIENTES: return this._getPTPData();
            case this.REPORT_TYPE.GESTIONES: return this._getGestionesData(filtros);
            case this.REPORT_TYPE.PERFORMANCE: return this._getPerformanceData();
            case this.REPORT_TYPE.RESUMEN_EJECUTIVO: return this._getResumenData();
            default: return { ok: false, error: 'Tipo no reconocido' };
        }
    },

    _getCarteraData(filtros) {
        try {
            const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
            const sheet = ss.getSheetByName('BD');
            if (!sheet) return { ok: false, error: 'Hoja BD no encontrada' };
            const data = sheet.getDataRange().getValues();
            const headers = data[0], rows = data.slice(1);
            let filtered = rows;
            if (filtros.cia) { const idx = headers.indexOf('CIA'); if (idx >= 0) filtered = filtered.filter(r => r[idx] === filtros.cia); }
            return { ok: true, headers, rows: filtered, totalRows: filtered.length, tipo: 'cartera' };
        } catch (e) { return { ok: false, error: e.message }; }
    },

    _getAgingData() {
        if (typeof KPIService === 'undefined') return { ok: false, error: 'KPIService no disponible' };
        const kpis = KPIService.getDashboardKPIs({ forceRefresh: true });
        if (!kpis.ok || !kpis.available) return { ok: false, error: 'No hay datos de KPIs' };
        const headers = ['Bucket', 'Cantidad', 'Porcentaje', 'Monto'];
        const rows = kpis.aging.buckets.map(b => [b.label, b.count, b.percentage + '%', b.amount]);
        return { ok: true, headers, rows, totalRows: rows.length, tipo: 'aging', summary: { dso: kpis.dso.value, totalMonto: kpis.summary.montoTotal, porcentajeVencido: kpis.summary.porcentajeVencido } };
    },

    _getPTPData() {
        if (typeof PTPService === 'undefined') return { ok: false, error: 'PTPService no disponible' };
        const ptps = PTPService.getPTPsPendientes();
        const headers = ['Asegurado', 'RUC', 'Monto', 'Moneda', 'Fecha Compromiso', 'Días Restantes', 'Estado', 'Responsable'];
        const rows = ptps.map(p => [p.asegurado, p.ruc, p.montoComprometido, p.moneda, p.fechaCompromiso ? new Date(p.fechaCompromiso).toLocaleDateString('es-PE') : '', p.diasRestantes, p.vencido ? 'VENCIDO' : 'PENDIENTE', p.responsable]);
        return { ok: true, headers, rows, totalRows: rows.length, tipo: 'ptp' };
    },

    _getGestionesData(filtros) {
        if (typeof BitacoraService === 'undefined') return { ok: false, error: 'BitacoraService no disponible' };
        try {
            let gestiones = BitacoraService.obtenerGestiones({ limit: 10000 });
            if (filtros.fechaInicio) { const inicio = new Date(filtros.fechaInicio); gestiones = gestiones.filter(g => new Date(g.fechaRegistro) >= inicio); }
            if (filtros.fechaFin) { const fin = new Date(filtros.fechaFin); gestiones = gestiones.filter(g => new Date(g.fechaRegistro) <= fin); }
            if (filtros.responsable) gestiones = gestiones.filter(g => g.responsable === filtros.responsable);
            const headers = ['ID Ciclo', 'Fecha', 'Asegurado', 'RUC', 'Tipo', 'Estado', 'Canal', 'Responsable', 'Observaciones'];
            const rows = gestiones.map(g => [g.idCiclo, g.fechaRegistro ? new Date(g.fechaRegistro).toLocaleDateString('es-PE') : '', g.asegurado, g.ruc, g.tipoGestion, g.estadoGestion, g.canalContacto, g.responsable, g.observaciones]);
            return { ok: true, headers, rows, totalRows: rows.length, tipo: 'gestiones' };
        } catch (e) { return { ok: false, error: e.message }; }
    },

    _getPerformanceData() {
        if (typeof AnalyticsService === 'undefined') return { ok: false, error: 'AnalyticsService no disponible' };
        const p = AnalyticsService.getPerformanceByResponsable({ forceRefresh: true });
        if (!p.ok) return p;
        const headers = ['Posición', 'Responsable', 'Gestiones', 'Gestiones/Día', 'PTPs', 'Cumplidos', 'Tasa Cumplimiento', 'Monto Recuperado', 'Efectividad'];
        const rows = p.ranking.map(r => [r.posicion, r.responsable, r.totalGestiones, r.gestionesPorDia, r.totalPTPs, r.ptpsCumplidos, r.tasaCumplimiento + '%', r.montoRecuperado, r.efectividad]);
        return { ok: true, headers, rows, totalRows: rows.length, tipo: 'performance', promedios: p.promedioGlobal };
    },

    _getResumenData() {
        const resumen = { ok: true, tipo: 'resumen', fecha: new Date().toLocaleDateString('es-PE'), secciones: [] };
        if (typeof KPIService !== 'undefined') {
            const kpis = KPIService.getDashboardKPIs();
            if (kpis.ok && kpis.available) resumen.secciones.push({ titulo: 'KPIs Principales', datos: [{ label: 'DSO', valor: kpis.dso.value + ' días' }, { label: 'Cartera Vencida', valor: kpis.summary.porcentajeVencido + '%' }, { label: 'Total Registros', valor: kpis.summary.totalRegistros }, { label: 'Monto Total', valor: this._formatCurrency(kpis.summary.montoTotal) }] });
        }
        if (typeof AlertService !== 'undefined') {
            const a = AlertService.getAlertSummary();
            if (a.ok) resumen.secciones.push({ titulo: 'Alertas', datos: [{ label: 'Críticas', valor: a.summary.critical }, { label: 'Altas', valor: a.summary.high }, { label: 'Total', valor: a.summary.total }] });
        }
        if (typeof PTPService !== 'undefined') {
            const m = PTPService.getMetricasCumplimiento();
            if (m.ok) resumen.secciones.push({ titulo: 'Compromisos de Pago', datos: [{ label: 'Tasa Cumplimiento', valor: m.tasaCumplimiento + '%' }, { label: 'Pendientes', valor: m.pendientes }, { label: 'Monto Recuperado', valor: this._formatCurrency(m.montoRecuperado) }] });
        }
        return resumen;
    },

    _generateXLSX(datos, tipo) {
        const timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
        const fileName = `${tipo}_${timestamp}.xlsx`;
        const tempSS = SpreadsheetApp.create(fileName);
        const sheet = tempSS.getActiveSheet();
        if (datos.headers) sheet.getRange(1, 1, 1, datos.headers.length).setValues([datos.headers]).setFontWeight('bold').setBackground('#1565c0').setFontColor('white');
        if (datos.rows && datos.rows.length > 0) sheet.getRange(2, 1, datos.rows.length, datos.rows[0].length).setValues(datos.rows);
        if (datos.headers) for (let i = 1; i <= datos.headers.length; i++) sheet.autoResizeColumn(i);
        if (datos.rows && datos.rows.length > 0) sheet.getRange(1, 1, datos.rows.length + 1, datos.headers.length).createFilter();
        const blob = tempSS.getBlob().setName(fileName);
        DriveApp.getFileById(tempSS.getId()).setTrashed(true);
        return { ok: true, blob, fileName, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    },

    _generateCSV(datos, tipo) {
        const timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
        const fileName = `${tipo}_${timestamp}.csv`;
        let csv = '';
        if (datos.headers) csv += datos.headers.join(',') + '\n';
        if (datos.rows) datos.rows.forEach(row => { const escaped = row.map(cell => { const str = String(cell || ''); return (str.includes(',') || str.includes('"') || str.includes('\n')) ? '"' + str.replace(/"/g, '""') + '"' : str; }); csv += escaped.join(',') + '\n'; });
        const blob = Utilities.newBlob(csv, 'text/csv', fileName);
        return { ok: true, blob, fileName, mimeType: 'text/csv' };
    },

    _generatePDF(datos, tipo) {
        const timestamp = Utilities.formatDate(new Date(), 'America/Lima', 'yyyyMMdd_HHmmss');
        const fileName = `${tipo}_${timestamp}.pdf`;
        const tempDoc = DocumentApp.create(fileName.replace('.pdf', ''));
        const body = tempDoc.getBody();
        body.appendParagraph('Portal de Cobranzas - ' + tipo.replace(/_/g, ' ')).setHeading(DocumentApp.ParagraphHeading.HEADING1);
        body.appendParagraph('Fecha: ' + new Date().toLocaleDateString('es-PE'));
        if (datos.secciones) datos.secciones.forEach(s => { body.appendParagraph(s.titulo).setHeading(DocumentApp.ParagraphHeading.HEADING2); s.datos.forEach(d => body.appendParagraph(d.label + ': ' + d.valor)); });
        else if (datos.headers && datos.rows) { body.appendParagraph('Total registros: ' + datos.rows.length); const table = body.appendTable(); const headerRow = table.appendTableRow(); datos.headers.forEach(h => headerRow.appendTableCell(h)); datos.rows.slice(0, 50).forEach(row => { const r = table.appendTableRow(); row.forEach(cell => r.appendTableCell(String(cell || ''))); }); if (datos.rows.length > 50) body.appendParagraph('Mostrando 50 de ' + datos.rows.length + ' registros'); }
        tempDoc.saveAndClose();
        const docFile = DriveApp.getFileById(tempDoc.getId());
        const blob = docFile.getAs('application/pdf').setName(fileName);
        docFile.setTrashed(true);
        return { ok: true, blob, fileName, mimeType: 'application/pdf' };
    },

    _isEnabled() { return getConfig('FEATURES.ENABLE_EXPORT_SERVICE', true); },
    _getOrCreateFolder() { const name = this.EXPORTS_FOLDER; const folders = DriveApp.getFoldersByName(name); if (folders.hasNext()) return folders.next(); return DriveApp.createFolder(name); },
    _saveToFolder(blob, fileName) { const folder = this._getOrCreateFolder(); return folder.createFile(blob); },
    _formatCurrency(amount) { return 'S/ ' + (amount || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
};

function exportReport_API(options) { return ExportService.exportReport(options || {}); }
function exportCarteraToExcel_API(filtros) { return ExportService.exportCarteraToExcel(filtros || {}); }
function exportAgingToExcel_API() { return ExportService.exportAgingToExcel(); }
function exportPTPsToExcel_API() { return ExportService.exportPTPsToExcel(); }
function exportGestionesToCSV_API(filtros) { return ExportService.exportGestionesToCSV(filtros || {}); }
function exportResumenPDF_API() { return ExportService.exportResumenEjecutivoPDF(); }
function listExportedFiles_API(limit) { return ExportService.listExportedFiles(limit || 20); }
function cleanupOldExports_API(dias) { return ExportService.cleanupOldExports(dias || 30); }
