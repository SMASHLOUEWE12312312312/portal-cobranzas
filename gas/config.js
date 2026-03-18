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

  // ========== CONCILIACIÓN COBRANZAS ==========
  // Módulo para cruce de estados de cuenta vs BD Sisnet
  CONCILIACION: {
    // ID del spreadsheet SEPARADO para conciliación
    SS_ID: '1BNkwkbBG-rAz856wfBP8JCw-cUcGTDb5au5NqrXLYUs',

    // Carpeta para exports (usa DRIVE.OUTPUT_FOLDER_ID si vacío)
    FOLDER_ID: '',

    // Columna del CUPON en BD_Cruce (1-indexed) - Por defecto H = 8
    BD_CRUCE_CUPON_COL: 8,

    // Aseguradoras habilitadas
    INSURERS: {
      LA_POSITIVA: { key: 'la_positiva', name: 'La Positiva', enabled: true },
      CRECER_PROTECTA: { key: 'crecer_protecta', name: 'Crecer&Protecta', enabled: true },
      MAPFRE: { key: 'mapfre', name: 'Mapfre', enabled: true },
      PACIFICO: { key: 'pacifico', name: 'Pacífico', enabled: true },
      RIMAC: { key: 'rimac', name: 'Rimac', enabled: true },
      CHUBB: { key: 'chubb', name: 'CHUBB', enabled: true },
      QUALITAS: { key: 'qualitas', name: 'Qualitas', enabled: true },
      CRECER_VLE: { key: 'crecer_vle', name: 'Crecer VLE', enabled: true }
    }
  },

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
    // P1-1 SECURITY: Explicit list of admin users (no more username-based inference)
    ADMIN_USERS: ['admin', 'admin1', 'admin2', 'admin3', 'admin4'],
    WHITELIST_EMAILS: [
      'cobranzas1@transperuana.com',
      'cobranzas2@transperuana.com',
      'admin@transperuana.com'
    ],
    USER_DISPLAY_NAMES: {
      'cobranzas': 'Cristian',
      'cobranzas1': 'Pilar',
      'cobranzas2': 'Gladys',
      'admin4': 'Cristian',
      'admin': 'Roberto'
    }
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
    MAIL_QUEUE_MODE: false,               // Persistent mail queue (vs direct send)
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
    TEMPLATE_VIEWER_ENABLED: true,       // View mail templates (enabled for BFF)
    HEALTH_CHECK_ENABLED: true,          // System health check endpoint (enabled for BFF)
    // ========== FASE 1: FUNDAMENTOS CRÍTICOS (2026-01-15) ==========
    ENABLE_ERROR_HANDLER: true,        // ErrorHandler centralizado con categorización
    ENABLE_CACHE_HELPER: true,         // CacheHelper con TTL diferenciado
    ENABLE_AUTO_BACKUP: true,          // BackupService con trigger diario
    ENABLE_KPI_DASHBOARD: true,        // KPIService con métricas de cobranzas
    // ========== FASE 2: CORE DE COBRANZAS (2026-01-16) ==========
    ENABLE_ALERT_SERVICE: true,        // AlertService con alertas automatizadas
    ENABLE_PTP_SERVICE: true,          // PTPService para Promise to Pay
    ENABLE_COLLECTION_WORKFLOW: true,  // CollectionWorkflow con cadencia de contacto
    // ========== FASE 3: AUTOMATIZACIÓN (2026-01-16) ==========
    ENABLE_AUTOMATION_ENGINE: true,    // Motor de automatización y triggers
    ENABLE_EMAIL_AUTOMATION: true,     // Emails automáticos (recordatorios, alertas)
    ENABLE_REPORT_SCHEDULER: true,     // Reportes diarios y semanales programados
    // ========== FASE 4: ANALYTICS & REPORTING (2026-01-16) ==========
    ENABLE_ANALYTICS_SERVICE: true,    // Análisis de tendencias y performance
    ENABLE_DASHBOARD_SERVICE: true,    // Dashboard ejecutivo con widgets
    ENABLE_EXPORT_SERVICE: true,       // Exportación a Excel, CSV, PDF
    // ========== FASE 5: UX & OPTIMIZACIÓN (2026-01-16) ==========
    ENABLE_UX_HELPERS: true,           // Helpers de formateo y validación
    ENABLE_RESPONSE_FORMATTER: true,   // Formateo estandarizado de respuestas
    ENABLE_PERFORMANCE_MONITOR: true,   // Monitoreo de rendimiento
    // ========== DASHBOARD REPORTS (2026-03-12) ==========
    ENABLE_DASHBOARD_REPORTS: true     // Dashboard profesional en reportes Excel
  },

  // ========== LOCK ==========
  LOCK: {
    SEND_EMAIL_TIMEOUT_MS: 30000         // 30 second lock timeout for sendEmailsNow
  },

  // ========== SECURITY (P0-2) ==========
  SECURITY: {
    // P0-2: Enforce BFF authentication - reject requests if secret is missing
    // Set to false ONLY for local development without BFF
    ENFORCE_BFF_AUTH: true
  },

  // ========== MONITORING (Phase 3) ==========
  MONITORING: {
    QUEUE_STALE_MINUTES: 15,             // WARN if oldest pending > this
    QUEUE_STUCK_MINUTES: 30,             // ERROR if processing > this
    PROCESSING_STUCK_THRESHOLD: 3        // ERROR if this many items stuck in processing
  },

  ALERTS: {
    ENABLED: true,                       // Habilitado tras auditoría v4.1
    // P1-2: ADMIN_EMAILS now loaded from Script Properties via getAlertAdminEmails()
    // Set via: PropertiesService.getScriptProperties().setProperty('ALERTS_ADMIN_EMAILS', JSON.stringify(['email@example.com']))
    ADMIN_EMAILS: [],                    // Fallback if Script Property not set
    DEBOUNCE_MINUTES: 60,                // Max 1 alert per hour per type
    QUEUE_STUCK_ALERT_MINUTES: 30,       // Trigger alert if stuck > this
    SIN_GESTION_DIAS: 7,                 // Días sin gestión para generar alerta
    AGING_CRITICO_THRESHOLD: 5,          // % de cartera en 90+ días para alerta crítica
    AGING_ALTO_THRESHOLD: 10             // % de cartera en 61-90 días para alerta alta
  },

  // ========== BACKUP (Fase 1) ==========
  BACKUP: {
    FOLDER_ID: '',                     // ID de carpeta en Drive (se crea automáticamente si vacío)
    RETENTION_DAYS: 30,                // Días de retención de backups
    CRITICAL_SHEETS: ['BD', 'Bitacora_Gestiones_EECC', 'Mail_Queue', 'Portal_Accesos'],
    NOTIFY_ON_COMPLETE: false,         // Notificar por email al completar
    SCHEDULE_HOUR: 2                   // Hora del trigger automático (2 AM Lima)
  },

  KPI: {
    CACHE_TTL_SECONDS: 300,            // 5 minutos de cache
    DSO_BENCHMARK: 35,                 // Días objetivo para DSO
    // ========== UMBRALES AGRESIVOS (alertar temprano) ==========
    DSO_WARN_THRESHOLD: 36,            // DSO para mostrar warning (benchmark + 1)
    DSO_CRITICAL_THRESHOLD: 42,        // DSO para mostrar critical (benchmark + 7)
    VENCIDO_THRESHOLD_WARN: 10,        // % cartera vencida para warning
    VENCIDO_THRESHOLD_ERROR: 18,       // % cartera vencida para critical
    BUCKET_90_WARN: 3,                 // % en bucket 90+ para warning
    BUCKET_90_CRITICAL: 6,             // % en bucket 90+ para critical
    BUCKET_61_90_WARN: 7,              // % en bucket 61-90 para warning
    BUCKET_61_90_CRITICAL: 12          // % en bucket 61-90 para critical
  },

  // ========== PORTAL URLs (para emails con CTAs) ==========
  PORTAL: {
    // Base URL del portal web (Google Apps Script WebApp - PRODUCCIÓN)
    BASE_URL: 'https://script.google.com/a/macros/transperuana.com.pe/s/AKfycbxDtcmAtePCa2x0YHFh3BT-qSTTqUz_cdhPn8GRvE0o0XNqq1MYptKpSksU6Fi2eekb/exec',
    
    // Rutas específicas (para WebApp de GAS, usar parámetros ?view=)
    ROUTES: {
      DASHBOARD: '?view=dashboard',
      ALERTAS: '?view=alertas',
      PTPS: '?view=ptps',
      BITACORA: '?view=bitacora',
      REPORTES: '?view=reportes'
    }
  },

  WORKFLOW: {
    PRIMER_CONTACTO_DIAS: 0,           // Días para primer contacto
    SEGUIMIENTO_1_DIAS: 3,             // Días para primer seguimiento
    SEGUIMIENTO_2_DIAS: 7,             // Días para segundo seguimiento
    ESCALAMIENTO_SOFT_DIAS: 14,        // Días para escalamiento a supervisor
    ESCALAMIENTO_HARD_DIAS: 21,        // Días para escalamiento a gerencia
    CIERRE_FORZADO_DIAS: 30            // Días para evaluar incobrabilidad
  },

  // ========== AUTOMATION (Fase 3) ==========
  AUTOMATION: {
    ADMIN_EMAILS: [
      'csarapura@transperuana.com.pe',
      'cobranzas@transperuana.com.pe',
      'cobranzas1@transperuana.com.pe',
      'rcarbajal@transperuana.com.pe'
    ],  // Emails de administradores para reportes
    REPLY_TO_EMAIL: '',                // Email de respuesta (opcional)
    DAILY_SUMMARY_HOUR: 7,             // Hora para resumen diario (7 AM)
    WEEKLY_REPORT_DAY: 3,              // Día para reporte semanal (3=Miércoles) - 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
    WEEKLY_REPORT_HOUR: 8,             // Hora para reporte semanal (8 AM)
    MAX_EMAILS_PER_RUN: 50,            // Máximo emails por ejecución
    PTP_REMINDER_DAYS_BEFORE: 3        // Días antes para recordatorio PTP
  },

  // ========== ANALYTICS (Fase 4) ==========
  ANALYTICS: {
    CACHE_TTL_SECONDS: 600,            // 10 minutos de cache para analytics
    TREND_PERIODS_TO_SHOW: 12,         // Últimos 12 periodos en tendencias
    PERFORMANCE_MIN_GESTIONES: 10,     // Mínimo gestiones para incluir en ranking
    FORECAST_DAYS_DEFAULT: 30          // Días default para proyección
  },

  // ========== CACHE OPTIMIZATION (Fase 5) ==========
  CACHE_OPTIMIZATION: {
    ENABLED: true,
    STRATEGY: 'LRU',                     // Least Recently Used
    DEFAULT_TTL: 300,                    // 5 minutos default
    TTL_BY_TYPE: {
      KPI: 300,                          // KPIs: 5 min
      ALERTS: 180,                       // Alertas: 3 min
      DASHBOARD: 120,                    // Dashboard: 2 min
      ANALYTICS: 600,                    // Analytics: 10 min
      STATIC: 3600                       // Datos estáticos: 1 hora
    },
    MAX_ENTRIES: 100,                    // Máximo entradas en cache
    COMPRESSION_THRESHOLD: 5000          // Comprimir si > 5KB
  },

  // ========== REPORT_EXPORT (Fase 4) ==========
  REPORT_EXPORT: {
    FOLDER_NAME: 'Portal_Cobranzas_Exports',
    RETENTION_DAYS: 30,                // Días de retención de exports
    MAX_ROWS_PDF: 100,                 // Máximo filas en PDF
    MAX_ROWS_EXCEL: 50000              // Máximo filas en Excel
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

// ========== ADMIN EMAILS (P1-2) ==========

/**
 * Obtiene lista de emails admin para alertas
 * Lee de Script Properties (ALERTS_ADMIN_EMAILS) con fallback a CONFIG
 *
 * Para configurar:
 *   PropertiesService.getScriptProperties().setProperty('ALERTS_ADMIN_EMAILS', JSON.stringify(['email@example.com']))
 *
 * @return {Array<string>} Lista de emails admin
 */
function getAlertAdminEmails() {
  // Try Script Properties first (secure, not in code)
  const fromProps = getSecureConfig('ALERTS_ADMIN_EMAILS', null);
  if (fromProps && Array.isArray(fromProps) && fromProps.length > 0) {
    return fromProps;
  }

  // Fallback to CONFIG
  const fromConfig = getConfig('ALERTS.ADMIN_EMAILS', []);
  if (fromConfig && fromConfig.length > 0) {
    return fromConfig;
  }

  // P1-2: Log warning if no admin emails configured (only once per session)
  if (!getAlertAdminEmails._warned) {
    console.warn('P1-2 WARNING: No ALERTS_ADMIN_EMAILS configured - alerts will not be sent');
    getAlertAdminEmails._warned = true;
  }

  return [];
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
    // P0-FIX: Only warn, don't silently return empty string that bypasses validation
    // The actual enforcement happens in validateBffRequest_ which checks ENFORCE_BFF_AUTH
    console.warn('BFF_SHARED_SECRET not configured - BFF auth may be disabled');
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
 * P0-FIX: Constant-time string comparison to prevent timing attacks on HMAC verification
 * @param {string} a - First string
 * @param {string} b - Second string
 * @return {boolean} True if equal
 * @private
 */
function _timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Valida request BFF con HMAC y anti-replay
 * GAS no expone headers en doPost, por lo que usamos firma en body
 *
 * P0-2 SECURITY: If SECURITY.ENFORCE_BFF_AUTH is true (default), requests
 * without a configured BFF_SHARED_SECRET will be REJECTED.
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
    const enforceAuth = getConfig('SECURITY.ENFORCE_BFF_AUTH', true);

    if (!secret) {
      if (enforceAuth) {
        // P0-2 SECURITY: Reject if enforcement enabled and secret missing
        console.error('BFF_SHARED_SECRET not configured but ENFORCE_BFF_AUTH is true - REJECTING REQUEST');
        return { ok: false, error: 'BFF_AUTH_NOT_CONFIGURED' };
      }
      // Enforcement disabled (dev mode) - allow passthrough with warning
      console.warn('BFF auth disabled (ENFORCE_BFF_AUTH=false) - allowing passthrough');
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

    // P0-FIX: Verify HMAC signature with constant-time comparison
    // Prevents timing attacks by comparing all bytes regardless of early mismatch
    const expected = computeHmac_('SHA256', secret, payload);
    if (!_timingSafeEqual(signature, expected)) {
      return { ok: false, error: 'INVALID_SIGNATURE' };
    }

    return { ok: true, data };

  } catch (err) {
    console.error('validateBffRequest_ error:', err);
    return { ok: false, error: 'PARSE_ERROR' };
  }
}