/**
 * @fileoverview Sistema de autenticación enterprise con rate limiting
 * @version 3.0.0
 */

const AuthService = {
  PROPS_KEY: 'auth.users.v2',
  RATE_LIMIT_KEY: 'auth.ratelimit',
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900, // 15 minutos en segundos
  SESSION_CLEANUP_INTERVAL: 3600, // 1 hora

  /**
   * Inicializa usuarios desde bootstrap
   */
  initialize() {
    const context = 'AuthService.initialize';
    try {
      const props = PropertiesService.getScriptProperties();
      const existing = props.getProperty(this.PROPS_KEY);
      
      if (existing) {
        Logger.info(context, 'Users already initialized');
        return { ok: true, message: 'Sistema ya inicializado' };
      }

      const bootstrap = getConfig('AUTH.BOOTSTRAP_USERS', []);
      if (bootstrap.length === 0) {
        throw new Error('No bootstrap users configured');
      }

      const users = bootstrap.map(u => {
        const salt = this._generateSalt();
        const hash = this._strongHash(u.password, salt);
        return { 
          user: u.user.toLowerCase().trim(), 
          salt, 
          hash,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          loginAttempts: 0
        };
      });

      props.setProperty(this.PROPS_KEY, JSON.stringify(users));
      Logger.info(context, 'Users initialized', { count: users.length });
      
      return { ok: true, message: `${users.length} usuarios inicializados` };
    } catch (error) {
      Logger.error(context, 'Initialization failed', error);
      throw error;
    }
  },

  /**
   * Login con rate limiting y protección brute-force
   */
  login(username, password) {
    const context = 'AuthService.login';
    const startTime = Date.now();
    
    try {
      // Sanitizar inputs
      if (!username || !password) {
        Logger.warn(context, 'Missing credentials');
        return { ok: false, error: 'Usuario y contraseña son requeridos' };
      }

      const cleanUsername = String(username).toLowerCase().trim();
      const cleanPassword = String(password);

      // Validar longitud
      if (cleanUsername.length > 50 || cleanPassword.length > 100) {
        Logger.warn(context, 'Input too long', { user: cleanUsername });
        return { ok: false, error: 'Credenciales inválidas' };
      }

      // Rate limiting por IP/usuario
      if (!this._checkRateLimit(cleanUsername)) {
        Logger.warn(context, 'Rate limit exceeded', { user: cleanUsername });
        return { 
          ok: false, 
          error: 'Demasiados intentos fallidos. Intenta nuevamente en 15 minutos.' 
        };
      }

      const users = this._loadUsers();
      if (!users || users.length === 0) {
        Logger.error(context, 'No users found in system');
        return { ok: false, error: 'Sistema no inicializado. Contacta al administrador.' };
      }

      const user = users.find(u => u.user === cleanUsername);
      
      if (!user) {
        this._recordFailedAttempt(cleanUsername);
        Logger.warn(context, 'User not found', { user: cleanUsername });
        // Timing attack prevention - delay fijo
        Utilities.sleep(Math.random() * 500 + 500);
        return { ok: false, error: 'Usuario o contraseña inválidos' };
      }

      // Verificar si cuenta bloqueada
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        Logger.warn(context, 'Account locked', { user: cleanUsername });
        return { 
          ok: false, 
          error: 'Cuenta bloqueada temporalmente. Intenta más tarde.' 
        };
      }

      // Verificar contraseña
      const hash = this._strongHash(cleanPassword, user.salt);
      
      if (hash !== user.hash) {
        this._recordFailedAttempt(cleanUsername);
        this._incrementUserLoginAttempts(cleanUsername);
        Logger.warn(context, 'Invalid password', { user: cleanUsername });
        Utilities.sleep(Math.random() * 500 + 500);
        return { ok: false, error: 'Usuario o contraseña inválidos' };
      }

      // Login exitoso - generar token
      const token = this._generateToken(user.user);
      const ttl = getConfig('AUTH.SESSION_TTL_SEC', 28800);

      try {
        const cache = CacheService.getScriptCache();
        const sessionData = JSON.stringify({
          user: user.user,
          loginAt: new Date().toISOString(),
          ip: this._getClientIP()
        });
        cache.put('sess:' + token, sessionData, ttl);
      } catch (cacheError) {
        Logger.error(context, 'Cache write failed', cacheError);
        return { ok: false, error: 'Error al crear sesión. Intenta de nuevo.' };
      }

      // Actualizar último login y limpiar intentos fallidos
      this._updateLastLogin(cleanUsername);
      this._clearRateLimit(cleanUsername);

      const duration = Date.now() - startTime;
      Logger.info(context, 'Login successful', { 
        user: cleanUsername, 
        durationMs: duration 
      });

      return { 
        ok: true, 
        token, 
        user: user.user,
        expiresIn: ttl 
      };

    } catch (error) {
      Logger.error(context, 'Login failed', error);
      return { 
        ok: false, 
        error: 'Error interno del servidor. Intenta nuevamente.' 
      };
    }
  },

  /**
   * Valida token y retorna usuario
   */
  validateSession(token) {
    const context = 'AuthService.validateSession';
    
    if (!token || typeof token !== 'string') {
      Logger.warn(context, 'Invalid token format');
      throw new Error('Token inválido');
    }

    // Sanitizar token
    const cleanToken = token.trim();
    if (cleanToken.length > 500) {
      Logger.warn(context, 'Token too long');
      throw new Error('Token inválido');
    }

    try {
      const cache = CacheService.getScriptCache();
      const sessionData = cache.get('sess:' + cleanToken);
      
      if (!sessionData) {
        Logger.warn(context, 'Session not found or expired');
        throw new Error('Sesión inválida o expirada');
      }

      const session = JSON.parse(sessionData);
      Logger.debug(context, 'Session validated', { user: session.user });
      
      return session.user;
    } catch (error) {
      if (error.message.includes('Sesión inválida')) {
        throw error;
      }
      Logger.error(context, 'Validation error', error);
      throw new Error('Error validando sesión');
    }
  },

  /**
   * Cierra sesión
   */
  logout(token) {
    const context = 'AuthService.logout';
    
    if (!token) {
      return { ok: true };
    }

    try {
      const cache = CacheService.getScriptCache();
      cache.remove('sess:' + token.trim());
      Logger.info(context, 'Logout successful');
      return { ok: true };
    } catch (error) {
      Logger.error(context, 'Logout failed', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Refresca sesión existente
   */
  refreshSession(token) {
    const context = 'AuthService.refreshSession';
    
    try {
      const username = this.validateSession(token);
      const ttl = getConfig('AUTH.SESSION_TTL_SEC', 28800);
      
      const cache = CacheService.getScriptCache();
      const sessionData = cache.get('sess:' + token);
      
      if (sessionData) {
        cache.put('sess:' + token, sessionData, ttl);
        Logger.info(context, 'Session refreshed', { user: username });
        return { ok: true, message: 'Sesión actualizada' };
      }
      
      return { ok: false, error: 'Sesión no encontrada' };
    } catch (error) {
      Logger.error(context, 'Refresh failed', error);
      return { ok: false, error: error.message };
    }
  },

  /**
   * Cambiar contraseña
   */
  changePassword(username, oldPassword, newPassword) {
    const context = 'AuthService.changePassword';
    
    try {
      // Validaciones
      if (!username || !oldPassword || !newPassword) {
        return { ok: false, error: 'Todos los campos son requeridos' };
      }

      const cleanUsername = String(username).toLowerCase().trim();
      const cleanOldPassword = String(oldPassword);
      const cleanNewPassword = String(newPassword);

      // Validar fortaleza de nueva contraseña
      const passwordValidation = this._validatePasswordStrength(cleanNewPassword);
      if (!passwordValidation.ok) {
        return { ok: false, error: passwordValidation.error };
      }

      const users = this._loadUsers();
      const userIndex = users.findIndex(u => u.user === cleanUsername);

      if (userIndex === -1) {
        Logger.warn(context, 'User not found', { user: cleanUsername });
        return { ok: false, error: 'Usuario no encontrado' };
      }

      const user = users[userIndex];
      const oldHash = this._strongHash(cleanOldPassword, user.salt);

      if (oldHash !== user.hash) {
        Logger.warn(context, 'Invalid old password', { user: cleanUsername });
        return { ok: false, error: 'Contraseña actual incorrecta' };
      }

      // Verificar que no sea igual a la anterior
      const newHashTemp = this._strongHash(cleanNewPassword, user.salt);
      if (newHashTemp === user.hash) {
        return { ok: false, error: 'La nueva contraseña debe ser diferente a la actual' };
      }

      // Generar nuevo salt y hash
      const newSalt = this._generateSalt();
      const newHash = this._strongHash(cleanNewPassword, newSalt);

      users[userIndex].salt = newSalt;
      users[userIndex].hash = newHash;
      users[userIndex].passwordChangedAt = new Date().toISOString();

      // Guardar
      const props = PropertiesService.getScriptProperties();
      props.setProperty(this.PROPS_KEY, JSON.stringify(users));

      Logger.info(context, 'Password changed successfully', { user: cleanUsername });
      return { ok: true, message: 'Contraseña actualizada correctamente' };

    } catch (error) {
      Logger.error(context, 'Password change failed', error);
      return { ok: false, error: 'Error al cambiar contraseña: ' + error.message };
    }
  },

  /**
   * Limpieza de sesiones expiradas (ejecutar periódicamente)
   */
  cleanupExpiredSessions() {
    const context = 'AuthService.cleanupExpiredSessions';
    Logger.info(context, 'Starting cleanup');
    
    try {
      // Las sesiones en Cache se eliminan automáticamente al expirar
      // Este método es para limpieza de datos relacionados
      
      const props = PropertiesService.getScriptProperties();
      const rateLimitData = props.getProperty(this.RATE_LIMIT_KEY);
      
      if (rateLimitData) {
        const limits = JSON.parse(rateLimitData);
        const now = Date.now();
        let cleaned = 0;
        
        Object.keys(limits).forEach(key => {
          if (limits[key].resetAt < now) {
            delete limits[key];
            cleaned++;
          }
        });
        
        if (cleaned > 0) {
          props.setProperty(this.RATE_LIMIT_KEY, JSON.stringify(limits));
          Logger.info(context, 'Cleanup completed', { cleaned });
        }
      }
      
      return { ok: true, cleaned: cleaned || 0 };
    } catch (error) {
      Logger.error(context, 'Cleanup failed', error);
      return { ok: false, error: error.message };
    }
  },

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Genera salt único
   * @private
   */
  _generateSalt() {
    return Utilities.getUuid() + Date.now();
  },

  /**
   * Hash seguro con PBKDF2-like
   * @private
   */
  _strongHash(password, salt) {
    const iterations = getConfig('AUTH.PASSWORD_ITERATIONS', 100);
    let hash = salt + '|' + password;
    
    try {
      for (let i = 0; i < iterations; i++) {
        const bytes = Utilities.newBlob(hash).getBytes();
        const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
        hash = Utilities.base64Encode(digest);
      }
      return hash;
    } catch (error) {
      Logger.error('AuthService._strongHash', 'Hashing failed', error);
      throw new Error('Error en generación de hash');
    }
  },

  /**
   * Genera token firmado
   * @private
   */
  _generateToken(username) {
    try {
      const uuid = Utilities.getUuid();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2);
      const payload = `${username}|${timestamp}|${uuid}|${random}`;
      
      const signature = this._strongHash(payload, getConfig('API.SECRET'));
      return Utilities.base64EncodeWebSafe(payload + '|' + signature);
    } catch (error) {
      Logger.error('AuthService._generateToken', 'Token generation failed', error);
      throw new Error('Error generando token');
    }
  },

  /**
   * Carga usuarios de Properties
   * @private
   */
  _loadUsers() {
    const context = 'AuthService._loadUsers';
    
    try {
      const props = PropertiesService.getScriptProperties();
      const raw = props.getProperty(this.PROPS_KEY);
      
      if (!raw) {
        Logger.warn(context, 'No users found');
        return [];
      }

      const users = JSON.parse(raw);
      if (!Array.isArray(users)) {
        Logger.error(context, 'Users data is not an array');
        throw new Error('Datos de usuarios corruptos');
      }

      return users;
    } catch (error) {
      Logger.error(context, 'Load failed', error);
      return [];
    }
  },

  /**
   * Rate limiting check
   * @private
   */
  _checkRateLimit(username) {
    try {
      const props = PropertiesService.getScriptProperties();
      const rateLimitData = props.getProperty(this.RATE_LIMIT_KEY);
      
      if (!rateLimitData) {
        return true;
      }

      const limits = JSON.parse(rateLimitData);
      const userLimit = limits[username];
      
      if (!userLimit) {
        return true;
      }

      const now = Date.now();
      
      // Si el tiempo de bloqueo pasó
      if (userLimit.resetAt < now) {
        delete limits[username];
        props.setProperty(this.RATE_LIMIT_KEY, JSON.stringify(limits));
        return true;
      }

      // Si está bloqueado
      if (userLimit.attempts >= this.MAX_ATTEMPTS) {
        return false;
      }

      return true;
    } catch (error) {
      Logger.error('AuthService._checkRateLimit', 'Check failed', error);
      return true; // Fail open para evitar bloqueos permanentes
    }
  },

  /**
   * Registra intento fallido
   * @private
   */
  _recordFailedAttempt(username) {
    try {
      const props = PropertiesService.getScriptProperties();
      const rateLimitData = props.getProperty(this.RATE_LIMIT_KEY);
      
      const limits = rateLimitData ? JSON.parse(rateLimitData) : {};
      
      if (!limits[username]) {
        limits[username] = {
          attempts: 0,
          resetAt: Date.now() + (this.LOCKOUT_DURATION * 1000)
        };
      }

      limits[username].attempts++;
      
      // Si alcanza el límite, extender el bloqueo
      if (limits[username].attempts >= this.MAX_ATTEMPTS) {
        limits[username].resetAt = Date.now() + (this.LOCKOUT_DURATION * 1000);
        Logger.warn('AuthService._recordFailedAttempt', 'Account locked', { user: username });
      }

      props.setProperty(this.RATE_LIMIT_KEY, JSON.stringify(limits));
    } catch (error) {
      Logger.error('AuthService._recordFailedAttempt', 'Record failed', error);
    }
  },

  /**
   * Limpia rate limit
   * @private
   */
  _clearRateLimit(username) {
    try {
      const props = PropertiesService.getScriptProperties();
      const rateLimitData = props.getProperty(this.RATE_LIMIT_KEY);
      
      if (!rateLimitData) return;

      const limits = JSON.parse(rateLimitData);
      delete limits[username];
      props.setProperty(this.RATE_LIMIT_KEY, JSON.stringify(limits));
    } catch (error) {
      Logger.error('AuthService._clearRateLimit', 'Clear failed', error);
    }
  },

  /**
   * Incrementa intentos de login en usuario
   * @private
   */
  _incrementUserLoginAttempts(username) {
    try {
      const users = this._loadUsers();
      const userIndex = users.findIndex(u => u.user === username);
      
      if (userIndex === -1) return;

      users[userIndex].loginAttempts = (users[userIndex].loginAttempts || 0) + 1;

      // Bloquear cuenta si supera intentos
      if (users[userIndex].loginAttempts >= this.MAX_ATTEMPTS) {
        users[userIndex].lockedUntil = new Date(Date.now() + (this.LOCKOUT_DURATION * 1000)).toISOString();
      }

      const props = PropertiesService.getScriptProperties();
      props.setProperty(this.PROPS_KEY, JSON.stringify(users));
    } catch (error) {
      Logger.error('AuthService._incrementUserLoginAttempts', 'Failed', error);
    }
  },

  /**
   * Actualiza último login
   * @private
   */
  _updateLastLogin(username) {
    try {
      const users = this._loadUsers();
      const userIndex = users.findIndex(u => u.user === username);
      
      if (userIndex === -1) return;

      users[userIndex].lastLogin = new Date().toISOString();
      users[userIndex].loginAttempts = 0;
      users[userIndex].lockedUntil = null;

      const props = PropertiesService.getScriptProperties();
      props.setProperty(this.PROPS_KEY, JSON.stringify(users));
    } catch (error) {
      Logger.error('AuthService._updateLastLogin', 'Failed', error);
    }
  },

  /**
   * Valida fortaleza de contraseña
   * @private
   */
  _validatePasswordStrength(password) {
    if (password.length < 8) {
      return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    }

    if (password.length > 100) {
      return { ok: false, error: 'La contraseña es demasiado larga' };
    }

    // Verificar complejidad
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const complexityCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

    if (complexityCount < 3) {
      return { 
        ok: false, 
        error: 'La contraseña debe contener al menos 3 de: mayúsculas, minúsculas, números, caracteres especiales' 
      };
    }

    return { ok: true };
  },

  /**
   * Obtiene IP del cliente (simulado en Apps Script)
   * @private
   */
  _getClientIP() {
    try {
      return Session.getTemporaryActiveUserKey() || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  },

  /**
   * Lista usuarios (solo nombres)
   */
  listUsers() {
    try {
      const users = this._loadUsers();
      return users.map(u => ({
        user: u.user,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt
      }));
    } catch (error) {
      Logger.error('AuthService.listUsers', 'Failed to list users', error);
      return [];
    }
  },

  /**
   * Verifica si usuario existe
   */
  userExists(username) {
    try {
      const users = this._loadUsers();
      const cleanUsername = String(username).toLowerCase().trim();
      return users.some(u => u.user === cleanUsername);
    } catch (error) {
      Logger.error('AuthService.userExists', 'Check failed', error);
      return false;
    }
  }
};

// ========== FUNCIONES HELPER ==========

/**
 * Inicializar sistema
 */
function initAuthSystem() {
  try {
    const result = AuthService.initialize();
    Logger.info('initAuthSystem', 'System initialized', result);
    return result.message;
  } catch (error) {
    Logger.error('initAuthSystem', 'Initialization failed', error);
    return '❌ Error: ' + error.message;
  }
}

/**
 * Resetear sistema (CUIDADO)
 */
function resetAuthSystem() {
  try {
    const props = PropertiesService.getScriptProperties();
    props.deleteProperty(AuthService.PROPS_KEY);
    props.deleteProperty(AuthService.RATE_LIMIT_KEY);
    Logger.info('resetAuthSystem', 'Auth system reset');
    return '✅ Sistema reseteado. Ejecuta initAuthSystem() para reinicializar.';
  } catch (error) {
    Logger.error('resetAuthSystem', 'Reset failed', error);
    return '❌ Error: ' + error.message;
  }
}

/**
 * Listar usuarios
 */
function debugListUsers() {
  try {
    const users = AuthService.listUsers();
    Logger.info('debugListUsers', 'Users listed', { count: users.length, users });
    return users;
  } catch (error) {
    Logger.error('debugListUsers', 'Failed', error);
    return [];
  }
}

/**
 * Verificar usuario
 */
function debugCheckUser(username) {
  try {
    const exists = AuthService.userExists(username);
    Logger.info('debugCheckUser', 'User check', { username, exists });
    return exists ? `Usuario "${username}" existe` : `Usuario "${username}" NO existe`;
  } catch (error) {
    Logger.error('debugCheckUser', 'Check failed', error);
    return '❌ Error: ' + error.message;
  }
}

/**
 * Limpieza automática (configurar trigger)
 */
function cleanupAuthSessions() {
  try {
    const result = AuthService.cleanupExpiredSessions();
    Logger.info('cleanupAuthSessions', 'Cleanup completed', result);
    return result;
  } catch (error) {
    Logger.error('cleanupAuthSessions', 'Cleanup failed', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Setup trigger para limpieza automática
 */
function setupAuthCleanupTrigger() {
  try {
    // Eliminar triggers existentes
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'cleanupAuthSessions') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Crear nuevo trigger (cada hora)
    ScriptApp.newTrigger('cleanupAuthSessions')
      .timeBased()
      .everyHours(1)
      .create();

    Logger.info('setupAuthCleanupTrigger', 'Trigger created');
    return '✅ Trigger de limpieza configurado (cada 1 hora)';
  } catch (error) {
    Logger.error('setupAuthCleanupTrigger', 'Failed', error);
    return '❌ Error: ' + error.message;
  }
}
