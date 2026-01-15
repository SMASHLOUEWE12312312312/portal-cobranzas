/**
 * @fileoverview ErrorHandler centralizado - Fase 1 Enterprise Foundations
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * @lastModified 2026-01-15
 * 
 * CARACTERÍSTICAS:
 * - Categorización de errores (NETWORK, SHEETS, AUTH, VALIDATION, UNKNOWN)
 * - Retry automático con backoff exponencial
 * - Logging estructurado a hoja Error_Log
 * - Notificación opcional a admins
 * - Soft-fail mode para operaciones no críticas
 * 
 * FEATURE FLAG: FEATURES.ENABLE_ERROR_HANDLER
 */

const ErrorHandler = {
    // ========== CATEGORÍAS DE ERROR ==========
    CATEGORY: {
        NETWORK: 'NETWORK',
        SHEETS: 'SHEETS',
        AUTH: 'AUTH',
        VALIDATION: 'VALIDATION',
        TIMEOUT: 'TIMEOUT',
        QUOTA: 'QUOTA',
        UNKNOWN: 'UNKNOWN'
    },

    // ========== CONFIGURACIÓN ==========
    config: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        logToSheet: true,
        sheetName: 'Error_Log',
        notifyAdmins: false,
        softFailDefault: false
    },

    // ========== CACHE INTERNO ==========
    _sheetCache: null,
    _errorBuffer: [],
    _bufferFlushSize: 20,

    // ========== API PRINCIPAL ==========

    /**
     * Maneja un error con logging y categorización
     */
    handle(context, error, options = {}) {
        if (!this._isEnabled()) {
            console.error(`[${context}] ${error.message}`);
            return { handled: false, category: 'DISABLED', logged: false };
        }

        const category = this._categorize(error);
        const severity = this._getSeverity(category, options);

        const errorRecord = {
            timestamp: new Date(),
            context: context,
            category: category,
            severity: severity,
            message: error.message,
            stack: error.stack || '',
            extra: JSON.stringify(options.extra || {}),
            user: this._getCurrentUser(),
            correlationId: typeof Logger !== 'undefined' && Logger.getCorrelationId ? Logger.getCorrelationId() : ''
        };

        this._errorBuffer.push(errorRecord);

        if (this._errorBuffer.length >= this._bufferFlushSize) {
            this.flush();
        }

        console.error(`[${category}][${context}] ${error.message}`);

        if (severity === 'CRITICAL' && this.config.notifyAdmins) {
            this._notifyAdmins(errorRecord);
        }

        return { handled: true, category, logged: true, severity };
    },

    /**
     * Ejecuta función con retry automático
     */
    withRetry(context, fn, options = {}) {
        const maxRetries = options.maxRetries || this.config.maxRetries;
        const softFail = options.softFail ?? this.config.softFailDefault;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return fn();
            } catch (error) {
                lastError = error;
                const category = this._categorize(error);

                if (category === this.CATEGORY.VALIDATION || category === this.CATEGORY.AUTH) {
                    this.handle(context, error, { attempt, maxRetries, noRetry: true });
                    if (softFail) return options.fallback ?? null;
                    throw error;
                }

                if (attempt < maxRetries) {
                    const delay = this._getBackoffDelay(attempt);
                    console.warn(`[${context}] Intento ${attempt}/${maxRetries} falló, reintentando en ${delay}ms...`);

                    if (options.onRetry) {
                        options.onRetry(attempt, error);
                    }

                    Utilities.sleep(delay);
                }
            }
        }

        this.handle(context, lastError, {
            attempt: maxRetries,
            maxRetries,
            allRetriesFailed: true
        });

        if (softFail) {
            return options.fallback ?? null;
        }
        throw lastError;
    },

    /**
     * Wrapper para operaciones con soft-fail
     */
    softExec(context, fn, fallback = null) {
        try {
            return fn();
        } catch (error) {
            this.handle(context, error, { softFail: true });
            return fallback;
        }
    },

    /**
     * Flush buffer de errores a hoja
     */
    flush() {
        if (this._errorBuffer.length === 0) {
            return { ok: true, count: 0 };
        }

        if (!this.config.logToSheet || !this._isEnabled()) {
            const count = this._errorBuffer.length;
            this._errorBuffer = [];
            return { ok: true, count, logged: false };
        }

        try {
            const sheet = this._getOrCreateSheet();
            const rows = this._errorBuffer.map(e => [
                e.timestamp,
                e.context,
                e.category,
                e.severity,
                e.message,
                e.stack.substring(0, 500),
                e.extra,
                e.user,
                e.correlationId
            ]);

            const lastRow = sheet.getLastRow();
            sheet.getRange(lastRow + 1, 1, rows.length, 9).setValues(rows);

            const count = this._errorBuffer.length;
            this._errorBuffer = [];

            this._enforceRowLimit(sheet, 2000);

            return { ok: true, count };
        } catch (flushError) {
            console.error('[ErrorHandler.flush] Failed:', flushError.message);
            return { ok: false, count: 0, error: flushError.message };
        }
    },

    // ========== MÉTODOS PRIVADOS ==========

    _isEnabled() {
        return getConfig('FEATURES.ENABLE_ERROR_HANDLER', true);
    },

    _categorize(error) {
        const msg = (error.message || '').toLowerCase();
        const name = (error.name || '').toLowerCase();

        if (msg.includes('timeout') || msg.includes('timed out')) {
            return this.CATEGORY.TIMEOUT;
        }
        if (msg.includes('quota') || msg.includes('limit exceeded') || msg.includes('rate limit')) {
            return this.CATEGORY.QUOTA;
        }
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('urlfetch')) {
            return this.CATEGORY.NETWORK;
        }
        if (msg.includes('sheet') || msg.includes('spreadsheet') || msg.includes('range')) {
            return this.CATEGORY.SHEETS;
        }
        if (msg.includes('auth') || msg.includes('permission') || msg.includes('access') || msg.includes('unauthorized')) {
            return this.CATEGORY.AUTH;
        }
        if (msg.includes('invalid') || msg.includes('required') || msg.includes('missing') || name.includes('validation')) {
            return this.CATEGORY.VALIDATION;
        }

        return this.CATEGORY.UNKNOWN;
    },

    _getSeverity(category, options) {
        if (options.critical) return 'CRITICAL';
        if (options.allRetriesFailed) return 'HIGH';

        switch (category) {
            case this.CATEGORY.AUTH:
            case this.CATEGORY.QUOTA:
                return 'CRITICAL';
            case this.CATEGORY.TIMEOUT:
            case this.CATEGORY.NETWORK:
                return 'HIGH';
            case this.CATEGORY.SHEETS:
                return 'MEDIUM';
            case this.CATEGORY.VALIDATION:
                return 'LOW';
            default:
                return 'MEDIUM';
        }
    },

    _getBackoffDelay(attempt) {
        const delay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 500;
        return Math.min(delay + jitter, this.config.maxDelayMs);
    },

    _getCurrentUser() {
        try {
            return Session.getActiveUser().getEmail() || 'system';
        } catch (e) {
            return 'system';
        }
    },

    _getOrCreateSheet() {
        if (this._sheetCache) return this._sheetCache;

        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName(this.config.sheetName);

        if (!sheet) {
            sheet = ss.insertSheet(this.config.sheetName);
            const headers = ['Timestamp', 'Context', 'Category', 'Severity', 'Message', 'Stack', 'Extra', 'User', 'CorrelationId'];
            sheet.getRange(1, 1, 1, 9).setValues([headers])
                .setFontWeight('bold')
                .setBackground('#ffcdd2');
            sheet.setFrozenRows(1);
        }

        this._sheetCache = sheet;
        return sheet;
    },

    _enforceRowLimit(sheet, maxRows) {
        try {
            const currentRows = sheet.getLastRow();
            if (currentRows > maxRows + 1) {
                const rowsToDelete = currentRows - maxRows;
                sheet.deleteRows(2, rowsToDelete);
            }
        } catch (e) {
            // Non-critical
        }
    },

    _notifyAdmins(errorRecord) {
        try {
            const admins = getConfig('ALERTS.ADMIN_EMAILS', []);
            if (admins.length === 0) return;

            const subject = `[PORTAL ALERTA] Error ${errorRecord.severity}: ${errorRecord.context}`;
            const body = `
Error detectado en Portal de Cobranzas

Contexto: ${errorRecord.context}
Categoría: ${errorRecord.category}
Severidad: ${errorRecord.severity}
Mensaje: ${errorRecord.message}
Usuario: ${errorRecord.user}
Timestamp: ${errorRecord.timestamp.toISOString()}

Stack:
${errorRecord.stack}
      `.trim();

            admins.forEach(email => {
                MailApp.sendEmail(email, subject, body);
            });
        } catch (e) {
            console.error('[ErrorHandler._notifyAdmins] Failed:', e.message);
        }
    },

    clearCache() {
        this._sheetCache = null;
        this._errorBuffer = [];
    },

    getBufferStats() {
        return {
            buffered: this._errorBuffer.length,
            flushSize: this._bufferFlushSize
        };
    }
};

/**
 * Wrapper global para ejecutar con manejo de errores
 */
function safeExecute(context, fn, options = {}) {
    if (!getConfig('FEATURES.ENABLE_ERROR_HANDLER', true)) {
        return fn();
    }

    try {
        const result = fn();
        ErrorHandler.flush();
        return result;
    } catch (error) {
        ErrorHandler.handle(context, error, options);
        ErrorHandler.flush();

        if (options.softFail) {
            return options.fallback ?? null;
        }
        throw error;
    }
}
