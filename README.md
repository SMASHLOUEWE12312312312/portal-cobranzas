# 🏢 Portal de Cobranzas - Transperuana

Sistema integral de gestión y envío de Estados de Cuenta (EECC) para el área de Cobranzas de Transperuana Corredores de Seguros S.A.

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Uso](#-uso)
- [Módulos Principales](#-módulos-principales)
- [Sistema de Bitácora](#-sistema-de-bitácora)
- [Documentación](#-documentación)
- [Mantenimiento](#-mantenimiento)
- [Soporte](#-soporte)

---

## ✨ Características

### Funcionalidades Principales

- 📊 **Generación Automática de EECC**: Crea estados de cuenta en PDF y Excel con formato profesional
- 📧 **Envío Masivo de Correos**: Sistema de cola para envío eficiente de EECC por email
- 🔐 **Sistema de Autenticación**: Control de acceso seguro con gestión de sesiones
- 📈 **Bitácora de Gestiones**: Registro completo de todas las interacciones con clientes
- 🎨 **Portal Web**: Interfaz intuitiva para operadores de cobranzas
- 🔄 **Importación de Datos**: Carga masiva desde Excel/CSV
- 📥 **Reportes Filtrados**: Exportación de reportes personalizados
- 🔗 **Integración con BI**: Compatible con Power BI, Looker Studio, Data Studio

### Tecnologías

- **Backend**: Google Apps Script (JavaScript)
- **Frontend**: HTML5, CSS3, JavaScript
- **Storage**: Google Sheets (Base de datos)
- **Files**: Google Drive (Archivos generados)
- **Email**: Gmail API (Envío de correos)

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Google Workspace                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐     ┌──────────────┐                 │
│  │ Google Sheets│────▶│  Google Drive│                 │
│  │  (Database)  │     │   (Storage)  │                 │
│  └──────┬───────┘     └──────────────┘                 │
│         │                                                │
│         ▼                                                │
│  ┌─────────────────────────────────┐                    │
│  │    Google Apps Script Engine    │                    │
│  │                                  │                    │
│  │  ┌────────────┐  ┌────────────┐ │                    │
│  │  │ Backend    │  │ Frontend   │ │                    │
│  │  │ (GAS)      │  │ (HTML/JS)  │ │                    │
│  │  └────────────┘  └────────────┘ │                    │
│  └─────────────────────────────────┘                    │
│                                                          │
│  ┌─────────────────────────────────┐                    │
│  │        Gmail API                │                    │
│  │    (Envío de correos)           │                    │
│  └─────────────────────────────────┘                    │
│                                                          │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │   Power BI / Looker   │
            │   (Análisis de datos) │
            └───────────────────────┘
```

### Estructura del Proyecto

```
portal-cobranzas/
│
├── gas/                              # Google Apps Script
│   ├── main.js                      # Entry points y menús
│   ├── config.js                    # Configuración centralizada
│   ├── auth.js                      # Sistema de autenticación
│   ├── auth_guard.js                # Control de acceso
│   ├── eecc_core.js                 # Lógica de generación EECC
│   ├── portal_api.js                # API endpoints
│   ├── drive_io.js                  # Operaciones con Drive
│   ├── sheets_io.js                 # I/O optimizado con Sheets
│   ├── utils.js                     # Utilidades reutilizables
│   ├── logger.js                    # Sistema de logging
│   ├── mailer.js                    # Servicio de correos
│   ├── export.js                    # Exportación PDF/XLSX
│   ├── bitacora.js                  # ⭐ Sistema de bitácora
│   │
│   ├── index.html                   # Portal web principal
│   ├── sidebar.html                 # Sidebar de generación
│   ├── ui_send_drawer.html          # Drawer de envío
│   ├── Upload.html                  # UI de carga de archivos
│   ├── styles.html                  # Estilos compartidos
│   └── appsscript.json              # Configuración del proyecto
│
├── BITACORA_DOCUMENTACION.md       # 📚 Doc completa de bitácora
├── MEJORAS_CODIGO.md                # 📝 Resumen de mejoras implementadas
└── README.md                        # 📖 Este archivo
```

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- Cuenta de Google Workspace con permisos de administrador
- Acceso a Google Drive con espacio disponible
- Google Sheets con la estructura de datos requerida

### Paso 1: Crear el Proyecto en Google Apps Script

1. Abrir [Google Apps Script](https://script.google.com/)
2. Crear nuevo proyecto: `Portal Cobranzas`
3. Copiar todos los archivos de `gas/` al editor

### Paso 2: Configurar Hojas de Cálculo

1. Crear un nuevo Google Sheet: `Portal_Cobranzas_DB`
2. Crear las siguientes hojas:
   - `BD` → Base de datos principal
   - `EECC_Template` → Plantilla de estados de cuenta
   - `Debug_Log` → Logs del sistema
   - `Bitacora` → Bitácora legacy (se mantiene por compatibilidad)
   - `Mail_Contacts` → Contactos para envío de correos
   - `Mail_Queue` → Cola de envío de correos
   - `Mail_Log` → Historial de correos enviados

### Paso 3: Configurar Drive

1. Crear carpeta en Google Drive: `Cobranzas_Transperuana`
2. Obtener el ID de la carpeta (desde la URL)
3. Crear subcarpeta: `Reporte OBS`

### Paso 4: Actualizar Configuración

Editar `gas/config.js`:

```javascript
const CONFIG = {
  // ...
  DRIVE: {
    OUTPUT_FOLDER_ID: 'TU_ID_DE_CARPETA_AQUI',  // ← Cambiar
    LOGO_FILE_ID: 'TU_ID_DE_LOGO_AQUI',         // ← Cambiar
    // ...
  },
  // ...
};
```

### Paso 5: Inicializar el Sistema

1. En Google Sheets, ir al menú: `EECC` → `Inicializar sistema`
2. Autorizar permisos cuando se solicite
3. Esperar confirmación de inicialización exitosa

### Paso 6: Configurar Usuarios

Editar usuarios en `gas/config.js`:

```javascript
AUTH: {
  BOOTSTRAP_USERS: [
    { user: 'usuario1', password: 'Password123!' },
    { user: 'usuario2', password: 'Password456!' },
    // Agregar más usuarios aquí
  ]
}
```

Luego ejecutar desde Apps Script:

```javascript
function resetAndInitAuth() {
  resetAuthSystem();
  initAuthSystem();
}
```

### Paso 7: Publicar como Web App (Opcional)

1. En Apps Script: `Implementar` → `Nueva implementación`
2. Tipo: `Aplicación web`
3. Ejecutar como: `Usuario que accede a la aplicación web`
4. Quién puede acceder: `Solo usuarios de la organización`
5. Copiar la URL de la aplicación web

---

## 💼 Uso

### Generar EECC desde Sheets

1. Abrir el Google Sheet del portal
2. Ir al menú: `EECC` → `Generar EECC`
3. Seleccionar asegurado del dropdown
4. Elegir formato (PDF, Excel, o ambos)
5. Hacer clic en "Generar"
6. Los archivos se guardan automáticamente en Drive

### Enviar EECC por Correo

1. Ir al menú: `EECC` → `📧 Enviar EECC por Correo`
2. Seleccionar destinatarios de la lista
3. Previsualizar el correo (opcional)
4. Hacer clic en "Enviar"
5. El envío se registra automáticamente en la bitácora

### Portal Web (si está publicado)

1. Acceder a la URL de la aplicación web
2. Iniciar sesión con usuario y contraseña
3. Navegar por las opciones:
   - Generar EECC
   - Ver bitácora
   - Enviar correos masivos
   - Consultar historial

### Importar Datos

1. Menú: `Actualizar base` → `Importar desde PC (Excel/CSV)`
2. Seleccionar archivo
3. Confirmar si tiene encabezados
4. Esperar la importación
5. Los duplicados se eliminan automáticamente

### Ver Bitácora de Gestiones

1. Menú: `EECC` → `📊 Ver Bitácora de Gestiones`
2. Se abre la hoja `Bitacora_Gestiones_EECC`
3. Filtrar y analizar según necesidad

---

## 📦 Módulos Principales

### 1. `config.js` - Configuración Centralizada

**Responsabilidad**: Gestión de toda la configuración del sistema

**Componentes clave**:
- `CONFIG.SHEETS`: Nombres de hojas
- `CONFIG.BD`: Estructura de base de datos
- `CONFIG.DRIVE`: Configuración de Drive
- `CONFIG.EXPORT`: Opciones de exportación
- `CONFIG.MAIL`: Configuración de correos
- `CONFIG.BITACORA`: ⭐ Estados de gestión

### 2. `auth.js` - Autenticación

**Responsabilidad**: Sistema de autenticación seguro

**Funciones principales**:
- `AuthService.login(username, password)` → Login con validación
- `AuthService.validateSession(token)` → Validar sesión activa
- `AuthService.logout(token)` → Cerrar sesión
- `AuthService.changePassword(...)` → Cambiar contraseña

### 3. `eecc_core.js` - Generación de EECC

**Responsabilidad**: Lógica central de generación de estados de cuenta

**Funciones principales**:
- `EECCCore.generateWithUI(asegurado, opts)` → Generación con interfaz
- `EECCCore.generateHeadless(asegurado, opts)` → Generación sin interfaz

### 4. `portal_api.js` - API Endpoints

**Responsabilidad**: Endpoints para el portal web

**Funciones principales**:
- `loginPassword(username, password)` → Login API
- `getAseguradosSafe(token)` → Lista de asegurados
- `previewAsegurado(asegurado, maxRows, ...)` → Vista previa de datos
- `generateForAsegurado_API(asegurado, opts, token)` → Generar EECC
- `sendEmailsNow(items, token)` → Envío masivo de correos

### 5. `bitacora.js` - Sistema de Bitácora ⭐

**Responsabilidad**: Registro y seguimiento de gestiones de EECC

**Funciones principales**:
- `BitacoraService.initialize()` → Inicializar sistema
- `BitacoraService.registrarGestion(datos)` → Registrar gestión
- `BitacoraService.actualizarEstadoGestion(...)` → Actualizar estado
- `BitacoraService.buscarGestionPorId(id)` → Buscar por ID
- `BitacoraService.obtenerGestionesPorAsegurado(...)` → Consultar historial

**Funciones API**:
- `apiRegistrarGestion(datos, token)`
- `apiActualizarEstadoGestion(id, estado, datos, token)`
- `apiObtenerGestionesAsegurado(asegurado, filtros, token)`
- `apiObtenerResumenEstados(filtros, token)`

### 6. `mailer.js` - Servicio de Correos

**Responsabilidad**: Envío de correos electrónicos

**Funciones principales**:
- `MailerService.sendEmail(params)` → Enviar correo
- `MailerService.buildAttachments(aseguradoId, opts)` → Preparar adjuntos
- `MailerService.sendTest(params)` → Enviar correo de prueba

### 7. `logger.js` - Sistema de Logging

**Responsabilidad**: Registro estructurado de eventos

**Funciones principales**:
- `Logger.debug(context, message, extra)`
- `Logger.info(context, message, extra)`
- `Logger.warn(context, message, extra)`
- `Logger.error(context, message, errorObj, extra)`

---

## 📊 Sistema de Bitácora

El sistema de bitácora es la **funcionalidad estrella** de esta versión, diseñado para proporcionar trazabilidad completa de todas las gestiones de cobranza.

### ¿Qué Registra?

- ✅ Generación de EECC
- ✅ Envío de correos
- ✅ Actualización de estados
- ✅ Compromisos de pago
- ✅ Derivaciones a otras áreas
- ✅ Cierre de gestiones
- ✅ Errores y excepciones

### Estados Disponibles

| Estado | Descripción |
|--------|-------------|
| `ENVIADO` | EECC enviado exitosamente |
| `SIN_RESPUESTA` | Cliente no ha respondido |
| `COMPROMISO_PAGO` | Cliente comprometió fecha de pago |
| `REPROGRAMADO` | Gestión reprogramada |
| `DERIVADO_COMERCIAL` | Escalado al área Comercial |
| `DERIVADO_RRHH` | Escalado a Gerencia de RRHH |
| `DERIVADO_RIESGOS_GENERALES` | Escalado a Riesgos Generales |
| `CERRADO_PAGADO` | Gestión cerrada - Pago realizado |
| `ERROR` | Error en el proceso |

### Ejemplo de Uso

```javascript
// Registrar una nueva gestión
const resultado = await google.script.run
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

console.log('ID de gestión:', resultado.idGestion);

// Actualizar estado
await google.script.run
  .apiActualizarEstadoGestion(
    resultado.idGestion,
    'COMPROMISO_PAGO',
    {
      observaciones: 'Cliente comprometió pago para el 20/01/2025',
      fechaTentativaPago: new Date('2025-01-20')
    },
    token
  );
```

### Conexión con Power BI

1. Abrir Power BI Desktop
2. `Obtener datos` → `Google Sheets`
3. Seleccionar la hoja `Bitacora_Gestiones_EECC`
4. Crear medidas y visualizaciones

**Medidas DAX sugeridas**:

```dax
Total Gestiones = COUNTROWS('Bitacora_Gestiones_EECC')

Tasa Respuesta = 
DIVIDE(
    CALCULATE(
        COUNTROWS('Bitacora_Gestiones_EECC'),
        'Bitacora_Gestiones_EECC'[ESTADO_GESTION] <> "SIN_RESPUESTA"
    ),
    COUNTROWS('Bitacora_Gestiones_EECC')
)

Tasa Cierre = 
DIVIDE(
    CALCULATE(
        COUNTROWS('Bitacora_Gestiones_EECC'),
        'Bitacora_Gestiones_EECC'[ESTADO_GESTION] = "CERRADO_PAGADO"
    ),
    COUNTROWS('Bitacora_Gestiones_EECC')
)
```

Para más detalles, ver [`BITACORA_DOCUMENTACION.md`](./BITACORA_DOCUMENTACION.md).

---

## 📚 Documentación

### Documentos Disponibles

1. **[BITACORA_DOCUMENTACION.md](./BITACORA_DOCUMENTACION.md)**
   - Documentación completa del sistema de bitácora
   - Guía de uso y extensión
   - Ejemplos de integración con BI
   - FAQ y troubleshooting

2. **[MEJORAS_CODIGO.md](./MEJORAS_CODIGO.md)**
   - Resumen de todas las mejoras implementadas
   - Buenas prácticas aplicadas
   - Comparación antes/después
   - Próximas mejoras recomendadas

3. **Comentarios Inline**
   - Cada archivo `.js` está completamente documentado
   - Formato JSDoc para funciones principales
   - Secciones claramente delimitadas

### Diagramas

Ver `MEJORAS_CODIGO.md` para diagramas de:
- Arquitectura general
- Flujo de generación de EECC
- Flujo de envío de correos
- Integración de la bitácora

---

## 🔧 Mantenimiento

### Tareas Diarias

- ✅ Verificar que los envíos se registren correctamente en la bitácora
- ✅ Revisar la hoja `Debug_Log` en busca de errores

### Tareas Semanales

- ✅ Revisar gestiones con estado `SIN_RESPUESTA` > 7 días
- ✅ Verificar compromisos de pago próximos a vencer

### Tareas Mensuales

- ✅ Ejecutar archivado de gestiones antiguas (función `archivarGestionesAntiguas()`)
- ✅ Revisar y ajustar configuraciones según necesidad

### Tareas Trimestrales

- ✅ Ejecutar verificación de integridad (`verificarIntegridadBitacora()`)
- ✅ Analizar métricas y KPIs en Power BI/Looker
- ✅ Revisar y optimizar triggers automáticos

### Backup

**IMPORTANTE**: Crear copias de seguridad periódicas de:

1. **Google Sheet completo**: `Archivo` → `Hacer una copia`
2. **Proyecto de Apps Script**: `Archivo` → `Crear versión`
3. **Archivos en Drive**: Copiar carpeta `Cobranzas_Transperuana` a otra ubicación

**Frecuencia recomendada**: Semanal

---

## 🐛 Troubleshooting

### Error: "No se pudo inicializar la bitácora"

**Solución**:
1. Verificar que el usuario tenga permisos de edición en el Sheet
2. Ejecutar manualmente: `EECC` → `Inicializar sistema`
3. Verificar logs en `Debug_Log`

### Error: "Session inválida o expirada"

**Solución**:
1. Cerrar sesión y volver a iniciar sesión
2. Verificar que el token no haya expirado (TTL: 8 horas)
3. Limpiar caché del navegador

### Error: "Rate limit exceeded"

**Solución**:
1. Esperar 15 minutos antes de intentar nuevamente
2. Reducir número de correos enviados por lote
3. Verificar que no haya múltiples usuarios enviando simultáneamente

### Los correos no se envían

**Solución**:
1. Verificar que la hoja `Mail_Contacts` tenga datos válidos
2. Verificar que el trigger de cola esté activo: `EECC` → `Configurar triggers de cola`
3. Revisar la hoja `Mail_Log` para ver el historial de envíos
4. Verificar cuota de Gmail (máximo 500 correos/día para cuentas Workspace estándar)

### La bitácora no registra gestiones

**Solución**:
1. Verificar que la hoja `Bitacora_Gestiones_EECC` exista
2. Ejecutar: `EECC` → `Inicializar sistema`
3. Verificar logs en `Debug_Log` para ver errores específicos
4. Verificar que `CONFIG.FEATURES.ENABLE_BITACORA` esté en `true` (si aplica)

---

## 🆘 Soporte

### Contacto

- **Equipo de Desarrollo**: dev@transperuana.com
- **Área de Cobranzas**: cobranzas@transperuana.com
- **Soporte Técnico**: soporte@transperuana.com

### Reportar Issues

1. Describir el problema detalladamente
2. Incluir capturas de pantalla si es posible
3. Adjuntar logs relevantes de `Debug_Log`
4. Indicar pasos para reproducir el error

### Solicitar Mejoras

1. Describir la funcionalidad deseada
2. Explicar el caso de uso
3. Indicar prioridad (Alta, Media, Baja)
4. Enviar a dev@transperuana.com

---

## 📝 Changelog

### Version 1.0.0 (2025-01-13)

**Nuevas Funcionalidades**:
- ⭐ Sistema completo de bitácora de gestiones
- ⭐ API completa para portal web
- ⭐ Integración con herramientas de BI

**Mejoras**:
- ✅ Código completamente refactorizado y documentado
- ✅ Configuración centralizada
- ✅ Logging estructurado
- ✅ Manejo de errores robusto
- ✅ Arquitectura modular

**Documentación**:
- 📚 BITACORA_DOCUMENTACION.md (completo)
- 📝 MEJORAS_CODIGO.md (completo)
- 📖 README.md (este archivo)

---

## 📄 Licencia

Copyright © 2025 Transperuana Corredores de Seguros S.A.

Todos los derechos reservados. Este sistema es de uso interno exclusivo de Transperuana Corredores de Seguros S.A.

---

## 👥 Créditos

**Desarrollado por**: Equipo de Desarrollo Transperuana  
**Colaboradores**: Área de Cobranzas  
**Última actualización**: 13 de Enero de 2025  
**Versión**: 1.0.0

---

<div align="center">

**[⬆ Volver arriba](#-portal-de-cobranzas---transperuana)**

---

Hecho con 💙 por Transperuana

</div>

