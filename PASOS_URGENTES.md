# 🚨 PASOS URGENTES - Configurar Bitácora

## ✅ Código Actualizado

El código ya está subido con:
- ✅ Función ultra-defensiva con logging detallado
- ✅ Script helper para obtener el ID fácilmente
- ✅ Mensajes de error claros con instrucciones

---

## 📋 TUS PASOS (5 minutos)

### PASO 1: Obtener el ID del Spreadsheet

**En Google Spreadsheet:**

1. Abre tu spreadsheet de cobranzas
2. Menú: `EECC` → `🌐 Obtener ID para Web App`
3. Aparecerá un popup con el ID
4. **CÓPIALO** (Ctrl+C / Cmd+C)

**Alternativa (si el menú no aparece):**

1. Ve a Apps Script Editor
2. Busca el archivo `get_spreadsheet_id.js`
3. Ejecuta la función: `mostrarSpreadsheetID`
4. Copia el ID que aparece

---

### PASO 2: Pegar el ID en config.js

**En VS Code / Cursor:**

1. Abre el archivo: `gas/config.js`
2. Ve a la **línea 12**
3. Busca:
   ```javascript
   SPREADSHEET_ID: '', // ← Dejar vacío para auto-detectar
   ```
4. Pega el ID que copiaste:
   ```javascript
   SPREADSHEET_ID: 'TU_ID_AQUI', // ← Pega aquí el ID
   ```
5. **GUARDA** el archivo (Ctrl+S / Cmd+S)

---

### PASO 3: Subir los Cambios

**En tu terminal:**

```bash
cd /Users/cristiansarapuragaray/Documents/portal-cobranzas
clasp push --force
```

---

### PASO 4: Crear Deployment NUEVO

**En Apps Script Editor:**

1. Click en `Implementar` (arriba a la derecha)
2. Click en `Gestionar implementaciones`
3. **ELIMINA** todos los deployments que aparezcan (importante)
4. Click en `Nueva implementación`
5. Selecciona: `Aplicación web`
6. Configuración:
   - **Descripción:** `Bitácora v3 FIXED - Con SPREADSHEET_ID`
   - **Ejecutar como:** Yo (tu usuario)
   - **Quién tiene acceso:** Cualquier persona
7. Click en `IMPLEMENTAR`
8. **COPIA LA URL NUEVA** que aparece

---

### PASO 5: Probar en Incógnito

1. Abre una **ventana de incógnito** (Ctrl+Shift+N / Cmd+Shift+N)
2. Pega la **URL NUEVA** del deployment
3. Inicia sesión en el portal
4. Click en "📊 Bitácora de Gestiones de Cobranzas"
5. Abre la **consola de JavaScript** (F12)
6. Verás mensajes de debug detallados

---

## 🔍 Qué Verás en la Consola

### Si el ID está configurado correctamente:

```
[loadBitacoraData] ========== DEBUG ==========
  [1] Inicio de función
  [2] Verificando SheetsIO...
  [3] SheetsIO OK
  [4] Verificando _getSpreadsheet...
  [5] _getSpreadsheet OK
  [6] Obteniendo SPREADSHEET_ID...
  [7] SPREADSHEET_ID: 1abc2def3g...
  [8] Llamando a SheetsIO.readSheet...
  [9] readSheet completado
  [10] Filas encontradas: 2
  [11] Ciclos procesados: 2
[loadBitacoraData] ✅ Datos cargados: 2
```

### Si el ID NO está configurado:

```
[loadBitacoraData] ========== DEBUG ==========
  [1] Inicio de función
  [2] Verificando SheetsIO...
  [3] SheetsIO OK
  [4] Verificando _getSpreadsheet...
  [5] _getSpreadsheet OK
  [6] Obteniendo SPREADSHEET_ID...
  [7] SPREADSHEET_ID: VACÍO
  [8] ERROR: SPREADSHEET_ID vacío

📋 INSTRUCCIONES:
1. En Google Sheets: Menú EECC → Obtener ID para Web App
2. Copia el ID que aparece
3. Pega en gas/config.js línea 12: SPREADSHEET_ID: 'TU_ID'
4. Ejecuta: clasp push --force
5. Crea NUEVO deployment de Web App
```

### Si sigue devolviendo `null`:

Significa que estás usando un **deployment viejo** (con caché). Solución:

1. Verifica que hayas **eliminado** TODOS los deployments viejos
2. Verifica que hayas creado un deployment **NUEVO** (no "actualizado")
3. Verifica que estés usando la **URL nueva** del nuevo deployment
4. Prueba en **ventana de incógnito**

---

## ❓ Troubleshooting

### ❌ El menú "Obtener ID para Web App" no aparece

**Solución:**
1. Cierra y vuelve a abrir el spreadsheet
2. Espera 5 segundos a que carguen los menús
3. Si no aparece, usa el método alternativo:
   - Apps Script Editor → `get_spreadsheet_id.js` → Ejecutar `mostrarSpreadsheetID`

### ❌ Error al ejecutar `clasp push`

**Solución:**
```bash
# Intenta con permisos completos
cd /Users/cristiansarapuragaray/Documents/portal-cobranzas
sudo clasp push --force
```

### ❌ Sigo viendo "Error: null"

**Causa:** Estás usando un deployment viejo.

**Solución:**
1. Ve a `Implementar` → `Gestionar implementaciones`
2. Cuenta cuántos deployments ves
3. Si ves más de 1, **elimínalos TODOS**
4. Crea un deployment NUEVO desde cero
5. Verifica que la URL sea diferente a la anterior

---

## 🎯 Resultado Esperado

Después de seguir todos los pasos:

1. ✅ La consola muestra mensajes de debug detallados
2. ✅ La consola dice "✅ Datos cargados: N"
3. ✅ La tabla de bitácora se renderiza con las gestiones
4. ✅ Los filtros se pueblan correctamente

---

## 📞 Si Necesitas Ayuda

Copia y pega los mensajes de la consola:

1. Abre consola (F12)
2. Busca `[loadBitacoraData] ========== DEBUG ==========`
3. Copia todos los mensajes de debug
4. Compártelos conmigo

---

**Última actualización:** Código con logging ultra-detallado y script helper subido ✅  
**Próximo paso:** Seguir estos 5 pasos 🚀

