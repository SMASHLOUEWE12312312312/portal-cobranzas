# Portal de Cobranzas - Vercel BFF

> Sistema de gestión de cobranzas y Estados de Cuenta para Transperuana Corredores de Seguros S.A.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (Browser)                               │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Next.js 16 + BFF)                            │
│  ┌───────────────────────┐    ┌──────────────────────────────────────────┐  │
│  │   UI Pages (App)      │    │   API Routes (BFF)                       │  │
│  │   /dashboard          │    │   /api/auth/*          HMAC-SHA256       │  │
│  │   /actualizar         │◄──►│   /api/dashboard/*     signed POST       │  │
│  │   /generar            │    │   /api/base/*          to GAS            │  │
│  │   /enviar             │    │   /api/eecc/*                            │  │
│  │   /bitacora           │    │   /api/mail/*                            │  │
│  │   /conciliacion       │    │   /api/bitacora/*                        │  │
│  └───────────────────────┘    │   /api/conciliacion/*                    │  │
│                               └──────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ HMAC-authenticated POST
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOOGLE APPS SCRIPT (Backend + Business Logic)             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │   doPost (API Router)                                                 │   │
│  │   ├── Auth actions: login, logout, validateSession                   │   │
│  │   ├── Dashboard: getDashboardStats, getMailQueueHealth               │   │
│  │   ├── Base: subirArchivoBase                                         │   │
│  │   ├── EECC: getAsegurados*, preview*, generate*, createZip           │   │
│  │   ├── Mail: templates, send*, queue*, test                           │   │
│  │   ├── Bitácora: resumen, gestiones, registrar                        │   │
│  │   └── Conciliación: status, insurers, upload, process                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                    ┌─────────────────┼─────────────────┐                    │
│                    ▼                 ▼                 ▼                    │
│              Google Sheets     Google Drive      Gmail API                  │
│              (BD, Bitácora)    (PDFs, ZIPs)      (EECC Emails)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Módulos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/dashboard` | Vista general, stats, accesos rápidos, Power BI |
| Actualizar | `/actualizar` | Upload de Excel/CSV para actualizar BD |
| Generar | `/generar` | Generación de EECC (PDF/XLSX) por asegurado o grupo |
| Enviar | `/enviar` | Envío masivo de EECC por correo |
| Bitácora | `/bitacora` | Gestión de ciclos de cobranza, seguimiento |
| Conciliación | `/conciliacion` | Cruce EECC vs BD Sisnet por aseguradora |

## Desarrollo Local

### Requisitos

- Node.js 18+
- npm 9+

### Instalación

```bash
cd web
npm install
```

### Variables de Entorno

Crear `web/.env.local`:

```env
# URL del deployment GAS (API BFF)
GAS_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec

# Secreto compartido BFF↔GAS (mínimo 32 caracteres)
BFF_SHARED_SECRET=your-super-secret-key-min-32-chars

# Secreto para firma de JWT cookies (mínimo 32 caracteres)
SESSION_SECRET=another-super-secret-key-min-32-chars

# Opcional: modo desarrollo
NODE_ENV=development
```

### Ejecución

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Iniciar producción
npm start

# Linting
npm run lint
```

## Deployment Paralelo

### ⚠️ IMPORTANTE: No tocar el deployment existente

El Web App actual de Apps Script debe seguir operativo. Este deployment es **paralelo** e independiente.

### Paso 1: Crear nuevo deployment en Apps Script

1. Abrir el proyecto en Apps Script Editor
2. **Implementar → Nueva implementación**
3. Configurar:
   - Tipo: **Web app**
   - Descripción: `API BFF v2.0`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona** (HMAC valida internamente)
4. **Implementar** → Copiar la URL del deployment

### Paso 2: Configurar Script Properties en GAS

En Apps Script, ir a **Configuración del proyecto → Propiedades de script**:

| Propiedad | Valor |
|-----------|-------|
| `BFF_SHARED_SECRET` | Mismo valor que en Vercel |
| `ENFORCE_BFF_AUTH` | `true` |

### Paso 3: Deploy en Vercel

#### Opción A: CLI

```bash
cd web
npm i -g vercel
vercel login
vercel --prod
```

#### Opción B: GitHub Integration

1. Conectar repositorio a Vercel
2. Configurar variables de entorno en Vercel Dashboard
3. Deploy automático en push a main

### Variables de entorno en Vercel

| Variable | Descripción |
|----------|-------------|
| `GAS_BASE_URL` | URL del nuevo deployment GAS (termina en `/exec`) |
| `BFF_SHARED_SECRET` | Secreto compartido (min 32 chars) |
| `SESSION_SECRET` | Secreto JWT (min 32 chars) |

## Seguridad

### Autenticación

1. **Login**: Usuario envía credenciales → BFF → GAS valida → BFF crea JWT cookie
2. **Sesión**: JWT httpOnly + Secure + SameSite=Strict
3. **GAS Token**: Almacenado en servidor, nunca expuesto al cliente

### Autorización (RBAC)

Roles disponibles: `ADMIN`, `COBRANZAS`, `SUPERVISOR`, `LECTURA`, `COMERCIAL`, `RRHH`

| Permiso | Descripción |
|---------|-------------|
| `BITACORA:READ/WRITE` | Ver/editar bitácora |
| `EECC:READ/GENERATE` | Ver/generar EECC |
| `MAIL:READ/SEND` | Ver cola/enviar correos |
| `BASE:READ/WRITE` | Ver/actualizar BD |
| `CONCILIACION:*` | Operaciones de conciliación |
| `DASHBOARD:READ` | Ver dashboard |

### HMAC Signing

Todas las llamadas BFF→GAS usan HMAC-SHA256:

```typescript
const payload = JSON.stringify({ action, params, timestamp, nonce });
const signature = createHmac('sha256', BFF_SHARED_SECRET).update(payload).digest('hex');
```

## Tests

### Verificar conectividad

```bash
# Health check
curl http://localhost:3000/api/health

# Test GAS connection
curl http://localhost:3000/api/test-gas
```

### Smoke Test

```bash
npm run test
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

## Matriz de Paridad

Ver `MATRIZ_PARIDAD_BFF.md` para el mapeo completo:

| UI | BFF Endpoint | GAS Action |
|----|--------------|------------|
| Dashboard stats | GET /api/dashboard/stats | getDashboardStats |
| Upload base | POST /api/base/upload | subirArchivoBase |
| Lista asegurados | GET /api/eecc/asegurados | getAseguradosSafe |
| Preview EECC | POST /api/eecc/preview | previewAsegurado |
| Generar EECC | POST /api/eecc/generate | generateForAsegurado_API |
| Enviar emails | POST /api/mail/send | sendEmailsNow |
| Lista bitácora | GET /api/bitacora | getBitacoraResumen |
| Nueva gestión | POST /api/bitacora | registrarGestionManualBitacora |
| Status conciliación | GET /api/conciliacion/status | conciliacion.getStatus |
| Procesar cruce | POST /api/conciliacion/process | conciliacion.process |

## Troubleshooting

### Error HMAC_INVALID

1. Verificar que `BFF_SHARED_SECRET` coincide en Vercel y GAS Script Properties
2. Verificar sincronización de reloj (timestamp validation)

### Error de sesión

1. Verificar `SESSION_SECRET` configurado
2. Limpiar cookies del navegador

### GAS timeout

Algunas operaciones (generación masiva, conciliación) pueden tardar. Los endpoints BFF tienen timeouts extendidos configurados.

## Licencia

Propiedad de Transperuana Corredores de Seguros S.A. © 2026
