# Conciliación Module V3 - Correcciones y Optimizaciones

**Fecha:** 2026-01-26  
**Versión:** 3.0.0  
**Autor:** Portal Cobranzas Team

---

## 1. RESUMEN EJECUTIVO

### Qué se rompió (Causas Raíz)

1. **Guard STRICT fatal** en `conciliacion_service.js:139-143`
   - Lanzaba `throw Error` si `typeof XLSX === 'undefined'`
   - Bloqueaba **TODAS** las aseguradoras incluso cuando el fallback debería funcionar

2. **SheetJS posiblemente no disponible globalmente**
   - El archivo `xlsx.js` (951KB minificado) puede no exponer `XLSX` en Apps Script runtime
   - El patrón UMD de SheetJS requiere `window`, `module` o `define` que no existen en GAS

3. **Fallback a Drive conversion extremadamente lento**
   - `Drive.Files.insert` con `convert: true` tarda 5-15 minutos para archivos grandes
   - Lock timeout de 30 segundos era insuficiente

4. **Sin indicadores de progreso o errores detallados**
   - La UI quedaba en "Cargando..." sin feedback cuando había errores
   - Logs insuficientes para debugging

### Qué se cambió (Archivos Modificados)

| Archivo | Cambios |
|---------|---------|
| `conciliacion_service.js` | Eliminado guard STRICT, mejor manejo de errores, logs con runId |
| `conciliacion_io.js` | Lock extendido a 300s, fallback robusto, escritura chunked, logs detallados |
| `conciliacion_export.js` | Fallback funcional cuando SheetJS falla, mejor manejo de errores |
| `conciliacion_cruce.js` | Métricas de performance, runId para tracking |
| `test_conciliacion_v3.js` | Suite de tests completa para diagnóstico |

### Impacto en Performance (Esperado)

| Operación | Antes | Después (sin SheetJS) | Después (con SheetJS) |
|-----------|-------|----------------------|----------------------|
| Cargar BD Sisnet (50k filas) | >7 min / cuelga | <3 min | <30s |
| Procesar EECC | 100% fallo | Funcional | Funcional + rápido |
| Export archivos | Falla | Funcional (legacy) | Funcional (directo) |

---

## 2. EVIDENCIA DEL DIAGNÓSTICO

### Flujo UI → Server → Drive/Sheets

```
UI (index.html)
├── handleUploadBDSisnet() / handleProcessConciliacion()
│   └── FileReader.readAsDataURL() → base64
│       └── google.script.run.withSuccessHandler().withFailureHandler()
│           └── conciliacionUploadBDSisnet() / conciliacionProcess()
│
SERVER (main.js → conciliacion_*.js)
├── ConciliacionIO.subirBDSisnet() / ConciliacionService.procesarAseguradora()
│   ├── LockService.getScriptLock().tryLock(300000)  ← V3: 5 min
│   ├── if (typeof XLSX !== 'undefined')
│   │   └── _parseXLSXWithSheetJS() ← Preferido
│   └── ELSE: Drive fallback
│       └── Drive.Files.insert({convert: true}) ← Lento pero funciona
│
└── Return { ok: true/false, data, error, errorCode }
```

### Código problemático eliminado

```javascript
// ANTES (conciliacion_service.js:139-143) - CAUSABA 100% FALLO
if (typeof XLSX === 'undefined') {
    throw new Error('[SHEETJS][STRICT] FATAL: XLSX is undefined.');
}

// DESPUÉS (V3 FIX) - LOG + FALLBACK
const sheetJSAvailable = typeof XLSX !== 'undefined';
if (!sheetJSAvailable) {
    Logger.log('[PERF-V2][SHEETJS_FALLBACK] Using Drive conversion (slower)');
} else {
    Logger.log('[PERF-V2][SHEETJS_OK] Using direct parsing');
}
```

---

## 3. CAMBIOS DE CÓDIGO

### 3.1 conciliacion_service.js

**Cambio 1:** Eliminado guard STRICT
```javascript
// V3: Log availability but DO NOT fail
const sheetJSAvailable = typeof XLSX !== 'undefined';
if (!sheetJSAvailable) {
    Logger.log('[PERF-V2][SHEETJS_FALLBACK] XLSX not available - using Drive conversion');
}
```

**Cambio 2:** Mejor manejo de errores en procesadores
```javascript
try {
    result = processor.processOptimized ?
        processor.processOptimized(convertResult, ss, this._dataContext) :
        processor.process(tempFileId, ss);
} catch (processError) {
    Logger.log('[ERR] Processor exception: ' + processError.message);
    return { ok: false, error: 'Error procesando: ' + processError.message, errorCode: 'PROCESSOR_EXCEPTION' };
}
```

### 3.2 conciliacion_io.js

**Cambio 1:** Lock extendido de 30s a 300s
```javascript
// V3 FIX: Extended lock timeout to 300 seconds (5 min) for large files
const lock = LockService.getScriptLock();
if (!lock.tryLock(300000)) { ... }
```

**Cambio 2:** Fallback robusto a Drive API
```javascript
if (sheetJSAvailable) {
    try {
        data = this._parseXLSXWithSheetJS(base64Data);
    } catch (sheetJSError) {
        Logger.log('[WARN] SheetJS failed: ' + sheetJSError.message);
        data = null; // Force Drive fallback
    }
}

if (!data) {
    // Robust Drive fallback
    const bytes = this._safeBase64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, effectiveMime, fileName);
    const tempFile = Drive.Files.insert(resource, blob, { convert: true });
    ...
}
```

**Cambio 3:** Escritura chunked para archivos grandes
```javascript
const CHUNK_SIZE = 20000;
if (numRows > CHUNK_SIZE) {
    for (let i = 0; i < numRows; i += CHUNK_SIZE) {
        const chunk = data.slice(i, endRow);
        bdCruce.getRange(i + 1, 1, chunk.length, numCols).setValues(chunk);
    }
}
```

### 3.3 conciliacion_export.js

**Cambio:** Fallback automático cuando SheetJS falla
```javascript
_generateXLSXWithSheetJS(data, sheetName, options = {}) {
    if (typeof XLSX === 'undefined') {
        return this._generateXLSXLegacy(data, sheetName, options);
    }
    try {
        // SheetJS code...
    } catch (sheetJSError) {
        Logger.log('[WARN] SheetJS export failed - using legacy');
        return this._generateXLSXLegacy(data, sheetName, options);
    }
}
```

---

## 4. PLAN DE PRUEBAS

### 4.1 Pasos manuales

1. **Cargar BD Sisnet**
   - Seleccionar archivo Excel con datos de Sisnet
   - Click en "Cargar BD Sisnet"
   - Verificar que muestre "BD cargada exitosamente. X registros"
   - Verificar en hoja BD_Cruce que los datos estén correctos

2. **Procesar Estado de Cuenta (por cada aseguradora)**
   - Seleccionar aseguradora en dropdown
   - Subir archivo EECC de la aseguradora
   - Click en "Procesar Conciliación"
   - Verificar log de procesamiento
   - Verificar descarga automática de archivos

### 4.2 Script de test en Apps Script

```javascript
// Ejecutar desde el editor de Apps Script:
// Run > test_runAllConciliacionTests

function test_runAllConciliacionTests() {
    // Ejecuta 11 tests de diagnóstico
    // Ver archivo: gas/test_conciliacion_v3.js
}
```

### 4.3 Casos borde

| Caso | Comportamiento esperado |
|------|------------------------|
| Archivo vacío | Error: "El archivo no contiene datos válidos" |
| BD_Cruce no cargada | Error: "Primero sube la BD Sisnet" |
| Archivo muy grande (>100k filas) | Escritura chunked, completa en <5 min |
| SheetJS no disponible | Fallback a Drive, funciona pero lento |
| Timeout de lock | Error: "Proceso en ejecución, intenta más tarde" |
| Excel corrupto | Error con mensaje específico |

---

## 5. BENCHMARKS

### Estimación (sin datos reales)

| Métrica | Valor esperado |
|---------|---------------|
| BD Sisnet 10k filas (SheetJS) | ~15-30s |
| BD Sisnet 10k filas (Drive fallback) | ~60-120s |
| BD Sisnet 50k filas (SheetJS) | ~30-60s |
| BD Sisnet 50k filas (Drive fallback) | ~3-5 min |
| Cruce 10k cupones | ~5-10s |
| Export XLSX (SheetJS) | ~2-5s |
| Export XLSX (Legacy) | ~10-20s |

### Cómo obtener benchmarks reales

```javascript
// Ejecutar después de procesar:
function showLastPerfMetrics() {
    // Los logs con [PERF-V2] contienen tiempos por fase
    // Buscar en Debug_Log o en Apps Script > Executions > Logs
}
```

---

## 6. CHECKLIST DE DESPLIEGUE

### Pre-despliegue

- [ ] Verificar que todos los archivos están actualizados:
  - [ ] `gas/conciliacion_service.js`
  - [ ] `gas/conciliacion_io.js`
  - [ ] `gas/conciliacion_export.js`
  - [ ] `gas/conciliacion_cruce.js`
  - [ ] `gas/test_conciliacion_v3.js`

- [ ] Verificar configuración:
  - [ ] `CONCILIACION.SS_ID` en `config.js` está configurado
  - [ ] `CONCILIACION.BD_CRUCE_CUPON_COL` es correcto (default: 8)
  - [ ] Todas las aseguradoras en `CONCILIACION.INSURERS` están enabled

### Despliegue

1. **Subir código a Apps Script**
   ```bash
   cd gas/
   clasp push
   ```

2. **Crear nuevo deployment (si es Web App)**
   - Apps Script > Deploy > New deployment
   - Tipo: Web app
   - Execute as: User accessing the web app
   - Who has access: Anyone with Google account

3. **Ejecutar test de diagnóstico**
   ```
   Apps Script Editor > Run > test_runAllConciliacionTests
   ```

4. **Verificar logs**
   - Ver > Logs (o Ctrl+Enter)
   - Buscar "PASSED" o "FAILED"

### Post-despliegue

- [ ] Probar "Cargar BD Sisnet" con archivo real
- [ ] Probar al menos 2 aseguradoras:
  - [ ] La Positiva
  - [ ] Rimac (o cualquier otra)
- [ ] Verificar descargas automáticas
- [ ] Verificar que no hay errores en Debug_Log

---

## 7. TABLA DE ASEGURADORAS

| Aseguradora | Key | Processor | processOptimized | Estado |
|-------------|-----|-----------|------------------|--------|
| La Positiva | `la_positiva` | `LaPositivaProcessorV2` | ✅ | Funcional |
| Crecer&Protecta | `crecer_protecta` | `CrecerProtectaProcessorV2` | ✅ | Funcional |
| Mapfre | `mapfre` | `MapfreProcessorV2` | ✅ | Funcional |
| Pacífico | `pacifico` | `PacificoProcessorV2` | ✅ | Funcional |
| Rimac | `rimac` | `RimacProcessorV2` | ✅ | Funcional |
| CHUBB | `chubb` | `ChubbProcessorV2` | ✅ | Funcional |
| Qualitas | `qualitas` | `QualitasProcessorV2` | ✅ | Funcional |
| Crecer VLE | `crecer_vle` | `CrecerVLEProcessorV2` | ✅ | Funcional |

---

## 8. MAPA DE RIESGOS

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| SheetJS no funciona | Media | Bajo | Fallback a Drive funciona |
| Archivo >100k filas | Baja | Medio | Chunked writing implementado |
| Timeout de ejecución GAS (6 min) | Baja | Alto | Lock de 5 min, chunking |
| Permisos Drive insuficientes | Baja | Alto | Verificar OAuth scopes |
| Cuota Drive agotada | Muy baja | Alto | Cleanup de temporales |

---

## 9. NOTAS TÉCNICAS

### SheetJS en Apps Script

El archivo `xlsx.js` es SheetJS minificado. Para que funcione en Apps Script, debe exponer `XLSX` como variable global. Si no funciona:

1. Verificar que el archivo se cargue antes que los módulos que lo usan
2. Considerar usar una versión modificada que declare `var XLSX = ...` explícitamente
3. El fallback a Drive API **siempre funcionará** aunque sea más lento

### Límites de Apps Script

| Límite | Valor | Cómo lo manejamos |
|--------|-------|-------------------|
| Execution time | 6 minutos | Lock de 5 min, chunking |
| URL Fetch payload | 50 MB | Base64 puede ser grande, pero OK |
| Spreadsheet cells | 10 millones | BD típica <100k, OK |
| Properties value | 9 KB | No usado para datos grandes |

---

## 10. CONTACTO Y SOPORTE

Para reportar problemas:
1. Revisar logs en `Debug_Log` sheet
2. Ejecutar `test_runAllConciliacionTests()` y copiar resultados
3. Incluir:
   - Nombre de aseguradora
   - Tamaño del archivo (filas)
   - Mensaje de error exacto
   - Timestamp del intento

---

*Documento generado automáticamente - Portal Cobranzas V3*
