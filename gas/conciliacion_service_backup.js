/**
 * @fileoverview Main service dispatcher for Conciliación module
 * @version 1.1.0
 * 
 * Routes requests to appropriate processors and manages workflow.
 */

// ===============================================
// Conciliación — Excel validation & MIME normalize
// ===============================================
// Rename _CONCILIACION_EXCEL_EXTS to avoid conflict if also global
const _CONCILIACION_EXCEL_EXTS_Backup = {
    xlsx: true, xls: true, xlsm: true, xlsb: true,
    xltx: true, xltm: true, xlt: true,
    xlam: true, xla: true
};

function _conciliacionGetFileExt_Backup(fileName) {
    if (!fileName) return '';
    const parts = String(fileName).split('.');
    if (parts.length < 2) return '';
    return parts.pop().toLowerCase().trim();
}

function _conciliacionIsExcelFile_Backup(fileName) {
    const ext = _conciliacionGetFileExt_Backup(fileName);
    return !!_CONCILIACION_EXCEL_EXTS_Backup[ext];
}

function _conciliacionInferExcelMimeType_Backup(fileName) {
    const ext = _conciliacionGetFileExt_Backup(fileName);
    if (!_CONCILIACION_EXCEL_EXTS_Backup[ext]) return '';

    switch (ext) {
        case 'xls':
        case 'xlt':
        case 'xla':
            return 'application/vnd.ms-excel';

        case 'xlsx':
        case 'xltx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        case 'xlsm':
        case 'xltm':
            return 'application/vnd.ms-excel.sheet.macroEnabled.12';

        case 'xlsb':
            return 'application/vnd.ms-excel.sheet.binary.macroEnabled.12';

        case 'xlam':
            return 'application/vnd.ms-excel.addin.macroEnabled.12';

        default:
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
}

const ConciliacionService_Backup = {
    /**
     * Processes Estado de Cuenta from an insurer
     * 
     * @param {string} insurerKey - Insurer key (e.g., 'la_positiva')
     * @param {string} base64Data - File content in base64
     * @param {string} fileName - File name
     * @param {string} mimeType - MIME type
     * @param {string} token - Session token
     * @returns {Object} Processing result
     */
    procesarAseguradora(insurerKey, base64Data, fileName, mimeType, token) {
        const context = 'ConciliacionService.procesarAseguradora';

        // 1. Validate session (optional - skip if token not provided)
        if (token) {
            try {
                if (typeof AuthService !== 'undefined') {
                    AuthService.validateSession(token);
                }
            } catch (e) {
                return { ok: false, error: 'Sesión inválida' };
            }
        }

        // 2. Validate parameters
        if (!insurerKey || !base64Data || !fileName) {
            return { ok: false, error: 'Parámetros inválidos' };
        }

        // 2.1 Validate file type — Excel ONLY (all Excel extensions)
        if (!_conciliacionIsExcelFile_Backup(fileName)) {
            return { ok: false, error: 'Archivo no válido. Solo se permiten archivos Excel.' };
        }

        // 2.2 Normalize MIME based on Excel extension (browser may send empty/generic)
        const inferredMime = _conciliacionInferExcelMimeType_Backup(fileName);
        const normalizedMime = inferredMime || mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        mimeType = normalizedMime;

        // 3. Get lock
        const lock = LockService.getScriptLock();
        if (!lock.tryLock(60000)) {
            return { ok: false, error: 'Proceso en ejecución, intenta más tarde' };
        }

        let tempFileId = null;

        try {
            Logger.log(context + ': Procesando ' + insurerKey);

            // 4. Convert XLSX to temporary Sheet
            const convertResult = ConciliacionIO.convertirXLSXaSheet(base64Data, fileName, mimeType);
            if (!convertResult.ok) {
                return { ok: false, error: 'Error al convertir archivo: ' + convertResult.error };
            }
            tempFileId = convertResult.fileId;

            // 5. Get conciliation spreadsheet
            const ss = ConciliacionIO.getConciliacionSpreadsheet();
            if (!ss) {
                return { ok: false, error: 'Spreadsheet de conciliación no configurado' };
            }

            // 6. Get processor
            const processor = this._getProcessor(insurerKey);
            if (!processor) {
                return { ok: false, error: 'Aseguradora no válida: ' + insurerKey };
            }

            // 7. Execute processing
            const result = processor.process(tempFileId, ss);

            Logger.log(context + ': Procesamiento completado para ' + insurerKey);

            return result;

        } catch (error) {
            Logger.log(context + ': ERROR - ' + error.message);
            return { ok: false, error: error.message };

        } finally {
            // ALWAYS cleanup temporary file
            if (tempFileId) {
                ConciliacionIO.eliminarArchivoTemporal(tempFileId);
            }
            lock.releaseLock();
        }
    },

    /**
     * Gets list of configured insurers
     * @returns {Object} { ok: boolean, insurers: Array }
     */
    getInsurers() {
        const insurers = getConfig('CONCILIACION.INSURERS', {});
        const list = [];

        Object.keys(insurers).forEach(key => {
            const insurer = insurers[key];
            if (insurer.enabled) {
                list.push({
                    key: insurer.key,
                    name: insurer.name
                });
            }
        });

        return { ok: true, insurers: list };
    },

    /**
     * Gets BD_Cruce status
     * @returns {Object} { ok: boolean, loaded: boolean, rows: number }
     */
    getBDCruceStatus() {
        try {
            const ss = ConciliacionIO.getConciliacionSpreadsheet();
            if (!ss) {
                return { ok: false, error: 'Spreadsheet no configurado' };
            }

            const bdCruce = ss.getSheetByName('BD_Cruce');
            if (!bdCruce) {
                return { ok: true, loaded: false, rows: 0 };
            }

            const lastRow = bdCruce.getLastRow();

            return {
                ok: true,
                loaded: lastRow > 1,
                rows: Math.max(0, lastRow - 1)
            };

        } catch (error) {
            return { ok: false, error: error.message };
        }
    },

    /**
     * Gets processor by insurer key
     * @private
     */
    _getProcessor(insurerKey) {
        const processors = {
            'la_positiva': typeof LaPositivaProcessor !== 'undefined' ? LaPositivaProcessor : null,
            'crecer_protecta': typeof CrecerProtectaProcessor !== 'undefined' ? CrecerProtectaProcessor : null,
            'mapfre': typeof MapfreProcessor !== 'undefined' ? MapfreProcessor : null,
            'pacifico': typeof PacificoProcessor !== 'undefined' ? PacificoProcessor : null,
            'rimac': typeof RimacProcessor !== 'undefined' ? RimacProcessor : null,
            'chubb': typeof ChubbProcessor !== 'undefined' ? ChubbProcessor : null,
            'qualitas': typeof QualitasProcessor !== 'undefined' ? QualitasProcessor : null,
            'crecer_vle': typeof CrecerVLEProcessor !== 'undefined' ? CrecerVLEProcessor : null
        };

        return processors[insurerKey] || null;
    }
};
