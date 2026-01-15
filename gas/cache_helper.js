/**
 * @fileoverview CacheHelper - Fase 1 Enterprise Foundations
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * @lastModified 2026-01-15
 * 
 * CARACTERÍSTICAS:
 * - TTL diferenciado por tipo de dato
 * - Invalidación selectiva por prefijo
 * - Estadísticas de hit/miss
 * - Fallback graceful si cache falla
 * - Batch operations (getAll, putAll)
 * 
 * FEATURE FLAG: FEATURES.ENABLE_CACHE_HELPER
 */

const CacheHelper = {
    // ========== TTL POR TIPO (segundos) ==========
    TTL: {
        VOLATILE: 60,
        FREQUENT: 300,
        STANDARD: 600,
        STABLE: 1800,
        STATIC: 3600,
        PERSISTENT: 21600
    },

    // ========== PREFIJOS ESTÁNDAR ==========
    PREFIX: {
        ASEGURADOS: 'ASG_',
        GRUPOS: 'GRP_',
        BITACORA: 'BIT_',
        KPI: 'KPI_',
        USER: 'USR_',
        CONFIG: 'CFG_',
        TEMP: 'TMP_'
    },

    // ========== ESTADÍSTICAS ==========
    _stats: {
        hits: 0,
        misses: 0,
        errors: 0,
        lastReset: new Date()
    },

    // ========== API PRINCIPAL ==========

    get(key, options = {}) {
        if (!this._isEnabled()) {
            this._stats.misses++;
            return options.fallback ?? null;
        }

        try {
            const cache = CacheService.getScriptCache();
            const raw = cache.get(key);

            if (raw === null) {
                this._stats.misses++;
                return options.fallback ?? null;
            }

            this._stats.hits++;

            if (options.parse !== false) {
                try {
                    return JSON.parse(raw);
                } catch (e) {
                    return raw;
                }
            }

            return raw;
        } catch (error) {
            this._stats.errors++;
            console.warn(`[CacheHelper.get] Error for key ${key}:`, error.message);
            return options.fallback ?? null;
        }
    },

    set(key, value, ttl = null) {
        if (!this._isEnabled()) return false;

        try {
            const cache = CacheService.getScriptCache();
            const ttlSeconds = ttl ?? this.TTL.FREQUENT;

            const serialized = typeof value === 'string' ? value : JSON.stringify(value);

            if (serialized.length > 100000) {
                console.warn(`[CacheHelper.set] Value too large for key ${key}: ${serialized.length} bytes`);
                return false;
            }

            cache.put(key, serialized, ttlSeconds);
            return true;
        } catch (error) {
            this._stats.errors++;
            console.warn(`[CacheHelper.set] Error for key ${key}:`, error.message);
            return false;
        }
    },

    remove(key) {
        if (!this._isEnabled()) return false;

        try {
            const cache = CacheService.getScriptCache();
            cache.remove(key);
            return true;
        } catch (error) {
            this._stats.errors++;
            return false;
        }
    },

    invalidatePrefix(prefix, knownKeys = []) {
        if (!this._isEnabled()) return 0;

        try {
            const cache = CacheService.getScriptCache();
            let count = 0;

            knownKeys.forEach(key => {
                if (key.startsWith(prefix)) {
                    cache.remove(key);
                    count++;
                }
            });

            return count;
        } catch (error) {
            this._stats.errors++;
            return 0;
        }
    },

    getOrSet(key, fn, ttl = null) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        try {
            const value = fn();
            this.set(key, value, ttl);
            return value;
        } catch (error) {
            console.error(`[CacheHelper.getOrSet] Error generating value for ${key}:`, error.message);
            throw error;
        }
    },

    setMultiple(keyValueMap, ttl = null) {
        if (!this._isEnabled()) return 0;

        try {
            const cache = CacheService.getScriptCache();
            const ttlSeconds = ttl ?? this.TTL.FREQUENT;
            const serialized = {};

            Object.keys(keyValueMap).forEach(key => {
                const value = keyValueMap[key];
                serialized[key] = typeof value === 'string' ? value : JSON.stringify(value);
            });

            cache.putAll(serialized, ttlSeconds);
            return Object.keys(serialized).length;
        } catch (error) {
            this._stats.errors++;
            return 0;
        }
    },

    getMultiple(keys) {
        if (!this._isEnabled()) return {};

        try {
            const cache = CacheService.getScriptCache();
            const raw = cache.getAll(keys);
            const result = {};

            Object.keys(raw).forEach(key => {
                if (raw[key] !== null) {
                    this._stats.hits++;
                    try {
                        result[key] = JSON.parse(raw[key]);
                    } catch (e) {
                        result[key] = raw[key];
                    }
                } else {
                    this._stats.misses++;
                }
            });

            return result;
        } catch (error) {
            this._stats.errors++;
            return {};
        }
    },

    getStats() {
        const total = this._stats.hits + this._stats.misses;
        return {
            hits: this._stats.hits,
            misses: this._stats.misses,
            errors: this._stats.errors,
            hitRate: total > 0 ? (this._stats.hits / total * 100).toFixed(2) + '%' : '0%',
            total: total,
            lastReset: this._stats.lastReset.toISOString()
        };
    },

    resetStats() {
        this._stats = {
            hits: 0,
            misses: 0,
            errors: 0,
            lastReset: new Date()
        };
    },

    _isEnabled() {
        return getConfig('FEATURES.ENABLE_CACHE_HELPER', true);
    }
};

// ========== FUNCIONES HELPER GLOBALES ==========

function cacheAsegurados(data, ttl) {
    return CacheHelper.set(CacheHelper.PREFIX.ASEGURADOS + 'ALL', data, ttl || CacheHelper.TTL.STANDARD);
}

function getCachedAsegurados() {
    return CacheHelper.get(CacheHelper.PREFIX.ASEGURADOS + 'ALL');
}

function cacheGrupos(data, ttl) {
    return CacheHelper.set(CacheHelper.PREFIX.GRUPOS + 'ALL', data, ttl || CacheHelper.TTL.STABLE);
}

function getCachedGrupos() {
    return CacheHelper.get(CacheHelper.PREFIX.GRUPOS + 'ALL');
}

function invalidateAseguradosCache() {
    return CacheHelper.remove(CacheHelper.PREFIX.ASEGURADOS + 'ALL');
}

function invalidateGruposCache() {
    return CacheHelper.remove(CacheHelper.PREFIX.GRUPOS + 'ALL');
}
