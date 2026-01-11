# 🚀 INICIO RÁPIDO - Bitácora v3.0

**Estado:** ✅ **100% IMPLEMENTADO - LISTO PARA USAR**

---

## ⚡ PRIMEROS PASOS (5 minutos)

### PASO 1: Inicializar la Bitácora

Tienes **DOS OPCIONES** para inicializar la Bitácora v3.0:

#### OPCIÓN A: Desde el Menú (MÁS FÁCIL) ⭐

1. Abre tu **hoja de cálculo** de Google Sheets
2. Ve al menú **EECC**
3. Click en **"🔧 Inicializar Bitácora v3.0"**
4. Confirma en el diálogo
5. ¡Listo! Verás un mensaje de confirmación

#### OPCIÓN B: Desde el Editor de Scripts

Si prefieres ejecutar código directamente:

```javascript
// Opción B.1: Con UI y mensajes de confirmación
function inicializarBitacoraV3() {
  const result = BitacoraService.initialize();
  Logger.log(result);
}

// Opción B.2: Solo testing (sin UI)
function testBitacoraV3Initialize() {
  const result = BitacoraService.initialize();
  Logger.log(result);
  return result;
}
```

**Resultado en ambas opciones:** Se crea la hoja `Bitacora_Gestiones_EECC` con 14 headers.

---

### PASO 2: Probar el Portal

1. **Abrir el Portal:**
   - Ejecuta `doGet()` o abre la URL de tu web app

2. **Inicia Sesión:**
   - Usuario y contraseña configurados

3. **Verás la Nueva Card:**
   ```
   📝 Bitácora de Gestiones EECC
   Revisa el estado de las gestiones con los clientes y registra seguimientos
   [📝 Abrir bitácora]
   ```

4. **Haz Click en "Abrir bitácora":**
   - Se abre el modal con 2 tabs

---

### PASO 3: Registrar Tu Primera Gestión

**Tab 1: Estado Actual**
- Verás la tabla vacía (aún no hay ciclos)

**Tab 2: Registrar Gestión**
1. Selecciona un **Asegurado** (combo)
2. El **RUC**, **Fecha Envío EECC** y **Responsable** se llenan automáticamente
3. Selecciona **Tipo de Gestión:** "Llamada telefónica"
4. Selecciona **Estado:** "En seguimiento"
5. Selecciona **Canal:** "Llamada telefónica"
6. Escribe **Próxima Acción:** "Llamar el lunes para confirmar"
7. (Opcional) Escribe **Observaciones:** "Cliente solicitó más tiempo"
8. Click en **💾 Registrar Gestión**

**Resultado:** ✅ Gestión registrada exitosamente

---

### PASO 4: Verificar en la Hoja

1. Abre la hoja `Bitacora_Gestiones_EECC`
2. Verás:
   - `ID_CICLO`: CIC_{ASEGURADO}_{TIMESTAMP}
   - `ID_GESTION`: GES_{ASEGURADO}_{TIMESTAMP}
   - `ORIGEN_REGISTRO`: MANUAL_PORTAL
   - Todos los campos llenados correctamente

---

## 📋 VALIDACIONES DINÁMICAS

El formulario valida automáticamente según el **Estado** seleccionado:

| Estado | Fecha Compromiso | Observaciones |
|--------|------------------|---------------|
| Compromiso de pago | **Obligatoria** | Opcional |
| Reprogramado | **Obligatoria** | Opcional |
| Derivado Comercial | Opcional | **Obligatoria** |
| Derivado RRHH | Opcional | **Obligatoria** |
| Derivado Riesgos Generales | Opcional | **Obligatoria** |
| No cobrable | Opcional | **Obligatoria** |
| Otros | Opcional | Opcional |

Los asteriscos (*) aparecen/desaparecen dinámicamente en el formulario.

---

## 🔄 FLUJO AUTOMÁTICO (Próximo Paso Recomendado)

**Actualmente:** El envío de EECC por correo NO crea ciclos automáticamente (usa el sistema antiguo).

**Para activar:**
1. Abre `portal_api.js`
2. Busca la función `sendEmailsNow()` (línea ~724)
3. Localiza donde se llama `BitacoraService.registrarGestion(datosGestion)`
4. **Reemplaza** con:

```javascript
// CAMBIO RECOMENDADO: Usar crearCiclo() en lugar de registrarGestion()
try {
  const datosCiclo = {
    asegurado: contact.aseguradoNombre,
    ruc: contact.ruc || '', // Verifica que contact tenga RUC
    observaciones: 'EECC enviado por correo electrónico'
  };
  
  const bitacoraResult = BitacoraService.crearCiclo(datosCiclo);
  
  if (bitacoraResult.ok) {
    Logger.info(context, 'Ciclo creado', { 
      idCiclo: bitacoraResult.idCiclo, 
      asegurado: contact.aseguradoNombre 
    });
    result.bitacoraIdCiclo = bitacoraResult.idCiclo; // Agregar al resultado
  } else {
    Logger.warn(context, 'Advertencia: no se pudo crear ciclo', bitacoraResult);
  }
} catch (bitacoraError) {
  Logger.error(context, 'Error al crear ciclo (no crítico)', bitacoraError);
}
```

**¿Por qué?**
- `crearCiclo()` genera un nuevo `ID_CICLO` cada vez que se envía EECC
- `registrarGestion()` (antiguo) no tiene el concepto de ciclo

**Cuándo hacer esto:**
- Cuando quieras que el envío automático de EECC cree ciclos en la bitácora v3.0
- **No es obligatorio ahora** - El sistema manual ya funciona perfecto

---

## 📊 FILTROS DISPONIBLES (Tab 1)

**Filtros Simples y Potentes:**
- **Asegurado:** Ver solo un cliente
- **Estado:** Filtrar por estado de gestión
- **Responsable:** Ver gestiones de un usuario
- **Días desde registro:** Antigüedad del ciclo
  - 0-7 días (verde)
  - 8-30 días (azul)
  - 31-60 días (naranja)
  - Más de 60 días (rojo)

Todos los filtros funcionan **en tiempo real**.

---

## 🎨 BADGES DE COLOR

**Estados:**
- 🟡 **Sin respuesta** - Naranja
- 🔵 **En seguimiento** - Azul claro
- 🔵 **Compromiso de pago** - Azul
- 🟠 **Reprogramado** - Naranja
- 🟣 **Derivado Comercial** - Púrpura
- 🟣 **Derivado RRHH** - Púrpura
- 🟣 **Derivado Riesgos Generales** - Púrpura
- 🟢 **Cerrado/Pagado** - Verde
- 🔴 **No cobrable** - Rojo

**Días:**
- 🟢 **0-7 días** - Verde
- 🔵 **8-30 días** - Azul
- 🟠 **31-60 días** - Naranja
- 🔴 **>60 días** - Rojo

---

## 🧪 TESTING RÁPIDO

### Test 1: Registrar Gestión Manual
1. Abrir bitácora
2. Tab 2 → Llenar formulario
3. Registrar
4. Volver a Tab 1 → Ver ciclo creado

**Resultado:** ✅ Ciclo visible en tabla con badge "En seguimiento"

---

### Test 2: Registrar Compromiso de Pago
1. Tab 1 → Click en "➕ Gestión" de un ciclo
2. Tab 2 se llena automáticamente
3. Cambiar Estado a "Compromiso de pago"
4. Llenar **Fecha de Compromiso** (aparece asterisco *)
5. Registrar

**Resultado:** ✅ Gestión registrada, mismo ID_CICLO, nueva ID_GESTION

---

### Test 3: Validar Fecha Compromiso Obligatoria
1. Tab 2 → Estado "Compromiso de pago"
2. NO llenar Fecha de Compromiso
3. Intentar registrar

**Resultado:** ❌ Error "El estado COMPROMISO_PAGO requiere FECHA_COMPROMISO"

---

### Test 4: Validar Observaciones Obligatorias
1. Estado "No cobrable"
2. NO llenar Observaciones
3. Intentar registrar

**Resultado:** ❌ Error "El estado NO_COBRABLE requiere OBSERVACIONES"

---

### Test 5: Filtros
1. Tab 1
2. Filtrar por Estado: "Compromiso de pago"

**Resultado:** ✅ Tabla muestra solo ciclos con ese estado

---

## 📁 ARCHIVOS CLAVE

| Archivo | Líneas | Qué Hace |
|---------|--------|----------|
| `config.js` | +119 | Configuración BITACORA v3.0 (estados, tipos, canales) |
| `bitacora_v3.js` | 800+ | Backend completo con ciclos y batch processing |
| `portal_api.js` | +324 | 6 endpoints nuevos para API |
| `index.html` | +414 | Card, modal (2 tabs) y funciones JS |

---

## 🔍 CHECKLIST DE VERIFICACIÓN

Después de implementar, verifica que:

- [ ] ✅ Hoja `Bitacora_Gestiones_EECC` creada con 14 headers
- [ ] ✅ Card "📝 Bitácora de Gestiones EECC" visible en portal
- [ ] ✅ Modal abre con 2 tabs (Estado Actual | Registrar Gestión)
- [ ] ✅ Tab 1: Tabla con filtros funcionales
- [ ] ✅ Tab 2: Formulario con validación dinámica
- [ ] ✅ Registro manual funciona (crea ID_CICLO e ID_GESTION)
- [ ] ✅ Auto-llenado de RUC, Responsable y Fecha Envío EECC
- [ ] ✅ Validación de FECHA_COMPROMISO para "Compromiso de pago"
- [ ] ✅ Validación de OBSERVACIONES para "Derivaciones"
- [ ] ✅ Badges de color visibles en Tab 1
- [ ] ✅ Filtros funcionan en tiempo real
- [ ] ✅ Botón "➕ Gestión" prellena Tab 2

---

## ❓ FAQs RÁPIDAS

**Q: ¿Tengo que migrar datos de bitacora.js antiguo?**  
A: No, `bitacora_v3.js` es un sistema nuevo e independiente. El antiguo sigue funcionando.

**Q: ¿Puedo usar ambos sistemas (v2 y v3) al mismo tiempo?**  
A: Sí, son independientes. Cuando estés listo, puedes migrar completamente a v3.

**Q: ¿El envío automático de EECC ya usa v3?**  
A: No, aún usa el sistema antiguo. Ver sección "FLUJO AUTOMÁTICO" arriba para activarlo.

**Q: ¿Puedo agregar más estados?**  
A: Sí, actualiza `CONFIG.BITACORA.ESTADOS` en `config.js` y agrega el badge en `getEstadoBadge()` (index.html).

**Q: ¿Dónde veo los logs?**  
A: En la hoja `Debug_Log` (si está habilitado en config) o en el editor de Apps Script → View → Logs.

**Q: ¿Qué pasa si falla el registro en bitácora?**  
A: No bloquea el proceso principal (ej. envío EECC). Se loguea el error y continúa.

---

## 📞 SOPORTE

**Documentación Completa:**
- `BITACORA_V3_COMPLETA.md` - Resumen ejecutivo (QUÉ se hizo)
- `BITACORA_V3_IMPLEMENTACION.md` - Detalles técnicos (CÓMO se hizo)
- `INICIO_RAPIDO_BITACORA.md` - Este documento (CÓMO EMPEZAR)

**¿Problemas?**
1. Verifica que `BitacoraService.initialize()` se ejecutó correctamente
2. Revisa la hoja `Debug_Log` para errores
3. Usa el editor de Apps Script → View → Logs
4. Verifica que `CONFIG.BITACORA` existe en `config.js`

---

## 🎉 ¡LISTO PARA USAR!

**El sistema está 100% implementado y funcional.**

Empieza registrando tu primera gestión manual y luego, cuando estés listo, integra el flujo automático.

**¡Disfruta de tu nueva Bitácora v3.0! 🚀**

---

**Desarrollado con 💙 por el equipo de Transperuana**  
**Versión:** 3.0.0 | **Fecha:** 14 de Noviembre, 2025

