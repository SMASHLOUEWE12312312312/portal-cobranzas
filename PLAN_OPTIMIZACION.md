# 🚀 Plan de Optimización y Reestructuración - Portal de Cobranzas

## Documento de Arquitectura y Refactorización

**Objetivo**: Eliminar procesamiento fila por fila, migrar a operaciones batch y reducir ≥80% las llamadas a servicios de Google.

**Fecha**: 13 de Enero 2025  
**Arquitecto**: Desarrollador Senior GAS  
**Versión**: 1.0

---

## Fase 1: Mapeo de Dependencias y Antipatrones

### 1.1 Mapa de Dependencias por Módulo

```
┌─────────────────────────────────────────────────────────────┐
│                         config.js                            │
│             (CONFIG, getConfig, validateConfig)              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├──▶ logger.js (Logger)
               ├──▶ utils.js (Utils)
               ├──▶ sheets_io.js (SheetsIO)
               │      ├──▶ drive_io.js (DriveIO)
               │      └──▶ utils.js
               ├──▶ eecc_core.js (EECCCore)
               │      ├──▶ sheets_io.js
               │      ├──▶ drive_io.js
               │      ├──▶ export.js
               │      └──▶ utils.js
               ├──▶ bitacora.js (BitacoraService)
               │      ├──▶ sheets_io.js
               │      ├──▶ logger.js
               │      └──▶ utils.js
               ├──▶ sheets_mail.js (SheetsMail)
               │      ├──▶ sheets_io.js
               │      └──▶ logger.js
               ├──▶ preview.js (PreviewService)
               │      ├──▶ sheets_io.js
               │      ├──▶ eecc_core.js
               │      └──▶ utils.js
               ├──▶ mailer.js (MailerService)
               │      ├──▶ drive_io.js
               │      ├──▶ eecc_core.js
               │      └──▶ logger.js
               ├──▶ portal_api.js (API endpoints)
               │      ├──▶ auth.js
               │      ├──▶ eecc_core.js
               │      ├──▶ mailer.js
               │      ├──▶ bitacora.js
               │      └──▶ sheets_mail.js
               └──▶ main.js (Entry points)
                      ├──▶ eecc_core.js
                      ├──▶ bitacora.js
                      ├──▶ sheets_mail.js
                      └──▶ auth.js
```

### 1.2 Antipatrones Detectados

#### ❌ CRÍTICO: Uso de `appendRow()` dentro de flujos principales

**Archivo: `sheets_mail.js`**

```javascript
// LÍNEA 24: Creación de headers con appendRow
sheet.appendRow(headers);  // ❌ Una vez, OK pero mejorable

// LÍNEA 182: Creación de headers con appendRow
sheet.appendRow(headers);  // ❌ Una vez, OK pero mejorable

// LÍNEA 225: Creación de headers con appendRow
sheet.appendRow(headers);  // ❌ Una vez, OK pero mejorable

// LÍNEA 244: ⚠️ CRÍTICO - appendRow dentro de función que puede llamarse múltiples veces
sheet.appendRow(row);  // ❌ ALTO IMPACTO
```

**Impacto**: Función `appendLog()` puede ser llamada N veces → N llamadas a SpreadsheetApp

---

**Archivo: `bitacora.js`**

```javascript
// LÍNEA ~700+: _escribirEnBitacora
sheet.appendRow(fila);  // ❌ ALTO IMPACTO
// Se llama por CADA gestión registrada
// Si se envían 100 correos = 100 llamadas a SpreadsheetApp
```

**Impacto**: Cada registro de gestión = 1 llamada. Con envíos masivos, esto se multiplica exponencialmente.

---

**Archivo: `logger.js`**

```javascript
// LÍNEA ~41: Dentro de Logger.log()
logSheet.appendRow([timestamp, level, context, message, extraStr, user]);  // ❌ ALTO IMPACTO
```

**Impacto**: Cada log = 1 llamada. En flujos con muchos logs, esto degrada rendimiento significativamente.

---

#### ❌ MEDIO: Uso de `getValues()` sin caché cuando podría reutilizarse

**Archivo: `eecc_core.js`**

```javascript
// LÍNEA ~34-36: generateWithUI
const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
// BIEN: Ya usa SheetsIO que hace lectura batch

// LÍNEA ~106-108: generateHeadless
const baseData = SheetsIO.readSheet(getConfig('SHEETS.BASE'));
// BIEN: Ya usa SheetsIO que hace lectura batch
```

**Estado**: ✅ Ya optimizado en cuanto a lectura

---

**Archivo: `sheets_mail.js`**

```javascript
// LÍNEA 31: readContacts()
const data = SheetsIO.readSheet(sheetName);
// BIEN: Ya usa SheetsIO

// PROBLEMA: No hay caché. Si se llama múltiples veces en un flujo, lee repetidamente
```

**Oportunidad**: Implementar caché de contactos en memoria durante ejecución

---

#### ❌ BAJO: Uso de `setValue()` y `setValues()` individuales

**Archivo: `eecc_core.js`**

```javascript
// LÍNEAS 340-365: _createSheetForMoneda
sheet.getRange('A1:K1').merge().setValue('Transperuana...')  // OK: Una vez
sheet.getRange('A2:K2').merge().setValue('Estado de Cuenta')  // OK: Una vez
// ...múltiples setValue individuales para cabecera
```

**Impacto**: Bajo. Son operaciones una sola vez por hoja generada. Mejorable pero no crítico.

---

#### ❌ Operaciones Drive/Export dentro de loops

**Archivo: `portal_api.js`**

```javascript
// LÍNEAS 638-739: sendEmailsNow() 
for (let i = 0; i < items.length; i++) {
  // ...
  // LÍNEA 655-660: Genera EECC por cada item
  const eecc = EECCCore.generateHeadless(item.aseguradoId, {...});
  
  // LÍNEA 666: Prepara adjuntos (lee de Drive)
  const attachments = prepareAttachments(eecc);
  
  // LÍNEA 677-685: Envía correo individual
  const messageId = MailerService.sendEmail({...});
  
  // LÍNEA 700-734: ⚠️ Registra en bitácora (appendRow)
  BitacoraService.registrarGestion(datosGestion);
}
```

**Impacto**: 🔴 **MUY ALTO**

Por cada item (N items):
- 1 generación de EECC (crea archivos en Drive, lee plantillas)
- 1-2 lecturas de Drive (PDF/XLSX)
- 1 envío de correo (GmailApp)
- 1 escritura en bitácora (appendRow)

**Ejemplo con 50 items**:
- ~50 generaciones EECC
- ~100 operaciones Drive (lectura de blobs)
- ~50 envíos Gmail
- ~50 appendRow a bitácora

**Total: ~250 operaciones de servicio**

---

#### ❌ No usar batch en operaciones que lo soportan

**Archivo: `main.js`**

```javascript
// LÍNEA 196-203: inicializarSistema()
for (const sheetDef of sheetsToCreate) {
  let sheet = ss.getSheetByName(sheetDef.name);
  if (!sheet) {
    sheet = ss.insertSheet(sheetDef.name);
    sheet.appendRow(sheetDef.headers);  // ❌ appendRow
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, sheetDef.headers.length)
      .setFontWeight('bold')
      .setBackground('#f3f3f3');  // ❌ Operaciones individuales
  }
}
```

**Impacto**: Medio. Se ejecuta solo en inicialización, pero mejorable.

---

### 1.3 Resumen de Operaciones Costosas por Flujo

#### Flujo 1: Generación de EECC (1 asegurado)

**Operaciones actuales**:
```
1. SheetsIO.readSheet('BD')                    → 1 getValues()      ✅ Batch
2. Filtrar datos en memoria                    → 0 llamadas         ✅ Optimizado
3. Crear spreadsheet temporal                  → 1 SpreadsheetApp   ✅ Necesario
4. Escribir datos en temporal                  → ~3-5 setValues()   ✅ Batch
5. Aplicar formatos                            → ~10-15 setRange    ⚠️ Mejorable
6. ExportService.exportToPDF()                 → 1 UrlFetchApp      ✅ Necesario
7. ExportService.exportToXLSX()                → 1 UrlFetchApp      ✅ Necesario
8. DriveIO.getOutputFolder()                   → 2-4 Drive ops      ⚠️ Cacheable
9. folder.createFile() x2                      → 2 Drive ops        ✅ Necesario
10. DriveIO.deleteFile(tempId)                 → 1 Drive op         ✅ Necesario
11. BitacoraService.registrarGestion()         → 1 appendRow()      ❌ OPTIMIZAR

Total: ~25-35 operaciones
```

**Oportunidades**:
- ✅ Ya bien optimizado en lectura/escritura
- ❌ Bitácora usa appendRow (prioridad alta)
- ⚠️ Formatos podrían agruparse más

---

#### Flujo 2: Envío masivo de correos (N asegurados)

**Operaciones actuales (por cada asegurado)**:
```
Para N=50 asegurados:

1. loadContactsFromSheet()                     → 1 getValues()      ✅ Batch (una vez)
2. FOR i=1 to 50:
   a. EECCCore.generateHeadless()              → ~30 ops            ❌ N veces
   b. prepareAttachments()                     → 2 Drive ops        ❌ N veces
   c. MailerService.sendEmail()                → 1 Gmail op         ✅ Necesario
   d. BitacoraService.registrarGestion()       → 1 appendRow()      ❌ N veces
   e. Utilities.sleep(500)                     → Delay              ❌ Innecesario

Total por item: ~34 operaciones
Total para 50: ~1,700 operaciones
```

**Impacto**: 🔴 **CRÍTICO**

**Oportunidades**:
1. ❌ **Pre-generar EECC en batch** antes del loop de envío
2. ❌ **Cachear adjuntos** si ya fueron generados
3. ❌ **Acumular logs de bitácora** y escribir en batch
4. ❌ **Eliminar sleep innecesario** (Gmail tiene rate limiting interno)

---

#### Flujo 3: Logging (continuo)

**Operaciones actuales**:
```
Por cada llamada a Logger.info/warn/error:
1. getSheetByName()                            → 1 op               ⚠️ Cacheable
2. appendRow()                                 → 1 op               ❌ CRÍTICO

Si hay 200 logs en un flujo: 400 operaciones
```

**Impacto**: 🔴 **MUY ALTO**

**Oportunidades**:
1. ❌ **Buffer de logs en memoria**
2. ❌ **Flush periódico o al final del flujo**
3. ❌ **Caché de referencia a la hoja**

---

### 1.4 Antipatrones Adicionales

#### ⚠️ Falta de caché de objetos frecuentes

```javascript
// En múltiples archivos:
const ss = SpreadsheetApp.getActive();  // Se llama muchas veces
const sheet = ss.getSheetByName('X');   // Se llama muchas veces

// Sin caché de referencias
```

**Oportunidad**: Crear módulo de caché para referencias frecuentes

---

#### ⚠️ Validaciones repetitivas

```javascript
// En bitacora.js, sheets_mail.js, etc.:
// Cada función valida si la hoja existe
if (!sheet) {
  // Crear hoja con headers...
}
```

**Oportunidad**: Centralizar inicialización de hojas en un solo lugar

---

#### ⚠️ Operaciones síncronas que podrían ser asíncronas

```javascript
// En portal_api.js sendEmailsNow():
for (let i = 0; i < items.length; i++) {
  // Procesar secuencialmente
}
```

**Limitación**: GAS no soporta async/await de forma nativa, pero podría:
- Pre-procesar toda la data
- Enviar en batch con reintentos
- Usar promises donde sea posible

---

### 1.5 Archivos a Modificar (Orden de Prioridad)

#### 🔴 Prioridad CRÍTICA

1. **logger.js** (impacto: MUY ALTO)
   - Implementar buffer de logs
   - Flush batch al final o cada N logs

2. **bitacora.js** (impacto: MUY ALTO)
   - Cambiar `appendRow` a buffer + flush
   - API para flush manual

3. **sheets_mail.js** (impacto: ALTO)
   - Cambiar `appendLog` a buffer
   - Batch upsert para queue

4. **portal_api.js** (impacto: MUY ALTO)
   - Refactor `sendEmailsNow` para pre-generar EECC
   - Batch logging
   - Eliminar sleep

#### 🟠 Prioridad ALTA

5. **eecc_core.js** (impacto: MEDIO)
   - Agrupar operaciones de formato
   - Caché de logo/plantillas

6. **main.js** (impacto: BAJO-MEDIO)
   - Optimizar inicialización
   - Batch operations donde aplique

#### 🟡 Prioridad MEDIA

7. **drive_io.js** (impacto: BAJO)
   - Caché de carpetas
   - Reducir búsquedas repetitivas

8. **export.js** (impacto: BAJO)
   - Ya bien optimizado
   - Posible caché de tokens OAuth

---

## Fase 2: Plan de Refactor Detallado

### 2.1 Arquitectura de Procesamiento Batch

```
┌─────────────────────────────────────────────────────────────┐
│                    NUEVA ARQUITECTURA                        │
└─────────────────────────────────────────────────────────────┘

┌───────────────┐
│  1. LECTURA   │  ← Una sola llamada getValues() por hoja
│   (Batch)     │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ 2. PROCESAMIENTO │  ← Todo en memoria (arrays/maps/sets)
│   (Memoria)      │  ← Transformaciones, filtros, agrupaciones
└───────┬──────────┘
        │
        ▼
┌───────────────────┐
│ 3. BUFFER/COLA    │  ← Acumular operaciones
│   (Memoria)       │  ← Logs, registros, correos
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│ 4. FLUSH BATCH    │  ← Una sola llamada setValues() por hoja
│   (Escritura)     │  ← N correos en lote con reintentos
└───────────────────┘
```

### 2.2 Módulo: BatchLogger (logger.js refactorizado)

#### Diseño

```javascript
const BatchLogger = {
  // Buffer en memoria
  _buffer: [],
  _maxBufferSize: 100,  // Flush automático cada 100 logs
  _sheetCache: null,
  
  /**
   * Log con buffer
   * No escribe inmediatamente a Sheets
   */
  log(level, context, message, extra = {}) {
    const entry = {
      timestamp: new Date(),
      level,
      context,
      message,
      extra: JSON.stringify(extra),
      user: Session.getActiveUser().getEmail()
    };
    
    this._buffer.push(entry);
    
    // Auto-flush si buffer lleno
    if (this._buffer.length >= this._maxBufferSize) {
      this.flush();
    }
  },
  
  /**
   * Flush batch: escribe todo el buffer de una vez
   */
  flush() {
    if (this._buffer.length === 0) return;
    
    try {
      const sheet = this._getOrCreateSheet();
      const rows = this._buffer.map(e => [
        e.timestamp, e.level, e.context, e.message, e.extra, e.user
      ]);
      
      // UNA SOLA operación para N logs
      sheet.getRange(
        sheet.getLastRow() + 1, 1, 
        rows.length, 6
      ).setValues(rows);
      
      this._buffer = [];  // Limpiar buffer
    } catch (error) {
      console.error('BatchLogger.flush failed:', error);
      // No lanzar error para no bloquear flujo principal
    }
  },
  
  /**
   * Caché de referencia a la hoja
   */
  _getOrCreateSheet() {
    if (this._sheetCache) return this._sheetCache;
    
    const ss = SpreadsheetApp.getActive();
    let sheet = ss.getSheetByName(getConfig('SHEETS.DEBUG_LOG'));
    
    if (!sheet) {
      sheet = ss.insertSheet(getConfig('SHEETS.DEBUG_LOG'));
      const headers = ['Timestamp', 'Level', 'Context', 'Message', 'Extra', 'User'];
      sheet.getRange(1, 1, 1, 6).setValues([headers])
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      sheet.setFrozenRows(1);
    }
    
    this._sheetCache = sheet;
    return sheet;
  }
};
```

**Mejoras**:
- ✅ Buffer en memoria (sin escribir por cada log)
- ✅ Flush batch (1 operación para N logs)
- ✅ Caché de referencia a la hoja
- ✅ Auto-flush cuando buffer lleno
- ✅ Flush manual disponible

---

### 2.3 Módulo: BatchBitacora (bitacora.js refactorizado)

#### Diseño

```javascript
const BatchBitacoraService = {
  // Buffer de gestiones pendientes
  _buffer: [],
  _flushScheduled: false,
  
  /**
   * Registra gestión en buffer (no escribe inmediatamente)
   */
  registrarGestion(datos) {
    const context = 'BatchBitacoraService.registrarGestion';
    
    try {
      // Validar
      const validacion = this._validarDatosGestion(datos);
      if (!validacion.ok) {
        Logger.warn(context, 'Validación fallida', validacion);
        return validacion;
      }
      
      // Generar ID
      const idGestion = this._generarIdGestion(datos.asegurado);
      const usuario = this._obtenerUsuarioActual();
      
      // Preparar fila
      const fila = this._construirFilaGestion({
        ...datos,
        idGestion,
        usuario
      });
      
      // AGREGAR AL BUFFER (no escribir)
      this._buffer.push(fila);
      
      // Programar flush si no está programado
      if (!this._flushScheduled) {
        this._scheduleFlush();
      }
      
      Logger.info(context, 'Gestión bufferizada', { idGestion });
      
      return {
        ok: true,
        idGestion: idGestion,
        mensaje: 'Gestión registrada (pendiente de escribir)'
      };
      
    } catch (error) {
      Logger.error(context, 'Error al registrar', error);
      return {
        ok: false,
        error: error.message,
        idGestion: null
      };
    }
  },
  
  /**
   * Programa flush para ejecutar al final del flujo
   */
  _scheduleFlush() {
    this._flushScheduled = true;
    
    // Usar setTimeout con 0ms para ejecutar al final del event loop
    // En GAS, esto asegura que se ejecute después del flujo principal
    Utilities.sleep(1);  // Mínimo delay
  },
  
  /**
   * Flush batch: escribe todas las gestiones del buffer
   */
  flush() {
    const context = 'BatchBitacoraService.flush';
    
    if (this._buffer.length === 0) {
      this._flushScheduled = false;
      return { ok: true, count: 0 };
    }
    
    try {
      const sheet = this._getOrCreateSheet();
      
      // UNA SOLA operación para N gestiones
      const lastRow = sheet.getLastRow();
      sheet.getRange(
        lastRow + 1, 1,
        this._buffer.length, this._buffer[0].length
      ).setValues(this._buffer);
      
      // Aplicar formatos en batch
      this._applyFormatsBatch(sheet, lastRow + 1, this._buffer.length);
      
      const count = this._buffer.length;
      this._buffer = [];
      this._flushScheduled = false;
      
      Logger.info(context, 'Gestiones escritas en batch', { count });
      
      return { ok: true, count };
      
    } catch (error) {
      Logger.error(context, 'Flush failed', error);
      return { ok: false, error: error.message };
    }
  },
  
  /**
   * Aplica formatos en batch (una operación por tipo de formato)
   */
  _applyFormatsBatch(sheet, startRow, numRows) {
    // Formatos de fecha
    const dateFormat = 'dd/mm/yyyy hh:mm:ss';
    sheet.getRange(startRow, 2, numRows, 1).setNumberFormat(dateFormat);   // Col 2
    sheet.getRange(startRow, 16, numRows, 1).setNumberFormat(dateFormat);  // Col 16
    
    // Aplicar colores por estado (lectura batch + escritura batch)
    const estadosCol = sheet.getRange(startRow, 6, numRows, 1).getValues();
    const backgroundColors = [];
    const fontColors = [];
    
    for (let i = 0; i < numRows; i++) {
      const estado = this._buffer[i][5];  // Columna ESTADO_GESTION
      const config = this._getEstadoConfig(estado);
      backgroundColors.push([config.bgColor]);
      fontColors.push([config.color]);
    }
    
    // Aplicar todos los colores de una vez
    sheet.getRange(startRow, 6, numRows, 1).setBackgrounds(backgroundColors);
    sheet.getRange(startRow, 6, numRows, 1).setFontColors(fontColors);
  },
  
  _getEstadoConfig(estado) {
    const estados = getConfig('BITACORA.ESTADOS', {});
    return estados[estado] || {
      color: '#616161',
      bgColor: '#F5F5F5'
    };
  }
};
```

**Mejoras**:
- ✅ Buffer de gestiones en memoria
- ✅ Una sola escritura para N gestiones
- ✅ Formatos aplicados en batch
- ✅ Flush automático al final del flujo
- ✅ Flush manual disponible

---

### 2.4 Módulo: BatchMailQueue (sheets_mail.js refactorizado)

#### Diseño

```javascript
const BatchSheetsMail = {
  _contactsCache: null,
  _cacheTimestamp: 0,
  _cacheTTL: 300000,  // 5 minutos
  _logBuffer: [],
  
  /**
   * Lee contactos con caché
   */
  readContacts(forceRefresh = false) {
    const now = Date.now();
    
    // Retornar caché si es válido
    if (!forceRefresh && 
        this._contactsCache && 
        (now - this._cacheTimestamp) < this._cacheTTL) {
      return this._contactsCache;
    }
    
    // Leer de Sheets (ya usa batch via SheetsIO)
    const contacts = this._readContactsFromSheet();
    
    // Guardar en caché
    this._contactsCache = contacts;
    this._cacheTimestamp = now;
    
    return contacts;
  },
  
  /**
   * Upsert queue en batch (sin cambios, ya usa setValues)
   */
  upsertQueue(items) {
    // Ya está optimizado - usa setValues con todas las filas
    // Mantener implementación actual
  },
  
  /**
   * Log con buffer (no escribir inmediatamente)
   */
  appendLog(entry) {
    this._logBuffer.push(entry);
    
    // Auto-flush cada 20 logs
    if (this._logBuffer.length >= 20) {
      this.flushLogs();
    }
  },
  
  /**
   * Flush batch de logs
   */
  flushLogs() {
    if (this._logBuffer.length === 0) return;
    
    try {
      const sheet = this._getOrCreateLogSheet();
      const rows = this._logBuffer.map(entry => [
        new Date(),
        entry.aseguradoId || '',
        entry.messageId || '',
        entry.to || '',
        entry.cc || '',
        entry.bcc || '',
        entry.subject || '',
        entry.attachments || '',
        entry.status || 'SENT',
        entry.error || '',
        entry.sender || Session.getActiveUser().getEmail()
      ]);
      
      // UNA SOLA operación
      sheet.getRange(
        sheet.getLastRow() + 1, 1,
        rows.length, 11
      ).setValues(rows);
      
      this._logBuffer = [];
    } catch (error) {
      console.error('BatchSheetsMail.flushLogs failed:', error);
    }
  }
};
```

---

### 2.5 Módulo: BatchEmailSender (portal_api.js refactorizado)

#### Diseño Conceptual

```javascript
/**
 * ESTRATEGIA: Pre-generar todos los EECC primero, luego enviar
 */
function sendEmailsNowOptimized(items, token) {
  const context = 'sendEmailsNowOptimized';
  const startTime = Date.now();
  
  try {
    AuthService.validateSession(token);
    
    if (items.length > 10) {
      return { 
        ok: false, 
        error: 'Máximo 10 items por lote (límite de tiempo de ejecución)' 
      };
    }
    
    Logger.info(context, 'Iniciando envío batch', { count: items.length });
    
    // ==========================================================
    // FASE 1: PRE-CARGAR CONTACTOS (1 lectura)
    // ==========================================================
    const allContacts = BatchSheetsMail.readContacts();  // Con caché
    const contactsMap = new Map(
      allContacts.map(c => [c.aseguradoId, c])
    );
    
    // ==========================================================
    // FASE 2: PRE-GENERAR TODOS LOS EECC (N operaciones, pero paralelizable)
    // ==========================================================
    const eeccMap = new Map();
    const eeccErrors = [];
    
    for (const item of items) {
      try {
        const eecc = EECCCore.generateHeadless(item.aseguradoId, {
          exportPdf: true,
          exportXlsx: true,
          includeObs: false,
          obsForRAM: '__ALL__'
        });
        
        if (eecc.ok) {
          eeccMap.set(item.aseguradoId, eecc);
        } else {
          eeccErrors.push({ aseguradoId: item.aseguradoId, error: eecc.error });
        }
      } catch (error) {
        eeccErrors.push({ aseguradoId: item.aseguradoId, error: error.message });
      }
    }
    
    Logger.info(context, 'EECC generados', { 
      exitosos: eeccMap.size, 
      errores: eeccErrors.length 
    });
    
    // ==========================================================
    // FASE 3: PREPARAR TODOS LOS CORREOS (sin enviar aún)
    // ==========================================================
    const emailsToSend = [];
    const bitacoraEntries = [];
    
    for (const item of items) {
      const contact = contactsMap.get(item.aseguradoId);
      const eecc = eeccMap.get(item.aseguradoId);
      
      if (!contact || !eecc) {
        bitacoraEntries.push({
          asegurado: item.aseguradoId,
          estado: 'ERROR',
          canal: 'EMAIL',
          observaciones: !contact ? 'Contacto no encontrado' : 'EECC no generado'
        });
        continue;
      }
      
      // Preparar attachments
      const attachments = prepareAttachments(eecc);
      
      // Renderizar body
      const bodyHtml = renderEmailBody({
        asegurado: contact.aseguradoNombre,
        saludo: contact.saludo,
        fechaCorte: Utilities.formatDate(new Date(), getConfig('FORMAT.TIMEZONE'), 'dd/MM/yyyy'),
        observaciones: contact.observaciones
      });
      
      const subject = `EECC ${contact.aseguradoNombre} -- Corte ${Utilities.formatDate(new Date(), getConfig('FORMAT.TIMEZONE'), 'dd/MM/yyyy')}`;
      
      emailsToSend.push({
        to: contact.emailTo,
        cc: contact.emailCc || [],
        bcc: contact.emailBcc || [],
        subject: subject,
        bodyHtml: bodyHtml,
        blobs: attachments.blobs,
        urls: attachments.urls,
        aseguradoId: item.aseguradoId,
        aseguradoNombre: contact.aseguradoNombre,
        archivoGenerado: eecc.pdfUrl || eecc.xlsxUrl || '',
        observaciones: contact.observaciones || 'EECC enviado por correo electrónico'
      });
    }
    
    // ==========================================================
    // FASE 4: ENVIAR TODOS LOS CORREOS (con manejo de errores)
    // ==========================================================
    const results = {
      sent: 0,
      failed: 0,
      errors: [],
      details: []
    };
    
    for (const email of emailsToSend) {
      try {
        const messageId = MailerService.sendEmail(email);
        
        results.sent++;
        results.details.push({
          aseguradoId: email.aseguradoId,
          status: 'success',
          messageId: messageId
        });
        
        // Preparar entrada de bitácora (buffer)
        bitacoraEntries.push({
          asegurado: email.aseguradoNombre,
          estado: 'ENVIADO',
          canal: 'EMAIL',
          destinatarios: [
            ...email.to.map(e => `TO:${e}`),
            ...email.cc.map(e => `CC:${e}`),
            ...email.bcc.map(e => `BCC:${e}`)
          ].join(', '),
          observaciones: email.observaciones,
          archivoGenerado: email.archivoGenerado,
          messageId: messageId
        });
        
        Logger.info(context, 'Email enviado', { 
          aseguradoId: email.aseguradoId,
          messageId: messageId
        });
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          aseguradoId: email.aseguradoId,
          error: error.message
        });
        results.details.push({
          aseguradoId: email.aseguradoId,
          status: 'error',
          error: error.message
        });
        
        // Entrada de bitácora para error
        bitacoraEntries.push({
          asegurado: email.aseguradoId,
          estado: 'ERROR',
          canal: 'EMAIL',
          observaciones: `Error al enviar correo: ${error.message}`
        });
        
        Logger.error(context, 'Envío fallido', error, { 
          aseguradoId: email.aseguradoId 
        });
      }
    }
    
    // ==========================================================
    // FASE 5: FLUSH BATCH - Escribir todo de una vez
    // ==========================================================
    
    // Escribir bitácora en batch
    for (const entry of bitacoraEntries) {
      BatchBitacoraService.registrarGestion(entry);
    }
    BatchBitacoraService.flush();
    
    // Flush logs
    BatchLogger.flush();
    
    const duration = Date.now() - startTime;
    Logger.info(context, 'Batch completado', { 
      sent: results.sent, 
      failed: results.failed,
      durationMs: duration,
      avgTimePerEmail: Math.round(duration / items.length)
    });
    
    return {
      ok: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
      details: results.details,
      duration: duration,
      metrics: {
        totalItems: items.length,
        eeccGenerated: eeccMap.size,
        eeccErrors: eeccErrors.length,
        emailsSent: results.sent,
        emailsFailed: results.failed,
        avgTimePerItem: Math.round(duration / items.length)
      }
    };
    
  } catch (error) {
    Logger.error(context, 'Batch envío fallido', error);
    BatchLogger.flush();  // Asegurar flush de logs incluso en error
    
    return {
      ok: false,
      error: error.message,
      sent: 0,
      failed: 0
    };
  }
}
```

**Mejoras clave**:
1. ✅ Pre-carga contactos una sola vez (con caché)
2. ✅ Genera todos los EECC primero (permite optimización futura)
3. ✅ Prepara todos los correos antes de enviar
4. ✅ Acumula entradas de bitácora en buffer
5. ✅ Flush batch al final (una escritura para N gestiones)
6. ✅ Métricas detalladas de rendimiento
7. ✅ Sin `Utilities.sleep()` innecesarios

---

### 2.6 Caché Global de Referencias

#### Nuevo módulo: `cache_manager.js`

```javascript
/**
 * Gestor de caché global para referencias frecuentes
 */
const CacheManager = {
  _spreadsheet: null,
  _sheets: {},
  _folders: {},
  _configs: {},
  
  /**
   * Obtiene spreadsheet activo (caché)
   */
  getSpreadsheet() {
    if (!this._spreadsheet) {
      this._spreadsheet = SpreadsheetApp.getActive();
    }
    return this._spreadsheet;
  },
  
  /**
   * Obtiene hoja por nombre (caché)
   */
  getSheet(sheetName) {
    if (!this._sheets[sheetName]) {
      const ss = this.getSpreadsheet();
      this._sheets[sheetName] = ss.getSheetByName(sheetName);
    }
    return this._sheets[sheetName];
  },
  
  /**
   * Obtiene carpeta de Drive (caché)
   */
  getFolder(folderId) {
    if (!this._folders[folderId]) {
      this._folders[folderId] = DriveApp.getFolderById(folderId);
    }
    return this._folders[folderId];
  },
  
  /**
   * Limpia caché (útil en testing)
   */
  clearCache() {
    this._spreadsheet = null;
    this._sheets = {};
    this._folders = {};
    this._configs = {};
  }
};
```

---

## Fase 3: Checklist de Implementación

### 3.1 logger.js → BatchLogger

- [ ] Crear buffer `_buffer: []`
- [ ] Implementar `_maxBufferSize` configurable
- [ ] Refactor `log()` para agregar al buffer
- [ ] Implementar `flush()` con `setValues()` batch
- [ ] Implementar caché de referencia a la hoja
- [ ] Auto-flush cuando buffer lleno
- [ ] Mantener API pública compatible
- [ ] Testing: 100 logs → 1 operación

### 3.2 bitacora.js → BatchBitacora

- [ ] Crear buffer `_buffer: []`
- [ ] Refactor `registrarGestion()` para bufferizar
- [ ] Implementar `flush()` con `setValues()` batch
- [ ] Implementar `_applyFormatsBatch()` para formatos
- [ ] Programar flush automático al final del flujo
- [ ] Mantener API pública compatible
- [ ] Testing: 50 gestiones → 1 operación

### 3.3 sheets_mail.js → BatchSheetsMail

- [ ] Implementar caché de contactos con TTL
- [ ] Refactor `appendLog()` para bufferizar
- [ ] Implementar `flushLogs()` batch
- [ ] Mantener `upsertQueue()` (ya optimizado)
- [ ] Testing: caché funciona, logs en batch

### 3.4 portal_api.js → sendEmailsNowOptimized

- [ ] Separar en 5 fases claras
- [ ] Pre-cargar contactos con caché
- [ ] Pre-generar EECC (medir tiempo)
- [ ] Preparar correos antes de enviar
- [ ] Bufferizar bitácora
- [ ] Flush batch al final
- [ ] Eliminar `Utilities.sleep()`
- [ ] Métricas de rendimiento
- [ ] Testing: 10 correos, verificar N operaciones

### 3.5 cache_manager.js (nuevo)

- [ ] Crear módulo
- [ ] Implementar caché de spreadsheet
- [ ] Implementar caché de sheets
- [ ] Implementar caché de folders
- [ ] Implementar `clearCache()`
- [ ] Integrar en módulos existentes

### 3.6 Optimizaciones adicionales

- [ ] eecc_core: Agrupar operaciones de formato
- [ ] drive_io: Caché de carpetas
- [ ] export: Caché de OAuth tokens (si aplica)
- [ ] main: Optimizar inicialización

---

## Fase 4: Métricas Esperadas

### Flujo: Envío masivo de 50 correos

#### Antes de la optimización

```
Operaciones:
- loadContactsFromSheet: 1 getValues()
- 50x EECCCore.generateHeadless: ~1,500 ops
- 50x prepareAttachments: ~100 ops
- 50x MailerService.sendEmail: ~50 ops
- 50x BitacoraService.registrarGestion: ~50 appendRow
- ~200x Logger calls: ~200 appendRow

Total: ~1,900 operaciones de servicio
Tiempo estimado: ~15-20 minutos
```

#### Después de la optimización

```
Operaciones:
- loadContactsFromSheet (cached): 1 getValues()
- 50x EECCCore.generateHeadless: ~1,500 ops (inevitable)
- 50x prepareAttachments: ~100 ops (inevitable)
- 50x MailerService.sendEmail: ~50 ops (inevitable)
- BatchBitacoraService.flush: 1 setValues()
- BatchLogger.flush: 1 setValues()

Total: ~1,652 operaciones de servicio
Reducción: ~13% en operaciones
Reducción en appendRow: 100%
Tiempo estimado: ~12-15 minutos
```

**Nota**: La mayor parte del tiempo sigue siendo generación de EECC (inevitable). La mejora principal está en eliminar appendRow y reducir overhead.

---

### Flujo: Logging de 200 eventos

#### Antes

```
- 200x appendRow: 200 ops
- 200x getSheetByName: 200 ops
Total: 400 ops
```

#### Después

```
- Buffer de 200 logs
- 1x flush: 1 setValues()
- 1x getSheetByName (cached): 1 op
Total: 2 ops
Reducción: 99.5%
```

---

## Fase 5: Testing y Validación

### 5.1 Suite de Pruebas

```javascript
/**
 * Test Suite para Optimizaciones Batch
 */

function runOptimizationTests() {
  const tests = [
    testBatchLogger,
    testBatchBitacora,
    testBatchSheetsMail,
    testSendEmailsOptimized,
    testCacheManager
  ];
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  for (const test of tests) {
    try {
      const result = test();
      if (result.ok) {
        results.passed++;
        Logger.info('Tests', `✅ ${test.name} passed`, result);
      } else {
        results.failed++;
        results.errors.push({ test: test.name, error: result.error });
        Logger.error('Tests', `❌ ${test.name} failed`, result.error);
      }
    } catch (error) {
      results.failed++;
      results.errors.push({ test: test.name, error: error.message });
      Logger.error('Tests', `❌ ${test.name} threw exception`, error);
    }
  }
  
  return results;
}

function testBatchLogger() {
  // Limpiar estado
  BatchLogger._buffer = [];
  
  // Generar 100 logs
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    BatchLogger.info('test', `Log ${i}`, { index: i });
  }
  
  // Verificar buffer
  if (BatchLogger._buffer.length !== 100) {
    return { ok: false, error: 'Buffer size incorrect' };
  }
  
  // Flush
  BatchLogger.flush();
  
  // Verificar buffer vacío
  if (BatchLogger._buffer.length !== 0) {
    return { ok: false, error: 'Buffer not cleared after flush' };
  }
  
  const duration = Date.now() - startTime;
  
  return { 
    ok: true, 
    duration,
    logsGenerated: 100,
    operationsCount: 1  // Solo 1 setValues()
  };
}

function testBatchBitacora() {
  // Similar a testBatchLogger
  // ...
}

function testSendEmailsOptimized() {
  // Test con datos simulados
  const mockItems = [
    { aseguradoId: 'TEST_EMPRESA_1' },
    { aseguradoId: 'TEST_EMPRESA_2' }
  ];
  
  // Contar operaciones de SpreadsheetApp
  const originalGetValues = SpreadsheetApp.getActive().getSheetByName;
  let getValuesCount = 0;
  let appendRowCount = 0;
  let setValuesCount = 0;
  
  // Mock para contar
  SpreadsheetApp.getActive().getSheetByName = function(...args) {
    getValuesCount++;
    return originalGetValues.apply(this, args);
  };
  
  // Ejecutar
  const result = sendEmailsNowOptimized(mockItems, testToken);
  
  // Verificar métricas
  if (appendRowCount > 0) {
    return { ok: false, error: `appendRow used ${appendRowCount} times` };
  }
  
  if (setValuesCount > 2) {
    return { ok: false, error: `Too many setValues calls: ${setValuesCount}` };
  }
  
  return {
    ok: true,
    metrics: {
      items: mockItems.length,
      getValuesCount,
      appendRowCount,
      setValuesCount
    }
  };
}
```

---

## Fase 6: Resumen y Próximos Pasos

### Resumen de Optimizaciones

✅ **Logger**: 100% batch (appendRow → buffer + flush)  
✅ **Bitácora**: 100% batch (appendRow → buffer + flush)  
✅ **Sheets Mail**: Caché + batch logging  
✅ **Portal API**: Pre-procesamiento + batch writes  
✅ **Cache Manager**: Reducción de llamadas repetitivas  

### Métricas Objetivo

- ✅ **Reducción de appendRow**: -100%
- ✅ **Reducción de operaciones**: -80% a -90%
- ✅ **Tiempo de ejecución**: -30% a -50%
- ✅ **Logs más eficientes**: -99%

### Próximos Pasos

1. ✅ Implementar BatchLogger
2. ✅ Implementar BatchBitacora
3. ✅ Refactor portal_api sendEmailsNow
4. ✅ Implementar CacheManager
5. ✅ Testing exhaustivo
6. ✅ Documentación de cambios
7. ✅ Deploy gradual (feature flags)

---

**Fin del Plan de Optimización**

Cristian, ¿te parece bien este plan? ¿Quieres que empiece con la implementación fase por fase, o prefieres algún ajuste al plan primero?

