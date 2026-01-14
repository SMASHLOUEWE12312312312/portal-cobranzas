/**
 * @fileoverview Configuración centralizada del sistema EECC
 * @version 2.1.0
 * @author Transperuana Dev Team
 * @lastModified 2025-10-18
 */

const CONFIG = {
  // ========== SPREADSHEET ==========
  // ⚠️ IMPORTANTE: Obtén el ID desde la URL del spreadsheet
  // URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
  SPREADSHEET_ID: '1dmkODoA9BD_5FLBruXnxu2vOXnXrEYCSHl6eyqS22Ok', // ✅ ID VERIFICADO por test - Correcto

  // ========== HOJAS ==========
  SHEETS: {
    BASE: 'BD',
    TEMPLATE: 'EECC_Template',
    DEBUG_LOG: 'Debug_Log',
    PORTAL_ACCESOS: 'Portal_Accesos',
    BITACORA: 'Bitacora',
    BITACORA_GESTIONES: 'Bitacora_Gestiones_EECC',
    MAIL_CONTACTS: 'Mail_Contacts',
    MAIL_QUEUE: 'Mail_Queue',
    MAIL_LOG: 'Mail_Log',
    MAIL_TEMPLATES: 'Mail_Templates', // [MEJORA ENVIAR_EECC_CORREO]
    MAIL_SCHEDULE: 'Mail_Schedule',   // [MEJORA ENVIAR_EECC_CORREO]
    GRUPOS_ECONOMICOS: 'Grupos_Economicos' // GRUPO_ECONOMICO - NUEVA LÓGICA
  },

  // ========== ESTRUCTURA DE BD ==========
  BD: {
    HEADER_ROW: 1,
    START_ROW: 2,
    COLUMNS: {
      ASEGURADO: 'ASEGURADO',
      CIA: 'CIA',
      POLIZA: 'POLIZA',
      RAM: 'RAM',
      NUM_CUOTA: 'NUM_CUOTA',
      CUPON: 'CUPON',
      MON: 'MON',
      IMPORTE: 'IMPORTE',
      VIG_DEL: 'VIG_DEL',
      VIG_AL: 'VIG_AL',
      FEC_VENCIMIENTO_COB: 'FEC_VENCIMIENTO COB',
      BREVE_DESCRIPCION: 'BREVE_DESCRIPCION',
      MOTIVO: 'MOTIVO'
    },
    CLEAN_TEXT_COLS: ['RAM', 'CIA', 'POLIZA', 'ASEGURADO', 'CUPON']
  },

  // ========== DRIVE ========== 
  DRIVE: {
    OUTPUT_FOLDER_ID: '1bMRp8-0hxRXSi2B9TYdGe7XwsPeysfEe',  // ← MODIFICADO: Cobranzas_Transperuana
    LOGO_FILE_ID: '1i0eW14i890ka597hcGbtTnediUPBJy7Q',
    USE_DATE_SUBFOLDERS: true,
    SUBFOLDER_BY_ASEGURADO: false,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000
  },

  // ========== EXPORT ==========
  EXPORT: {
    FILE_PREFIX: 'EECC_',
    INCLUDE_DATE_IN_NAME: true,
    DOC_PREFIX: 'TP',
    PDF: {
      SIZE: 'A4',
      PORTRAIT: false,
      FIT_WIDTH: true,
      SHOW_PAGE_NUMBERS: true,
      MARGINS: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 }
    },
    LOGO: {
      MAX_WIDTH: 600,
      MAX_HEIGHT: 140,
      TARGET_COL: 10,
      TARGET_ROW: 2
    },
    FOOTER_TEXT: 'Documento generado automáticamente -- Transperuana Corredores de Seguros S.A.'
  },

  // ========== TEMPLATE ==========
  TEMPLATE: {
    START_ROW: 9,
    COL_WIDTHS: [160, 130, 90, 60, 120, 60, 110, 95, 95, 95, 55],
    HEADER_ROW: 8,
    FREEZE_ROWS: 8
  },

  // ========== FORMATO ==========
  FORMAT: {
    TIMEZONE: 'America/Lima',
    DATE_FORMAT: 'dd/MM/yyyy',
    DATETIME_FORMAT: 'dd/MM/yyyy HH:mm',
    NUMBER_FORMAT: '#,##0.00',
    CURRENCY: {
      PEN: 'S/.',
      USD: 'US$'
    }
  },

  // ========== BRAND ==========
  BRAND: {
    COLORS: {
      RED_OVERDUE: '#E53935',
      PRIMARY: '#D32F2F',
      PRIMARY_DARK: '#B71C1C'
    },
    COMPANY_NAME: 'Transperuana Corredores de Seguros S.A.',
    SIGNATURE_HTML: `
      <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #D32F2F; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: 600; color: #212121;">Transperuana Corredores de Seguros S.A.</p>
        <p style="margin: 5px 0 0; font-size: 13px; color: #666;">Área de Cobranzas</p>
        <p style="margin: 5px 0 0; font-size: 12px; color: #999;">Este correo fue generado automáticamente. Por favor, no responder.</p>
      </div>
    `
  },

  // ========== MAIL ==========
  MAIL: {
    BATCH_SIZE: 80,
    RETRY_LIMIT: 3,
    MAX_MB_PER_MSG: 22,
    DELAY_BETWEEN_EMAILS_MS: 300,
    TEMPLATE_DOC_ID_DEFAULT: '',
    TEMPLATES: {
      REGULAR: {
        subject: 'EECC {{ASEGURADO}} – Corte {{FECHA_CORTE}} (Ref: {{FOLIO}})',
        body: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <p>{{SALUDO}}</p>
            <p>Adjuntamos el Estado de Cuenta correspondiente al corte de <strong>{{FECHA_CORTE}}</strong>.</p>
            <p>Para cualquier consulta, por favor contactar con nuestro equipo.</p>
            {{OBS_OPCIONAL}}
            <p>Saludos cordiales,</p>
          </div>
        `
      },
      RECORDATORIO: {
        subject: '⏰ Recordatorio EECC {{ASEGURADO}} – Corte {{FECHA_CORTE}}',
        body: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <p>{{SALUDO}}</p>
            <p><strong>Le recordamos</strong> que adjuntamos el Estado de Cuenta del corte <strong>{{FECHA_CORTE}}</strong>.</p>
            <p>Agradeceremos su pronta atención.</p>
            {{OBS_OPCIONAL}}
            <p>Saludos cordiales,</p>
          </div>
        `
      },
      VENCIDO: {
        subject: '🚨 URGENTE: EECC Vencido {{ASEGURADO}} – {{FECHA_CORTE}}',
        body: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <p>{{SALUDO}}</p>
            <p style="color: #C62828;"><strong>ATENCIÓN URGENTE:</strong> Detectamos cuotas vencidas en su Estado de Cuenta del corte <strong>{{FECHA_CORTE}}</strong>.</p>
            <p>Por favor, contactar a la brevedad para regularizar la situación.</p>
            {{OBS_OPCIONAL}}
            <p>Saludos cordiales,</p>
          </div>
        `
      }
    }
  },

  // ========== PREVIEW & LIMITS ==========
  LIMITS: {
    PREVIEW_MAX_ROWS: 200,
    BATCH_SIZE: 1000,
    CACHE_TTL_SECONDS: 300
  },

  // ========== AUTH ==========
  AUTH: {
    SESSION_TTL_SEC: 28800,                 // 8 hours total session lifetime
    SESSION_SLIDING_EXPIRATION: true,       // Phase 1: renew on activity
    SESSION_TTL_SEC_CLAMP: 21600,           // Phase 1: defensive clamp for cache.put (6h)
    PASSWORD_ITERATIONS: 100,
    BOOTSTRAP_USERS: [],  // Loaded from PropertiesService via getBootstrapUsers()
    WHITELIST_EMAILS: [
      'cobranzas1@transperuana.com',
      'cobranzas2@transperuana.com',
      'admin@transperuana.com'
    ]
  },

  // ========== FEATURE FLAGS ==========
  FEATURES: {
    ENABLE_OBS_COLUMN: true,
    ENABLE_SUBTOTALS_BY_CIA: true,
    ENABLE_DEBUG_LOGGING: true,
    FAST_MODE: true,
    ENABLE_GROUP_CONSOLIDATED: true,
    REQUIRE_PREVIEW_APPROVAL: true,
    ENABLE_TEST_SEND: true,
    // Phase 0 Quick Wins (2026-01-12)
    ENABLE_LOCK_SERVICE: true,           // LockService in sendEmailsNow
    ENABLE_CORRELATION_ID: true,         // CorrelationId in Logger
    BITACORA_CACHE_DURATION_MS: 30000,   // 30 seconds (was 3000)
    ENABLE_LOGO_CACHE: true,             // Phase 4: Cache logo blob in CacheService
    LOGO_CACHE_TTL_SECONDS: 3600,        // 1 hour cache for logo
    // Phase 1 Enterprise Foundations (2026-01-12)
    PIPELINE_ENABLED: true,              // EECC Pipeline with persisted states
    MAIL_QUEUE_MODE: true,               // Persistent mail queue (vs direct send)
    // Phase 3 Monitoring & Alerts (2026-01-12)
    DASHBOARD_STATS: true,               // Dashboard analytics widget
    QUEUE_HEALTH_PANEL: true,            // Queue health status panel
    // Phase 4 Quick Wins (2026-01-12)
    ENABLE_UPLOAD_BACKUP: true,          // Backup BD sheet before overwrite
    // Phase 5 UX Top Mundial (2026-01-12)
    NOTIFICATIONS_CENTER_V2: true,       // Dual-tab notification center
    QUICK_ACTIONS_ENABLED: true,         // Quick actions for bitácora
    TIMELINE_VIEW_ENABLED: true,         // Timeline visual for gestiones
    GLOBAL_SEARCH_ENABLED: true,         // Ctrl+K global search
    LUCIDE_ICONS_ENABLED: false,         // Professional Lucide icons (deferred)
    // Phase 6 Excelencia Operacional (2026-01-12)
    DARK_MODE_ENABLED: false,            // Dark theme toggle
    KEYBOARD_SHORTCUTS_ENABLED: false,   // Additional keyboard shortcuts
    TEMPLATE_VIEWER_ENABLED: false,      // View mail templates (admin only)
    HEALTH_CHECK_ENABLED: false          // System health check endpoint
  },

  // ========== LOCK ==========
  LOCK: {
    SEND_EMAIL_TIMEOUT_MS: 30000         // 30 second lock timeout for sendEmailsNow
  },

  // ========== MONITORING (Phase 3) ==========
  MONITORING: {
    QUEUE_STALE_MINUTES: 15,             // WARN if oldest pending > this
    QUEUE_STUCK_MINUTES: 30,             // ERROR if processing > this
    PROCESSING_STUCK_THRESHOLD: 3        // ERROR if this many items stuck in processing
  },

  // ========== ALERTS (Phase 3, Optional) ==========
  ALERTS: {
    ENABLED: true,                       // Habilitado tras auditoría v4.1
    ADMIN_EMAILS: [],                    // List of admin emails for alerts
    DEBOUNCE_MINUTES: 60,                // Max 1 alert per hour per type
    QUEUE_STUCK_ALERT_MINUTES: 30        // Trigger alert if stuck > this
  },

  // ========== MAIL QUEUE (Phase 1) ==========
  MAIL_QUEUE: {
    BATCH_SIZE: 10,                      // Items processed per trigger run
    MAX_RETRIES: 3                       // Max retry attempts before FAILED
  },

  // ========== API ==========
  API: {
    SECRET: ''  // Loaded from PropertiesService via getApiSecret()
  },

  // ========== BITÁCORA DE GESTIÓN v3.0 - CICLO DE COBRANZA ==========
  BITACORA: {
    /**
     * Estados de gestión de cobranza (actualizado v3.0)
     */
    ESTADOS: {
      SIN_RESPUESTA: {
        codigo: 'SIN_RESPUESTA',
        descripcion: 'Cliente no ha respondido',
        color: '#E65100',
        bgColor: '#FFF3E0',
        requiereObservacion: false,
        requiereFechaCompromiso: false
      },
      EN_SEGUIMIENTO: {
        codigo: 'EN_SEGUIMIENTO',
        descripcion: 'En seguimiento activo',
        color: '#1976D2',
        bgColor: '#E3F2FD',
        requiereObservacion: false,
        requiereFechaCompromiso: false
      },
      COMPROMISO_PAGO: {
        codigo: 'COMPROMISO_PAGO',
        descripcion: 'Cliente comprometió fecha de pago',
        color: '#1565C0',
        bgColor: '#E3F2FD',
        requiereObservacion: true,
        requiereFechaCompromiso: true
      },
      REPROGRAMADO: {
        codigo: 'REPROGRAMADO',
        descripcion: 'Gestión reprogramada',
        color: '#F57C00',
        bgColor: '#FFF3E0',
        requiereObservacion: true,
        requiereFechaCompromiso: true
      },
      DERIVADO_COMERCIAL: {
        codigo: 'DERIVADO_COMERCIAL',
        descripcion: 'Escalado al área Comercial',
        color: '#6A1B9A',
        bgColor: '#F3E5F5',
        requiereObservacion: true,
        requiereFechaCompromiso: false
      },
      DERIVADO_RRHH: {
        codigo: 'DERIVADO_RRHH',
        descripcion: 'Escalado a Gerencia de Riesgos Humanos',
        color: '#6A1B9A',
        bgColor: '#F3E5F5',
        requiereObservacion: true,
        requiereFechaCompromiso: false
      },
      DERIVADO_RIESGOS_GENERALES: {
        codigo: 'DERIVADO_RIESGOS_GENERALES',
        descripcion: 'Escalado a Gerencia de Riesgos Generales',
        color: '#6A1B9A',
        bgColor: '#F3E5F5',
        requiereObservacion: true,
        requiereFechaCompromiso: false
      },
      CERRADO_PAGADO: {
        codigo: 'CERRADO_PAGADO',
        descripcion: 'Gestión cerrada - Pago realizado',
        color: '#1B5E20',
        bgColor: '#C8E6C9',
        requiereObservacion: false,
        requiereFechaCompromiso: false
      },
      NO_COBRABLE: {
        codigo: 'NO_COBRABLE',
        descripcion: 'Marcado como no cobrable',
        color: '#C62828',
        bgColor: '#FFEBEE',
        requiereObservacion: true,
        requiereFechaCompromiso: false
      },
      NO_CONTACTABLE: {
        codigo: 'NO_CONTACTABLE',
        descripcion: 'Cliente no localizable/sin contacto',
        color: '#757575',
        bgColor: '#EEEEEE',
        requiereObservacion: true,
        requiereFechaCompromiso: false
      }
    },

    /**
     * Tipos de gestión (qué acción se realizó)
     */
    TIPOS_GESTION: {
      ENVIO_EECC: { codigo: 'ENVIO_EECC', descripcion: 'Envío de Estado de Cuenta' },
      LLAMADA: { codigo: 'LLAMADA', descripcion: 'Llamada telefónica' },
      WHATSAPP: { codigo: 'WHATSAPP', descripcion: 'Mensaje por WhatsApp' },
      CORREO_INDIVIDUAL: { codigo: 'CORREO_INDIVIDUAL', descripcion: 'Correo electrónico individual' },
      REUNION: { codigo: 'REUNION', descripcion: 'Reunión presencial o virtual' },
      OTRO: { codigo: 'OTRO', descripcion: 'Otro tipo de gestión' }
    },

    /**
     * Canales de contacto
     */
    CANALES: {
      EMAIL: { codigo: 'EMAIL', descripcion: 'Correo electrónico' },
      LLAMADA: { codigo: 'LLAMADA', descripcion: 'Llamada telefónica' },
      WHATSAPP: { codigo: 'WHATSAPP', descripcion: 'WhatsApp' },
      REUNION: { codigo: 'REUNION', descripcion: 'Reunión' },
      OTRO: { codigo: 'OTRO', descripcion: 'Otro canal' }
    },

    /**
     * Orígenes de registro
     */
    ORIGENES: {
      AUTO_ENVIO: 'AUTO_ENVIO',      // Generado automáticamente al enviar EECC
      MANUAL_PORTAL: 'MANUAL_PORTAL'  // Registrado manualmente desde el portal
    },

    /**
     * Configuración de retención de datos
     */
    RETENCION: {
      DIAS_MINIMOS: 365,  // No eliminar registros menores a 1 año
      ARCHIVAR_DESPUES_DIAS: 730  // Archivar después de 2 años
    },

    /**
     * Phase 5: Quick Actions (preset templates)
     * Only active if FEATURES.QUICK_ACTIONS_ENABLED = true
     */
    QUICK_ACTIONS: [
      {
        id: 'llamada_sin_resp',
        label: '📞 Llamada sin respuesta',
        icon: '📞',
        preset: { tipoGestion: 'LLAMADA', estadoGestion: 'SIN_RESPUESTA' }
      },
      {
        id: 'whatsapp_enviado',
        label: '💬 WhatsApp enviado',
        icon: '💬',
        preset: { tipoGestion: 'WHATSAPP', estadoGestion: 'EN_SEGUIMIENTO' }
      },
      {
        id: 'correo_leido',
        label: '📧 Correo leído',
        icon: '📧',
        preset: { tipoGestion: 'CORREO_INDIVIDUAL', estadoGestion: 'EN_SEGUIMIENTO' }
      },
      {
        id: 'compromiso_pago',
        label: '✅ Compromiso de pago',
        icon: '✅',
        preset: { tipoGestion: 'LLAMADA', estadoGestion: 'COMPROMISO_PAGO' }
      },
      {
        id: 'no_contactable',
        label: '❌ No contactable',
        icon: '❌',
        preset: { tipoGestion: 'LLAMADA', estadoGestion: 'NO_CONTACTABLE' }
      }
    ]
  }
};

function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let value = CONFIG;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }
  return value;
}

function validateConfig() {
  const required = [
    'SHEETS.BASE',
    'SHEETS.TEMPLATE',
    'DRIVE.OUTPUT_FOLDER_ID',
    'BD.COLUMNS.ASEGURADO',
    'BD.COLUMNS.CUPON'
  ];
  const missing = required.filter(path => !getConfig(path));
  if (missing.length > 0) {
    throw new Error('Configuración incompleta: ' + missing.join(', '));
  }
}

/**
 * Función include() para cargar archivos HTML en templates
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ========== SECURE CONFIG HELPERS (v4.1+) ==========

/**
 * Obtiene configuración segura desde PropertiesService
 * @param {string} key - Nombre de la propiedad
 * @param {*} defaultValue - Valor por defecto
 * @return {*} Valor de la propiedad o default
 */
function getSecureConfig(key, defaultValue = null) {
  try {
    const props = PropertiesService.getScriptProperties();
    const value = props.getProperty(key);
    if (value === null || value === undefined) return defaultValue;
    try { return JSON.parse(value); } catch (e) { return value; }
  } catch (error) {
    console.error('getSecureConfig error:', error);
    return defaultValue;
  }
}

/**
 * Obtiene API_SECRET de forma segura (nuevo)
 * @return {string} API Secret
 * @throws {Error} Si no está configurado
 */
function getApiSecret() {
  const secret = getSecureConfig('API_SECRET', '');
  if (!secret) throw new Error('API_SECRET not configured in PropertiesService');
  return secret;
}

/**
 * Obtiene API_SECRET_OLD para ventana de migración (24-48h)
 * @return {string|null} Old secret o null si no existe
 */
function getApiSecretOld() {
  return getSecureConfig('API_SECRET_OLD', null);
}

/**
 * Obtiene BOOTSTRAP_USERS de forma segura
 * @return {Array} Lista de usuarios bootstrap
 */
function getBootstrapUsers() {
  return getSecureConfig('BOOTSTRAP_USERS', []);
}

// ========== BFF SERVER-TO-SERVER AUTH (P0-1, P0-2) ==========

/**
 * Obtiene BFF_SHARED_SECRET para autenticación server-to-server
 * Separado de API_SECRET (P0-2)
 * @return {string} BFF Shared Secret
 */
function getBffSharedSecret_() {
  const secret = getSecureConfig('BFF_SHARED_SECRET', '');
  if (!secret) {
    console.warn('BFF_SHARED_SECRET not configured - BFF auth disabled');
  }
  return secret;
}

/**
 * Computa HMAC-SHA256 usando Utilities de GAS
 * @param {string} algorithm - 'SHA256'
 * @param {string} key - Secret key
 * @param {string} data - Data to sign
 * @return {string} Hex-encoded HMAC
 * @private
 */
function computeHmac_(algorithm, key, data) {
  const signature = Utilities.computeHmacSha256Signature(data, key);
  return signature.map(function (byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/**
 * Valida request BFF con HMAC y anti-replay (P0-1)
 * GAS no expone headers en doPost, por lo que usamos firma en body
 * 
 * @param {Object} e - Event object from doPost
 * @return {Object} { ok: boolean, data?: object, error?: string }
 */
function validateBffRequest_(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return { ok: false, error: 'NO_BODY' };
    }

    const body = JSON.parse(e.postData.contents);
    const { payload, signature } = body;

    if (!payload || !signature) {
      return { ok: false, error: 'MISSING_SIGNATURE' };
    }

    const secret = getBffSharedSecret_();
    if (!secret) {
      // BFF auth disabled - allow passthrough (for backwards compat)
      const data = JSON.parse(payload);
      return { ok: true, data };
    }

    // Parse payload to validate timestamp
    const data = JSON.parse(payload);

    // Anti-replay: 5 minute window (300000ms)
    const age = Date.now() - data.timestamp;
    if (age > 300000 || age < -60000) {
      return { ok: false, error: 'EXPIRED' };
    }

    // Verify HMAC signature
    const expected = computeHmac_('SHA256', secret, payload);
    if (signature !== expected) {
      return { ok: false, error: 'INVALID_SIGNATURE' };
    }

    return { ok: true, data };

  } catch (err) {
    console.error('validateBffRequest_ error:', err);
    return { ok: false, error: 'PARSE_ERROR' };
  }
}