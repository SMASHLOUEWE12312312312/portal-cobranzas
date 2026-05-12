/**
 * @fileoverview Utilidades administrativas para gestión de usuarios.
 *
 * EJECUTAR MANUALMENTE desde Apps Script Editor:
 *   1. listUsers()           - Lista todos los usuarios (logs)
 *   2. resetUserPassword()   - Resetea password (editar constantes abajo)
 *   3. unlockUser()          - Desbloquea cuenta tras intentos fallidos
 *
 * Los usuarios viven en Script Properties bajo la clave 'auth.users.v2'
 * (ver AuthService.PROPS_KEY en auth.js).
 */

const ADMIN_USERS_KEY = 'auth.users.v2';

/**
 * Lista todos los usuarios registrados (sin exponer hash/salt).
 * Ejecutar y revisar el "Registro de ejecución".
 */
function listUsers() {
  const raw = PropertiesService.getScriptProperties().getProperty(ADMIN_USERS_KEY);
  const users = JSON.parse(raw || '[]');
  if (users.length === 0) {
    console.log('No hay usuarios registrados.');
    return;
  }
  console.log(`Total usuarios: ${users.length}`);
  users.forEach(u => {
    console.log(
      `- ${u.user.padEnd(15)} | creado: ${u.createdAt} | últLogin: ${u.lastLogin || 'nunca'} | intentos: ${u.loginAttempts} | bloqueado: ${u.lockedUntil || 'no'}`
    );
  });
}

/**
 * Resetea la contraseña de un usuario.
 * EDITAR las constantes TARGET_USER y NEW_PASSWORD antes de ejecutar.
 *
 * Reglas de password (de AuthService._validatePasswordStrength):
 *   - Mínimo 8 caracteres, máximo 100
 *   - Al menos una mayúscula, una minúscula, un número y un caracter especial
 */
function resetUserPassword() {
  const TARGET_USER  = '<EDITAR>';         // ← cambiar
  const NEW_PASSWORD = '<EDITAR>';         // ← cambiar (cumplir reglas arriba)

  const props = PropertiesService.getScriptProperties();
  const users = JSON.parse(props.getProperty(ADMIN_USERS_KEY) || '[]');
  const idx = users.findIndex(u => u.user === String(TARGET_USER).toLowerCase().trim());

  if (idx === -1) {
    console.log(`❌ Usuario "${TARGET_USER}" no encontrado.`);
    return;
  }

  const validation = AuthService._validatePasswordStrength(NEW_PASSWORD);
  if (!validation.ok) {
    console.log(`❌ Password inválido: ${validation.error}`);
    return;
  }

  const salt = AuthService._generateSalt();
  users[idx].salt = salt;
  users[idx].hash = AuthService._strongHash(NEW_PASSWORD, salt);
  users[idx].loginAttempts = 0;
  users[idx].lockedUntil = null;
  users[idx].passwordChangedAt = new Date().toISOString();

  props.setProperty(ADMIN_USERS_KEY, JSON.stringify(users));
  console.log(`✅ Password reseteado para "${TARGET_USER}".`);
  console.log(`   Nueva contraseña: ${NEW_PASSWORD}`);
  console.log(`   ⚠️ Comunícala por canal seguro y bórrala de este código.`);
}

/**
 * Desbloquea un usuario tras intentos fallidos / lockout.
 * EDITAR TARGET_USER antes de ejecutar.
 */
function unlockUser() {
  const TARGET_USER = 'admin'; // ← cambiar

  const props = PropertiesService.getScriptProperties();
  const users = JSON.parse(props.getProperty(ADMIN_USERS_KEY) || '[]');
  const idx = users.findIndex(u => u.user === String(TARGET_USER).toLowerCase().trim());

  if (idx === -1) {
    console.log(`❌ Usuario "${TARGET_USER}" no encontrado.`);
    return;
  }

  users[idx].loginAttempts = 0;
  users[idx].lockedUntil = null;
  props.setProperty(ADMIN_USERS_KEY, JSON.stringify(users));
  console.log(`✅ Usuario "${TARGET_USER}" desbloqueado.`);
}
