/**
 * @fileoverview Configuración segura de secretos en PropertiesService
 * @version 4.1.0 - Post-auditoría
 * 
 * EJECUTAR MANUALMENTE desde Apps Script Editor:
 * 1. setupSecureProperties() - Primera configuración
 * 2. rotateApiSecretWithCutover() - Rotar API_SECRET sin tumbar sesiones
 * 3. removeOldSecret() - Eliminar API_SECRET_OLD después de 24-48h
 * 4. verifySecureProperties() - Verificar configuración
 */

// ========== SETUP INICIAL ==========

/**
 * Configura secretos en PropertiesService
 * NO sobrescribe si ya existen (protección contra ejecución duplicada)
 */
function setupSecureProperties() {
    const props = PropertiesService.getScriptProperties();
    let changes = [];

    // 1. API_SECRET - NO sobrescribir si existe
    const existingSecret = props.getProperty('API_SECRET');
    if (existingSecret) {
        console.log('⚠️ API_SECRET ya existe - NO se modificó');
        console.log('   → Para rotar, usa rotateApiSecretWithCutover()');
    } else {
        const newSecret = generateSecureSecret_(64);
        props.setProperty('API_SECRET', newSecret);
        console.log('✅ API_SECRET configurado (nuevo)');
        changes.push('API_SECRET');
    }

    // 2. BOOTSTRAP_USERS - NO sobrescribir si existe
    const existingUsers = props.getProperty('BOOTSTRAP_USERS');
    if (existingUsers) {
        console.log('⚠️ BOOTSTRAP_USERS ya existe - NO se modificó');
        console.log('   → Para resetear, usa resetBootstrapUsers()');
    } else {
        const users = [
            { user: 'cobranzas1', password: generateSecurePassword_() },
            { user: 'cobranzas2', password: generateSecurePassword_() },
            { user: 'admin', password: generateSecurePassword_() },
            { user: 'admin1', password: generateSecurePassword_() },
            { user: 'admin2', password: generateSecurePassword_() },
            { user: 'admin3', password: generateSecurePassword_() },
            { user: 'admin4', password: generateSecurePassword_() }
        ];
        props.setProperty('BOOTSTRAP_USERS', JSON.stringify(users));
        console.log('✅ BOOTSTRAP_USERS configurados:');
        users.forEach(u => console.log(`   - ${u.user}: [GENERATED-TEMP] ← Cambiar tras primer login`));
        changes.push('BOOTSTRAP_USERS');

        // Retornar passwords SOLO en este caso (setup inicial, ejecución manual)
        // El usuario necesita las credenciales para el primer login
        return {
            ok: true,
            changes: changes,
            credentials: users.map(u => ({ user: u.user, password: u.password })),
            message: '⚠️ GUARDAR CREDENCIALES - Se muestran una sola vez'
        };
    }

    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Ejecutar initAuthSystem() para activar usuarios');
    console.log('   2. Hacer deploy: clasp push && clasp deploy');
    console.log('   3. Probar login en portal');

    return {
        ok: true,
        changes: changes,
        credentials: null,
        message: changes.length > 0 ? 'Configuración completada' : 'Sin cambios (ya configurado)'
    };
}

// ========== ROTACIÓN CON CUTOVER ==========

/**
 * Rota API_SECRET sin invalidar sesiones activas
 * 1. Guarda el actual en API_SECRET_OLD (ventana 24-48h)
 * 2. Genera nuevo API_SECRET
 */
function rotateApiSecretWithCutover() {
    const props = PropertiesService.getScriptProperties();
    const current = props.getProperty('API_SECRET');

    if (!current) {
        console.log('❌ No hay API_SECRET actual - usa setupSecureProperties() primero');
        return { ok: false, error: 'No API_SECRET to rotate' };
    }

    // Guardar actual como OLD
    props.setProperty('API_SECRET_OLD', current);
    console.log('✅ API_SECRET actual → API_SECRET_OLD');

    // Generar nuevo
    const newSecret = generateSecureSecret_(64);
    props.setProperty('API_SECRET', newSecret);
    console.log('✅ Nuevo API_SECRET generado');
    console.log('');
    console.log('⏳ IMPORTANTE:');
    console.log('   - Ventana de migración activa (tokens antiguos siguen funcionando)');
    console.log('   - Ejecutar removeOldSecret() en 24-48 horas');
    console.log('   - Nuevos tokens se firman con nuevo secret');

    return { ok: true, message: 'Rotación completada - eliminar OLD en 24-48h' };
}

/**
 * Elimina API_SECRET_OLD - Tokens antiguos dejarán de funcionar
 */
function removeOldSecret() {
    const props = PropertiesService.getScriptProperties();
    const old = props.getProperty('API_SECRET_OLD');

    if (!old) {
        console.log('✅ API_SECRET_OLD no existe - sistema limpio');
        return { ok: true, message: 'Already clean' };
    }

    props.deleteProperty('API_SECRET_OLD');
    console.log('✅ API_SECRET_OLD eliminado');
    console.log('⚠️ Tokens firmados con el secret anterior ya no son válidos');
    console.log('   (Los usuarios deberán re-loguearse)');

    return { ok: true, message: 'Old secret removed' };
}

/**
 * Resetea BOOTSTRAP_USERS con nuevos passwords
 * Útil para regenerar credenciales o agregar usuarios faltantes
 */
function resetBootstrapUsers() {
    const props = PropertiesService.getScriptProperties();

    const users = [
        { user: 'cobranzas1', password: generateSecurePassword_() },
        { user: 'cobranzas2', password: generateSecurePassword_() },
        { user: 'admin', password: generateSecurePassword_() },
        { user: 'admin1', password: generateSecurePassword_() },
        { user: 'admin2', password: generateSecurePassword_() },
        { user: 'admin3', password: generateSecurePassword_() },
        { user: 'admin4', password: generateSecurePassword_() }
    ];

    props.setProperty('BOOTSTRAP_USERS', JSON.stringify(users));

    console.log('✅ BOOTSTRAP_USERS reseteados (7 usuarios):');
    users.forEach(u => console.log(`   - ${u.user}: [GENERATED]`));
    console.log('');
    console.log('⚠️ IMPORTANTE:');
    console.log('   1. Ejecutar initAuthSystem() para aplicar');
    console.log('   2. Ejecutar verCredenciales() para ver passwords');

    return { ok: true, usersCreated: users.length };
}

// ========== VERIFICACIÓN ==========

/**
 * Verifica configuración de secretos
 */
function verifySecureProperties() {
    const props = PropertiesService.getScriptProperties();

    const checks = {
        API_SECRET: !!props.getProperty('API_SECRET'),
        BOOTSTRAP_USERS: !!props.getProperty('BOOTSTRAP_USERS'),
        API_SECRET_OLD: !!props.getProperty('API_SECRET_OLD')
    };

    console.log('🔍 Verificación de secretos:');
    console.log('   API_SECRET:      ' + (checks.API_SECRET ? '✅ Configurado' : '❌ FALTA'));
    console.log('   BOOTSTRAP_USERS: ' + (checks.BOOTSTRAP_USERS ? '✅ Configurado' : '❌ FALTA'));
    console.log('   API_SECRET_OLD:  ' + (checks.API_SECRET_OLD ? '⏳ Migración activa' : '✅ Limpio'));

    const ready = checks.API_SECRET && checks.BOOTSTRAP_USERS;
    console.log('');
    console.log(ready ? '✅ Sistema listo para producción' : '❌ Faltan configuraciones');

    return {
        ok: ready,
        checks: checks,
        migrationActive: checks.API_SECRET_OLD
    };
}

/**
 * Auditoría rápida - busca secretos hardcoded
 */
function auditHardcodedSecrets() {
    console.log('🔍 Auditoría de secretos hardcoded');
    console.log('');
    console.log('Ejecutar en terminal:');
    console.log('   grep -rn "tr@nsP-2025" gas/');
    console.log('   grep -rn "Transperuana[0-9]@" gas/');
    console.log('');
    console.log('Resultado esperado: 0 coincidencias');

    return { ok: true, message: 'Ejecutar comandos manualmente' };
}

/**
 * Ver credenciales de usuarios bootstrap
 * SOLO ejecutar manualmente cuando sea necesario
 * NOTA: Passwords NO se muestran en logs por seguridad, solo en el return
 */
function verCredenciales() {
    const props = PropertiesService.getScriptProperties();
    const usersJson = props.getProperty('BOOTSTRAP_USERS');

    if (!usersJson) {
        console.log('❌ No hay BOOTSTRAP_USERS configurados');
        return { ok: false, error: 'No users configured' };
    }

    const users = JSON.parse(usersJson);
    console.log('🔐 Usuarios bootstrap configurados:');
    console.log('');
    users.forEach(u => {
        console.log(`   Usuario: ${u.user} | Password: [HIDDEN]`);
    });
    console.log('');
    console.log('💡 Ver passwords en el objeto de retorno (Execution Log > Return value)');
    console.log('⚠️ IMPORTANTE: Cambiar contraseñas después del primer login');

    // Passwords solo en return, NO en logs
    return { ok: true, users: users.map(u => ({ user: u.user, password: u.password })) };
}

// ========== SETUP COMPLETO (UN SOLO PASO) ==========

/**
 * 🚀 SETUP COMPLETO - Ejecuta todo en un solo paso
 * 
 * Este función hace:
 * 1. Reset del sistema de auth (borra auth.users.v2)
 * 2. Regenera BOOTSTRAP_USERS con nuevas contraseñas
 * 3. Inicializa AuthService con los nuevos usuarios/hashes
 * 4. Muestra las credenciales en los logs
 * 
 * DESPUÉS DE EJECUTAR:
 * ⚠️ Hacer nuevo deployment de Web App (Deploy > New deployment)
 */
function setupCompleto() {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║        🚀 SETUP COMPLETO DEL SISTEMA DE AUTH           ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');

    const props = PropertiesService.getScriptProperties();

    // ========== PASO 1: Reset Auth System ==========
    console.log('📌 PASO 1: Reseteando sistema de autenticación...');
    try {
        props.deleteProperty('auth.users.v2');
        props.deleteProperty('auth.ratelimit');
        console.log('   ✅ Sistema de auth reseteado (auth.users.v2 eliminado)');
    } catch (e) {
        console.log('   ⚠️ Error en reset: ' + e.message);
    }
    console.log('');

    // ========== PASO 2: Regenerar Bootstrap Users ==========
    console.log('📌 PASO 2: Generando nuevos usuarios bootstrap...');
    const users = [
        { user: 'cobranzas1', password: generateSecurePassword_() },
        { user: 'cobranzas2', password: generateSecurePassword_() },
        { user: 'admin', password: generateSecurePassword_() },
        { user: 'admin1', password: generateSecurePassword_() },
        { user: 'admin2', password: generateSecurePassword_() },
        { user: 'admin3', password: generateSecurePassword_() },
        { user: 'admin4', password: generateSecurePassword_() }
    ];
    props.setProperty('BOOTSTRAP_USERS', JSON.stringify(users));
    console.log('   ✅ ' + users.length + ' usuarios generados con nuevas contraseñas');
    console.log('');

    // ========== PASO 3: Inicializar Auth System ==========
    console.log('📌 PASO 3: Inicializando sistema de autenticación...');
    try {
        const result = AuthService.initialize();
        console.log('   ✅ ' + result.message);
    } catch (e) {
        console.log('   ❌ Error al inicializar: ' + e.message);
        return { ok: false, error: e.message };
    }
    console.log('');

    // ========== PASO 4: Mostrar Credenciales ==========
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║        🔐 CREDENCIALES DE ACCESO                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    users.forEach((u, i) => {
        console.log(`   ${i + 1}. Usuario:  ${u.user}`);
        console.log(`      Password: ${u.password}`);
        console.log('      ────────────────────────────────');
    });
    console.log('');

    // ========== RECORDATORIO FINAL ==========
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  PASO FINAL REQUERIDO: REDEPLOY WEB APP            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('   Para que los cambios surtan efecto:');
    console.log('   1. Ve a Deploy > Manage deployments');
    console.log('   2. Haz clic en el ícono de editar (lápiz)');
    console.log('   3. Selecciona "New version" en el dropdown');
    console.log('   4. Haz clic en "Deploy"');
    console.log('');
    console.log('   Una vez hecho esto, prueba el login con las credenciales.');
    console.log('');

    return {
        ok: true,
        message: 'Setup completo exitoso',
        usersCreated: users.length,
        credentials: users.map(u => ({ user: u.user, password: u.password })),
        nextStep: 'REDEPLOY WEB APP: Deploy > Manage deployments > Edit > New version > Deploy'
    };
}

// ========== FUNCIÓN TEMPORAL ==========

/**
 * ⚠️ FUNCIÓN TEMPORAL - ELIMINAR DESPUÉS DE USAR
 * Muestra credenciales directamente en logs para configuración inicial
 */
function verCredencialesTemp() {
    const props = PropertiesService.getScriptProperties();
    const usersJson = props.getProperty('BOOTSTRAP_USERS');

    if (!usersJson) {
        console.log('❌ No hay BOOTSTRAP_USERS configurados');
        return;
    }

    const users = JSON.parse(usersJson);
    console.log('');
    console.log('========================================');
    console.log('🔐 CREDENCIALES DE USUARIOS BOOTSTRAP');
    console.log('========================================');
    console.log('');
    users.forEach(u => {
        console.log(`   👤 Usuario:    ${u.user}`);
        console.log(`   🔑 Password:   ${u.password}`);
        console.log('   ----------------------------------------');
    });
    console.log('');
    console.log('⚠️ IMPORTANTE: Eliminar esta función después de usar');
    console.log('⚠️ IMPORTANTE: Cambiar contraseñas después del primer login');
}

// ========== HELPERS INTERNOS ==========

/**
 * Genera secret aleatorio seguro
 * @private
 */
function generateSecureSecret_(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let result = '';
    for (let i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Genera password seguro para bootstrap
 * Formato: Tp{12 chars aleatorios}!
 * @private
 */
function generateSecurePassword_() {
    const uuid = Utilities.getUuid().replace(/-/g, '');
    return 'Tp' + uuid.substring(0, 12) + '!';
}
