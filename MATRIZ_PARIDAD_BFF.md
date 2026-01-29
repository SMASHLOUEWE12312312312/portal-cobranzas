# MATRIZ DE PARIDAD - Portal Cobranzas Vercel Migration

> **Fecha**: 2026-01-29
> **Versión**: 1.0.0
> **Objetivo**: Contrato de no regresión BFF ↔ GAS

## Arquitectura Final

```
Browser → Vercel (Next.js UI) → Next.js API Routes (BFF) → POST a GAS doPost (HMAC) → Lógica GAS
```

---

## 1. MÓDULO: AUTHENTICATION

| Funcionalidad | Endpoint BFF | Acción GAS | Función GAS | UI Page/Component |
|---------------|--------------|------------|-------------|-------------------|
| Login usuario | POST /api/auth/login | login | loginPassword(username, password) | /login |
| Logout | POST /api/auth/logout | logout | AuthService.logout(token) | Button en sidebar |
| Validar sesión | GET /api/auth/session | validateSession | AuthService.validateSession(token) | middleware.ts |
| Ping/Health | GET /api/health | ping | ping() | - |
| Test GAS connection | GET /api/test-gas | ping | ping() | Debug only |

---

## 2. MÓDULO: DASHBOARD

| Funcionalidad | Endpoint BFF | Acción GAS | Función GAS | UI Page/Component |
|---------------|--------------|------------|-------------|-------------------|
| Obtener estadísticas | GET /api/dashboard/stats | getDashboardStats | getDashboardStats(token) | /dashboard - StatsGrid |
| Health de cola mail | GET /api/mail/queue-health | getMailQueueHealth | getMailQueueHealth(token) | /dashboard - QueueHealthPanel |
| System health check | GET /api/health/system | healthCheck | healthCheck(token) | Admin panel |

---

## 3. MÓDULO: ACTUALIZAR BASE

| Funcionalidad | Endpoint BFF | Acción GAS | Función GAS | UI Page/Component |
|---------------|--------------|------------|-------------|-------------------|
| Subir archivo Excel/CSV | POST /api/base/upload | subirArchivoBase | subirArchivoBase(payload, token) | /actualizar - FileUpload |

**Payload esperado:**
```typescript
{
  dataBase64: string,
  name: string,
  mimeType: string,
  tieneEncabezado: boolean
}
```

---

## 4. MÓDULO: GENERAR EECC

| Funcionalidad | Endpoint BFF | Acción GAS | Función GAS | UI Page/Component |
|---------------|--------------|------------|-------------|-------------------|
| Listar asegurados (safe) | GET /api/eecc/asegurados | getAseguradosSafe | getAseguradosSafe(token) | /generar - Autocomplete |
| Listar asegurados (paged) | GET /api/eecc/asegurados?page=X | getAseguradosPaged | getAseguradosPaged(token, options) | /generar - Autocomplete |
| Listar grupos | GET /api/eecc/grupos | getGrupos_API | getGrupos_API(token) | /generar - GroupSelector |
| Asegurados por grupo | GET /api/eecc/grupos/[grupo] | getAseguradosPorGrupo_API | getAseguradosPorGrupo_API(grupo, token) | /generar - GroupDetail |
| Preview asegurado | POST /api/eecc/preview | previewAsegurado | previewAsegurado(asegurado, maxRows, includeObs, obsForRAM, token) | /generar - PreviewTable |
| Generar EECC individual | POST /api/eecc/generate | generateForAsegurado_API | generateForAsegurado_API(nombreAseg, opts, token) | /generar - GenerateButton |
| Generar EECC headless | POST /api/eecc/generate-headless | generateHeadless_API | generateHeadless_API(asegurado, opts, token) | /generar - BatchGenerate |
| Generar por grupo | POST /api/eecc/generate-grupo | generateByGrupo_API | generateByGrupo_API(grupo, opts, token) | /generar - GroupGenerate |
| Crear ZIP | POST /api/eecc/zip | createZip_API | createZip_API(fileUrls, zipName, token) | /generar - ZipDownload |

---

## 5. MÓDULO: ENVIAR CORREOS

| Funcionalidad | Endpoint BFF | Acción GAS | Función GAS | UI Page/Component |
|---------------|--------------|------------|-------------|-------------------|
| Obtener plantillas | GET /api/mail/templates | getMailTemplates | getMailTemplates(token) | /enviar - TemplateSelector |
| Health de cola | GET /api/mail/queue-health | getMailQueueHealth | getMailQueueHealth(token) | /enviar - QueueStatus |
| Enviar correos (sync) | POST /api/mail/send | sendEmailsNow | sendEmailsNow(items, options, token) | /enviar - SendButton |
| Enviar test | POST /api/mail/test | sendTestEmail | sendTestEmail(params, token) | /enviar - TestSendButton |
| Encolar batch | POST /api/mail/queue | queueEmailsBatch_API | queueEmailsBatch_API(items, options, token) | /enviar - BatchSend |
| Listar grupos (mail) | GET /api/mail/grupos | listGrupos | listGrupos(token) | /enviar - GroupSelector |
| Enviar por grupo | POST /api/mail/send-grupo | sendEmailsByGrupo_API | sendEmailsByGrupo_API(grupo, opts, token) | /enviar - GroupSend |
| Programar envío | POST /api/mail/schedule | scheduleJob_API | scheduleJob_API(jobData, token) | /enviar - ScheduleModal |

---

## 6. MÓDULO: BITÁCORA

| Funcionalidad | Endpoint BFF | Acción GAS | Función GAS | UI Page/Component |
|---------------|--------------|------------|-------------|-------------------|
| Resumen de ciclos | GET /api/bitacora | getBitacoraResumen | getBitacoraResumen(filtros, token, opciones) | /bitacora - CyclesTable |
| Detalle de ciclo | GET /api/bitacora/[id] | bitacoraGetGestionesPorCiclo | bitacoraGetGestionesPorCiclo(idCiclo, token) | /bitacora - CycleDetail |
| Registrar gestión | POST /api/bitacora | registrarGestionManualBitacora | registrarGestionManualBitacora(payload, token) | /bitacora - GestionForm |
| Clientes con ciclos | GET /api/bitacora/clientes | getClientesConCiclosActivos | getClientesConCiclosActivos(token) | /bitacora - AseguradoSelect |
| Último ciclo cliente | GET /api/bitacora/ultimo-ciclo/[asegurado] | getUltimoCicloPorAsegurado | getUltimoCicloPorAsegurado(asegurado, token) | /bitacora - PreFill |
| Responsables únicos | GET /api/bitacora/responsables | getResponsablesUnicos | getResponsablesUnicos(token) | /bitacora - FilterDropdown |
| Resumen ciclos v2 | GET /api/bitacora/resumen | bitacoraGetResumenCiclos | bitacoraGetResumenCiclos(token, opciones) | /bitacora - Overview |
| Gestiones por asegurado | GET /api/bitacora/asegurado/[nombre] | bitacoraGetGestionesPorAsegurado | bitacoraGetGestionesPorAsegurado(asegurado, token) | /bitacora - Timeline |
| Compromisos activos | GET /api/bitacora/compromisos | bitacoraGetCompromisosActivos | bitacoraGetCompromisosActivos(token) | /bitacora - Notifications |

---

## 7. MÓDULO: CONCILIACIÓN

| Funcionalidad | Endpoint BFF | Acción GAS | Función GAS | UI Page/Component |
|---------------|--------------|------------|-------------|-------------------|
| Listar aseguradoras | GET /api/conciliacion/insurers | conciliacion.getInsurers | ConciliacionService.getInsurers() | /conciliacion - InsurerSelect |
| Status BD Cruce | GET /api/conciliacion/status | conciliacion.getStatus | ConciliacionService.getBDCruceStatus() | /conciliacion - StatusCard |
| Subir BD Sisnet | POST /api/conciliacion/upload-bd | conciliacion.uploadBDSisnet | ConciliacionIO.subirBDSisnet(b64, name, mime) | /conciliacion - UploadBD |
| Procesar aseguradora | POST /api/conciliacion/process | conciliacion.process | ConciliacionService.procesarAseguradora(...) | /conciliacion - ProcessBtn |

---

## TIPOS GAS ACTION COMPLETOS

```typescript
export type GASAction =
  // Auth
  | 'ping'
  | 'login'
  | 'loginPassword'
  | 'logout'
  | 'validateSession'
  | 'healthCheck'
  // Dashboard
  | 'getDashboardStats'
  | 'getMailQueueHealth'
  // Base
  | 'subirArchivoBase'
  // EECC
  | 'getAseguradosSafe'
  | 'getAseguradosPaged'
  | 'getGrupos_API'
  | 'getAseguradosPorGrupo_API'
  | 'previewAsegurado'
  | 'generateForAsegurado_API'
  | 'generateHeadless_API'
  | 'generateByGrupo_API'
  | 'createZip_API'
  // Mail
  | 'getMailTemplates'
  | 'sendEmailsNow'
  | 'sendTestEmail'
  | 'queueEmailsBatch_API'
  | 'listGrupos'
  | 'sendEmailsByGrupo_API'
  | 'scheduleJob_API'
  // Bitácora
  | 'getBitacoraResumen'
  | 'bitacoraGetGestionesPorCiclo'
  | 'registrarGestionManualBitacora'
  | 'getClientesConCiclosActivos'
  | 'getUltimoCicloPorAsegurado'
  | 'getResponsablesUnicos'
  | 'bitacoraGetResumenCiclos'
  | 'bitacoraGetGestionesPorAsegurado'
  | 'bitacoraGetCompromisosActivos'
  // Conciliación
  | 'conciliacion.getInsurers'
  | 'conciliacion.getStatus'
  | 'conciliacion.uploadBDSisnet'
  | 'conciliacion.process';
```

---

## BUGS IDENTIFICADOS EN doPost (main.js)

### 1. getBitacoraResumen - Parámetros incorrectos
**Actual:**
```javascript
case 'getBitacoraResumen':
  result = getBitacoraResumen(token, params.options);
```

**Correcto:**
```javascript
case 'getBitacoraResumen':
  result = getBitacoraResumen(params.filtros || {}, token, params.opciones || {});
```

### 2. registrarGestionManualBitacora - Parámetros incorrectos
**Actual:**
```javascript
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
```

**Correcto:**
```javascript
case 'registrarGestionManualBitacora':
  result = registrarGestionManualBitacora(params.payload || params, token);
```

### 3. Acciones faltantes en doPost
El router actual no incluye muchas acciones necesarias para paridad completa.

---

## VARIABLES DE ENTORNO (Vercel)

```env
# GAS API BFF Deployment URL
GAS_BASE_URL=https://script.google.com/macros/s/{NEW_DEPLOYMENT_ID}/exec

# Shared secret for HMAC authentication (32+ chars)
BFF_SHARED_SECRET=your-super-secret-key-32-chars-minimum

# Session JWT secret (32+ chars)
SESSION_SECRET=your-session-secret-32-chars-minimum

# Optional: Debug mode
NODE_ENV=production
```

---

## RUTAS UI (App Router)

```
/                     → Redirect to /dashboard or /login
/login                → Login form
/dashboard            → Dashboard principal
/actualizar           → Actualizar base de datos
/generar              → Generar EECC
/enviar               → Enviar correos
/bitacora             → Bitácora de gestiones
/conciliacion         → Conciliación cobranzas
```

---

## CHECKLIST DE REGRESIÓN

- [ ] Login funciona con usuario válido
- [ ] Logout cierra sesión correctamente
- [ ] Dashboard muestra estadísticas
- [ ] Dashboard muestra estado de cola
- [ ] Actualizar: upload Excel funciona
- [ ] Actualizar: upload CSV funciona
- [ ] Actualizar: deduplicación por CUPÓN funciona
- [ ] Generar: lista asegurados se carga
- [ ] Generar: preview muestra datos correctos
- [ ] Generar: genera PDF correctamente
- [ ] Generar: genera XLSX correctamente
- [ ] Generar: ZIP múltiples archivos funciona
- [ ] Enviar: lista plantillas disponibles
- [ ] Enviar: test email funciona
- [ ] Enviar: envío real funciona
- [ ] Enviar: progreso se muestra
- [ ] Bitácora: resumen de ciclos carga
- [ ] Bitácora: detalle de ciclo muestra gestiones
- [ ] Bitácora: registrar gestión funciona
- [ ] Bitácora: filtros funcionan
- [ ] Bitácora: paginación funciona
- [ ] Conciliación: status BD Cruce
- [ ] Conciliación: upload BD Sisnet
- [ ] Conciliación: procesar aseguradora
- [ ] Conciliación: resultados se muestran
