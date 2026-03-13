# Portal de Cobranzas - Transperuana

Sistema integral de gestion de cobranzas, generacion y envio de Estados de Cuenta (EECC) para Transperuana Corredores de Seguros S.A.

**Version**: 4.0
**Ultima actualizacion**: Marzo 2026

---

## Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Stack Tecnologico](#stack-tecnologico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Modulos del Portal](#modulos-del-portal)
- [Instalacion y Configuracion](#instalacion-y-configuracion)
- [Desarrollo](#desarrollo)
- [Sistema de Bitacora](#sistema-de-bitacora)
- [Sistema de Correos](#sistema-de-correos)
- [Monitoreo](#monitoreo)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)

---

## Arquitectura

El sistema usa una arquitectura dual-stack con un BFF (Backend-for-Frontend) en Next.js que se comunica con Google Apps Script via HMAC-SHA256.

```
┌─────────────────────────────────┐
│       Next.js BFF (web/)        │
│  - JWT session management       │
│  - HMAC-signed GAS calls        │
│  - RBAC middleware              │
│  - API routes (/api/*)          │
└──────────────┬──────────────────┘
               │ POST (HMAC-SHA256 signed)
               v
┌─────────────────────────────────┐
│   Google Apps Script (gas/)     │
│  - portal_api.js (doPost)       │
│  - Business logic services      │
│  - HTML frontend (index.html)   │
└──────────────┬──────────────────┘
               │
    ┌──────────┼──────────┐
    v          v          v
  Sheets     Drive      Gmail
  (BD)     (Storage)   (Email)
```

### Flujo de Autenticacion

1. Usuario envia credenciales a `/api/auth/login`
2. BFF firma la peticion con HMAC-SHA256 y la envia a GAS
3. GAS valida credenciales, retorna token + datos de usuario
4. BFF crea JWT cookie firmado (httpOnly, Secure, SameSite=Strict)
5. Requests posteriores se validan via middleware JWT

### Firma HMAC de Requests

```typescript
// web/src/lib/gas-client.ts
const payload = JSON.stringify({ action, params, timestamp, nonce });
const signature = createHmac('sha256', BFF_SHARED_SECRET).update(payload).digest('hex');
```

GAS valida la firma en `config.js::validateBffRequest_()`.

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| **BFF** | Next.js 16, TypeScript |
| **Backend** | Google Apps Script (JavaScript ES6) |
| **Base de datos** | Google Sheets |
| **Almacenamiento** | Google Drive |
| **Email** | Gmail API via GAS |
| **Autenticacion** | JWT (jose) + HMAC-SHA256 |
| **Deploy GAS** | clasp (CLI) |
| **Deploy BFF** | Vercel / Node.js |

---

## Estructura del Proyecto

```
portal-cobranzas/
│
├── gas/                                # Google Apps Script (Backend + Frontend)
│   ├── config.js                       # Configuracion centralizada, feature flags
│   ├── portal_api.js                   # API endpoints (doPost handler)
│   ├── auth.js                         # Autenticacion (login, sesiones)
│   ├── auth_guard.js                   # Control de acceso
│   ├── bitacora_v3.js                  # Sistema de bitacora v3
│   ├── eecc_core.js                    # Generacion de EECC
│   ├── eecc_pipeline.js                # Pipeline de generacion masiva
│   ├── mail_queue_service.js           # Cola de correos con auto-recovery
│   ├── mailer.js                       # Servicio de envio de correos
│   ├── monitoring_service.js           # Dashboard stats y queue health
│   ├── reportes_service.js             # Generacion de reportes (XLSX)
│   ├── conciliacion_cruce.js           # Motor de conciliacion de datos
│   ├── conciliacion_service.js         # Servicio de conciliacion
│   ├── sheets_io.js                    # I/O optimizado con Sheets
│   ├── sheets_mail.js                  # Operaciones de mail en Sheets
│   ├── drive_io.js                     # Operaciones con Drive
│   ├── export.js                       # Exportacion PDF/XLSX
│   ├── logger.js                       # Logging estructurado
│   ├── audit_service.js                # Auditoria de acciones
│   ├── SchedulerService.js             # Programacion de tareas
│   ├── TemplateService.js              # Plantillas de email
│   ├── main.js                         # Entry points y menus
│   ├── utils.js                        # Utilidades
│   │
│   ├── proc_*.js                       # Procesadores por aseguradora
│   │   ├── proc_rimac.js
│   │   ├── proc_pacifico.js
│   │   ├── proc_mapfre.js
│   │   ├── proc_la_positiva.js
│   │   ├── proc_chubb.js
│   │   └── proc_qualitas.js
│   │
│   ├── index.html                      # Portal web principal (SPA)
│   ├── styles.html                     # Estilos CSS
│   ├── sidebar.html                    # Sidebar de generacion
│   ├── ui_send_drawer.html             # Drawer de envio de correos
│   ├── Upload.html                     # UI de carga de archivos
│   └── appsscript.json                 # Configuracion del proyecto GAS
│
├── web/                                # Next.js BFF
│   ├── src/
│   │   ├── app/
│   │   │   └── api/                    # API routes (proxy a GAS)
│   │   │       ├── auth/login/
│   │   │       ├── auth/logout/
│   │   │       ├── bitacora/
│   │   │       └── gas/[...path]/
│   │   ├── lib/
│   │   │   ├── gas-client.ts           # Cliente GAS con HMAC
│   │   │   ├── session.ts              # JWT session management
│   │   │   ├── rbac.ts                 # Role-based access control
│   │   │   └── bitacora-enums.ts       # Enums tipados de bitacora
│   │   └── middleware.ts               # Route protection, security headers
│   ├── tests/                          # Test suites
│   ├── package.json
│   └── .env.local                      # Variables de entorno
│
├── docs/                               # Documentacion historica
├── CLAUDE.md                           # Instrucciones para Claude Code
└── README.md                           # Este archivo
```

---

## Modulos del Portal

El portal tiene 7 modulos principales accesibles desde la barra lateral:

### 1. Dashboard

Panel de control con metricas en tiempo real:
- **EECC Hoy / Semana**: Conteo de estados de cuenta generados (fuente: Audit_Log)
- **Detalle por usuario**: Click en las metricas para ver desglose por responsable
- **Cola de correos**: Estado actual de la cola (pendientes, enviados, fallidos)
- **Errores del sistema**: Alertas de las ultimas 24 horas
- **Monitoreo**: Health check de la cola de correos

### 2. Bitacora

Registro y seguimiento de gestiones de cobranza con dos tabs:

- **Estado Actual**: Tabla con todas las gestiones, filtros avanzados (estado, responsable, dias, compromiso, tendencia), KPIs por estado de gestion
- **Registrar Gestion**: Formulario con acciones rapidas, autocompletado de clientes, historial del cliente, indicador de progreso de campos, sugerencias de proxima accion

### 3. Generar EECC

Generacion de estados de cuenta en lote:
- Seleccion individual o por grupo economico
- Pipeline con progreso visual por asegurado
- Generacion en PDF con formato profesional
- Almacenamiento automatico en Drive

### 4. Enviar Correos

Sistema de envio masivo de EECC por email:
- Cola de correos con auto-recovery
- Plantillas personalizables
- Preview antes de enviar
- Tracking de estado (pendiente, enviado, fallido)

### 5. Reportes

Exportacion de reportes en XLSX:
- Dashboard Ejecutivo
- Saldos por asegurado
- Vencidos +60 dias
- Bitacora de gestiones
- Progreso visual por pasos

### 6. Conciliacion

Cruce de datos entre BD y aseguradoras:
- Stepper visual de 2 pasos
- Carga de archivo de aseguradora
- Motor de cruce automatico
- Reporte de diferencias

### 7. Actualizar Base

Importacion de datos desde archivos Excel/CSV:
- Procesadores por aseguradora (Rimac, Pacifico, Mapfre, etc.)
- Validacion de formato
- Eliminacion de duplicados
- Log de importacion

---

## Instalacion y Configuracion

### Requisitos

- Node.js 18+
- Cuenta Google Workspace
- [clasp](https://github.com/google/clasp) instalado (`npm i -g @google/clasp`)

### 1. Clonar y configurar BFF

```bash
git clone <repo-url>
cd portal-cobranzas/web
npm install
```

Crear `web/.env.local`:

```env
GAS_BASE_URL=https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
BFF_SHARED_SECRET=<32+ caracteres>
SESSION_SECRET=<32+ caracteres>
```

### 2. Configurar Google Apps Script

```bash
cd gas
clasp login
clasp clone <SCRIPT_ID>  # o crear .clasp.json manualmente
```

Configurar Script Properties en GAS:
- `BFF_SHARED_SECRET`: Debe coincidir con web/.env.local
- `API_SECRET`: API key legacy
- `BOOTSTRAP_USERS`: JSON array de usuarios iniciales

### 3. Configurar config.js

Actualizar IDs en `gas/config.js`:
- `CONFIG.DRIVE.OUTPUT_FOLDER_ID`
- `CONFIG.DRIVE.LOGO_FILE_ID`
- Nombres de hojas en `CONFIG.SHEETS`

### 4. Deploy

```bash
# Apps Script
cd gas && clasp push --force

# BFF (desarrollo)
cd web && npm run dev

# BFF (produccion)
cd web && npm run build && npm run start
```

---

## Desarrollo

### Comandos del BFF

```bash
cd web
npm run dev      # Servidor de desarrollo (localhost:3000)
npm run build    # Build de produccion
npm run start    # Servidor de produccion
npm run lint     # ESLint
```

### Deploy GAS

```bash
cd gas
clasp push --force    # Subir cambios a Apps Script
clasp open            # Abrir editor en navegador
```

### Feature Flags

Controlados en `gas/config.js::CONFIG.FEATURES`:

| Flag | Descripcion |
|------|------------|
| `MAIL_QUEUE_MODE` | Cola vs envio directo de emails |
| `PIPELINE_ENABLED` | Pipeline de generacion EECC |
| `DASHBOARD_STATS` | Metricas del dashboard |
| `QUEUE_HEALTH_PANEL` | Panel de salud de la cola |

---

## Sistema de Bitacora

### Estados de Gestion

Agrupados en 3 categorias:

**En gestion:**

| Estado | Descripcion |
|--------|-------------|
| `SIN_RESPUESTA` | Cliente no ha respondido |
| `EN_SEGUIMIENTO` | En proceso de seguimiento |
| `COMPROMISO_PAGO` | Cliente comprometio fecha de pago |
| `REPROGRAMADO` | Gestion reprogramada a nueva fecha |

**Derivados:**

| Estado | Descripcion |
|--------|-------------|
| `DERIVADO_COMERCIAL` | Escalado al area Comercial |
| `DERIVADO_RRHH` | Escalado a Gerencia de RRHH |
| `DERIVADO_RIESGOS_GENERALES` | Escalado a Riesgos Generales |

**Cerrados:**

| Estado | Descripcion |
|--------|-------------|
| `CERRADO_PAGADO` | Gestion cerrada - Pago realizado |
| `NO_COBRABLE` | Deuda no recuperable |
| `NO_CONTACTABLE` | Cliente no localizable |

### Acciones Rapidas

El formulario incluye chips de accion rapida que pre-llenan los campos:

- Sin respuesta, WhatsApp enviado, Correo enviado
- Compromiso de pago, Reprogramado
- Cerrado/Pagado, No contactable, No cobrable

### Campos del Formulario

| Campo | Tipo | Obligatorio |
|-------|------|:-----------:|
| Asegurado/Cliente | Autocomplete | Si |
| Tipo de Contacto | Select | Si |
| Fecha y Hora | datetime-local | Si |
| Responsable | Select (Pilar/Gladys) | Si |
| Estado de Gestion | Select | Si |
| Proxima Accion | Text + sugerencias | Si |
| Fecha Compromiso | Date | Condicional |
| Observaciones | Textarea | Condicional |

---

## Sistema de Correos

### Cola de Correos (Mail Queue)

- **Tabla**: `Mail_Queue` en Google Sheets
- **Estados**: PENDING, PROCESSING, SENT, FAILED, RETRY
- **Auto-recovery**: Items en PROCESSING por mas de 15 min se reencolan
- **Monitoreo**: Panel de salud con alertas de cola atascada

### Plantillas

Gestionadas en `Mail_Templates` sheet y `TemplateService.js`. Soportan variables dinamicas del asegurado.

---

## Monitoreo

### Dashboard Stats (MonitoringService)

- **Cache**: 60 segundos via CacheService
- **Fuente EECC**: Audit_Log (ACTION = GENERATE_EECC)
- **Fuente Queue**: Mail_Queue (estados PENDING/SENT/FAILED)
- **Fuente Errores**: Debug_Log (LEVEL = ERROR/CRITICAL)
- **Soft-fail**: Si una hoja no esta disponible, retorna `available: false`

### Hojas de Monitoreo

| Hoja | Contenido |
|------|-----------|
| `Audit_Log` | Registro de acciones (generacion EECC, login, etc.) |
| `Debug_Log` | Logs del sistema (info, warn, error, critical) |
| `Mail_Queue` | Cola de correos pendientes |
| `Mail_Log` | Historial de correos enviados |
| `Portal_Accesos` | Registro de accesos al portal |

---

## Troubleshooting

### Autocomplete no muestra todos los clientes

El autocomplete carga la lista completa de asegurados desde BD via `getClientesConCiclosActivos()`. Si solo muestra clientes con gestiones existentes, recargar la pagina para forzar la carga completa.

### Sesion invalida o expirada

1. Cerrar sesion y volver a iniciar sesion
2. Token TTL: 8 horas
3. Limpiar cache del navegador si persiste

### Correos no se envian

1. Verificar `Mail_Queue` para items con status FAILED
2. Verificar trigger de cola activo
3. Revisar `Mail_Log` para errores especificos
4. Cuota Gmail: max 500 correos/dia (Workspace estandar)

### Metricas del dashboard en 0

- Las metricas EECC vienen de `Audit_Log` (ACTION = GENERATE_EECC)
- Cache de 60 segundos; esperar o limpiar cache
- Verificar que la hoja `Audit_Log` exista y tenga datos

### Error de HMAC / firma invalida

1. Verificar que `BFF_SHARED_SECRET` sea identico en web/.env.local y Script Properties
2. Verificar que el timestamp no tenga mas de 5 minutos de diferencia

---

## Changelog

### v4.0 (Marzo 2026)

- Arquitectura dual-stack con Next.js BFF y HMAC-SHA256
- Dashboard con metricas en tiempo real y desglose por usuario
- Bitacora v3 con KPIs por estado de gestion
- Acciones rapidas alineadas con todos los estados
- Campo Responsable como selector (Pilar/Gladys)
- Formulario con sugerencias de proxima accion y historial del cliente
- Indicador de progreso de campos obligatorios
- Onboarding banner con acceso a los 6 modulos
- Reportes con progreso visual por pasos y timestamps
- Fix: autocomplete carga todos los asegurados desde BD
- Conciliacion con stepper visual
- Monitoreo de cola de correos con health check
- 10 Laws of UX implementadas

### v3.0 (2025)

- Portal web como Google Apps Script Web App
- Sistema de bitacora v1
- Generacion y envio de EECC
- Importacion de datos por aseguradora
- Sistema de correos con cola

### v1.0 (Enero 2025)

- Version inicial
- Generacion basica de EECC
- Sistema de autenticacion
- Bitacora basica

---

## Licencia

Copyright 2026 Transperuana Corredores de Seguros S.A.

Todos los derechos reservados. Sistema de uso interno exclusivo.

---

**Desarrollado por**: Equipo de Desarrollo Transperuana
**Version**: 4.0
