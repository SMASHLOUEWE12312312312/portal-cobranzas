# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portal de Cobranzas is a collection management system for Transperuana Corredores de Seguros. It uses a dual-stack architecture:

- **Backend**: Google Apps Script (GAS) deployed as a Web App
- **Frontend/BFF**: Next.js 16 application that proxies requests to GAS with HMAC authentication
- **Database**: Google Sheets
- **Storage**: Google Drive

## Commands

### Next.js Web Application (run from `web/` directory)

```bash
cd web
npm run dev      # Start development server at localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Google Apps Script

GAS code is in `gas/` directory. Deploy via:
1. Copy files to Google Apps Script editor
2. Deploy → New deployment → Web App

## Architecture

```
┌─────────────────────────────┐
│      Next.js BFF (web/)     │
│  - JWT session management   │
│  - HMAC-signed GAS calls    │
│  - RBAC middleware          │
└──────────────┬──────────────┘
               │ POST (HMAC-SHA256 signed)
               ▼
┌─────────────────────────────┐
│  Google Apps Script (gas/)  │
│  - portal_api.js endpoints  │
│  - Business logic services  │
└──────────────┬──────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
  Sheets     Drive      Gmail
```

### Key Directories

- `gas/` - Google Apps Script backend
  - `config.js` - All configuration constants, sheet names, feature flags
  - `portal_api.js` - API endpoints (doPost handler, all actions)
  - `auth.js` - Authentication (login, sessions)
  - `bitacora_v3.js` - Collection cycle tracking
  - `eecc_core.js` - EECC document generation
  - `mail_queue_service.js` - Email queue with auto-recovery
  - `*.html` - UI templates (sidebar, modals)

- `web/src/` - Next.js BFF
  - `app/api/` - API routes that proxy to GAS
  - `lib/gas-client.ts` - HMAC-authenticated GAS client
  - `lib/session.ts` - JWT session management (jose)
  - `lib/rbac.ts` - Role-based access control
  - `middleware.ts` - Route protection, security headers

### Authentication Flow

1. User POSTs credentials to `/api/auth/login`
2. BFF calls GAS `login` action with HMAC signature
3. GAS validates credentials, returns token + user
4. BFF creates signed JWT cookie (httpOnly, Secure, SameSite=Strict)
5. Subsequent requests validated via middleware JWT verification

### GAS Request Signing (P0-1)

BFF signs all GAS requests with HMAC-SHA256:

```typescript
// web/src/lib/gas-client.ts
const payload = JSON.stringify({ action, params, timestamp, nonce });
const signature = createHmac('sha256', BFF_SHARED_SECRET).update(payload).digest('hex');
// Body: { payload, signature }
```

GAS validates in `config.js::validateBffRequest_()`.

## Configuration

### Environment Variables (web/.env.local)

```
GAS_BASE_URL=https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
BFF_SHARED_SECRET=<32+ char secret>
SESSION_SECRET=<32+ char secret>
```

### GAS Script Properties

Set via `PropertiesService.getScriptProperties()`:
- `BFF_SHARED_SECRET` - Must match web env
- `API_SECRET` - Legacy API key
- `BOOTSTRAP_USERS` - JSON array of initial users

### Feature Flags

Feature flags in `gas/config.js::CONFIG.FEATURES` control functionality:
- `MAIL_QUEUE_MODE` - Queue vs direct email sending
- `PIPELINE_ENABLED` - EECC generation pipeline
- `ENABLE_*` - Various service toggles

## Key Patterns

### Bitácora States

Collection tracking states defined in `CONFIG.BITACORA.ESTADOS`:
- `SIN_RESPUESTA`, `EN_SEGUIMIENTO`, `COMPROMISO_PAGO`, `REPROGRAMADO`
- `DERIVADO_COMERCIAL`, `DERIVADO_RRHH`, `DERIVADO_RIESGOS_GENERALES`
- `CERRADO_PAGADO`, `NO_COBRABLE`, `NO_CONTACTABLE`

### API Response Format

All GAS endpoints return:
```javascript
{ ok: boolean, data?: any, error?: { code: string, message: string }, correlationId: string }
```

### Sheet Names

All sheet names are in `CONFIG.SHEETS`:
- `BD` - Master data
- `Bitacora_Gestiones_EECC` - Collection tracking
- `Mail_Queue`, `Mail_Log`, `Mail_Templates` - Email system
- `Portal_Accesos` - User access logs

## Debugging

- GAS logs: Check `Debug_Log` sheet or Apps Script execution logs
- BFF: Standard Next.js console logging
- Email queue issues: Check `Mail_Queue` sheet for stuck `PROCESSING` status
- Auth issues: Check `Portal_Accesos` sheet for session records
