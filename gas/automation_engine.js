/**
 * @fileoverview AutomationEngine - Fase 3 Automatización
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * 
 * FEATURE FLAG: FEATURES.ENABLE_AUTOMATION_ENGINE
 */

const AutomationEngine = {
    LOG_SHEET: 'Automation_Log',
    MAX_EXECUTION_TIME: 300000,

    TASK_TYPE: {
        PTP_REMINDER: 'PTP_REMINDER',
        AGING_ALERT: 'AGING_ALERT',
        DAILY_SUMMARY: 'DAILY_SUMMARY',
        WEEKLY_REPORT: 'WEEKLY_REPORT',
        ESCALATION_CHECK: 'ESCALATION_CHECK',
        BACKUP_REMINDER: 'BACKUP_REMINDER',
        CLEANUP: 'CLEANUP'
    },

    PRIORITY: { CRITICAL: 1, HIGH: 2, NORMAL: 3, LOW: 4 },

    runScheduledTasks() {
        const context = 'AutomationEngine.runScheduledTasks';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        const startTime = Date.now();
        const results = { ok: true, timestamp: new Date().toISOString(), tasksExecuted: [], errors: [], totalMs: 0 };

        try {
            Logger.info(context, 'Iniciando ejecución de tareas programadas...');
            const tasks = this._getPendingTasks();

            for (const task of tasks) {
                if (Date.now() - startTime > this.MAX_EXECUTION_TIME) {
                    Logger.warn(context, 'Tiempo máximo alcanzado');
                    break;
                }
                try {
                    const taskResult = this._executeTask(task);
                    results.tasksExecuted.push({ type: task.type, success: taskResult.ok, duration: taskResult.duration });
                    if (!taskResult.ok) results.errors.push({ type: task.type, error: taskResult.error });
                } catch (taskError) {
                    results.errors.push({ type: task.type, error: taskError.message });
                    Logger.error(context, `Error en tarea ${task.type}`, taskError);
                }
            }

            results.totalMs = Date.now() - startTime;
            results.ok = results.errors.length === 0;
            this._logExecution(results);
            Logger.info(context, 'Ejecución completada', { tasks: results.tasksExecuted.length, errors: results.errors.length, ms: results.totalMs });
            return results;
        } catch (error) {
            Logger.error(context, 'Error fatal', error);
            return { ok: false, error: error.message };
        }
    },

    scheduleTask(task) {
        const context = 'AutomationEngine.scheduleTask';
        if (!this._isEnabled()) return { ok: false, reason: 'Feature disabled' };

        try {
            const taskId = this._generateTaskId();
            const scheduledTask = {
                id: taskId, type: task.type, data: task.data || {}, priority: task.priority || this.PRIORITY.NORMAL,
                scheduledFor: task.scheduledFor || new Date(), createdAt: new Date(), status: 'PENDING'
            };
            const queue = this._getTaskQueue();
            queue.push(scheduledTask);
            this._saveTaskQueue(queue);
            Logger.info(context, 'Tarea programada', { taskId, type: task.type });
            return { ok: true, taskId };
        } catch (error) {
            Logger.error(context, 'Error programando tarea', error);
            return { ok: false, error: error.message };
        }
    },

    getStatus() {
        const queue = this._getTaskQueue();
        const pending = queue.filter(t => t.status === 'PENDING');
        return {
            ok: true, enabled: this._isEnabled(), pendingTasks: pending.length, queueSize: queue.length,
            tasksByType: this._groupByType(pending), lastExecution: this._getLastExecution(), triggersActive: this._checkTriggersActive()
        };
    },

    setupTriggers() {
        const context = 'AutomationEngine.setupTriggers';
        try {
            this._removeExistingTriggers();
            const triggers = [];

            const hourlyTrigger = ScriptApp.newTrigger('runAutomationEngine').timeBased().everyHours(1).create();
            triggers.push({ name: 'hourly', id: hourlyTrigger.getUniqueId() });

            const dailyTrigger = ScriptApp.newTrigger('runDailySummary').timeBased().atHour(7).everyDays(1).inTimezone('America/Lima').create();
            triggers.push({ name: 'daily_summary', id: dailyTrigger.getUniqueId() });

            const weeklyTrigger = ScriptApp.newTrigger('runWeeklyReport').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).inTimezone('America/Lima').create();
            triggers.push({ name: 'weekly_report', id: weeklyTrigger.getUniqueId() });

            Logger.info(context, 'Triggers configurados', { count: triggers.length });
            return { ok: true, triggers };
        } catch (error) {
            Logger.error(context, 'Error configurando triggers', error);
            return { ok: false, error: error.message };
        }
    },

    removeTriggers() {
        const removed = this._removeExistingTriggers();
        return { ok: true, removed };
    },

    _isEnabled() { return getConfig('FEATURES.ENABLE_AUTOMATION_ENGINE', true); },

    _getPendingTasks() {
        const queue = this._getTaskQueue();
        const now = new Date();
        return queue.filter(t => t.status === 'PENDING' && new Date(t.scheduledFor) <= now).sort((a, b) => a.priority - b.priority);
    },

    _executeTask(task) {
        const startTime = Date.now();
        let result = { ok: false };
        switch (task.type) {
            case this.TASK_TYPE.PTP_REMINDER: result = this._executePTPReminder(task.data); break;
            case this.TASK_TYPE.AGING_ALERT: result = this._executeAgingAlert(task.data); break;
            case this.TASK_TYPE.DAILY_SUMMARY: result = this._executeDailySummary(task.data); break;
            case this.TASK_TYPE.WEEKLY_REPORT: result = this._executeWeeklyReport(task.data); break;
            case this.TASK_TYPE.ESCALATION_CHECK: result = this._executeEscalationCheck(task.data); break;
            case this.TASK_TYPE.CLEANUP: result = this._executeCleanup(task.data); break;
            default: result = { ok: false, error: `Tipo desconocido: ${task.type}` };
        }
        result.duration = Date.now() - startTime;
        this._updateTaskStatus(task.id, result.ok ? 'COMPLETED' : 'FAILED');
        return result;
    },

    _executePTPReminder(data) { return typeof EmailAutomation !== 'undefined' ? EmailAutomation.sendPTPReminders() : { ok: false, error: 'EmailAutomation no disponible' }; },
    _executeAgingAlert(data) { return typeof EmailAutomation !== 'undefined' ? EmailAutomation.sendAgingAlerts() : { ok: false, error: 'EmailAutomation no disponible' }; },
    _executeDailySummary(data) { return typeof ReportScheduler !== 'undefined' ? ReportScheduler.generateDailySummary() : { ok: false, error: 'ReportScheduler no disponible' }; },
    _executeWeeklyReport(data) { return typeof ReportScheduler !== 'undefined' ? ReportScheduler.generateWeeklyReport() : { ok: false, error: 'ReportScheduler no disponible' }; },

    _executeEscalationCheck(data) {
        if (typeof CollectionWorkflow !== 'undefined') {
            const queue = CollectionWorkflow.getWorkQueue({ limit: 50 });
            const escalations = queue.items?.filter(i => i.urgencia === 'CRITICA') || [];
            if (escalations.length > 0 && typeof EmailAutomation !== 'undefined') {
                return EmailAutomation.sendEscalationNotification(escalations);
            }
            return { ok: true, escalations: escalations.length };
        }
        return { ok: false, error: 'CollectionWorkflow no disponible' };
    },

    _executeCleanup(data) {
        try {
            const sheet = this._getOrCreateLogSheet();
            const data = sheet.getDataRange().getValues();
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
            let deleted = 0;
            for (let i = data.length - 1; i > 0; i--) {
                if (data[i][0] && new Date(data[i][0]) < cutoff) { sheet.deleteRow(i + 1); deleted++; }
            }
            return { ok: true, deleted };
        } catch (e) { return { ok: false, error: e.message }; }
    },

    _getTaskQueue() { try { const props = PropertiesService.getScriptProperties(); const queueJson = props.getProperty('AUTOMATION_QUEUE'); return queueJson ? JSON.parse(queueJson) : []; } catch (e) { return []; } },
    _saveTaskQueue(queue) { try { const props = PropertiesService.getScriptProperties(); props.setProperty('AUTOMATION_QUEUE', JSON.stringify(queue.slice(-100))); } catch (e) { Logger.error('AutomationEngine._saveTaskQueue', 'Error', e); } },
    _updateTaskStatus(taskId, status) { const queue = this._getTaskQueue(); const task = queue.find(t => t.id === taskId); if (task) { task.status = status; task.completedAt = new Date(); this._saveTaskQueue(queue); } },
    _generateTaskId() { return 'TASK_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6); },
    _groupByType(tasks) { const groups = {}; tasks.forEach(t => { groups[t.type] = (groups[t.type] || 0) + 1; }); return groups; },
    _getLastExecution() { try { return PropertiesService.getScriptProperties().getProperty('AUTOMATION_LAST_RUN') || null; } catch (e) { return null; } },

    _logExecution(results) {
        try {
            PropertiesService.getScriptProperties().setProperty('AUTOMATION_LAST_RUN', results.timestamp);
            const sheet = this._getOrCreateLogSheet();
            sheet.appendRow([new Date(), results.tasksExecuted.length, results.errors.length, results.totalMs, JSON.stringify(results.tasksExecuted.map(t => t.type)), results.errors.length > 0 ? JSON.stringify(results.errors) : '']);
        } catch (e) { Logger.error('AutomationEngine._logExecution', 'Error', e); }
    },

    _getOrCreateLogSheet() {
        const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
        let sheet = ss.getSheetByName(this.LOG_SHEET);
        if (!sheet) {
            sheet = ss.insertSheet(this.LOG_SHEET);
            sheet.getRange(1, 1, 1, 6).setValues([['Timestamp', 'Tasks Executed', 'Errors', 'Duration (ms)', 'Tasks', 'Error Details']]).setFontWeight('bold').setBackground('#e3f2fd');
            sheet.setFrozenRows(1);
        }
        return sheet;
    },

    _checkTriggersActive() {
        const triggers = ScriptApp.getProjectTriggers();
        return triggers.filter(t => ['runAutomationEngine', 'runDailySummary', 'runWeeklyReport'].includes(t.getHandlerFunction())).length;
    },

    _removeExistingTriggers() {
        const triggers = ScriptApp.getProjectTriggers();
        let removed = 0;
        triggers.forEach(trigger => {
            if (['runAutomationEngine', 'runDailySummary', 'runWeeklyReport'].includes(trigger.getHandlerFunction())) {
                ScriptApp.deleteTrigger(trigger); removed++;
            }
        });
        return removed;
    }
};

function runAutomationEngine() { return AutomationEngine.runScheduledTasks(); }
function runDailySummary() { return typeof ReportScheduler !== 'undefined' ? ReportScheduler.generateDailySummary() : { ok: false, error: 'ReportScheduler no disponible' }; }
function runWeeklyReport() { return typeof ReportScheduler !== 'undefined' ? ReportScheduler.generateWeeklyReport() : { ok: false, error: 'ReportScheduler no disponible' }; }

function getAutomationStatus_API() { return AutomationEngine.getStatus(); }
function setupAutomationTriggers_API() { return AutomationEngine.setupTriggers(); }
function removeAutomationTriggers_API() { return AutomationEngine.removeTriggers(); }
function scheduleTask_API(task) { return AutomationEngine.scheduleTask(task); }
function runAutomationNow_API() { return AutomationEngine.runScheduledTasks(); }
