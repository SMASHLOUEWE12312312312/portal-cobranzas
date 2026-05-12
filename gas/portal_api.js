/**
 * @fileoverview API endpoints con envío real de correos
 * @version 3.2.0
 */

// ========== PING ==========
function ping() {
  return {
    ok: true,
    ts: new Date(),
    version: '3.2.0'
  };
}

/**
 * Test ultra-simple para verificar que portal_api.js se carga correctamente
 * Esta función NO requiere autenticación y devuelve un objeto simple
 */
function testBitacoraSimple() {
  return {
    ok: true,
    mensaje: 'portal_api.js se cargó correctamente',
    timestamp: new Date().toISOString(),
    funcionesDisponibles: {
      getBitacoraResumen: typeof getBitacoraResumen === 'function',
      getClientesConCiclosActivos: typeof getClientesConCiclosActivos === 'function',
      registrarGestionManualBitacora: typeof registrarGestionManualBitacora === 'function'
    }
  };
}

// ========== VERIFICACIÓN DE VERSIÓN DEL DEPLOYMENT ==========

/**
 * VERIFICAR VERSIÓN: Función ultra-simple para confirmar que el deployment está actualizado
 * Si esta función devuelve null, el deployment está usando código MUY viejo
 */
function getDeploymentVersion() {
  return {
    version: 'v4.1-BFF-FIX-2025-01-15',
    timestamp: new Date().toISOString(),
    spreadsheetIdConfigured: getConfig('SPREADSHEET_ID', '') ? true : false,
    spreadsheetIdValue: getConfig('SPREADSHEET_ID', '') ? getConfig('SPREADSHEET_ID', '').substring(0, 15) + '...' : 'NO CONFIGURADO',
    message: 'Deployment actualizado - Login BFF corregido',
    changes: [
      'loginPassword ahora retorna estructura compatible con BFF',
      'Agregado campo user como objeto {username, role, displayName}',
      'Agregado campo expiresAt (timestamp absoluto)',
      'Datos envueltos en campo data como espera Next.js'
    ]
  };
}

/**
 * NOMBRE ÚNICO TIMESTAMP: Función que NUNCA ha existido antes
 * Este nombre es único y Apps Script no puede tenerlo en caché
 */
function bitacora_20250115_v6_UNICO() {
  // Mismo código que bitacoraGetAllDataV3Final pero con nombre único
  var resultado = {
    ok: false,
    error: 'Función no ejecutada',
    data: [],
    debug: [],
    nombreFuncion: 'bitacora_20250115_v6_UNICO',
    timestamp: new Date().toISOString()
  };

  try {
    resultado.debug.push('Inicio de función CON NOMBRE ÚNICO');

    // Paso 1: Verificar SheetsIO
    resultado.debug.push('Verificando SheetsIO...');
    if (typeof SheetsIO === 'undefined') {
      resultado.error = 'SheetsIO no disponible';
      resultado.debug.push('ERROR: SheetsIO undefined');
      return resultado;
    }
    resultado.debug.push('SheetsIO OK');

    // Paso 2: Obtener SPREADSHEET_ID
    resultado.debug.push('Obteniendo SPREADSHEET_ID...');
    var ssId = '';
    try {
      ssId = getConfig('SPREADSHEET_ID', '');
      resultado.debug.push('SPREADSHEET_ID: ' + (ssId ? ssId.substring(0, 10) + '...' : 'VACÍO'));
    } catch (e) {
      resultado.debug.push('ERROR obteniendo SPREADSHEET_ID: ' + e.message);
    }

    if (!ssId) {
      resultado.error = 'SPREADSHEET_ID no configurado en config.js';
      resultado.debug.push('ERROR: SPREADSHEET_ID vacío');
      return resultado;
    }

    // Paso 3: Leer hoja usando SheetsIO
    resultado.debug.push('Llamando a SheetsIO.readSheet...');
    var bitacoraData = null;
    try {
      bitacoraData = SheetsIO.readSheet('Bitacora_Gestiones_EECC');
      resultado.debug.push('readSheet completado');
    } catch (readError) {
      resultado.error = 'Error al leer hoja: ' + readError.message;
      resultado.debug.push('ERROR en readSheet: ' + readError.message);
      return resultado;
    }

    // Paso 4: Verificar datos
    resultado.debug.push('Verificando datos leídos...');
    if (!bitacoraData) {
      resultado.error = 'readSheet devolvió null';
      resultado.debug.push('ERROR: bitacoraData es null');
      return resultado;
    }

    if (!bitacoraData.rows) {
      resultado.ok = true;
      resultado.data = [];
      resultado.mensaje = 'Hoja vacía (sin rows)';
      resultado.debug.push('Hoja sin datos');
      return resultado;
    }

    resultado.debug.push('Filas encontradas: ' + bitacoraData.rows.length);

    // Paso 5: Convertir a formato
    resultado.debug.push('Convirtiendo datos...');
    var ciclos = [];
    for (var i = 0; i < bitacoraData.rows.length; i++) {
      var row = bitacoraData.rows[i];

      if (!row || (!row[0] && !row[5])) {
        continue;
      }

      ciclos.push({
        idCiclo: String(row[0] || ''),
        idGestion: String(row[1] || ''),
        origenRegistro: String(row[2] || ''),
        fechaEnvioEECC: row[3] || null,
        fechaRegistro: row[4] || null,
        asegurado: String(row[5] || ''),
        ruc: String(row[6] || ''),
        responsable: String(row[7] || ''),
        tipoGestion: String(row[8] || ''),
        estadoGestion: String(row[9] || ''),
        canalContacto: String(row[10] || ''),
        fechaCompromiso: row[11] || null,
        proximaAccion: String(row[12] || ''),
        observaciones: String(row[13] || ''),
        diasDesdeRegistro: 0,
        numGestiones: 1
      });
    }

    resultado.debug.push('Ciclos procesados: ' + ciclos.length);

    resultado = {
      ok: true,
      data: ciclos,
      count: ciclos.length,
      mensaje: 'Lectura exitosa',
      debug: resultado.debug,
      nombreFuncion: 'bitacora_20250115_v6_UNICO'
    };

    return resultado;

  } catch (error) {
    resultado.ok = false;
    resultado.error = 'Excepción capturada: ' + error.message;
    resultado.stack = error.stack || 'No stack available';
    resultado.debug.push('EXCEPCIÓN: ' + error.message);
    return resultado;
  }
}

/**
 * SOLUCIÓN DEFINITIVA: Leer bitácora directamente con SheetsIO
 * Nombre único para evitar conflictos: getBitacoraDataSimple
 */
function bitacoraGetAllDataV3Final() {
  // ⚠️ ULTRA-DEFENSIVE: Esta función SIEMPRE devuelve un objeto
  var resultado = {
    ok: false,
    error: 'Función no ejecutada',
    data: [],
    debug: []
  };

  try {
    resultado.debug.push('Inicio de función');

    // Paso 1: Verificar SheetsIO
    resultado.debug.push('Verificando SheetsIO...');
    if (typeof SheetsIO === 'undefined') {
      resultado.error = 'SheetsIO no disponible';
      resultado.debug.push('ERROR: SheetsIO undefined');
      return resultado;
    }
    resultado.debug.push('SheetsIO OK');

    // Paso 2: Verificar _getSpreadsheet
    resultado.debug.push('Verificando _getSpreadsheet...');
    if (typeof SheetsIO._getSpreadsheet === 'undefined') {
      resultado.error = 'SheetsIO._getSpreadsheet no disponible';
      resultado.debug.push('ERROR: _getSpreadsheet undefined');
      return resultado;
    }
    resultado.debug.push('_getSpreadsheet OK');

    // Paso 3: Obtener SPREADSHEET_ID de config
    resultado.debug.push('Obteniendo SPREADSHEET_ID...');
    var ssId = '';
    try {
      ssId = getConfig('SPREADSHEET_ID', '');
      resultado.debug.push('SPREADSHEET_ID: ' + (ssId ? ssId.substring(0, 10) + '...' : 'VACÍO'));
    } catch (e) {
      resultado.debug.push('ERROR obteniendo SPREADSHEET_ID: ' + e.message);
    }

    if (!ssId) {
      resultado.error = 'SPREADSHEET_ID no configurado en config.js. Ejecuta: obtenerSpreadsheetID()';
      resultado.debug.push('ERROR: SPREADSHEET_ID vacío');
      resultado.instrucciones = [
        '1. En Google Sheets: Menú EECC → Obtener ID para Web App',
        '2. Copia el ID que aparece',
        '3. Pega en gas/config.js línea 12: SPREADSHEET_ID: \'TU_ID\'',
        '4. Ejecuta: clasp push --force',
        '5. Crea NUEVO deployment de Web App'
      ];
      return resultado;
    }

    // Paso 4: Leer hoja
    resultado.debug.push('Llamando a SheetsIO.readSheet...');
    var bitacoraData = null;
    try {
      bitacoraData = SheetsIO.readSheet('Bitacora_Gestiones_EECC');
      resultado.debug.push('readSheet completado');
    } catch (readError) {
      resultado.error = 'Error al leer hoja: ' + readError.message;
      resultado.debug.push('ERROR en readSheet: ' + readError.message);
      return resultado;
    }

    // Paso 5: Verificar datos
    resultado.debug.push('Verificando datos leídos...');
    if (!bitacoraData) {
      resultado.error = 'readSheet devolvió null';
      resultado.debug.push('ERROR: bitacoraData es null');
      return resultado;
    }

    if (!bitacoraData.rows) {
      resultado.ok = true;
      resultado.data = [];
      resultado.mensaje = 'Hoja vacía (sin rows)';
      resultado.debug.push('Hoja sin datos');
      return resultado;
    }

    resultado.debug.push('Filas encontradas: ' + bitacoraData.rows.length);

    // Paso 6: Convertir a formato
    resultado.debug.push('Convirtiendo datos...');
    var ciclos = [];
    for (var i = 0; i < bitacoraData.rows.length; i++) {
      var row = bitacoraData.rows[i];

      if (!row || (!row[0] && !row[5])) {
        continue;
      }

      ciclos.push({
        idCiclo: String(row[0] || ''),
        idGestion: String(row[1] || ''),
        origenRegistro: String(row[2] || ''),
        fechaEnvioEECC: row[3] || null,
        fechaRegistro: row[4] || null,
        asegurado: String(row[5] || ''),
        ruc: String(row[6] || ''),
        responsable: String(row[7] || ''),
        tipoGestion: String(row[8] || ''),
        estadoGestion: String(row[9] || ''),
        canalContacto: String(row[10] || ''),
        fechaCompromiso: row[11] || null,
        proximaAccion: String(row[12] || ''),
        observaciones: String(row[13] || ''),
        diasDesdeRegistro: 0,
        numGestiones: 1
      });
    }

    resultado.debug.push('Ciclos procesados: ' + ciclos.length);

    resultado = {
      ok: true,
      data: ciclos,
      count: ciclos.length,
      mensaje: 'Lectura exitosa',
      debug: resultado.debug
    };

    return resultado;

  } catch (error) {
    resultado.ok = false;
    resultado.error = 'Excepción capturada: ' + error.message;
    resultado.stack = error.stack || 'No stack available';
    resultado.debug.push('EXCEPCIÓN: ' + error.message);
    return resultado;
  }
}

// ========== LOGIN / LOGOUT ==========

/**
 * Infiere el rol del usuario basado en su nombre de usuario
 * P1-FIX: Uses explicit AUTH.ADMIN_USERS list for admin check (consistent with isAdminSession_)
 * @param {string} username - Nombre de usuario
 * @return {string} Rol del usuario (ADMIN, COBRANZAS, LECTURA)
 */
function _inferUserRole(username) {
  const lowerUser = String(username).toLowerCase().trim();

  // P1-FIX: Check explicit admin list instead of prefix matching
  const adminUsers = getConfig('AUTH.ADMIN_USERS', []);
  if (adminUsers.some(admin => admin.toLowerCase().trim() === lowerUser)) return 'ADMIN';

  if (lowerUser.startsWith('cobranzas')) return 'COBRANZAS';
  if (lowerUser.startsWith('supervisor')) return 'SUPERVISOR';
  if (lowerUser.startsWith('comercial')) return 'COMERCIAL';
  return 'LECTURA'; // Default role
}

/**
 * Login con transformación de respuesta para BFF
 * IMPORTANTE: Esta función transforma la respuesta de AuthService.login
 * al formato esperado por el BFF de Next.js
 * 
 * @param {string} username
 * @param {string} password
 * @return {Object} { ok, data: { token, user: { username, role }, expiresAt } }
 */
function loginPassword(username, password) {
  try {
    // Llamar al servicio de autenticación original
    const result = AuthService.login(username, password);

    // Si el login falló, retornar error en formato BFF
    if (!result.ok) {
      return {
        ok: false,
        data: null,
        error: {
          code: 'AUTH_FAILED',
          message: result.error || 'Credenciales inválidas'
        }
      };
    }

    // Transformar respuesta exitosa al formato esperado por BFF
    // BFF espera: { ok, data: { token, user: { username, role, displayName }, expiresAt } }
    const userRole = _inferUserRole(result.user);
    const expiresAtMs = Date.now() + ((result.expiresIn || 28800) * 1000);

    const displayNames = getConfig('AUTH.USER_DISPLAY_NAMES', {});
    const displayName = displayNames[result.user] || result.user;

    return {
      ok: true,
      data: {
        token: result.token,
        user: {
          username: result.user,
          role: userRole,
          displayName: displayName,
          nombre: displayName
        },
        expiresAt: expiresAtMs
      }
    };

  } catch (error) {
    Logger.error('loginPassword', 'Failed', error);
    return {
      ok: false,
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error interno del servidor'
      }
    };
  }
}

function logout(token) {
  try {
    return AuthService.logout(token);
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// P0-FIX: Removed duplicate healthCheck (kept Phase 6 version below)

// ========== PHASE 3: MONITORING ENDPOINTS ==========

/**
 * Consolidated initial data load - reduces 4 google.script.run calls to 1
 * Returns: dashboardStats, queueHealth, grupos
 * @param {string} token - Session token
 * @return {Object} { ok, dashboardStats, queueHealth, grupos }
 */
function obtenerDatosIniciales(token) {
  const context = 'obtenerDatosIniciales';
  try {
    AuthService.validateSession(token);

    var dashboardStats = null;
    var queueHealth = null;
    var grupos = null;

    try { dashboardStats = MonitoringService.getDashboardStats(); } catch (e) {
      Logger.warn(context, 'dashboardStats failed', e);
    }
    try { queueHealth = MonitoringService.getMailQueueHealth(); } catch (e) {
      Logger.warn(context, 'queueHealth failed', e);
    }
    try { grupos = GrupoEconomicoService.getGrupos(); } catch (e) {
      Logger.warn(context, 'grupos failed', e);
    }

    return {
      ok: true,
      dashboardStats: dashboardStats || { ok: false },
      queueHealth: queueHealth || { ok: false },
      grupos: grupos || []
    };
  } catch (error) {
    Logger.error(context, 'Failed', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Consolidated dashboard refresh - reduces 2 polling calls to 1
 * @param {string} token - Session token
 * @return {Object} { ok, dashboardStats, queueHealth }
 */
function refreshDashboardConsolidado(token) {
  const context = 'refreshDashboardConsolidado';
  try {
    AuthService.validateSession(token);

    var dashboardStats = null;
    var queueHealth = null;

    try { dashboardStats = MonitoringService.getDashboardStats(); } catch (e) {
      Logger.warn(context, 'dashboardStats failed', e);
    }
    try { queueHealth = MonitoringService.getMailQueueHealth(); } catch (e) {
      Logger.warn(context, 'queueHealth failed', e);
    }

    return {
      ok: true,
      dashboardStats: dashboardStats || { ok: false },
      queueHealth: queueHealth || { ok: false }
    };
  } catch (error) {
    Logger.error(context, 'Failed', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get dashboard statistics (cached, soft-fail)
 * @param {string} token - Session token
 * @return {Object} Dashboard stats
 */
function getDashboardStats(token) {
  const context = 'getDashboardStats';
  try {
    AuthService.validateSession(token);
    return MonitoringService.getDashboardStats();
  } catch (error) {
    Logger.error(context, 'Failed to get dashboard stats', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Get mail queue health status (cached, soft-fail)
 * @param {string} token - Session token
 * @return {Object} Queue health status
 */
function getMailQueueHealth(token) {
  const context = 'getMailQueueHealth';
  try {
    AuthService.validateSession(token);
    return MonitoringService.getMailQueueHealth();
  } catch (error) {
    Logger.error(context, 'Failed to get queue health', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Phase 5: Get all notifications for dual-tab center
 * @param {string} token - Session token
 * @return {Object} { ok, compromisos, pipeline, counts }
 */
function getNotificationsComplete(token) {
  const context = 'getNotificationsComplete';
  try {
    AuthService.validateSession(token);

    // Check feature flag
    if (!getConfig('FEATURES.NOTIFICATIONS_CENTER_V2', false)) {
      return { ok: false, error: 'Feature disabled', compromisos: [], pipeline: [], counts: { total: 0 } };
    }

    return NotificationService.getAllNotifications(token);
  } catch (error) {
    Logger.error(context, 'Failed to get notifications', error);
    return { ok: false, error: error.message, compromisos: [], pipeline: [], counts: { total: 0 } };
  }
}

/**
 * Phase 5: Get a feature flag value (for client-side feature toggling)
 * @param {string} flagName - Name of the flag (e.g., 'QUICK_ACTIONS_ENABLED')
 * @return {boolean} Flag value (default false)
 */
function getFeatureFlag(flagName) {
  try {
    return getConfig('FEATURES.' + flagName, false);
  } catch (error) {
    return false;
  }
}

/**
 * Phase 6: Check if session user is admin
 *
 * P1-1 SECURITY: Uses explicit AUTH.ADMIN_USERS list instead of
 * username-based inference. This prevents "admin_malicious" from
 * gaining admin access.
 *
 * @param {string} token - Session token
 * @return {boolean} True if admin
 */
function isAdminSession_(token) {
  try {
    const username = AuthService.validateSession(token);
    if (!username) return false;

    // P1-1: Check against explicit admin list (case-insensitive)
    const adminUsers = getConfig('AUTH.ADMIN_USERS', []);
    const normalizedUsername = username.toLowerCase().trim();

    return adminUsers.some(admin =>
      admin.toLowerCase().trim() === normalizedUsername
    );
  } catch (error) {
    return false;
  }
}

/**
 * Phase 6: Get mail templates (admin only, read-only)
 * @param {string} token - Session token
 * @return {Object} { ok, templates: [...] }
 */
function getMailTemplates(token) {
  const context = 'getMailTemplates';
  try {
    // Check feature flag
    if (!getConfig('FEATURES.TEMPLATE_VIEWER_ENABLED', false)) {
      return { ok: false, error: 'Feature disabled' };
    }

    // Validate session
    AuthService.validateSession(token);

    // Check admin (simple approach: we'll allow all authenticated users for now)
    // In production, implement proper role check
    // if (!isAdminSession_(token)) {
    //   return { ok: false, error: 'Acceso denegado: requiere permisos de administrador' };
    // }

    // Read Mail_Templates sheet
    // P2-FIX: Use SheetsIO._getSpreadsheet() for consistent access
    const sheetName = getConfig('SHEETS.MAIL_TEMPLATES', 'Mail_Templates');
    const ss = SheetsIO._getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return { ok: false, error: 'Hoja Mail_Templates no encontrada', templates: [] };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { ok: true, templates: [], message: 'No hay templates configurados' };
    }

    const headers = data[0].map(h => String(h).trim().toUpperCase());
    const templates = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const template = {};
      headers.forEach((h, idx) => {
        template[h] = row[idx];
      });
      template._rowIndex = i + 1;
      templates.push(template);
    }

    Logger.info(context, `Loaded ${templates.length} templates`);
    return { ok: true, templates };

  } catch (error) {
    Logger.error(context, 'Error loading templates', error);
    return { ok: false, error: error.message, templates: [] };
  }
}

/**
 * Phase 6: System health check endpoint
 * @param {string} token - Session token
 * @return {Object} { status, timestamp, checks }
 */
function healthCheck(token) {
  const context = 'healthCheck';
  try {
    // Check feature flag
    if (!getConfig('FEATURES.HEALTH_CHECK_ENABLED', false)) {
      return { ok: false, status: 'DISABLED', error: 'Feature disabled' };
    }

    // Validate session (optional for health check, but recommended)
    AuthService.validateSession(token);

    const checks = {};
    let overallStatus = 'OK';

    // Check 1: Spreadsheet access
    // P2-FIX: Use SheetsIO._getSpreadsheet() for consistent access
    try {
      const ss = SheetsIO._getSpreadsheet();
      ss.getSheetByName('BD'); // Just access, don't read data
      checks.spreadsheet = { status: 'OK', message: 'Acceso confirmado' };
    } catch (e) {
      checks.spreadsheet = { status: 'ERROR', message: e.message };
      overallStatus = 'ERROR';
    }

    // Check 2: Required sheets exist
    try {
      const ss = SheetsIO._getSpreadsheet();
      const requiredSheets = ['BD', 'EECC_Template', 'Bitacora_Gestiones_EECC'];
      const missing = [];
      requiredSheets.forEach(name => {
        if (!ss.getSheetByName(name)) missing.push(name);
      });
      if (missing.length > 0) {
        checks.sheets = { status: 'WARNING', message: `Faltan: ${missing.join(', ')}` };
        if (overallStatus !== 'ERROR') overallStatus = 'WARNING';
      } else {
        checks.sheets = { status: 'OK', message: 'Todas las hojas existen' };
      }
    } catch (e) {
      checks.sheets = { status: 'ERROR', message: e.message };
      overallStatus = 'ERROR';
    }

    // Check 3: Triggers installed
    try {
      const triggers = ScriptApp.getProjectTriggers();
      checks.triggers = {
        status: 'OK',
        message: `${triggers.length} trigger(s) instalado(s)`,
        count: triggers.length
      };
    } catch (e) {
      checks.triggers = { status: 'WARNING', message: e.message };
    }

    Logger.info(context, 'Health check completed', { status: overallStatus });

    return {
      ok: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks
    };

  } catch (error) {
    Logger.error(context, 'Health check failed', error);
    return {
      ok: false,
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ========== GET ASEGURADOS ==========
function getAseguradosSafe(token) {
  const context = 'getAseguradosSafe';

  try {
    AuthService.validateSession(token);

    const cacheKey = 'asegurados:v2';
    const cache = CacheService.getScriptCache();

    const cached = cache.get(cacheKey);
    if (cached) {
      Logger.debug(context, 'From cache');
      return { ok: true, list: JSON.parse(cached), cached: true };
    }

    // OPTIMIZADO: Leer solo la columna ASEGURADO en vez de toda la hoja
    const ss = SheetsIO._getSpreadsheet();
    const sheet = ss.getSheetByName(getConfig('SHEETS.BASE'));
    if (!sheet) throw new Error('Hoja BD no encontrada');

    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    const aseguradoColName = getConfig('BD.COLUMNS.ASEGURADO');
    let aseguradoColIdx = -1;
    for (let i = 0; i < headers.length; i++) {
      if (Utils.cleanText(headers[i]) === Utils.cleanText(aseguradoColName)) {
        aseguradoColIdx = i + 1;
        break;
      }
    }

    if (aseguradoColIdx === -1) throw new Error('Columna ASEGURADO no encontrada');

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { ok: true, list: [], cached: false };

    const colData = sheet.getRange(2, aseguradoColIdx, lastRow - 1, 1).getValues();
    const set = new Set();
    colData.forEach(row => {
      const val = Utils.cleanText(row[0]);
      if (val) set.add(val);
    });

    const list = Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));

    const ttl = getConfig('LIMITS.CACHE_TTL_SECONDS', 300);
    cache.put(cacheKey, JSON.stringify(list), ttl);

    Logger.info(context, 'Calculated', { count: list.length });
    return { ok: true, list, cached: false };

  } catch (error) {
    Logger.error(context, 'Failed', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Phase 1: Paginated endpoint with efficient column read
 * DOES NOT break existing getAseguradosSafe (zero regression)
 * 
 * @param {string} token - Session token
 * @param {Object} options - { limit, cursor, search }
 * @return {Object} { ok, items, nextCursor, total, hasMore }
 */
function getAseguradosPaged(token, options = {}) {
  const context = 'getAseguradosPaged';
  const { limit = 100, cursor = null, search = '' } = options || {};

  try {
    AuthService.validateSession(token);

    // Cache key for efficient column read
    const cacheKey = 'asegurados:paged:v1';
    const cache = CacheService.getScriptCache();
    let allAsegurados;

    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      allAsegurados = JSON.parse(cached);
      Logger.debug(context, 'From cache', { count: allAsegurados.length });
    } else {
      // EFFICIENT READ: Only read headers + ASEGURADO column
      // P2-FIX: Use SheetsIO._getSpreadsheet() for Web App compatibility
      const ss = SheetsIO._getSpreadsheet();
      const sheet = ss.getSheetByName(getConfig('SHEETS.BASE'));
      if (!sheet) {
        throw new Error('Hoja BD no encontrada');
      }

      // Read headers (row 1 only)
      const lastCol = sheet.getLastColumn();
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

      // Find ASEGURADO column index
      const aseguradoColName = getConfig('BD.COLUMNS.ASEGURADO');
      let aseguradoColIdx = -1;
      for (let i = 0; i < headers.length; i++) {
        if (Utils.cleanText(headers[i]) === Utils.cleanText(aseguradoColName)) {
          aseguradoColIdx = i + 1; // 1-indexed for getRange
          break;
        }
      }

      if (aseguradoColIdx === -1) {
        throw new Error('Columna ASEGURADO no encontrada');
      }

      // Read ONLY the ASEGURADO column (efficient)
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        allAsegurados = [];
      } else {
        const colData = sheet.getRange(2, aseguradoColIdx, lastRow - 1, 1).getValues();

        // Unique + trim + filter empty
        const set = new Set();
        colData.forEach(row => {
          const val = Utils.cleanText(row[0]);
          if (val) set.add(val);
        });

        allAsegurados = Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
      }

      // Cache for 10 minutes
      cache.put(cacheKey, JSON.stringify(allAsegurados), 600);
      Logger.info(context, 'Built list from column read', { count: allAsegurados.length });
    }

    // Apply search filter
    let filtered = allAsegurados;
    if (search && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = allAsegurados.filter(a => a.toLowerCase().includes(searchLower));
    }

    // Apply cursor pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIdx = filtered.findIndex(a => a === cursor);
      startIndex = cursorIdx >= 0 ? cursorIdx + 1 : 0;
    }

    // Slice page
    const effectiveLimit = Math.min(Math.max(1, Number(limit) || 100), 500);
    const page = filtered.slice(startIndex, startIndex + effectiveLimit);
    const nextCursor = page.length === effectiveLimit ? page[page.length - 1] : null;

    return {
      ok: true,
      items: page,
      nextCursor,
      total: filtered.length,
      hasMore: nextCursor !== null
    };

  } catch (error) {
    Logger.error(context, 'Failed', error);
    return { ok: false, error: error.message };
  }
}


// ========== PREVIEW ASEGURADO ==========
function previewAsegurado(asegurado, maxRows, includeObs, obsForRAM, token) {
  const context = 'previewAsegurado';

  try {
    AuthService.validateSession(token);

    maxRows = Number(maxRows || 200);
    includeObs = !!includeObs;

    let obsForRAMSet = null;
    if (includeObs) {
      if (Array.isArray(obsForRAM)) {
        obsForRAMSet = new Set(obsForRAM);
      } else if (obsForRAM === '__ALL__') {
        obsForRAMSet = '__ALL__';
      } else {
        obsForRAMSet = new Set([obsForRAM || '__ALL__']);
      }
    }

    const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
    const columnMap = {};

    ['ASEGURADO', 'CIA', 'POLIZA', 'RAM', 'NUM_CUOTA', 'CUPON', 'MON', 'IMPORTE',
      'VIG_DEL', 'VIG_AL', 'FEC_VENCIMIENTO_COB'].forEach(col => {
        const idx = Utils.findColumnIndex(baseData.headers, getConfig(`BD.COLUMNS.${col}`, col));
        if (idx >= 0) columnMap[col] = idx;
      });

    if (includeObs) {
      const obsIdx = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.MOTIVO'));
      if (obsIdx >= 0) columnMap.MOTIVO = obsIdx;
    }

    if (columnMap.ASEGURADO === undefined) {
      throw new Error('Columna ASEGURADO no encontrada');
    }

    const rows = baseData.rows.filter(row =>
      Utils.cleanText(row[columnMap.ASEGURADO]) === Utils.cleanText(asegurado)
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const setRAMs = new Set();
    const output = [];

    for (const row of rows) {
      const ram = Utils.cleanText(row[columnMap.RAM]);
      if (ram) setRAMs.add(ram);

      const fecVenc = row[columnMap.FEC_VENCIMIENTO_COB];
      let dias = '';
      if (fecVenc instanceof Date && !isNaN(fecVenc)) {
        dias = Utils.daysBetween(today, fecVenc);
      }

      let obs = '';
      if (includeObs && columnMap.MOTIVO !== undefined) {
        if (obsForRAMSet === '__ALL__') {
          obs = row[columnMap.MOTIVO] || '';
        } else if (obsForRAMSet && obsForRAMSet.has && obsForRAMSet.has(ram)) {
          obs = row[columnMap.MOTIVO] || '';
        }
      }

      const outRow = [
        row[columnMap.CIA],
        row[columnMap.POLIZA],
        ram,
        row[columnMap.NUM_CUOTA],
        row[columnMap.CUPON],
        Utils.currencyDisplay(row[columnMap.MON]),
        row[columnMap.IMPORTE],
        Utils.formatDate(row[columnMap.VIG_DEL]),
        Utils.formatDate(row[columnMap.VIG_AL]),
        Utils.formatDate(fecVenc),
        dias
      ];

      if (includeObs) {
        outRow.push(obs);
      }

      output.push(outRow);
    }

    const headers = ['CIA', 'POLIZA', 'RAM', 'N°', 'CUPÓN', 'MON', 'IMPORTE',
      'VIG. DESDE', 'VIG. HASTA', 'FEC. VENC', 'DÍAS'];

    if (includeObs) {
      headers.push('OBS');
    }

    return {
      headers,
      rows: output.slice(0, maxRows),
      total: output.length,
      rams: Array.from(setRAMs).sort()
    };

  } catch (error) {
    Logger.error(context, 'Failed', error);
    throw error;
  }
}

// ========== GENERAR EECC ==========
function generateForAsegurado_API(nombreAseg, opts, token) {
  const context = 'generateForAsegurado_API';

  try {
    const portalUser = AuthService.validateSession(token);
    opts = opts || {};
    opts.portalUser = portalUser;
    return EECCCore.generateHeadless(nombreAseg, opts);
  } catch (error) {
    Logger.error(context, 'Failed', error);
    return { ok: false, error: error.message };
  }
}

// ========== SUBIR ARCHIVO ==========
function subirArchivoBase(payload, token) {
  const context = 'subirArchivoBase';
  const startTime = Date.now();

  try {
    if (token) {
      AuthService.validateSession(token);
    }

    if (!payload || !payload.dataBase64) {
      throw new Error('Archivo no recibido');
    }

    // Validar tipo de archivo por extensión
    const nameLower = String(payload.name || '').toLowerCase();
    if (!nameLower.endsWith('.xlsx') && !nameLower.endsWith('.xls') && !nameLower.endsWith('.csv')) {
      throw new Error('Tipo de archivo no permitido. Solo se aceptan .xlsx, .xls, .csv');
    }

    var decoded;
    try {
      decoded = Utilities.base64Decode(payload.dataBase64);
    } catch (decodeErr) {
      throw new Error('Archivo corrupto o mal codificado');
    }

    const blob = Utilities.newBlob(
      decoded,
      payload.mimeType || 'application/octet-stream',
      payload.name || 'archivo'
    );
    let headers = [];
    let rows = [];

    if (nameLower.endsWith('.csv')) {
      const csv = blob.getDataAsString('UTF-8');
      const arr = Utilities.parseCsv(csv);

      if (payload.tieneEncabezado && arr.length > 0) {
        headers = arr[0].map(String);
        rows = arr.slice(1);
      } else {
        rows = arr;
      }
    } else {
      const uploadResult = DriveIO.uploadTempFile(blob, true);

      try {
        const tempSS = SpreadsheetApp.openById(uploadResult.fileId);
        const sheet = tempSS.getSheets()[0];
        const vals = sheet.getDataRange().getValues();

        if (payload.tieneEncabezado && vals.length > 0) {
          headers = vals[0].map(String);
          rows = vals.slice(1);
        } else {
          rows = vals;
        }
      } finally {
        DriveIO.deleteFile(uploadResult.fileId);
      }
    }

    const result = SheetsIO.updateBaseSheet(headers, rows);
    const duration = Date.now() - startTime;

    Logger.info(context, 'Complete', { duration, rows: result.rowsWritten });

    CacheService.getScriptCache().remove('asegurados:v2');

    // Guardar metadata del último upload
    try {
      var uploaderName = '';
      // 1. Intentar desde sesión del portal
      if (token) {
        try {
          var sess = AuthService.getSessionData(token);
          if (sess) uploaderName = sess.displayName || sess.nombre || sess.username || sess.email || '';
        } catch (e) { /* ignore */ }
      }
      // 2. Fallback: Session API
      if (!uploaderName) {
        uploaderName = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'Desconocido';
      }
      PropertiesService.getScriptProperties().setProperty('BD_LAST_UPLOAD', JSON.stringify({
        user: uploaderName,
        date: new Date().toISOString(),
        rows: result.rowsWritten
      }));
    } catch (metaErr) {
      Logger.warn(context, 'No se pudo guardar metadata de upload', metaErr);
    }

    return {
      ok: true,
      filas: result.rowsWritten,
      mensaje: `Importación completa (${result.duplicatesRemoved} duplicados eliminados)`,
      duplicatesRemoved: result.duplicatesRemoved,
      warnings: result.warnings || [],
      t: { total: duration }
    };

  } catch (error) {
    Logger.error(context, 'Failed', error);
    return {
      ok: false,
      mensaje: error.message,
      t: { total: Date.now() - startTime }
    };
  }
}

// ========== BASE: ESTADO ==========
function getBaseStatus(token) {
  const context = 'getBaseStatus';
  try {
    if (token) {
      AuthService.validateSession(token);
    }

    const sheetName = getConfig('SHEETS.BASE', 'BD');
    const ss = SheetsIO._getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return { ok: true, loaded: false, rows: 0, lastModified: null };
    }

    const lastRow = sheet.getLastRow();
    var lastModified = null;
    try {
      var file = DriveApp.getFileById(ss.getId());
      lastModified = file.getLastUpdated().toISOString();
    } catch (e) {
      // fallback: no date available
    }

    // Leer metadata del último upload
    var uploadedBy = null;
    var uploadDate = lastModified;
    try {
      var meta = PropertiesService.getScriptProperties().getProperty('BD_LAST_UPLOAD');
      if (meta) {
        var parsed = JSON.parse(meta);
        uploadedBy = parsed.user || null;
        if (parsed.date) uploadDate = parsed.date;
      }
    } catch (e) { /* ignore */ }

    return {
      ok: true,
      loaded: lastRow > 1,
      rows: Math.max(0, lastRow - 1),
      lastModified: uploadDate,
      uploadedBy: uploadedBy
    };
  } catch (error) {
    Logger.error(context, 'Failed', error);
    return { ok: false, error: error.message };
  }
}

// ========== MAIL: CARGAR CONTACTOS ==========
function loadContactsFromSheet() {
  const context = 'loadContactsFromSheet';

  try {
    const sheetName = 'Mail_Contacts';
    // P1-FIX: Use SheetsIO._getSpreadsheet() for Web App compatibility
    const ss = SheetsIO._getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(`Hoja "${sheetName}" no encontrada.`);
    }

    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      throw new Error('La hoja de contactos está vacía. Agrega al menos una fila de datos.');
    }

    const headers = data[0].map(h => String(h).trim().toUpperCase());
    const rows = data.slice(1);

    Logger.info(context, 'Headers encontrados', { headers });

    // Mapear columnas con MÚLTIPLES VARIANTES posibles
    const colMap = {
      aseguradoId: findHeaderIndex(headers, ['ASEGURADO_ID', 'ASEGURADO ID', 'ID']),
      aseguradoNombre: findHeaderIndex(headers, ['ASEGURADO_NOMBRE', 'ASEGURADO NOMBRE', 'NOMBRE']),

      // SOPORTAR AMBOS FORMATOS:
      // Formato 1: EMAIL_TO, EMAIL_CC, EMAIL_BCC (separados)
      // Formato 2: EMAIL (todo en una columna)
      emailTo: findHeaderIndex(headers, ['EMAIL_TO', 'EMAIL TO', 'TO', 'PARA', 'EMAIL']),
      emailCc: findHeaderIndex(headers, ['EMAIL_CC', 'EMAIL CC', 'CC']),
      emailBcc: findHeaderIndex(headers, ['EMAIL_BCC', 'EMAIL BCC', 'BCC', 'CCO']),

      saludo: findHeaderIndex(headers, ['SALUDO', 'GREETING']),
      plantilla: findHeaderIndex(headers, ['PLANTILLA', 'TEMPLATE']),
      observaciones: findHeaderIndex(headers, ['OBSERVACIONES', 'OBS', 'NOTES', 'OBS_OFICINA_ACTIVE'])
    };

    if (colMap.aseguradoId === -1 || colMap.emailTo === -1) {
      throw new Error('Faltan columnas requeridas. Asegúrate de tener: ASEGURADO_ID y EMAIL (o EMAIL_TO)');
    }

    Logger.info(context, 'Column mapping', colMap);

    const contacts = rows
      .filter(row => row[colMap.aseguradoId] && String(row[colMap.aseguradoId]).trim())
      .map(row => {
        const asegId = String(row[colMap.aseguradoId]).trim();

        // Parsear emails - soportar ambos formatos
        let emailTo = [];
        let emailCc = [];
        let emailBcc = [];

        // Si tiene EMAIL_TO específico, usarlo
        if (colMap.emailTo >= 0 && row[colMap.emailTo]) {
          emailTo = parseEmails(row[colMap.emailTo]);
        }

        // Si tiene EMAIL_CC, usarlo
        if (colMap.emailCc >= 0 && row[colMap.emailCc]) {
          emailCc = parseEmails(row[colMap.emailCc]);
        }

        // Si tiene EMAIL_BCC, usarlo
        if (colMap.emailBcc >= 0 && row[colMap.emailBcc]) {
          emailBcc = parseEmails(row[colMap.emailBcc]);
        }

        // Si emailTo está vacío pero colMap.emailCc tiene algo, 
        // significa que solo hay una columna EMAIL y va todo a TO
        if (emailTo.length === 0 && colMap.emailTo >= 0) {
          emailTo = parseEmails(row[colMap.emailTo]);
        }

        return {
          aseguradoId: asegId,
          aseguradoNombre: colMap.aseguradoNombre >= 0 && row[colMap.aseguradoNombre]
            ? String(row[colMap.aseguradoNombre]).trim()
            : asegId,
          emailTo: emailTo,
          emailCc: emailCc,
          emailBcc: emailBcc,
          saludo: colMap.saludo >= 0 && row[colMap.saludo]
            ? String(row[colMap.saludo]).trim()
            : 'Estimados',
          plantilla: colMap.plantilla >= 0 && row[colMap.plantilla]
            ? String(row[colMap.plantilla]).trim()
            : 'REGULAR',
          observaciones: colMap.observaciones >= 0 && row[colMap.observaciones]
            ? String(row[colMap.observaciones]).trim()
            : ''
        };
      })
      .filter(contact => contact.emailTo.length > 0); // Solo contactos con al menos un email

    Logger.info(context, 'Contacts loaded', { count: contacts.length });

    if (contacts.length === 0) {
      throw new Error('No se encontraron contactos válidos con emails en la hoja Mail_Contacts');
    }

    return contacts;

  } catch (error) {
    Logger.error(context, 'Failed to load contacts', error);
    throw error;
  }
}

function findHeaderIndex(headers, possibleNames) {
  for (const name of possibleNames) {
    const index = headers.indexOf(name);
    if (index >= 0) return index;
  }
  return -1;
}

function parseEmails(emailString) {
  if (!emailString) return [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return String(emailString)
    .split(/[,;]/)
    .map(email => email.trim().replace(/[\r\n]/g, ''))
    .filter(email => email && emailRegex.test(email));
}

/**
 * Escapa HTML para prevenir inyección en templates de email
 */
function _escapeHtmlServer(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ========== MAIL: PREPARAR ADJUNTOS ==========
function prepareAttachments(eeccResult) {
  const context = 'prepareAttachments';
  const blobs = [];
  const urls = [];

  try {
    if (eeccResult.pdfUrl) {
      const pdfId = extractFileId(eeccResult.pdfUrl);
      if (pdfId) {
        try {
          const file = DriveApp.getFileById(pdfId);
          blobs.push(file.getBlob());
          urls.push(eeccResult.pdfUrl);
          Logger.debug(context, 'PDF attached', { id: pdfId });
        } catch (error) {
          Logger.warn(context, 'Could not get PDF blob', error);
        }
      }
    }

    if (eeccResult.xlsxUrl) {
      const xlsxId = extractFileId(eeccResult.xlsxUrl);
      if (xlsxId) {
        try {
          const file = DriveApp.getFileById(xlsxId);
          blobs.push(file.getBlob());
          urls.push(eeccResult.xlsxUrl);
          Logger.debug(context, 'XLSX attached', { id: xlsxId });
        } catch (error) {
          Logger.warn(context, 'Could not get XLSX blob', error);
        }
      }
    }

  } catch (error) {
    Logger.error(context, 'Failed', error);
  }

  return { blobs, urls };
}

function extractFileId(url) {
  if (!url) return null;

  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /[-\w]{25,}/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }

  return null;
}

// ========== MAIL: RENDERIZAR BODY ==========
function renderEmailBody(data) {
  const templates = getConfig('MAIL.TEMPLATES');
  const template = templates.REGULAR;

  let bodyHtml = template.body;

  bodyHtml = bodyHtml.replace(/{{ASEGURADO}}/g, _escapeHtmlServer(data.asegurado));
  bodyHtml = bodyHtml.replace(/{{FECHA_CORTE}}/g, _escapeHtmlServer(data.fechaCorte));
  bodyHtml = bodyHtml.replace(/{{SALUDO}}/g, _escapeHtmlServer(data.saludo || 'Estimados'));

  if (data.observaciones) {
    bodyHtml = bodyHtml.replace(/{{OBS_OPCIONAL}}/g, `<p style="margin-top: 1rem; padding: 1rem; background: #FFF3E0; border-left: 4px solid #F57C00; border-radius: 4px;"><strong>Nota:</strong> ${_escapeHtmlServer(data.observaciones)}</p>`);
  } else {
    bodyHtml = bodyHtml.replace(/{{OBS_OPCIONAL}}/g, '');
  }

  const signature = getConfig('BRAND.SIGNATURE_HTML');
  bodyHtml += signature;

  return bodyHtml;
}

// ========== MAIL: ENVIAR PRUEBA ==========
function sendTestEmail(params, token) {
  const context = 'sendTestEmail';

  try {
    AuthService.validateSession(token);

    if (!params.aseguradoId) {
      return { ok: false, error: 'aseguradoId es requerido' };
    }

    Logger.info(context, 'Sending test email', { aseguradoId: params.aseguradoId });

    const contacts = loadContactsFromSheet();
    const contact = contacts.find(c => c.aseguradoId === params.aseguradoId);

    if (!contact) {
      return { ok: false, error: `No se encontró contacto para "${params.aseguradoId}" en la hoja Mail_Contacts` };
    }

    if (!contact.emailTo || contact.emailTo.length === 0) {
      return { ok: false, error: `No hay destinatarios (EMAIL_TO) configurados para "${params.aseguradoId}"` };
    }

    // Generar EECC
    Logger.info(context, 'Generating EECC');
    const eecc = EECCCore.generateHeadless(params.aseguradoId, {
      exportPdf: true,
      exportXlsx: true,
      includeObs: false,
      obsForRAM: '__ALL__'
    });

    if (!eecc.ok) {
      return { ok: false, error: 'Error generando EECC: ' + eecc.error };
    }

    const attachments = prepareAttachments(eecc);
    const bodyHtml = renderEmailBody({
      asegurado: contact.aseguradoNombre,
      saludo: contact.saludo,
      fechaCorte: Utilities.formatDate(new Date(), getConfig('FORMAT.TIMEZONE'), 'dd/MM/yyyy'),
      observaciones: contact.observaciones
    });

    const subject = `[PRUEBA] EECC ${contact.aseguradoNombre}`;
    const userEmail = Session.getActiveUser().getEmail();

    if (!userEmail || userEmail === '') {
      return { ok: false, error: 'No se pudo obtener tu email. Asegúrate de estar logueado en Google.' };
    }

    Logger.info(context, 'Sending to user', { email: userEmail });

    const messageId = MailerService.sendEmail({
      to: [userEmail],
      cc: [],
      bcc: [],
      subject: subject,
      bodyHtml: `
        <div style="padding: 15px; background: #FFF3CD; border: 2px solid #FFC107; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; font-weight: 600; color: #856404; font-size: 16px;">
            🧪 CORREO DE PRUEBA
          </p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #856404;">
            <strong>Empresa:</strong> ${contact.aseguradoNombre}<br>
            <strong>Los destinatarios REALES serían:</strong><br>
            • TO: ${contact.emailTo.join(', ')}<br>
            ${contact.emailCc.length > 0 ? `• CC: ${contact.emailCc.join(', ')}<br>` : ''}
            ${contact.emailBcc.length > 0 ? `• BCC: ${contact.emailBcc.join(', ')}` : ''}
          </p>
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 2px solid #E0E0E0;">
        ${bodyHtml}
      `,
      blobs: attachments.blobs,
      urls: attachments.urls
    });

    Logger.info(context, 'Test email sent', { messageId });
    return { ok: true, messageId };

  } catch (error) {
    Logger.error(context, 'Test email failed', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Lista los nombres de todos los grupos económicos (para el drawer de emails)
 * @param {string} token - Token de autenticación
 * @return {Array<string>} Lista de nombres de grupos
 */
function listGrupos(token) {
  const context = 'listGrupos';
  try {
    AuthService.validateSession(token);
    const grupos = GrupoEconomicoService.getGrupos();
    Logger.info(context, 'Grupos listados', { count: grupos.length });
    return grupos;
  } catch (error) {
    Logger.error(context, 'Error', error);
    return [];
  }
}

// ========== MAIL: ENVIAR AHORA (REAL) ==========
/**
 * Envía correos con EECC a un lote de asegurados
 * 
 * v3.0 PHASE 0:
 * - LockService para prevenir envíos concurrentes
 * - CorrelationId para trazabilidad end-to-end
 * - Orden correcto: validate → lock → idempotency
 * 
 * v2.0 OPTIMIZADO:
 * - Sin Utilities.sleep() innecesarios (MailApp tiene rate limit nativo)
 * - Flush batch de Logger y Bitácora al final
 * - Telemetría de tiempos por fase
 * 
 * @param {Array} items - Lista de { aseguradoId }
 * @param {Object} options - Opciones de envío
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, sent, failed, errors, details, metrics }
 */
/**
 * Enqueue a batch of emails for background processing
 * @param {Array} items - List of items { aseguradoId } or { groupId }
 * @param {Object} options - { mode, fechaCorte, adjuntarPdf, adjuntarXlsx, templateId }
 * @param {string} token - Session token
 * @return {Object} { ok, count, correlationId }
 */
function queueEmailsBatch_API(items, options, token) {
  const context = 'queueEmailsBatch_API';
  try {
    AuthService.validateSession(token);

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('No items provided');
    }

    const correlationId = Utilities.getUuid();
    Logger.info(context, `Queueing batch of ${items.length} emails`, { correlationId });

    // Ensure MailQueueService is available
    if (typeof MailQueueService === 'undefined') {
      throw new Error('MailQueueService not initialized');
    }

    // Direct batch enqueue
    // Note: options.mode will determine if we resolve groups in the background or here.
    // For now, assuming items are already resolved to individual targets or MailQueueService handles it.
    // Based on existing logic, the UI sends individual "aseguradoId" for "perEmpresa" mode.
    // If "consolidado", it sends "groupId". MailQueueService needs to handle this.

    // For safety, let's map items to the format MailQueueService expects
    const queueItems = items.map(item => ({
      aseguradoId: item.id || item.aseguradoId, // Handle both formats
      type: item.type || 'cliente'
    }));

    const result = MailQueueService.enqueue(queueItems, options, token, correlationId);

    // P2-FIX: Trigger background processing immediately
    // jobProcesarCorreos_ is a standalone function, not a MailQueueService method
    if (result.ok) {
      try {
        jobProcesarCorreos_();
      } catch (e) {
        Logger.warn(context, 'Could not trigger immediate processing', e);
      }
    }

    return result;

  } catch (error) {
    Logger.error(context, 'Failed to queue batch', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Send emails immediately (legacy/synchronous)
 * NOW DEPRECATED in favor of queueEmailsBatch_API for bulk operations
 */
function sendEmailsNow(items, options, token) {
  const context = 'sendEmailsNow';
  const startTime = Date.now();

  // Phase 0: Generate correlationId for this entire operation
  const correlationId = Utilities.getUuid();
  let correlationEnabled = false;
  try {
    correlationEnabled = getConfig('FEATURES.ENABLE_CORRELATION_ID', true);
    if (correlationEnabled) {
      Logger.setCorrelationId(correlationId);
    }
  } catch (corrError) {
    // Non-critical: continue without correlationId
  }

  // Variables for cleanup in finally block
  let lock = null;
  let lockAcquired = false;
  const cache = CacheService.getScriptCache();
  const requestId = options?.requestId || Utilities.getUuid();
  const cacheKey = 'MAIL_SEND::' + requestId;
  let cacheKeySet = false;

  // Métricas internas
  const metrics = {
    loadContactsMs: 0,
    generateEECCMs: 0,
    sendEmailsMs: 0,
    totalMs: 0,
    correlationId: correlationId
  };

  try {
    // ================================================================
    // PASO 1: Validar sesión PRIMERO (rápido, sin side effects)
    // ================================================================
    // P0-1 SECURITY: Support internal auth for queue trigger processing
    // _internalAuth is ONLY valid when combined with skipQueue (trigger-only path)
    const isInternalAuth = options?._internalAuth && options?.skipQueue === true;

    if (isInternalAuth) {
      // Internal trigger auth - no token needed, but log who enqueued
      const enqueuedBy = options._internalAuth.enqueuedBy || 'SYSTEM';
      Logger.info(context, 'Internal auth (queue trigger)', { enqueuedBy, correlationId });
    } else {
      // Normal auth - require valid token
      AuthService.validateSession(token);
    }

    // Phase 1: Mail Queue check (only if enabled and not skipped)
    if (getConfig('FEATURES.MAIL_QUEUE_MODE', false) && !options?.skipQueue) {
      Logger.info(context, 'Mail Queue Mode enabled: Enqueuing items', { count: items.length });
      const queueResult = MailQueueService.enqueue(items, options, token, correlationId);

      return {
        ok: queueResult.ok,
        error: queueResult.error,
        sent: queueResult.count || 0, // Count enqueued items as "sent" (to queue)
        failed: queueResult.ok ? 0 : items.length,
        errors: queueResult.error ? [{ error: queueResult.error }] : [],
        details: (queueResult.queueIds || []).map(id => ({ status: 'queued', queueId: id })),
        metrics: { totalMs: Date.now() - startTime },
        correlationId,
        queued: true // Frontend can use this to show "Scheduled" instead of "Sent"
      };
    }

    // ================================================================
    // PASO 2: LockService SEGUNDO (antes de idempotencia)
    // Si no consigue lock, retornar SIN tocar cache de idempotencia
    // ================================================================
    const lockEnabled = getConfig('FEATURES.ENABLE_LOCK_SERVICE', true);
    if (lockEnabled) {
      try {
        lock = LockService.getScriptLock();
        const lockTimeout = getConfig('LOCK.SEND_EMAIL_TIMEOUT_MS', 30000);

        lockAcquired = lock.tryLock(lockTimeout);

        if (!lockAcquired) {
          Logger.warn(context, 'Could not acquire lock, another send in progress', {
            correlationId,
            lockTimeout
          });
          // Limpiar correlationId antes de retornar
          if (correlationEnabled) {
            Logger.clearCorrelationId();
          }
          Logger.flush();
          return {
            ok: false,
            error: 'Otro proceso de envío está en curso. Intenta en unos momentos.',
            code: 'LOCK_BUSY',
            correlationId: correlationId
          };
        }

        Logger.info(context, 'Lock acquired', { correlationId, lockTimeout });
      } catch (lockError) {
        // Graceful degradation: continue without lock if LockService fails
        Logger.warn(context, 'LockService error (continuing without lock)', lockError, { correlationId });
        lock = null;
        lockAcquired = false;
      }
    }

    // ================================================================
    // PASO 3: Idempotencia TERCERO (solo después de lock adquirido)
    // ================================================================
    if (cache.get(cacheKey)) {
      Logger.info(context, 'Duplicate request detected, skipping', { requestId, correlationId });
      return { ok: true, skipped: true, reason: 'duplicate_request', requestId, correlationId };
    }
    cache.put(cacheKey, 'processing', 600); // 10 min TTL
    cacheKeySet = true;

    // ================================================================
    // PASO 4: Validaciones de items
    // ================================================================
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: 'No hay items para enviar', correlationId };
    }

    if (items.length > 50) {
      return {
        ok: false,
        error: 'Máximo 50 correos por lote. Divide en tandas para evitar timeouts.',
        correlationId
      };
    }

    Logger.info(context, 'Starting batch send', { count: items.length, options, requestId, correlationId });

    const results = {
      sent: 0,
      failed: 0,
      errors: [],
      details: []
    };

    // FASE 1: Cargar contacts UNA SOLA VEZ (optimización)
    const phaseStart1 = Date.now();
    const allContacts = loadContactsFromSheet();
    metrics.loadContactsMs = Date.now() - phaseStart1;

    Logger.info(context, 'Contacts loaded', { count: allContacts.length, ms: metrics.loadContactsMs, correlationId });

    // FASE 2: Procesamiento secuencial optimizado
    const phaseStart2 = Date.now();

    // Procesar cada item secuencialmente
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        Logger.info(context, `Processing ${i + 1}/${items.length}`, { aseguradoId: item.aseguradoId, correlationId });

        const contact = allContacts.find(c => c.aseguradoId === item.aseguradoId);

        if (!contact) {
          throw new Error(`No se encontró en Mail_Contacts`);
        }

        if (!contact.emailTo || contact.emailTo.length === 0) {
          throw new Error(`Sin destinatarios (EMAIL_TO vacío)`);
        }

        // Generar EECC (respetar opciones de adjuntos del frontend)
        const eecc = EECCCore.generateHeadless(item.aseguradoId, {
          exportPdf: options?.adjuntarPdf !== false,
          exportXlsx: options?.adjuntarXlsx !== false,
          includeObs: false,
          obsForRAM: '__ALL__'
        });

        if (!eecc.ok) {
          throw new Error(`Error en EECC: ${eecc.error}`);
        }

        // Phase 1: Pipeline ENVIANDO transition
        let pipelineId = eecc.pipelineId; // Returned from generateHeadless if pipeline enabled
        try {
          if (pipelineId) {
            EECCPipeline.transition(pipelineId, EECCPipeline.STATES.ENVIANDO);
          }
        } catch (e) { /* ignore pipeline errors */ }

        const attachments = prepareAttachments(eecc);

        // FIX: Usar plantilla si se especifica templateId
        let bodyHtml;
        let subject;

        if (options && options.templateId) {
          try {
            const rendered = TemplateService.renderTemplate(options.templateId, {
              asegurado: contact.aseguradoNombre,
              saludo: contact.saludo,
              fechaCorte: Utilities.formatDate(new Date(), getConfig('FORMAT.TIMEZONE'), 'dd/MM/yyyy'),
              observaciones: contact.observaciones
            });
            bodyHtml = rendered.bodyHtml;
            subject = rendered.subject;
          } catch (templateError) {
            Logger.warn(context, 'Template render failed, using default', templateError, { correlationId });
            bodyHtml = renderEmailBody({
              asegurado: contact.aseguradoNombre,
              saludo: contact.saludo,
              fechaCorte: Utilities.formatDate(new Date(), getConfig('FORMAT.TIMEZONE'), 'dd/MM/yyyy'),
              observaciones: contact.observaciones
            });
            subject = `EECC ${contact.aseguradoNombre} -- Corte ${Utilities.formatDate(new Date(), getConfig('FORMAT.TIMEZONE'), 'dd/MM/yyyy')}`;
          }
        } else {
          // Plantilla por defecto
          bodyHtml = renderEmailBody({
            asegurado: contact.aseguradoNombre,
            saludo: contact.saludo,
            fechaCorte: Utilities.formatDate(new Date(), getConfig('FORMAT.TIMEZONE'), 'dd/MM/yyyy'),
            observaciones: contact.observaciones
          });
          subject = `EECC ${contact.aseguradoNombre} -- Corte ${Utilities.formatDate(new Date(), getConfig('FORMAT.TIMEZONE'), 'dd/MM/yyyy')}`;
        }

        // ENVIAR CORREO REAL
        // P2-FIX: Use 'bodyHtml' (not 'htmlBody') to match MailerService parameter name
        const messageId = MailerService.sendEmail({
          to: contact.emailTo,
          cc: contact.emailCc,
          bcc: contact.emailBcc,
          subject: subject,
          bodyHtml: bodyHtml,
          blobs: attachments.blobs || [],
          urls: attachments.urls || []
        });

        // Phase 1: Pipeline ENVIADO transition
        try {
          if (pipelineId && messageId) {
            EECCPipeline.transition(pipelineId, EECCPipeline.STATES.ENVIADO, {
              messageId: messageId
            });
          }
        } catch (e) { /* ignore pipeline errors */ }

        results.sent++;
        results.details.push({
          aseguradoId: item.aseguradoId,
          status: 'sent',
          messageId: messageId
        });

        Logger.info(context, 'Email sent', {
          aseguradoId: item.aseguradoId,
          messageId,
          correlationId
        });

        // ========== REGISTRAR ENVÍO EN BITÁCORA (bufferizado) ==========
        try {
          const datosGestion = {
            asegurado: contact.aseguradoNombre,
            poliza: '',
            estado: 'ENVIADO',
            canal: 'EMAIL',
            destinatarios: [
              ...contact.emailTo.map(e => `TO:${e}`),
              ...(contact.emailCc || []).map(e => `CC:${e}`),
              ...(contact.emailBcc || []).map(e => `BCC:${e}`)
            ].join(', '),
            observaciones: contact.observaciones || 'EECC enviado por correo electrónico',
            fechaTentativaPago: null,
            montoGestionado: '',
            moneda: '',
            archivoGenerado: eecc.pdfUrl || eecc.xlsxUrl || '',
            messageId: messageId,
            idGestionPadre: ''
          };

          const bitacoraResult = BitacoraService.registrarGestion(datosGestion);

          if (bitacoraResult.ok) {
            results.details[results.details.length - 1].idGestion = bitacoraResult.idGestion;
          }
        } catch (bitacoraError) {
          Logger.error(context, 'Error al registrar en bitácora (no crítico)', bitacoraError, { correlationId });
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          aseguradoId: item.aseguradoId,
          error: error.message
        });
        results.details.push({
          aseguradoId: item.aseguradoId,
          status: 'error',
          error: error.message
        });

        Logger.error(context, 'Failed to send', error, { aseguradoId: item.aseguradoId, correlationId });

        // Phase 1: Pipeline ERROR transition
        try {
          if (pipelineId) {
            EECCPipeline.transition(pipelineId, EECCPipeline.STATES.ERROR, {
              error: error.message
            });
          }
        } catch (e) { /* ignore pipeline errors */ }

        // ========== REGISTRAR ERROR EN BITÁCORA ==========
        try {
          BitacoraService.registrarGestion({
            asegurado: item.aseguradoId,
            poliza: '',
            estado: 'ERROR',
            canal: 'EMAIL',
            destinatarios: '',
            observaciones: `Error al enviar correo: ${error.message}`,
            fechaTentativaPago: null,
            montoGestionado: '',
            moneda: '',
            archivoGenerado: '',
            messageId: '',
            idGestionPadre: ''
          });
        } catch (bitacoraError) {
          Logger.error(context, 'Error al registrar error en bitácora', bitacoraError, { correlationId });
        }
      }
    }

    metrics.sendEmailsMs = Date.now() - phaseStart2;

    // FASE 3: Flush de buffers (escribir todo en batch)
    const phaseStart3 = Date.now();

    // Flush bitácora (escribe TODAS las gestiones en una operación)
    const bitacoraFlush = BitacoraService.flush();
    if (bitacoraFlush.ok) {
      Logger.info(context, 'Bitácora flushed', { count: bitacoraFlush.count, correlationId });
    } else {
      Logger.warn(context, 'Bitácora flush failed', { error: bitacoraFlush.error, correlationId });
    }

    // Flush logs (escribe TODOS los logs en una operación)
    const logFlush = Logger.flush();
    if (logFlush.ok) {
      console.log(`[${context}] Logger flushed: ${logFlush.count} logs`);
    }

    const flushMs = Date.now() - phaseStart3;

    // Calcular métricas finales
    metrics.totalMs = Date.now() - startTime;
    metrics.flushMs = flushMs;

    Logger.info(context, 'Batch completed', {
      sent: results.sent,
      failed: results.failed,
      metrics: metrics,
      correlationId
    });

    // Último flush para el log de completado
    Logger.flush();

    // Phase 1: Audit email send (soft-fail)
    try {
      AuditService.log(AuditService.ACTIONS.SEND_EMAIL, requestId, {
        sent: results.sent,
        failed: results.failed,
        totalItems: items.length,
        durationMs: metrics.totalMs
      }, correlationId);
    } catch (e) { /* ignore audit errors */ }

    return {
      ok: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
      details: results.details,
      duration: metrics.totalMs,
      metrics: metrics,
      correlationId: correlationId
    };

  } catch (error) {
    Logger.error(context, 'Batch send failed', error, { correlationId });
    Logger.flush(); // Flush incluso en error

    return {
      ok: false,
      error: error.message,
      sent: 0,
      failed: 0,
      correlationId: correlationId
    };

  } finally {
    // ================================================================
    // CLEANUP: Liberar lock y limpiar correlationId
    // ================================================================

    // Liberar lock si fue adquirido
    if (lock && lockAcquired) {
      try {
        lock.releaseLock();
        Logger.info(context, 'Lock released', { correlationId });
        Logger.flush(); // Flush para que se escriba el log de lock released
      } catch (releaseError) {
        // Non-critical: just log warning
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[sendEmailsNow] Error releasing lock:', releaseError.message);
        }
      }
    }

    // Limpiar correlationId
    if (correlationEnabled) {
      try {
        Logger.clearCorrelationId();
      } catch (clearError) {
        // Non-critical: ignore
      }
    }
  }
}

// ========== BITÁCORA v3.0 - CICLO DE COBRANZA ==========

/**
 * Obtiene resumen de ciclos de gestión (última gestión por ciclo)
 * Calcula dias_desde_registro dinámicamente
 * 
 * @param {Object} filtros - { asegurado, estadoGestion, responsable, diasMin, diasMax }
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: [...] }
 */
function getBitacoraResumen(filtros, token, opciones) {
  const context = 'getBitacoraResumen';

  // Normalizar opciones de paginación
  const paginationOpts = {
    page: (opciones && opciones.page) || 1,
    pageSize: Math.min((opciones && opciones.pageSize) || 50, 100)
  };

  // Variable para almacenar el resultado antes del finally
  let resultado = null;

  try {
    // Validar sesión
    try {
      if (typeof AuthService === 'undefined') {
        return {
          ok: false,
          error: 'AuthService no está disponible en el deployment',
          data: [],
          pagination: { page: paginationOpts.page, pageSize: paginationOpts.pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        };
      }
      AuthService.validateSession(token);
    } catch (authError) {
      return {
        ok: false,
        error: 'Sesión inválida: ' + authError.message,
        data: [],
        pagination: { page: paginationOpts.page, pageSize: paginationOpts.pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      };
    }
    // IMPORTANTE: Flush bitácora antes de leer
    try {
      if (typeof BitacoraService !== 'undefined' && typeof BitacoraService.flush === 'function') {
        const flushResult = BitacoraService.flush();
      }
    } catch (flushError) {
      // Ignorar errores de flush
    }

    // Obtener resumen desde BitacoraService
    let resumen;
    try {
      if (typeof BitacoraService === 'undefined') {
        return {
          ok: false,
          error: 'BitacoraService no está disponible en el deployment',
          data: []
        };
      }

      if (typeof BitacoraService.obtenerResumenCiclos !== 'function') {
        return {
          ok: false,
          error: 'BitacoraService.obtenerResumenCiclos no es una función',
          data: []
        };
      }

      resumen = BitacoraService.obtenerResumenCiclos(filtros || {}, paginationOpts);
    } catch (resumenError) {
      return {
        ok: false,
        error: 'Error al leer gestiones: ' + resumenError.message,
        data: [],
        pagination: { page: paginationOpts.page, pageSize: paginationOpts.pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
      };
    }

    // v4.1+: resumen ya viene con formato {data, pagination}
    resultado = {
      ok: true,
      data: resumen.data,
      pagination: resumen.pagination
    };

    return resultado;

  } catch (error) {
    resultado = {
      ok: false,
      error: 'Error inesperado: ' + (error.message || 'Error desconocido'),
      data: [],
      pagination: { page: paginationOpts.page, pageSize: paginationOpts.pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
    };

    return resultado;

  } finally {
    // Flush de logs de forma segura (no bloquear el return)
    try {
      if (typeof Logger !== 'undefined' && typeof Logger.flush === 'function') {
        Logger.flush();
      }
    } catch (logError) {
      // Ignorar errores de logging
    }
  }
}

/**
 * Obtiene todas las gestiones de un asegurado
 * 
 * @param {string} asegurado - Nombre del asegurado
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: [...] }
 */
function getGestionesPorAseguradoAPI(asegurado, token) {
  const context = 'getGestionesPorAseguradoAPI';

  try {
    AuthService.validateSession(token);

    if (!asegurado) {
      throw new Error('Asegurado es requerido');
    }

    const gestiones = BitacoraService.obtenerGestiones({ asegurado });

    Logger.info(context, 'Gestiones obtenidas', {
      asegurado,
      count: gestiones.length
    });

    return {
      ok: true,
      data: gestiones
    };

  } catch (error) {
    Logger.error(context, 'Error al obtener gestiones', error);
    return {
      ok: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Registra una gestión manual desde el portal
 * 
 * @param {Object} payload - Datos de la gestión
 * @param {string} payload.idCiclo - ID del ciclo (opcional, se resolverá automáticamente)
 * @param {string} payload.asegurado - Nombre del asegurado
 * @param {string} payload.ruc - RUC
 * @param {string} payload.tipoGestion - LLAMADA | WHATSAPP | etc.
 * @param {string} payload.estadoGestion - SIN_RESPUESTA | COMPROMISO_PAGO | etc.
 * @param {string} payload.canalContacto - LLAMADA | EMAIL | etc.
 * @param {string} payload.fechaCompromiso - Fecha de compromiso (opcional)
 * @param {string} payload.proximaAccion - Próximo paso
 * @param {string} payload.observaciones - Detalles
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: {...} }
 */
function registrarGestionManualBitacora(payload, token) {
  const context = 'registrarGestionManualBitacora';
  const startTime = Date.now();

  try {
    AuthService.validateSession(token);

    // Validar payload
    if (!payload.asegurado || !payload.tipoGestion || !payload.estadoGestion ||
      !payload.canalContacto || !payload.proximaAccion) {
      throw new Error('Faltan campos obligatorios');
    }

    // Validar fechas obligatorias
    if (!payload.fechaEnvioEECC || isNaN(new Date(payload.fechaEnvioEECC).getTime())) {
      throw new Error('Fecha de Envío EECC inválida o faltante');
    }
    if (!payload.fechaGestion || isNaN(new Date(payload.fechaGestion).getTime())) {
      throw new Error('Fecha de Gestión inválida o faltante');
    }

    // Validar FECHA_COMPROMISO
    if (['COMPROMISO_PAGO', 'REPROGRAMADO'].includes(payload.estadoGestion)) {
      if (!payload.fechaCompromiso || isNaN(new Date(payload.fechaCompromiso).getTime())) {
        throw new Error(`El estado ${payload.estadoGestion} requiere una Fecha de Compromiso válida`);
      }
    }

    // Validar OBSERVACIONES
    const estadosRequierenObs = ['DERIVADO_COMERCIAL', 'DERIVADO_RRHH', 'DERIVADO_RIESGOS_GENERALES', 'NO_COBRABLE'];
    if (estadosRequierenObs.includes(payload.estadoGestion) && (!payload.observaciones || !payload.observaciones.trim())) {
      throw new Error(`El estado ${payload.estadoGestion} requiere Observaciones`);
    }

    // OPTIMIZACIÓN v4.2: No buscar ciclo previo - crear nuevo directamente
    // Esto ahorra ~0.5-1s de lectura del Sheet
    // registrarGestionManual creará un ciclo nuevo automáticamente si no existe
    const idCiclo = payload.idCiclo || null;

    if (!idCiclo) {
      Logger.info(context, 'Sin ID_CICLO proporcionado - se creará nuevo ciclo automáticamente');
    }

    // Registrar gestión manual
    const resultado = BitacoraService.registrarGestionManual({
      idCiclo: idCiclo,
      asegurado: payload.asegurado,
      ruc: '',  // Sin RUC, no está en BD
      fechaEnvioEECC: payload.fechaEnvioEECC || null,  // Fecha de inicio del ciclo
      fechaGestion: payload.fechaGestion || null,  // ← Nueva: Fecha de esta gestión
      tipoGestion: payload.tipoGestion,
      estadoGestion: payload.estadoGestion,
      canalContacto: payload.canalContacto,
      fechaCompromiso: payload.fechaCompromiso || null,
      proximaAccion: payload.proximaAccion,
      observaciones: payload.observaciones || '',
      responsable: payload.responsable || ''
    });

    if (!resultado.ok) {
      throw new Error('Error al registrar gestión: ' + resultado.error);
    }

    // OPTIMIZACIÓN v4.2: Flush inmediato pero con timeout corto
    let flushWarning = null;
    try {
      BitacoraService.flush();
    } catch (flushError) {
      Logger.warn(context, 'Flush falló, datos en buffer', { error: flushError.message });
      flushWarning = 'Registro guardado en buffer, se sincronizará en breve';
    }

    // Calcular dias_desde_registro para la respuesta
    const hoy = new Date();
    const diasDesdeRegistro = 0;  // Recién registrada

    const duration = Date.now() - startTime;

    Logger.info(context, 'Gestión manual registrada', {
      idGestion: resultado.idGestion,
      idCiclo: resultado.idCiclo,
      durationMs: duration
    });

    // Invalidar cache de resumen para que próxima carga refleje el cambio
    try {
      const cache = CacheService.getScriptCache();
      // Invalidar todas las páginas cacheadas (1-10, tamaños 50 y 100)
      const keysToInvalidate = [];
      for (let p = 1; p <= 10; p++) {
        keysToInvalidate.push('BITACORA_RESUMEN_P' + p + '_S50');
        keysToInvalidate.push('BITACORA_RESUMEN_P' + p + '_S100');
      }
      cache.removeAll(keysToInvalidate);
      Logger.debug(context, 'Cache de resumen invalidado (10 pages)');
    } catch (cacheErr) {
      Logger.warn(context, 'No se pudo invalidar cache', cacheErr);
    }

    // Flush logs
    Logger.flush();

    return {
      ok: true,
      data: {
        idGestion: resultado.idGestion,
        idCiclo: resultado.idCiclo,
        diasDesdeRegistro: diasDesdeRegistro,
        asegurado: payload.asegurado,
        estadoGestion: payload.estadoGestion,
        snapshotVencidoPEN: resultado.snapshotVencidoPEN || 0,
        snapshotVencidoUSD: resultado.snapshotVencidoUSD || 0
      },
      warning: flushWarning,
      duration: duration
    };

  } catch (error) {
    Logger.error(context, 'Error al registrar gestión manual', error);
    Logger.flush();

    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Obtiene lista de clientes con ciclos activos
 * (Para llenar combo de ASEGURADO en formulario)
 * 
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: [...] }
 */
function getClientesConCiclosActivos(token) {
  const context = 'getClientesConCiclosActivos';

  try {
    AuthService.validateSession(token);

    // CAMBIO v3.0: Obtener TODOS los asegurados de la hoja BD
    // (antes solo obtenía los que ya tenían ciclos, causando combo vacío en primera vez)
    const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));

    if (!baseData || !baseData.rows || baseData.rows.length === 0) {
      Logger.warn(context, 'Hoja BD vacía o no encontrada');
      return { ok: true, data: [] };
    }

    // Buscar columna ASEGURADO
    const colAsegurado = baseData.headers.findIndex(h =>
      h && h.toString().toUpperCase().includes('ASEGURADO')
    );

    if (colAsegurado === -1) {
      throw new Error('No se encontró la columna ASEGURADO en la hoja BD');
    }

    // Extraer asegurados únicos (sin vacíos)
    const aseguradosSet = new Set();
    baseData.rows.forEach(row => {
      const asegurado = row[colAsegurado];
      if (asegurado && asegurado.toString().trim() !== '') {
        aseguradosSet.add(asegurado.toString().trim());
      }
    });

    // Ordenar alfabéticamente
    const asegurados = Array.from(aseguradosSet).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    Logger.info(context, 'Asegurados de BD obtenidos', { count: asegurados.length });

    return {
      ok: true,
      data: asegurados
    };

  } catch (error) {
    Logger.error(context, 'Error al obtener clientes', error);
    return {
      ok: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Obtiene el ciclo más reciente de un asegurado
 * (Para prellenar ID_CICLO en formulario)
 * 
 * @param {string} asegurado - Nombre del asegurado
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: {...} | null }
 */
function getUltimoCicloPorAsegurado(asegurado, token) {
  const context = 'getUltimoCicloPorAsegurado';

  try {
    AuthService.validateSession(token);

    if (!asegurado) {
      throw new Error('Asegurado es requerido');
    }

    // Intentar obtener ciclo existente
    // obtenerResumenCiclos devuelve { data: [], pagination: {} }
    const resultado = BitacoraService.obtenerResumenCiclos({ asegurado }, { page: 1, pageSize: 1 });
    const ciclos = resultado && resultado.data ? resultado.data : [];

    if (ciclos.length > 0) {
      // El primero es el más reciente (ya está ordenado)
      const ultimoCiclo = ciclos[0];

      Logger.info(context, 'Último ciclo obtenido', {
        asegurado,
        idCiclo: ultimoCiclo.idCiclo
      });

      // Serializar fechas a ISO string para transmisión
      const cicloParsed = {
        ...ultimoCiclo,
        fechaEnvioEECC: ultimoCiclo.fechaEnvioEECC instanceof Date
          ? ultimoCiclo.fechaEnvioEECC.toISOString()
          : ultimoCiclo.fechaEnvioEECC,
        fechaRegistro: ultimoCiclo.fechaRegistro instanceof Date
          ? ultimoCiclo.fechaRegistro.toISOString()
          : ultimoCiclo.fechaRegistro,
        fechaCompromiso: ultimoCiclo.fechaCompromiso instanceof Date
          ? ultimoCiclo.fechaCompromiso.toISOString()
          : ultimoCiclo.fechaCompromiso
      };

      return {
        ok: true,
        data: cicloParsed
      };
    }

    // CAMBIO v3.0: Si no hay ciclo, buscar RUC en la hoja BD
    Logger.info(context, 'No hay ciclo previo, buscando datos en BD', { asegurado });

    const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));

    if (!baseData || !baseData.rows || baseData.rows.length === 0) {
      Logger.warn(context, 'Hoja BD vacía');
      return { ok: true, data: null };
    }

    // Buscar columnas ASEGURADO y RUC
    const colAsegurado = baseData.headers.findIndex(h =>
      h && h.toString().toUpperCase().includes('ASEGURADO')
    );
    const colRUC = baseData.headers.findIndex(h =>
      h && h.toString().toUpperCase() === 'RUC'
    );

    if (colAsegurado === -1) {
      throw new Error('No se encontró la columna ASEGURADO en la hoja BD');
    }

    // Buscar la primera fila que coincida con el asegurado
    const row = baseData.rows.find(r =>
      r[colAsegurado] && r[colAsegurado].toString().trim() === asegurado
    );

    if (!row) {
      Logger.warn(context, 'Asegurado no encontrado en BD', { asegurado });
      return { ok: true, data: null };
    }

    // Retornar datos básicos del asegurado (sin ciclo previo)
    const ruc = colRUC !== -1 && row[colRUC] ? row[colRUC].toString() : '';

    Logger.info(context, 'Datos de BD obtenidos (sin ciclo previo)', { asegurado, ruc });

    return {
      ok: true,
      data: {
        asegurado: asegurado,
        ruc: ruc,
        fechaEnvioEECC: null, // No hay fecha porque no hay ciclo previo
        idCiclo: null // No hay ciclo previo
      }
    };

  } catch (error) {
    Logger.error(context, 'Error al obtener último ciclo', error);
    return {
      ok: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Obtiene lista de responsables únicos
 * (Para llenar combo de RESPONSABLE en filtros)
 * 
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: [...] }
 */
function getResponsablesUnicos(token) {
  const context = 'getResponsablesUnicos';

  try {
    AuthService.validateSession(token);

    // obtenerResumenCiclos devuelve { data: [], pagination: {} }
    const resultado = BitacoraService.obtenerResumenCiclos({}, { page: 1, pageSize: 10000 });
    const ciclos = resultado && resultado.data ? resultado.data : [];

    // Extraer responsables únicos
    const responsablesSet = new Set();
    ciclos.forEach(c => {
      if (c.responsable) {
        responsablesSet.add(c.responsable);
      }
    });

    const responsables = Array.from(responsablesSet).sort((a, b) =>
      a.localeCompare(b, 'es')
    );

    Logger.info(context, 'Responsables obtenidos', { count: responsables.length });

    return {
      ok: true,
      data: responsables
    };

  } catch (error) {
    Logger.error(context, 'Error al obtener responsables', error);
    return {
      ok: false,
      error: error.message,
      data: []
    };
  }
}


/**
 * 🚀 FUNCIÓN OPTIMIZADA PARA PORTAL WEB
 * Lee TODAS las gestiones de la bitácora de una sola vez
 * NO usa BitacoraService para evitar problemas de deployment
 */
function bitacoraGetAllGestiones() {
  var context = 'bitacoraGetAllGestiones';

  try {
    Logger.info(context, 'Iniciando lectura directa de bitácora');

    // 1. Obtener spreadsheet
    var ss = SheetsIO._getSpreadsheet();

    // 2. Obtener hoja
    var sheet = ss.getSheetByName('Bitacora_Gestiones_EECC');
    if (!sheet) {
      return { ok: false, error: 'Hoja de bitácora no encontrada' };
    }

    // 3. Leer datos
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: true, data: [] };  // Vacía pero válida
    }

    var lastCol = sheet.getLastColumn();
    var rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    // 4. Procesar datos
    var gestiones = [];
    for (var i = 0; i < rawData.length; i++) {
      var row = rawData[i];
      if (!row[0]) continue;  // Saltar filas vacías

      gestiones.push({
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
      });
    }

    Logger.info(context, gestiones.length + ' gestiones leídas correctamente');

    return {
      ok: true,
      data: gestiones,
      total: gestiones.length
    };

  } catch (error) {
    Logger.error(context, 'Error', error);
    return {
      ok: false,
      error: error.message || 'Error desconocido'
    };
  }
}

/**
 * Obtiene el resumen de ciclos para la vista Estado Actual
 * Para mostrar en la vista "Estado Actual"
 * OPTIMIZACIÓN: CacheService para respuestas ultra-rápidas (60s TTL)
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: [resumen de ciclos] }
 */
/**
 * Consolidated bitácora init - reduces 3 google.script.run calls to 1
 * Returns: resumen ciclos + clientes con ciclos + responsables únicos
 * @param {string} token - Session token
 * @return {Object} { ok, resumen, clientes, responsables }
 */
function obtenerBitacoraCompleta(token) {
  const context = 'obtenerBitacoraCompleta';
  const startTime = Date.now();

  try {
    AuthService.validateSession(token);

    // 1. Resumen de ciclos (reuses cache logic from bitacoraGetResumenCiclos)
    var resumenData = [];
    try {
      const resumen = BitacoraService.obtenerResumenCiclos({}, { page: 1, pageSize: 50 });
      resumenData = (resumen.data || []).map(function(ciclo) {
        return Object.assign({}, ciclo, {
          fechaEnvioEECC: ciclo.fechaEnvioEECC instanceof Date ? ciclo.fechaEnvioEECC.toISOString() : ciclo.fechaEnvioEECC,
          fechaRegistro: ciclo.fechaRegistro instanceof Date ? ciclo.fechaRegistro.toISOString() : ciclo.fechaRegistro,
          fechaCompromiso: ciclo.fechaCompromiso instanceof Date ? ciclo.fechaCompromiso.toISOString() : ciclo.fechaCompromiso
        });
      });
    } catch (e) {
      Logger.warn(context, 'resumen failed', e);
    }

    // 2. Clientes (asegurados from BD)
    var clientes = [];
    try {
      const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
      if (baseData && baseData.rows && baseData.rows.length > 0) {
        const colAsegurado = baseData.headers.findIndex(function(h) {
          return h && h.toString().toUpperCase().indexOf('ASEGURADO') !== -1;
        });
        if (colAsegurado !== -1) {
          const set = new Set();
          baseData.rows.forEach(function(row) {
            var a = row[colAsegurado];
            if (a && a.toString().trim() !== '') set.add(a.toString().trim());
          });
          clientes = Array.from(set).sort(function(a, b) { return a.localeCompare(b, 'es', { sensitivity: 'base' }); });
        }
      }
    } catch (e) {
      Logger.warn(context, 'clientes failed', e);
    }

    // 3. Responsables únicos (from resumen data already loaded)
    var responsables = [];
    try {
      const resumenFull = BitacoraService.obtenerResumenCiclos({}, { page: 1, pageSize: 10000 });
      const respSet = new Set();
      (resumenFull.data || []).forEach(function(c) { if (c.responsable) respSet.add(c.responsable); });
      responsables = Array.from(respSet).sort(function(a, b) { return a.localeCompare(b, 'es'); });
    } catch (e) {
      Logger.warn(context, 'responsables failed', e);
    }

    const elapsed = Date.now() - startTime;
    Logger.info(context, 'Consolidated load in ' + elapsed + 'ms: ' + resumenData.length + ' ciclos, ' + clientes.length + ' clientes, ' + responsables.length + ' responsables');

    return {
      ok: true,
      resumen: resumenData,
      clientes: clientes,
      responsables: responsables
    };
  } catch (error) {
    Logger.error(context, 'Failed', error);
    return { ok: false, error: error.message, resumen: [], clientes: [], responsables: [] };
  }
}

function bitacoraGetResumenCiclos(token, opciones) {
  const context = 'bitacoraGetResumenCiclos';
  const startTime = Date.now();

  const paginationOpts = {
    page: (opciones && opciones.page) || 1,
    pageSize: Math.min((opciones && opciones.pageSize) || 50, 100)
  };

  try {
    // Validar sesión
    AuthService.validateSession(token);

    // ════════════════════════════════════════════════════════════════════════════════
    // OPTIMIZACIÓN: Cache server-side con CacheService (60s TTL)
    // ════════════════════════════════════════════════════════════════════════════════
    const cache = CacheService.getScriptCache();
    const cacheKey = `BITACORA_RESUMEN_P${paginationOpts.page}_S${paginationOpts.pageSize}`;

    // Intentar obtener del cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const elapsed = Date.now() - startTime;
      Logger.info(context, `⚡ CACHE HIT - ${elapsed}ms (página ${paginationOpts.page})`);
      return parsed;
    }

    // Cache miss - obtener datos frescos
    const resumen = BitacoraService.obtenerResumenCiclos({}, paginationOpts);

    Logger.info(context, `Página ${paginationOpts.page}: ${resumen.data.length} de ${resumen.pagination.total} ciclos`);

    // Serializar fechas a ISO string
    const dataParsed = resumen.data.map(ciclo => ({
      ...ciclo,
      fechaEnvioEECC: ciclo.fechaEnvioEECC instanceof Date
        ? ciclo.fechaEnvioEECC.toISOString()
        : ciclo.fechaEnvioEECC,
      fechaRegistro: ciclo.fechaRegistro instanceof Date
        ? ciclo.fechaRegistro.toISOString()
        : ciclo.fechaRegistro,
      fechaCompromiso: ciclo.fechaCompromiso instanceof Date
        ? ciclo.fechaCompromiso.toISOString()
        : ciclo.fechaCompromiso
    }));

    const result = {
      ok: true,
      data: dataParsed,
      pagination: resumen.pagination
    };

    // Guardar en cache (60 segundos)
    try {
      cache.put(cacheKey, JSON.stringify(result), 60);
    } catch (cacheErr) {
      Logger.warn(context, 'No se pudo guardar en cache', cacheErr);
    }

    const elapsed = Date.now() - startTime;
    Logger.info(context, `✅ CACHE MISS - procesado en ${elapsed}ms`);

    return result;

  } catch (error) {
    Logger.error(context, 'Error al obtener resumen de ciclos', error);
    return {
      ok: false,
      error: error.message || 'Error desconocido',
      data: [],
      pagination: { page: paginationOpts.page, pageSize: paginationOpts.pageSize, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
    };
  }
}

/**
 * Obtiene todas las gestiones de un asegurado (todos sus ciclos)
 * Para mostrar en el Timeline completo del cliente
 * @param {string} asegurado - Nombre del asegurado
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: [gestiones ordenadas por fecha desc] }
 */
function bitacoraGetGestionesPorAsegurado(asegurado, token) {
  const context = 'bitacoraGetGestionesPorAsegurado';

  try {
    // Validar sesión
    AuthService.validateSession(token);

    // Obtener TODAS las gestiones del asegurado (de todos sus ciclos)
    const gestiones = BitacoraService.obtenerGestiones({ asegurado: asegurado });

    // Ordenar por fecha desc (más reciente primero)
    gestiones.sort((a, b) => {
      const fechaA = a.fechaRegistro instanceof Date ? a.fechaRegistro.getTime() : 0;
      const fechaB = b.fechaRegistro instanceof Date ? b.fechaRegistro.getTime() : 0;
      return fechaB - fechaA;
    });

    Logger.info(context, `${gestiones.length} gestiones encontradas para asegurado: ${asegurado}`);

    // Serializar fechas a ISO string
    const gestionesParsed = gestiones.map(g => ({
      ...g,
      fechaEnvioEECC: g.fechaEnvioEECC instanceof Date ? g.fechaEnvioEECC.toISOString() : g.fechaEnvioEECC,
      fechaRegistro: g.fechaRegistro instanceof Date ? g.fechaRegistro.toISOString() : g.fechaRegistro,
      fechaCompromiso: g.fechaCompromiso instanceof Date ? g.fechaCompromiso.toISOString() : g.fechaCompromiso
    }));

    return {
      ok: true,
      data: gestionesParsed,
      total: gestionesParsed.length
    };

  } catch (error) {
    Logger.error(context, 'Error al obtener gestiones del asegurado', error);
    return {
      ok: false,
      error: error.message || 'Error desconocido'
    };
  }
}

/**
 * Obtiene todas las gestiones de un ciclo específico (para el timeline)
 * @param {string} idCiclo - ID del ciclo a buscar
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: [gestiones] }
 */
function bitacoraGetGestionesPorCiclo(idCiclo, token) {
  const context = 'bitacoraGetGestionesPorCiclo';

  try {
    // Validar sesión
    AuthService.validateSession(token);

    // Obtener todas las gestiones del ciclo
    const gestiones = BitacoraService.obtenerGestiones({ idCiclo: idCiclo });

    Logger.info(context, `${gestiones.length} gestiones encontradas para ciclo ${idCiclo}`);

    return {
      ok: true,
      data: gestiones
    };

  } catch (error) {
    Logger.error(context, 'Error al obtener gestiones del ciclo', error);
    return {
      ok: false,
      error: error.message || 'Error desconocido'
    };
  }
}

/**
 * 🔥 FUNCIÓN DEFINITIVA v8 - SOLO getActive() para modales
 * Esta función DEBE funcionar porque los modales tienen contexto del spreadsheet
 */
function bitacoraGetDataModal() {
  var context = 'bitacoraGetDataModal';

  try {
    Logger.info(context, '1. Obteniendo spreadsheet');

    var ss;
    try {
      ss = SheetsIO._getSpreadsheet();
      Logger.info(context, '✅ Spreadsheet obtenido');
    } catch (e) {
      Logger.error(context, 'Error obteniendo spreadsheet', e);
      return { ok: false, error: 'Error al acceder al spreadsheet: ' + e.message };
    }

    // Paso 2: Obtener la hoja
    var sheet;
    try {
      sheet = ss.getSheetByName('Bitacora_Gestiones_EECC');
      if (!sheet) {
        Logger.error(context, 'Hoja Bitacora_Gestiones_EECC no encontrada');
        return { ok: false, error: 'Hoja no encontrada', paso: 'getSheetByName' };
      }
      Logger.info(context, '✅ Hoja encontrada');
    } catch (e) {
      Logger.error(context, 'Error al obtener hoja', e);
      return { ok: false, error: 'Error al obtener hoja: ' + e.message, paso: 'getSheetByName' };
    }

    // Paso 3: Leer dimensiones
    var lastRow, lastCol;
    try {
      lastRow = sheet.getLastRow();
      lastCol = sheet.getLastColumn();
      Logger.info(context, 'Dimensiones: ' + lastRow + ' x ' + lastCol);

      if (lastRow < 2) {
        Logger.warn(context, 'Hoja vacía (solo headers)');
        return { ok: true, data: [], mensaje: 'Hoja vacía' };
      }
    } catch (e) {
      Logger.error(context, 'Error al leer dimensiones', e);
      return { ok: false, error: 'Error dimensiones: ' + e.message, paso: 'dimensiones' };
    }

    // Paso 4: Leer headers
    var headers;
    try {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      Logger.info(context, 'Headers: ' + headers.length + ' columnas');
    } catch (e) {
      Logger.error(context, 'Error al leer headers', e);
      return { ok: false, error: 'Error headers: ' + e.message, paso: 'headers' };
    }

    // Paso 5: Leer datos
    var rawData;
    try {
      rawData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      Logger.info(context, 'Datos leídos: ' + rawData.length + ' filas');
    } catch (e) {
      Logger.error(context, 'Error al leer datos', e);
      return { ok: false, error: 'Error datos: ' + e.message, paso: 'datos' };
    }

    // Paso 6: Procesar datos
    var gestiones = [];
    try {
      for (var i = 0; i < rawData.length; i++) {
        var row = rawData[i];

        // Saltar filas vacías
        if (!row[0]) continue;

        gestiones.push({
          idCiclo: row[0] || '',
          idGestion: row[1] || '',
          origenRegistro: row[2] || '',
          fechaEnvioEECC: row[3] || null,
          fechaRegistro: row[4] || null,
          asegurado: row[5] || '',
          ruc: row[6] || '',
          responsable: row[7] || '',
          tipoGestion: row[8] || '',
          estadoGestion: row[9] || '',
          canalContacto: row[10] || '',
          fechaCompromiso: row[11] || null,
          proximaAccion: row[12] || '',
          observaciones: row[13] || ''
        });
      }

      Logger.info(context, '✅ Procesadas ' + gestiones.length + ' gestiones');
    } catch (e) {
      Logger.error(context, 'Error al procesar datos', e);
      return { ok: false, error: 'Error procesamiento: ' + e.message, paso: 'procesamiento' };
    }

    // Paso 7: Retornar resultado
    Logger.info(context, '========================================');
    Logger.info(context, '✅ ÉXITO TOTAL - Retornando ' + gestiones.length + ' gestiones');
    Logger.info(context, '========================================');

    return {
      ok: true,
      data: gestiones,
      total: gestiones.length
    };

  } catch (error) {
    Logger.error(context, '❌ ERROR GENERAL', error);
    return {
      ok: false,
      error: error.message || 'Error desconocido',
      stack: error.stack || '',
      paso: 'general'
    };
  }
}

/**
 * Obtiene todos los compromisos de pago activos (con fecha de compromiso en el futuro o próxima)
 * Para el sistema de notificaciones
 * 
 * @param {string} token - Token de sesión
 * @return {Object} { ok, data: [{ asegurado, fechaCompromiso, tipoGestion, estadoGestion, ... }] }
 */
function bitacoraGetCompromisosActivos(token) {
  const context = 'bitacoraGetCompromisosActivos';

  try {
    // Validar sesión
    AuthService.validateSession(token);

    // Obtener compromisos activos desde BitacoraService
    const compromisos = BitacoraService.obtenerCompromisosActivos();

    Logger.info(context, `${compromisos.length} compromisos activos encontrados`);

    // Solo retornar campos necesarios para notificaciones (reduce payload y evita problemas de serialización)
    const compromisosParsed = compromisos.map(c => ({
      asegurado: c.asegurado || '',
      fechaCompromiso: c.fechaCompromiso instanceof Date ? c.fechaCompromiso.toISOString() : (c.fechaCompromiso || null),
      tipoGestion: c.tipoGestion || '',
      estadoGestion: c.estadoGestion || '',
      snapshotVencidoPEN: c.snapshotVencidoPEN || 0,
      compromisoVencido: !!c.compromisoVencido
    }));

    return {
      ok: true,
      data: compromisosParsed,
      total: compromisosParsed.length
    };

  } catch (error) {
    Logger.error(context, 'Error al obtener compromisos activos', error);
    return {
      ok: false,
      error: error.message || 'Error al obtener compromisos activos',
      data: []
    };
  }
}

// ========== GRUPO ECONOMICO - NUEVA LÓGICA ==========

/**
 * Obtiene la lista de grupos económicos disponibles
 * @param {string} token - Token de autenticación
 */
function getGrupos_API(token) {
  const context = 'getGrupos_API';
  try {
    AuthService.validateSession(token);
    const grupos = GrupoEconomicoService.getGrupos();
    return { ok: true, data: grupos };
  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Obtiene los asegurados de un grupo
 * @param {string} grupo - Nombre del grupo
 * @param {string} token - Token de autenticación
 */
function getAseguradosPorGrupo_API(grupo, token) {
  const context = 'getAseguradosPorGrupo_API';
  try {
    AuthService.validateSession(token);
    const asegurados = GrupoEconomicoService.getAsegurados(grupo);
    return { ok: true, data: asegurados };
  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Genera EECC para un grupo
 * @param {string} grupo - Nombre del grupo
 * @param {Object} opts - Opciones de generación
 * @param {string} token - Token de autenticación
 */
function generateByGrupo_API(grupo, opts, token) {
  const context = 'generateByGrupo_API';
  try {
    AuthService.validateSession(token);
    return EECCCore.generateByGrupo(grupo, opts);
  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Envía correos a un grupo
 * @param {string} grupo - Nombre del grupo
 * @param {Object} opts - Opciones de envío
 * @param {string} token - Token de autenticación
 */
function sendEmailsByGrupo_API(grupo, opts, token) {
  const context = 'sendEmailsByGrupo_API';
  try {
    AuthService.validateSession(token);

    // FIX: Idempotencia por grupo + fecha para evitar duplicados
    const today = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd');
    const cacheKey = 'MAIL_GRUPO::' + grupo + '::' + today;
    const cache = CacheService.getScriptCache();

    if (cache.get(cacheKey)) {
      Logger.info(context, 'Duplicate group send detected, skipping', { grupo, date: today });
      return { ok: true, skipped: true, reason: 'already_sent_today', grupo };
    }

    Logger.info(context, 'Iniciando', { grupo, opts });

    const result = SheetsMail.sendEmailsByGrupo(grupo, opts);

    // Solo marcar como enviado si fue exitoso
    if (result.ok) {
      cache.put(cacheKey, 'sent', 86400); // 24h TTL
    }

    Logger.info(context, 'Resultado', { ok: result.ok, message: result.message });

    return result;
  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message, stack: error.stack };
  }
}

/**
 * Programa un trabajo de envío
 * @param {Object} jobData - Datos del trabajo
 * @param {string} token - Token de autenticación
 */
function scheduleJob_API(jobData, token) {
  const context = 'scheduleJob_API';
  try {
    AuthService.validateSession(token);
    Logger.info(context, 'Scheduling job', jobData);
    return SchedulerService.scheduleJob(jobData);
  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Registra gestión para un grupo en bitácora
 * @param {Object} payload - Datos de la gestión (asegurado = nombre grupo)
 * @param {string} token - Token de autenticación
 */
function registrarGestionGrupo_API(payload, token) {
  const context = 'registrarGestionGrupo_API';
  try {
    AuthService.validateSession(token);

    // Validaciones básicas similares a registrarGestionManualBitacora
    if (!payload.asegurado || !payload.tipoGestion || !payload.estadoGestion) {
      throw new Error('Faltan campos obligatorios');
    }

    const result = BitacoraService.registrarGestionGrupo({
      ...payload,
      fechaEnvioEECC: payload.fechaEnvioEECC || new Date(),
      fechaRegistro: new Date()
    });

    // Flush para asegurar persistencia inmediata
    BitacoraService.flush();
    Logger.flush();

    return result;

  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Genera EECC para un asegurado individual (Headless/API)
 * Usado por el frontend para generación secuencial de grupos
 * @param {string} asegurado - Nombre del asegurado
 * @param {Object} opts - Opciones { exportPdf, exportXlsx, includeObs, obsForRAM, rowsToSkip }
 * @param {string} token - Token de autenticación
 */
function generateHeadless_API(asegurado, opts, token) {
  const context = 'generateHeadless_API';
  try {
    AuthService.validateSession(token);
    return EECCCore.generateHeadless(asegurado, opts);
  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Genera EECC para múltiples asegurados en batch (optimizado: 1 BD read, parallel exports)
 * @param {Array<string>} asegurados - Lista de nombres de asegurados
 * @param {Object} opts - { exportPdf, exportXlsx, includeObs, obsForRAM }
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, results[], errors[], generatedCount, errorCount }
 */
function generateBatch_API(asegurados, opts, token) {
  const context = 'generateBatch_API';
  const MAX_BATCH = 20;
  try {
    AuthService.validateSession(token);

    if (!Array.isArray(asegurados) || asegurados.length === 0) {
      return { ok: false, error: 'Se requiere una lista de asegurados' };
    }

    if (asegurados.length > MAX_BATCH) {
      return { ok: false, error: `Máximo ${MAX_BATCH} asegurados por batch (recibidos: ${asegurados.length})` };
    }

    return EECCCore.generateBatchHeadless(asegurados, opts);
  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Crea un ZIP con los archivos generados
 * @param {Array<string>} fileUrls - URLs de los archivos
 * @param {string} zipName - Nombre del ZIP
 * @param {string} token - Token de sesión
 */
function createZip_API(fileUrls, zipName, token) {
  const context = 'createZip_API';
  try {
    AuthService.validateSession(token);
    const url = DriveIO.createZip(fileUrls, zipName);
    return { ok: true, url: url };
  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Obtiene lista de plantillas
 */
function getTemplates_API(token) {
  try {
    AuthService.validateSession(token);
    const templates = TemplateService.getTemplates();
    return { ok: true, data: templates };
  } catch (error) {
    Logger.error('getTemplates_API', error);
    return { ok: false, error: error.message };
  }
}

/**
 * API para ejecutar backfill de snapshots en gestiones existentes
 * 
 * USO DESDE Apps Script Editor:
 *   ejecutarBackfillSnapshots_API({ dryRun: true })   // Ver qué se actualizaría
 *   ejecutarBackfillSnapshots_API({ dryRun: false })  // Ejecutar actualización real
 * 
 * @param {Object} opciones - { dryRun: boolean, limite: number }
 * @param {string} token - Token de autenticación (opcional para ejecución directa)
 * @return {Object} Resultado del backfill
 */
function ejecutarBackfillSnapshots_API(opciones, token) {
  const context = 'ejecutarBackfillSnapshots_API';

  try {
    // Validar sesión si se proporciona token
    if (token) {
      AuthService.validateSession(token);
    }

    Logger.info(context, 'Ejecutando backfill de snapshots', opciones);

    const resultado = BitacoraService.backfillSnapshotsExistentes(opciones || {});

    Logger.info(context, 'Backfill completado', {
      totalActualizadas: resultado.totalActualizadas
    });

    Logger.flush();

    return resultado;

  } catch (error) {
    Logger.error(context, 'Error en backfill API', error);
    Logger.flush();
    return { ok: false, error: error.message };
  }
}

/**
 * Función de prueba directa para ejecutar desde el editor de Apps Script
 * 
 * INSTRUCCIONES:
 * 1. Abrir el editor de Apps Script
 * 2. Seleccionar esta función en el dropdown
 * 3. Ejecutar (botón Play)
 * 4. Ver resultados en View > Logs
 */
function TEST_backfillSnapshots_DryRun() {
  const resultado = ejecutarBackfillSnapshots_API({ dryRun: true });
  console.log('=== RESULTADO DRY RUN ===');
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function TEST_backfillSnapshots_EJECUTAR() {
  const resultado = ejecutarBackfillSnapshots_API({ dryRun: false });
  console.log('=== RESULTADO EJECUCIÓN REAL ===');
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ========== HISTORIAL COMPLETO CSV ==========

/**
 * Retorna TODAS las gestiones de la bitácora para exportación CSV.
 * Excluye gestiones de corrección (reversiones automáticas).
 */
function obtenerHistorialCompletoCSV() {
  const context = 'obtenerHistorialCompletoCSV';

  try {
    const todasGestiones = BitacoraService.obtenerGestiones();

    // Filtrar gestiones de corrección/reversión
    const observacionesExcluir = [
      'Reversión automática - Cierre incorrecto del masivo 01/04/2026'
    ];

    const gestiones = todasGestiones.filter(g => {
      const obs = String(g.observaciones || '');
      return !observacionesExcluir.some(excl => obs.includes(excl));
    });

    // Ordenar por asegurado y luego por fecha de registro
    gestiones.sort((a, b) => {
      const asegA = String(a.asegurado || '').toUpperCase();
      const asegB = String(b.asegurado || '').toUpperCase();
      if (asegA !== asegB) return asegA.localeCompare(asegB);
      const fA = a.fechaRegistro instanceof Date ? a.fechaRegistro.getTime() : 0;
      const fB = b.fechaRegistro instanceof Date ? b.fechaRegistro.getTime() : 0;
      return fA - fB;
    });

    // Convertir fechas a ISO para serialización
    const data = gestiones.map(g => ({
      idCiclo: g.idCiclo,
      idGestion: g.idGestion,
      origenRegistro: g.origenRegistro,
      fechaEnvioEECC: g.fechaEnvioEECC instanceof Date ? g.fechaEnvioEECC.toISOString() : g.fechaEnvioEECC,
      fechaRegistro: g.fechaRegistro instanceof Date ? g.fechaRegistro.toISOString() : g.fechaRegistro,
      asegurado: g.asegurado,
      ruc: g.ruc,
      responsable: g.responsable,
      tipoGestion: g.tipoGestion,
      estadoGestion: g.estadoGestion,
      canalContacto: g.canalContacto,
      fechaCompromiso: g.fechaCompromiso instanceof Date ? g.fechaCompromiso.toISOString() : g.fechaCompromiso,
      proximaAccion: g.proximaAccion,
      observaciones: g.observaciones,
      snapshotVencidoPEN: g.snapshotVencidoPEN || 0,
      snapshotVencidoUSD: g.snapshotVencidoUSD || 0
    }));

    Logger.info(context, `Historial exportado: ${data.length} gestiones (excluidas ${todasGestiones.length - data.length} correcciones)`);

    return { ok: true, data: data, total: data.length };

  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

// ========== REGISTRO MASIVO DE GESTIONES EN BITÁCORA ==========

/**
 * API para registro masivo de gestiones en la bitácora.
 *
 * LÓGICA:
 * - Excluye ciclos CERRADO_PAGADO y NO_COBRABLE
 * - Sin deuda vencida → registra como CERRADO_PAGADO
 * - Con deuda vencida → registra nueva gestión con mismo estado/campos
 *
 * USO DESDE Apps Script Editor:
 *   registrarGestionMasiva_API({ dryRun: true })    // Preview sin cambios
 *   registrarGestionMasiva_API({ dryRun: false })   // Ejecutar real
 *
 * @param {Object} opciones - { dryRun: boolean, limite: number, responsableFiltro: string }
 * @param {string} token - Token de autenticación (opcional para ejecución directa)
 * @return {Object} Resultado detallado del proceso masivo
 */
function registrarGestionMasiva_API(opciones, token) {
  const context = 'registrarGestionMasiva_API';

  try {
    // Validar sesión si se proporciona token
    if (token) {
      AuthService.validateSession(token);
    }

    Logger.info(context, 'Ejecutando registro masivo de gestiones', opciones);

    const resultado = BitacoraService.registrarGestionMasiva(opciones || {});

    Logger.info(context, 'Registro masivo completado', {
      dryRun: resultado.dryRun,
      procesados: resultado.resumen ? resultado.resumen.ciclosProcesados : 0,
      cerrados: resultado.resumen ? resultado.resumen.nuevosCerradosPagado : 0,
      mantenidos: resultado.resumen ? resultado.resumen.mantenidosConDeuda : 0,
      errores: resultado.resumen ? resultado.resumen.errores : 0
    });

    // Flush de todos los buffers
    try { Logger.flush(); } catch (e) { /* no-op */ }
    try { SpreadsheetApp.flush(); } catch (e) { /* no-op */ }

    return resultado;

  } catch (error) {
    Logger.error(context, 'Error en registro masivo API', error);
    try { Logger.flush(); } catch (e) { /* no-op */ }
    return { ok: false, error: error.message };
  }
}

/**
 * DRY RUN - Vista previa de la actualización masiva definitiva
 * Ejecutar desde el editor de Apps Script → Seleccionar función → Play
 *
 * Lógica unificada:
 * - NO_COBRABLE → no tocar
 * - CERRADO_PAGADO + deuda → reactivar EN_SEGUIMIENTO
 * - CERRADO_PAGADO + sin deuda → no tocar
 * - Activo + sin deuda → cerrar CERRADO_PAGADO
 * - Activo + con deuda → mismo estado + snapshot actualizado
 */
function TEST_gestionMasiva_DryRun() {
  const resultado = registrarGestionMasiva_API({ dryRun: true });
  console.log('=== ACTUALIZACIÓN MASIVA DEFINITIVA - DRY RUN ===');
  console.log('Resumen:', JSON.stringify(resultado.resumen, null, 2));
  if (resultado.detalles?.cerradosPagado?.length > 0) {
    console.log('Nuevos cierres:', JSON.stringify(resultado.detalles.cerradosPagado, null, 2));
  }
  if (resultado.detalles?.reactivados?.length > 0) {
    console.log('Reactivados:', JSON.stringify(resultado.detalles.reactivados, null, 2));
  }
  if (resultado.detalles?.mantenidos?.length > 0) {
    console.log('Mantenidos (primeros 10):', JSON.stringify(resultado.detalles.mantenidos.slice(0, 10), null, 2));
  }
  if (resultado.detalles?.errores?.length > 0) {
    console.log('Errores:', JSON.stringify(resultado.detalles.errores, null, 2));
  }
  console.log('Métricas:', JSON.stringify(resultado.metrics, null, 2));
  return resultado;
}

/**
 * EJECUCIÓN REAL - Aplica la actualización masiva definitiva
 * ⚠️ PRECAUCIÓN: Esta función MODIFICA datos. Ejecutar primero TEST_gestionMasiva_DryRun()
 */
function TEST_gestionMasiva_EJECUTAR() {
  const resultado = registrarGestionMasiva_API({ dryRun: false });
  console.log('=== ACTUALIZACIÓN MASIVA DEFINITIVA - EJECUCIÓN REAL ===');
  console.log('Resumen:', JSON.stringify(resultado.resumen, null, 2));
  console.log('Métricas:', JSON.stringify(resultado.metrics, null, 2));
  return resultado;
}

// ========== REVERSIÓN DE CIERRES INCORRECTOS ==========

/**
 * Revierte los 18 ciclos cerrados incorrectamente por el masivo del 01/04/2026.
 * Registra una nueva gestión restaurando el estado anterior.
 *
 * Ejecutar primero con dryRun=true para verificar.
 */
function TEST_revertirCierresIncorrectos_DryRun() {
  const resultado = revertirCierresIncorrectos_(true);
  console.log('=== REVERSIÓN - DRY RUN ===');
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function TEST_revertirCierresIncorrectos_EJECUTAR() {
  const resultado = revertirCierresIncorrectos_(false);
  console.log('=== REVERSIÓN - EJECUCIÓN REAL ===');
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function revertirCierresIncorrectos_(dryRun) {
  const context = 'revertirCierresIncorrectos_';

  // Los 18 ciclos cerrados incorrectamente y su estado anterior real
  const ciclosARevertir = [
    { asegurado: 'MARIA FERNANDA CALVO PEREZ SALAZAR', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GRUPO SP', estadoAnterior: 'SIN_RESPUESTA' },
    { asegurado: 'GRUPO ASEO, VIGILANCIA Y SALUD', estadoAnterior: 'SIN_RESPUESTA' },
    { asegurado: 'PIERRE CHAUVEL PAREDES', estadoAnterior: 'SIN_RESPUESTA' },
    { asegurado: 'GOMEZ DE LA TORRE MIRANDA JOSE ALEJANDRO DOMINGO', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GRUPO CARLEY', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'AUTOGAS JIREH S.A.C.', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GRUPO LOMAS DORADAS', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'MC METCO SAC', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GRUPO ENERGY', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GRUPO ALAS PERUANAS', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GRUPO INSUMEX', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GRUPO TACAMA', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GRUPO GLP Y GNV', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'MARTA VERONICA MIRANDA RIVERO', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'GOMEZ DE LA TORRE DE LAS CASAS ALVARO', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'ANDRES RICARDO BARRAGAN ASTE', estadoAnterior: 'EN_SEGUIMIENTO' },
    { asegurado: 'ALESSANDRA MARIA VISCONTI JUNGE', estadoAnterior: 'EN_SEGUIMIENTO' }
  ];

  Logger.info(context, 'Iniciando reversión', { dryRun, total: ciclosARevertir.length });

  try {
    // Obtener datos actuales de la bitácora para cada uno
    const resumen = BitacoraService.obtenerResumenCiclos({}, { _noPaginate: true });
    const ciclosMap = {};
    resumen.data.forEach(c => { ciclosMap[Utils.cleanText(c.asegurado)] = c; });

    const resultados = { revertidos: [], errores: [] };

    for (const item of ciclosARevertir) {
      try {
        const ciclo = ciclosMap[Utils.cleanText(item.asegurado)];
        if (!ciclo) {
          resultados.errores.push({ asegurado: item.asegurado, error: 'Ciclo no encontrado' });
          continue;
        }

        // Calcular snapshot real (con expansión de grupos)
        const esGrupo = GrupoEconomicoService.esGrupo(item.asegurado);
        const snapshot = BitacoraService._calcularSnapshotVencidos(item.asegurado, esGrupo);

        if (!dryRun) {
          BitacoraService._registrarGestionMasivaDirecta({
            idCiclo: ciclo.idCiclo,
            asegurado: item.asegurado,
            ruc: ciclo.ruc || '',
            fechaEnvioEECC: ciclo.fechaEnvioEECC,
            tipoGestion: ciclo.tipoGestion || 'OTRO',
            estadoGestion: item.estadoAnterior,
            canalContacto: ciclo.canalContacto || 'OTRO',
            fechaCompromiso: null,
            proximaAccion: 'Seguimiento',
            observaciones: 'Reversión automática - Cierre incorrecto del masivo 01/04/2026',
            responsable: ciclo.responsable
          }, snapshot);
        }

        resultados.revertidos.push({
          asegurado: item.asegurado,
          estadoRestaurado: item.estadoAnterior,
          snapshotPEN: snapshot.vencidoPEN,
          snapshotUSD: snapshot.vencidoUSD
        });

      } catch (err) {
        resultados.errores.push({ asegurado: item.asegurado, error: err.message });
      }
    }

    if (!dryRun && resultados.revertidos.length > 0) {
      BitacoraService.flush();
      SpreadsheetApp.flush();
    }

    Logger.info(context, 'Reversión completada', {
      revertidos: resultados.revertidos.length,
      errores: resultados.errores.length
    });
    Logger.flush();

    return { ok: true, dryRun, ...resultados };

  } catch (error) {
    Logger.error(context, 'Error en reversión', error);
    Logger.flush();
    return { ok: false, error: error.message };
  }
}

// ========== REGISTRAR NUEVOS CICLOS PARA CLIENTES SIN GESTIÓN ==========

function TEST_registrarNuevosCiclos_DryRun() {
  const resultado = registrarNuevosCiclos_({ dryRun: true });
  console.log('=== NUEVOS CICLOS - DRY RUN ===');
  console.log('Resumen:', JSON.stringify(resultado.resumen, null, 2));
  console.log('Métricas:', JSON.stringify(resultado.metrics, null, 2));
  if (resultado.registrados) {
    console.log('Primeros 10:', JSON.stringify(resultado.registrados.slice(0, 10), null, 2));
  }
  return resultado;
}

function TEST_registrarNuevosCiclos_EJECUTAR() {
  const resultado = registrarNuevosCiclos_({ dryRun: false });
  console.log('=== NUEVOS CICLOS - EJECUCIÓN REAL ===');
  console.log('Resumen:', JSON.stringify(resultado.resumen, null, 2));
  console.log('Métricas:', JSON.stringify(resultado.metrics, null, 2));
  return resultado;
}

function registrarNuevosCiclos_(opciones) {
  const context = 'registrarNuevosCiclos_';
  const dryRun = opciones.dryRun !== false;
  const startTime = Date.now();

  // Lista de 97 asegurados con su responsable
  const asegurados = [
    { nombre: 'ROMA TRADING S.A.C.', responsable: 'Pilar' },
    { nombre: 'S ABOGADOS Y CONSULTORES ASOCIADOS SAC', responsable: 'Pilar' },
    { nombre: 'THB PERU S.A. CORREDORES DE REASEGUROS', responsable: 'Pilar' },
    { nombre: 'AGILE WORKS S.R.L.', responsable: 'Pilar' },
    { nombre: 'TECH QUALITY PARTNERS S.A.C.', responsable: 'Pilar' },
    { nombre: 'PAUL ERIC HACHMANN HORN', responsable: 'Gladys' },
    { nombre: 'DIPROXER S.A.C', responsable: 'Pilar' },
    { nombre: 'DERK S.A.C.', responsable: 'Pilar' },
    { nombre: 'JIMENA GAZZO RAYGADA', responsable: 'Gladys' },
    { nombre: 'ADOLPHUS SERVICIOS ESPECIALIZADOS S.A.C.', responsable: 'Pilar' },
    { nombre: 'ASOCIACION EDUCATIVA SWEET ANGELS', responsable: 'Pilar' },
    { nombre: 'DULCE HERENCIA S.A.C.', responsable: 'Pilar' },
    { nombre: 'JOINT VENTURE COLIBRI INVERSIONES', responsable: 'Pilar' },
    { nombre: 'LP SERVICIO TEMPORAL S.R.L.', responsable: 'Pilar' },
    { nombre: 'YG GESTION PUBLICITARIA S.A.C.', responsable: 'Pilar' },
    { nombre: 'COMERCIAL FRANLIZ S.A.C.', responsable: 'Pilar' },
    { nombre: 'INVESTMENT AND SECURITIES S.A.C.', responsable: 'Pilar' },
    { nombre: 'RAINBOW SA', responsable: 'Pilar' },
    { nombre: 'EMPRESA EDUCATIVA GRUPO HORNA SOCIEDAD ANONIMA CERRADA', responsable: 'Pilar' },
    { nombre: 'ADRIATICA DE IMPORTACIONES Y EXPORTAC SA', responsable: 'Pilar' },
    { nombre: 'SISTEMAS INTEGRADOS H EIRL', responsable: 'Pilar' },
    { nombre: 'DANTE REYDO VILLALVA MUNIVE', responsable: 'Gladys' },
    { nombre: 'SERVICIOS LABORALES LIMA S R L', responsable: 'Pilar' },
    { nombre: 'ELIO CASARETO WERNER', responsable: 'Gladys' },
    { nombre: 'COOPERATIVA DE SERVICIOS MULTIPLES ALAS PERUANAS', responsable: 'Pilar' },
    { nombre: 'M.N.S.PROYECTOS INTEGRALES S.A.C.', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS DEL EDIFICIO ALVAREZ CALDERON N° 670-680-SAN ISIDRO', responsable: 'Pilar' },
    { nombre: 'CENTRO EDUCATIVO NO ESTATAL MEDALLA MILAGROSA', responsable: 'Pilar' },
    { nombre: 'EDUARDO IGNACIO FLOREZ MIRANDA', responsable: 'Gladys' },
    { nombre: 'OLIMPEX PERU S.A.C.', responsable: 'Pilar' },
    { nombre: 'MARIE CARMEN PAJUELO BARBA', responsable: 'Gladys' },
    { nombre: 'INVERSIONES AGROINDUSTRIALES MUNDO S.A.C.', responsable: 'Pilar' },
    { nombre: 'GRUPO AGV S.A.C.', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS DEL EDIFICIO ANGAMOS OESTE 1431 MIRAFLORES', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS DEL EDIFICIO ALIDE', responsable: 'Pilar' },
    { nombre: 'K&C INVERSIONES GENERALES S.A.C.', responsable: 'Pilar' },
    { nombre: 'SANDRA FLOREZ CHANG', responsable: 'Gladys' },
    { nombre: 'IÑIGO JOSE OLAECHEA DIEZ', responsable: 'Gladys' },
    { nombre: 'RAFAEL LUIS CARRIQUIRY DALY', responsable: 'Gladys' },
    { nombre: 'COO DE TRAB Y FOM DE EMP REAL FELIPE LTA', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS EDIFICIO ALFREDO SALAZAR 661-663', responsable: 'Pilar' },
    { nombre: 'CAPITOLIUM ENTERPRISES & BUSINESS S.A.C.', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS EDIFICIO MURANO', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS DEL EDIFICIO PARQUE FEDERICO BLUME N° 186 - 188- 190A', responsable: 'Pilar' },
    { nombre: 'DIEGO EDUARDO BARRAGAN ASTE', responsable: 'Gladys' },
    { nombre: 'PABLO LEONARDO TRAPUNSKY VILLAR', responsable: 'Gladys' },
    { nombre: 'LUIS FERNANDO PAINO SCARPATI', responsable: 'Gladys' },
    { nombre: 'CONVERSIONES GN AUTOGAS S.A.C', responsable: 'Pilar' },
    { nombre: 'GASNORT TRUJILLO S.A.C.', responsable: 'Pilar' },
    { nombre: 'ARCADA INMOBILIARIA EIRL', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS CALLE CARLOS GRAÑA ELIZALDES NUMERO 150 SAN ISIDRO', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS PARQUE VILLENA REY N° 158-162 MIRAFLORES', responsable: 'Pilar' },
    { nombre: 'LUJAN SARO ABOGADOS Y ASOCIADOS S.A.C.', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS EDIFICIO ABBEX', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS EDIFICIO ALMIRANTE LORD NELSON 433-433A-435', responsable: 'Pilar' },
    { nombre: 'GRUPO CAVENAGO', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS LOTE 10 MZ C-2 AVENIDA ESMERALDA N° 290-296', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS EDIFICIO AVENIDA GENERAL JACINTO LARA N° 483', responsable: 'Pilar' },
    { nombre: 'NATALIA MARIA HERRERA DEXTRE', responsable: 'Gladys' },
    { nombre: 'INVERSIONES Z - TOURS .S.A.C.', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS MANUEL PRADO UGARTECHE N°335 DISTRITO DE LA MOLINA', responsable: 'Pilar' },
    { nombre: 'LUZ MARIA LIMAYMANTA RODRIGUEZ', responsable: 'Gladys' },
    { nombre: 'JUNT PROP EDIF VICTOR MAURTUA 459 SAN ISIDRO', responsable: 'Pilar' },
    { nombre: 'CONURMA INGENIEROS CONSULTORES S.L. SUCURSAL DEL PERU', responsable: 'Pilar' },
    { nombre: 'ENERCONSULT S.A.', responsable: 'Pilar' },
    { nombre: 'GROMAR INTERNATIONAL SERVICE S.A.C', responsable: 'Pilar' },
    { nombre: 'AUTOGAS HYM S.A.C.', responsable: 'Pilar' },
    { nombre: 'ÑAWPA PACHA S.A.C.', responsable: 'Pilar' },
    { nombre: 'AUTOMOTRIZ R & J SERVICIOS GENERALES E.I.R.L.', responsable: 'Pilar' },
    { nombre: 'AUTOTRONICA JOEL CARS E.I.R.L.', responsable: 'Pilar' },
    { nombre: 'GNC INGENIERIA S.A.C.', responsable: 'Pilar' },
    { nombre: 'MEGA CONVERSIONES GAS DEL NORTE S.A.C. - M.G. GAS DEL NORTE S.A.C.', responsable: 'Pilar' },
    { nombre: 'MAX EMILIO RIOS CHAVEZ', responsable: 'Gladys' },
    { nombre: 'INVERSIONES CACATURO S.A.C.', responsable: 'Pilar' },
    { nombre: 'BEDINI PERU S.A.C.', responsable: 'Pilar' },
    { nombre: 'BEDITEC PERU E.I.R.L', responsable: 'Pilar' },
    { nombre: 'CORPORACION VIGO S.A.C.', responsable: 'Pilar' },
    { nombre: 'PS VENDING S.A.C', responsable: 'Pilar' },
    { nombre: 'ELIAS MIGUEL CASTRO PULCHA', responsable: 'Gladys' },
    { nombre: 'CALLE LORD NELSON NUMERO 205-207-207A MIRAFLORES', responsable: 'Pilar' },
    { nombre: 'SERVICENTRO UNIVERSAL S.R.L.', responsable: 'Pilar' },
    { nombre: 'JUNTA DE PROPIETARIOS EDIF CAMINO REAL 1', responsable: 'Pilar' },
    { nombre: 'SCOBEL CORPORATION S.A.C.', responsable: 'Pilar' },
    { nombre: 'COLIBRI COPPER S.A.C.', responsable: 'Pilar' },
    { nombre: 'COLIBRI REFINERY S.A.C.', responsable: 'Pilar' },
    { nombre: 'MARIA CRISTINA MUSSO CANEPA', responsable: 'Gladys' },
    { nombre: 'ROSA LUZ BELTRAN PONCE', responsable: 'Gladys' },
    { nombre: 'SHIRLEY SUSAN ORE RAMIREZ', responsable: 'Gladys' },
    { nombre: 'G & J AMPAZ ASOCIADOS S.A.C.', responsable: 'Pilar' },
    { nombre: 'MARIA FANNY LILIANA VELARDE SANTA MARIA', responsable: 'Gladys' },
    { nombre: 'INVERSIONES GENESIS II SAC', responsable: 'Pilar' },
    { nombre: 'MERCEDES MARIA BACA BERNUY', responsable: 'Gladys' },
    { nombre: 'MERCHANDISING \'\'R\'\' US S.A.C.', responsable: 'Pilar' },
    { nombre: 'ANA LUZ VASQUEZ BUSTAMANTE', responsable: 'Gladys' },
    { nombre: 'EDITH MARIA SANCHEZ SANCHEZ', responsable: 'Gladys' },
    { nombre: 'LA COCINA DE CHANA E.I.R.L.', responsable: 'Pilar' },
    { nombre: 'INDIRA YOLANDA TECCO ESPINOZA', responsable: 'Gladys' }
  ];

  Logger.info(context, 'Registrando nuevos ciclos', { dryRun, total: asegurados.length });

  const metrics = { startTime: new Date().toISOString() };

  try {
    // Calcular snapshots masivos (con expansión de grupos)
    const t1 = Date.now();
    const snapshots = BitacoraService._calcularSnapshotsMasivos(asegurados.map(a => a.nombre));
    metrics.snapshotCalcMs = Date.now() - t1;

    const registrados = [];
    const errores = [];

    const t2 = Date.now();
    for (const item of asegurados) {
      try {
        const key = Utils.cleanText(item.nombre);
        const snap = snapshots[key] || { vencidoPEN: 0, vencidoUSD: 0 };
        const esPilar = item.responsable === 'Pilar';

        const idCiclo = BitacoraService._generarIdCiclo(item.nombre);

        if (!dryRun) {
          BitacoraService._registrarGestionMasivaDirecta({
            idCiclo: idCiclo,
            asegurado: item.nombre,
            ruc: '',
            fechaEnvioEECC: BitacoraService._getFechaPeru(),
            tipoGestion: esPilar ? 'CORREO_INDIVIDUAL' : 'LLAMADA',
            estadoGestion: 'EN_SEGUIMIENTO',
            canalContacto: esPilar ? 'EMAIL' : 'LLAMADA',
            fechaCompromiso: null,
            proximaAccion: 'Enviar recordatorio',
            observaciones: 'A la espera de la respuesta por parte del asegurado.',
            responsable: item.responsable
          }, snap);
        }

        registrados.push({
          asegurado: item.nombre,
          responsable: item.responsable,
          canal: esPilar ? 'EMAIL' : 'LLAMADA',
          snapshotPEN: snap.vencidoPEN,
          snapshotUSD: snap.vencidoUSD
        });

      } catch (err) {
        errores.push({ asegurado: item.nombre, error: err.message });
      }
    }
    metrics.registroMs = Date.now() - t2;

    if (!dryRun && registrados.length > 0) {
      const t3 = Date.now();
      BitacoraService.flush();
      SpreadsheetApp.flush();
      metrics.flushMs = Date.now() - t3;
    }

    metrics.totalMs = Date.now() - startTime;

    const resultado = {
      ok: true,
      dryRun,
      resumen: {
        totalAsegurados: asegurados.length,
        registrados: registrados.length,
        errores: errores.length
      },
      registrados,
      errores,
      metrics
    };

    Logger.info(context, 'Completado', resultado.resumen);
    try { Logger.flush(); } catch (e) { /* no-op */ }

    return resultado;

  } catch (error) {
    Logger.error(context, 'Error', error);
    try { Logger.flush(); } catch (e) { /* no-op */ }
    return { ok: false, error: error.message };
  }
}

// ========== DETECTAR CLIENTES/GRUPOS SIN GESTIÓN EN BITÁCORA ==========

/**
 * Encuentra asegurados en la BD que NO tienen ninguna gestión en la bitácora.
 * Separa en: clientes individuales (no pertenecen a grupo) y grupos económicos.
 * Excluye miembros de grupos (se gestionan a nivel de grupo).
 */
function TEST_clientesSinGestion() {
  const resultado = detectarClientesSinGestion_();
  console.log('=== CLIENTES Y GRUPOS SIN GESTIÓN EN BITÁCORA ===');
  console.log('Resumen:', JSON.stringify(resultado.resumen, null, 2));
  console.log('\n--- CLIENTES INDIVIDUALES SIN GESTIÓN ---');
  resultado.clientesSinGestion.forEach(c => {
    console.log(`  ${c.asegurado} | PEN: ${c.vencidoPEN} | USD: ${c.vencidoUSD} | Cupones: ${c.cuponesVencidos}`);
  });
  console.log('\n--- GRUPOS ECONÓMICOS SIN GESTIÓN ---');
  resultado.gruposSinGestion.forEach(g => {
    console.log(`  ${g.grupo} | PEN: ${g.vencidoPEN} | USD: ${g.vencidoUSD} | Miembros: ${g.miembros}`);
  });
  return resultado;
}

function detectarClientesSinGestion_() {
  const context = 'detectarClientesSinGestion_';

  try {
    // FASE 1: Leer BD y obtener asegurados únicos con deuda vencida
    const bdData = SheetsIO.readSheet(getConfig('SHEETS.BASE', 'BD'));
    const colMap = bdData.columnMap;
    const aseguradoIdx = colMap['ASEGURADO'] ?? -1;
    const importeIdx = colMap['IMPORTE'] ?? -1;
    const monIdx = colMap['MON'] ?? -1;
    const fecVencIdx = colMap['FEC_VENCIMIENTO_COB'] ?? colMap['FEC_VENCIMIENTO COB'] ?? colMap['FEC VENCIMIENTO COB'] ?? -1;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Acumular datos por asegurado de BD
    const aseguradosBD = {}; // { nombre: { vencidoPEN, vencidoUSD, cuponesTotal, cuponesVencidos } }

    for (const row of bdData.rows) {
      const nombre = Utils.cleanText(String(row[aseguradoIdx] || ''));
      if (!nombre) continue;

      if (!aseguradosBD[nombre]) {
        aseguradosBD[nombre] = { vencidoPEN: 0, vencidoUSD: 0, cuponesTotal: 0, cuponesVencidos: 0 };
      }

      aseguradosBD[nombre].cuponesTotal++;

      const fecVenc = BitacoraService._parseDate(row[fecVencIdx]);
      if (!fecVenc) continue;
      fecVenc.setHours(0, 0, 0, 0);
      if (fecVenc >= hoy) continue;

      const importe = BitacoraService._parseNumber(row[importeIdx]);
      if (importe <= 0) continue;

      aseguradosBD[nombre].cuponesVencidos++;
      const moneda = String(row[monIdx] || 'PEN').toUpperCase();
      const esUSD = moneda.includes('USD') || moneda.includes('US$') || moneda.includes('DOLAR') || moneda.includes('DOLLAR');

      if (esUSD) {
        aseguradosBD[nombre].vencidoUSD += importe;
      } else {
        aseguradosBD[nombre].vencidoPEN += importe;
      }
    }

    // Redondear
    for (const k in aseguradosBD) {
      aseguradosBD[k].vencidoPEN = Math.round(aseguradosBD[k].vencidoPEN * 100) / 100;
      aseguradosBD[k].vencidoUSD = Math.round(aseguradosBD[k].vencidoUSD * 100) / 100;
    }

    // FASE 2: Leer asegurados únicos de la bitácora
    const todasGestiones = BitacoraService.obtenerGestiones();
    const aseguradosBitacora = new Set();
    todasGestiones.forEach(g => {
      aseguradosBitacora.add(Utils.cleanText(g.asegurado));
    });

    // FASE 3: Cargar grupos económicos
    const todosGrupos = GrupoEconomicoService.getGrupos ? GrupoEconomicoService.getGrupos() : [];
    const gruposSet = new Set(todosGrupos.map(g => Utils.cleanText(g)));

    // Obtener todos los miembros de todos los grupos
    const miembrosDeGrupos = new Set();
    const grupoMiembrosMap = {};
    for (const grupo of todosGrupos) {
      const miembros = GrupoEconomicoService.getAsegurados(grupo);
      grupoMiembrosMap[Utils.cleanText(grupo)] = miembros || [];
      (miembros || []).forEach(m => miembrosDeGrupos.add(Utils.cleanText(m)));
    }

    // FASE 4: Clasificar
    const clientesSinGestion = [];
    const gruposSinGestion = [];
    const miembrosExcluidos = [];

    for (const nombre in aseguradosBD) {
      const data = aseguradosBD[nombre];

      // Solo incluir los que tienen deuda vencida
      if (data.vencidoPEN === 0 && data.vencidoUSD === 0) continue;

      // Verificar si ya tiene gestión en bitácora
      if (aseguradosBitacora.has(nombre)) continue;

      // Verificar si es miembro de un grupo → excluir (se gestiona a nivel grupo)
      if (miembrosDeGrupos.has(nombre)) {
        miembrosExcluidos.push({ asegurado: nombre, grupo: GrupoEconomicoService.getGrupo ? GrupoEconomicoService.getGrupo(nombre) : '?' });
        continue;
      }

      clientesSinGestion.push({
        asegurado: nombre,
        vencidoPEN: data.vencidoPEN,
        vencidoUSD: data.vencidoUSD,
        cuponesVencidos: data.cuponesVencidos
      });
    }

    // Verificar grupos que no tienen gestión
    for (const grupo of todosGrupos) {
      const grupoKey = Utils.cleanText(grupo);
      if (aseguradosBitacora.has(grupoKey)) continue;

      // Calcular deuda total del grupo sumando miembros
      const miembros = grupoMiembrosMap[grupoKey] || [];
      let vencidoPEN = 0, vencidoUSD = 0;
      for (const m of miembros) {
        const mKey = Utils.cleanText(m);
        if (aseguradosBD[mKey]) {
          vencidoPEN += aseguradosBD[mKey].vencidoPEN;
          vencidoUSD += aseguradosBD[mKey].vencidoUSD;
        }
      }

      if (vencidoPEN > 0 || vencidoUSD > 0) {
        gruposSinGestion.push({
          grupo,
          miembros: miembros.length,
          vencidoPEN: Math.round(vencidoPEN * 100) / 100,
          vencidoUSD: Math.round(vencidoUSD * 100) / 100
        });
      }
    }

    // Ordenar por deuda total descendente
    clientesSinGestion.sort((a, b) => (b.vencidoPEN + b.vencidoUSD) - (a.vencidoPEN + a.vencidoUSD));
    gruposSinGestion.sort((a, b) => (b.vencidoPEN + b.vencidoUSD) - (a.vencidoPEN + a.vencidoUSD));

    const resultado = {
      ok: true,
      resumen: {
        totalAseguradosBD: Object.keys(aseguradosBD).length,
        totalEnBitacora: aseguradosBitacora.size,
        clientesSinGestion: clientesSinGestion.length,
        gruposSinGestion: gruposSinGestion.length,
        miembrosExcluidosPorGrupo: miembrosExcluidos.length
      },
      clientesSinGestion,
      gruposSinGestion,
      miembrosExcluidos: miembrosExcluidos.slice(0, 10)
    };

    Logger.info(context, 'Detección completada', resultado.resumen);
    try { Logger.flush(); } catch (e) { /* no-op */ }

    return resultado;

  } catch (error) {
    Logger.error(context, 'Error', error);
    try { Logger.flush(); } catch (e) { /* no-op */ }
    return { ok: false, error: error.message };
  }
}

// ========== ELIMINAR REGISTROS DE MIEMBROS INDIVIDUALES DE GRUPOS ==========

/**
 * Elimina filas de la bitácora que pertenecen a miembros individuales de grupos económicos.
 * Estos miembros se gestionan a nivel de grupo, no individual.
 */
function TEST_eliminarMiembroGrupo_DryRun() {
  const resultado = eliminarRegistrosMiembroGrupo_('CORPORACION INSUMEX S.A.C.', true);
  console.log('=== ELIMINAR MIEMBRO GRUPO - DRY RUN ===');
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

function TEST_eliminarMiembroGrupo_EJECUTAR() {
  const resultado = eliminarRegistrosMiembroGrupo_('CORPORACION INSUMEX S.A.C.', false);
  console.log('=== ELIMINAR MIEMBRO GRUPO - EJECUCIÓN REAL ===');
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/**
 * Elimina todas las filas de un asegurado específico de la hoja Bitacora_Gestiones_EECC.
 * @param {string} asegurado - Nombre exacto del asegurado
 * @param {boolean} dryRun - Si true, solo reporta sin eliminar
 */
function eliminarRegistrosMiembroGrupo_(asegurado, dryRun) {
  const context = 'eliminarRegistrosMiembroGrupo_';

  try {
    Logger.info(context, 'Buscando registros a eliminar', { asegurado, dryRun });

    const bitacoraSpreadsheetId = getConfig('BITACORA.SPREADSHEET_ID', getConfig('SPREADSHEET_ID', ''));
    const ss = SheetsIO._getSpreadsheet(bitacoraSpreadsheetId);
    const sheet = ss.getSheetByName('Bitacora_Gestiones_EECC');

    if (!sheet) {
      return { ok: false, error: 'Hoja Bitacora_Gestiones_EECC no encontrada' };
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return { ok: true, dryRun, eliminadas: 0, message: 'Hoja vacía' };
    }

    // Leer columna ASEGURADO (columna 6)
    const data = sheet.getRange(2, 1, lastRow - 1, 16).getValues();
    const aseguradoNorm = Utils.cleanText(asegurado);

    // Encontrar filas que coinciden (de abajo hacia arriba para no afectar índices al eliminar)
    const filasAEliminar = [];
    for (let i = data.length - 1; i >= 0; i--) {
      const filaAsegurado = Utils.cleanText(String(data[i][5] || ''));
      if (filaAsegurado === aseguradoNorm) {
        filasAEliminar.push({
          rowNum: i + 2, // Fila real en la hoja
          idCiclo: data[i][0],
          idGestion: data[i][1],
          estado: data[i][9],
          fecha: data[i][4]
        });
      }
    }

    Logger.info(context, `Filas encontradas: ${filasAEliminar.length}`, { asegurado });

    if (!dryRun && filasAEliminar.length > 0) {
      // Eliminar de abajo hacia arriba
      for (const fila of filasAEliminar) {
        sheet.deleteRow(fila.rowNum);
      }
      SpreadsheetApp.flush();
      BitacoraService._clearCache();
    }

    try { Logger.flush(); } catch (e) { /* no-op */ }

    return {
      ok: true,
      dryRun,
      asegurado,
      filasEliminadas: filasAEliminar.length,
      detalles: filasAEliminar
    };

  } catch (error) {
    Logger.error(context, 'Error', error);
    return { ok: false, error: error.message };
  }
}

// ========== REACTIVACIÓN DE CERRADOS CON NUEVA DEUDA ==========

/**
 * Revisa ciclos CERRADO_PAGADO: si tienen nueva deuda vencida → los reactiva a EN_SEGUIMIENTO.
 * Usa _calcularSnapshotsMasivos (optimizado, 1 pasada) con expansión de grupos.
 */
function TEST_reactivarCerradosConDeuda_DryRun() {
  const resultado = reactivarCerradosConDeuda_({ dryRun: true });
  console.log('=== REACTIVACIÓN CERRADOS - DRY RUN ===');
  console.log('Resumen:', JSON.stringify(resultado.resumen, null, 2));
  if (resultado.reactivados) {
    console.log('Reactivados:', JSON.stringify(resultado.reactivados.slice(0, 20), null, 2));
  }
  if (resultado.sinDeuda) {
    console.log('Sin deuda (OK):', resultado.sinDeuda.length);
  }
  console.log('Métricas:', JSON.stringify(resultado.metrics, null, 2));
  return resultado;
}

function TEST_reactivarCerradosConDeuda_EJECUTAR() {
  const resultado = reactivarCerradosConDeuda_({ dryRun: false });
  console.log('=== REACTIVACIÓN CERRADOS - EJECUCIÓN REAL ===');
  console.log('Resumen:', JSON.stringify(resultado.resumen, null, 2));
  console.log('Métricas:', JSON.stringify(resultado.metrics, null, 2));
  return resultado;
}

function reactivarCerradosConDeuda_(opciones) {
  const context = 'reactivarCerradosConDeuda_';
  const dryRun = opciones.dryRun !== false;
  const startTime = Date.now();

  Logger.info(context, 'Iniciando revisión de cerrados con nueva deuda', { dryRun });

  const metrics = { startTime: new Date().toISOString() };

  try {
    // FASE 1: Obtener SOLO los ciclos CERRADO_PAGADO
    const t1 = Date.now();
    const resumen = BitacoraService.obtenerResumenCiclos({}, { _noPaginate: true });
    metrics.bitacoraReadMs = Date.now() - t1;

    const cerrados = resumen.data.filter(c => c.estadoGestion === 'CERRADO_PAGADO');
    Logger.info(context, `Ciclos CERRADO_PAGADO encontrados: ${cerrados.length}`);

    if (cerrados.length === 0) {
      return { ok: true, dryRun, resumen: { cerrados: 0, reactivados: 0 }, metrics };
    }

    // FASE 2: Calcular snapshots masivos (con expansión de grupos)
    const t2 = Date.now();
    const snapshots = BitacoraService._calcularSnapshotsMasivos(cerrados.map(c => c.asegurado));
    metrics.snapshotCalcMs = Date.now() - t2;

    // FASE 3: Clasificar
    const reactivados = [];
    const sinDeuda = [];
    const errores = [];

    const t3 = Date.now();
    for (const ciclo of cerrados) {
      try {
        const key = Utils.cleanText(ciclo.asegurado);
        const snap = snapshots[key] || { vencidoPEN: 0, vencidoUSD: 0 };
        const tieneDeuda = snap.vencidoPEN > 0 || snap.vencidoUSD > 0;

        if (tieneDeuda) {
          // Tiene nueva deuda → reactivar a EN_SEGUIMIENTO
          if (!dryRun) {
            BitacoraService._registrarGestionMasivaDirecta({
              idCiclo: ciclo.idCiclo,
              asegurado: ciclo.asegurado,
              ruc: ciclo.ruc || '',
              fechaEnvioEECC: ciclo.fechaEnvioEECC,
              tipoGestion: ciclo.tipoGestion || 'OTRO',
              estadoGestion: 'EN_SEGUIMIENTO',
              canalContacto: ciclo.canalContacto || 'OTRO',
              fechaCompromiso: null,
              proximaAccion: 'Seguimiento - Nueva deuda vencida detectada',
              observaciones: 'Reactivación automática - Nuevos cupones vencidos detectados',
              responsable: ciclo.responsable
            }, snap);
          }

          reactivados.push({
            asegurado: ciclo.asegurado,
            responsable: ciclo.responsable,
            snapshotPEN: snap.vencidoPEN,
            snapshotUSD: snap.vencidoUSD
          });
        } else {
          sinDeuda.push({ asegurado: ciclo.asegurado });
        }
      } catch (err) {
        errores.push({ asegurado: ciclo.asegurado, error: err.message });
      }
    }
    metrics.registroMs = Date.now() - t3;

    // FASE 4: Flush
    if (!dryRun && reactivados.length > 0) {
      const t4 = Date.now();
      BitacoraService.flush();
      SpreadsheetApp.flush();
      metrics.flushMs = Date.now() - t4;
    }

    metrics.totalMs = Date.now() - startTime;

    const resultado = {
      ok: true,
      dryRun,
      resumen: {
        totalCerrados: cerrados.length,
        reactivados: reactivados.length,
        sinDeuda: sinDeuda.length,
        errores: errores.length
      },
      reactivados,
      sinDeuda: sinDeuda.slice(0, 10),
      errores,
      metrics
    };

    Logger.info(context, 'Revisión completada', resultado.resumen);
    try { Logger.flush(); } catch (e) { /* no-op */ }

    return resultado;

  } catch (error) {
    Logger.error(context, 'Error', error);
    try { Logger.flush(); } catch (e) { /* no-op */ }
    return { ok: false, error: error.message, metrics };
  }
}

// ========== ACTUALIZACIÓN MASIVA DE RESPONSABLES EN BITÁCORA ==========

/**
 * Actualiza el campo RESPONSABLE en la hoja Bitácora para los asegurados indicados.
 * Ejecutar desde el editor de Apps Script.
 * @param {boolean} dryRun - Si true, solo reporta sin modificar (default: true)
 */
function actualizarResponsablesBitacora(dryRun) {
  if (dryRun === undefined) dryRun = true;

  var MAPA_RESPONSABLES = {
    'CORPORACION INSUMEX S.A.C.': 'Pilar',
    'AGROPECUARIA PAMAJOSA S.A.': 'Pilar',
    'COMEDOR EXPRESS E.I.R.L.': 'Pilar',
    'R18 GASTRONOMICO S.R.L.': 'Pilar',
    'POZO ALTO S.A.C.': 'Pilar',
    'ALVARADO TRUCIOS MARIA JENIFFER': 'Gladys',
    'OSCAR CARLOS ANDRES VALENCIA FRIEDMANN': 'Gladys',
    'LORENA MONTENEGRO CARRION': 'Gladys',
    'ANITA EMPERATRIZ VARGAS VENEGAS': 'Gladys',
    'ENRIQUE GERARDO LLANOS CAMPOS': 'Gladys',
    'INVERSIONES LOS ROSALES S.A.': 'Pilar',
    'ROCIO VELARDE COLOMA': 'Gladys',
    'MAYRA JUDITH FELICIANO ANCHELIA': 'Gladys',
    'IRIS MILAGROS RAMIREZ PARODI': 'Gladys',
    'DIEGO ALONSO GARCIA SAYAN': 'Gladys',
    'MARISOL DEL ROSARIO PEÑALOZA RODRIGUEZ': 'Gladys',
    'HARADA HIGASHI JUAN FERNANDO': 'Gladys',
    'ANDUAGA GANOZA AURORA INES': 'Gladys',
    'URSULA MARIETA HAMMERSCHMIDT RUIZ': 'Gladys',
    'JESSICA CECILIA HARADA WAKAO': 'Gladys',
    'LUIS FERNANDO CHAVEZ TORRES': 'Gladys',
    'ALL BUSINESS SOLUTIONS SAC': 'Pilar',
    'TRANSCLOT SAC': 'Pilar',
    'CLIMA SISTEMAS SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'YEMPAC PHARMACEUTICA SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'GRUPO ONCOLOGICO MD S.A.C.': 'Pilar',
    'CIME INGENIEROS S.R.L.': 'Pilar',
    'ENCARGA S.R.L.': 'Pilar',
    'JANEL S.A.C.': 'Pilar',
    'MOTOR GAS ALVARADO S.A.C': 'Pilar',
    'CORPORACION CREDITAXI S.A.C.': 'Pilar',
    'MACUSANI URANIUM S.A.C.': 'Pilar',
    'RIO EBRO S.A.C.': 'Pilar',
    'FERCO MEDICAL S.A.C.': 'Pilar',
    'FUNDO LA BODEGA S.A.C.': 'Pilar',
    'SOFIA MONICA GUZMAN TORRES': 'Gladys',
    'EQUIPHARMA HIPICA Y SERVICIOS VETERINARIOS S.A.C.': 'Pilar',
    'CALZADO TAZ SAC': 'Pilar',
    'JOSE ERNESTO MOSCOSO GARCIA': 'Gladys',
    'DJK INTERNATIONAL S.A.C.': 'Pilar',
    'ADOLPHUS S. A.': 'Pilar',
    'CONGREGACION DE LA PASION DE JESUCRISTO': 'Pilar',
    'ROBERTO NICANOR HERRERA CARCELEN': 'Gladys',
    'DJM DISTRIBUTION S.A.C.': 'Pilar',
    'MACUSANI YELLOWCAKE S.A.C.': 'Pilar',
    'TORSA MINING SERVICES PERU S.A.C.': 'Pilar',
    'SINO MAQUINARIAS Y TECNOLOGIA S.A.C.': 'Pilar',
    'SOCIEDAD ANONIMA FAUSTO PIAGGIO': 'Pilar',
    'CONSTRUMAQ CONTRATISTAS GENERALES S.A.C.': 'Pilar',
    'MULTICARGAS EGAMILK E.I.R.L.': 'Pilar',
    'JUNTA DE PROPIETARIOS DEL EDIFICIO LORD COCHRANE II': 'Pilar',
    'RDD SERVICIOS S.A.C.': 'Pilar',
    'CONSORCIO DE LIMPIEZA Y SANEAMIENTO AMBIENTAL': 'Pilar',
    'SECURYDAT S.A.C.': 'Pilar',
    'ORIENTARE S.A.C.': 'Pilar',
    'INGEOSERVICE N & O S.A.C.': 'Pilar',
    'JORGE ERNESTO SUCESION PICASSO': 'Gladys',
    'JUNTA DE PROPIETARIOS EDIFICIO MULTIFAMILIAR VERAMAR': 'Pilar',
    'VICTOR ALEJANDRO BRAVO CONTRERAS': 'Gladys',
    'ALFREDO MARTIN GAVIDIA ALVAREZ': 'Gladys',
    'MINISTERIO DEL INTERIOR': 'Pilar',
    'CONSTRUCTORA GN GAMBOA & CIA SAC': 'Pilar',
    'CONSORCIO SAN GABRIEL': 'Pilar',
    'CONSORCIO GABRIEL II': 'Pilar',
    'JUNTA DE PROPIETARIOS DEL COND. VIV.TEMPORALES KAIA BEACH': 'Pilar',
    'THALES DIS MEXICO, S.A. DE C.V. SUCURSAL DEL PERU': 'Pilar',
    'MARIELLA LETICIA DEXTRE CHACON DE HERRERA': 'Gladys',
    'DIAZ PALACIOS CARMEN FRANCISCA': 'Gladys',
    'ALESSANDRA MARIA VISCONTI JUNGE': 'Gladys',
    'BELTRAN PAZ VENTURA': 'Gladys',
    'ANA MARIA ALVAREZ CALDERON FERNANDINI DE OLAECHEA': 'Gladys',
    'KARINA LIDIA MORON DIAZ': 'Gladys',
    'JORGE ENRIQUE SAAVEDRA JORIE': 'Gladys',
    'JULIO NICOLAS MORALES DORA': 'Gladys',
    'CHRISLEY TEODORA ARZAPALO RECINES': 'Gladys',
    'ANDRES RICARDO BARRAGAN ASTE': 'Gladys',
    'GOMEZ DE LA TORRE DE LAS CASAS ALVARO': 'Gladys',
    'JOSE MANUEL ALVILDO ENCINAS': 'Gladys',
    'ALEJANDRO RAUL RUIZ SANCHEZ SALAZAR': 'Gladys',
    'MARTA VERONICA MIRANDA RIVERO': 'Gladys',
    'PATRICIA MARIA UZATEGUI DANZ': 'Gladys',
    'ROBERTO CARLOS CARBAJAL CHIOK': 'Pilar',
    'FORTUNIC ALVARADO MARIA ISABEL': 'Gladys',
    'ROXANA LORENA RONCALDO VERGARA': 'Gladys',
    'JOSE LUIS TOMAS VELARDE SANTA MARIA': 'Gladys',
    'GRUPO GLP Y GNV': 'Pilar',
    'SERTECPET DE PERU S.A.': 'Pilar',
    'PROYECTO ESPECIAL CHINECAS': 'Pilar',
    'SUBASTAS PERUANAS S.A.C.': 'Pilar',
    'BIG DATA S.A.C.': 'Pilar',
    'GRUPO TACAMA': 'Pilar',
    'GRUPO INSUMEX': 'Pilar',
    'GRUPO ALAS PERUANAS': 'Pilar',
    'EMPRESA DE TRANSPORTES SHON\'S S.R.L.': 'Pilar',
    'NFU PERU': 'Pilar',
    'CHINGUDI CARGO SAC': 'Pilar',
    'DEPOSITOS Y VENTAS SOCIEDAD ANONIMA': 'Pilar',
    'ALE ASESORES Y CONSULTORES S.A.C.': 'Pilar',
    'INNOVATIVE TECH AID SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'YURI ELEAZAR TORRES MIRANDA': 'Gladys',
    'GRUPO ENERGY': 'Pilar',
    'TWM DISTRIBUTION SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'SERVIMELSA EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA': 'Pilar',
    'DMARAN AJUSTADORES DE SINIESTROS DE SEGUROS GENERALES S.A.C.': 'Pilar',
    'FRENO SERVO E.I.R.L.': 'Pilar',
    'J & N SEGURIDAD Y VIGILANCIA PRIVADA S.A.C.': 'Pilar',
    'MULTIMARCA AUTOMOTRIZ S.A.C.': 'Pilar',
    'MC METCO SAC': 'Pilar',
    'OMNITRACK S.A.C.': 'Pilar',
    '3N INTEGRADORES & CONSULTORES SAC': 'Pilar',
    'ESTUDIO ROSSELLO SCRL': 'Pilar',
    'ESCUELA DE AVIACION CIVIL JORGE CHAVEZ DARTNELL S.A.': 'Pilar',
    'VALLEY RUBBER SUCURSAL DEL PERU': 'Pilar',
    'J.& R. AGRO TECHNICAL INTERNATIONAL S.A.C.': 'Pilar',
    'CORPORACION CAMAJEA S.A.C.': 'Pilar',
    'GRUPO LOMAS DORADAS': 'Pilar',
    'FUSION DE TALENTOS E.I.R.L.': 'Pilar',
    'SEGURIDAD 111 S.R.L.': 'Pilar',
    'JS INDUSTRIAL S.A.C.': 'Pilar',
    'OPERACIONES SERVICIOS Y SISTEMAS S.R.L.': 'Pilar',
    'ELECTRO G & S INGENIEROS S.A.C': 'Pilar',
    'ME ELECMETAL COMERCIAL PERU S.A.C.': 'Pilar',
    'MERCANTIL COBREPAMPA SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'SERVICIOS INTEGRALES VALPARAISO S.R.L.': 'Pilar',
    'DUNA CORP S.A.': 'Pilar',
    'DRT DISTRIBUTION S.A.C.': 'Pilar',
    'PEVISO INGENIEROS S.A.C.': 'Pilar',
    'CONDOMINIO COCOA': 'Pilar',
    'EMPRESA DE TRANSPORTES GRUPO HORNA SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'GERCES PROYING SOLUTIONS S.A.C.': 'Pilar',
    'CONSORCIO CAMINO DEL HUASCARAN': 'Pilar',
    'GRUPO PESQUERO S.A.C.': 'Pilar',
    'AGRO INDUSTRIA EL VADO EIRL': 'Pilar',
    'COLIBRI MINING NORTH S.A.C.': 'Pilar',
    'RODELS SERVICE S.A.C.': 'Pilar',
    'MP TRANSERV S.A.C.': 'Pilar',
    'SALUD AMBIENTAL VINOS S.A.C. - SAVS SAC.': 'Pilar',
    'DMARAN MANOMEDICA S.A.C.': 'Pilar',
    'KJC CONSTRUCCIONES S.A.C.': 'Pilar',
    'INVERSIONES KORCULA E.I.R.L.': 'Pilar',
    'UNIGAS CONVERSIONES S.A.C.': 'Pilar',
    'PRIME TRAVEL S.A.C.': 'Pilar',
    'KHALEESI SPA SAC': 'Pilar',
    'IMPACTUM CONSULTORES S.A.C.': 'Pilar',
    'MINERA COLIBRI S.A.C.': 'Pilar',
    'INVERSIONES EDUCATIVAS IESCOOP S.A.C.': 'Pilar',
    'PLANTA YURACMAYO SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'ESTUDIO OLAECHEA SOCIEDAD CIVIL DE RESPONSABILIDAD LIMITADA': 'Pilar',
    'TECNOLOGIA Y PROYECTOS S.A.C. (TECPROSA)': 'Pilar',
    'FUTURA TECHNOLOGIES S.A.C': 'Pilar',
    'ABUGATTAS & PERATA INTERNACIONAL SAC': 'Pilar',
    'TRANSPERUANA CORREDORES DE SEGUROS S.A.': 'Pilar',
    'CORPORACION MATERIALES PLASTICOS SRL': 'Pilar',
    'JUNTA DE PROPIETARIOS AVENIDA SAN FELIPE NUMERO 347-349-351 URBANIZACION BOSQUE BOLIVARIANO JESUS MA': 'Pilar',
    'JUNTA DE PROPIETARIOS DEL CONDOMINIO PASO CHICO': 'Pilar',
    'GJW GROUP S.A.C.': 'Pilar',
    'MAGNUS QUALITY S.R.L.': 'Pilar',
    'AUTOGAS JIREH S.A.C.': 'Pilar',
    'DP & B S.A.C': 'Pilar',
    'SILVIA MARGARITA TORRES MARCHAND': 'Gladys',
    'VANESSA CECILIA BECKER SALAZAR': 'Gladys',
    'IP INFOCOM E.I.R.L.': 'Pilar',
    'GRUPO CARLEY': 'Pilar',
    'DOOR TO DOOR TRANSPORTS S.A.C.': 'Pilar',
    'JANETT MAVI MUÑOZ DIAZ': 'Gladys',
    'LISSETT DEL CARMEN MATUTE SANTANA': 'Gladys',
    'TOMATIS VELASQUEZ BRUNO': 'Gladys',
    'PRECOTEX S.A.C.': 'Pilar',
    'JAIME MANUEL CALVO PEREZ BADIOLA': 'Gladys',
    'GOMEZ DE LA TORRE MIRANDA JOSE ALEJANDRO DOMINGO': 'Gladys',
    'DIEGO ALBERTO VILLALVA SANCHEZ': 'Pilar',
    'PIERRE CHAUVEL PAREDES': 'Gladys',
    'ZAMARIT PAOLA SALAS MOLINA': 'Gladys',
    'MAGALY JESUS MEDINA VELA': 'Gladys',
    'GRUPO ASEO, VIGILANCIA Y SALUD': 'Pilar',
    'INVERSIONES JALI S.A.C.': 'Pilar',
    'SERVICIOS GRALES SMP-FONBIEPOL SCRL': 'Pilar',
    'GRUPO SP': 'Pilar',
    'MINERA PARAISO SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'PETRUS MANAGEMENT S.A.C.': 'Pilar',
    'OCORIS 1 S.A.C.': 'Pilar',
    'CTP CONTRATISTAS S.A.C.': 'Pilar',
    'AV PROYECTOS Y CONSTRUCCIONES SAC': 'Pilar',
    'GFKNITS S.A.C.': 'Pilar',
    'VIGILANTES PERUANOS SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'ON ENERGY STORAGE S.R.L.': 'Pilar',
    'LUCARBAL RENT A CAR E.I.R.L.': 'Pilar',
    'YURIKO GENESIS BANSAIS PALOMINO ARAUJO': 'Gladys',
    'HUAMAN OBREGON PATRICIA': 'Gladys',
    'KYAM SAC': 'Pilar',
    'TECNIGAS HOGAR S.A.C.': 'Pilar',
    'QUATRO BETA S.A.C.': 'Pilar',
    'TREAM PERU S.A.C.': 'Pilar',
    'AJ GROUP INVERGAS S.A.C.': 'Pilar',
    'LA BONCHONA S.A.C.': 'Pilar',
    'ASOCIACION CLUB PLAYA BONITA': 'Pilar',
    'CONSTRUCTORA JHEMSA INGENIEROS S.A.C.': 'Pilar',
    'EL REBOTE S.R.L.': 'Pilar',
    'ALEJANDRO GAMBOA MARTINEZ': 'Gladys',
    'ARMANDO LUIS CHAVEZ VERA': 'Gladys',
    'ANA MARIA DE LA CUBA BRAVO DE MOSCOSO': 'Gladys',
    'JORGE LUIS MORALES GALLO': 'Gladys',
    'GOMEZ SANCHEZ TALAVERA AUGUSTO GUILLERMO': 'Gladys',
    'NATALIA BALAREZO ESPINOZA': 'Gladys',
    'JAVIER FERNANDO CALVO PEREZ BADIOLA': 'Gladys',
    'ZIPPAK PERU S.A.C.': 'Pilar',
    'ESTHER MEDINA SUSANIBAR': 'Gladys',
    'CRISTINA ROSA SILVA LICERA': 'Gladys',
    'MARIA CLAUDIA PICASSO BOURONCLE': 'Gladys',
    'JOSE GEORGE RITUAY AGUILAR': 'Gladys',
    'ALICIA TERESA GARCIA OLCESE DE GRUSLIN': 'Gladys',
    'CONSORCIO JULIACA': 'Pilar',
    'JMS INFRAESTRUCTURA GLOBAL E.I.R.L.': 'Pilar',
    'UNION DE GREMIOS DE TRANSPORTE MULTIMODAL DEL PERU - UGTRANM-PERU': 'Pilar',
    'FEDISA TRANSPORTE E.I.R.L.': 'Pilar',
    'H L H CONTRATISTAS GENERALES SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'PUCK S.A.C.': 'Pilar',
    'MANFREDI GAETANO': 'Gladys',
    'NATALI ARROYO CARBAJAL': 'Gladys',
    'SUAREZ ORBEZO ALBERTO LEONCIO': 'Gladys',
    'MARIA ESTHER BARREDA ALEGRIA': 'Gladys',
    'MESIA GONZALEZ DE AGUAYO PATRICIA': 'Gladys',
    'CRISTINA MC LAUCHLAN OREJUELA': 'Gladys',
    'KARLA ANGELICA BRICEÑO HERRERA': 'Gladys',
    'MARIA RAQUEL COLOMA PORCARI DE VELARDE': 'Gladys',
    'PILAR ROXANA CABREDO DE ZUNJIC': 'Gladys',
    'GASTON ALEJANDRO CAJINA BARRERA': 'Gladys',
    'JUAN CARLOS SEVILLA GILDEMEISTER': 'Gladys',
    'CARLOS ENRIQUE SILVA COELLO': 'Gladys',
    'AURORA DE LOS ANGELES CARDENAS SAENZ': 'Gladys',
    'JORGE ERNESTO VILLA MARTIN': 'Gladys',
    'JUAN ALFREDO CESAR BERNARDO PICASSO SALINAS': 'Gladys',
    'HERNAN DANIEL TOMAS VELARDE SANTA MARIA': 'Gladys',
    'IVAN GUILLERMO RAMOS DEL AGUILA': 'Gladys',
    'CECILIA PRADO GARCIA MIRO': 'Gladys',
    'MARCO ANTONIO VASQUEZ MORALES': 'Gladys',
    'DORIS ZAMBRANO CCATAMAYO': 'Gladys',
    'MADUEÑO SILVA FERNANDO': 'Gladys',
    'SONIA ALVAREZ GARCIA': 'Gladys',
    'ROBERTO FRANCISCO JOSE OLAECHEA MADONNA': 'Gladys',
    'GÓMEZ DE LA TORRE MARQUINA JUAN CARLOS': 'Gladys',
    'ALONSO DIAZ DE RAVAGO AMAT Y LEON': 'Gladys',
    'OLGA MARLENI GARCIA BASILIO': 'Gladys',
    'IVAN MAURICIO HIDALGO MARTINEZ': 'Gladys',
    'CLAUDIA MARIA PAREDES VIZQUERRA': 'Gladys',
    'JORGE LUIS VARGAS PAREJA': 'Gladys',
    'SARMIENTO AMODEO DIEGO PACIFICO': 'Gladys',
    'ELIO UBALDO CASARETO POSTIGO': 'Gladys',
    'ENRIQUE GERMAN ANGULO BORJA': 'Gladys',
    'SHEDAN MANGA AIDA VIRGINIA': 'Gladys',
    'OSCAR ERNESTO FLOREZ COSTA': 'Gladys',
    'MARIA DEL ROSARIO FLOREZ MIRANDA': 'Gladys',
    'DELFINO VILLA GARCIA LUIS JOSE': 'Gladys',
    'MARIA ISABEL GEORGINA LANATTA REATEGUI DE ATTANASIO': 'Gladys',
    'JAIME RONALD PORTUGAL LEON': 'Gladys',
    'IGNACIO BERCKEMEYER OLAECHEA': 'Gladys',
    'JULIO EDUARDO RAMIREZ RUEDA': 'Gladys',
    'ARIANA BIAGGI LLAMOSAS': 'Gladys',
    'ENRIQUE R. FOX SANTIBAÑEZ': 'Gladys',
    'PAMELA BATTIFORA DEL POZO': 'Gladys',
    'VITALIANO BISEÑO SANCHEZ ESPINOZA': 'Gladys',
    'MEDINA MALDONADO ANGELICA MARIA': 'Gladys',
    'ZEGARRA GARCES ANDRES': 'Gladys',
    'JULIO SEBASTIAN ALARCON ZEVALLOS': 'Gladys',
    'MARGARET KAREN WENZEL DEL AGUILA': 'Gladys',
    'MARIA FERNANDA CALVO PEREZ SALAZAR': 'Gladys',
    'BERNARDO BRAVO RAGGIO': 'Gladys',
    'GIANCARLO SANCHEZ JIMENEZ': 'Gladys',
    'CHAVEZ JERI LUIS FERNANDO': 'Gladys',
    'JHOAN MANUEL ALVA ACUÑA': 'Gladys',
    'DEL CARPIO GONZALES VICTOR NAPOLEON': 'Gladys',
    'MARIA CRISTINA PIEDRA ALVAREZ': 'Gladys',
    'DIANA CARMEN NOYA RIVERO': 'Gladys',
    'NELLY TERESA ZEVALLOS REGAL': 'Gladys',
    'CHRISTIAN EMMANUEL ACOSTA VILLEGAS': 'Gladys',
    'JOSE ANTONIO VISCONTI OLAVIDE': 'Gladys',
    'JUAN PABLO GONZALEZ LOPEZ-TORRES': 'Gladys',
    'CARLOS AUGUSTO MONTALVA TALLEDO': 'Gladys',
    'LUIS PEDRO DIAZ DE RAVAGO DONOFRIO': 'Gladys',
    'ALBERTO ENRIQUE CARRION CASTRO': 'Gladys',
    'MARIA GABRIELA VISCONTI OLAVIDE DE BUSE': 'Gladys',
    'JOSE ANTONIO RUBIO RONALD': 'Gladys',
    'DANIEL OSCAR ESCURRA BALBI': 'Gladys',
    'JOSE MIGUEL SILVA LICERA': 'Gladys',
    'MARCO ANTONIO CASTAÑEDA MORENO': 'Gladys',
    'GABRIELA LUCIA DIAZ TORRES': 'Gladys',
    'MONTOYA FLORES FREDDY': 'Gladys',
    'BRENDA ESLAVA CARDENAS': 'Gladys',
    'JOSE MIGUEL BREÑA TRAVERSO': 'Gladys',
    'VALERIA BREÑA TRAVERSO': 'Gladys',
    'GÜERE DAGA URIEL': 'Gladys',
    'KENNETH MICHAEL STEVEN OJEDA OTAROLA': 'Gladys',
    'ROXANA HEIDI VERGARA MARTEL': 'Gladys',
    'DIEGO GUILLERMO PEREA ZABALBEASCOA': 'Gladys',
    'GIANCARLO CARBONE DE MORA AMPRIMO': 'Gladys',
    'MARIO OCTAVIO SALOMON MANZUR MERINO': 'Gladys',
    'CONSTRUCTORA MENESES S.R.L.': 'Pilar',
    'KEVIN ALBERT MOCHCCO SAMANAMU': 'Gladys',
    'ANA MARIA OLAECHEA ALVAREZ CALDERON': 'Gladys',
    'URPEQUE JARANDILLA ANGEL ALBERTO': 'Gladys',
    'AMADOR GUILLERMO DEL AGUILA RODRIGUEZ': 'Gladys',
    'MEGAVAL INDUSTRIAL S.A.C.': 'Pilar',
    'DANIELA BUSE VISCONTI': 'Gladys',
    'Q R L INVERSIONES SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'ATEMPO PRODUCCIONES S.A.C.': 'Pilar',
    'LABORATORIO GASTRONOMICO SAC - LG SAC': 'Pilar',
    'INMOBILIARIA ALBRUSA SOCIEDAD ANONIMA CERRADA': 'Pilar',
    'LORENA BEATRIZ ROJAS GARGUREVICH': 'Gladys',
    'BODEGAS VISTA ALEGRE S.A.C.': 'Pilar',
    'BF DIGITAL DEL PERU S.A.C.': 'Pilar',
    'BAUMANN SAMANEZ HUGO': 'Gladys',
    'PRIME FLIGHT SCHOOL S.A.C.': 'Pilar',
    'RAFAEL ENRIQUE PIEDRA DULANTO': 'Gladys',
    'SERVICIOS CORPORATIVOS GRUPO LOMAS S.A.C.': 'Pilar',
    'LAMPARAS ILUMINACIÓN SERVICIOS SAN BORJA S.R.L.': 'Pilar',
    'QUATRO LAMBDA S.A.C.': 'Pilar',
    'MOBE PROYECTOS S.A.C.': 'Pilar',
    'ROBIN DANIEL VARGAS ANDRE': 'Gladys',
    'GRUPO UEZU': 'Pilar',
    'GRUPO CARDIOVASCULAR': 'Pilar',
    'BIO LINKS S.A.': 'Pilar',
    'INMEDIATO S.A.C.': 'Pilar'
  };

  var sheetName = getConfig('SHEETS.BITACORA_GESTIONES', 'Bitacora_Gestiones_EECC');
  var sheet = SheetsIO._getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error('Hoja ' + sheetName + ' no encontrada');

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  // Find column indices
  var colAseg = -1, colResp = -1;
  for (var h = 0; h < headers.length; h++) {
    var hdr = String(headers[h]).trim().toUpperCase();
    if (hdr === 'ASEGURADO') colAseg = h;
    if (hdr === 'RESPONSABLE') colResp = h;
  }
  if (colAseg === -1 || colResp === -1) throw new Error('Columnas ASEGURADO/RESPONSABLE no encontradas');

  var updated = 0;
  var skipped = 0;
  var notFound = 0;

  for (var i = 1; i < data.length; i++) {
    var asegurado = String(data[i][colAseg] || '').trim();
    if (!asegurado) continue;

    var nuevoResp = MAPA_RESPONSABLES[asegurado];
    if (!nuevoResp) {
      notFound++;
      continue;
    }

    var currentResp = String(data[i][colResp] || '').trim();
    // Solo actualizar si el responsable actual NO es ya Pilar o Gladys
    if (currentResp === 'Pilar' || currentResp === 'Gladys') {
      skipped++;
      continue;
    }

    if (!dryRun) {
      sheet.getRange(i + 1, colResp + 1).setValue(nuevoResp);
    }
    updated++;
  }

  if (!dryRun) SpreadsheetApp.flush();

  var resultado = {
    ok: true,
    dryRun: dryRun,
    totalFilas: data.length - 1,
    actualizadas: updated,
    yaCorrectas: skipped,
    sinMapeo: notFound
  };

  console.log('=== RESULTADO actualizarResponsablesBitacora ===');
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

/** Ejecutar en modo prueba (sin modificar) */
function TEST_actualizarResponsables_DRYRUN() {
  return actualizarResponsablesBitacora(true);
}

/** Ejecutar en modo real (modifica la hoja) */
function EJECUTAR_actualizarResponsables() {
  return actualizarResponsablesBitacora(false);
}
