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
    BOOTSTRAP_USERS: [
      { user: 'cobranzas1', password: 'Transperuana1@2025#' },
      { user: 'cobranzas2', password: 'Transperuana2@2025#' },
      { user: 'admin', password: 'Transperuana3@2025#' },
      { user: 'admin1', password: 'Transperuana4@2025#' },
      { user: 'admin2', password: 'Transperuana5@2025#' },
      { user: 'admin3', password: 'Transperuana6@2025#' },
      { user: 'admin4', password: 'Transperuana7@2025#' }
    ],
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
    ENABLE_LOGO_CACHE: false,            // Disabled: logo is embedded in EECC_Template
    LOGO_CACHE_TTL_SECONDS: 3600,        // 1 hour cache for logo
    // Phase 1 Enterprise Foundations (2026-01-12)
    PIPELINE_ENABLED: false,             // EECC Pipeline with persisted states
    MAIL_QUEUE_MODE: false               // Persistent mail queue (vs direct send)
  },

  // ========== LOCK ==========
  LOCK: {
    SEND_EMAIL_TIMEOUT_MS: 30000         // 30 second lock timeout for sendEmailsNow
  },

  // ========== MAIL QUEUE (Phase 1) ==========
  MAIL_QUEUE: {
    BATCH_SIZE: 10,                      // Items processed per trigger run
    MAX_RETRIES: 3                       // Max retry attempts before FAILED
  },

  // ========== API ==========
  API: {
    SECRET: 'tr@nsP-2025_AsegEECC#f49QY7pZ!1LJ'
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
    }
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
