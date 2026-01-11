/**
 * @fileoverview Servicio para gestión de Grupos Económicos
 * @version 1.0.0
 * 
 * GRUPO_ECONOMICO - NUEVA LÓGICA
 * Permite agrupar asegurados bajo una entidad "Grupo" para:
 * - Generación masiva de EECC
 * - Envío consolidado de correos
 * - Registro agrupado en bitácora
 */

const GrupoEconomicoService = {

    // ========== CACHÉ (privado) ==========
    _cache: null,
    _cacheTime: 0,
    _CACHE_TTL: 300000, // 5 minutos

    /**
     * Carga la configuración de grupos desde la hoja
     * @private
     */
    _loadConfig() {
        const context = 'GrupoEconomicoService._loadConfig';
        const now = Date.now();

        // Usar caché si es válido
        if (this._cache && (now - this._cacheTime < this._CACHE_TTL)) {
            return this._cache;
        }

        Logger.info(context, 'Cargando configuración de grupos desde Sheet');

        try {
            const sheetName = getConfig('SHEETS.GRUPOS_ECONOMICOS', 'Grupos_Economicos');

            // FIX DEFINITIVO: Usar SheetsIO._getSpreadsheet() que tiene fallback correcto
            const ss = SheetsIO._getSpreadsheet();
            let sheet = ss.getSheetByName(sheetName);

            if (!sheet) {
                // Si no existe, crearla con estructura básica
                Logger.warn(context, `Hoja ${sheetName} no existe. Creándola...`);
                sheet = ss.insertSheet(sheetName);
                const headers = ['GRUPO_ECONOMICO', 'ASEGURADO_ID', 'ACTIVE'];
                sheet.getRange(1, 1, 1, headers.length).setValues([headers])
                    .setFontWeight('bold')
                    .setBackground('#E8F5E9'); // Verde claro para diferenciar
                sheet.setFrozenRows(1);

                // Retornar estructura vacía pero válida
                this._cache = { grupos: {}, asegurados: {} };
                this._cacheTime = now;
                return this._cache;
            }

            // Leer datos usando SheetsIO
            const data = SheetsIO.readSheet(sheetName);

            const gruposMap = {};    // grupo -> [asegurados]
            const aseguradosMap = {}; // asegurado -> grupo

            for (const row of data.rows) {
                // Columnas esperadas en la hoja: GRUPO_ECONOMICO, ASEGURADO_ID
                // NOTA: SheetsIO normaliza los encabezados convirtiendo _ en espacios
                // Por eso buscamos "GRUPO ECONOMICO" y "ASEGURADO ID" en el columnMap
                const grupo = Utils.cleanText(row[data.columnMap['GRUPO ECONOMICO']] || '');
                const asegurado = Utils.cleanText(row[data.columnMap['ASEGURADO ID']] || '');
                const active = String(row[data.columnMap.ACTIVE] || 'TRUE').toUpperCase();

                if (!grupo || !asegurado || active !== 'TRUE') continue;

                // Agregar a mapa de grupos
                if (!gruposMap[grupo]) {
                    gruposMap[grupo] = [];
                }
                gruposMap[grupo].push(asegurado);

                // Agregar a mapa de asegurados (un asegurado solo pertenece a un grupo principal)
                // Si aparece en varios, tomamos el último (o podríamos lanzar error)
                aseguradosMap[asegurado] = grupo;
            }

            this._cache = {
                grupos: gruposMap,
                asegurados: aseguradosMap
            };
            this._cacheTime = now;

            Logger.info(context, 'Configuración cargada', {
                totalGrupos: Object.keys(gruposMap).length,
                totalAsegurados: Object.keys(aseguradosMap).length
            });

            return this._cache;

        } catch (error) {
            Logger.error(context, 'Error cargando grupos', error);
            // Fallback seguro
            return { grupos: {}, asegurados: {} };
        }
    },

    /**
     * Obtiene la lista de todos los nombres de grupos activos
     * @return {Array<string>} Lista de nombres de grupos ordenados
     */
    getGrupos() {
        const config = this._loadConfig();
        return Object.keys(config.grupos).sort();
    },

    /**
     * Obtiene los asegurados que pertenecen a un grupo
     * @param {string} grupoNombre - Nombre del grupo
     * @return {Array<string>} Lista de asegurados
     */
    getAsegurados(grupoNombre) {
        const config = this._loadConfig();
        const grupo = Utils.cleanText(grupoNombre);
        return config.grupos[grupo] || [];
    },

    /**
     * Obtiene el grupo al que pertenece un asegurado
     * @param {string} aseguradoNombre - Nombre del asegurado
     * @return {string|null} Nombre del grupo o null si no tiene
     */
    getGrupo(aseguradoNombre) {
        const config = this._loadConfig();
        const asegurado = Utils.cleanText(aseguradoNombre);
        return config.asegurados[asegurado] || null;
    },

    /**
     * Verifica si un nombre corresponde a un grupo existente
     * @param {string} nombre - Nombre a verificar
     * @return {boolean}
     */
    esGrupo(nombre) {
        const config = this._loadConfig();
        return !!config.grupos[Utils.cleanText(nombre)];
    },

    /**
     * Limpia la caché (útil si se actualizó la hoja)
     */
    invalidateCache() {
        this._cache = null;
        this._cacheTime = 0;
    }
};
