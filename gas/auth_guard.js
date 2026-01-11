/**
 * @fileoverview Guard de autenticación para envío de correos
 */

const AuthGuard = {
  
  /**
   * Verifica si el usuario actual está en whitelist
   * @return {boolean} True si está autorizado
   */
  isAuthorized() {
    const email = Session.getActiveUser().getEmail();
    const whitelist = getConfig('AUTH.WHITELIST_EMAILS', []);
    
    if (whitelist.length === 0) {
      // Si no hay whitelist, permitir a todos (dev mode)
      return true;
    }
    
    const normalized = email.toLowerCase();
    return whitelist.some(e => e.toLowerCase() === normalized);
  },

  /**
   * Valida y lanza error si no autorizado
   * @throws {Error} Si no autorizado
   */
  requireAuth() {
    if (!this.isAuthorized()) {
      const email = Session.getActiveUser().getEmail();
      Logger.warn('AuthGuard.requireAuth', 'Unauthorized access attempt', { email });
      throw new Error('No tienes permisos para acceder a esta funcionalidad. Contacta al administrador.');
    }
  },

  /**
   * Agrega usuario a whitelist
   * @param {string} email - Email del usuario
   */
  addToWhitelist(email) {
    const context = 'AuthGuard.addToWhitelist';
    Logger.info(context, 'Adding to whitelist', { email });

    try {
      const props = PropertiesService.getScriptProperties();
      const key = 'auth.whitelist';
      const raw = props.getProperty(key);
      
      let whitelist = [];
      if (raw) {
        try {
          whitelist = JSON.parse(raw);
        } catch (e) {
          Logger.warn(context, 'Could not parse existing whitelist');
        }
      }

      const normalized = email.toLowerCase();
      if (!whitelist.includes(normalized)) {
        whitelist.push(normalized);
        props.setProperty(key, JSON.stringify(whitelist));
        Logger.info(context, 'Added to whitelist', { email });
      } else {
        Logger.info(context, 'Already in whitelist', { email });
      }

    } catch (error) {
      Logger.error(context, 'Failed to add to whitelist', error);
      throw error;
    }
  },

  /**
   * Remueve usuario de whitelist
   * @param {string} email - Email del usuario
   */
  removeFromWhitelist(email) {
    const context = 'AuthGuard.removeFromWhitelist';
    Logger.info(context, 'Removing from whitelist', { email });

    try {
      const props = PropertiesService.getScriptProperties();
      const key = 'auth.whitelist';
      const raw = props.getProperty(key);
      
      if (!raw) return;

      let whitelist = JSON.parse(raw);
      const normalized = email.toLowerCase();
      whitelist = whitelist.filter(e => e !== normalized);
      
      props.setProperty(key, JSON.stringify(whitelist));
      Logger.info(context, 'Removed from whitelist', { email });

    } catch (error) {
      Logger.error(context, 'Failed to remove from whitelist', error);
      throw error;
    }
  },

  /**
   * Lista usuarios en whitelist
   * @return {Array<string>} Emails autorizados
   */
  listWhitelist() {
    try {
      const props = PropertiesService.getScriptProperties();
      const key = 'auth.whitelist';
      const raw = props.getProperty(key);
      
      if (!raw) return [];
      
      return JSON.parse(raw);

    } catch (error) {
      Logger.error('AuthGuard.listWhitelist', 'Failed to list', error);
      return [];
    }
  }
};

/**
 * Función helper para agregar usuario a whitelist manualmente
 * @param {string} email - Email del usuario
 */
function addUserToMailWhitelist(email) {
  try {
    AuthGuard.addToWhitelist(email);
    return `✅ Usuario ${email} agregado a whitelist de envío de correos`;
  } catch (error) {
    return `❌ Error: ${error.message}`;
  }
}

/**
 * Función helper para listar whitelist
 */
function listMailWhitelist() {
  try {
    const list = AuthGuard.listWhitelist();
    Logger.info('listMailWhitelist', 'Whitelist', { count: list.length, list });
    return list;
  } catch (error) {
    Logger.error('listMailWhitelist', 'Failed', error);
    return [];
  }
}
