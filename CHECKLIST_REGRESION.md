# Checklist de Regresión Manual

## Portal Vercel vs Web App GAS

Este checklist permite verificar paridad funcional entre el portal Vercel y el Web App original de Apps Script.

---

## Pre-requisitos

- [ ] Acceso a ambos sistemas (Vercel URL y Web App GAS URL)
- [ ] Credenciales de usuario de prueba
- [ ] Datos de prueba: al menos 1 asegurado con EECC disponible

---

## 1. Autenticación

| Caso | Web App GAS | Vercel | Notas |
|------|:-----------:|:------:|-------|
| Login exitoso | ☐ | ☐ | |
| Login fallido (credenciales inválidas) | ☐ | ☐ | Debe mostrar error |
| Sesión persiste tras refresh | ☐ | ☐ | |
| Logout funciona | ☐ | ☐ | Debe redirigir a login |

---

## 2. Dashboard

| Caso | Web App GAS | Vercel | Notas |
|------|:-----------:|:------:|-------|
| Stats carga correctamente | ☐ | ☐ | |
| Queue health visible | ☐ | ☐ | |
| Power BI colapsable funciona | ☐ | ☐ | |
| Links de acceso rápido funcionan | ☐ | ☐ | |

---

## 3. Actualizar Base

| Caso | Web App GAS | Vercel | Notas |
|------|:-----------:|:------:|-------|
| Selector de archivo funciona | ☐ | ☐ | |
| Flag "tiene encabezados" funciona | ☐ | ☐ | |
| Upload exitoso muestra filas procesadas | ☐ | ☐ | |
| Manejo de archivo inválido | ☐ | ☐ | |
| Log de actividad visible | ☐ | ☐ | |

---

## 4. Generar EECC

| Caso | Web App GAS | Vercel | Notas |
|------|:-----------:|:------:|-------|
| Lista de asegurados carga | ☐ | ☐ | |
| Búsqueda de asegurado funciona | ☐ | ☐ | |
| Preview de datos funciona | ☐ | ☐ | |
| Selección por grupo funciona | ☐ | ☐ | |
| Generación PDF exitosa | ☐ | ☐ | |
| Generación XLSX exitosa | ☐ | ☐ | |
| Links de descarga funcionan | ☐ | ☐ | |
| Opción OBS funciona | ☐ | ☐ | |

---

## 5. Enviar Correos

| Caso | Web App GAS | Vercel | Notas |
|------|:-----------:|:------:|-------|
| Lista de asegurados carga | ☐ | ☐ | |
| Selección múltiple funciona | ☐ | ☐ | |
| "Seleccionar todos" funciona | ☐ | ☐ | |
| Lista de plantillas carga | ☐ | ☐ | |
| Envío de prueba funciona | ☐ | ☐ | |
| Envío masivo funciona | ☐ | ☐ | |
| Reporte de resultados visible | ☐ | ☐ | |
| Queue health status actualiza | ☐ | ☐ | |

---

## 6. Bitácora

| Caso | Web App GAS | Vercel | Notas |
|------|:-----------:|:------:|-------|
| Tabla de ciclos carga | ☐ | ☐ | |
| Filtro por estado funciona | ☐ | ☐ | |
| Filtro por responsable funciona | ☐ | ☐ | |
| Filtro por días funciona | ☐ | ☐ | |
| Búsqueda por nombre/RUC funciona | ☐ | ☐ | |
| Paginación funciona | ☐ | ☐ | |
| Detalle de ciclo abre | ☐ | ☐ | |
| Timeline de gestiones visible | ☐ | ☐ | |
| Nueva gestión modal abre | ☐ | ☐ | |
| Registrar gestión funciona | ☐ | ☐ | |
| Campos dinámicos (compromiso) funcionan | ☐ | ☐ | |

---

## 7. Conciliación

| Caso | Web App GAS | Vercel | Notas |
|------|:-----------:|:------:|-------|
| Status de BD Cruce visible | ☐ | ☐ | |
| Upload BD Sisnet funciona | ☐ | ☐ | |
| Lista de aseguradoras carga | ☐ | ☐ | |
| Upload archivo aseguradora funciona | ☐ | ☐ | |
| Proceso de conciliación ejecuta | ☐ | ☐ | |
| Estadísticas de resultado visibles | ☐ | ☐ | |
| Links de reportes funcionan | ☐ | ☐ | |

---

## 8. UI/UX General

| Caso | Web App GAS | Vercel | Notas |
|------|:-----------:|:------:|-------|
| Navegación sidebar funciona | ☐ | ☐ | |
| Breadcrumbs visibles | ☐ | ☐ | |
| Loading states (skeletons) visibles | ☐ | ☐ | |
| Toast/mensajes de error visibles | ☐ | ☐ | |
| Responsive (mobile) funciona | ☐ | ☐ | |
| Dark mode (si aplica) funciona | ☐ | ☐ | |
| Accesibilidad: navegación teclado | ☐ | ☐ | |
| Accesibilidad: focus visible | ☐ | ☐ | |

---

## 9. Seguridad

| Caso | Vercel | Notas |
|------|:------:|-------|
| Rutas protegidas redirigen a login | ☐ | |
| Token GAS no visible en Network tab | ☐ | |
| Cookie es httpOnly | ☐ | |
| Headers de seguridad presentes | ☐ | |
| RBAC: usuario sin permiso ve error | ☐ | |

---

## Resultado

- **Total casos**: 57
- **GAS Ok**: ____ / 45
- **Vercel Ok**: ____ / 57
- **Paridad**: ____ %

### Observaciones

<!-- Notar cualquier discrepancia o comportamiento inesperado -->



---

### Firma de Verificación

- **Fecha**: ____________
- **Verificador**: ____________
- **Versión Vercel**: ____________
- **Versión GAS**: ____________
