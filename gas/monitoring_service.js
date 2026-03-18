/**
 * @fileoverview Monitoring Service for Phase 3 - Dashboard Stats & Queue Health
 * @version 1.0.0
 * 
 * Provides read-only monitoring endpoints with soft-fail behavior.
 * All sheet access is non-blocking (returns { available: false } on error).
 * Cache: 60 seconds via CacheService.
 */

const MonitoringService = {
    CACHE_TTL_SECONDS: 60,
    CACHE_KEY_STATS: 'MONITORING_DASH_STATS_V3',
    CACHE_KEY_QUEUE_HEALTH: 'MONITORING_QUEUE_HEALTH_V1',

    /**
     * Get dashboard statistics (cached)
     * @return {Object} Stats object with availability flags
     */
    getDashboardStats() {
        const context = 'MonitoringService.getDashboardStats';

        // Check feature flag
        if (!getConfig('FEATURES.DASHBOARD_STATS', true)) {
            return { ok: true, available: { all: false }, reason: 'Feature disabled' };
        }

        // Check cache first
        const cache = CacheService.getScriptCache();
        const cached = cache.get(this.CACHE_KEY_STATS);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                Logger.warn(context, 'Cache parse failed, regenerating');
            }
        }

        // Build stats
        const stats = this._buildDashboardStats();

        // Cache result
        try {
            cache.put(this.CACHE_KEY_STATS, JSON.stringify(stats), this.CACHE_TTL_SECONDS);
        } catch (e) {
            Logger.warn(context, 'Cache put failed', e);
        }

        return stats;
    },

    /**
     * Build dashboard stats from sheets (internal)
     * @private
     */
    _buildDashboardStats() {
        const context = 'MonitoringService._buildDashboardStats';
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

        const result = {
            ok: true,
            timestamp: now.toISOString(),
            available: {
                audit: false,
                queue: false,
                debugLog: false
            },
            eecc: { today: 0, week: 0, errors24h: 0, todayByUser: {}, weekByUser: {} },
            mail: { sent24h: 0, queuedNow: 0, failed24h: 0 },
            system: { errors24h: 0, lastActivity: null }
        };

        // === EECC Stats from Audit_Log (GENERATE_EECC actions) ===
        try {
            const auditData = this._readSheetSafe('Audit_Log');
            if (auditData) {
                result.available.audit = true;

                const timestampIdx = this._findColumnIndex(auditData.headers, ['TIMESTAMP', 'FECHA']);
                const userIdx = this._findColumnIndex(auditData.headers, ['USER', 'USUARIO']);
                const actionIdx = this._findColumnIndex(auditData.headers, ['ACTION', 'ACCION']);
                const targetIdx = this._findColumnIndex(auditData.headers, ['TARGET', 'OBJETIVO']);

                let lastActivity = null;

                const displayNames = getConfig('AUTH.USER_DISPLAY_NAMES', {});

                auditData.rows.forEach(row => {
                    const action = actionIdx >= 0 ? String(row[actionIdx] || '').toUpperCase() : '';
                    if (action !== 'GENERATE_EECC') return;

                    const ts = timestampIdx >= 0 ? this._parseDate(row[timestampIdx]) : null;
                    if (!ts) return;

                    const user = userIdx >= 0 ? String(row[userIdx] || '').trim() : '';
                    const rawKey = user ? user.replace(/@.*/, '') : 'sistema';
                    const userKey = displayNames[rawKey] || rawKey;

                    if (ts >= todayStart) {
                        result.eecc.today++;
                        result.eecc.todayByUser[userKey] = (result.eecc.todayByUser[userKey] || 0) + 1;
                    }
                    if (ts >= weekAgo) {
                        result.eecc.week++;
                        result.eecc.weekByUser[userKey] = (result.eecc.weekByUser[userKey] || 0) + 1;
                    }

                    if (!lastActivity || ts > lastActivity) {
                        lastActivity = ts;
                    }
                });

                result.system.lastActivity = lastActivity ? lastActivity.toISOString() : null;
            }
        } catch (e) {
            Logger.warn(context, 'Audit_Log read failed (soft-fail)', e);
        }

        // === Mail Queue Stats ===
        try {
            const queueData = this._readSheetSafe('Mail_Queue');
            if (queueData) {
                result.available.queue = true;
                const statusIdx = this._findColumnIndex(queueData.headers, ['STATUS', 'ESTADO']);
                const processedIdx = this._findColumnIndex(queueData.headers, ['PROCESSED_AT', 'FECHA_PROCESADO']);
                const createdIdx = this._findColumnIndex(queueData.headers, ['CREATED_AT', 'FECHA_CREADO', 'TIMESTAMP']);

                queueData.rows.forEach(row => {
                    // P2-FIX: Guard against -1 column indices
                    const status = statusIdx >= 0 ? String(row[statusIdx] || '').toUpperCase().trim() : '';
                    const processedAt = processedIdx >= 0 ? this._parseDate(row[processedIdx]) : null;
                    const createdAt = createdIdx >= 0 ? this._parseDate(row[createdIdx]) : null;

                    // PENDING logic
                    if (status.includes('PENDING') || status === 'RETRY') {
                        result.mail.queuedNow++;
                    }

                    if (status === 'SENT' && processedAt >= yesterday) result.mail.sent24h++;
                    if ((status === 'FAILED' || status === 'ERROR') && createdAt >= yesterday) result.mail.failed24h++;
                });
            }
        } catch (e) {
            Logger.warn(context, 'Mail_Queue read failed (soft-fail)', e);
        }

        // === EECC Errors & System Errors from Debug_Log ===
        try {
            const debugData = this._readSheetSafe('Debug_Log');
            if (debugData) {
                result.available.debugLog = true;
                const levelIdx = this._findColumnIndex(debugData.headers, ['LEVEL', 'NIVEL', 'TIPO']);
                const timestampIdx = this._findColumnIndex(debugData.headers, ['TIMESTAMP', 'FECHA', 'CREATED_AT']);
                const contextIdx = this._findColumnIndex(debugData.headers, ['CONTEXT', 'CONTEXTO', 'FUNCION']);

                debugData.rows.forEach(row => {
                    // P2-FIX: Guard against -1 column indices
                    const level = levelIdx >= 0 ? String(row[levelIdx] || '').toUpperCase() : '';
                    const ts = timestampIdx >= 0 ? this._parseDate(row[timestampIdx]) : null;
                    if (!ts || ts < yesterday) return;
                    if (level !== 'ERROR' && level !== 'CRITICAL') return;

                    result.system.errors24h++;
                    const ctx = contextIdx >= 0 ? String(row[contextIdx] || '').toUpperCase() : '';
                    if (ctx.includes('EECC') || ctx.includes('GENERAR')) {
                        result.eecc.errors24h++;
                    }
                });
            }
        } catch (e) {
            Logger.warn(context, 'Debug_Log read failed (soft-fail)', e);
        }

        return result;
    },

    /**
     * Find column index by trying multiple possible names
     * @param {string[]} headers - Array of header names
     * @param {string[]} possibleNames - Array of possible column names to match
     * @return {number} Index of first match, or -1 if not found
     * @private
     */
    _findColumnIndex(headers, possibleNames) {
        for (const name of possibleNames) {
            const idx = headers.findIndex(h =>
                String(h).toUpperCase().trim() === name.toUpperCase()
            );
            if (idx >= 0) return idx;
        }
        return -1;
    },

    /**
     * Get mail queue health status (cached)
     * @return {Object} Health status with thresholds
     */
    getMailQueueHealth() {
        const context = 'MonitoringService.getMailQueueHealth';

        // Check feature flag
        if (!getConfig('FEATURES.QUEUE_HEALTH_PANEL', true)) {
            return { ok: true, available: false, reason: 'Feature disabled' };
        }

        // Check cache
        const cache = CacheService.getScriptCache();
        const cached = cache.get(this.CACHE_KEY_QUEUE_HEALTH);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                Logger.warn(context, 'Cache parse failed, regenerating');
            }
        }

        // Build health
        const health = this._buildQueueHealth();

        // Cache result
        try {
            cache.put(this.CACHE_KEY_QUEUE_HEALTH, JSON.stringify(health), this.CACHE_TTL_SECONDS);
        } catch (e) {
            Logger.warn(context, 'Cache put failed', e);
        }

        return health;
    },

    /**
     * Build queue health from Mail_Queue sheet (internal)
     * @private
     */
    _buildQueueHealth() {
        const context = 'MonitoringService._buildQueueHealth';
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const result = {
            ok: true,
            available: false,
            timestamp: now.toISOString(),
            pendingCount: 0,
            processingCount: 0,
            failedCount24h: 0,
            oldestPendingAgeMinutes: 0,
            oldestProcessingAgeMinutes: 0,
            lastProcessedAt: null,
            status: 'OK',
            reasons: []
        };

        try {
            const queueData = this._readSheetSafe('Mail_Queue');
            if (!queueData) return result;

            result.available = true;
            const statusIdx = this._findColumnIndex(queueData.headers, ['STATUS', 'ESTADO']);
            const createdIdx = this._findColumnIndex(queueData.headers, ['CREATED_AT', 'FECHA_CREADO', 'TIMESTAMP']);
            const processedIdx = this._findColumnIndex(queueData.headers, ['PROCESSED_AT', 'FECHA_PROCESADO']);

            let oldestPending = null;
            let oldestProcessing = null;
            let lastProcessed = null;

            queueData.rows.forEach(row => {
                // P2-FIX: Guard against -1 column indices
                const status = statusIdx >= 0 ? String(row[statusIdx] || '').toUpperCase() : '';
                const createdAt = createdIdx >= 0 ? this._parseDate(row[createdIdx]) : null;
                const processedAt = processedIdx >= 0 ? this._parseDate(row[processedIdx]) : null;

                if (status === 'PENDING') {
                    result.pendingCount++;
                    if (!oldestPending || (createdAt && createdAt < oldestPending)) {
                        oldestPending = createdAt;
                    }
                }
                if (status === 'PROCESSING') {
                    result.processingCount++;
                    if (!oldestProcessing || (createdAt && createdAt < oldestProcessing)) {
                        oldestProcessing = createdAt;
                    }
                }
                if (status === 'FAILED' && createdAt >= yesterday) {
                    result.failedCount24h++;
                }
                if (processedAt && (!lastProcessed || processedAt > lastProcessed)) {
                    lastProcessed = processedAt;
                }
            });

            // Calculate ages
            if (oldestPending) {
                result.oldestPendingAgeMinutes = Math.round((now - oldestPending) / 60000);
            }
            if (oldestProcessing) {
                result.oldestProcessingAgeMinutes = Math.round((now - oldestProcessing) / 60000);
            }
            if (lastProcessed) {
                result.lastProcessedAt = lastProcessed.toISOString();
            }

            // Determine status
            const staleMin = getConfig('MONITORING.QUEUE_STALE_MINUTES', 15);
            const stuckMin = getConfig('MONITORING.QUEUE_STUCK_MINUTES', 30);
            const stuckThreshold = getConfig('MONITORING.PROCESSING_STUCK_THRESHOLD', 3);

            if (result.oldestProcessingAgeMinutes > stuckMin ||
                (result.processingCount >= stuckThreshold && result.oldestProcessingAgeMinutes > staleMin)) {
                result.status = 'ERROR';
                result.reasons.push('Cola atascada: items en PROCESSING demasiado tiempo');
            } else if (result.oldestPendingAgeMinutes > staleMin) {
                result.status = 'WARN';
                result.reasons.push('Retraso detectado: items pendientes > ' + staleMin + ' min');
            }

        } catch (e) {
            Logger.warn(context, 'Queue health check failed (soft-fail)', e);
        }

        return result;
    },

    /**
     * Read sheet with soft-fail (returns null on error)
     * @param {string} sheetName
     * @return {Object|null} { headers, rows } or null
     * @private
     */
    _readSheetSafe(sheetName) {
        try {
            const ss = SheetsIO._getSpreadsheet();
            const sheet = ss.getSheetByName(sheetName);
            if (!sheet) return null;

            const data = sheet.getDataRange().getValues();
            if (data.length < 1) return null;

            const headers = data[0].map(String);
            const rows = data.slice(1);
            return { headers, rows };
        } catch (e) {
            return null;
        }
    },

    /**
     * Parse date value (handles Date objects, strings, timestamps)
     * @param {*} value
     * @return {Date|null}
     * @private
     */
    _parseDate(value) {
        if (!value) return null;
        if (value instanceof Date) return value;
        if (typeof value === 'number') return new Date(value);
        try {
            const d = new Date(value);
            return isNaN(d.getTime()) ? null : d;
        } catch (e) {
            return null;
        }
    }
};
