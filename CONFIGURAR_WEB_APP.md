# 🌐 Configuración para Web App Deployments

## 🔍 El Problema que Solucionamos

**Síntoma:** La bitácora funciona perfectamente en el editor de Apps Script pero devuelve `null` en el deployment Web App.

**Causa raíz:** `SpreadsheetApp.getActive()` **NO FUNCIONA** en Web App deployments. Solo funciona cuando el código se ejecuta:
- ✅ Desde el editor de Apps Script
- ✅ Desde triggers vinculados al spreadsheet
- ❌ Desde Web Apps (doGet/doPost)

**Solución:** Usar `SpreadsheetApp.openById(SPREADSHEET_ID)` que sí funciona en Web Apps.

---

## 📋 Pasos de Configuración (OBLIGATORIOS)

### 1️⃣ Obtener el ID del Spreadsheet

**Opción A: Desde el Menú (Recomendado)**

1. Abre tu Google Spreadsheet
2. Menú: `EECC` → `🌐 Obtener ID para Web App`
3. Aparecerá un popup con el ID
4. **COPIA el ID** (es una cadena larga como `1abc2def3ghi...`)

**Opción B: Desde la URL**

```
https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
                                      ^^^^^^^^^^^^^^^^
```

### 2️⃣ Configurar el ID en el Código

1. Abre el archivo: `gas/config.js`
2. Busca la línea:
   ```javascript
   SPREADSHEET_ID: '', // ← Dejar vacío para auto-detectar
   ```
3. Pega el ID que copiaste:
   ```javascript
   SPREADSHEET_ID: '1abc2def3ghi4jkl5mno6pqr7stu8vwx9yz', // ← TU ID AQUÍ
   ```
4. **GUARDA el archivo** (Ctrl+S / Cmd+S)

### 3️⃣ Subir los Cambios

En tu terminal:

```bash
cd /Users/cristiansarapuragaray/Documents/portal-cobranzas
clasp push --force
```

### 4️⃣ Crear Nuevo Deployment

**⚠️ IMPORTANTE:** Debes crear un **NUEVO** deployment, no actualizar el existente.

1. Apps Script Editor → `Implementar` → `Gestionar implementaciones`
2. **ELIMINA** todas las implementaciones viejas (importante para limpiar caché)
3. `Nueva implementación`
   - **Tipo:** Aplicación web
   - **Descripción:** `Portal EECC - Bitácora v3 FIXED`
   - **Ejecutar como:** Yo (tu usuario)
   - **Quién tiene acceso:** Cualquier persona
4. Haz clic en `IMPLEMENTAR`
5. **COPIA LA URL NUEVA** (será diferente a las anteriores)

### 5️⃣ Probar en Incógnito

```
1. Cierra TODAS las ventanas del portal
2. Abre ventana de incógnito
3. Pega la URL NUEVA del deployment
4. Inicia sesión
5. Abre la bitácora
```

---

## ✅ Checklist de Verificación

- [ ] Obtuve el SPREADSHEET_ID desde el menú o la URL
- [ ] Agregué el ID en `gas/config.js`
- [ ] Guardé el archivo
- [ ] Ejecuté `clasp push --force`
- [ ] Eliminé TODOS los deployments viejos
- [ ] Creé un NUEVO deployment (no "actualicé" uno viejo)
- [ ] Copié la URL NUEVA del deployment
- [ ] Probé en ventana de incógnito con la URL nueva

---

## 🐛 Troubleshooting

### ❌ Sigue devolviendo `null`

**Causa probable:** Estás usando una URL de deployment vieja (con caché).

**Solución:**
1. Verifica que hayas **eliminado** todos los deployments viejos
2. Verifica que hayas creado un deployment **NUEVO**
3. Verifica que estés usando la **URL nueva**
4. Prueba en **ventana de incógnito**

### ❌ Error: "No se pudo obtener el Spreadsheet"

**Causa:** El SPREADSHEET_ID no está configurado o es incorrecto.

**Solución:**
1. Ejecuta `obtenerSpreadsheetID()` desde el editor
2. Copia el ID exacto que aparece
3. Verifica que no haya espacios antes/después del ID en `config.js`
4. Sube los cambios: `clasp push --force`

### ❌ La bitácora carga pero con datos vacíos

**Causa:** La hoja `Bitacora_Gestiones_EECC` no tiene datos o no existe.

**Solución:**
1. Ejecuta: Menú `EECC` → `🔧 Inicializar Bitácora v3.0`
2. Registra una gestión manualmente desde el portal
3. Refresca la vista de "Estado Actual"

---

## 💡 ¿Por qué es necesario esto?

Google Apps Script tiene dos contextos diferentes:

| Contexto | `SpreadsheetApp.getActive()` | `SpreadsheetApp.openById()` |
|----------|------------------------------|------------------------------|
| Editor de Scripts | ✅ Funciona | ✅ Funciona |
| Triggers de Spreadsheet | ✅ Funciona | ✅ Funciona |
| **Web App (doGet/doPost)** | ❌ **NO funciona** | ✅ **Funciona** |

En un Web App deployment, **no hay spreadsheet "activo"** porque el código se ejecuta en el servidor de Google, no vinculado a ningún spreadsheet específico.

Por eso necesitamos **decirle explícitamente** qué spreadsheet usar mediante su ID.

---

## 📝 Cambios Técnicos Realizados

### 1. `gas/config.js`
```javascript
// Agregado
SPREADSHEET_ID: '', // ID del spreadsheet para Web Apps
```

### 2. `gas/sheets_io.js`
```javascript
// Nuevo método helper
_getSpreadsheet() {
  const ssId = getConfig('SPREADSHEET_ID', '');
  if (ssId) {
    return SpreadsheetApp.openById(ssId); // ✅ Funciona en Web Apps
  }
  return SpreadsheetApp.getActive(); // Fallback para editor
}

// Actualizado en readSheet, writeSheet, updateBaseSheet
const ss = this._getSpreadsheet(); // En lugar de getActive()
```

### 3. `gas/main.js`
```javascript
// Nueva función helper
function obtenerSpreadsheetID() {
  // Muestra el ID del spreadsheet actual con instrucciones
}
```

---

## 🎯 Resultado Esperado

Después de seguir estos pasos:

- ✅ La bitácora carga datos en el deployment Web App
- ✅ `getClientesConCiclosActivos` sigue funcionando (ya funcionaba)
- ✅ `bitacoraGetAllDataV3Final` devuelve datos reales (no `null`)
- ✅ La tabla de "Estado Actual" se renderiza correctamente
- ✅ El filtro de asegurados se puebla correctamente

---

## 🚀 Next Steps

Una vez que la bitácora funcione:

1. **Registro automático:** El sistema ya registra automáticamente cada EECC enviado
2. **Registro manual:** Los usuarios pueden registrar gestiones manualmente desde el portal
3. **Reportes BI:** La estructura está lista para conectar con Power BI / Looker Studio
4. **Métricas:** Todas las gestiones quedan registradas con timestamps y estados

---

¿Preguntas? Revisa la documentación completa en:
- `BITACORA_DOCUMENTACION.md` - Documentación de la bitácora
- `METRICAS_OPTIMIZACION.md` - Métricas de rendimiento
- `RESUMEN_OPTIMIZACION_v2.0.md` - Resumen ejecutivo

