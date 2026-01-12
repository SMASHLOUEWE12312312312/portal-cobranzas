/**
 * @fileoverview Audit Service for tracking critical actions
 * @version 1.0.0 - Phase 1
 * 
 * Logs WHO did WHAT and WHEN to Audit_Log sheet.
 * SOFT-FAIL: Audit failures never break the main flow.
 */

const AuditService = {
    SHEET_NAME: 'Audit_Log',

    HEADERS: [
        'TIMESTAMP',
        'USER',
        'ACTION',
        'TARGET',
        'DETAILS_JSON',
        'CORRELATION_ID',
        'IP'
    ],

    /**
     * Action types for auditing
     */
    ACTIONS: {
        LOGIN: 'LOGIN',
        LOGOUT: 'LOGOUT',
        GENERATE_EECC: 'GENERATE_EECC',
        SEND_EMAIL: 'SEND_EMAIL',
        UPDATE_BITACORA: 'UPDATE_BITACORA',
        CONFIG_CHANGE: 'CONFIG_CHANGE'
    },

    /**
     * Cache for sheet reference
     * @private
     */
    _sheetCache: null,

    /**
     * Log an action to Audit_Log
     * SOFT-FAIL: Never throws, always returns success/failure
     * 
     * @param {string} action - Action type from ACTIONS enum
     * @param {string} target - What was acted upon (username, asegurado, etc.)
     * @param {Object} details - Additional details (will be JSON stringified)
     * @param {string} correlationId - Optional correlation ID for tracing
     * @param {string} ip - Optional IP address
     * @return {Object} { ok: boolean, error?: string }
     */
    log(action, target, details = {}, correlationId = null, ip = null) {
        const context = 'AuditService.log';

        try {
            const sheet = this._ensureSheet();
            if (!sheet) {
                Logger.warn(context, 'Could not get audit sheet, skipping audit');
                return { ok: false, error: 'Sheet not available' };
            }

            const row = [
                new Date(),
                this._getUser(),
                action || 'UNKNOWN',
                target || '',
                Object.keys(details).length > 0 ? JSON.stringify(details) : '',
                correlationId || Logger.getCorrelationId() || '',
                ip || 'UNKNOWN'
            ];

            sheet.appendRow(row);

            return { ok: true };

        } catch (error) {
            // SOFT-FAIL: Log warning but never propagate error
            Logger.warn(context, 'Audit log failed (non-critical)', {
                action,
                target,
                error: error.message
            });
            return { ok: false, error: error.message };
        }
    },

    /**
     * Ensure Audit_Log sheet exists with correct headers
     * @private
     * @return {GoogleAppsScript.Spreadsheet.Sheet|null}
     */
    _ensureSheet() {
        try {
            if (this._sheetCache) {
                return this._sheetCache;
            }

            const ss = SpreadsheetApp.getActive();
            if (!ss) {
                return null;
            }

            let sheet = ss.getSheetByName(this.SHEET_NAME);

            if (!sheet) {
                // Create sheet with headers
                sheet = ss.insertSheet(this.SHEET_NAME);
                sheet.getRange(1, 1, 1, this.HEADERS.length)
                    .setValues([this.HEADERS])
                    .setFontWeight('bold')
                    .setBackground('#1a237e')
                    .setFontColor('#ffffff');
                sheet.setFrozenRows(1);

                // Set column widths
                const widths = [150, 120, 140, 200, 300, 280, 100];
                widths.forEach((w, i) => {
                    sheet.setColumnWidth(i + 1, w);
                });

                Logger.info('AuditService._ensureSheet', 'Created Audit_Log sheet');
            }

            this._sheetCache = sheet;
            return sheet;

        } catch (error) {
            Logger.warn('AuditService._ensureSheet', 'Failed to ensure sheet', error);
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
     * Clear sheet cache (for testing)
     */
    clearCache() {
        this._sheetCache = null;
    }
};
