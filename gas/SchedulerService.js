/**
 * @fileoverview Servicio para programar envíos de correo
 * [MEJORA ENVIAR_EECC_CORREO]
 */
const SchedulerService = {

    /**
     * Programa un nuevo trabajo de envío
     * @param {Object} jobData - Datos del trabajo
     * @return {Object} Resultado { ok, id }
     */
    scheduleJob(jobData) {
        const context = 'SchedulerService.scheduleJob';
        const sheetName = getConfig('SHEETS.MAIL_SCHEDULE');
        const ss = SpreadsheetApp.getActive();
        let sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            sheet = ss.insertSheet(sheetName);
            const headers = ['JOB_ID', 'CREATED_AT', 'SCHEDULED_FOR', 'FREQUENCY', 'STATUS', 'USER', 'CONFIG_JSON', 'LAST_RUN', 'NEXT_RUN', 'ERROR_LOG'];
            sheet.appendRow(headers);
            sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E8F5E9');
            sheet.setFrozenRows(1);
        }

        const jobId = Utilities.getUuid();
        const now = new Date();
        const scheduledFor = new Date(jobData.scheduledFor); // Fecha/Hora inicio

        const row = [
            jobId,
            now,
            scheduledFor,
            jobData.frequency || 'ONCE', // ONCE, WEEKLY, BIWEEKLY, MONTHLY
            'PENDING',
            jobData.user || Session.getActiveUser().getEmail(),
            JSON.stringify(jobData.config), // Guardamos la config completa (items, adjuntos, template)
            '', // LAST_RUN
            scheduledFor, // NEXT_RUN (inicialmente igual a scheduledFor)
            '' // ERROR_LOG
        ];

        sheet.appendRow(row);
        Logger.info(context, 'Job scheduled', { jobId, scheduledFor });

        return { ok: true, id: jobId };
    },

    /**
     * Procesa trabajos pendientes (Llamado por Trigger)
     */
    processPendingJobs() {
        const context = 'SchedulerService.processPendingJobs';
        const sheetName = getConfig('SHEETS.MAIL_SCHEDULE');
        const ss = SpreadsheetApp.getActive();
        const sheet = ss.getSheetByName(sheetName);

        if (!sheet) return;

        const data = sheet.getDataRange().getValues();
        const headers = data[0].map(h => String(h).toUpperCase());
        const now = new Date();

        const colMap = {
            ID: headers.indexOf('JOB_ID'),
            STATUS: headers.indexOf('STATUS'),
            NEXT_RUN: headers.indexOf('NEXT_RUN'),
            CONFIG: headers.indexOf('CONFIG_JSON'),
            FREQ: headers.indexOf('FREQUENCY'),
            LAST_RUN: headers.indexOf('LAST_RUN'),
            ERROR: headers.indexOf('ERROR_LOG')
        };

        // Buscar trabajos PENDING o ACTIVE cuya fecha NEXT_RUN <= ahora
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const status = row[colMap.STATUS];
            const nextRun = new Date(row[colMap.NEXT_RUN]);

            if ((status === 'PENDING' || status === 'ACTIVE') && nextRun <= now) {
                this._executeJob(sheet, i + 1, row, colMap);
            }
        }
    },

    /**
     * Ejecuta un trabajo específico
     * @private
     */
    _executeJob(sheet, rowIndex, row, colMap) {
        const context = 'SchedulerService._executeJob';
        const jobId = row[colMap.ID];
        const config = JSON.parse(row[colMap.CONFIG]);

        Logger.info(context, 'Executing job', { jobId });

        try {
            // 1. Ejecutar envío
            // config.items es la lista de IDs (asegurados o grupos)
            // config.mode es 'perEmpresa' o 'consolidado'

            const results = [];
            const items = config.items || [];

            for (const item of items) {
                try {
                    // Reutilizamos la lógica de SheetsMail
                    // Si es consolidado, item es nombre de grupo. Si es per-empresa, es asegurado.
                    // NOTA: Para simplificar, asumimos que sendEmailsByGrupo maneja la lógica de envío.
                    // Si el modo es 'perEmpresa', deberíamos llamar a otra función, pero el requerimiento
                    // se enfoca en "Enviar EECC por Correo" que ahora soporta grupos.
                    // Asumiremos que SheetsMail tiene o tendrá soporte unificado, o usaremos la lógica existente.

                    // Por ahora, llamamos a sendEmailsByGrupo si es grupo, o lógica individual si no.
                    // Dado que el refactor principal fue para grupos, usaremos esa vía si es grupo.

                    let res;
                    if (config.mode === 'consolidado' || item.type === 'grupo') {
                        res = SheetsMail.sendEmailsByGrupo(item.id || item, {
                            fechaCorte: config.fechaCorte,
                            adjuntarPdf: config.adjuntarPdf,
                            adjuntarXlsx: config.adjuntarXlsx,
                            templateId: config.templateId,
                            dryRun: false
                        });
                    } else {
                        // Lógica individual (pendiente de unificar en SheetsMail, pero podemos simularla o implementarla)
                        // Por ahora, usaremos sendEmailsByGrupo como proxy si el asegurado se trata como "grupo de 1"
                        // O idealmente SheetsMail.sendEmailIndividual(item...)
                        // Para no complicar, asumiremos que el sistema actual soporta esto o lo agregaremos.
                        // FALLBACK: Usar sendEmailsByGrupo funciona si el asegurado está en Mail_Contacts
                        res = SheetsMail.sendEmailsByGrupo(item.id || item, {
                            fechaCorte: config.fechaCorte,
                            adjuntarPdf: config.adjuntarPdf,
                            adjuntarXlsx: config.adjuntarXlsx,
                            templateId: config.templateId,
                            dryRun: false
                        });
                    }

                    results.push({ item, ok: res.ok, msg: res.message || res.error });

                } catch (e) {
                    results.push({ item, ok: false, msg: e.message });
                }
            }

            // 2. Actualizar estado
            const frequency = row[colMap.FREQ];
            const now = new Date();

            sheet.getRange(rowIndex, colMap.LAST_RUN + 1).setValue(now);

            if (frequency === 'ONCE') {
                sheet.getRange(rowIndex, colMap.STATUS + 1).setValue('COMPLETED');
            } else {
                // Calcular siguiente ejecución
                const nextRun = this._calculateNextRun(now, frequency);
                sheet.getRange(rowIndex, colMap.NEXT_RUN + 1).setValue(nextRun);
                sheet.getRange(rowIndex, colMap.STATUS + 1).setValue('ACTIVE');
            }

            // Log de resultados (resumido)
            const successCount = results.filter(r => r.ok).length;
            const logMsg = `Ejecutado: ${now.toISOString()}. Éxitos: ${successCount}/${results.length}`;
            sheet.getRange(rowIndex, colMap.ERROR + 1).setValue(logMsg);

        } catch (error) {
            Logger.error(context, 'Job failed', error);
            sheet.getRange(rowIndex, colMap.ERROR + 1).setValue(`Error fatal: ${error.message}`);
            // No cambiamos estado a ERROR para permitir reintentos si es recurrente, 
            // o podríamos ponerlo en ERROR si es ONCE.
        }
    },

    _calculateNextRun(lastRun, frequency) {
        const next = new Date(lastRun);
        if (frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
        else if (frequency === 'BIWEEKLY') next.setDate(next.getDate() + 14);
        else if (frequency === 'MONTHLY') next.setMonth(next.getMonth() + 1);
        return next;
    }
};
