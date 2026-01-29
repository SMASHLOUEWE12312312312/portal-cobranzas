# MATRIZ DE PARIDAD 1:1 - Portal Cobranzas

## Apps Script (Referencia) vs Next.js (Vercel)

**Fecha**: 2026-01-29
**Objetivo**: Garantizar paridad 100% funcional

---

## 1. DASHBOARD

| Elemento | Apps Script | Next.js | Estado | Prioridad |
|----------|-------------|---------|--------|-----------|
| Power BI Embebido | ✅ Colapsable con iframe | ✅ Implementado | ✅ OK | - |
| Métricas del Sistema | ✅ EECC Hoy/Semana, Mail, Cola, Errores | ✅ Implementado | ⚠️ Verificar carga | Alta |
| Estado Cola Correos | ✅ Panel expandible con detalles | ✅ Implementado | ⚠️ Verificar carga | Alta |
| Accesos Directos | ✅ 5 cards clickeables | ✅ Implementado | ✅ OK | - |
| Registro Actividad | ✅ Log de actividad reciente | ❌ No implementado | ❌ Faltante | Media |
| Notificaciones | ✅ Campana con badge | ⚠️ Parcial (sin panel) | ❌ Incompleto | Media |

---

## 2. ACTUALIZAR BASE

| Elemento | Apps Script | Next.js | Estado | Prioridad |
|----------|-------------|---------|--------|-----------|
| Upload archivo | ✅ Excel/CSV | ✅ Implementado | ✅ OK | - |
| Flag encabezados | ✅ Checkbox | ✅ Implementado | ✅ OK | - |
| Deduplicación CUPÓN | ✅ Automática | ✅ Backend GAS | ✅ OK | - |
| Log de progreso | ✅ Status con detalles | ⚠️ Básico | ⚠️ Mejorable | Baja |

---

## 3. GENERAR EECC

| Elemento | Apps Script | Next.js | Estado | Prioridad |
|----------|-------------|---------|--------|-----------|
| Modo Asegurado/Grupo | ✅ Radio buttons | ✅ Implementado | ✅ OK | - |
| Autocomplete asegurados | ✅ Con contador y búsqueda | ✅ Implementado | ⚠️ Verificar carga | Alta |
| Selector de grupos | ✅ Dropdown | ✅ Implementado | ⚠️ Verificar carga | Alta |
| Preview de datos | ✅ Tabla con conteo | ✅ Implementado | ✅ OK | - |
| OBS + RAM selector | ✅ Toggle + multi-select | ⚠️ Solo toggle | ⚠️ Falta RAM | Media |
| Formato export | ✅ PDF/XLSX/Both | ✅ Implementado | ✅ OK | - |
| Archivos generados | ✅ Panel colapsable + ZIP | ✅ Panel básico | ⚠️ Falta ZIP | Media |

---

## 4. ENVIAR CORREOS

| Elemento | Apps Script | Next.js | Estado | Prioridad |
|----------|-------------|---------|--------|-----------|
| Wizard 3 pasos | ✅ Tabs: Seleccionar→Configurar→Revisar | ✅ Implementado | ✅ OK | - |
| Lista asegurados | ✅ Con búsqueda y selección | ✅ Implementado | ⚠️ Verificar carga | Alta |
| Seleccionar todos | ✅ Botón | ✅ Implementado | ✅ OK | - |
| Templates | ✅ Selector | ✅ Implementado | ⚠️ Verificar carga | Alta |
| Adjuntar PDF/XLSX | ✅ Checkboxes | ✅ Implementado | ✅ OK | - |
| Queue Health | ✅ Panel con estado | ✅ Implementado | ⚠️ Verificar carga | Alta |
| Envío de prueba | ✅ Botón test | ✅ Implementado | ✅ OK | - |
| Progreso envío | ✅ Con detalles | ✅ Básico | ✅ OK | - |

---

## 5. BITÁCORA

| Elemento | Apps Script | Next.js | Estado | Prioridad |
|----------|-------------|---------|--------|-----------|
| Tabs Estado/Registrar | ✅ 2 tabs | ❌ Sin tabs | ❌ Diferente | Alta |
| KPIs Panel | ✅ 5 cards clickeables (Hoy, 1-3d, 4-7d, Vencidos, +60d) | ❌ No implementado | ❌ Faltante | Alta |
| Búsqueda global | ✅ Input con atajo "/" | ❌ Solo filtro nombre | ❌ Incompleto | Alta |
| Quick Actions | ✅ 5 botones rápidos | ❌ No implementado | ❌ Faltante | Media |
| Filtros rápidos | ✅ 5 chips (vencidos, deuda, críticos, etc) | ❌ No implementado | ❌ Faltante | Media |
| Filtros avanzados | ✅ Asegurado, Estado, Responsable, Antigüedad | ✅ 4 filtros | ✅ OK | - |
| Tabla ciclos | ✅ Con estado visual, días, montos | ✅ Implementado | ⚠️ Faltan columnas | Media |
| Detalle ciclo | ✅ Timeline de gestiones | ⚠️ Lista básica | ⚠️ Mejorable | Media |
| Registrar gestión | ✅ Formulario embebido con validaciones | ✅ Modal/form | ⚠️ Verificar campos | Alta |
| Export CSV | ✅ Botón | ❌ No implementado | ❌ Faltante | Media |

---

## 6. CONCILIACIÓN

| Elemento | Apps Script | Next.js | Estado | Prioridad |
|----------|-------------|---------|--------|-----------|
| Estado BD Cruce | ✅ 3 stats (Estado, Registros, Fecha) | ✅ 2 stats | ⚠️ Parcial | Media |
| Paso 1: BD Sisnet | ✅ Upload con instrucciones | ✅ Implementado | ✅ OK | - |
| Paso 2: Procesar | ✅ Select aseguradora + upload | ✅ Implementado | ✅ OK | - |
| Lista aseguradoras | ✅ 8 opciones hardcoded | ⚠️ API dinámico | ⚠️ Verificar | Media |
| Log procesamiento | ✅ Panel de log | ⚠️ No visible | ❌ Faltante | Media |
| Resultados | ✅ 3 stats (Registrados, Validar, No registrados) | ⚠️ Básico | ⚠️ Mejorable | Media |

---

## 7. ELEMENTOS GLOBALES

| Elemento | Apps Script | Next.js | Estado | Prioridad |
|----------|-------------|---------|--------|-----------|
| Sidebar | ✅ 6 items + logo + user | ✅ Similar | ⚠️ /admin 404 | Crítica |
| Topbar | ✅ Título + notificaciones + dark mode | ✅ Título + notif | ⚠️ Sin dark mode | Baja |
| Footer | ✅ Copyright + versión | ❌ No hay | ❌ Faltante | Baja |
| Loading overlay | ✅ Spinner global | ⚠️ Parcial | ⚠️ Mejorable | Baja |
| Logout | ✅ Botón en sidebar | ✅ Implementado | ✅ OK | - |

---

## RESUMEN DE PRIORIDADES

### CRÍTICAS (Bloquean uso)
1. ~~Errores 404 /admin~~ → Código local OK, falta deploy Vercel
2. Datos no cargan en Vercel → GAS_BASE_URL incorrecta

### ALTA (Funcionalidad core)
1. Bitácora: Falta tabs, KPIs, búsqueda global
2. Verificar carga de datos en todos los módulos

### MEDIA (Mejoras UX)
1. Quick actions y filtros rápidos en Bitácora
2. RAM selector en Generar EECC
3. Export CSV en Bitácora
4. Log de procesamiento en Conciliación

### BAJA (Nice to have)
1. Registro de actividad en Dashboard
2. Dark mode toggle
3. Footer con versión

---

## ACCIONES INMEDIATAS

1. **Verificar que Vercel desplegó** el commit `48d6186`
2. **Verificar GAS_BASE_URL** en Vercel
3. **Corregir diferencias críticas** en código
4. **Push y verificar** funcionamiento
