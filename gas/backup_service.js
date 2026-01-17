/**
 * @fileoverview BackupService - Fase 1 Enterprise Foundations
 * @version 1.0.0
 * @author Portal Cobranzas Team
 * @lastModified 2026-01-15
 * 
 * CARACTERÍSTICAS:
 * - Backup automático de hojas críticas
 * - Retención configurable (default: 30 días)
 * - Notificación de éxito/fallo
 * - Restore manual disponible
 * 
 * FEATURE FLAG: FEATURES.ENABLE_AUTO_BACKUP
 */

const BackupService = {
    config: {
        backupFolderId: '',
        retentionDays: 30,
        criticalSheets: ['BD', 'Bitacora_Gestiones_EECC', 'Mail_Queue', 'Portal_Accesos'],
        backupPrefix: 'BACKUP_',
        notifyOnComplete: false
    },

    runDailyBackup() {
        const context = 'BackupService.runDailyBackup';

        if (!this._isEnabled()) {
            Logger.info(context, 'Backup deshabilitado por feature flag');
            return { ok: true, skipped: true, reason: 'Feature disabled' };
        }

        const result = {
            ok: true,
            timestamp: new Date().toISOString(),
            backups: [],
            errors: []
        };

        try {
            Logger.info(context, 'Iniciando backup diario...');

            const folder = this._getOrCreateBackupFolder();
            const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
            const fecha = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd_HHmm');
            const sheetsToBackup = getConfig('BACKUP.CRITICAL_SHEETS', this.config.criticalSheets);

            sheetsToBackup.forEach(sheetName => {
                try {
                    const sheet = ss.getSheetByName(sheetName);
                    if (!sheet) {
                        result.errors.push({ sheet: sheetName, error: 'Hoja no encontrada' });
                        return;
                    }

                    const backupName = `${this.config.backupPrefix}${sheetName}_${fecha}`;
                    const tempSs = SpreadsheetApp.create(backupName);

                    const data = sheet.getDataRange().getValues();
                    if (data.length > 0) {
                        const targetSheet = tempSs.getActiveSheet();
                        targetSheet.setName(sheetName);
                        targetSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
                    }

                    const file = DriveApp.getFileById(tempSs.getId());
                    file.moveTo(folder);

                    result.backups.push({
                        sheet: sheetName,
                        file: backupName,
                        rows: data.length,
                        fileId: tempSs.getId()
                    });

                    Logger.info(context, `Backup completado: ${sheetName}`, { rows: data.length });
                } catch (sheetError) {
                    result.errors.push({ sheet: sheetName, error: sheetError.message });
                    Logger.error(context, `Error en backup de ${sheetName}`, sheetError);
                }
            });

            const cleaned = this._cleanOldBackups(folder);
            result.cleanedBackups = cleaned;

            if (getConfig('BACKUP.NOTIFY_ON_COMPLETE', this.config.notifyOnComplete) && result.errors.length === 0) {
                this._notifySuccess(result);
            } else if (result.errors.length > 0) {
                this._notifyErrors(result);
            }

            result.ok = result.errors.length === 0;
            Logger.info(context, 'Backup diario completado', result);
            Logger.flush();

            return result;

        } catch (error) {
            result.ok = false;
            result.fatalError = error.message;
            Logger.error(context, 'Error fatal en backup', error);
            Logger.flush();
            return result;
        }
    },

    restoreFromBackup(backupFileId, targetSheetName, createNew = false) {
        const context = 'BackupService.restoreFromBackup';

        try {
            Logger.info(context, `Restaurando ${targetSheetName} desde backup ${backupFileId}`);

            const backupSs = SpreadsheetApp.openById(backupFileId);
            const backupSheet = backupSs.getSheets()[0];
            const data = backupSheet.getDataRange().getValues();

            if (data.length === 0) {
                return { ok: false, error: 'Backup vacío' };
            }

            const targetSs = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
            let targetSheet = targetSs.getSheetByName(targetSheetName);

            if (createNew || !targetSheet) {
                const newName = createNew ? `${targetSheetName}_restored_${Date.now()}` : targetSheetName;
                targetSheet = targetSs.insertSheet(newName);
            } else {
                targetSheet.clear();
            }

            targetSheet.getRange(1, 1, data.length, data[0].length).setValues(data);

            Logger.info(context, `Restauración completada: ${data.length} filas`);
            Logger.flush();

            return { ok: true, rowsRestored: data.length };

        } catch (error) {
            Logger.error(context, 'Error en restauración', error);
            Logger.flush();
            return { ok: false, error: error.message };
        }
    },

    listBackups(sheetName = null) {
        const context = 'BackupService.listBackups';

        try {
            const folder = this._getOrCreateBackupFolder();
            const files = folder.getFiles();
            const backups = [];

            while (files.hasNext()) {
                const file = files.next();
                const name = file.getName();

                if (!name.startsWith(this.config.backupPrefix)) continue;
                if (sheetName && !name.includes(sheetName)) continue;

                backups.push({
                    id: file.getId(),
                    name: name,
                    created: file.getDateCreated(),
                    size: file.getSize(),
                    url: file.getUrl()
                });
            }

            backups.sort((a, b) => b.created - a.created);
            return backups;

        } catch (error) {
            Logger.error(context, 'Error listando backups', error);
            return [];
        }
    },

    backupSingleSheet(sheetName) {
        const context = 'BackupService.backupSingleSheet';

        try {
            const folder = this._getOrCreateBackupFolder();
            const ss = SpreadsheetApp.openById(getConfig('SPREADSHEET_ID'));
            const sheet = ss.getSheetByName(sheetName);

            if (!sheet) {
                return { ok: false, error: 'Hoja no encontrada' };
            }

            const fecha = Utilities.formatDate(new Date(), 'America/Lima', 'yyyy-MM-dd_HHmmss');
            const backupName = `${this.config.backupPrefix}${sheetName}_MANUAL_${fecha}`;
            const tempSs = SpreadsheetApp.create(backupName);

            const data = sheet.getDataRange().getValues();
            if (data.length > 0) {
                const targetSheet = tempSs.getActiveSheet();
                targetSheet.setName(sheetName);
                targetSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
            }

            const file = DriveApp.getFileById(tempSs.getId());
            file.moveTo(folder);

            Logger.info(context, `Backup manual completado: ${sheetName}`, { rows: data.length });

            return { ok: true, fileId: tempSs.getId(), rows: data.length };

        } catch (error) {
            Logger.error(context, 'Error en backup manual', error);
            return { ok: false, error: error.message };
        }
    },

    _isEnabled() {
        return getConfig('FEATURES.ENABLE_AUTO_BACKUP', true);
    },

    _getOrCreateBackupFolder() {
        let folderId = getConfig('BACKUP.FOLDER_ID', '');

        if (folderId) {
            try {
                return DriveApp.getFolderById(folderId);
            } catch (e) {
                Logger.warn('BackupService', 'Folder configurado no accesible, creando nuevo');
            }
        }

        const folderName = 'Portal_Cobranzas_Backups';
        const folders = DriveApp.getFoldersByName(folderName);

        if (folders.hasNext()) {
            return folders.next();
        }

        const newFolder = DriveApp.createFolder(folderName);
        Logger.info('BackupService', `Carpeta de backups creada: ${folderName}`);
        return newFolder;
    },

    _cleanOldBackups(folder) {
        const retentionDays = getConfig('BACKUP.RETENTION_DAYS', this.config.retentionDays);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const files = folder.getFiles();
        let deleted = 0;

        while (files.hasNext()) {
            const file = files.next();
            if (file.getDateCreated() < cutoffDate) {
                file.setTrashed(true);
                deleted++;
            }
        }

        if (deleted > 0) {
            Logger.info('BackupService._cleanOldBackups', `Eliminados ${deleted} backups antiguos`);
        }

        return deleted;
    },

    _notifySuccess(result) {
        // P1-2: Use getAlertAdminEmails() for Script Properties support
        const admins = getAlertAdminEmails();
        if (admins.length === 0) return;

        const subject = '[PORTAL] Backup diario completado ✅';
        const body = `
Backup diario completado exitosamente.

Fecha: ${result.timestamp}
Hojas respaldadas: ${result.backups.length}
Backups antiguos eliminados: ${result.cleanedBackups}

Detalle:
${result.backups.map(b => `- ${b.sheet}: ${b.rows} filas`).join('\n')}
    `.trim();

        admins.forEach(email => {
            try {
                MailApp.sendEmail(email, subject, body);
            } catch (e) {
                console.error('Error enviando notificación a ' + email);
            }
        });
    },

    _notifyErrors(result) {
        // P1-2: Use getAlertAdminEmails() for Script Properties support
        const admins = getAlertAdminEmails();
        if (admins.length === 0) return;

        const subject = '[PORTAL ALERTA] Errores en backup diario ⚠️';
        const body = `
Se detectaron errores en el backup diario.

Fecha: ${result.timestamp}
Backups exitosos: ${result.backups.length}
Errores: ${result.errors.length}

Errores detectados:
${result.errors.map(e => `- ${e.sheet}: ${e.error}`).join('\n')}
    `.trim();

        admins.forEach(email => {
            try {
                MailApp.sendEmail(email, subject, body);
            } catch (e) {
                console.error('Error enviando notificación a ' + email);
            }
        });
    }
};

// ========== FUNCIONES PARA TRIGGERS ==========

function runScheduledBackup() {
    return BackupService.runDailyBackup();
}

function setupBackupTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'runScheduledBackup') {
            ScriptApp.deleteTrigger(trigger);
        }
    });

    const scheduleHour = getConfig('BACKUP.SCHEDULE_HOUR', 2);

    ScriptApp.newTrigger('runScheduledBackup')
        .timeBased()
        .atHour(scheduleHour)
        .everyDays(1)
        .inTimezone('America/Lima')
        .create();

    Logger.info('setupBackupTrigger', `Trigger de backup configurado para ${scheduleHour}:00 AM Lima`);
    Logger.flush();

    return { ok: true, message: `Trigger configurado para las ${scheduleHour}:00 AM` };
}

function removeBackupTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    let removed = 0;

    triggers.forEach(trigger => {
        if (trigger.getHandlerFunction() === 'runScheduledBackup') {
            ScriptApp.deleteTrigger(trigger);
            removed++;
        }
    });

    Logger.info('removeBackupTrigger', `Triggers eliminados: ${removed}`);
    return { ok: true, removed };
}

// ========== FUNCIONES API ==========

function listBackups_API(sheetName) {
    return BackupService.listBackups(sheetName);
}

function runBackup_API() {
    return BackupService.runDailyBackup();
}

function backupSheet_API(sheetName) {
    return BackupService.backupSingleSheet(sheetName);
}

function restoreBackup_API(fileId, sheetName, createNew) {
    return BackupService.restoreFromBackup(fileId, sheetName, createNew);
}
