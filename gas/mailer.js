/**
 * @fileoverview Servicio de envío de correos con GmailApp
 * @version 3.3.0
 */

const MailerService = {
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 2000,
  MAX_ATTACHMENT_SIZE: 22 * 1024 * 1024,

  /**
   * Renderiza template de email
   */
  renderTemplate(params) {
    const { templateKind, data } = params;
    const templates = getConfig('MAIL.TEMPLATES');
    const template = templates[templateKind] || templates.REGULAR;
    
    let bodyHtml = template.body;

    bodyHtml = bodyHtml.replace(/{{ASEGURADO}}/g, data.asegurado || '');
    bodyHtml = bodyHtml.replace(/{{FECHA_CORTE}}/g, data.fechaCorte || '');
    bodyHtml = bodyHtml.replace(/{{SALUDO}}/g, data.saludo || 'Estimados');
    
    if (data.observaciones) {
      bodyHtml = bodyHtml.replace(/{{OBS_OPCIONAL}}/g, 
        `<p style="margin-top: 1rem; padding: 1rem; background: #FFF3E0; border-left: 4px solid #F57C00; border-radius: 4px;">
          <strong>Nota:</strong> ${data.observaciones}
        </p>`);
    } else {
      bodyHtml = bodyHtml.replace(/{{OBS_OPCIONAL}}/g, '');
    }

    const signature = getConfig('BRAND.SIGNATURE_HTML');
    bodyHtml += signature;

    return bodyHtml;
  },

  /**
   * Envía email con reintentos automáticos
   */
  sendEmail(params) {
    return this._withRetry(() => {
      return this._sendEmailCore(params);
    }, this.MAX_RETRIES, this.RETRY_DELAY_BASE);
  },

  /**
   * Lógica principal de envío usando GmailApp
   */
  _sendEmailCore(params) {
    const context = 'MailerService._sendEmailCore';
    const startTime = Date.now();

    try {
      this._validateEmailParams(params);

      Logger.info(context, 'Sending email', { 
        to: params.to.slice(0, 2).join(', '),
        subject: params.subject.substring(0, 40)
      });

      const maxBytes = this.MAX_ATTACHMENT_SIZE;
      let attachments = params.blobs || [];
      let bodyHtml = params.bodyHtml;

      // Verificar tamaño de adjuntos
      const totalBytes = attachments.reduce((sum, b) => sum + b.getBytes().length, 0);

      if (totalBytes > maxBytes && params.urls && params.urls.length > 0) {
        Logger.warn(context, 'Attachments too large, using Drive links', {
          totalMB: (totalBytes / 1048576).toFixed(2)
        });

        // Configurar permisos de Drive
        params.urls.forEach(url => {
          try {
            const fileId = this._extractFileId(url);
            if (fileId) {
              DriveApp.getFileById(fileId).setSharing(
                DriveApp.Access.ANYONE_WITH_LINK, 
                DriveApp.Permission.VIEW
              );
            }
          } catch (e) {
            Logger.warn(context, 'Could not set sharing', { error: e.message });
          }
        });

        bodyHtml += this._buildLinksHTML(params.urls);
        attachments = [];
      }

      // ENVIAR CON GmailApp (servicio nativo)
      const options = {
        htmlBody: bodyHtml,
        name: getConfig('BRAND.COMPANY_NAME', 'Transperuana'),
        attachments: attachments
      };

      if (params.cc && params.cc.length > 0) {
        options.cc = params.cc.join(',');
      }

      if (params.bcc && params.bcc.length > 0) {
        options.bcc = params.bcc.join(',');
      }

      GmailApp.sendEmail(
        params.to.join(','),
        params.subject,
        'Este correo requiere un cliente que soporte HTML.',
        options
      );

      const duration = Date.now() - startTime;
      Logger.info(context, 'Email sent successfully', { durationMs: duration });

      return 'sent-' + Date.now();

    } catch (error) {
      Logger.error(context, 'Failed to send email', error);
      throw error;
    }
  },

  /**
   * Valida parámetros del email
   */
  _validateEmailParams(params) {
    if (!params.to || !Array.isArray(params.to) || params.to.length === 0) {
      throw new Error('Al menos un destinatario (TO) es requerido');
    }

    if (params.to.length > 50) {
      throw new Error('Demasiados destinatarios (máximo 50)');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allEmails = [...params.to, ...(params.cc || []), ...(params.bcc || [])];
    
    allEmails.forEach(email => {
      const cleanEmail = email.replace(/<.*>/, '').trim();
      if (!emailRegex.test(cleanEmail)) {
        throw new Error('Email inválido: ' + email);
      }
    });

    if (!params.subject || params.subject.trim().length === 0) {
      throw new Error('Subject es requerido');
    }

    if (!params.bodyHtml || params.bodyHtml.trim().length === 0) {
      throw new Error('Body es requerido');
    }
  },

  /**
   * Genera HTML con links de descarga de Drive
   */
  _buildLinksHTML(urls) {
    if (!urls || urls.length === 0) return '';

    const linkItems = urls.map((url, i) => {
      const fileName = url.includes('pdf') ? 'PDF' : 'Excel';
      return `
        <p style="margin: 5px 0;">
          <a href="${url}" target="_blank" style="color: #D32F2F; text-decoration: none; font-weight: 500;">
            📄 Descargar ${fileName}
          </a>
        </p>
      `;
    }).join('');

    return `
      <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #D32F2F;">
        <p style="margin: 0 0 10px; font-weight: 600; color: #333;">📎 Documentos adjuntos:</p>
        ${linkItems}
        <p style="margin: 10px 0 0; font-size: 12px; color: #666;">
          Los enlaces estarán disponibles por 30 días.
        </p>
      </div>
    `;
  },

  /**
   * Extrae file ID de una URL de Drive
   */
  _extractFileId(url) {
    if (!url) return null;
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /[-\w]{25,}/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1] || match[0];
    }
    return null;
  },

  /**
   * Ejecuta función con reintentos automáticos
   */
  _withRetry(fn, maxRetries, delayBase) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return fn();
      } catch (error) {
        lastError = error;
        
        // No reintentar errores de validación
        if (error.message.includes('inválido') || 
            error.message.includes('requerido') ||
            error.message.includes('Invalid')) {
          throw error;
        }
        
        if (i < maxRetries - 1) {
          const delay = delayBase * Math.pow(2, i);
          Logger.warn('MailerService._withRetry', `Retry ${i + 1}/${maxRetries}`, { delay });
          Utilities.sleep(delay);
        }
      }
    }
    throw lastError;
  },

  /**
   * Genera adjuntos desde EECC
   */
  buildAttachments(aseguradoId, opts = {}) {
    const context = 'MailerService.buildAttachments';
    
    try {
      Logger.info(context, 'Building attachments', { aseguradoId });

      const result = EECCCore.generateHeadless(aseguradoId, opts);
      
      if (!result.ok) {
        throw new Error('Error generando EECC: ' + result.error);
      }

      const blobs = [];
      const urls = [];

      if (result.pdfUrl) {
        const pdfId = this._extractFileId(result.pdfUrl);
        if (pdfId) {
          try {
            blobs.push(DriveApp.getFileById(pdfId).getBlob());
            urls.push(result.pdfUrl);
          } catch (e) {
            Logger.warn(context, 'Could not get PDF blob', e);
          }
        }
      }

      if (result.xlsxUrl) {
        const xlsxId = this._extractFileId(result.xlsxUrl);
        if (xlsxId) {
          try {
            blobs.push(DriveApp.getFileById(xlsxId).getBlob());
            urls.push(result.xlsxUrl);
          } catch (e) {
            Logger.warn(context, 'Could not get XLSX blob', e);
          }
        }
      }

      Logger.info(context, 'Attachments ready', { 
        blobCount: blobs.length,
        urlCount: urls.length 
      });

      return { blobs, urls };
      
    } catch (error) {
      Logger.error(context, 'Failed to build attachments', error);
      throw error;
    }
  },

  /**
   * Envía correo de prueba al usuario actual
   */
  sendTest(params) {
    const context = 'MailerService.sendTest';
    
    try {
      const userEmail = Session.getActiveUser().getEmail();
      
      if (!userEmail || userEmail === '') {
        throw new Error('No se pudo obtener el email del usuario actual');
      }

      Logger.info(context, 'Sending test email', { to: userEmail });

      const testParams = {
        to: [userEmail],
        cc: [],
        bcc: [],
        subject: `[PRUEBA] ${params.subject}`,
        bodyHtml: `
          <div style="padding: 15px; background: #FFF3CD; border: 2px solid #FFC107; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-weight: 600; color: #856404; font-size: 16px;">
              🧪 CORREO DE PRUEBA
            </p>
            <p style="margin: 8px 0 0; font-size: 13px; color: #856404;">
              Enviado el: ${new Date().toLocaleString('es-PE')}<br>
              Destinatario de prueba: ${userEmail}
            </p>
          </div>
          <hr style="margin: 20px 0; border: none; border-top: 2px solid #E0E0E0;">
          ${params.bodyHtml}
        `,
        blobs: params.blobs || [],
        urls: params.urls || []
      };

      const messageId = this._sendEmailCore(testParams);
      
      Logger.info(context, 'Test email sent', { messageId });
      return messageId;
      
    } catch (error) {
      Logger.error(context, 'Test email failed', error);
      throw error;
    }
  }
};
