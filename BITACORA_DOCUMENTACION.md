# 📊 Sistema de Bitácora de Gestión de EECC

## Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Estructura de Datos](#estructura-de-datos)
4. [Estados de Gestión](#estados-de-gestión)
5. [Integración con el Sistema](#integración-con-el-sistema)
6. [Uso desde el Portal](#uso-desde-el-portal)
7. [Extender el Sistema](#extender-el-sistema)
8. [Conexión con BI Tools](#conexión-con-bi-tools)
9. [Mantenimiento](#mantenimiento)

---

## Introducción

El **Sistema de Bitácora de Gestión de EECC** es un módulo diseñado para registrar, rastrear y analizar todas las interacciones relacionadas con el envío y seguimiento de Estados de Cuenta (EECC) a clientes/asegurados.

### Objetivos Principales

- ✅ **Trazabilidad completa**: Cada acción tiene un ID único que permite seguimiento histórico
- ✅ **No intrusivo**: Los errores en el registro no bloquean el flujo principal
- ✅ **Escalable**: Diseñado para soportar múltiples gestiones por cliente
- ✅ **Analítico**: Estructura optimizada para conexión con Power BI, Looker Studio, etc.
- ✅ **Auditable**: Registro de usuario, fecha/hora y acciones realizadas

---

## Arquitectura

### Componentes

```
┌─────────────────────────────────────────────────────┐
│                 Portal de Cobranzas                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐    ┌──────────────┐              │
│  │ eecc_core.js│    │portal_api.js │              │
│  │  (Genera)   │    │  (Envía)     │              │
│  └──────┬──────┘    └──────┬───────┘              │
│         │                   │                       │
│         └────────┬──────────┘                       │
│                  ▼                                  │
│         ┌────────────────────┐                     │
│         │   bitacora.js      │                     │
│         │ (BitacoraService)  │                     │
│         └────────┬───────────┘                     │
│                  │                                  │
│                  ▼                                  │
│    ┌──────────────────────────────┐                │
│    │  Bitacora_Gestiones_EECC     │                │
│    │  (Google Sheets)             │                │
│    └──────────────┬───────────────┘                │
│                   │                                 │
└───────────────────┼─────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Power BI / Looker   │
        │   Data Studio, etc.   │
        └───────────────────────┘
```

### Flujo de Registro

1. **Generación de EECC** → `EECCCore.generateHeadless()` → Registra gestión con estado "ENVIADO"
2. **Envío de correo** → `sendEmailsNow()` → Actualiza con destinatarios y messageId
3. **Actualización manual** → Portal/UI → Cambia estado (sin respuesta, compromiso, etc.)
4. **Cierre** → Manual → Estado "CERRADO_PAGADO"

---

## Estructura de Datos

### Hoja: `Bitacora_Gestiones_EECC`

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| **ID_GESTION** | String | Identificador único | `EECC-20250113-143052-EMPRESA-456` |
| **FECHA_HORA_ENVIO** | DateTime | Timestamp de creación | `13/01/2025 14:30:52` |
| **USUARIO_RESPONSABLE** | String | Email del usuario que realizó la acción | `cobranzas1@transperuana.com` |
| **ASEGURADO** | String | Nombre del cliente/asegurado | `EMPRESA EJEMPLO S.A.` |
| **POLIZA** | String | Número de póliza (opcional) | `POL-2024-001234` |
| **ESTADO_GESTION** | Enum | Estado actual (ver tabla de estados) | `COMPROMISO_PAGO` |
| **CANAL_ENVIO** | Enum | Canal utilizado | `EMAIL`, `PORTAL`, `MANUAL` |
| **DESTINATARIOS** | String | Emails de destinatarios | `TO:gerencia@empresa.com, CC:admin@empresa.com` |
| **FECHA_TENTATIVA_PAGO** | Date | Fecha compromiso (si aplica) | `20/01/2025` |
| **MONTO_GESTIONADO** | Number | Monto total del EECC | `15,450.00` |
| **MONEDA** | String | Moneda del monto | `S/.` o `US$` |
| **OBSERVACIONES** | Text | Comentarios y notas | `Cliente solicitó extensión de plazo` |
| **ARCHIVO_GENERADO** | URL | Link al archivo EECC en Drive | `https://drive.google.com/file/d/...` |
| **MESSAGE_ID** | String | ID del mensaje de correo | `sent-1673623852000` |
| **ID_GESTION_PADRE** | String | ID de gestión anterior (trazabilidad) | `EECC-20250110-120000-EMPRESA-123` |
| **FECHA_ULTIMA_ACTUALIZACION** | DateTime | Última actualización del registro | `13/01/2025 16:45:30` |

---

## Estados de Gestión

### Estados Disponibles

| Estado | Código | Descripción | Color | Requiere Observación |
|--------|--------|-------------|-------|----------------------|
| 📤 Enviado | `ENVIADO` | EECC enviado exitosamente | 🟢 Verde | No |
| 📭 Sin Respuesta | `SIN_RESPUESTA` | Cliente no ha respondido | 🟠 Naranja | No |
| 💰 Compromiso de Pago | `COMPROMISO_PAGO` | Cliente comprometió fecha de pago | 🔵 Azul | **Sí** + Fecha |
| 📅 Reprogramado | `REPROGRAMADO` | Seguimiento reprogramado | 🟠 Naranja | **Sí** |
| 🏢 Derivado Comercial | `DERIVADO_COMERCIAL` | Escalado al área Comercial | 🟣 Púrpura | **Sí** |
| 👥 Derivado RRHH | `DERIVADO_RRHH` | Escalado a Gerencia de Riesgos Humanos | 🟣 Púrpura | **Sí** |
| 🛡️ Derivado Riesgos Generales | `DERIVADO_RIESGOS_GENERALES` | Escalado a Gerencia de Riesgos Generales | 🟣 Púrpura | **Sí** |
| ✅ Cerrado/Pagado | `CERRADO_PAGADO` | Gestión cerrada - Pago realizado | 🟢 Verde oscuro | No |
| ❌ Error | `ERROR` | Error en el proceso | 🔴 Rojo | **Sí** |

### Definición de Estados en Código

Los estados están definidos en `config.js` bajo `CONFIG.BITACORA.ESTADOS`:

```javascript
ESTADOS: {
  ENVIADO: {
    codigo: 'ENVIADO',
    descripcion: 'EECC enviado exitosamente',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
    requiereObservacion: false
  },
  // ... más estados
}
```

---

## Integración con el Sistema

### 1. Registro Automático en Generación de EECC

**Ubicación**: `eecc_core.js` → `generateHeadless()`

```javascript
// Después de generar exitosamente el EECC
const datosGestion = {
  asegurado: nombreAsegurado,
  poliza: '',
  estado: 'ENVIADO',
  canal: 'PORTAL',
  destinatarios: '',
  observaciones: 'EECC generado desde el portal',
  fechaTentativaPago: null,
  montoGestionado: '',
  moneda: '',
  archivoGenerado: result.pdfUrl || result.xlsxUrl || '',
  messageId: '',
  idGestionPadre: ''
};

BitacoraService.registrarGestion(datosGestion);
```

### 2. Registro Automático en Envío de Correos

**Ubicación**: `portal_api.js` → `sendEmailsNow()`

```javascript
// Después de enviar el correo exitosamente
const datosGestion = {
  asegurado: contact.aseguradoNombre,
  poliza: '',
  estado: 'ENVIADO',
  canal: 'EMAIL',
  destinatarios: [
    ...contact.emailTo.map(e => `TO:${e}`),
    ...(contact.emailCc || []).map(e => `CC:${e}`)
  ].join(', '),
  observaciones: contact.observaciones || 'EECC enviado por correo electrónico',
  fechaTentativaPago: null,
  montoGestionado: '',
  moneda: '',
  archivoGenerado: eecc.pdfUrl || eecc.xlsxUrl || '',
  messageId: messageId,
  idGestionPadre: ''
};

BitacoraService.registrarGestion(datosGestion);
```

### 3. Registro de Errores

```javascript
// En caso de error en cualquier proceso
try {
  BitacoraService.registrarGestion({
    asegurado: nombreAsegurado,
    poliza: '',
    estado: 'ERROR',
    canal: 'EMAIL',
    destinatarios: '',
    observaciones: `Error: ${error.message}`,
    // ... otros campos
  });
} catch (bitacoraError) {
  // Error controlado: no bloquea el flujo principal
  Logger.error('...', 'Error al registrar en bitácora', bitacoraError);
}
```

---

## Uso desde el Portal

### Funciones Disponibles para el Portal Web

#### 1. Registrar Nueva Gestión

```javascript
// Desde el frontend (con token de autenticación)
const resultado = await google.script.run
  .withSuccessHandler(response => {
    console.log('ID de gestión:', response.idGestion);
  })
  .apiRegistrarGestion({
    asegurado: 'EMPRESA EJEMPLO S.A.',
    poliza: 'POL-2024-001234',
    estado: 'ENVIADO',
    canal: 'EMAIL',
    destinatarios: 'gerencia@empresa.com',
    observaciones: 'Primera gestión del mes',
    fechaTentativaPago: null,
    montoGestionado: '15450.00',
    moneda: 'S/.',
    archivoGenerado: '',
    messageId: '',
    idGestionPadre: ''
  }, token);
```

#### 2. Actualizar Estado de Gestión

```javascript
// Actualizar estado (ejemplo: cliente comprometió pago)
const resultado = await google.script.run
  .withSuccessHandler(response => {
    console.log('Estado actualizado:', response.idGestion);
  })
  .apiActualizarEstadoGestion(
    'EECC-20250113-143052-EMPRESA-456', // ID de gestión original
    'COMPROMISO_PAGO',                   // Nuevo estado
    {
      observaciones: 'Cliente comprometió pago para el 20/01/2025',
      fechaTentativaPago: new Date('2025-01-20')
    },
    token
  );
```

#### 3. Consultar Gestiones de un Asegurado

```javascript
// Obtener todas las gestiones de un cliente
const resultado = await google.script.run
  .withSuccessHandler(response => {
    console.log('Gestiones:', response.gestiones);
  })
  .apiObtenerGestionesAsegurado(
    'EMPRESA EJEMPLO S.A.',
    {
      estado: 'SIN_RESPUESTA',           // Opcional: filtrar por estado
      fechaDesde: '2025-01-01',          // Opcional: fecha desde
      fechaHasta: '2025-01-31'           // Opcional: fecha hasta
    },
    token
  );
```

#### 4. Obtener Resumen por Estados

```javascript
// Resumen para dashboard
const resultado = await google.script.run
  .withSuccessHandler(response => {
    console.log('Resumen:', response.resumen);
    // Ejemplo de respuesta:
    // {
    //   ENVIADO: 45,
    //   SIN_RESPUESTA: 12,
    //   COMPROMISO_PAGO: 8,
    //   CERRADO_PAGADO: 30
    // }
  })
  .apiObtenerResumenEstados(
    {
      fechaDesde: '2025-01-01',
      fechaHasta: '2025-01-31'
    },
    token
  );
```

---

## Extender el Sistema

### Agregar Nuevos Estados

**1. Actualizar `config.js`**:

```javascript
// En CONFIG.BITACORA.ESTADOS, agregar:
PENDIENTE_APROBACION: {
  codigo: 'PENDIENTE_APROBACION',
  descripcion: 'Esperando aprobación de gerencia',
  color: '#FF9800',
  bgColor: '#FFF3E0',
  requiereObservacion: true
}
```

**2. Actualizar validaciones en `bitacora.js`** (opcional):

```javascript
// Si el nuevo estado requiere campos adicionales,
// agregar validación en _validarDatosGestion()
```

**3. Actualizar UI/Portal**:

```javascript
// Agregar el nuevo estado en los selectores del frontend
<option value="PENDIENTE_APROBACION">Pendiente de Aprobación</option>
```

### Agregar Nuevos Campos

**1. Actualizar `bitacora.js` → `_getDefaultHeaders()`**:

```javascript
_getDefaultHeaders() {
  return [
    // ... headers existentes ...
    'NUEVO_CAMPO',           // Agregar aquí
    'FECHA_ULTIMA_ACTUALIZACION'
  ];
}
```

**2. Actualizar `_construirFilaGestion()`**:

```javascript
_construirFilaGestion(datos) {
  return [
    // ... campos existentes ...
    String(datos.nuevoCampo || '').trim(),  // Agregar aquí
    now                                      // FECHA_ULTIMA_ACTUALIZACION
  ];
}
```

**3. Actualizar `_configureColumnWidths()`**:

```javascript
const widths = {
  // ... anchos existentes ...
  17: 150,  // NUEVO_CAMPO (ajustar índice)
  18: 160   // FECHA_ULTIMA_ACTUALIZACION
};
```

### Agregar Validaciones Personalizadas

```javascript
// En bitacora.js → _validarDatosGestion()
_validarDatosGestion(datos) {
  // Validaciones existentes...
  
  // Agregar validación personalizada
  if (datos.estado === 'COMPROMISO_PAGO') {
    if (!datos.fechaTentativaPago) {
      return { 
        ok: false, 
        error: 'El estado COMPROMISO_PAGO requiere fecha tentativa de pago' 
      };
    }
  }
  
  return { ok: true };
}
```

---

## Conexión con BI Tools

### Power BI

**1. Conectar Google Sheets como fuente de datos**:

```
Obtener datos → Más... → Online Services → Google Sheets
```

**2. Autenticar y seleccionar la hoja `Bitacora_Gestiones_EECC`**

**3. Transformaciones recomendadas en Power Query**:

```powerquery
// Convertir FECHA_HORA_ENVIO a datetime
= Table.TransformColumnTypes(
    #"Previous Step",
    {{"FECHA_HORA_ENVIO", type datetime}}
)

// Extraer día de la semana
= Table.AddColumn(
    #"Previous Step", 
    "Día Semana", 
    each Date.DayOfWeekName([FECHA_HORA_ENVIO])
)

// Calcular días desde envío
= Table.AddColumn(
    #"Previous Step", 
    "Días Desde Envío", 
    each Duration.Days(DateTime.LocalNow() - [FECHA_HORA_ENVIO])
)
```

**4. Medidas DAX sugeridas**:

```dax
// Total de gestiones
Total Gestiones = COUNTROWS('Bitacora_Gestiones_EECC')

// Tasa de respuesta
Tasa Respuesta = 
DIVIDE(
    CALCULATE(
        COUNTROWS('Bitacora_Gestiones_EECC'),
        'Bitacora_Gestiones_EECC'[ESTADO_GESTION] <> "SIN_RESPUESTA"
    ),
    COUNTROWS('Bitacora_Gestiones_EECC')
)

// Promedio de días hasta compromiso
Días Promedio Compromiso = 
CALCULATE(
    AVERAGE('Bitacora_Gestiones_EECC'[Días Desde Envío]),
    'Bitacora_Gestiones_EECC'[ESTADO_GESTION] = "COMPROMISO_PAGO"
)

// Efectividad de cobranza
Tasa Cierre = 
DIVIDE(
    CALCULATE(
        COUNTROWS('Bitacora_Gestiones_EECC'),
        'Bitacora_Gestiones_EECC'[ESTADO_GESTION] = "CERRADO_PAGADO"
    ),
    COUNTROWS('Bitacora_Gestiones_EECC')
)
```

### Google Looker Studio (Data Studio)

**1. Crear fuente de datos**:

```
Crear → Fuente de datos → Google Sheets
```

**2. Seleccionar la hoja `Bitacora_Gestiones_EECC`**

**3. Campos calculados recomendados**:

```
// Días desde envío
Días Desde Envío: DATE_DIFF(TODAY(), FECHA_HORA_ENVIO, DAY)

// Mes de gestión
Mes Gestión: MONTH(FECHA_HORA_ENVIO)

// Trimestre
Trimestre: QUARTER(FECHA_HORA_ENVIO)

// Tiene compromiso de pago
Con Compromiso: IF(ESTADO_GESTION = "COMPROMISO_PAGO", 1, 0)

// Días hasta fecha tentativa
Días Hasta Pago: DATE_DIFF(FECHA_TENTATIVA_PAGO, TODAY(), DAY)
```

**4. Visualizaciones sugeridas**:

- **Tarjetas de resumen**: Total gestiones, Tasa de respuesta, Promedio días
- **Gráfico de barras**: Gestiones por estado
- **Línea de tiempo**: Gestiones por día/semana/mes
- **Tabla de detalle**: Últimas gestiones con filtros
- **Embudo**: Enviado → Sin respuesta → Compromiso → Cerrado
- **Mapa de calor**: Gestiones por día de la semana y hora

### Consultas SQL Directas (Google BigQuery)

Si se exporta a BigQuery:

```sql
-- Top 10 clientes con más gestiones sin respuesta
SELECT 
  ASEGURADO,
  COUNT(*) as total_gestiones,
  SUM(CASE WHEN ESTADO_GESTION = 'SIN_RESPUESTA' THEN 1 ELSE 0 END) as sin_respuesta,
  ROUND(SUM(CASE WHEN ESTADO_GESTION = 'SIN_RESPUESTA' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as pct_sin_respuesta
FROM `proyecto.dataset.Bitacora_Gestiones_EECC`
WHERE DATE(FECHA_HORA_ENVIO) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY ASEGURADO
HAVING sin_respuesta > 0
ORDER BY sin_respuesta DESC
LIMIT 10;

-- Análisis de efectividad por usuario
SELECT 
  USUARIO_RESPONSABLE,
  COUNT(*) as total_gestiones,
  SUM(CASE WHEN ESTADO_GESTION = 'CERRADO_PAGADO' THEN 1 ELSE 0 END) as cerradas,
  ROUND(AVG(DATE_DIFF(
    CASE WHEN ESTADO_GESTION = 'CERRADO_PAGADO' 
         THEN DATE(FECHA_ULTIMA_ACTUALIZACION) 
         ELSE NULL END,
    DATE(FECHA_HORA_ENVIO),
    DAY
  )), 2) as dias_promedio_cierre
FROM `proyecto.dataset.Bitacora_Gestiones_EECC`
WHERE DATE(FECHA_HORA_ENVIO) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY USUARIO_RESPONSABLE
ORDER BY cerradas DESC;

-- Seguimiento de compromisos de pago próximos a vencer
SELECT 
  ASEGURADO,
  ESTADO_GESTION,
  FECHA_TENTATIVA_PAGO,
  DATE_DIFF(DATE(FECHA_TENTATIVA_PAGO), CURRENT_DATE(), DAY) as dias_hasta_vencimiento,
  DESTINATARIOS,
  OBSERVACIONES
FROM `proyecto.dataset.Bitacora_Gestiones_EECC`
WHERE ESTADO_GESTION = 'COMPROMISO_PAGO'
  AND FECHA_TENTATIVA_PAGO IS NOT NULL
  AND DATE(FECHA_TENTATIVA_PAGO) BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY FECHA_TENTATIVA_PAGO ASC;
```

---

## Mantenimiento

### Limpieza de Datos Antiguos

**Crear función de archivado** (ejecutar mensualmente):

```javascript
/**
 * Archiva gestiones antiguas a una hoja separada
 * Ejecutar manualmente o con trigger mensual
 */
function archivarGestionesAntiguas() {
  const context = 'archivarGestionesAntiguas';
  const diasRetencion = getConfig('BITACORA.RETENCION.ARCHIVAR_DESPUES_DIAS', 730);
  
  try {
    const ss = SpreadsheetApp.getActive();
    const bitacoraSheet = ss.getSheetByName(BitacoraService.SHEET_NAME);
    
    if (!bitacoraSheet) return;
    
    const data = bitacoraSheet.getDataRange().getValues();
    const headers = data[0];
    const fechaIdx = headers.indexOf('FECHA_HORA_ENVIO');
    
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);
    
    const rowsToArchive = [];
    const rowsToKeep = [headers];
    
    for (let i = 1; i < data.length; i++) {
      const fecha = new Date(data[i][fechaIdx]);
      
      if (fecha < fechaLimite) {
        rowsToArchive.push(data[i]);
      } else {
        rowsToKeep.push(data[i]);
      }
    }
    
    if (rowsToArchive.length > 0) {
      // Crear hoja de archivo si no existe
      let archivoSheet = ss.getSheetByName('Bitacora_Archivo');
      if (!archivoSheet) {
        archivoSheet = ss.insertSheet('Bitacora_Archivo');
        archivoSheet.appendRow(headers);
      }
      
      // Mover datos antiguos al archivo
      for (const row of rowsToArchive) {
        archivoSheet.appendRow(row);
      }
      
      // Actualizar hoja principal (mantener solo datos recientes)
      bitacoraSheet.clear();
      bitacoraSheet.getRange(1, 1, rowsToKeep.length, headers.length)
        .setValues(rowsToKeep);
      
      Logger.info(context, 'Gestiones archivadas', {
        archivadas: rowsToArchive.length,
        mantenidas: rowsToKeep.length - 1
      });
      
      SpreadsheetApp.getUi().alert(
        `✅ Archivado completo\n\n` +
        `Gestiones archivadas: ${rowsToArchive.length}\n` +
        `Gestiones activas: ${rowsToKeep.length - 1}`
      );
    } else {
      SpreadsheetApp.getUi().alert('No hay gestiones antiguas para archivar.');
    }
    
  } catch (error) {
    Logger.error(context, 'Error al archivar', error);
    SpreadsheetApp.getUi().alert('Error: ' + error.message);
  }
}
```

### Verificación de Integridad

```javascript
/**
 * Verifica la integridad de la bitácora
 */
function verificarIntegridadBitacora() {
  const context = 'verificarIntegridadBitacora';
  const issues = [];
  
  try {
    const ss = SpreadsheetApp.getActive();
    const bitacoraSheet = ss.getSheetByName(BitacoraService.SHEET_NAME);
    
    if (!bitacoraSheet) {
      issues.push('❌ Hoja de bitácora no existe');
      return issues;
    }
    
    const data = bitacoraSheet.getDataRange().getValues();
    const headers = data[0];
    const expectedHeaders = BitacoraService._getDefaultHeaders();
    
    // Verificar headers
    if (headers.length !== expectedHeaders.length) {
      issues.push(`⚠️ Número de columnas incorrecto. Esperado: ${expectedHeaders.length}, Actual: ${headers.length}`);
    }
    
    // Verificar IDs únicos
    const ids = new Set();
    const duplicateIds = [];
    
    for (let i = 1; i < data.length; i++) {
      const id = data[i][0];
      if (ids.has(id)) {
        duplicateIds.push(id);
      }
      ids.add(id);
    }
    
    if (duplicateIds.length > 0) {
      issues.push(`⚠️ IDs duplicados encontrados: ${duplicateIds.length}`);
    }
    
    // Verificar estados válidos
    const estadosValidos = Object.keys(getConfig('BITACORA.ESTADOS', {}));
    const estadoIdx = headers.indexOf('ESTADO_GESTION');
    let estadosInvalidos = 0;
    
    for (let i = 1; i < data.length; i++) {
      const estado = data[i][estadoIdx];
      if (estado && !estadosValidos.includes(estado)) {
        estadosInvalidos++;
      }
    }
    
    if (estadosInvalidos > 0) {
      issues.push(`⚠️ ${estadosInvalidos} registros con estados no reconocidos`);
    }
    
    if (issues.length === 0) {
      issues.push('✅ Bitácora íntegra. No se encontraron problemas.');
    }
    
    Logger.info(context, 'Verificación completa', { issues: issues.length });
    SpreadsheetApp.getUi().alert('Verificación de Integridad\n\n' + issues.join('\n'));
    
    return issues;
    
  } catch (error) {
    Logger.error(context, 'Error en verificación', error);
    return ['❌ Error: ' + error.message];
  }
}
```

### Monitoreo Recomendado

1. **Diario**: Verificar que los envíos se registren correctamente
2. **Semanal**: Revisar gestiones "SIN_RESPUESTA" > 7 días
3. **Mensual**: Ejecutar `archivarGestionesAntiguas()`
4. **Trimestral**: Ejecutar `verificarIntegridadBitacora()`

---

## FAQ

### ¿Qué pasa si falla el registro en la bitácora?

El sistema está diseñado para que los errores en la bitácora **NO bloqueen el flujo principal**. Si falla el registro:
- El EECC se genera/envía normalmente
- El error se registra en el Debug_Log
- El usuario recibe el EECC sin interrupciones

### ¿Puedo eliminar registros de la bitácora?

Sí, pero **NO se recomienda** eliminar manualmente. En su lugar:
- Usa `archivarGestionesAntiguas()` para mover a hoja de archivo
- Mantén el histórico completo para auditorías
- Si necesitas "ocultar" un registro, agrega un campo "ACTIVO" (TRUE/FALSE)

### ¿Cómo recupero una gestión anterior?

Usa `ID_GESTION_PADRE` para rastrear el historial:

```javascript
function obtenerHistorialCompleto(idGestion) {
  const historial = [];
  let currentId = idGestion;
  
  while (currentId) {
    const gestion = BitacoraService.buscarGestionPorId(currentId);
    if (!gestion) break;
    
    historial.push(gestion);
    currentId = gestion.id_gestion_padre;
  }
  
  return historial.reverse(); // Ordenar cronológicamente
}
```

### ¿Cómo actualizo el estado de una gestión desde el menú de Sheets?

Actualmente, las actualizaciones se hacen desde el portal web. Para actualizar manualmente:

1. Abrir la bitácora: `EECC` → `Ver Bitácora de Gestiones`
2. Copiar el `ID_GESTION` del registro a actualizar
3. Usar `apiActualizarEstadoGestion()` desde el portal

**Próxima mejora**: Agregar formulario en sidebar de Sheets para actualizar estados sin usar el portal.

---

## Soporte y Contacto

Para consultas, mejoras o reporte de bugs:

- **Equipo de Desarrollo**: dev@transperuana.com
- **Documentación**: Este archivo
- **Logs del Sistema**: Hoja `Debug_Log`

---

**Última actualización**: 13 de Enero de 2025  
**Versión del sistema**: 1.0.0  
**Autor**: Transperuana Dev Team

