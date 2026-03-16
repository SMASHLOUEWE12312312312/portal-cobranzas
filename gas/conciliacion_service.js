/**
 * @fileoverview Main service dispatcher for Conciliación module - OPTIMIZED V2
 * @version 2.0.0 - ULTRA OPTIMIZED
 * 
 * CAMBIOS v2.0:
 * - NUEVO: DataContext compartido entre fases
 * - NUEVO: Caché de BD_Cruce para evitar re-lecturas
 * - OPTIMIZADO: Flujo de datos sin lecturas duplicadas
 * - OPTIMIZADO: Locks más granulares
 * 
 * MEJORA ESPERADA: 50-70% reducción en tiempo total
 */

// ===============================================
// Conciliación — Excel validation & MIME normalize
// ===============================================
const _CONCILIACION_EXCEL_EXTS = {
    xlsx: true, xls: true, xlsm: true, xlsb: true,
    xltx: true, xltm: true, xlt: true,
    xlam: true, xla: true
};

function _conciliacionGetFileExt_(fileName) {
    if (!fileName) return '';
    const parts = String(fileName).split('.');
    if (parts.length < 2) return '';
    return parts.pop().toLowerCase().trim();
}

function _conciliacionIsExcelFile_(fileName) {
    const ext = _conciliacionGetFileExt_(fileName);
    return !!_CONCILIACION_EXCEL_EXTS[ext];
}

function _conciliacionInferExcelMimeType_(fileName) {
    const ext = _conciliacionGetFileExt_(fileName);
    if (!_CONCILIACION_EXCEL_EXTS[ext]) return '';

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

const ConciliacionServiceV2 = {
    /**
     * Shared data context to avoid re-reading same data
     * @private
     */
    _dataContext: null,

    /**
     * Initialize data context for processing session
     * @private
     */
    _initDataContext() {
        this._dataContext = {
            bdCruceData: null,
            bdCruceSheet: null,
            eeccData: null,
            tramaData: null,
            ssRef: null,
            timestamp: Date.now()
        };
    },

    /**
     * Clear data context (call at end of processing)
     * @private
     */
    _clearDataContext() {
        this._dataContext = null;
        ConciliacionIOV2.clearCache();
    },

    /**
     * Processes Estado de Cuenta - OPTIMIZED VERSION
     * 
     * @param {string} insurerKey - Insurer key
     * @param {string} base64Data - File content in base64
     * @param {string} fileName - File name
     * @param {string} mimeType - MIME type
     * @param {string} token - Session token
     * @returns {Object} Processing result
     */
    procesarAseguradora(insurerKey, base64Data, fileName, mimeType, token) {
        const T = Date.now();

        // Validate session
        if (token) {
            try {
                if (typeof AuthService !== 'undefined') {
                    AuthService.validateSession(token);
                }
            } catch (e) {
                return { ok: false, error: 'Sesión inválida' };
            }
        }

        if (!insurerKey || !base64Data || !fileName) {
            return { ok: false, error: 'Parámetros inválidos' };
        }

        if (!_conciliacionIsExcelFile_(fileName)) {
            return { ok: false, error: 'Archivo no válido. Solo se permiten archivos Excel.' };
        }

        const normalizedMime = _conciliacionInferExcelMimeType_(fileName) || mimeType ||
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        // V10: Single lock attempt with 30s timeout (no retry loop)
        const lock = LockService.getDocumentLock();
        const lockAcquired = lock.tryLock(30000);

        if (!lockAcquired) {
            return {
                ok: false,
                error: 'El sistema está ocupado procesando otra solicitud. Por favor, espera unos segundos e intenta nuevamente.',
                errorCode: 'LOCK_BUSY'
            };
        }

        let tempFileId = null;
        let convertResult = null;

        try {
            this._initDataContext();

            // Convert XLSX via Drive API
            try {
                convertResult = ConciliacionIOV2.convertirXLSXaSheet(base64Data, fileName, normalizedMime);
            } catch (convertError) {
                return { ok: false, error: 'Error al convertir archivo: ' + convertError.message, errorCode: 'CONVERT_EXCEPTION' };
            }

            if (!convertResult.ok) {
                return { ok: false, error: 'Error al convertir archivo: ' + (convertResult.error || 'Error desconocido'), errorCode: convertResult.errorCode || 'CONVERT_FAILED' };
            }

            tempFileId = convertResult.fileId;

            const ss = ConciliacionIOV2.getConciliacionSpreadsheet();
            if (!ss) {
                return { ok: false, error: 'Spreadsheet de conciliación no configurado' };
            }
            this._dataContext.ssRef = ss;

            const wsBDCruce = ss.getSheetByName('BD_Cruce');
            if (!wsBDCruce) {
                return { ok: false, error: 'Hoja BD_Cruce no encontrada. Primero sube la BD Sisnet.' };
            }
            this._dataContext.bdCruceSheet = wsBDCruce;

            // V10: Read cupones with getValues() instead of getDisplayValues() (faster)
            const bdLastRow = wsBDCruce.getLastRow();
            const cuponCol = getConfig('CONCILIACION.BD_CRUCE_CUPON_COL', 8);

            if (bdLastRow > 1) {
                const cuponData = wsBDCruce.getRange(1, cuponCol, bdLastRow, 1).getValues();
                this._dataContext.bdCruceCupones = cuponData.map(row => String(row[0] || ''));
                this._dataContext.bdCruceRowCount = bdLastRow;
            } else {
                this._dataContext.bdCruceCupones = [];
                this._dataContext.bdCruceRowCount = 0;
            }

            this._dataContext.bdCruceData = null;

            // Get processor
            const processor = this._getProcessor(insurerKey);
            if (!processor) {
                return { ok: false, error: 'Aseguradora no válida: ' + insurerKey };
            }

            // Legacy fallback for V1 processors
            if (!processor.processOptimized && !tempFileId) {
                try {
                    const legacyResult = ConciliacionIOV2.forceCreateTempFile(base64Data, fileName, normalizedMime);
                    if (!legacyResult.ok) {
                        return { ok: false, error: 'Error creating legacy temp file: ' + legacyResult.error, errorCode: 'LEGACY_FILE_FAILED' };
                    }
                    tempFileId = legacyResult.fileId;
                } catch (legacyErr) {
                    return { ok: false, error: 'Exception creating legacy temp file: ' + legacyErr.message, errorCode: 'LEGACY_FILE_EXCEPTION' };
                }
            }

            let result;
            try {
                if (processor.processOptimized) {
                    result = processor.processOptimized(convertResult, ss, this._dataContext);
                } else {
                    result = processor.process(tempFileId, ss);
                }
            } catch (processError) {
                Logger.log('Processor exception ' + insurerKey + ': ' + processError.message);
                return {
                    ok: false,
                    error: 'Error procesando ' + insurerKey + ': ' + processError.message,
                    errorCode: 'PROCESSOR_EXCEPTION',
                    insurer: insurerKey
                };
            }

            if (result && result.ok) {
                result.insurer = result.insurer || insurerKey;
            }

            return result;

        } catch (error) {
            Logger.log('procesarAseguradora ERROR: ' + error.message);
            return { ok: false, error: error.message };

        } finally {
            if (tempFileId) {
                ConciliacionIOV2.eliminarArchivoTemporal(tempFileId);
            }
            this._clearDataContext();
            lock.releaseLock();
            Logger.log('Conciliacion ' + insurerKey + ' completada en ' + (Date.now() - T) + 'ms');
        }
    },

    /**
     * Gets list of configured insurers
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
     */
    getBDCruceStatus() {
        try {
            const ss = ConciliacionIOV2.getConciliacionSpreadsheet();
            if (!ss) {
                return { ok: false, error: 'Spreadsheet no configurado' };
            }

            const bdCruce = ss.getSheetByName('BD_Cruce');
            if (!bdCruce) {
                return { ok: true, loaded: false, rows: 0 };
            }

            const lastRow = bdCruce.getLastRow();

            // Get last modified date from spreadsheet metadata
            var lastModified = null;
            try {
                var file = DriveApp.getFileById(ss.getId());
                lastModified = file.getLastUpdated().toISOString();
            } catch (e) {
                // fallback: no date available
            }

            // Leer metadata del último upload
            var uploadedBy = null;
            var uploadDate = lastModified;
            try {
                var meta = PropertiesService.getScriptProperties().getProperty('BD_CRUCE_LAST_UPLOAD');
                if (meta) {
                    var parsed = JSON.parse(meta);
                    uploadedBy = parsed.user || null;
                    if (parsed.date) uploadDate = parsed.date;
                }
            } catch (e) { /* ignore */ }

            return {
                ok: true,
                loaded: lastRow > 1,
                rows: Math.max(0, lastRow - 1),
                lastModified: uploadDate,
                uploadedBy: uploadedBy
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
            'la_positiva': typeof LaPositivaProcessorV2 !== 'undefined' ? LaPositivaProcessorV2 :
                (typeof LaPositivaProcessor !== 'undefined' ? LaPositivaProcessor : null),
            'crecer_protecta': typeof CrecerProtectaProcessorV2 !== 'undefined' ? CrecerProtectaProcessorV2 :
                (typeof CrecerProtectaProcessor !== 'undefined' ? CrecerProtectaProcessor : null),
            'mapfre': typeof MapfreProcessorV2 !== 'undefined' ? MapfreProcessorV2 :
                (typeof MapfreProcessor !== 'undefined' ? MapfreProcessor : null),
            'pacifico': typeof PacificoProcessorV2 !== 'undefined' ? PacificoProcessorV2 :
                (typeof PacificoProcessor !== 'undefined' ? PacificoProcessor : null),
            'rimac': typeof RimacProcessorV2 !== 'undefined' ? RimacProcessorV2 :
                (typeof RimacProcessor !== 'undefined' ? RimacProcessor : null),
            'chubb': typeof ChubbProcessorV2 !== 'undefined' ? ChubbProcessorV2 :
                (typeof ChubbProcessor !== 'undefined' ? ChubbProcessor : null),
            'qualitas': typeof QualitasProcessorV2 !== 'undefined' ? QualitasProcessorV2 :
                (typeof QualitasProcessor !== 'undefined' ? QualitasProcessor : null),
            'crecer_vle': typeof CrecerVLEProcessorV2 !== 'undefined' ? CrecerVLEProcessorV2 :
                (typeof CrecerVLEProcessor !== 'undefined' ? CrecerVLEProcessor : null)
        };

        return processors[insurerKey] || null;
    }
};

// Alias for backward compatibility
const ConciliacionService = ConciliacionServiceV2;
