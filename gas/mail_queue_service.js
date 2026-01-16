/**
 * @fileoverview Persistent Mail Queue Service
 * @version 1.0.0 - Phase 1
 * 
 * Manages reliable email delivery via persistent queue + trigger.
 * Feature-flagged: Only active if FEATURES.MAIL_QUEUE_MODE = true.
 */

const MailQueueService = {
    SHEET_NAME: 'Mail_Queue',
    TRIGGER_FUNCTION: 'jobProcesarCorreos_',

    HEADERS: [
        'QUEUE_ID',
        'STATUS',
        'ASEGURADO_ID',
        'OPTIONS_JSON',
        'CREATED_AT',
        'PROCESSED_AT',
        'ERROR',
        'RETRY_COUNT',
        'CORRELATION_ID',
        'MESSAGE_ID'
    ],

    STATUS: {
        PENDING: 'PENDING',
        PROCESSING: 'PROCESSING',
        SENT: 'SENT',
        FAILED: 'FAILED',
        RETRY: 'RETRY'
    },

    _sheetCache: null,

    /**
     * Enqueue items for processing
     * 
     * @param {Array} items - List of items { aseguradoId }
     * @param {Object} options - Email options
     * @param {string} token - Session token
     * @param {string} correlationId - Correlation ID
     * @return {Object} { ok, count, queueIds }
     */
    enqueue(items, options, token, correlationId) {
        const context = 'MailQueueService.enqueue';

        try {
            const sheet = this._ensureSheet();
            if (!sheet) return { ok: false, error: 'Sheet not available' };

            const now = new Date();
            const queueIds = [];
            const rows = items.map(item => {
                const queueId = Utilities.getUuid();
                queueIds.push(queueId);

                return [
                    queueId,
                    this.STATUS.PENDING,
                    item.aseguradoId,
                    JSON.stringify({ ...options, token }), // Persist token safely? Ideally regenerate on trigger run, but for now passing through.
                    now,
                    '', // PROCESSED_AT
                    '', // ERROR
                    0,  // RETRY_COUNT
                    correlationId || '',
                    ''  // MESSAGE_ID
                ];
            });

            if (rows.length > 0) {
                sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
            }

            Logger.info(context, 'Items enqueued', { count: rows.length, correlationId });
            return { ok: true, count: rows.length, queueIds };

        } catch (error) {
            Logger.error(context, 'Enqueue failed', error);
            return { ok: false, error: error.message };
        }
    },

    /**
     * Get pending items (locks rows by setting status to PROCESSING)
     * 
     * @param {number} limit
     * @return {Array} List of queue items
     */
    getPending(limit) {
        const context = 'MailQueueService.getPending';
        try {
            const sheet = this._ensureSheet();
            if (!sheet) return [];

            const data = sheet.getDataRange().getValues();
            const pendingRows = [];

            // Find pending rows
            for (let i = 1; i < data.length; i++) {
                const status = data[i][1];
                if (status === this.STATUS.PENDING || status === this.STATUS.RETRY) {
                    pendingRows.push({ rowIndex: i + 1, rowData: data[i] });
                    if (pendingRows.length >= limit) break;
                }
            }

            if (pendingRows.length === 0) return [];

            // Lock them (set PROCESSING)
            const now = new Date();
            pendingRows.forEach(item => {
                sheet.getRange(item.rowIndex, 2).setValue(this.STATUS.PROCESSING);
                sheet.getRange(item.rowIndex, 6).setValue(now); // PROCESSED_AT
            });

            SpreadsheetApp.flush(); // Consolidate write

            // Map to object format
            return pendingRows.map(item => ({
                rowIndex: item.rowIndex,
                queueId: item.rowData[0],
                aseguradoId: item.rowData[2],
                options: JSON.parse(item.rowData[3] || '{}'),
                retryCount: Number(item.rowData[7]) || 0,
                correlationId: item.rowData[8]
            }));

        } catch (error) {
            Logger.error(context, 'Failed to get pending', error);
            return [];
        }
    },

    /**
     * Update item status
     * 
     * @param {number} rowIndex
     * @param {string} status
     * @param {Object} metadata - { error, messageId }
     */
    updateStatus(rowIndex, status, metadata = {}) {
        try {
            const sheet = this._ensureSheet();
            if (!sheet) return;

            sheet.getRange(rowIndex, 2).setValue(status);

            if (metadata.error) {
                sheet.getRange(rowIndex, 7).setValue(metadata.error);
                if (status === this.STATUS.RETRY) {
                    const currentRetry = sheet.getRange(rowIndex, 8).getValue();
                    sheet.getRange(rowIndex, 8).setValue((Number(currentRetry) || 0) + 1);
                }
            }

            if (metadata.messageId) {
                sheet.getRange(rowIndex, 10).setValue(metadata.messageId);
            }

            SpreadsheetApp.flush();

        } catch (e) {
            Logger.error('MailQueueService.updateStatus', 'Failed', e);
        }
    },

    /**
     * Release items stuck in PROCESSING state for too long (zombies)
     * @param {number} timeoutMinutes - Minutes after which to reset to PENDING
     * @return {number} Count of reset items
     */
    releaseStuckItems(timeoutMinutes = 15) {
        const context = 'MailQueueService.releaseStuckItems';
        try {
            const sheet = this._ensureSheet();
            if (!sheet) return 0;

            const data = sheet.getDataRange().getValues();
            const now = new Date();
            const resetCount = 0;
            const updates = [];

            // Check columns
            const statusColIdx = 1; // B
            const processedColIdx = 5; // F

            for (let i = 1; i < data.length; i++) {
                const status = data[i][statusColIdx];
                if (status === this.STATUS.PROCESSING) {
                    let processedAt = data[i][processedColIdx];
                    if (typeof processedAt === 'string') processedAt = new Date(processedAt);

                    // If no date or too old, reset
                    if (!processedAt || isNaN(processedAt.getTime()) || (now - processedAt) > (timeoutMinutes * 60 * 1000)) {
                        sheet.getRange(i + 1, statusColIdx + 1).setValue(this.STATUS.PENDING);
                        sheet.getRange(i + 1, 8).setValue((Number(data[i][7]) || 0) + 1); // Increment retry count
                        Logger.warn(context, `Resetting stuck item row ${i + 1} to PENDING`);
                        resetCount++;
                    }
                }
            }
            return resetCount;
        } catch (e) {
            Logger.error(context, 'Failed', e);
            return 0;
        }
    },

    /**
     * Ensure sheet exists
     * @private
     */
    _ensureSheet() {
        try {
            if (this._sheetCache) return this._sheetCache;

            const ss = SpreadsheetApp.getActive();
            if (!ss) return null;

            let sheet = ss.getSheetByName(this.SHEET_NAME);
            if (!sheet) {
                sheet = ss.insertSheet(this.SHEET_NAME);
                sheet.getRange(1, 1, 1, this.HEADERS.length)
                    .setValues([this.HEADERS])
                    .setFontWeight('bold')
                    .setBackground('#2e7d32')
                    .setFontColor('#ffffff');
                sheet.setFrozenRows(1);

                // Widths
                const widths = [280, 120, 200, 300, 150, 150, 300, 80, 280, 250];
                widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
            }
            this._sheetCache = sheet;
            return sheet;
        } catch (e) {
            Logger.error('MailQueueService._ensureSheet', 'Failed', e);
            return null;
        }
    }
};

/**
 * Trigger function for processing mail queue
 * Runs periodically if installed
 */
function jobProcesarCorreos_() {
    const context = 'jobProcesarCorreos_';

    if (!getConfig('FEATURES.MAIL_QUEUE_MODE', false)) {
        console.log('Mail Queue Mode disabled, skipping job');
        return;
    }

    // Prevent concurrent execution
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        Logger.warn(context, 'Lock busy, skipping run');
        return;
    }

    try {
        // 1. Recover zombies
        MailQueueService.releaseStuckItems(10); // Reset items > 10 mins old

        // 2. Process pending
        const batchSize = getConfig('MAIL_QUEUE.BATCH_SIZE', 10);
        const pendingItems = MailQueueService.getPending(batchSize);

        if (pendingItems.length === 0) {
            Logger.info(context, 'No pending items');
            return;
        }

        Logger.info(context, 'Processing batch', { count: pendingItems.length });

        // Process each item
        pendingItems.forEach(item => {
            // NOTE: token is persisted in options. 
            // In a real production system we'd use a service account key or regenerate token, 
            // but here we reuse the stored token (assuming TTL valid) or handle error.
            const { token } = item.options;

            // Call core logic (reusing portal_api's sendEmailsNow but for single item)
            // Since sendEmailsNow is batch, we wrap single item in array
            try {
                // IMPORTANT: Temporarily disable MAIL_QUEUE_MODE to avoid recursive queuing
                // But sendEmailsNow reads config directly... 
                // We need a lower-level function or pass a flag to bypass queue.
                // For Phase 1, we can't easily refactor sendEmailsNow to split logic without risk.
                // HACK: Pass a special option `skipQueue: true` to sendEmailsNow

                const result = sendEmailsNow(
                    [{ aseguradoId: item.aseguradoId }],
                    { ...item.options, skipQueue: true }, // BYPASS QUEUE
                    token
                );

                if (result.ok && result.sent > 0) {
                    MailQueueService.updateStatus(item.rowIndex, MailQueueService.STATUS.SENT, {
                        messageId: result.details[0]?.messageId
                    });

                    // AUDIT LOG (Phase 4 requirement)
                    try {
                        AuditService.log('ENVIO_EECC', 'Exito', item.aseguradoId,
                            `Correo enviado (QueueID: ${item.queueId.substring(0, 8)})`,
                            token
                        );
                    } catch (e) { /* ignore audit errors */ }

                } else {
                    throw new Error(result.error || result.details[0]?.error || 'Unknown send error');
                }

            } catch (error) {
                Logger.error(context, 'Item failed', error, { queueId: item.queueId });

                // AUDIT LOG ERROR
                try {
                    AuditService.log('ENVIO_EECC', 'Error', item.aseguradoId,
                        `Fallo envío: ${error.message}`,
                        token
                    );
                } catch (e) { /* ignore */ }

                if (item.retryCount >= getConfig('MAIL_QUEUE.MAX_RETRIES', 3)) {
                    MailQueueService.updateStatus(item.rowIndex, MailQueueService.STATUS.FAILED, {
                        error: error.message
                    });
                } else {
                    MailQueueService.updateStatus(item.rowIndex, MailQueueService.STATUS.RETRY, {
                        error: error.message
                    });
                }
            }
        });

    } catch (err) {
        Logger.error(context, 'Job failed', err);
    } finally {
        lock.releaseLock();
    }
}

/**
 * Install persistent trigger (Manual)
 */
function installMailQueueTriggers() {
    const fnName = MailQueueService.TRIGGER_FUNCTION;

    // Remove existing
    removeMailQueueTriggers();

    ScriptApp.newTrigger(fnName)
        .timeBased()
        .everyMinutes(5)
        .create();

    Logger.info('installMailQueueTriggers', 'Trigger installed (every 5 min)');
    return '✅ Trigger de cola de correo instalado (5 min)';
}

/**
 * Remove persistent trigger (Manual)
 */
function removeMailQueueTriggers() {
    const fnName = MailQueueService.TRIGGER_FUNCTION;
    const triggers = ScriptApp.getProjectTriggers();
    let count = 0;

    triggers.forEach(t => {
        if (t.getHandlerFunction() === fnName) {
            ScriptApp.deleteTrigger(t);
            count++;
        }
    });

    Logger.info('removeMailQueueTriggers', 'Triggers removed', { count });
    return `✅ Triggers eliminados: ${count}`;
}
