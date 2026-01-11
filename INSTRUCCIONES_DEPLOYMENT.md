# 🚀 INSTRUCCIONES DE DEPLOYMENT
## Portal Cobranzas Transperuana v2.5 - Mejoras de Diseño

**Fecha:** 15 Enero 2025  
**Tiempo estimado:** 5-10 minutos

---

## 📋 CHECKLIST PRE-DEPLOYMENT

Antes de empezar, verifica:

- [ ] Tienes acceso al proyecto de Google Apps Script
- [ ] Tienes permisos de edición en el proyecto
- [ ] Has guardado un backup del código actual (opcional pero recomendado)
- [ ] Tienes acceso a la URL de deployment actual

---

## 🔧 PASO 1: SUBIR ARCHIVOS ACTUALIZADOS

### **Archivos que debes subir:**
1. `gas/index.html` - Layout principal mejorado
2. `gas/styles.html` - Design system ampliado

### **Proceso en Google Apps Script Editor:**

#### **1.1 Abrir el proyecto**
```
1. Ve a https://script.google.com
2. Busca tu proyecto "Portal EECC/Cobranzas"
3. Abre el proyecto
```

#### **1.2 Actualizar index.html**
```
1. En el panel izquierdo, busca el archivo "index.html"
2. Haz clic en "index.html" para abrirlo
3. Selecciona TODO el contenido (Ctrl+A / Cmd+A)
4. Elimina el contenido actual
5. Copia el contenido del nuevo archivo "index.html" desde tu computadora
6. Pega el nuevo contenido (Ctrl+V / Cmd+V)
7. Verifica que se haya pegado correctamente
8. NO guardes todavía
```

#### **1.3 Actualizar styles.html**
```
1. En el panel izquierdo, busca el archivo "styles.html"
2. Haz clic en "styles.html" para abrirlo
3. Selecciona TODO el contenido (Ctrl+A / Cmd+A)
4. Elimina el contenido actual
5. Copia el contenido del nuevo archivo "styles.html" desde tu computadora
6. Pega el nuevo contenido (Ctrl+V / Cmd+V)
7. Verifica que se haya pegado correctamente
8. NO guardes todavía
```

#### **1.4 Guardar cambios**
```
1. Haz clic en "Archivo" > "Guardar proyecto" (o Ctrl+S / Cmd+S)
2. Espera a que aparezca el mensaje "Se guardaron todos los cambios en Drive"
3. ✅ Cambios guardados correctamente
```

---

## 🌐 PASO 2: CREAR NUEVO DEPLOYMENT

### **Opción A: Nueva Implementación (Recomendado para primera vez)**

```
1. En el menú superior, haz clic en "Implementar" > "Nueva implementación"

2. En el diálogo que aparece:
   - Tipo: Selecciona "Aplicación web"
   - Descripción: "Portal Cobranzas v2.5 - Mejoras UX (15 Ene 2025)"
   - Ejecutar como: "Yo" (tu cuenta)
   - Quién tiene acceso: "Cualquier usuario de [tu organización]"
   
3. Haz clic en "Implementar"

4. Copia la URL que aparece (algo como):
   https://script.google.com/.../exec
   
5. Guarda esta URL para compartirla con los usuarios

6. Haz clic en "Listo"
```

### **Opción B: Actualizar Implementación Existente**

```
1. En el menú superior, haz clic en "Implementar" > "Administrar implementaciones"

2. Busca la implementación activa actual

3. Haz clic en el ícono de lápiz ✏️ (Editar)

4. En "Nueva versión", selecciona "Nueva versión"

5. Descripción de la versión: "v2.5 - Mejoras UX (15 Ene 2025)"

6. Haz clic en "Implementar"

7. ✅ La URL existente ahora mostrará la nueva versión
```

---

## 🔄 PASO 3: LIMPIAR CACHÉ

**MUY IMPORTANTE:** El navegador puede mostrar la versión antigua en caché.

### **En Chrome/Edge:**
```
1. Abre la URL del portal
2. Presiona Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
3. Esto recarga la página sin caché
```

### **En Firefox:**
```
1. Abre la URL del portal
2. Presiona Ctrl+F5 (Windows) o Cmd+Shift+R (Mac)
3. Esto recarga la página sin caché
```

### **Limpiar caché manualmente (si lo anterior no funciona):**
```
1. Abre el navegador
2. Ve a Configuración > Privacidad y seguridad
3. Busca "Borrar datos de navegación"
4. Selecciona:
   - ☑ Imágenes y archivos en caché
   - ☐ Historial (opcional)
   - ☐ Cookies (opcional)
5. Periodo: "Última hora"
6. Haz clic en "Borrar datos"
7. Recarga el portal
```

---

## ✅ PASO 4: VERIFICACIÓN

### **Checklist de verificación visual:**

#### **4.1 Elementos principales**
- [ ] El título dice "**Transperuana · Portal Cobranzas**" (no "EECC")
- [ ] Hay un emoji 🏢 antes del título del header
- [ ] El login muestra "Portal Cobranzas"

#### **4.2 Flujo de 4 pasos**
- [ ] Ves una sección titulada "**Flujo Principal de Gestión**"
- [ ] Hay **4 cards horizontales** con badges rojos:
  - [ ] "PASO 1" - Actualizar Base
  - [ ] "PASO 2" - Generar EECC
  - [ ] "PASO 3" - Enviar Correos
  - [ ] "PASO 4" - Bitácora
- [ ] En desktop, ves **flechas (→)** entre los pasos
- [ ] Cada card tiene un **subtítulo descriptivo**

#### **4.3 Power BI**
- [ ] El Power BI está **al final** (después del flujo de 4 pasos)
- [ ] El Power BI inicia **colapsado** (no se ve el iframe)
- [ ] Dice "📊 Dashboard Analítico" con un ícono **▼**
- [ ] Al hacer clic, se **expande** y el ícono cambia a **▲**
- [ ] Al hacer clic de nuevo, se **colapsa**

#### **4.4 Footer**
- [ ] Al final de la página, ves un footer gris claro
- [ ] En el lado izquierdo: "Copyright © 2025 Transperuana Corredores de Seguros S.A..."
- [ ] En el lado derecho: "Desarrollado por Transperuana"

#### **4.5 Modal de Correos**
- [ ] Al abrir "Enviar EECC por Correo", el modal se abre
- [ ] El título del modal: "📧 Envío Masivo de Correos"
- [ ] Hay un **subtítulo** debajo del título
- [ ] Los tabs dicen: "1. Seleccionar Clientes", "2. Configurar Envío", "3. Revisar"
- [ ] Los labels tienen **emojis** (🔍, 🏢, 📅, 📎)

#### **4.6 Modal de Bitácora**
- [ ] Al abrir "Bitácora de Gestiones", el modal se abre
- [ ] El título del modal: "📝 Bitácora de Gestiones de Cobranzas"
- [ ] Hay un **subtítulo** debajo del título
- [ ] Los tabs dicen: "📊 Estado Actual", "✍️ Registrar Gestión"
- [ ] En el tab "Registrar Gestión", hay **2 columnas** con headers:
  - [ ] "📋 Información del Cliente"
  - [ ] "📊 Resultado y Seguimiento"

#### **4.7 Hover effects**
- [ ] Al pasar el mouse sobre las cards del flujo, se **elevan ligeramente**
- [ ] Las cards tienen una **sombra más fuerte** en hover
- [ ] El borde de las cards cambia de color

---

### **Checklist de verificación funcional:**

**MUY IMPORTANTE: Verifica que toda la funcionalidad siga funcionando:**

- [ ] **Login funciona:** Puedes iniciar sesión con usuario/contraseña
- [ ] **Actualizar base funciona:** Puedes seleccionar archivo y subir
- [ ] **Generar EECC funciona:** 
  - [ ] El dropdown de Asegurado se llena correctamente
  - [ ] Puedes seleccionar tipo de archivo (PDF, XLSX, ambos)
  - [ ] El botón "Previsualizar" funciona
  - [ ] El botón "Generar" funciona y crea archivos
- [ ] **Modal de correos funciona:**
  - [ ] El modal abre al hacer clic
  - [ ] Puedes seleccionar empresas
  - [ ] Los tabs cambian correctamente
  - [ ] Puedes configurar parámetros
  - [ ] El botón "Enviar" funciona
- [ ] **Modal de bitácora funciona:**
  - [ ] El modal abre al hacer clic
  - [ ] Los filtros funcionan
  - [ ] La tabla muestra datos
  - [ ] Puedes registrar una gestión
  - [ ] El formulario valida campos requeridos
- [ ] **Power BI funciona:**
  - [ ] El toggle expande/colapsa correctamente
  - [ ] El iframe de Power BI carga al expandir
- [ ] **Logout funciona:** Puedes cerrar sesión

---

## 🐛 TROUBLESHOOTING

### **Problema 1: No veo los cambios**
```
Causa: Caché del navegador
Solución:
1. Presiona Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
2. Si no funciona, limpia el caché manualmente (ver Paso 3)
3. Si aún no funciona, intenta con otro navegador
4. Si aún no funciona, espera 1-2 minutos y recarga
```

### **Problema 2: El portal no carga / error 404**
```
Causa: URL antigua o implementación no actualizada
Solución:
1. Verifica que usas la URL correcta del deployment
2. En Google Apps Script, ve a "Implementar" > "Administrar implementaciones"
3. Verifica que la implementación está "Activa"
4. Copia la URL nuevamente y úsala
```

### **Problema 3: Alguna funcionalidad no funciona**
```
Causa: Error al copiar/pegar archivos
Solución:
1. Ve a Google Apps Script Editor
2. Abre "index.html" y verifica que se copió todo el contenido
3. Busca al final del archivo: debe terminar con </html>
4. Haz lo mismo con "styles.html": debe terminar con </style>
5. Si falta contenido, vuelve a copiar/pegar
6. Guarda y re-implementa
```

### **Problema 4: Los estilos se ven raros**
```
Causa: "styles.html" no se actualizó correctamente
Solución:
1. Ve a Google Apps Script Editor
2. Abre "styles.html"
3. Busca la línea que dice "MEJORAS VISUALES v2.5 - Edición Empresarial"
4. Si no existe, es que no se actualizó
5. Vuelve a copiar/pegar el contenido de "styles.html"
6. Guarda y re-implementa
```

### **Problema 5: El footer no aparece**
```
Causa: El scroll no llega hasta el final
Solución:
1. Haz scroll hasta el final de la página
2. El footer debe estar después del "Registro de Actividad"
3. Si no aparece, verifica que "index.html" se actualizó
4. Busca en el código: "FOOTER PROFESIONAL - Tipo SISNET"
5. Si no existe, vuelve a copiar/pegar "index.html"
```

---

## 📞 SOPORTE

### **Si algo no funciona:**

1. **Verifica primero:**
   - [ ] Limpiaste el caché del navegador
   - [ ] Usas la URL correcta
   - [ ] La implementación está activa
   - [ ] Los archivos se copiaron completos

2. **Revisa los documentos:**
   - `RESUMEN_MEJORAS_DISENO_UX.md` - Lista completa de cambios
   - `ANTES_Y_DESPUES_VISUAL.md` - Comparación visual
   - `PLAN_DISENO_PORTAL.md` - Plan técnico detallado

3. **Rollback (volver atrás):**
   ```
   Si necesitas volver a la versión anterior:
   
   1. Ve a "Implementar" > "Administrar implementaciones"
   2. Haz clic en el ícono de lápiz ✏️
   3. En "Nueva versión", selecciona una versión anterior
   4. Haz clic en "Implementar"
   5. Limpia el caché del navegador
   ```

---

## ✅ DEPLOYMENT EXITOSO

Si todos los checks están marcados:

```
┌──────────────────────────────────────────────┐
│  🎉 ¡DEPLOYMENT COMPLETADO CON ÉXITO!       │
├──────────────────────────────────────────────┤
│                                              │
│  ✅ Nombre actualizado a "Portal Cobranzas" │
│  ✅ Flujo de 4 pasos visible                │
│  ✅ Footer corporativo implementado         │
│  ✅ Power BI colapsable funcionando         │
│  ✅ Modales con mejor UX                    │
│  ✅ Toda la funcionalidad preservada        │
│                                              │
│  🚀 Portal listo para uso                   │
└──────────────────────────────────────────────┘
```

**¡Felicitaciones!** El portal ahora tiene un aspecto profesional de nivel empresarial, manteniendo el 100% de su funcionalidad.

---

## 📝 NOTAS ADICIONALES

### **Compartir con usuarios:**
```
Puedes compartir la URL del deployment con todos los usuarios.
No necesitan hacer nada especial, solo abrir el enlace.

Si algún usuario reporta que ve la versión antigua:
- Pídele que presione Ctrl+Shift+R o Cmd+Shift+R
- O que limpie el caché de su navegador
```

### **Actualizaciones futuras:**
```
Para futuras actualizaciones de diseño:

1. Modifica los archivos localmente
2. Copia/pega en Google Apps Script
3. Guarda el proyecto
4. Ve a "Implementar" > "Administrar implementaciones"
5. Edita la implementación activa
6. Selecciona "Nueva versión"
7. Implementa
8. Limpia caché

La URL no cambia, solo se actualiza el contenido.
```

### **Backup recomendado:**
```
Antes de cada cambio importante:

1. Ve a "Archivo" > "Crear versión"
2. Nombre: "Backup - [Fecha]"
3. Haz clic en "Guardar"

Así puedes volver a versiones anteriores si es necesario.
```

---

**Documento generado:** 15 Enero 2025  
**Tiempo estimado de deployment:** 5-10 minutos  
**Dificultad:** ⭐⭐☆☆☆ (Fácil)

