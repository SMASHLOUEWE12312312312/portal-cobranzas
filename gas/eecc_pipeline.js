/**
 * @fileoverview EECC Pipeline Service for tracking EECC states
 * @version 1.0.0 - Phase 1
 * 
 * Persists EECC generation/send states in EECC_Pipeline sheet.
 * Feature-flagged: Does nothing if FEATURES.PIPELINE_ENABLED = false.
 * SOFT-FAIL: Pipeline errors never break main EECC/email flow.
 */

const EECCPipeline = {
    SHEET_NAME: 'EECC_Pipeline',

    HEADERS: [
        'PIPELINE_ID',
        'CORRELATION_ID',
        'ASEGURADO',
        'ESTADO',
        'ESTADO_ANTERIOR',
        'FECHA_CREACION',
        'FECHA_ACTUALIZACION',
        'USUARIO',
        'OPTIONS_JSON',
        'PDF_URL',
        'XLSX_URL',
        'EMAIL_MESSAGE_ID',
        'ERROR_MENSAJE',
        'RETRY_COUNT'
    ],

    /**
     * Valid states
     */
    STATES: {
        SOLICITADO: 'SOLICITADO',
        GENERANDO: 'GENERANDO',
        GENERADO: 'GENERADO',
        ENVIANDO: 'ENVIANDO',
        ENVIADO: 'ENVIADO',
        ERROR: 'ERROR'
    },

    /**
     * Valid state transitions
     */
    VALID_TRANSITIONS: {
        'SOLICITADO': ['GENERANDO', 'ERROR'],
        'GENERANDO': ['GENERADO', 'ERROR'],
        'GENERADO': ['ENVIANDO', 'ERROR'],
        'ENVIANDO': ['ENVIADO', 'ERROR'],
        'ENVIADO': [],
        'ERROR': ['SOLICITADO'] // Allow retry
    },

    /**
     * Sheet cache
     * @private
     */
    _sheetCache: null,

    /**
     * Check if pipeline is enabled
     * @return {boolean}
     */
    isEnabled() {
        return getConfig('FEATURES.PIPELINE_ENABLED', false);
    },

    /**
     * Create a new pipeline entry
     * Returns pipelineId or null if disabled/failed
     * 
     * @param {string} aseguradoId - Asegurado name
     * @param {Object} options - Generation options
     * @param {string} correlationId - Correlation ID for tracing
     * @param {string} user - User who initiated
     * @return {Object} { ok, pipelineId } or { ok: false, skipped: true }
     */
    create(aseguradoId, options = {}, correlationId = null, user = null) {
        const context = 'EECCPipeline.create';

        // Check feature flag
        if (!this.isEnabled()) {
            return { ok: true, skipped: true, pipelineId: null };
        }

        try {
            const sheet = this._ensureSheet();
            if (!sheet) {
                Logger.warn(context, 'Pipeline sheet not available');
                return { ok: false, error: 'Sheet not available' };
            }

            const pipelineId = Utilities.getUuid();
            const now = new Date();

            const row = [
                pipelineId,
                correlationId || Logger.getCorrelationId() || '',
                aseguradoId,
                this.STATES.SOLICITADO,
                '', // ESTADO_ANTERIOR
                now,
                now,
                user || this._getUser(),
                Object.keys(options).length > 0 ? JSON.stringify(options) : '',
                '', // PDF_URL
                '', // XLSX_URL
                '', // EMAIL_MESSAGE_ID
                '', // ERROR_MENSAJE
                0   // RETRY_COUNT
            ];

            sheet.appendRow(row);
            Logger.debug(context, 'Pipeline created', { pipelineId, aseguradoId });

            return { ok: true, pipelineId };

        } catch (error) {
            Logger.warn(context, 'Pipeline create failed (non-critical)', { error: error.message });
            return { ok: false, error: error.message };
        }
    },

    /**
     * Transition pipeline to new state
     * 
     * @param {string} pipelineId - Pipeline ID
     * @param {string} newState - New state from STATES
     * @param {Object} metadata - { pdfUrl, xlsxUrl, messageId, error }
     * @return {Object} { ok } or { ok: false, error }
     */
    transition(pipelineId, newState, metadata = {}) {
        const context = 'EECCPipeline.transition';

        // Check feature flag
        if (!this.isEnabled()) {
            return { ok: true, skipped: true };
        }

        if (!pipelineId) {
            return { ok: true, skipped: true };
        }

        try {
            const sheet = this._ensureSheet();
            if (!sheet) {
                return { ok: false, error: 'Sheet not available' };
            }

            // Find row by pipelineId
            const data = sheet.getDataRange().getValues();
            let rowIndex = -1;
            let currentState = '';

            for (let i = 1; i < data.length; i++) {
                if (data[i][0] === pipelineId) {
                    rowIndex = i + 1; // 1-indexed
                    currentState = data[i][3];
                    break;
                }
            }

            if (rowIndex === -1) {
                Logger.warn(context, 'Pipeline not found', { pipelineId });
                return { ok: false, error: 'Pipeline not found' };
            }

            // Validate transition
            const validNext = this.VALID_TRANSITIONS[currentState] || [];
            if (!validNext.includes(newState)) {
                Logger.warn(context, 'Invalid state transition', {
                    pipelineId,
                    from: currentState,
                    to: newState
                });
                // Don't block, just warn
            }

            // Update row
            const now = new Date();
            sheet.getRange(rowIndex, 4).setValue(newState);              // ESTADO
            sheet.getRange(rowIndex, 5).setValue(currentState);          // ESTADO_ANTERIOR
            sheet.getRange(rowIndex, 7).setValue(now);                   // FECHA_ACTUALIZACION

            if (metadata.pdfUrl) {
                sheet.getRange(rowIndex, 10).setValue(metadata.pdfUrl);
            }
            if (metadata.xlsxUrl) {
                sheet.getRange(rowIndex, 11).setValue(metadata.xlsxUrl);
            }
            if (metadata.messageId) {
                sheet.getRange(rowIndex, 12).setValue(metadata.messageId);
            }
            if (metadata.error) {
                sheet.getRange(rowIndex, 13).setValue(metadata.error);
            }

            Logger.debug(context, 'Pipeline transitioned', {
                pipelineId,
                from: currentState,
                to: newState
            });

            return { ok: true };

        } catch (error) {
            Logger.warn(context, 'Pipeline transition failed (non-critical)', { error: error.message });
            return { ok: false, error: error.message };
        }
    },

    /**
     * Get pipelines by asegurado
     * 
     * @param {string} aseguradoId
     * @return {Array} Pipeline entries
     */
    getByAsegurado(aseguradoId) {
        if (!this.isEnabled()) return [];

        try {
            const sheet = this._ensureSheet();
            if (!sheet) return [];

            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const results = [];

            for (let i = 1; i < data.length; i++) {
                if (data[i][2] === aseguradoId) {
                    const entry = {};
                    headers.forEach((h, idx) => {
                        entry[h] = data[i][idx];
                    });
                    results.push(entry);
                }
            }

            return results;
        } catch (error) {
            Logger.warn('EECCPipeline.getByAsegurado', 'Failed', error);
            return [];
        }
    },

    /**
     * Get pipelines by state
     * 
     * @param {string} state
     * @return {Array} Pipeline entries
     */
    getByState(state) {
        if (!this.isEnabled()) return [];

        try {
            const sheet = this._ensureSheet();
            if (!sheet) return [];

            const data = sheet.getDataRange().getValues();
            const headers = data[0];
            const results = [];

            for (let i = 1; i < data.length; i++) {
                if (data[i][3] === state) {
                    const entry = {};
                    headers.forEach((h, idx) => {
                        entry[h] = data[i][idx];
                    });
                    results.push(entry);
                }
            }

            return results;
        } catch (error) {
            Logger.warn('EECCPipeline.getByState', 'Failed', error);
            return [];
        }
    },

    /**
     * Ensure pipeline sheet exists
     * @private
     */
    _ensureSheet() {
        try {
            if (this._sheetCache) {
                return this._sheetCache;
            }

            const ss = SpreadsheetApp.getActive();
            if (!ss) return null;

            let sheet = ss.getSheetByName(this.SHEET_NAME);

            if (!sheet) {
                sheet = ss.insertSheet(this.SHEET_NAME);
                sheet.getRange(1, 1, 1, this.HEADERS.length)
                    .setValues([this.HEADERS])
                    .setFontWeight('bold')
                    .setBackground('#1565c0')
                    .setFontColor('#ffffff');
                sheet.setFrozenRows(1);

                // Set column widths
                const widths = [280, 280, 200, 100, 100, 140, 140, 120, 200, 300, 300, 280, 300, 60];
                widths.forEach((w, i) => {
                    if (i < this.HEADERS.length) sheet.setColumnWidth(i + 1, w);
                });

                Logger.info('EECCPipeline._ensureSheet', 'Created EECC_Pipeline sheet');
            }

            this._sheetCache = sheet;
            return sheet;

        } catch (error) {
            Logger.warn('EECCPipeline._ensureSheet', 'Failed', error);
            return null;
        }
    },

    /**
     * Get current user
     * @private
     */
    _getUser() {
        try {
            return Session.getActiveUser().getEmail() || 'system';
        } catch (e) {
            return 'system';
        }
    },

    /**
     * Clear sheet cache
     */
    clearCache() {
        this._sheetCache = null;
    }
};
