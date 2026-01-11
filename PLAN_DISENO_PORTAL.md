# 🎨 PLAN DE DISEÑO - Transperuana Portal Cobranzas
**Fecha:** 15 Enero 2025  
**Objetivo:** Transformar el portal a nivel profesional empresarial SIN tocar lógica

---

## 📊 AUDITORÍA ACTUAL

### **Estructura HTML detectada en index.html:**

1. **Login Section** (líneas 14-33)
   - ID: `loginSection`
   - Elementos sensibles: `username`, `password`, `loginForm`, `loginBtnText`, `loginSpinner`, `loginError`

2. **Portal Section** (líneas 44+)
   - Header con título y usuario (líneas 45-53)
   - Power BI embed (líneas 56-64)
   - Grid de cards (líneas 66+):
     - Card "Actualizar Base de Datos" (líneas 68-87)
       - IDs sensibles: `fileInput`, `hasHeader`, `uploadBtn`, `uploadStatus`
     - Card "Generar Estado de Cuenta" (líneas 89-137)
       - IDs sensibles: `aseguradoSelect`, `exportType`, `previewBtn`, `obsBtn`, `ramSelect`, `generateBtn`, `generateStatus`, `downloadLinks`
     - Card "Enviar EECC por Correo" (líneas 140-149)
       - Función: `openMailModal()`
     - Card "Bitácora de Gestiones EECC" (líneas 151-161)
       - Función: `openBitacoraModal()`

3. **Modales:**
   - Modal Mail (ID: `mailModal`)
   - Modal Bitácora (ID: `bitacoraModal`)

### **Design System (styles.html):**
- Tokens completos: colores, tipografía, espaciados, radios
- Color primario: `#D32F2F` (rojo Transperuana)
- Font: System fonts professional
- Spacing: Sistema 4pt
- Todo listo para uso

---

## 🎯 CAMBIOS OBLIGATORIOS

### 1. **Cambio de Nombre del Portal**
- [ ] Cambiar en `<title>`: "Transperuana · Portal EECC" → "Transperuana · Portal Cobranzas"
- [ ] Cambiar en login: `.login-title`
- [ ] Cambiar en header principal: `.header-title`
- [ ] Cambiar en comentarios de styles.html

### 2. **Footer Tipo SISNET**
```
┌────────────────────────────────────────────────────────────┐
│ Copyright © 2025 Transperuana...  |  Desarrollado por...  │
└────────────────────────────────────────────────────────────┘
```
- Fondo: `--tp-surface-overlay` (#FAFAFA)
- Texto izquierda: "Copyright © 2025 Transperuana Corredores de Seguros S.A. Todos los Derechos Reservados."
- Texto derecha: "Desarrollado por Transperuana"
- Altura: ~60px, padding generoso
- Posición: Sticky bottom

---

## 🎨 PLAN DE MEJORAS VISUALES

### **PRINCIPIOS DE DISEÑO:**
1. **Claridad del Flujo:** Usuario debe ver claramente PASO 1 → 2 → 3 → 4
2. **Jerarquía Visual:** Opciones principales destacadas, secundarias discretas
3. **Respiración:** Más espacios en blanco, cards con más padding
4. **Consistencia:** Todos los elementos usan design tokens
5. **Profesionalismo:** Nivel producto corporativo grande empresa

### **REORGANIZACIÓN DEL LAYOUT:**

#### **Antes (actual):**
```
┌─────────────────────┐
│ Header             │
├─────────────────────┤
│ Power BI           │
├──────────┬──────────┤
│ Actualiz │ Generar  │
├──────────┴──────────┤
│ Enviar             │
├─────────────────────┤
│ Bitácora           │
└─────────────────────┘
```

#### **Después (propuesto):**
```
┌───────────────────────────────────────────┐
│ Header Mejorado + Usuario                 │
├───────────────────────────────────────────┤
│ FLUJO PRINCIPAL DE GESTIÓN                │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐│
│ │PASO 1  │→│PASO 2  │→│PASO 3  │→│PASO 4││
│ │Actualiz││ │Generar ││ │Enviar  ││ │Bitác││
│ └────────┘ └────────┘ └────────┘ └──────┘│
├───────────────────────────────────────────┤
│ DASHBOARD ANALÍTICO (Power BI)            │
│ [Iframe full width, colapsable]           │
├───────────────────────────────────────────┤
│ Footer Tipo SISNET                        │
└───────────────────────────────────────────┘
```

---

## 📝 MEJORAS POR ARCHIVO

### **index.html:**

#### **Cambios de Estructura (SIN tocar IDs ni funciones):**

1. **Header Mejorado:**
   - Añadir contenedor `.header-wrapper` para mejor control
   - Logo/título más destacado
   - Info de usuario mejorada visualmente

2. **Sección "Flujo Principal":**
   ```html
   <section class="workflow-section">
     <h2 class="workflow-title">Flujo Principal de Gestión</h2>
     <div class="workflow-steps">
       <!-- 4 cards horizontales con indicador de paso -->
       <div class="step-card" data-step="1">
         <div class="step-indicator">PASO 1</div>
         [Contenido actual de Actualizar Base]
       </div>
       ... (x4)
     </div>
   </section>
   ```

3. **Power BI Reubicado:**
   - Mover DESPUÉS del flujo principal
   - Hacerlo colapsable/expandible
   - Título más claro: "Dashboard Analítico"

4. **Footer Nuevo:**
   ```html
   <footer class="portal-footer">
     <div class="footer-content">
       <p class="footer-left">
         Copyright © 2025 Transperuana Corredores de Seguros S.A. 
         Todos los Derechos Reservados.
       </p>
       <p class="footer-right">
         Desarrollado por Transperuana
       </p>
     </div>
   </footer>
   ```

#### **Mejoras de Contenido (microcopys):**

- **PASO 1 - Actualizar Base:**
  - Subtítulo: "Sube y actualiza la base de datos de clientes con deuda"
  - Ayuda: "Se deduplicará automáticamente por CUPÓN"

- **PASO 2 - Generar EECC:**
  - Subtítulo: "Genera estados de cuenta en PDF o Excel"
  - Ayuda botones más clara

- **PASO 3 - Enviar:**
  - Subtítulo: "Envía masivamente estados de cuenta por correo"

- **PASO 4 - Bitácora:**
  - Subtítulo: "Registra y consulta el seguimiento de gestiones"

---

### **styles.html:**

#### **Nuevas Clases a Agregar:**

1. **Workflow Section:**
```css
.workflow-section {
  padding: var(--tp-space-8) var(--tp-space-6);
  background: var(--tp-surface);
  border-radius: var(--tp-radius-lg);
  margin-bottom: var(--tp-space-6);
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.workflow-title {
  font-size: var(--tp-text-xl);
  font-weight: var(--tp-font-semibold);
  color: var(--tp-text-primary);
  margin-bottom: var(--tp-space-6);
  text-align: center;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--tp-space-4);
  position: relative;
}

/* Flechas entre pasos (desktop) */
@media (min-width: 1024px) {
  .workflow-steps {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .step-card:not(:last-child)::after {
    content: '→';
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 24px;
    color: var(--tp-primary);
    font-weight: bold;
  }
}

.step-card {
  position: relative;
  /* hereda de .card existente */
}

.step-indicator {
  display: inline-block;
  background: var(--tp-primary);
  color: white;
  padding: var(--tp-space-1) var(--tp-space-3);
  border-radius: var(--tp-radius-full);
  font-size: var(--tp-text-xs);
  font-weight: var(--tp-font-semibold);
  margin-bottom: var(--tp-space-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.step-subtitle {
  font-size: var(--tp-text-sm);
  color: var(--tp-text-secondary);
  margin-top: var(--tp-space-2);
  line-height: var(--tp-leading-normal);
}
```

2. **Footer:**
```css
.portal-footer {
  background: var(--tp-surface-overlay);
  border-top: 1px solid var(--tp-border-light);
  padding: var(--tp-space-5) var(--tp-space-6);
  margin-top: var(--tp-space-8);
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--tp-space-4);
}

.footer-left,
.footer-right {
  font-size: var(--tp-text-sm);
  color: var(--tp-text-secondary);
  margin: 0;
}

.footer-right {
  font-weight: var(--tp-font-medium);
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}
```

3. **Mejoras a Cards Existentes:**
```css
.card {
  /* Mantener lo actual + */
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.card-title {
  /* Mantener lo actual + */
  display: flex;
  align-items: center;
  gap: var(--tp-space-2);
}
```

4. **Power BI Colapsable:**
```css
.pbi-section {
  margin: var(--tp-space-8) 0;
}

.pbi-toggle {
  background: var(--tp-surface);
  border: 1px solid var(--tp-border-light);
  border-radius: var(--tp-radius-md);
  padding: var(--tp-space-4);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.pbi-toggle:hover {
  background: var(--tp-surface-overlay);
  border-color: var(--tp-primary-light);
}

.pbi-toggle-icon {
  transition: transform 0.3s ease;
}

.pbi-toggle.collapsed .pbi-toggle-icon {
  transform: rotate(180deg);
}

.pbi-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.pbi-content.expanded {
  max-height: 800px;
}
```

---

### **ui_send_drawer.html:**

#### **Mejoras Visuales:**
1. Título más claro con subtitle
2. Sección de filtros mejor agrupada visualmente
3. Tabla con mejor spacing y headers destacados
4. Estados con badges más visuales
5. Botones de acción más claros

#### **Sin tocar:**
- IDs de inputs
- Funciones onclick
- Estructura de tabla que JS lee

---

### **bitacora_modal.html:**

#### **Mejoras Visuales:**
1. Header del modal más profesional
2. Tabs con mejor estado activo
3. Filtros mejor agrupados
4. Tabla con zebra striping suave
5. Estados con badges cromáticos consistentes

#### **Sin tocar:**
- IDs de elementos
- Funciones JS
- Estructura de datos

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de terminar, verificar:

- [ ] Título en `<title>` cambiado a "Portal Cobranzas"
- [ ] Título en login cambiado
- [ ] Título en header cambiado
- [ ] Footer agregado y visible
- [ ] Flujo 1→2→3→4 claramente visible
- [ ] Power BI reubicado después del flujo
- [ ] Todas las funciones JS intactas
- [ ] Todos los IDs sensibles intactos
- [ ] Design tokens usados consistentemente
- [ ] Responsive en móvil
- [ ] Sin errores de consola
- [ ] Login funciona
- [ ] Upload funciona
- [ ] Generar funciona
- [ ] Enviar funciona
- [ ] Bitácora funciona

---

## 🎯 RESULTADO ESPERADO

Un portal que transmita:
1. **Profesionalismo:** Nivel producto interno grande empresa
2. **Claridad:** Flujo de trabajo obvio (1→2→3→4)
3. **Modernidad:** Design limpio, espacios generosos, transiciones suaves
4. **Identidad:** Branding Transperuana consistente
5. **Usabilidad:** Fácil de entender para usuarios nuevos

**Todo esto SIN tocar NADA de la lógica funcional.**

---

**INICIO DE IMPLEMENTACIÓN:** A continuación...

