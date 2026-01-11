/**
 * @fileoverview Servicio para gestionar plantillas de correo desde Google Docs
 * [MEJORA ENVIAR_EECC_CORREO]
 */
const TemplateService = {

    /**
     * Obtiene la lista de plantillas activas
     * @return {Array<Object>} Lista de plantillas { id, name, docId, subject, type }
     */
    getTemplates() {
        const context = 'TemplateService.getTemplates';
        const sheetName = getConfig('SHEETS.MAIL_TEMPLATES');
        const ss = SpreadsheetApp.getActive();
        let sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            // Crear hoja si no existe
            sheet = ss.insertSheet(sheetName);
            const headers = ['TEMPLATE_ID', 'NOMBRE', 'DOC_ID', 'ASUNTO_DEFAULT', 'TIPO', 'ACTIVO'];
            sheet.appendRow(headers);
            sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E3F2FD');
            sheet.setFrozenRows(1);

            // Agregar ejemplo
            sheet.appendRow(['REGULAR', 'Plantilla Regular', 'DOC_ID_AQUI', 'EECC {{ASEGURADO}} - {{FECHA_CORTE}}', 'GENERAL', 'TRUE']);
            Logger.info(context, 'Created Mail_Templates sheet');
            return [];
        }

        const data = sheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).toUpperCase());
        const templates = [];

        const colMap = {
            ID: headers.indexOf('TEMPLATE_ID'),
            NAME: headers.indexOf('NOMBRE'),
            DOC: headers.indexOf('DOC_ID'),
            SUBJECT: headers.indexOf('ASUNTO_DEFAULT'),
            ACTIVE: headers.indexOf('ACTIVO')
        };

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (String(row[colMap.ACTIVE]).toUpperCase() === 'TRUE' && row[colMap.ID]) {
                templates.push({
                    id: row[colMap.ID],
                    name: row[colMap.NAME],
                    docId: row[colMap.DOC],
                    subject: row[colMap.SUBJECT]
                });
            }
        }

        return templates;
    },

    /**
     * Renderiza una plantilla reemplazando placeholders
     * @param {string} templateId - ID de la plantilla
     * @param {Object} data - Datos para reemplazo
     * @return {Object} { subject, bodyHtml }
     */
    renderTemplate(templateId, data) {
        const context = 'TemplateService.renderTemplate';
        const templates = this.getTemplates();
        const template = templates.find(t => t.id === templateId);

        if (!template) {
            throw new Error(`Plantilla no encontrada: ${templateId}`);
        }

        let bodyHtml = '';

        // Si tiene DOC_ID, leer de Google Doc
        if (template.docId && template.docId !== 'DOC_ID_AQUI') {
            try {
                const doc = DocumentApp.openById(template.docId);
                const body = doc.getBody();
                // Conversión simple de texto a HTML (mejora: usar un convertidor más robusto si es necesario)
                // Por ahora, asumimos que el usuario quiere texto plano con saltos de línea o usamos un helper básico
                // OPCIÓN B MEJORADA: Leer como HTML es complejo en Apps Script nativo sin librerías.
                // Alternativa robusta: Usar el texto del doc y convertir saltos de línea a <br>.
                // O permitir HTML en una columna si el usuario prefiere.
                // Dado el requerimiento "Google Docs como plantillas", haremos un esfuerzo por preservar formato básico.

                bodyHtml = this._convertDocToHtml(body);

            } catch (e) {
                Logger.error(context, 'Error leyendo Google Doc', e);
                bodyHtml = `<p style="color:red">Error cargando plantilla: ${e.message}</p>`;
            }
        } else {
            // Fallback a plantilla hardcoded si no hay doc
            bodyHtml = getConfig(`MAIL.TEMPLATES.${templateId}.body`) || '<p>Plantilla sin contenido</p>';
        }

        // Reemplazar placeholders en Body y Subject
        let subject = template.subject || 'EECC Transperuana';

        // Lista de placeholders comunes
        const replacements = {
            '{{ASEGURADO}}': data.asegurado || '',
            '{{FECHA_CORTE}}': data.fechaCorte || '',
            '{{SALUDO}}': data.saludo || 'Estimados',
            '{{FOLIO}}': data.folio || '',
            '{{OBS_OPCIONAL}}': data.obs || '',
            '{{GRUPO_ECONOMICO}}': data.grupo || ''
        };

        // Aplicar reemplazos
        for (const [key, value] of Object.entries(replacements)) {
            const regex = new RegExp(key, 'g');
            bodyHtml = bodyHtml.replace(regex, value);
            subject = subject.replace(regex, value);
        }

        return { subject, bodyHtml };
    },

    /**
     * Convierte el cuerpo de un Google Doc a HTML básico
     * @private
     */
    _convertDocToHtml(body) {
        let html = '';
        const numChildren = body.getNumChildren();

        for (let i = 0; i < numChildren; i++) {
            const child = body.getChild(i);
            const type = child.getType();

            if (type === DocumentApp.ElementType.PARAGRAPH) {
                const text = child.asParagraph().getText();
                if (text.trim() === '') {
                    html += '<br>';
                } else {
                    html += `<p>${this._escapeHtml(text)}</p>`;
                }
            } else if (type === DocumentApp.ElementType.LIST_ITEM) {
                const text = child.asListItem().getText();
                html += `<li>${this._escapeHtml(text)}</li>`;
            }
            // Se pueden agregar más tipos (Tablas, etc) si es necesario
        }

        return `<div style="font-family: Arial, sans-serif; color: #333;">${html}</div>`;
    },

    _escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};
