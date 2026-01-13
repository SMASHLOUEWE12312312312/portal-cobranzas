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
    CACHE_KEY_STATS: 'MONITORING_DASH_STATS_V1',
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
                pipeline: false,
                queue: false,
                audit: false
            },
            eecc: { today: 0, week: 0, errors24h: 0 },
            mail: { sent24h: 0, queuedNow: 0, failed24h: 0 },
            system: { errors24h: 0, lastActivity: null }
        };

        // === EECC Pipeline Stats ===
        try {
            const pipelineData = this._readSheetSafe('EECC_Pipeline');
            if (pipelineData) {
                result.available.pipeline = true;
                const statusIdx = pipelineData.headers.indexOf('STATUS');
                const dateIdx = pipelineData.headers.indexOf('CREATED_AT');

                pipelineData.rows.forEach(row => {
                    const createdAt = this._parseDate(row[dateIdx]);
                    const status = String(row[statusIdx] || '').toUpperCase();

                    if (createdAt >= todayStart) result.eecc.today++;
                    if (createdAt >= weekAgo) result.eecc.week++;
                    if (status === 'ERROR' && createdAt >= yesterday) result.eecc.errors24h++;
                });
            }
        } catch (e) {
            Logger.warn(context, 'EECC_Pipeline read failed (soft-fail)', e);
        }

        // === Mail Queue Stats ===
        try {
            const queueData = this._readSheetSafe('Mail_Queue');
            if (queueData) {
                result.available.queue = true;
                const statusIdx = queueData.headers.indexOf('STATUS');
                const processedIdx = queueData.headers.indexOf('PROCESSED_AT');
                const createdIdx = queueData.headers.indexOf('CREATED_AT');

                queueData.rows.forEach(row => {
                    const status = String(row[statusIdx] || '').toUpperCase();
                    const processedAt = this._parseDate(row[processedIdx]);
                    const createdAt = this._parseDate(row[createdIdx]);

                    if (status === 'PENDING') result.mail.queuedNow++;
                    if (status === 'SENT' && processedAt >= yesterday) result.mail.sent24h++;
                    if (status === 'FAILED' && createdAt >= yesterday) result.mail.failed24h++;
                });
            }
        } catch (e) {
            Logger.warn(context, 'Mail_Queue read failed (soft-fail)', e);
        }

        // === Audit Log Stats ===
        try {
            const auditData = this._readSheetSafe('Audit_Log');
            if (auditData) {
                result.available.audit = true;
                const timestampIdx = auditData.headers.indexOf('TIMESTAMP');
                const typeIdx = auditData.headers.indexOf('TYPE');

                let lastTs = null;
                auditData.rows.forEach(row => {
                    const ts = this._parseDate(row[timestampIdx]);
                    const type = String(row[typeIdx] || '').toUpperCase();

                    if (type === 'ERROR' && ts >= yesterday) result.system.errors24h++;
                    if (!lastTs || (ts && ts > lastTs)) lastTs = ts;
                });
                result.system.lastActivity = lastTs ? lastTs.toISOString() : null;
            }
        } catch (e) {
            Logger.warn(context, 'Audit_Log read failed (soft-fail)', e);
        }

        return result;
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
            const statusIdx = queueData.headers.indexOf('STATUS');
            const createdIdx = queueData.headers.indexOf('CREATED_AT');
            const processedIdx = queueData.headers.indexOf('PROCESSED_AT');

            let oldestPending = null;
            let oldestProcessing = null;
            let lastProcessed = null;

            queueData.rows.forEach(row => {
                const status = String(row[statusIdx] || '').toUpperCase();
                const createdAt = this._parseDate(row[createdIdx]);
                const processedAt = this._parseDate(row[processedIdx]);

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
