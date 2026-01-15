/**
 * Handles Sidebar Navigation
 * @param {string} viewName - The ID suffix of the view to show
 */
function switchView(viewName) {
  // 1. Hide all views
  const views = document.querySelectorAll('.view-section');
  views.forEach(v => v.classList.remove('active'));

  // 2. Deactivate all nav items
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(n => n.classList.remove('active'));

  // 3. Show selected view
  const selectedView = document.getElementById(`view-${viewName}`);
  if (selectedView) {
    selectedView.classList.add('active');
  }

  // 4. Activate nav item
  const selectedNav = document.getElementById(`nav-${viewName}`);
  if (selectedNav) {
    selectedNav.classList.add('active');
  }

  // Scroll to top
  const mainScroll = document.getElementById('mainScroll');
  if (mainScroll) mainScroll.scrollTop = 0;
}


// ========== CONFIGURACIÓN PARA WEB APP ==========

/**
 * 🔥 SOLUCIÓN FINAL: Pre-carga datos y los pasa al HTML
 * NO usa google.script.run - datos ya vienen cargados
 */
function abrirBitacoraModal() {
  try {
    Logger.info('abrirBitacoraModal', 'Iniciando...');

    // 1. Leer datos ANTES de crear el HTML
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName('Bitacora_Gestiones_EECC');

    if (!sheet) {
      SpreadsheetApp.getUi().alert(
        'Bitácora no inicializada',
        'Primero debes inicializar la bitácora desde: EECC → Inicializar Bitácora v3.0',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    // 2. Leer todas las gestiones
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      SpreadsheetApp.getUi().alert(
        'Bitácora vacía',
        'No hay gestiones registradas todavía.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    const lastCol = sheet.getLastColumn();
    const rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    // 3. Procesar datos
    const gestiones = rawData
      .filter(row => row[0]) // Solo filas con ID_CICLO
      .map(row => ({
        idCiclo: row[0] || '',
        idGestion: row[1] || '',
        origenRegistro: row[2] || '',
        fechaEnvioEECC: row[3] ? row[3].toISOString() : null,
        fechaRegistro: row[4] ? row[4].toISOString() : null,
        asegurado: row[5] || '',
        ruc: row[6] || '',
        responsable: row[7] || '',
        tipoGestion: row[8] || '',
        estadoGestion: row[9] || '',
        canalContacto: row[10] || '',
        fechaCompromiso: row[11] ? row[11].toISOString() : null,
        proximaAccion: row[12] || '',
        observaciones: row[13] || ''
      }));

    Logger.info('abrirBitacoraModal', `${gestiones.length} gestiones cargadas`);

    // 4. Crear HTML con datos inyectados
    const template = HtmlService.createTemplateFromFile('bitacora_modal');
    template.gestionesData = JSON.stringify(gestiones);

    const html = template.evaluate()
      .setWidth(1400)
      .setHeight(800)
      .setTitle('📊 Bitácora de Gestiones EECC');

    SpreadsheetApp.getUi().showModalDialog(html, 'Bitácora de Gestiones EECC');
    Logger.info('abrirBitacoraModal', 'Modal abierto con datos pre-cargados');

  } catch (error) {
    Logger.error('abrirBitacoraModal', 'Error', error);
    SpreadsheetApp.getUi().alert('Error', 'No se pudo abrir la bitácora: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Abre el verificador de deployment
 */
function abrirVerificadorDeployment() {
  const html = HtmlService.createHtmlOutputFromFile('verificador_deployment')
    .setWidth(900)
    .setHeight(700)
    .setTitle('🔍 Verificador de Deployment');
  SpreadsheetApp.getUi().showModalDialog(html, 'Verificador de Deployment - Bitácora v3.0');
}

/**
 * Obtiene y muestra el ID del Spreadsheet actual
 * ⚠️ EJECUTA ESTA FUNCIÓN UNA VEZ para configurar Web App deployments
 */
function obtenerSpreadsheetID() {
  try {
    const ss = SpreadsheetApp.getActive();
    const id = ss.getId();
    const url = ss.getUrl();

    const mensaje =
      '✅ ID DEL SPREADSHEET OBTENIDO\n\n' +
      `ID: ${id}\n\n` +
      `URL: ${url}\n\n` +
      '📝 INSTRUCCIONES:\n' +
      '1. Copia el ID de arriba\n' +
      '2. Abre gas/config.js\n' +
      `3. Busca: SPREADSHEET_ID: ''\n` +
      `4. Cambia a: SPREADSHEET_ID: '${id}'\n` +
      '5. Guarda el archivo\n' +
      '6. Haz: clasp push\n' +
      '7. Crea un NUEVO deployment de Web App\n\n' +
      '⚠️ Esto es NECESARIO para que el portal funcione correctamente.';

    SpreadsheetApp.getUi().alert('Configurar Web App', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);

    Logger.info('obtenerSpreadsheetID', `ID: ${id}`);
    Logger.info('obtenerSpreadsheetID', `⚠️ Agrega a config.js: SPREADSHEET_ID: '${id}'`);

    return { ok: true, id: id, url: url };
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', 'No se pudo obtener el ID: ' + error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    Logger.error('obtenerSpreadsheetID', 'Failed', error);
    return { ok: false, error: error.message };
  }
}

// ========== MENÚS ==========

/**
 * onOpen - Crea menús personalizados
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('Actualizar base')
    .addItem('Importar desde PC (Excel/CSV)', 'mostrarCargadorLocal')
    .addToUi();

  // ========== MENÚ MODIFICADO: DOS REPORTES ==========
  ui.createMenu('Descargar Reporte')
    .addItem('📥 Reporte EECC Filtrado ≥90', 'descargarReporteVencidos90')
    .addItem('📥 Reporte EECC Filtrado OBS', 'descargarReporteObservaciones')
    .addToUi();
  // ====================================================

  ui.createMenu('EECC')
    .addItem('Generar EECC', 'openSidebarAsegurado')
    .addSeparator()
    .addItem('📧 Enviar EECC por Correo', 'openSendDrawer')
    .addSeparator()
    .addItem('Inicializar sistema', 'inicializarSistema')
    .addItem('Inicializar hojas de correo', 'initializeMailSheets')
    .addItem('Configurar trigger programado', 'setupSchedulerTrigger')
    .addSeparator()
    .addItem('📊 Ver Bitácora (Modal Directo)', 'abrirBitacoraModal')
    .addItem('📋 Ver Bitácora (Hoja)', 'abrirBitacoraGestiones')
    .addItem('🔧 Inicializar Bitácora v3.0', 'inicializarBitacoraV3')
    .addSeparator()
    .addItem('🔍 Verificar Deployment', 'abrirVerificadorDeployment')
    .addItem('🌐 Obtener ID para Web App', 'obtenerSpreadsheetID')
    .addToUi();

  Logger.info('onOpen', 'Menus created');
}

/**
 * Muestra sidebar de carga local
 */
function mostrarCargadorLocal() {
  const html = HtmlService.createHtmlOutputFromFile('Upload')
    .setTitle('Importar datos desde tu PC');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Importa archivo local (legacy - mantener compatibilidad)
 */
function importarArchivoLocal(payload) {
  const result = subirArchivoBase(payload, null);
  return result;
}

/**
 * Abre sidebar de generación EECC
 */
function openSidebarAsegurado() {
  const html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('Generar EECC');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Obtiene lista de asegurados (para sidebar)
 */
function getAsegurados() {
  try {
    const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
    const aseguradoCol = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.ASEGURADO'));

    if (aseguradoCol === -1) {
      SpreadsheetApp.getUi().alert('No se encontró la columna ASEGURADO');
      return [];
    }

    const set = new Set();
    baseData.rows.forEach(row => {
      const aseg = Utils.cleanText(row[aseguradoCol]);
      if (aseg) set.add(aseg);
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  } catch (error) {
    Logger.error('getAsegurados', 'Failed', error);
    return [];
  }
}

/**
 * Genera EECC desde sidebar
 */
function generateForAsegurado(nombreAseg, opts) {
  return EECCCore.generateWithUI(nombreAseg, opts);
}

/**
 * doGet - Sirve el portal web o el drawer usando templates
 */
function doGet(e) {
  try {
    Logger.log('doGet called:', JSON.stringify(e.parameter));

    // Si viene parámetro page=drawer, servir el drawer
    if (e.parameter && e.parameter.page === 'drawer') {
      Logger.log('Serving drawer with template');

      // IMPORTANTE: Usar createTemplateFromFile en lugar de createHtmlOutputFromFile
      const template = HtmlService.createTemplateFromFile('ui_send_drawer');
      const html = template.evaluate()
        .setTitle('Enviar EECC por Correo')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);

      return html;
    }

    // Por defecto, servir el portal principal
    Logger.log('Serving main portal');

    // 🚀 PRE-CARGAR datos de bitácora para velocidad instantánea
    let bitacoraData = [];
    try {
      const ss = SpreadsheetApp.getActive() || SpreadsheetApp.openById(getConfig('SPREADSHEET_ID', ''));
      const sheet = ss.getSheetByName('Bitacora_Gestiones_EECC');

      if (sheet && sheet.getLastRow() >= 2) {
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();
        const rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

        bitacoraData = rawData
          .filter(row => row[0]) // Solo filas con ID_CICLO
          .map(row => ({
            idCiclo: row[0] || '',
            idGestion: row[1] || '',
            origenRegistro: row[2] || '',
            fechaEnvioEECC: row[3] ? row[3].toISOString() : null,
            fechaRegistro: row[4] ? row[4].toISOString() : null,
            asegurado: row[5] || '',
            ruc: row[6] || '',
            responsable: row[7] || '',
            tipoGestion: row[8] || '',
            estadoGestion: row[9] || '',
            canalContacto: row[10] || '',
            fechaCompromiso: row[11] ? row[11].toISOString() : null,
            proximaAccion: row[12] || '',
            observaciones: row[13] || ''
          }));

        Logger.log(`Pre-cargadas ${bitacoraData.length} gestiones`);
      }
    } catch (error) {
      Logger.log('Error al pre-cargar bitácora (no crítico):', error.message);
    }

    const template = HtmlService.createTemplateFromFile('index');
    template.bitacoraDataPreload = JSON.stringify(bitacoraData);
    template.scriptUrl = ScriptApp.getService().getUrl();

    const html = template.evaluate()
      .setTitle('Transperuana · Portal EECC')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);

    return html;

  } catch (error) {
    Logger.log('ERROR in doGet: ' + error.toString());
    Logger.log('Stack: ' + error.stack);

    return HtmlService.createHtmlOutput(`
            <html>
                <head>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 40px; 
                            background: #f5f5f5; 
                        }
                        .error-box {
                            background: white;
                            border-left: 4px solid #D32F2F;
                            padding: 20px;
                            border-radius: 4px;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        h1 { color: #D32F2F; margin: 0 0 10px 0; }
                        pre { 
                            background: #f5f5f5; 
                            padding: 10px; 
                            border-radius: 4px; 
                            overflow-x: auto;
                        }
                    </style>
                </head>
                <body>
                    <div class="error-box">
                        <h1>⚠️ Error al cargar la página</h1>
                        <p><strong>Mensaje:</strong> ${error.message}</p>
                        <p><strong>Detalles:</strong></p>
                        <pre>${error.stack || 'No stack trace available'}</pre>
                        <p><a href="javascript:history.back()">← Volver</a></p>
                    </div>
                </body>
            </html>
        `);
  }
}

/**
 * doPost - Handles BFF API requests with HMAC authentication
 * This endpoint receives signed requests from the Next.js BFF and routes them
 * to existing portal functions (loginPassword, logout, etc.)
 * 
 * BFF sends: { action, params, token, timestamp, nonce, correlationId }
 * 
 * Required for Next.js + Vercel BFF pattern (P0-1)
 */
function doPost(e) {
  const context = 'doPost';

  try {
    Logger.log('doPost called');

    // Validate BFF request with HMAC signature
    const validation = validateBffRequest_(e);

    if (!validation.ok) {
      Logger.log('BFF validation failed: ' + validation.error);
      return ContentService.createTextOutput(JSON.stringify({
        ok: false,
        error: validation.error
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // BFF sends: { action, params, token, timestamp, nonce, correlationId }
    const { action, params = {}, token } = validation.data;
    Logger.log('BFF action: ' + action);
    Logger.log('BFF params: ' + JSON.stringify(params).substring(0, 100));

    let result;

    // Route to appropriate handler
    switch (action) {
      case 'login':
        // Login uses params.username and params.password
        result = loginPassword(params.username, params.password);
        break;

      case 'logout':
        result = AuthService.logout(token);
        break;

      case 'validateSession':
        try {
          const user = AuthService.validateSession(token);
          result = { ok: true, user };
        } catch (err) {
          result = { ok: false, error: err.message };
        }
        break;

      case 'ping':
        result = { ok: true, timestamp: new Date().toISOString(), version: '1.0.0-bff' };
        break;

      case 'healthCheck':
        result = healthCheck(token);
        break;

      case 'getBitacoraResumen':
        result = getBitacoraResumen(token, params.options);
        break;

      case 'registrarGestionManualBitacora':
        result = registrarGestionManualBitacora(
          token,
          params.asegurado,
          params.tipoGestion,
          params.estadoGestion,
          params.canalContacto,
          params.observaciones,
          params.fechaCompromiso,
          params.idCiclo,
          params.gestionData
        );
        break;

      case 'getGestionesCiclo':
        result = getGestionesCiclo(token, params.idCiclo);
        break;

      default:
        result = { ok: false, error: 'Unknown action: ' + action };
    }

    Logger.log('BFF response: ' + JSON.stringify(result).substring(0, 200));

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('doPost error: ' + error.toString());

    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: 'Server error: ' + error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Inicializa el sistema (primera vez o reset)
 */
function inicializarSistema() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert(
    'Inicializar sistema',
    '¿Deseas inicializar/reiniciar el sistema? Esto creará las hojas necesarias y configurará los usuarios.',
    ui.ButtonSet.OK_CANCEL
  );

  if (resp !== ui.Button.OK) return;

  try {
    validateConfig();

    const ss = SpreadsheetApp.getActive();
    const sheetsToCreate = [
      { name: getConfig('SHEETS.DEBUG_LOG'), headers: ['Timestamp', 'Level', 'Context', 'Message', 'Extra', 'User'] },
      { name: getConfig('SHEETS.BITACORA'), headers: ['ID', 'FechaHora', 'Usuario', 'Accion', 'Asegurado', 'Resultado'] }
    ];

    for (const sheetDef of sheetsToCreate) {
      let sheet = ss.getSheetByName(sheetDef.name);
      if (!sheet) {
        sheet = ss.insertSheet(sheetDef.name);
        sheet.appendRow(sheetDef.headers);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, sheetDef.headers.length)
          .setFontWeight('bold')
          .setBackground('#f3f3f3');
      }
    }

    // Inicializar sistema de autenticación
    AuthService.initialize();

    // ========== INICIALIZAR BITÁCORA DE GESTIONES DE EECC ==========
    const bitacoraResult = BitacoraService.initialize();
    if (!bitacoraResult.ok) {
      Logger.warn('inicializarSistema', 'Bitácora initialization warning', {
        error: bitacoraResult.message
      });
    } else {
      Logger.info('inicializarSistema', 'Bitácora initialized', {
        message: bitacoraResult.message
      });
    }

    Logger.info('inicializarSistema', 'System initialized');
    ui.alert(
      'Sistema inicializado correctamente ✅\n\n' +
      '✓ Hojas de debug y bitácora creadas\n' +
      '✓ Sistema de autenticación configurado\n' +
      '✓ Bitácora de gestiones de EECC inicializada\n\n' +
      'El sistema está listo para usar.'
    );
  } catch (error) {
    Logger.error('inicializarSistema', 'Initialization failed', error);
    ui.alert('Error al inicializar: ' + error.message);
  }
}

/**
 * Abre drawer de envío de correos (solo para autorización desde menú)
 */
function openSendDrawer() {
  try {
    // Verificar autorización
    AuthGuard.requireAuth();

    const html = HtmlService.createHtmlOutputFromFile('ui_send_drawer')
      .setTitle('Enviar EECC por Correo')
      .setWidth(560);

    SpreadsheetApp.getUi().showSidebar(html);

  } catch (error) {
    Logger.error('openSendDrawer', 'Failed to open drawer', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}

/**
 * Configura triggers para el Scheduler
 */
function setupSchedulerTrigger() {
  const context = 'setupSchedulerTrigger';
  Logger.info(context, 'Setting up scheduler trigger');

  try {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'runScheduledJobsTrigger' ||
        trigger.getHandlerFunction() === 'processMailQueue') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Ejecutar cada 10 minutos (o 1 hora según preferencia)
    ScriptApp.newTrigger('runScheduledJobsTrigger')
      .timeBased()
      .everyMinutes(10)
      .create();

    Logger.info(context, 'Scheduler trigger created successfully');

    SpreadsheetApp.getUi().alert('✅ Trigger de programación configurado correctamente (cada 10 min).');
    return '✅ Trigger configurado';

  } catch (error) {
    Logger.error(context, 'Failed to setup trigger', error);
    SpreadsheetApp.getUi().alert('❌ Error: ' + error.message);
    return `❌ Error: ${error.message}`;
  }
}

/**
 * Ejecuta trabajos programados (llamado por trigger)
 */
function runScheduledJobsTrigger() {
  const context = 'runScheduledJobsTrigger';
  try {
    Logger.info(context, 'Running scheduled jobs...');
    SchedulerService.processPendingJobs();
    Logger.info(context, 'Scheduled jobs processed');
  } catch (error) {
    Logger.error(context, 'Error processing scheduled jobs', error);
  }
}

/**
 * Inicializa hojas de correo
 */
function initializeMailSheets() {
  const ui = SpreadsheetApp.getUi();

  const resp = ui.alert(
    'Inicializar hojas de correo',
    '¿Deseas crear/verificar las hojas necesarias para el sistema de envío de correos?',
    ui.ButtonSet.OK_CANCEL
  );

  if (resp !== ui.Button.OK) return;

  try {
    const ss = SpreadsheetApp.getActive();

    // Mail_Contacts
    let contactsSheet = ss.getSheetByName(getConfig('SHEETS.MAIL_CONTACTS'));
    if (!contactsSheet) {
      contactsSheet = ss.insertSheet(getConfig('SHEETS.MAIL_CONTACTS'));
      const headers = ['ASEGURADO_ID', 'ASEGURADO_NOMBRE', 'GRUPO_ID', 'EMAIL',
        'ASUNTO_BASE', 'SALUDO', 'PLANTILLA', 'OBS_OPCIONAL', 'ACTIVE'];
      contactsSheet.appendRow(headers);
      contactsSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      contactsSheet.setFrozenRows(1);

      // Ejemplo
      contactsSheet.appendRow([
        'EMPRESA_EJEMPLO',
        'Empresa Ejemplo S.A.',
        'GRUPO_A',
        'to:contacto@ejemplo.com, cc:gerencia@ejemplo.com',
        'EECC {{ASEGURADO}} – Corte {{FECHA_CORTE}} (Ref: {{FOLIO}})',
        'Estimados,',
        'REGULAR',
        '',
        'TRUE'
      ]);

      contactsSheet.getRange('D2').setNote(
        'Formato EMAIL:\n' +
        '- Usar prefijos: to:, cc:, bcc:\n' +
        '- O sufijos: [cc], [bcc]\n' +
        '- Separar con ; o ,\n' +
        'Ejemplo: to:admin@empresa.com, cc:gerencia@empresa.com, bcc:auditoria@empresa.com'
      );

      contactsSheet.getRange('E2').setNote(
        'Variables disponibles:\n' +
        '{{ASEGURADO}} - Nombre del asegurado\n' +
        '{{FECHA_CORTE}} - Fecha de corte\n' +
        '{{FOLIO}} - Número de folio único'
      );
    }

    // Mail_Queue
    let queueSheet = ss.getSheetByName(getConfig('SHEETS.MAIL_QUEUE'));
    if (!queueSheet) {
      queueSheet = ss.insertSheet(getConfig('SHEETS.MAIL_QUEUE'));
      const headers = ['ID', 'ASEGURADO_ID', 'ASEGURADO_NOMBRE', 'TO', 'CC', 'BCC',
        'SUBJECT', 'BODY_HTML', 'ATTACHMENTS_JSON', 'STATUS',
        'CREATED_AT', 'ATTEMPTS', 'LAST_ERROR'];
      queueSheet.appendRow(headers);
      queueSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      queueSheet.setFrozenRows(1);
    }

    // Mail_Log
    let logSheet = ss.getSheetByName(getConfig('SHEETS.MAIL_LOG'));
    if (!logSheet) {
      logSheet = ss.insertSheet(getConfig('SHEETS.MAIL_LOG'));
      const headers = ['TIMESTAMP', 'ASEGURADO_ID', 'MESSAGE_ID', 'TO', 'CC', 'BCC',
        'SUBJECT', 'ATTACHMENTS', 'STATUS', 'ERROR', 'SENDER'];
      logSheet.appendRow(headers);
      logSheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      logSheet.setFrozenRows(1);
    }

    Logger.info('initializeMailSheets', 'Sheets initialized');
    ui.alert(
      '✅ Hojas de correo inicializadas correctamente\n\n' +
      'Hojas creadas:\n' +
      '- Mail_Contacts: Gestión de destinatarios\n' +
      '- Mail_Queue: Cola de envío\n' +
      '- Mail_Log: Historial de envíos\n\n' +
      'Revisa Mail_Contacts para ver el formato de ejemplo.'
    );

  } catch (error) {
    Logger.error('initializeMailSheets', 'Initialization failed', error);
    ui.alert('❌ Error: ' + error.message);
  }
}

// ============================================
// REPORTES EECC FILTRADOS (VERSIÓN 2.3.0)
// ============================================

/**
 * REPORTE 1: Descarga reporte de registros con DIAS_VENCIDOS >= 90 (solo importes positivos)
 * Nombre: Reporte EECC Filtrado ≥90
 */
function descargarReporteVencidos90() {
  const context = 'descargarReporteVencidos90';
  const ui = SpreadsheetApp.getUi();

  try {
    Logger.info(context, 'Iniciando descarga de reporte ≥90 días');

    ui.alert(
      'Generando Reporte ≥90 días',
      'Por favor espere mientras se genera el reporte...',
      ui.ButtonSet.OK
    );

    const result = _generarReporteVencidos90();

    if (!result.ok) {
      ui.alert('❌ Error', result.error, ui.ButtonSet.OK);
      return;
    }

    const mensaje = `✅ Reporte generado exitosamente!\n\n` +
      `📊 Registros encontrados: ${result.rowCount}\n` +
      `📁 Nombre del archivo: ${result.fileName}\n\n` +
      `El archivo se ha guardado en:\n` +
      `Cobranzas_Transperuana/Reporte OBS\n\n` +
      `¿Desea abrir el archivo ahora?`;

    const response = ui.alert('Reporte Generado', mensaje, ui.ButtonSet.YES_NO);

    if (response === ui.Button.YES) {
      const htmlOutput = HtmlService.createHtmlOutput(
        `<script>window.open('${result.fileUrl}', '_blank'); google.script.host.close();</script>`
      ).setWidth(1).setHeight(1);
      ui.showModalDialog(htmlOutput, 'Abriendo archivo...');
    }

    Logger.info(context, 'Reporte descargado exitosamente', {
      rows: result.rowCount,
      fileUrl: result.fileUrl
    });

  } catch (error) {
    Logger.error(context, 'Error al descargar reporte', error);
    ui.alert('❌ Error',
      'Ocurrió un error al generar el reporte:\n' + error.toString(),
      ui.ButtonSet.OK);
  }
}

/**
 * REPORTE 2: Descarga reporte de registros con observaciones (CUPON vacío, IMPORTE negativo, IMPORTE = 0)
 * Nombre: Reporte EECC Filtrado OBS
 */
function descargarReporteObservaciones() {
  const context = 'descargarReporteObservaciones';
  const ui = SpreadsheetApp.getUi();

  try {
    Logger.info(context, 'Iniciando descarga de reporte observaciones');

    ui.alert(
      'Generando Reporte Observaciones',
      'Por favor espere mientras se genera el reporte...',
      ui.ButtonSet.OK
    );

    const result = _generarReporteObservaciones();

    if (!result.ok) {
      ui.alert('❌ Error', result.error, ui.ButtonSet.OK);
      return;
    }

    const mensaje = `✅ Reporte generado exitosamente!\n\n` +
      `📊 Registros encontrados: ${result.rowCount}\n` +
      `📁 Nombre del archivo: ${result.fileName}\n\n` +
      `El archivo se ha guardado en:\n` +
      `Cobranzas_Transperuana/Reporte OBS\n\n` +
      `¿Desea abrir el archivo ahora?`;

    const response = ui.alert('Reporte Generado', mensaje, ui.ButtonSet.YES_NO);

    if (response === ui.Button.YES) {
      const htmlOutput = HtmlService.createHtmlOutput(
        `<script>window.open('${result.fileUrl}', '_blank'); google.script.host.close();</script>`
      ).setWidth(1).setHeight(1);
      ui.showModalDialog(htmlOutput, 'Abriendo archivo...');
    }

    Logger.info(context, 'Reporte descargado exitosamente', {
      rows: result.rowCount,
      fileUrl: result.fileUrl
    });

  } catch (error) {
    Logger.error(context, 'Error al descargar reporte', error);
    ui.alert('❌ Error',
      'Ocurrió un error al generar el reporte:\n' + error.toString(),
      ui.ButtonSet.OK);
  }
}

/**
 * Abre la hoja de Bitácora de Gestiones de EECC
 */
function abrirBitacoraGestiones() {
  const context = 'abrirBitacoraGestiones';

  try {
    const ss = SpreadsheetApp.getActive();
    const bitacoraSheet = ss.getSheetByName(BitacoraService.SHEET_NAME);

    if (!bitacoraSheet) {
      const ui = SpreadsheetApp.getUi();
      const respuesta = ui.alert(
        'Bitácora no inicializada',
        'La hoja de bitácora de gestiones aún no existe. ¿Deseas crearla ahora?',
        ui.ButtonSet.YES_NO
      );

      if (respuesta === ui.Button.YES) {
        const resultado = BitacoraService.initialize();

        if (resultado.ok) {
          const newSheet = ss.getSheetByName(BitacoraService.SHEET_NAME);
          ss.setActiveSheet(newSheet);
          ui.alert('✅ Bitácora creada y abierta correctamente');
        } else {
          ui.alert('❌ Error al crear bitácora: ' + resultado.message);
        }
      }
      return;
    }

    // Activar la hoja de bitácora
    ss.setActiveSheet(bitacoraSheet);

    Logger.info(context, 'Bitácora abierta');

  } catch (error) {
    Logger.error(context, 'Error al abrir bitácora', error);
    SpreadsheetApp.getUi().alert('Error al abrir bitácora: ' + error.message);
  }
}

/**
 * Genera reporte de DIAS_VENCIDOS >= 90 (solo importes positivos)
 * @return {Object} { ok, rowCount, fileName, fileUrl, error }
 */
function _generarReporteVencidos90() {
  const context = '_generarReporteVencidos90';

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const bdSheet = ss.getSheetByName(getConfig('SHEETS.BASE'));

    if (!bdSheet) {
      return { ok: false, error: 'No se encontró la hoja BD' };
    }

    const lastRow = bdSheet.getLastRow();
    const lastCol = bdSheet.getLastColumn();

    if (lastRow < 2) {
      return { ok: false, error: 'No hay datos en la hoja BD' };
    }

    // Obtener encabezados
    const headers = bdSheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Obtener todos los datos
    const allData = bdSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    // Obtener índices de columnas necesarias
    const colImporte = headers.indexOf('IMPORTE');
    const colDiasVencidos = headers.indexOf('DIAS_VENCIDOS');

    if (colImporte === -1 || colDiasVencidos === -1) {
      return {
        ok: false,
        error: 'No se encontraron las columnas necesarias (IMPORTE, DIAS_VENCIDOS)'
      };
    }

    Logger.info(context, 'Columnas encontradas', {
      colImporte: colImporte,
      colDiasVencidos: colDiasVencidos
    });

    // Filtrar: DIAS_VENCIDOS >= 90 Y IMPORTE > 0
    const datosFiltrados = [];

    allData.forEach(row => {
      const importe = parseFloat(row[colImporte]) || 0;
      const diasVencidos = parseFloat(row[colDiasVencidos]) || 0;

      // Criterio: >= 90 días Y importe positivo
      if (diasVencidos >= 90 && importe > 0) {
        const observacion = `${diasVencidos} días vencidos (≥90)`;
        const rowConObservacion = [...row, observacion];
        datosFiltrados.push(rowConObservacion);
      }
    });

    if (datosFiltrados.length === 0) {
      return {
        ok: false,
        error: 'No se encontraron registros con DIAS_VENCIDOS >= 90 e importes positivos'
      };
    }

    Logger.info(context, 'Datos filtrados', {
      total: allData.length,
      filtrados: datosFiltrados.length
    });

    // Crear spreadsheet temporal
    const tz = getConfig('FORMAT.TIMEZONE');
    const dateStr = Utilities.formatDate(new Date(), tz, 'yyyyMMdd_HHmmss');
    const tempSS = SpreadsheetApp.create('TMP_Reporte_Vencidos90_' + dateStr);
    const tempId = tempSS.getId();
    const tempSheet = tempSS.getSheets()[0];
    tempSheet.setName('Vencidos_90_dias');

    // Agregar columna OBSERVACIONES
    const headersConObservaciones = [...headers, 'OBSERVACIONES'];

    // Escribir encabezados
    const headerRange = tempSheet.getRange(1, 1, 1, headersConObservaciones.length);
    headerRange.setValues([headersConObservaciones])
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    // Escribir datos
    if (datosFiltrados.length > 0) {
      tempSheet.getRange(2, 1, datosFiltrados.length, headersConObservaciones.length)
        .setValues(datosFiltrados);
    }

    // Aplicar formatos
    const dateFormat = getConfig('FORMAT.DATE_FORMAT');
    const numberFormat = getConfig('FORMAT.NUMBER_FORMAT');

    const colFecVencimiento = headers.indexOf('FEC_VENCIMIENTO COB');
    if (colFecVencimiento > -1 && datosFiltrados.length > 0) {
      tempSheet.getRange(2, colFecVencimiento + 1, datosFiltrados.length, 1)
        .setNumberFormat(dateFormat);
    }

    if (colImporte > -1 && datosFiltrados.length > 0) {
      tempSheet.getRange(2, colImporte + 1, datosFiltrados.length, 1)
        .setNumberFormat(numberFormat);
    }

    if (colDiasVencidos > -1 && datosFiltrados.length > 0) {
      tempSheet.getRange(2, colDiasVencidos + 1, datosFiltrados.length, 1)
        .setNumberFormat('0');
    }

    // Formato columna OBSERVACIONES
    if (datosFiltrados.length > 0) {
      tempSheet.getRange(2, headersConObservaciones.length, datosFiltrados.length, 1)
        .setFontColor('#d32f2f')
        .setFontWeight('bold')
        .setWrap(true);
    }

    tempSheet.setFrozenRows(1);

    // Ajustar anchos
    for (let i = 1; i <= headersConObservaciones.length; i++) {
      tempSheet.autoResizeColumn(i);
      const currentWidth = tempSheet.getColumnWidth(i);
      tempSheet.setColumnWidth(i, currentWidth + 20);
    }

    const obsColWidth = tempSheet.getColumnWidth(headersConObservaciones.length);
    tempSheet.setColumnWidth(headersConObservaciones.length, Math.max(obsColWidth, 250));

    SpreadsheetApp.flush();

    // Exportar a XLSX
    Logger.info(context, 'Exportando a XLSX');
    const blob = ExportService.exportToXLSX(tempId);
    const fileName = `Reporte_EECC_Filtrado_≥90_${dateStr}.xlsx`;
    blob.setName(fileName);

    // Guardar en Reporte OBS
    const cobranzasFolderId = getConfig('DRIVE.OUTPUT_FOLDER_ID');
    const cobranzasFolder = DriveApp.getFolderById(cobranzasFolderId);

    let reportFolder;
    const folders = cobranzasFolder.getFoldersByName('Reporte OBS');
    if (folders.hasNext()) {
      reportFolder = folders.next();
    } else {
      reportFolder = cobranzasFolder.createFolder('Reporte OBS');
      Logger.info(context, 'Carpeta "Reporte OBS" creada');
    }

    const file = reportFolder.createFile(blob);
    const fileUrl = file.getUrl();

    Logger.info(context, 'Archivo guardado', {
      fileName: fileName,
      fileUrl: fileUrl
    });

    // Limpiar temporal
    DriveApp.getFileById(tempId).setTrashed(true);

    return {
      ok: true,
      rowCount: datosFiltrados.length,
      fileName: fileName,
      fileUrl: fileUrl
    };

  } catch (error) {
    Logger.error(context, 'Error generando reporte', error);
    return {
      ok: false,
      error: error.toString()
    };
  }
}

/**
 * Genera reporte de observaciones (CUPON vacío, IMPORTE negativo, IMPORTE = 0)
 * @return {Object} { ok, rowCount, fileName, fileUrl, error }
 */
function _generarReporteObservaciones() {
  const context = '_generarReporteObservaciones';

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const bdSheet = ss.getSheetByName(getConfig('SHEETS.BASE'));

    if (!bdSheet) {
      return { ok: false, error: 'No se encontró la hoja BD' };
    }

    const lastRow = bdSheet.getLastRow();
    const lastCol = bdSheet.getLastColumn();

    if (lastRow < 2) {
      return { ok: false, error: 'No hay datos en la hoja BD' };
    }

    // Obtener encabezados
    const headers = bdSheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Obtener todos los datos
    const allData = bdSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    // Obtener índices de columnas necesarias
    const colCupon = headers.indexOf('CUPON');
    const colImporte = headers.indexOf('IMPORTE');

    if (colCupon === -1 || colImporte === -1) {
      return {
        ok: false,
        error: 'No se encontraron las columnas necesarias (CUPON, IMPORTE)'
      };
    }

    Logger.info(context, 'Columnas encontradas', {
      colCupon: colCupon,
      colImporte: colImporte
    });

    // Filtrar: CUPON vacío O IMPORTE negativo O IMPORTE = 0
    const datosFiltrados = [];

    allData.forEach(row => {
      const cupon = row[colCupon];
      const importe = parseFloat(row[colImporte]) || 0;

      const cuponVacio = !cupon || cupon.toString().trim() === '';
      const importeNegativo = importe < 0;
      const importeCero = importe === 0;

      // Construir observaciones
      const observaciones = [];

      if (cuponVacio) {
        observaciones.push('CUPON vacío');
      }
      if (importeNegativo) {
        observaciones.push('IMPORTE negativo');
      }
      if (importeCero) {
        observaciones.push('IMPORTE = 0');
      }

      // Si cumple al menos un criterio, agregar
      if (observaciones.length > 0) {
        const rowConObservacion = [...row, observaciones.join(' | ')];
        datosFiltrados.push(rowConObservacion);
      }
    });

    if (datosFiltrados.length === 0) {
      return {
        ok: false,
        error: 'No se encontraron registros con CUPON vacío, IMPORTE negativo o IMPORTE = 0'
      };
    }

    Logger.info(context, 'Datos filtrados', {
      total: allData.length,
      filtrados: datosFiltrados.length
    });

    // Crear spreadsheet temporal
    const tz = getConfig('FORMAT.TIMEZONE');
    const dateStr = Utilities.formatDate(new Date(), tz, 'yyyyMMdd_HHmmss');
    const tempSS = SpreadsheetApp.create('TMP_Reporte_OBS_' + dateStr);
    const tempId = tempSS.getId();
    const tempSheet = tempSS.getSheets()[0];
    tempSheet.setName('Observaciones');

    // Agregar columna OBSERVACIONES
    const headersConObservaciones = [...headers, 'OBSERVACIONES'];

    // Escribir encabezados
    const headerRange = tempSheet.getRange(1, 1, 1, headersConObservaciones.length);
    headerRange.setValues([headersConObservaciones])
      .setFontWeight('bold')
      .setBackground('#4285f4')
      .setFontColor('#ffffff')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    // Escribir datos
    if (datosFiltrados.length > 0) {
      tempSheet.getRange(2, 1, datosFiltrados.length, headersConObservaciones.length)
        .setValues(datosFiltrados);
    }

    // Aplicar formatos
    const dateFormat = getConfig('FORMAT.DATE_FORMAT');
    const numberFormat = getConfig('FORMAT.NUMBER_FORMAT');

    const colFecVencimiento = headers.indexOf('FEC_VENCIMIENTO COB');
    if (colFecVencimiento > -1 && datosFiltrados.length > 0) {
      tempSheet.getRange(2, colFecVencimiento + 1, datosFiltrados.length, 1)
        .setNumberFormat(dateFormat);
    }

    if (colImporte > -1 && datosFiltrados.length > 0) {
      tempSheet.getRange(2, colImporte + 1, datosFiltrados.length, 1)
        .setNumberFormat(numberFormat);
    }

    const colDiasVencidos = headers.indexOf('DIAS_VENCIDOS');
    if (colDiasVencidos > -1 && datosFiltrados.length > 0) {
      tempSheet.getRange(2, colDiasVencidos + 1, datosFiltrados.length, 1)
        .setNumberFormat('0');
    }

    // Formato columna OBSERVACIONES
    if (datosFiltrados.length > 0) {
      tempSheet.getRange(2, headersConObservaciones.length, datosFiltrados.length, 1)
        .setFontColor('#0066cc')
        .setFontWeight('normal')
        .setWrap(true);
    }

    tempSheet.setFrozenRows(1);

    // Ajustar anchos
    for (let i = 1; i <= headersConObservaciones.length; i++) {
      tempSheet.autoResizeColumn(i);
      const currentWidth = tempSheet.getColumnWidth(i);
      tempSheet.setColumnWidth(i, currentWidth + 20);
    }

    const obsColWidth = tempSheet.getColumnWidth(headersConObservaciones.length);
    tempSheet.setColumnWidth(headersConObservaciones.length, Math.max(obsColWidth, 300));

    SpreadsheetApp.flush();

    // Exportar a XLSX
    Logger.info(context, 'Exportando a XLSX');
    const blob = ExportService.exportToXLSX(tempId);
    const fileName = `Reporte_EECC_Filtrado_OBS_${dateStr}.xlsx`;
    blob.setName(fileName);

    // Guardar en Reporte OBS
    const cobranzasFolderId = getConfig('DRIVE.OUTPUT_FOLDER_ID');
    const cobranzasFolder = DriveApp.getFolderById(cobranzasFolderId);

    let reportFolder;
    const folders = cobranzasFolder.getFoldersByName('Reporte OBS');
    if (folders.hasNext()) {
      reportFolder = folders.next();
    } else {
      reportFolder = cobranzasFolder.createFolder('Reporte OBS');
      Logger.info(context, 'Carpeta "Reporte OBS" creada');
    }

    const file = reportFolder.createFile(blob);
    const fileUrl = file.getUrl();

    Logger.info(context, 'Archivo guardado', {
      fileName: fileName,
      fileUrl: fileUrl
    });

    // Limpiar temporal
    DriveApp.getFileById(tempId).setTrashed(true);

    return {
      ok: true,
      rowCount: datosFiltrados.length,
      fileName: fileName,
      fileUrl: fileUrl
    };

  } catch (error) {
    Logger.error(context, 'Error generando reporte', error);
    return {
      ok: false,
      error: error.toString()
    };
  }
}

// ============================================
// BITÁCORA v3.0 - INICIALIZACIÓN
// ============================================

/**
 * Inicializa la Bitácora v3.0 (con ciclos de gestión)
 * Accesible desde: Menú EECC → 🔧 Inicializar Bitácora v3.0
 */
function inicializarBitacoraV3() {
  const context = 'inicializarBitacoraV3';
  const ui = SpreadsheetApp.getUi();

  const resp = ui.alert(
    '🔧 Inicializar Bitácora v3.0',
    '¿Deseas inicializar la Bitácora de Gestiones de EECC v3.0?\n\n' +
    'Esto creará la hoja "Bitacora_Gestiones_EECC" con el nuevo esquema de 14 headers.\n\n' +
    '✅ Es seguro: no afecta hojas existentes\n' +
    '✅ Solo se ejecuta una vez\n' +
    '✅ Necesario para usar el portal de bitácora',
    ui.ButtonSet.OK_CANCEL
  );

  if (resp !== ui.Button.OK) {
    Logger.info(context, 'Inicialización cancelada por el usuario');
    return;
  }

  try {
    Logger.info(context, 'Iniciando inicialización de Bitácora v3.0...');

    // Llamar al método initialize() del BitacoraService v3.0
    const result = BitacoraService.initialize();

    if (result.ok) {
      Logger.info(context, 'Bitácora v3.0 inicializada exitosamente', result);

      ui.alert(
        '✅ Bitácora v3.0 Inicializada',
        result.message + '\n\n' +
        '📋 Hoja creada: Bitacora_Gestiones_EECC\n' +
        '📊 Headers: 14 columnas configuradas\n' +
        '🎨 Formatos aplicados\n\n' +
        '🚀 Próximo paso:\n' +
        '1. Abre el portal (ejecuta doGet o abre la web app)\n' +
        '2. Inicia sesión\n' +
        '3. Click en "📝 Abrir bitácora"\n' +
        '4. Registra tu primera gestión\n\n' +
        '📖 Ver guía completa en:\n' +
        'INICIO_RAPIDO_BITACORA.md',
        ui.ButtonSet.OK
      );

    } else {
      Logger.warn(context, 'Advertencia durante inicialización', result);

      ui.alert(
        '⚠️ Advertencia',
        result.message + '\n\n' +
        'Posibles causas:\n' +
        '• La hoja ya existe (normal si ya inicializaste antes)\n' +
        '• Permisos insuficientes\n\n' +
        'Si la hoja "Bitacora_Gestiones_EECC" ya existe,\n' +
        'el sistema está listo para usar.',
        ui.ButtonSet.OK
      );
    }

  } catch (error) {
    Logger.error(context, 'Error al inicializar Bitácora v3.0', error);

    ui.alert(
      '❌ Error',
      'Error al inicializar la Bitácora v3.0:\n\n' +
      error.message + '\n\n' +
      'Posibles soluciones:\n' +
      '1. Verifica que el archivo bitacora_v3.js esté en el proyecto\n' +
      '2. Verifica que config.js tenga CONFIG.BITACORA definido\n' +
      '3. Revisa la hoja Debug_Log para más detalles\n' +
      '4. Ejecuta validateConfig() para verificar configuración',
      ui.ButtonSet.OK
    );
  }
}

/**
 * ALTERNATIVA: Si prefieres ejecutar desde el Editor de Scripts
 * Puedes ejecutar directamente esta función simple:
 */
function testBitacoraV3Initialize() {
  const result = BitacoraService.initialize();
  Logger.log('=== RESULTADO DE INICIALIZACIÓN ===');
  Logger.log(result);
  return result;
}

/**
 * @fileoverview Entry point principal
 */

// Trigger para procesar trabajos programados (ejecuta cada hora)
function runScheduledJobsTrigger() {
  try {
    SchedulerService.processPendingJobs();
  } catch (error) {
    Logger.error('runScheduledJobsTrigger', 'Error processing scheduled jobs', error);
  }
}

/**
 * Setup trigger automático para scheduler (ejecutar una vez manualmente)
 */
function setupSchedulerTrigger() {
  // Eliminar trigger anterior si existe
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runScheduledJobsTrigger') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Crear trigger horario
  ScriptApp.newTrigger('runScheduledJobsTrigger')
    .timeBased()
    .everyHours(1) // Ejecutar cada hora
    .create();

  Logger.info('setupSchedulerTrigger', 'Scheduler trigger created successfully');
  return { ok: true, message: 'Trigger creado: ejecutará cada hora' };
}

/**
 * Obtiene el contenido HTML del drawer para inyección SPA
 * @return {string} HTML content
 */
function getDrawerContent() {
  return HtmlService.createTemplateFromFile('ui_send_drawer').evaluate().getContent();
}

/**
 * Obtiene el contenido HTML de la bitácora para inyección SPA
 * Inyecta los datos de gestiones en el template antes de evaluarlo
 * IMPORTANTE: Sanitiza el JSON para evitar caracteres de control que rompen el parser
 * @return {string} HTML content
 */
function getBitacoraHtml() {
  try {
    // Obtener datos de la bitácora
    var resultado = bitacoraGetAllDataV3Final();
    var gestionesData = '[]';

    if (resultado && resultado.ok && resultado.data) {
      // Sanitizar cada campo de texto para remover caracteres de control
      var dataSanitized = resultado.data.map(function (item) {
        var cleanItem = {};
        for (var key in item) {
          if (typeof item[key] === 'string') {
            // Remover caracteres de control y sanitizar
            cleanItem[key] = item[key]
              .replace(/[\x00-\x1f\x7f]/g, ' ')  // Remover caracteres de control
              .replace(/\\/g, '\\\\')  // Escapar backslashes
              .replace(/"/g, '\\"')    // Escapar comillas dobles
              .trim();
          } else {
            cleanItem[key] = item[key];
          }
        }
        return cleanItem;
      });

      gestionesData = JSON.stringify(dataSanitized);
    }

    // Crear template e inyectar datos
    var template = HtmlService.createTemplateFromFile('bitacora_modal');
    template.gestionesData = gestionesData;

    return template.evaluate().getContent();
  } catch (e) {
    Logger.log('Error en getBitacoraHtml: ' + e.message);
    return '<div style="padding: 2rem; text-align: center; color: #999;">Error al cargar bitácora: ' + e.message + '</div>';
  }
}
