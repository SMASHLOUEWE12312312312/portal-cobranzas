/**
 * @fileoverview EmailAutomation - Fase 3 Automatización
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * 
 * FEATURE FLAG: FEATURES.ENABLE_EMAIL_AUTOMATION
 */

const EmailAutomation = {
    FROM_NAME: 'Portal de Cobranzas',
    TEMPLATES: { PTP_REMINDER: 'ptp_reminder', AGING_ALERT: 'aging_alert', ESCALATION: 'escalation', DAILY_SUMMARY: 'daily_summary', WEEKLY_REPORT: 'weekly_report' },

    sendPTPReminders() {
        const context = 'EmailAutomation.sendPTPReminders';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            Logger.info(context, 'Iniciando envío de recordatorios PTP...');
            const results = { ok: true, sent: 0, errors: [] };

            if (typeof PTPService === 'undefined') return { ok: false, error: 'PTPService no disponible' };

            const ptpsPendientes = PTPService.getPTPsPendientes();
            const ptpsProximos = ptpsPendientes.filter(p => p.diasRestantes >= 0 && p.diasRestantes <= 3);

            if (ptpsProximos.length === 0) {
                Logger.info(context, 'No hay PTPs próximos a vencer');
                return { ok: true, sent: 0, message: 'No hay recordatorios pendientes' };
            }

            const porResponsable = this._groupBy(ptpsProximos, 'responsable');

            for (const [responsable, ptps] of Object.entries(porResponsable)) {
                if (!responsable || !this._isValidEmail(responsable)) continue;
                try {
                    const html = this._buildPTPReminderEmail(ptps);
                    MailApp.sendEmail({ to: responsable, subject: `[RECORDATORIO] ${ptps.length} compromiso(s) de pago próximos`, htmlBody: html, name: this.FROM_NAME, replyTo: this._getReplyTo() });
                    results.sent++;
                    Logger.info(context, `Email enviado a ${responsable}`, { ptps: ptps.length });
                } catch (emailError) {
                    results.errors.push({ responsable, error: emailError.message });
                    Logger.error(context, `Error enviando a ${responsable}`, emailError);
                }
            }

            results.ok = results.errors.length === 0;
            return results;
        } catch (error) {
            Logger.error(context, 'Error en envío de recordatorios', error);
            return { ok: false, error: error.message };
        }
    },

    sendAgingAlerts() {
        const context = 'EmailAutomation.sendAgingAlerts';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const admins = this._getAdminEmails();
            if (admins.length === 0) return { ok: true, sent: 0, message: 'No hay administradores configurados' };

            if (typeof AlertService === 'undefined') return { ok: false, error: 'AlertService no disponible' };

            const alerts = AlertService.getActiveAlerts({ forceRefresh: true });
            if (!alerts.ok) return { ok: false, error: 'Error obteniendo alertas' };

            const criticalAlerts = alerts.alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
            if (criticalAlerts.length === 0) return { ok: true, sent: 0, message: 'No hay alertas críticas' };

            const html = this._buildAgingAlertEmail(criticalAlerts, alerts.summary);
            let sent = 0;
            for (const admin of admins) {
                try { MailApp.sendEmail({ to: admin, subject: `[ALERTA] ${criticalAlerts.length} alerta(s) crítica(s)`, htmlBody: html, name: this.FROM_NAME }); sent++; }
                catch (e) { Logger.error(context, `Error enviando a ${admin}`, e); }
            }
            return { ok: true, sent };
        } catch (error) {
            Logger.error(context, 'Error en alertas de aging', error);
            return { ok: false, error: error.message };
        }
    },

    sendEscalationNotification(escalations) {
        const context = 'EmailAutomation.sendEscalationNotification';
        if (!this._isEnabled() || !escalations || escalations.length === 0) return { ok: true, sent: 0 };

        try {
            const admins = this._getAdminEmails();
            if (admins.length === 0) return { ok: true, sent: 0, message: 'No hay administradores' };

            const html = this._buildEscalationEmail(escalations);
            let sent = 0;
            for (const admin of admins) {
                try { MailApp.sendEmail({ to: admin, subject: `[ESCALAMIENTO] ${escalations.length} caso(s) urgentes`, htmlBody: html, name: this.FROM_NAME }); sent++; }
                catch (e) { Logger.error(context, `Error enviando a ${admin}`, e); }
            }
            return { ok: true, sent };
        } catch (error) {
            Logger.error(context, 'Error en escalamiento', error);
            return { ok: false, error: error.message };
        }
    },

    sendDailySummaryEmail(summaryData) {
        const context = 'EmailAutomation.sendDailySummaryEmail';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const admins = this._getAdminEmails();
            if (admins.length === 0) return { ok: true, sent: 0, message: 'No hay administradores' };

            const html = this._buildDailySummaryEmail(summaryData);
            const fecha = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            let sent = 0;
            for (const admin of admins) {
                try { MailApp.sendEmail({ to: admin, subject: `[RESUMEN DIARIO] Cobranzas - ${fecha}`, htmlBody: html, name: this.FROM_NAME }); sent++; }
                catch (e) { Logger.error(context, `Error enviando a ${admin}`, e); }
            }
            return { ok: true, sent };
        } catch (error) {
            Logger.error(context, 'Error en resumen diario', error);
            return { ok: false, error: error.message };
        }
    },

    _buildPTPReminderEmail(ptps) {
        const rows = ptps.map(p => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${p.asegurado}</td><td style="padding:8px;border-bottom:1px solid #eee;">${p.moneda} ${this._formatNumber(p.montoComprometido)}</td><td style="padding:8px;border-bottom:1px solid #eee;">${new Date(p.fechaCompromiso).toLocaleDateString('es-PE')}</td><td style="padding:8px;border-bottom:1px solid #eee;color:${p.diasRestantes === 0 ? '#d32f2f' : '#f57c00'};">${p.diasRestantes === 0 ? 'HOY' : `En ${p.diasRestantes} día(s)`}</td></tr>`).join('');
        return this._wrapInTemplate(`<h2 style="color:#1565c0;margin-bottom:20px;">📋 Recordatorio de Compromisos de Pago</h2><p>Los siguientes compromisos están próximos a vencer:</p><table style="width:100%;border-collapse:collapse;margin:20px 0;"><thead><tr style="background:#e3f2fd;"><th style="padding:10px;text-align:left;">Asegurado</th><th style="padding:10px;text-align:left;">Monto</th><th style="padding:10px;text-align:left;">Fecha</th><th style="padding:10px;text-align:left;">Vence</th></tr></thead><tbody>${rows}</tbody></table>`);
    },

    _buildAgingAlertEmail(alerts, summary) {
        const rows = alerts.slice(0, 10).map(a => `<tr><td style="padding:8px;border-bottom:1px solid #eee;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;background:${a.severity === 'CRITICAL' ? '#ffebee' : '#fff3e0'};color:${a.severity === 'CRITICAL' ? '#c62828' : '#e65100'};">${a.severity}</span></td><td style="padding:8px;border-bottom:1px solid #eee;">${a.titulo}</td><td style="padding:8px;border-bottom:1px solid #eee;font-size:13px;color:#666;">${a.mensaje}</td></tr>`).join('');
        return this._wrapInTemplate(`<h2 style="color:#c62828;margin-bottom:20px;">⚠️ Alertas Críticas</h2><div style="display:flex;gap:15px;margin-bottom:20px;"><div style="background:#ffebee;padding:15px;border-radius:8px;flex:1;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#c62828;">${summary.critical}</div><div style="font-size:12px;color:#666;">Críticas</div></div><div style="background:#fff3e0;padding:15px;border-radius:8px;flex:1;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#e65100;">${summary.high}</div><div style="font-size:12px;color:#666;">Altas</div></div></div><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#ffebee;"><th style="padding:10px;text-align:left;width:100px;">Severidad</th><th style="padding:10px;text-align:left;">Alerta</th><th style="padding:10px;text-align:left;">Detalle</th></tr></thead><tbody>${rows}</tbody></table>${alerts.length > 10 ? `<p style="color:#666;font-size:13px;margin-top:10px;">... y ${alerts.length - 10} más</p>` : ''}`);
    },

    _buildEscalationEmail(escalations) {
        const rows = escalations.map(e => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${e.asegurado}</td><td style="padding:8px;border-bottom:1px solid #eee;">${e.diasSinGestion || 'N/A'} días</td><td style="padding:8px;border-bottom:1px solid #eee;">${e.motivo}</td></tr>`).join('');
        return this._wrapInTemplate(`<h2 style="color:#d32f2f;margin-bottom:20px;">🚨 Casos que Requieren Escalamiento</h2><table style="width:100%;border-collapse:collapse;margin:20px 0;"><thead><tr style="background:#ffebee;"><th style="padding:10px;text-align:left;">Asegurado</th><th style="padding:10px;text-align:left;">Días sin Gestión</th><th style="padding:10px;text-align:left;">Motivo</th></tr></thead><tbody>${rows}</tbody></table>`);
    },

    _buildDailySummaryEmail(data) {
        return this._wrapInTemplate(`<h2 style="color:#1565c0;margin-bottom:20px;">📊 Resumen Diario de Cobranzas</h2><div style="display:flex;gap:15px;margin-bottom:20px;flex-wrap:wrap;"><div style="background:#e8f5e9;padding:15px;border-radius:8px;flex:1;min-width:100px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#2e7d32;">${data.gestionesHoy || 0}</div><div style="font-size:12px;color:#666;">Gestiones Hoy</div></div><div style="background:#e3f2fd;padding:15px;border-radius:8px;flex:1;min-width:100px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#1565c0;">${data.ptpsPendientes || 0}</div><div style="font-size:12px;color:#666;">PTPs Pendientes</div></div><div style="background:#ffebee;padding:15px;border-radius:8px;flex:1;min-width:100px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#c62828;">${data.alertasCriticas || 0}</div><div style="font-size:12px;color:#666;">Alertas Críticas</div></div><div style="background:#fff3e0;padding:15px;border-radius:8px;flex:1;min-width:100px;text-align:center;"><div style="font-size:24px;font-weight:bold;color:#e65100;">${data.dso || 0}</div><div style="font-size:12px;color:#666;">DSO (días)</div></div></div><p style="color:#666;font-size:13px;margin-top:20px;padding-top:15px;border-top:1px solid #eee;">Generado el ${new Date().toLocaleString('es-PE')}</p>`);
    },

    _wrapInTemplate(content) {
        return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:'Segoe UI',sans-serif;line-height:1.6;color:#333;max-width:700px;margin:0 auto;padding:20px;"><div style="background:linear-gradient(135deg,#1565c0,#0d47a1);color:white;padding:20px;border-radius:8px 8px 0 0;"><h1 style="margin:0;font-size:20px;">Portal de Cobranzas</h1><p style="margin:5px 0 0;opacity:0.9;font-size:13px;">Transperuana Corredores de Seguros</p></div><div style="background:white;padding:25px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">${content}</div><div style="text-align:center;padding:15px;color:#999;font-size:12px;">Correo automático - No responder</div></body></html>`;
    },

    _isEnabled() { return getConfig('FEATURES.ENABLE_EMAIL_AUTOMATION', true); },
    _getAdminEmails() { const emails = getConfig('AUTOMATION.ADMIN_EMAILS', []); return Array.isArray(emails) ? emails.filter(e => this._isValidEmail(e)) : []; },
    _getReplyTo() { return getConfig('AUTOMATION.REPLY_TO_EMAIL', ''); },
    _isValidEmail(email) { return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); },
    _groupBy(array, key) { return array.reduce((groups, item) => { const value = item[key] || 'unknown'; groups[value] = groups[value] || []; groups[value].push(item); return groups; }, {}); },
    _formatNumber(num) { return (num || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
};

function sendPTPReminders_API() { return EmailAutomation.sendPTPReminders(); }
function sendAgingAlerts_API() { return EmailAutomation.sendAgingAlerts(); }
function sendDailySummary_API(data) { return EmailAutomation.sendDailySummaryEmail(data); }
function testEmailTemplate_API(type) { return { ok: true, message: 'Use sendPTPReminders_API or sendAgingAlerts_API' }; }
