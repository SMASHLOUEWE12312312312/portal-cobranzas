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
 * @param {string} username - Nombre de usuario
 * @return {string} Rol del usuario (ADMIN, COBRANZAS, LECTURA)
 */
function _inferUserRole(username) {
  const lowerUser = String(username).toLowerCase();
  if (lowerUser.startsWith('admin')) return 'ADMIN';
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

    return {
      ok: true,
      data: {
        token: result.token,
        user: {
          username: result.user,
          role: userRole,
          displayName: result.user
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

// ========== HEALTH CHECK ==========
function healthCheck(token) {
  try {
    if (token) {
      AuthService.validateSession(token);
    }

    const info = {
      baseName: getConfig('SHEETS.BASE'),
      timestamp: new Date(),
      status: 'healthy'
    };

    const ss = SpreadsheetApp.getActive();
    const base = ss.getSheetByName(info.baseName);

    info.baseFound = !!base;

    if (base) {
      const baseData = SheetsIO.readSheet(info.baseName);
      info.rows = baseData.rows.length;
    }

    return info;
  } catch (error) {
    Logger.error('healthCheck', 'Failed', error);
    return { error: error.message };
  }
}

// ========== PHASE 3: MONITORING ENDPOINTS ==========

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
 * @param {string} token - Session token
 * @return {boolean} True if admin
 */
function isAdminSession_(token) {
  try {
    const session = AuthService.validateSession(token);
    const username = session?.user || '';
    // Simple admin check: username starts with "admin" or contains "@admin"
    return username.toLowerCase().startsWith('admin') || username.includes('admin');
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
    const sheetName = getConfig('SHEETS.MAIL_TEMPLATES', 'Mail_Templates');
    const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
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
    try {
      const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
      ss.getSheetByName('BD'); // Just access, don't read data
      checks.spreadsheet = { status: 'OK', message: 'Acceso confirmado' };
    } catch (e) {
      checks.spreadsheet = { status: 'ERROR', message: e.message };
      overallStatus = 'ERROR';
    }

    // Check 2: Required sheets exist
    try {
      const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
      const requiredSheets = ['BD', 'EECC', 'Bitacora'];
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

    const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
    const aseguradoCol = Utils.findColumnIndex(baseData.headers, getConfig('BD.COLUMNS.ASEGURADO'));

    if (aseguradoCol === -1) {
      throw new Error('Columna ASEGURADO no encontrada');
    }

    const set = new Set();
    baseData.rows.forEach(row => {
      const aseg = Utils.cleanText(row[aseguradoCol]);
      if (aseg) set.add(aseg);
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
      const ss = SpreadsheetApp.getActive();
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
    AuthService.validateSession(token);
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

    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.dataBase64),
      payload.mimeType || 'application/octet-stream',
      payload.name || 'archivo'
    );

    const nameLower = String(payload.name || '').toLowerCase();
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

    return {
      ok: true,
      filas: result.rowsWritten,
      mensaje: `Importación completa ✅ (${result.duplicatesRemoved} duplicados eliminados)`,
      duplicatesRemoved: result.duplicatesRemoved,
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

// ========== MAIL: CARGAR CONTACTOS ==========
function loadContactsFromSheet() {
  const context = 'loadContactsFromSheet';

  try {
    const sheetName = 'Mail_Contacts';
    const ss = SpreadsheetApp.getActive();
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

  return String(emailString)
    .split(/[,;]/)
    .map(email => email.trim())
    .filter(email => email && email.includes('@') && email.length > 3);
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

  bodyHtml = bodyHtml.replace(/{{ASEGURADO}}/g, data.asegurado || '');
  bodyHtml = bodyHtml.replace(/{{FECHA_CORTE}}/g, data.fechaCorte || '');
  bodyHtml = bodyHtml.replace(/{{SALUDO}}/g, data.saludo || 'Estimados');

  if (data.observaciones) {
    bodyHtml = bodyHtml.replace(/{{OBS_OPCIONAL}}/g, `<p style="margin-top: 1rem; padding: 1rem; background: #FFF3E0; border-left: 4px solid #F57C00; border-radius: 4px;"><strong>Nota:</strong> ${data.observaciones}</p>`);
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

    // Trigger background processing immediately
    if (result.ok) {
      try {
        MailQueueService.jobProcesarCorreos_(); // Try to start processing immediately
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
        const messageId = MailerService.sendEmail({
          to: contact.emailTo,
          cc: contact.emailCc,
          bcc: contact.emailBcc,
          subject: subject,
          htmlBody: bodyHtml,
          attachments: attachments,
          name: 'Portal de Cobranzas'
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

    // Resolver ID_CICLO
    let idCiclo = payload.idCiclo;

    if (!idCiclo) {
      // Buscar último ciclo del asegurado
      const ciclos = BitacoraService.obtenerResumenCiclos({
        asegurado: payload.asegurado
      });

      if (ciclos.length > 0) {
        // Usar el ciclo más reciente
        idCiclo = ciclos[0].idCiclo;
        Logger.info(context, 'ID_CICLO resuelto automáticamente (ciclo existente)', { idCiclo });
      } else {
        // NO crear ciclo - registrarGestionManual lo creará implícitamente
        Logger.info(context, 'No hay ciclo previo - registrarGestionManual creará uno nuevo');
      }
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
      observaciones: payload.observaciones || ''
    });

    if (!resultado.ok) {
      throw new Error('Error al registrar gestión: ' + resultado.error);
    }

    // Flush bitácora
    BitacoraService.flush();

    // Calcular dias_desde_registro para la respuesta
    const hoy = new Date();
    const diasDesdeRegistro = 0;  // Recién registrada

    const duration = Date.now() - startTime;

    Logger.info(context, 'Gestión manual registrada', {
      idGestion: resultado.idGestion,
      idCiclo: resultado.idCiclo,
      durationMs: duration
    });

    // Flush logs
    Logger.flush();

    return {
      ok: true,
      data: {
        idGestion: resultado.idGestion,
        idCiclo: resultado.idCiclo,
        diasDesdeRegistro: diasDesdeRegistro,
        asegurado: payload.asegurado,
        estadoGestion: payload.estadoGestion
      },
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
    const ciclos = BitacoraService.obtenerResumenCiclos({ asegurado });

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

    const ciclos = BitacoraService.obtenerResumenCiclos();

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
    var ss = SpreadsheetApp.getActive();
    if (!ss) {
      // Fallback: usar ID de config
      var ssId = getConfig('SPREADSHEET_ID', '');
      if (!ssId) {
        return { ok: false, error: 'No se pudo acceder al spreadsheet' };
      }
      ss = SpreadsheetApp.openById(ssId);
    }

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
 * Obtiene el RESUMEN de ciclos (solo la última gestión de cada ciclo)
 * Para mostrar en la vista "Estado Actual"
 * @param {string} token - Token de autenticación
 * @return {Object} { ok, data: [resumen de ciclos] }
 */
function bitacoraGetResumenCiclos(token, opciones) {
  const context = 'bitacoraGetResumenCiclos';

  const paginationOpts = {
    page: (opciones && opciones.page) || 1,
    pageSize: Math.min((opciones && opciones.pageSize) || 50, 100)
  };

  try {
    // Validar sesión
    AuthService.validateSession(token);

    // Obtener resumen de ciclos (con paginación v4.1+)
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

    return {
      ok: true,
      data: dataParsed,
      pagination: resumen.pagination
    };

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
    Logger.info(context, '1. Usando getActive() desde modal');

    // Paso 1: getActive() - DEBE funcionar en modales
    var ss;
    try {
      ss = SpreadsheetApp.getActive();
      if (!ss) {
        Logger.error(context, 'getActive() devolvió null');
        return { ok: false, error: 'No se pudo acceder al spreadsheet' };
      }
      Logger.info(context, '✅ Spreadsheet: ' + ss.getName());
    } catch (e) {
      Logger.error(context, 'Error en getActive()', e);
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

    // Serializar fechas a ISO string
    const compromisosParsed = compromisos.map(c => ({
      ...c,
      fechaEnvioEECC: c.fechaEnvioEECC instanceof Date ? c.fechaEnvioEECC.toISOString() : c.fechaEnvioEECC,
      fechaRegistro: c.fechaRegistro instanceof Date ? c.fechaRegistro.toISOString() : c.fechaRegistro,
      fechaCompromiso: c.fechaCompromiso instanceof Date ? c.fechaCompromiso.toISOString() : c.fechaCompromiso
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
 * Programa un envío de correo
 */
function scheduleJob_API(jobData, token) {
  try {
    AuthService.validateSession(token);
    const result = SchedulerService.scheduleJob(jobData);
    return result;
  } catch (error) {
    Logger.error('scheduleJob_API', error);
    return { ok: false, error: error.message };
  }
}
