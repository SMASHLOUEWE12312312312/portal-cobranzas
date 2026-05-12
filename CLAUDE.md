# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portal de Cobranzas is a collection management system for Transperuana Corredores de Seguros. It uses a dual-stack architecture:

- **Backend**: Google Apps Script (GAS) deployed as a Web App
- **Frontend/BFF**: Next.js 16 (React 19) application that proxies requests to GAS with HMAC authentication
- **Database**: Google Sheets
- **Storage**: Google Drive
- **Email**: Gmail API via GAS

## Commands

### Next.js BFF (run from `web/`)

```bash
cd web
npm run dev          # Dev server on localhost:3000
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run test         # Jest unit tests
npm run test:smoke   # Jest smoke test only (tests/smoke.test.ts)
npm run test:e2e     # Playwright E2E
npm run test:e2e:ui  # Playwright UI mode
```

Run a single Jest test file: `npx jest <path>` from `web/`. Run a single Playwright test: `npx playwright test <path>`.

### Google Apps Script (run from repo root)

The repo is configured with clasp (`.clasp.json` → scriptId, rootDir=`gas`). `.claspignore` excludes `tests/**`.

```bash
clasp push --force   # Upload gas/ to Apps Script
clasp open           # Open editor in browser
clasp pull           # Pull remote changes into gas/
```

Deploying a new Web App version is manual: Apps Script editor → Deploy → New deployment → Web App. The BFF talks to one deployment URL at a time (set in `GAS_BASE_URL`).

## Architecture

```
Browser
  │
  ▼
Next.js BFF (web/)        — JWT cookies, HMAC-signed GAS calls, RBAC middleware
  │  POST (HMAC-SHA256 signed)
  ▼
Google Apps Script (gas/) — doPost router, business logic services
  │
  ├── Google Sheets  (BD, Bitácora, Mail_Queue, Audit_Log, Debug_Log, ...)
  ├── Google Drive   (PDFs, ZIPs)
  └── Gmail API      (EECC emails)
```

The GAS layer also serves a legacy HTML SPA (`gas/index.html` + `*.html` partials) directly as a Web App. The Next.js BFF is the modern entry point and is the only one that uses HMAC.

### Authentication Flow

1. User POSTs credentials to `/api/auth/login` (BFF).
2. BFF calls GAS `login` action with HMAC signature.
3. GAS validates against `Portal_Accesos`, returns token + user.
4. BFF creates signed JWT cookie (httpOnly, Secure, SameSite=Strict, TTL 8h).
5. Subsequent requests validated by `web/src/middleware.ts` JWT verification.

### GAS Request Signing

BFF signs all GAS requests with HMAC-SHA256:

```typescript
// web/src/lib/gas-client.ts
const payload = JSON.stringify({ action, params, timestamp, nonce });
const signature = createHmac('sha256', BFF_SHARED_SECRET).update(payload).digest('hex');
// Body: { payload, signature }
```

GAS validates in `gas/config.js::validateBffRequest_()`. Timestamps older than 5 min are rejected. `BFF_SHARED_SECRET` mismatch between web env and GAS Script Properties is the most common cause of `HMAC_INVALID`.

### RBAC

Roles: `ADMIN`, `COBRANZAS`, `SUPERVISOR`, `LECTURA`, `COMERCIAL`, `RRHH`. Permissions are namespaced (`BITACORA:READ/WRITE`, `EECC:READ/GENERATE`, `MAIL:READ/SEND`, `BASE:READ/WRITE`, `CONCILIACION:*`, `DASHBOARD:READ`). Enforced in `web/src/lib/rbac.ts` and applied via `middleware.ts`.

## Key Directories

- `gas/` — GAS backend + legacy HTML SPA
  - `config.js` — All config constants, sheet names, feature flags, `validateBffRequest_()`
  - `portal_api.js` — `doPost` handler, all action routing
  - `auth.js`, `auth_guard.js` — Login + access control
  - `admin_users.js` — User CRUD for the admin panel
  - `bitacora_v3.js` — Collection cycle tracking (current version; older versions exist as `*_backup.js`)
  - `eecc_core.js`, `eecc_pipeline.js` — EECC document generation (single + batch)
  - `mail_queue_service.js`, `mailer.js`, `email_templates_v2.js` — Email queue with auto-recovery
  - `monitoring_service.js`, `dashboard_service.js` — Stats, queue health
  - `conciliacion_*.js` — Reconciliation engine (cruce/io/service/export)
  - `proc_*.js` — Per-insurer file processors (Rímac, Pacífico, Mapfre, La Positiva, Chubb, Qualitas, Crecer Protecta/VLE)
  - `*_backup.js` — Snapshots of prior versions; **do not edit** unless intentionally restoring
  - `tests/` — GAS-side tests (excluded from `clasp push` via `.claspignore`)
  - `test_*.js` (root of `gas/`) — One-off verification scripts run from the Apps Script editor. These are **NOT** excluded by `.claspignore` (only `tests/**` is) and will be pushed to the live project.
  - `*.html` — UI templates served by GAS (`index.html` is the legacy SPA root)

- `web/src/` — Next.js BFF
  - `app/(auth)/`, `app/(portal)/` — Route groups: unauthenticated (login) vs authenticated (portal shell)
  - `app/api/` — Route handlers, organized by domain (`auth/`, `dashboard/`, `bitacora/`, `eecc/`, `mail/`, `base/`, `conciliacion/`, plus `gas/[...path]/` passthrough)
  - `lib/gas-client.ts` — HMAC client (single source of truth for GAS calls)
  - `lib/session.ts` — JWT (jose) cookie management
  - `lib/rbac.ts` — Role/permission tables
  - `lib/bitacora-enums.ts` — Typed mirror of `CONFIG.BITACORA.ESTADOS`
  - `lib/audit.ts` — Audit log helpers shared by API routes
  - `lib/types.ts` — Shared TypeScript types for BFF ↔ GAS payloads
  - `middleware.ts` — Route protection + security headers
  - `tests/` — Jest specs; `tests/smoke.test.ts` is the connectivity smoke test

## Configuration

### Environment Variables (`web/.env.local`)

```
GAS_BASE_URL=https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
BFF_SHARED_SECRET=<32+ char secret>
SESSION_SECRET=<32+ char secret>
```

`BFF_SHARED_SECRET` must match the GAS Script Property of the same name. `SESSION_SECRET` is local to the BFF.

### GAS Script Properties

Set via `PropertiesService.getScriptProperties()`:
- `BFF_SHARED_SECRET` — Must match web env
- `ENFORCE_BFF_AUTH` — Set to `true` to require HMAC on all GAS calls
- `API_SECRET` — Legacy API key
- `BOOTSTRAP_USERS` — JSON array of initial users (used on first run)

### Feature Flags (`gas/config.js::CONFIG.FEATURES`)

- `MAIL_QUEUE_MODE` — Queue vs direct send
- `PIPELINE_ENABLED` — EECC batch pipeline
- `DASHBOARD_STATS`, `QUEUE_HEALTH_PANEL` — Dashboard panels
- `ENABLE_*` — Various service toggles

## Key Patterns

### API Response Shape (GAS → BFF)

```js
{ ok: boolean, data?: any, error?: { code, message }, correlationId: string }
```

`correlationId` is propagated end-to-end and shows up in `Debug_Log`.

### Bitácora States (`CONFIG.BITACORA.ESTADOS`)

Grouped into three buckets:
- **En gestión**: `SIN_RESPUESTA`, `EN_SEGUIMIENTO`, `COMPROMISO_PAGO`, `REPROGRAMADO`
- **Derivados**: `DERIVADO_COMERCIAL`, `DERIVADO_RRHH`, `DERIVADO_RIESGOS_GENERALES`
- **Cerrados**: `CERRADO_PAGADO`, `NO_COBRABLE`, `NO_CONTACTABLE`

The TypeScript mirror lives in `web/src/lib/bitacora-enums.ts`. Keep these in sync when adding states.

### Sheet Names (all in `CONFIG.SHEETS`)

- `BD` — Master data
- `Bitacora_Gestiones_EECC` — Collection tracking
- `Mail_Queue`, `Mail_Log`, `Mail_Templates` — Email system
- `Portal_Accesos` — User + session log
- `Audit_Log` — Action log (source for dashboard EECC counts: `ACTION = GENERATE_EECC`)
- `Debug_Log` — Structured logs (source for error panel: `LEVEL = ERROR/CRITICAL`)

### Mail Queue State Machine

`PENDING → PROCESSING → SENT | FAILED | RETRY`. Items stuck in `PROCESSING` for >15 min are auto-recovered. Cuota Gmail estándar: 500/día.

### Dashboard Stats (`monitoring_service.js`)

60-second `CacheService` cache. Soft-fail per source: if a sheet is missing, the panel returns `available: false` rather than erroring. EECC counts come from `Audit_Log`, not from a counter.

## Debugging

- GAS logs → `Debug_Log` sheet, or Apps Script execution log
- BFF logs → standard Next.js console
- Stuck emails → `Mail_Queue` rows in `PROCESSING`
- Auth issues → `Portal_Accesos`
- HMAC errors → check secret parity + clock skew (5-min window)
- Connectivity smoke check → `curl localhost:3000/api/health`, `curl localhost:3000/api/test-gas`
