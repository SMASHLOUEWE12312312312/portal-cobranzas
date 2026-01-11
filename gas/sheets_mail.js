/**
 * @fileoverview Gestión de contactos y cola de correos
 * @version 2.0.0 - Optimizado con batch processing
 * 
 * MEJORAS v2.0:
 * - appendLog() ahora usa buffer + flush (no appendRow inmediato)
 * - readContacts() ya optimizado (usa SheetsIO.readSheet batch)
 * - upsertQueue() ya optimizado (usa setValues batch)
 */

const SheetsMail = {

  // ========== BUFFER Y CACHÉ (privado) ==========

  /**
   * Buffer de logs de correo pendientes de escribir
   * @private
   */
  _logBuffer: [],

  /**
   * Caché de referencia a la hoja de logs
   * @private
   */
  _logSheetCache: null,

  /**
   * Tamaño máximo del buffer antes de auto-flush
   * @private
   */
  _maxLogBufferSize: 50,

  /**
   * Lee y parsea contactos de Mail_Contacts
   * @return {Array<Object>} Lista de contactos parseados
   */
  readContacts() {
    const context = 'SheetsMail.readContacts';
    Logger.debug(context, 'Reading contacts');

    const sheetName = getConfig('SHEETS.MAIL_CONTACTS');
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      // Crear hoja si no existe
      sheet = ss.insertSheet(sheetName);
      const headers = ['ASEGURADO_ID', 'ASEGURADO_NOMBRE', 'GRUPO_ID', 'EMAIL',
        'ASUNTO_BASE', 'SALUDO', 'PLANTILLA', 'OBS_OPCIONAL', 'ACTIVE'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
      Logger.info(context, 'Created Mail_Contacts sheet');
      return [];
    }

    const data = SheetsIO.readSheet(sheetName);

    Logger.info(context, 'Data leída', {
      totalRows: data.rows.length,
      columnMap: JSON.stringify(data.columnMap)
    });

    const contacts = [];
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];

      // Usar nombres EXACTOS de columnas (con espacios)
      const aseguradoId = Utils.cleanText(row[data.columnMap["ASEGURADO ID"]] || '');

      // ACTIVE es opcional
      let active = 'TRUE';
      if (data.columnMap["ACTIVE"] !== undefined) {
        active = String(row[data.columnMap["ACTIVE"]] || 'TRUE').toUpperCase();
      }

      if (!aseguradoId) continue;
      if (active !== 'TRUE') continue;

      // Leer EMAIL_TO, EMAIL_CC, EMAIL_BCC (con espacios)
      const emailTo = Utils.cleanText(row[data.columnMap["EMAIL TO"]] || '');
      const emailCc = Utils.cleanText(row[data.columnMap["EMAIL CC"]] || '');
      const emailBcc = Utils.cleanText(row[data.columnMap["EMAIL BCC"]] || '');

      // Parsear cada campo
      const parsedTo = this._parseEmailField(emailTo);
      const parsedCc = this._parseEmailField(emailCc);
      const parsedBcc = this._parseEmailField(emailBcc);

      contacts.push({
        aseguradoId,
        aseguradoNombre: Utils.cleanText(row[data.columnMap["ASEGURADO NOMBRE"]] || aseguradoId),
        grupoId: Utils.cleanText(row[data.columnMap["GRUPO_ID"]] || ''),
        email: {
          to: parsedTo.to,
          cc: parsedCc.to,
          bcc: parsedBcc.to
        },
        emailTo: parsedTo.to,
        emailCc: parsedCc.to,
        emailBcc: parsedBcc.to,
        asuntoBase: Utils.cleanText(row[data.columnMap["ASUNTO_BASE"]] || ''),
        saludo: Utils.cleanText(row[data.columnMap["SALUDO"]] || 'Estimados,'),
        plantilla: Utils.cleanText(row[data.columnMap["PLANTILLA"]] || 'REGULAR'),
        obsOpcional: Utils.cleanText(row[data.columnMap["OBS_OPCIONAL"]] || ''),
        observaciones: Utils.cleanText(row[data.columnMap["OBSERVACIONES"]] || ''),
        active: true
      });
    }

    Logger.info(context, 'Total contacts', { count: contacts.length });
    return contacts;
  },

  /**
   * Parsea campo EMAIL con roles
   * @param {string} emailField - Campo EMAIL completo
   * @return {Object} {to: [], cc: [], bcc: []}
   * @private
   */
  _parseEmailField(emailField) {
    const result = { to: [], cc: [], bcc: [] };
    if (!emailField) return result;

    // Separar por ; o ,
    const emails = emailField.split(/[;,]/).map(e => e.trim()).filter(e => e);

    const seen = new Set();

    for (let email of emails) {
      // Limpiar
      email = email.trim();
      if (!email) continue;

      let role = 'to'; // default
      let cleanEmail = email;

      // Detectar prefijos: to:, cc:, bcc:
      if (/^to:/i.test(email)) {
        role = 'to';
        cleanEmail = email.replace(/^to:\s*/i, '');
      } else if (/^cc:/i.test(email)) {
        role = 'cc';
        cleanEmail = email.replace(/^cc:\s*/i, '');
      } else if (/^bcc:/i.test(email)) {
        role = 'bcc';
        cleanEmail = email.replace(/^bcc:\s*/i, '');
      }
      // Detectar sufijos: [cc], [bcc]
      else if (/\[cc\]\s*$/i.test(email)) {
        role = 'cc';
        cleanEmail = email.replace(/\s*\[cc\]\s*$/i, '');
      } else if (/\[bcc\]\s*$/i.test(email)) {
        role = 'bcc';
        cleanEmail = email.replace(/\s*\[bcc\]\s*$/i, '');
      }

      // Extraer dirección si viene con nombre: "John Doe <john@example.com>"
      const match = cleanEmail.match(/<([^>]+)>/);
      const address = match ? match[1].trim() : cleanEmail.trim();

      // Validar formato básico
      if (!this._isValidEmail(address)) {
        Logger.warn('SheetsMail._parseEmailField', 'Invalid email', { email: address });
        continue;
      }

      const normalized = address.toLowerCase();

      // Evitar duplicados (primera aparición gana)
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      // Guardar con nombre original si existe
      const fullEmail = match ? cleanEmail : address;

      result[role].push(fullEmail);
    }

    // Si no hay TO, tomar primera dirección de CC como TO
    if (result.to.length === 0 && result.cc.length > 0) {
      result.to.push(result.cc.shift());
    }

    // Eliminar de CC/BCC si ya está en TO (deduplicación por prioridad)
    const toAddresses = this._extractAddresses(result.to);
    result.cc = result.cc.filter(e => !toAddresses.has(this._extractAddress(e)));
    result.bcc = result.bcc.filter(e => !toAddresses.has(this._extractAddress(e)));

    // Eliminar de BCC si ya está en CC
    const ccAddresses = this._extractAddresses(result.cc);
    result.bcc = result.bcc.filter(e => !ccAddresses.has(this._extractAddress(e)));

    return result;
  },

  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  _extractAddress(email) {
    const match = email.match(/<([^>]+)>/);
    return match ? match[1].toLowerCase() : email.toLowerCase();
  },

  _extractAddresses(emails) {
    return new Set(emails.map(e => this._extractAddress(e)));
  },

  /**
   * Filtra contactos por GRUPO_ID
   * @param {string} grupoId - ID del grupo
   * @return {Array<string>} IDs de asegurados
   */
  filterByGrupo(grupoId) {
    const contacts = this.readContacts();
    return contacts.filter(c => c.grupoId === grupoId).map(c => c.aseguradoId);
  },

  /**
   * Inserta items en cola
   * @param {Array<Object>} items - Items a encolar
   */
  upsertQueue(items) {
    const context = 'SheetsMail.upsertQueue';
    Logger.info(context, 'Upserting queue items', { count: items.length });

    const sheetName = getConfig('SHEETS.MAIL_QUEUE');
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = ['ID', 'ASEGURADO_ID', 'ASEGURADO_NOMBRE', 'TO', 'CC', 'BCC',
        'SUBJECT', 'BODY_HTML', 'ATTACHMENTS_JSON', 'STATUS',
        'CREATED_AT', 'ATTEMPTS', 'LAST_ERROR'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }

    const rows = items.map(item => [
      item.id || Utilities.getUuid(),
      item.aseguradoId,
      item.aseguradoNombre,
      item.to.join(', '),
      item.cc.join(', '),
      item.bcc.join(', '),
      item.subject,
      item.bodyHtml,
      JSON.stringify(item.attachments || []),
      'PENDING',
      new Date(),
      0,
      ''
    ]);

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    Logger.info(context, 'Queue items added', { count: rows.length });
  },

  /**
   * Agrega entrada al log (bufferizado, no escribe inmediatamente)
   * 
   * NUEVO EN v2.0: Usa buffer en memoria
   * IMPORTANTE: Llamar a flushMailLog() al final del flujo para escribir a Sheets
   * 
   * @param {Object} entry - Entrada de log
   */
  appendLog(entry) {
    const context = 'SheetsMail.appendLog';

    try {
      const row = [
        new Date(),
        entry.aseguradoId || '',
        entry.messageId || '',
        entry.to || '',
        entry.cc || '',
        entry.bcc || '',
        entry.subject || '',
        entry.attachments || '',
        entry.status || 'SENT',
        entry.error || '',
        entry.sender || Session.getActiveUser().getEmail()
      ];

      // AGREGAR AL BUFFER (no escribir inmediatamente)
      this._logBuffer.push(row);

      // Auto-flush si buffer lleno
      if (this._logBuffer.length >= this._maxLogBufferSize) {
        this.flushMailLog();
      }

      Logger.debug(context, 'Log entry buffered', {
        messageId: entry.messageId,
        bufferSize: this._logBuffer.length
      });

    } catch (error) {
      Logger.warn(context, 'Failed to buffer log', error);
    }
  },

  /**
   * Escribe todos los logs del buffer a Sheets en una sola operación
   * 
   * CUÁNDO LLAMAR:
   * - Al final de un flujo de envío masivo de correos
   * - Después de appendLog() múltiples veces
   * - Manualmente cuando se desea persistir
   * 
   * @return {Object} { ok: boolean, count: number, error?: string }
   */
  flushMailLog() {
    const context = 'SheetsMail.flushMailLog';

    // Si no hay logs en buffer, no hacer nada
    if (this._logBuffer.length === 0) {
      return { ok: true, count: 0 };
    }

    try {
      // Obtener o crear hoja (con caché)
      const sheet = this._getOrCreateLogSheet();

      // UNA SOLA operación para escribir TODOS los logs
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, this._logBuffer.length, this._logBuffer[0].length)
        .setValues(this._logBuffer);

      const count = this._logBuffer.length;

      // Limpiar buffer después de escribir
      this._logBuffer = [];

      Logger.info(context, 'Mail logs flushed', { count: count, operaciones: 1 });

      return { ok: true, count: count };

    } catch (error) {
      Logger.error(context, 'Flush failed', error);

      // NO limpiar buffer en caso de error (permitir reintento)
      return {
        ok: false,
        count: 0,
        error: error.message
      };
    }
  },

  /**
   * Limpia el buffer de logs sin escribir a Sheets
   * Útil para testing
   */
  clearLogBuffer() {
    const count = this._logBuffer.length;
    this._logBuffer = [];
    return { ok: true, cleared: count };
  },

  /**
   * Obtiene tamaño actual del buffer de logs
   */
  getLogBufferSize() {
    return this._logBuffer.length;
  },

  /**
   * Obtiene o crea la hoja de logs (con caché)
   * @private
   */
  _getOrCreateLogSheet() {
    // Retornar caché si existe
    if (this._logSheetCache) {
      return this._logSheetCache;
    }

    const sheetName = getConfig('SHEETS.MAIL_LOG');
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = ['TIMESTAMP', 'ASEGURADO_ID', 'MESSAGE_ID', 'TO', 'CC', 'BCC',
        'SUBJECT', 'ATTACHMENTS', 'STATUS', 'ERROR', 'SENDER'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }

    // Guardar en caché
    this._logSheetCache = sheet;

    return sheet;
  },

  /**
   * Envía correos consolidados por Grupo Económico
   * // GRUPO_ECONOMICO - NUEVA LÓGICA
   * @param {string} grupoNombre - Nombre del grupo
   * @param {Object} opciones - { fechaCorte, adjuntarPdf, adjuntarXlsx, dryRun }
   */
  sendEmailsByGrupo(grupoNombre, opciones) {
    const context = 'SheetsMail.sendEmailsByGrupo';
    Logger.info(context, 'Iniciando envío por grupo', { grupo: grupoNombre, opciones });

    try {
      // 1. Leer contactos
      const contacts = this.readContacts();

      Logger.info(context, 'Total contacts', { count: contacts.length });

      if (contacts.length > 0) {
        Logger.info(context, 'Primer contacto', {
          id: contacts[0].aseguradoId,
          nombre: contacts[0].aseguradoNombre,
          tieneEmail: !!contacts[0].email
        });
      }

      // Buscar empresas del grupo
      const grupoUpper = String(grupoNombre).trim().toUpperCase();
      const empresasDelGrupo = [];

      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        const nombreUpper = String(c.aseguradoNombre || '').trim().toUpperCase();

        if (nombreUpper === grupoUpper) {
          empresasDelGrupo.push(c);
        }
      }

      Logger.info(context, 'Resultado búsqueda', {
        buscando: grupoUpper,
        encontrados: empresasDelGrupo.length
      });

      if (empresasDelGrupo.length === 0) {
        // Fallback: Buscar por ASEGURADO_ID (caso individual o nombre exacto de empresa)
        Logger.info(context, 'No encontrado por nombre de grupo, buscando por ID asegurado...');
        for (let i = 0; i < contacts.length; i++) {
          const c = contacts[i];
          const idUpper = String(c.aseguradoId || '').trim().toUpperCase();
          if (idUpper === grupoUpper) {
            empresasDelGrupo.push(c);
          }
        }
      }

      if (empresasDelGrupo.length === 0) {
        throw new Error(`No se encontraron empresas para el grupo/asegurado: ${grupoNombre}`);
      }

      const groupContact = empresasDelGrupo[0];

      if (!groupContact.email || !groupContact.email.to || groupContact.email.to.length === 0) {
        throw new Error(`El grupo ${grupoNombre} no tiene email configurado`);
      }

      Logger.info(context, 'Email OK', { to: groupContact.email.to[0] });

      // 2. Generar EECC para todos los asegurados del grupo
      const genResult = EECCCore.generateByGrupo(grupoNombre, {
        exportPdf: opciones.adjuntarPdf,
        exportXlsx: opciones.adjuntarXlsx,
        includeObs: true // Por defecto incluimos obs
      });

      if (!genResult.ok || genResult.results.length === 0) {
        throw new Error(`No se pudieron generar EECC para el grupo ${grupoNombre}: ${genResult.message}`);
      }

      // 3. Preparar adjuntos (consolidar todos)
      const attachments = [];
      const attachmentLog = [];

      for (const res of genResult.results) {
        // [MEJORA ENVIAR_EECC_CORREO] Lógica estricta de adjuntos
        if (opciones.adjuntarPdf && res.pdfUrl) {
          const fileId = Utils.extractFileId(res.pdfUrl);
          if (fileId) {
            attachments.push(DriveApp.getFileById(fileId).getBlob());
            attachmentLog.push(`PDF: ${res.asegurado}`);
          }
        }
        // Solo adjuntar XLSX si el usuario lo pidió explícitamente
        if (opciones.adjuntarXlsx && res.xlsxUrl) {
          const fileId = Utils.extractFileId(res.xlsxUrl);
          if (fileId) {
            attachments.push(DriveApp.getFileById(fileId).getBlob());
            attachmentLog.push(`XLSX: ${res.asegurado}`);
          }
        }
      }

      if (attachments.length === 0) {
        throw new Error('No se generaron adjuntos válidos para enviar (revise si seleccionó PDF o XLSX)');
      }

      // 4. Renderizar plantilla [MEJORA ENVIAR_EECC_CORREO]
      // Usamos TemplateService para obtener asunto y cuerpo
      const templateId = opciones.templateId || groupContact.plantilla || 'REGULAR';
      const fechaCorteStr = opciones.fechaCorte ? Utils.formatDate(new Date(opciones.fechaCorte)) : Utils.formatDate(new Date());

      const renderData = {
        asegurado: grupoNombre,
        fechaCorte: fechaCorteStr,
        saludo: groupContact.saludo || 'Estimados',
        folio: `GRP-${Date.now()}`,
        obs: groupContact.observaciones || '',
        grupo: grupoNombre
      };

      const rendered = TemplateService.renderTemplate(templateId, renderData);
      const subject = rendered.subject;
      const bodyHtml = rendered.bodyHtml;

      // 5. Construir lista de enlaces para el cuerpo (siempre útil)
      let linksHtml = '<br><br><h3>Archivos Adjuntos:</h3><ul>';
      for (const res of genResult.results) {
        if (opciones.adjuntarPdf && res.pdfUrl) {
          linksHtml += `<li><a href="${res.pdfUrl}">PDF: ${res.asegurado}</a></li>`;
        }
        if (opciones.adjuntarXlsx && res.xlsxUrl) {
          linksHtml += `<li><a href="${res.xlsxUrl}">XLSX: ${res.asegurado}</a></li>`;
        }
      }
      linksHtml += '</ul>';

      // Agregar enlaces al cuerpo si falla adjunto o siempre (opcional)
      // Por seguridad, lo agregamos al final del bodyHtml
      const bodyWithLinks = bodyHtml + linksHtml;

      // 6. Enviar o Simular
      if (opciones.dryRun) {
        Logger.info(context, 'Dry Run - Email simulado', {
          to: groupContact.email.to,
          subject: subject,
          attachmentsCount: attachments.length
        });
        return { ok: true, simulated: true, message: 'Envío simulado correcto' };
      }

      // Intentar enviar con adjuntos
      try {
        MailApp.sendEmail({
          to: groupContact.email.to.join(','),
          cc: groupContact.email.cc.join(','),
          bcc: groupContact.email.bcc.join(','),
          subject: subject,
          htmlBody: bodyHtml, // Intentamos primero SIN links visibles para no ensuciar, o CON links?
          // Mejor CON links si son muchos, pero el usuario quiere adjuntos.
          // Si falla, enviamos SOLO links.
          attachments: attachments,
          name: getConfig('BRAND.COMPANY_NAME')
        });
      } catch (e) {
        const errorMsg = String(e.message || e);
        // Si es error de límite, reintentar sin adjuntos pero CON enlaces
        if (errorMsg.includes('Limit Exceeded') || errorMsg.includes('Límite Excedido') || errorMsg.includes('limit') || errorMsg.includes('size')) {
          Logger.warn(context, 'Adjuntos exceden límite, enviando con enlaces', { error: errorMsg });

          MailApp.sendEmail({
            to: groupContact.email.to.join(','),
            cc: groupContact.email.cc.join(','),
            bcc: groupContact.email.bcc.join(','),
            subject: subject + ' [Enlaces de Descarga]', // Avisar en asunto
            htmlBody: bodyHtml + '<p style="color:red; font-weight:bold;">Nota: Los archivos adjuntos exceden el límite de tamaño permitido. Por favor descárguelos desde los siguientes enlaces:</p>' + linksHtml,
            name: getConfig('BRAND.COMPANY_NAME')
          });
        } else {
          throw e; // Otro error, re-lanzar
        }
      }

      // 6. Log y Bitácora
      this.appendLog({
        aseguradoId: grupoNombre, // Logueamos el grupo
        to: groupContact.email.to.join(','),
        subject: subject,
        status: 'SENT',
        attachments: JSON.stringify(attachmentLog)
      });

      // Registrar en bitácora por cada asegurado (para trazabilidad individual)
      // Opcional: Registrar una gestión grupal. El requerimiento dice:
      // "Inserta un registro de bitácora por cada asegurado del grupo"
      for (const res of genResult.results) {
        try {
          BitacoraService.registrarGestionManual({
            asegurado: res.asegurado,
            tipoGestion: 'ENVIO_EECC',
            estadoGestion: 'EN_SEGUIMIENTO',
            canalContacto: 'EMAIL',
            proximaAccion: 'Confirmar recepción (Envío Grupal)',
            observaciones: `Envío consolidado grupo: ${grupoNombre}`,
            fechaEnvioEECC: new Date()
          });
        } catch (e) {
          Logger.warn(context, `Error registrando bitácora para ${res.asegurado}`, e);
        }
      }

      return { ok: true, message: `Correo enviado al grupo ${grupoNombre} con ${attachments.length} adjuntos` };

    } catch (error) {
      Logger.error(context, 'Error sending group email', error);
      this.appendLog({
        aseguradoId: grupoNombre,
        status: 'ERROR',
        error: error.message
      });
      return { ok: false, error: error.message };
    }
  },

  /**
   * Limpia caché (útil para testing)
   * @private
   */
  _clearLogCache() {
    this._logSheetCache = null;
  }
};
