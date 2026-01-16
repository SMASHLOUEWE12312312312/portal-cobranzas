/**
 * @fileoverview ReportScheduler - Fase 3 Automatización
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * 
 * FEATURE FLAG: FEATURES.ENABLE_REPORT_SCHEDULER
 */

const ReportScheduler = {
    REPORTS_FOLDER: 'Portal_Cobranzas_Reports',
    DAILY_SHEET: 'Reporte_Diario',
    WEEKLY_SHEET: 'Reporte_Semanal',

    generateDailySummary() {
        const context = 'ReportScheduler.generateDailySummary';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            Logger.info(context, 'Generando resumen diario...');
            const summaryData = this._collectDailyData();
            const reportId = this._saveDailyReport(summaryData);
            let emailsSent = 0;
            if (typeof EmailAutomation !== 'undefined') {
                const emailResult = EmailAutomation.sendDailySummaryEmail(summaryData);
                emailsSent = emailResult.sent || 0;
            }
            Logger.info(context, 'Resumen diario completado', { reportId, emailsSent });
            return { ok: true, reportId, emailsSent, summary: summaryData };
        } catch (error) {
            Logger.error(context, 'Error generando resumen diario', error);
            return { ok: false, error: error.message };
        }
    },

    generateWeeklyReport() {
        const context = 'ReportScheduler.generateWeeklyReport';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            Logger.info(context, 'Generando reporte semanal...');
            const weeklyData = this._collectWeeklyData();
            const reportId = this._saveWeeklyReport(weeklyData);
            let emailsSent = 0;
            if (typeof EmailAutomation !== 'undefined') {
                const emailResult = this._sendWeeklyReportEmail(weeklyData);
                emailsSent = emailResult.sent || 0;
            }
            Logger.info(context, 'Reporte semanal completado', { reportId, emailsSent });
            return { ok: true, reportId, emailsSent, data: weeklyData };
        } catch (error) {
            Logger.error(context, 'Error generando reporte semanal', error);
            return { ok: false, error: error.message };
        }
    },

    getReportHistory(options = {}) {
        try {
            const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
            const sheetName = options.tipo === 'weekly' ? this.WEEKLY_SHEET : this.DAILY_SHEET;
            const sheet = ss.getSheetByName(sheetName);
            if (!sheet) return [];

            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const reports = [];
            for (let i = Math.max(1, data.length - (options.limit || 30)); i < data.length; i++) {
                const row = data[i];
                const report = {};
                headers.forEach((h, idx) => { report[h] = row[idx]; });
                reports.push(report);
            }
            return reports.reverse();
        } catch (error) {
            Logger.error('ReportScheduler.getReportHistory', 'Error', error);
            return [];
        }
    },

    _collectDailyData() {
        const today = new Date();
        const data = { fecha: today.toISOString(), fechaFormateada: today.toLocaleDateString('es-PE'), gestionesHoy: 0, ptpsPendientes: 0, ptpsVencidos: 0, alertasCriticas: 0, alertasAltas: 0, dso: 0, porcentajeVencido: 0, topPendientes: [], ciclosActivos: 0 };

        if (typeof BitacoraService !== 'undefined') {
            try {
                const gestiones = BitacoraService.obtenerGestiones({ limit: 1000 });
                const todayStr = today.toISOString().split('T')[0];
                data.gestionesHoy = gestiones.filter(g => { const fechaReg = g.fechaRegistro ? new Date(g.fechaRegistro).toISOString().split('T')[0] : ''; return fechaReg === todayStr; }).length;
            } catch (e) { Logger.warn('ReportScheduler._collectDailyData', 'Error en BitacoraService', e); }
        }

        if (typeof PTPService !== 'undefined') {
            try {
                const ptps = PTPService.getPTPsPendientes();
                data.ptpsPendientes = ptps.length;
                data.ptpsVencidos = ptps.filter(p => p.vencido).length;
            } catch (e) { Logger.warn('ReportScheduler._collectDailyData', 'Error en PTPService', e); }
        }

        if (typeof AlertService !== 'undefined') {
            try {
                const alerts = AlertService.getActiveAlerts();
                if (alerts.ok) { data.alertasCriticas = alerts.summary.critical; data.alertasAltas = alerts.summary.high; }
            } catch (e) { Logger.warn('ReportScheduler._collectDailyData', 'Error en AlertService', e); }
        }

        if (typeof KPIService !== 'undefined') {
            try {
                const kpis = KPIService.getDashboardKPIs();
                if (kpis.ok && kpis.available) { data.dso = kpis.dso.value; data.porcentajeVencido = kpis.summary.porcentajeVencido; }
            } catch (e) { Logger.warn('ReportScheduler._collectDailyData', 'Error en KPIService', e); }
        }

        return data;
    },

    _collectWeeklyData() {
        const today = new Date();
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        const data = { fechaInicio: weekAgo.toISOString(), fechaFin: today.toISOString(), semana: this._getWeekNumber(today), totalGestiones: 0, ptpsCreados: 0, ptpsCumplidos: 0, ptpsIncumplidos: 0, tasaCumplimiento: 0, dsoPromedio: 0, tendenciaDSO: 'stable', alertasGeneradas: 0, ciclosCerrados: 0, montoRecuperado: 0, agingDistribution: [] };

        if (typeof PTPService !== 'undefined') {
            try {
                const metricas = PTPService.getMetricasCumplimiento({ forceRefresh: true });
                if (metricas.ok) { data.ptpsCumplidos = metricas.cumplidos; data.ptpsIncumplidos = metricas.incumplidos; data.tasaCumplimiento = metricas.tasaCumplimiento; data.montoRecuperado = metricas.montoRecuperado; }
            } catch (e) { Logger.warn('ReportScheduler._collectWeeklyData', 'Error en PTPService', e); }
        }

        if (typeof KPIService !== 'undefined') {
            try {
                const kpis = KPIService.getDashboardKPIs({ forceRefresh: true });
                if (kpis.ok && kpis.available) { data.dsoPromedio = kpis.dso.value; data.tendenciaDSO = kpis.dso.trend; data.agingDistribution = kpis.aging.buckets.map(b => ({ bucket: b.label, count: b.count, percentage: b.percentage })); }
            } catch (e) { Logger.warn('ReportScheduler._collectWeeklyData', 'Error en KPIService', e); }
        }

        return data;
    },

    _saveDailyReport(data) {
        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName(this.DAILY_SHEET);
        if (!sheet) {
            sheet = ss.insertSheet(this.DAILY_SHEET);
            sheet.getRange(1, 1, 1, 9).setValues([['Fecha', 'Gestiones', 'PTPs Pendientes', 'PTPs Vencidos', 'Alertas Críticas', 'Alertas Altas', 'DSO', '% Vencido', 'Ciclos Activos']]).setFontWeight('bold').setBackground('#e3f2fd');
            sheet.setFrozenRows(1);
        }
        sheet.appendRow([data.fechaFormateada, data.gestionesHoy, data.ptpsPendientes, data.ptpsVencidos, data.alertasCriticas, data.alertasAltas, data.dso, data.porcentajeVencido, data.ciclosActivos]);
        this._trimSheet(sheet, 90);
        return `DAILY_${data.fechaFormateada}`;
    },

    _saveWeeklyReport(data) {
        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName(this.WEEKLY_SHEET);
        if (!sheet) {
            sheet = ss.insertSheet(this.WEEKLY_SHEET);
            sheet.getRange(1, 1, 1, 9).setValues([['Semana', 'Fecha Inicio', 'Fecha Fin', 'PTPs Cumplidos', 'PTPs Incumplidos', 'Tasa Cumplimiento', 'DSO Promedio', 'Tendencia DSO', 'Monto Recuperado']]).setFontWeight('bold').setBackground('#e8f5e9');
            sheet.setFrozenRows(1);
        }
        sheet.appendRow([data.semana, new Date(data.fechaInicio).toLocaleDateString('es-PE'), new Date(data.fechaFin).toLocaleDateString('es-PE'), data.ptpsCumplidos, data.ptpsIncumplidos, data.tasaCumplimiento + '%', data.dsoPromedio, data.tendenciaDSO, data.montoRecuperado]);
        this._trimSheet(sheet, 52);
        return `WEEKLY_${data.semana}`;
    },

    _trimSheet(sheet, maxRows) {
        const currentRows = sheet.getLastRow();
        if (currentRows > maxRows + 1) sheet.deleteRows(2, currentRows - maxRows - 1);
    },

    _sendWeeklyReportEmail(data) {
        const admins = getConfig('AUTOMATION.ADMIN_EMAILS', []);
        if (admins.length === 0) return { ok: true, sent: 0 };

        const agingRows = (data.agingDistribution || []).map(a => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${a.bucket}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${a.count}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${a.percentage}%</td></tr>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:'Segoe UI',sans-serif;line-height:1.6;color:#333;max-width:700px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#2e7d32,#1b5e20);color:white;padding:20px;border-radius:8px 8px 0 0;"><h1 style="margin:0;font-size:20px;">📈 Reporte Semanal de Cobranzas</h1><p style="margin:5px 0 0;opacity:0.9;font-size:13px;">Semana ${data.semana}</p></div><div style="background:white;padding:25px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;"><h3 style="color:#333;margin-top:0;">Métricas de Cumplimiento</h3><div style="display:flex;gap:15px;margin-bottom:20px;flex-wrap:wrap;"><div style="background:#e8f5e9;padding:15px;border-radius:8px;flex:1;min-width:100px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#2e7d32;">${data.tasaCumplimiento}%</div><div style="font-size:12px;color:#666;">Tasa Cumplimiento</div></div><div style="background:#e3f2fd;padding:15px;border-radius:8px;flex:1;min-width:100px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#1565c0;">${data.dsoPromedio}</div><div style="font-size:12px;color:#666;">DSO Promedio</div></div><div style="background:#fff3e0;padding:15px;border-radius:8px;flex:1;min-width:100px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#e65100;">${data.ptpsCumplidos}</div><div style="font-size:12px;color:#666;">PTPs Cumplidos</div></div></div>${data.agingDistribution && data.agingDistribution.length > 0 ? `<h3 style="color:#333;">Distribución por Antigüedad</h3><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f5f5f5;"><th style="padding:10px;text-align:left;">Bucket</th><th style="padding:10px;text-align:center;">Cantidad</th><th style="padding:10px;text-align:center;">Porcentaje</th></tr></thead><tbody>${agingRows}</tbody></table>` : ''}<p style="color:#666;font-size:13px;margin-top:20px;padding-top:15px;border-top:1px solid #eee;">Período: ${new Date(data.fechaInicio).toLocaleDateString('es-PE')} - ${new Date(data.fechaFin).toLocaleDateString('es-PE')}</p></div></body></html>`;

        let sent = 0;
        for (const admin of admins) {
            try { MailApp.sendEmail({ to: admin, subject: `[REPORTE SEMANAL] Cobranzas - Semana ${data.semana}`, htmlBody: html, name: 'Portal de Cobranzas' }); sent++; }
            catch (e) { Logger.error('ReportScheduler._sendWeeklyReportEmail', `Error enviando a ${admin}`, e); }
        }
        return { ok: true, sent };
    },

    _isEnabled() { return getConfig('FEATURES.ENABLE_REPORT_SCHEDULER', true); },
    _getWeekNumber(date) { const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())); const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum); const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - yearStart) / 86400000) + 1) / 7); }
};

function generateDailySummary_API() { return ReportScheduler.generateDailySummary(); }
function generateWeeklyReport_API() { return ReportScheduler.generateWeeklyReport(); }
function getReportHistory_API(options) { return ReportScheduler.getReportHistory(options || {}); }
