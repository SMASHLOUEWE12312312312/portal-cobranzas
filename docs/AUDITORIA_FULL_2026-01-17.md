# Auditoría Completa - Portal de Cobranzas
**Fecha:** 2026-01-17
**Versión:** 1.0.0
**Autor:** Equipo de Auditoría
**Estado:** En Revisión

---

## 1. Executive Summary

### Resumen del Sistema
El Portal de Cobranzas es una aplicación web de gestión de cobros construida sobre:
- **Backend:** Google Apps Script (GAS) Web App como API
- **Frontend/BFF:** Next.js 14 con TypeScript
- **Almacenamiento:** Google Sheets (BD), Google Drive (archivos)
- **Autenticación:** JWT (jose) + HMAC-SHA256 BFF-to-GAS

### Métricas Operativas
| Métrica | Valor |
|---------|-------|
| Usuarios activos | 7 |
| Asegurados registrados | ~600 |
| EECC generados/mes | ~400 |
| Correos enviados/mes | ~400 |

### Puntaje General de Arquitectura

| Categoría | Puntaje | Comentario |
|-----------|---------|------------|
| Seguridad | 7.5/10 | RBAC sólido, BFF firmado, rate limiting; token en queue pendiente |
| Mantenibilidad | 8/10 | Código modular, feature flags, test suites por fase |
| Rendimiento | 7/10 | Cache implementado, optimización Fase 5 activa |
| Observabilidad | 8/10 | Bitácora, audit logging, PerformanceMonitor |
| Escalabilidad | 6/10 | Limitado por Google Sheets (~100K filas) |

### Top 5 Riesgos Críticos

| # | Riesgo | Severidad | Archivo:Línea |
|---|--------|-----------|---------------|
| 1 | Token almacenado en Mail_Queue | HIGH | `gas/mail_queue_service.js:62` |
| 2 | BFF secret passthrough si vacío | HIGH | `gas/config.js:644-648` |
| 3 | Rate limiting "fail open" | MEDIUM | `gas/auth.js:79-85` |
| 4 | Admin role por username prefix | MEDIUM | `gas/portal_api.js:506-507` |
| 5 | ALERTS.ADMIN_EMAILS vacío | MEDIUM | `gas/config.js:305-307` |

---

## 2. Mapa del Sistema End-to-End

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            ARQUITECTURA PORTAL COBRANZAS                      │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     HTTPS/JWT      ┌─────────────────────────────────────────┐
│                 │◀──────────────────▶│           NEXT.JS BFF (web/)            │
│    Browser      │                    │  ┌─────────────────────────────────────┐│
│    (Usuario)    │                    │  │ middleware.ts (JWT validation)      ││
│                 │                    │  │ lib/rbac.ts (deny-by-default)       ││
└─────────────────┘                    │  │ lib/session.ts (cookie management)  ││
                                       │  │ lib/gas-client.ts (HMAC signer)     ││
                                       │  └─────────────────────────────────────┘│
                                       └────────────────┬────────────────────────┘
                                                        │
                                                        │ HMAC-SHA256 signed
                                                        │ { payload, signature }
                                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         GOOGLE APPS SCRIPT (gas/)                             │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                           config.js (Central Hub)                       │  │
│  │  - CONFIG object (sheets, drive, export, format, features, alerts)     │  │
│  │  - getConfig(), getSecureConfig() helpers                              │  │
│  │  - validateBffRequest_() HMAC verification                             │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   auth.js       │  │  portal_api.js  │  │   bitacora_v3.js            │  │
│  │  - login()      │  │  - doPost()     │  │  - Ciclo tracking v3.0      │  │
│  │  - sessions     │  │  - 50+ APIs     │  │  - Gestiones EECC           │  │
│  │  - rate limit   │  │  - routing      │  │  - PTP management           │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  sheets_io.js   │  │   mailer.js     │  │   mail_queue_service.js     │  │
│  │  - readSheet()  │  │  - sendEmail()  │  │  - enqueue()                │  │
│  │  - writeRows()  │  │  - templates    │  │  - processQueue()           │  │
│  │  - caching      │  │  - attachments  │  │  - trigger-based            │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│                                                                               │
│  ┌──────────── PHASE SERVICES ────────────────────────────────────────────┐  │
│  │ F1: CacheHelper, KPIService, BackupService                             │  │
│  │ F2: AlertService, PTPService, CollectionWorkflow                       │  │
│  │ F3: ReportScheduler, AutomationEngine, EmailAutomation                 │  │
│  │ F4: AnalyticsService, DashboardService, ExportService                  │  │
│  │ F5: UXHelpers, ResponseFormatter, PerformanceMonitor                   │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────┬──────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
          ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
          │  Google Sheets  │  │  Google Drive   │  │   Gmail API     │
          │  ┌───────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
          │  │ BD        │  │  │  │ Output    │  │  │  │ send()    │  │
          │  │ Bitacora  │  │  │  │ Folder    │  │  │  │ templates │  │
          │  │ Mail_Queue│  │  │  │ PDFs      │  │  │  └───────────┘  │
          │  │ Logs      │  │  │  └───────────┘  │  └─────────────────┘
          │  └───────────┘  │  └─────────────────┘
          └─────────────────┘
```

---

## 3. Matriz de Cumplimiento de Fases

### Fase 1: Fundamentos (CacheHelper, KPIService, BackupService)

| Componente | Estado | Archivo | Test | Notas |
|------------|--------|---------|------|-------|
| CacheHelper | ✅ PASS | `gas/cache_helper.js` | `runFase1Tests()` | LRU, TTL configurable |
| KPIService | ✅ PASS | `gas/kpi_service.js` | `runFase1Tests()` | Métricas cartera, cobranza |
| BackupService | ⚠️ WARN | `gas/backup_service.js` | `runFase1Tests()` | BACKUP.FOLDER_ID vacío |
| Feature Flags | ✅ PASS | `gas/config.js:247-263` | - | ENABLE_CACHE_HELPER=true |

**Verificación:** `gas/test_fase1_verification.js` - Entrypoint: `runFase1Tests()`

### Fase 2: Alertas y PTP (AlertService, PTPService, CollectionWorkflow)

| Componente | Estado | Archivo | Test | Notas |
|------------|--------|---------|------|-------|
| AlertService | ⚠️ WARN | `gas/alert_service.js` | `runFase2Tests()` | ADMIN_EMAILS vacío |
| PTPService | ✅ PASS | `gas/ptp_service.js` | `runFase2Tests()` | CRUD compromisos |
| CollectionWorkflow | ✅ PASS | `gas/collection_workflow.js` | `runFase2Tests()` | Estados transiciones |
| Feature Flags | ✅ PASS | `gas/config.js:252-256` | - | ENABLE_ALERT_SERVICE=true |

**Verificación:** `gas/test_fase2_verification.js` - Entrypoint: `runFase2Tests()`

### Fase 3: Automatización (ReportScheduler, AutomationEngine, EmailAutomation)

| Componente | Estado | Archivo | Test | Notas |
|------------|--------|---------|------|-------|
| ReportScheduler | ✅ PASS | `gas/report_scheduler.js` | `runFase3Tests()` | Reportes programados |
| AutomationEngine | ✅ PASS | `gas/automation_engine.js` | `runFase3Tests()` | Engine de reglas |
| EmailAutomation | ✅ PASS | `gas/email_automation.js` | `runFase3Tests()` | Envíos automáticos |
| Feature Flags | ✅ PASS | `gas/config.js:257-259` | - | ENABLE_SCHEDULER=true |

**Verificación:** `gas/test_fase3_verification.js` - Entrypoint: `runFase3Tests()`

### Fase 4: Analytics y Dashboard (AnalyticsService, DashboardService, ExportService)

| Componente | Estado | Archivo | Test | Notas |
|------------|--------|---------|------|-------|
| AnalyticsService | ✅ PASS | `gas/analytics_service.js` | `runFase4Tests()` | Análisis cartera |
| DashboardService | ✅ PASS | `gas/dashboard_service.js` | `runFase4Tests()` | Stats agregados |
| ExportService | ✅ PASS | `gas/export_service.js` | `runFase4Tests()` | Excel/PDF export |
| Feature Flags | ✅ PASS | `gas/config.js:260-261` | - | ENABLE_ANALYTICS=true |

**Verificación:** `gas/test_fase4_verification.js` - Entrypoint: `runFase4Tests()`

### Fase 5: UX & Optimización (UXHelpers, ResponseFormatter, PerformanceMonitor)

| Componente | Estado | Archivo | Test | Notas |
|------------|--------|---------|------|-------|
| UXHelpers | ✅ PASS | `gas/ux_helpers.js` | `runFase5Tests()` | Formateo, validación |
| ResponseFormatter | ✅ PASS | `gas/response_formatter.js` | `runFase5Tests()` | Respuestas estándar |
| PerformanceMonitor | ✅ PASS | `gas/performance_monitor.js` | `runFase5Tests()` | Métricas rendimiento |
| CACHE_OPTIMIZATION | ✅ PASS | `gas/config.js:206-220` | - | LRU, TTL por tipo |
| Feature Flags | ✅ PASS | `gas/config.js:264-266` | - | Todos habilitados |

**Verificación:** `gas/test_fase5_verification.js` - Entrypoint: `runFase5Tests()`

### Prueba de Regresión Completa

```javascript
// Ejecutar en Apps Script Editor:
runFullRegressionTests()
```
Entrypoint: `gas/test_fase5_verification.js:214`

---

## 4. Revisión por Módulo

### 4.1 Seguridad

#### 4.1.1 Autenticación (`gas/auth.js`)

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Hash de contraseñas | ✅ | PBKDF2-like con salt único `:33-34` |
| Rate limiting | ✅ | MAX_ATTEMPTS=5, LOCKOUT=15min `:9-10` |
| Timing attack prevention | ✅ | Random delay `:98-99` |
| Session cleanup | ✅ | 1 hora interval `:11` |
| Input sanitization | ✅ | Trim, lowercase, length check `:69-76` |

**Hallazgo:** El rate limit retorna mensaje genérico, pero podría registrar en audit log para análisis.

#### 4.1.2 RBAC (`web/src/lib/rbac.ts`)

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Deny-by-default | ✅ | `:107-133` `roleHasPermission()` |
| Role definitions | ✅ | 6 roles: ADMIN, COBRANZAS, SUPERVISOR, LECTURA, COMERCIAL, RRHH `:52-99` |
| Permission granularity | ✅ | 16 permisos + wildcard `:23-46` |
| Error handling | ✅ | RBACError class `:168-178` |
| API wrapper | ✅ | `withRBAC()` helper `:295-317` |

**Fortaleza:** Implementación robusta de RBAC con namespace wildcards.

#### 4.1.3 BFF Security (`gas/config.js:630-671`)

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| HMAC-SHA256 signing | ✅ | `:616-621` `computeHmac_()` |
| Anti-replay | ✅ | 5 min window `:653-657` |
| Secret validation | ⚠️ | Passthrough si vacío `:644-648` |

**Riesgo:** Si `BFF_SHARED_SECRET` no está configurado, el sistema permite passthrough sin firma.

#### 4.1.4 Middleware (`web/src/middleware.ts`)

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| JWT validation | ✅ | jose library `:47-48` |
| Security headers | ✅ | X-Frame-Options, CSP, etc `:80-96` |
| Public routes | ✅ | Whitelist explícita `:8` |

### 4.2 Servicios Core

#### 4.2.1 Mail Queue (`gas/mail_queue_service.js`)

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Estados | ✅ | PENDING/PROCESSING/SENT/FAILED/RETRY `:26-32` |
| Persistencia | ✅ | Sheet-based queue `:10` |
| Retry logic | ✅ | RETRY_COUNT tracking `:68` |
| Token en OPTIONS | ❌ | Token almacenado en JSON `:62` |

**Riesgo Crítico:** El token de sesión se almacena en `OPTIONS_JSON` (`:62`). Si alguien accede a la hoja Mail_Queue, obtiene tokens de sesión válidos.

#### 4.2.2 Bitácora v3 (`gas/bitacora_v3.js`)

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Schema v3.0 | ✅ | 18 columnas definidas |
| Ciclo tracking | ✅ | ID_CICLO, ID_GESTION |
| PTP support | ✅ | FECHA_COMPROMISO, MONTO_COMPROMISO |
| Audit trail | ✅ | ORIGEN_REGISTRO, RESPONSABLE |

### 4.3 Cache & Performance

#### 4.3.1 CacheHelper (`gas/cache_helper.js`)

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| LRU strategy | ✅ | Configurado en config.js |
| TTL by type | ✅ | KPI:300s, ALERTS:180s, etc |
| Max entries | ✅ | 100 entries limit |
| Cache invalidation | ⚠️ | Manual, no event-driven |

#### 4.3.2 PerformanceMonitor (`gas/performance_monitor.js`)

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Timer functions | ✅ | `startTimer()`, `endTimer()` `:31-84` |
| Slow detection | ✅ | 3s warn, 10s critical `:17-18` |
| Metrics aggregation | ✅ | `getStats()` `:145-216` |
| Auto cleanup | ✅ | `cleanup()` with days param `:308-331` |

---

## 5. Registro de Riesgos

### R1: Token Almacenado en Mail_Queue (HIGH)

| Campo | Valor |
|-------|-------|
| **ID** | SEC-001 |
| **Severidad** | HIGH |
| **Archivo** | `gas/mail_queue_service.js:62` |
| **Descripción** | El token de sesión se persiste en OPTIONS_JSON para procesamiento async |
| **Impacto** | Exposición de sesiones si se accede a la hoja Mail_Queue |
| **Mitigación** | Usar service account token o regenerar token en trigger |
| **Verificación** | Revisar Mail_Queue sheet por tokens, validar expiración |

### R2: BFF Secret Passthrough (HIGH)

| Campo | Valor |
|-------|-------|
| **ID** | SEC-002 |
| **Severidad** | HIGH |
| **Archivo** | `gas/config.js:644-648` |
| **Descripción** | Si BFF_SHARED_SECRET no está configurado, requests pasan sin firma |
| **Impacto** | Cualquiera con URL del deployment puede invocar APIs |
| **Mitigación** | Fallar si secret vacío en producción |
| **Verificación** | `getSecureConfig('BFF_SHARED_SECRET')` debe retornar valor |

### R3: Admin por Username Prefix (MEDIUM)

| Campo | Valor |
|-------|-------|
| **ID** | SEC-003 |
| **Severidad** | MEDIUM |
| **Archivo** | `gas/portal_api.js:506-507` |
| **Descripción** | `isAdminSession_()` verifica si username empieza con "admin" |
| **Impacto** | Usuario "admin_malicioso" tendría permisos admin |
| **Mitigación** | Usar RBAC con roles explícitos en Portal_Accesos |
| **Verificación** | Revisar usuarios en Portal_Accesos sheet |

### R4: Rate Limiting Fail Open (MEDIUM)

| Campo | Valor |
|-------|-------|
| **ID** | SEC-004 |
| **Severidad** | MEDIUM |
| **Archivo** | `gas/auth.js:79-85` |
| **Descripción** | Si `_checkRateLimit()` falla internamente, login podría continuar |
| **Impacto** | Brute force posible si rate limit falla |
| **Mitigación** | Wrap en try/catch que retorne false por defecto |
| **Verificación** | Test unitario forzando fallo en rate limit |

### R5: ALERTS.ADMIN_EMAILS Vacío (MEDIUM)

| Campo | Valor |
|-------|-------|
| **ID** | OPS-001 |
| **Severidad** | MEDIUM |
| **Archivo** | `gas/config.js:305-307` |
| **Descripción** | Array de emails admin está vacío, alertas no se envían |
| **Impacto** | Alertas críticas no notificadas |
| **Mitigación** | Configurar emails de administradores |
| **Verificación** | Verificar `CONFIG.ALERTS.ADMIN_EMAILS.length > 0` |

### R6: BACKUP.FOLDER_ID Vacío (LOW)

| Campo | Valor |
|-------|-------|
| **ID** | OPS-002 |
| **Severidad** | LOW |
| **Archivo** | `gas/config.js:326-332` |
| **Descripción** | Carpeta de backup no configurada |
| **Impacto** | Backups automáticos no funcionan |
| **Mitigación** | Crear carpeta en Drive y configurar ID |
| **Verificación** | BackupService.runBackup() debe retornar ok=true |

### R7: Logger Buffer No Garantizado (LOW)

| Campo | Valor |
|-------|-------|
| **ID** | OPS-003 |
| **Severidad** | LOW |
| **Archivo** | `gas/logger.js` |
| **Descripción** | Buffer de logs podría perderse si script termina abruptamente |
| **Impacto** | Pérdida de logs de debugging |
| **Mitigación** | Flush antes de retornar en APIs críticas |
| **Verificación** | Agregar `Logger.flush()` en finally blocks |

### R8: eval() en Tests (LOW)

| Campo | Valor |
|-------|-------|
| **ID** | SEC-005 |
| **Severidad** | LOW |
| **Archivo** | `gas/test_fase5_verification.js:154,181` |
| **Descripción** | Uso de eval() para verificar servicios definidos |
| **Impacto** | Riesgo teórico en código de test (no producción) |
| **Mitigación** | Reemplazar con typeof checks directos |
| **Verificación** | Buscar `eval(` en archivos test |

---

## 6. Scorecard de Arquitectura

### Principios de Diseño

| Principio | Puntaje | Justificación |
|-----------|---------|---------------|
| Single Responsibility | 8/10 | Módulos bien separados por dominio |
| Open/Closed | 7/10 | Feature flags permiten extensión sin modificar |
| Liskov Substitution | N/A | No aplica significativamente |
| Interface Segregation | 7/10 | APIs específicas por función |
| Dependency Inversion | 6/10 | CONFIG centralizado, pero algunos hardcodes |

### Calidad de Código

| Aspecto | Puntaje | Justificación |
|---------|---------|---------------|
| Documentación | 8/10 | JSDoc completo en mayoría de funciones |
| Naming | 8/10 | Convenciones claras (camelCase, UPPER_CASE) |
| Error Handling | 7/10 | Try/catch presente, algunos soft-fail |
| Testing | 8/10 | Test suites por fase, entry points claros |
| Code Duplication | 7/10 | Algunos patrones repetidos en APIs |

### Seguridad

| Aspecto | Puntaje | Justificación |
|---------|---------|---------------|
| Authentication | 8/10 | JWT + HMAC, rate limiting |
| Authorization | 9/10 | RBAC deny-by-default ejemplar |
| Input Validation | 7/10 | Sanitización presente, podría ser más exhaustiva |
| Secrets Management | 7/10 | PropertiesService, pero passthrough issue |
| Audit Logging | 8/10 | AuditService, Bitácora completa |

### Operaciones

| Aspecto | Puntaje | Justificación |
|---------|---------|---------------|
| Monitoring | 8/10 | MonitoringService, PerformanceMonitor |
| Alerting | 6/10 | Implementado pero ADMIN_EMAILS vacío |
| Backup | 5/10 | BackupService existe pero no configurado |
| Recovery | 6/10 | Manual, sin DR automatizado |

---

## 7. Backlog Priorizado de Mejoras

### P0 (Crítico - Implementar Inmediatamente)

| # | Mejora | Archivo | Esfuerzo |
|---|--------|---------|----------|
| P0-1 | Eliminar token de OPTIONS_JSON en Mail_Queue | `gas/mail_queue_service.js` | 4h |
| P0-2 | Fallar si BFF_SHARED_SECRET vacío en prod | `gas/config.js` | 1h |

### P1 (Alto - Esta Semana)

| # | Mejora | Archivo | Esfuerzo |
|---|--------|---------|----------|
| P1-1 | Reemplazar isAdminSession_ por RBAC | `gas/portal_api.js` | 2h |
| P1-2 | Configurar ALERTS.ADMIN_EMAILS | `gas/config.js` | 0.5h |
| P1-3 | Rate limit fail-closed | `gas/auth.js` | 1h |

### P2 (Medio - Esta Quincena)

| # | Mejora | Archivo | Esfuerzo |
|---|--------|---------|----------|
| P2-1 | Configurar BACKUP.FOLDER_ID | `gas/config.js` | 0.5h |
| P2-2 | Logger.flush() en APIs críticas | `gas/portal_api.js` | 2h |
| P2-3 | Reemplazar eval() en tests | `gas/test_*.js` | 1h |

### P3 (Bajo - Siguiente Sprint)

| # | Mejora | Archivo | Esfuerzo |
|---|--------|---------|----------|
| P3-1 | Event-driven cache invalidation | `gas/cache_helper.js` | 8h |
| P3-2 | Health check endpoint público | `gas/portal_api.js` | 2h |
| P3-3 | Métricas de uso por endpoint | `gas/monitoring_service.js` | 4h |

---

## 8. Plan de Implementación Incremental

### Semana 1: Seguridad Crítica (P0)

```markdown
Día 1-2: P0-1 - Eliminar token de Mail_Queue
  - Crear service account token para trigger
  - Modificar enqueue() para no persistir user token
  - Test: verificar Mail_Queue no contiene tokens
  - Commit: "security: remove session token from mail queue"

Día 3: P0-2 - BFF secret enforcement
  - Modificar validateBffRequest_() para fallar si secret vacío
  - Agregar flag ENFORCE_BFF_AUTH en config
  - Test: request sin firma debe retornar 401
  - Commit: "security: enforce BFF authentication"
```

### Semana 2: Mejoras Alta Prioridad (P1)

```markdown
Día 1: P1-1 - Reemplazar isAdminSession_
  - Agregar role field a Portal_Accesos
  - Modificar AuthService para retornar role
  - Actualizar isAdminSession_ para usar role
  - Test: usuario no-admin no tiene permisos admin
  - Commit: "security: replace username-based admin check with RBAC"

Día 2: P1-2 y P1-3
  - Configurar ADMIN_EMAILS con emails reales
  - Wrap rate limit en try/catch fail-closed
  - Test: alert enviado a admin, brute force bloqueado
  - Commit: "ops: configure admin emails and fix rate limit"
```

---

## 9. Checklist de Verificación Pre-Merge

### Seguridad
- [ ] `BFF_SHARED_SECRET` configurado en Script Properties
- [ ] `ADMIN_EMAILS` tiene al menos 1 email válido
- [ ] No hay tokens de sesión en Mail_Queue sheet
- [ ] Rate limiting activo y funcionando

### Funcionalidad
- [ ] `runFase1Tests()` pasa sin errores
- [ ] `runFase2Tests()` pasa sin errores
- [ ] `runFase3Tests()` pasa sin errores
- [ ] `runFase4Tests()` pasa sin errores
- [ ] `runFase5Tests()` pasa sin errores
- [ ] `runFullRegressionTests()` sin regresiones

### Configuración
- [ ] `SPREADSHEET_ID` correcto
- [ ] `DRIVE.OUTPUT_FOLDER_ID` accesible
- [ ] Feature flags de producción habilitados
- [ ] `MAIL_QUEUE_MODE` según necesidad

### Deployment
- [ ] `clasp push` exitoso
- [ ] Deployment ID actualizado si cambió
- [ ] Variables de entorno de Next.js configuradas
- [ ] Health check responde OK

---

## Apéndice A: Archivos Clave

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `gas/config.js` | 671 | Configuración central |
| `gas/portal_api.js` | ~1500 | Endpoints API |
| `gas/auth.js` | 804 | Autenticación |
| `gas/bitacora_v3.js` | 400+ | Tracking ciclos |
| `gas/mail_queue_service.js` | 384 | Cola de correos |
| `web/src/middleware.ts` | 113 | Auth middleware |
| `web/src/lib/rbac.ts` | 317 | RBAC engine |

## Apéndice B: Comandos de Verificación

```bash
# Verificar estructura
ls -la gas/*.js | wc -l  # Debe ser ~57 archivos

# Buscar tokens en código
grep -r "token" gas/*.js | grep -v "// " | head -20

# Verificar tests
grep -l "runFase.*Tests" gas/test_*.js

# Deploy
clasp push
```

## Apéndice C: Contactos

| Rol | Responsable |
|-----|-------------|
| Tech Lead | (Configurar) |
| Security | (Configurar) |
| Ops | (Configurar) |

---

*Documento generado el 2026-01-17. Próxima revisión recomendada: 2026-02-17*
