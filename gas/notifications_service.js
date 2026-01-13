/**
 * @fileoverview Notification Service for Phase 5 UX
 * @version 1.0.0 - Phase 5
 * 
 * Dual-tab notification center: Compromisos + Pipeline.
 * Reuses existing BitacoraService and EECCPipeline modules.
 * Feature-flagged: FEATURES.NOTIFICATIONS_CENTER_V2
 */

const NotificationService = {

    /**
     * Get compromiso notifications (Tab 1)
     * Reuses BitacoraService.obtenerCompromisosActivos()
     * 
     * @param {string} token - Session token (for auth validation)
     * @return {Array} Notifications with severity
     */
    getCompromisosNotifications(token) {
        const context = 'NotificationService.getCompromisosNotifications';

        try {
            // Get active compromisos (same data source as bitacoraGetCompromisosActivos)
            const compromisos = BitacoraService.obtenerCompromisosActivos();
            const today = new Date();
            const notifications = [];

            compromisos.forEach(c => {
                const fechaComp = c.fechaCompromiso ? new Date(c.fechaCompromiso) : null;
                if (!fechaComp) return;

                const diasDiff = this._daysBetween(today, fechaComp);
                let severidad = 'INFO';
                let titulo = '';
                let mensaje = '';

                if (diasDiff < 0) {
                    // Vencido
                    severidad = 'CRITICA';
                    titulo = `Compromiso vencido: ${c.asegurado}`;
                    mensaje = `Vencido hace ${Math.abs(diasDiff)} día(s)`;
                } else if (diasDiff === 0) {
                    // Vence hoy
                    severidad = 'ALTA';
                    titulo = `Compromiso vence HOY: ${c.asegurado}`;
                    mensaje = 'Requiere atención inmediata';
                } else if (diasDiff <= 3) {
                    // Próximo
                    severidad = 'MEDIA';
                    titulo = `Compromiso próximo: ${c.asegurado}`;
                    mensaje = `Vence en ${diasDiff} día(s)`;
                } else {
                    // Normal (más de 3 días)
                    return; // Skip normal compromisos to reduce noise
                }

                notifications.push({
                    id: `COMP_${c.idCiclo || c.asegurado}_${diasDiff}`,
                    categoria: 'COMPROMISO',
                    severidad,
                    titulo,
                    mensaje,
                    fechaCompromiso: fechaComp.toISOString(),
                    diasRestantes: diasDiff,
                    asegurado: c.asegurado,
                    idCiclo: c.idCiclo || '',
                    acciones: [
                        { id: 'ver', label: 'Ver bitácora' }
                    ]
                });
            });

            // Sort by severity (CRITICA first, then ALTA, then MEDIA)
            const severityOrder = { CRITICA: 0, ALTA: 1, MEDIA: 2, INFO: 3 };
            notifications.sort((a, b) => severityOrder[a.severidad] - severityOrder[b.severidad]);

            return notifications;

        } catch (error) {
            Logger.warn(context, 'Failed to get compromiso notifications', error);
            return [];
        }
    },

    /**
     * Get pipeline notifications (Tab 2)
     * Reuses EECCPipeline.getByState()
     * 
     * @param {string} token - Session token
     * @return {Array} Pipeline notifications (errors, pending)
     */
    getPipelineNotifications(token) {
        const context = 'NotificationService.getPipelineNotifications';

        try {
            // Skip if pipeline not enabled
            if (!EECCPipeline.isEnabled()) {
                return [];
            }

            const notifications = [];

            // Get ERROR state pipelines
            const errors = EECCPipeline.getByState(EECCPipeline.STATES.ERROR);
            errors.forEach(p => {
                notifications.push({
                    id: `PIPE_ERR_${p.PIPELINE_ID}`,
                    categoria: 'PIPELINE',
                    severidad: 'ALTA',
                    titulo: `Error en EECC: ${p.ASEGURADO}`,
                    mensaje: p.ERROR_MENSAJE || 'Error durante procesamiento',
                    pipelineId: p.PIPELINE_ID,
                    correlationId: p.CORRELATION_ID || '',
                    asegurado: p.ASEGURADO,
                    estado: p.ESTADO,
                    fechaActualizacion: p.FECHA_ACTUALIZACION ? new Date(p.FECHA_ACTUALIZACION).toISOString() : '',
                    acciones: [
                        { id: 'ver_detalle', label: 'Ver detalle' }
                    ]
                });
            });

            // Get GENERANDO/ENVIANDO stuck (more than 10 minutes)
            const generando = EECCPipeline.getByState(EECCPipeline.STATES.GENERANDO);
            const enviando = EECCPipeline.getByState(EECCPipeline.STATES.ENVIANDO);
            const stuck = [...generando, ...enviando];

            stuck.forEach(p => {
                const updatedAt = p.FECHA_ACTUALIZACION ? new Date(p.FECHA_ACTUALIZACION) : null;
                if (!updatedAt) return;

                const minutesSinceUpdate = (Date.now() - updatedAt.getTime()) / 60000;
                if (minutesSinceUpdate > 10) {
                    notifications.push({
                        id: `PIPE_STUCK_${p.PIPELINE_ID}`,
                        categoria: 'PIPELINE',
                        severidad: 'MEDIA',
                        titulo: `EECC atascado: ${p.ASEGURADO}`,
                        mensaje: `Estado ${p.ESTADO} hace ${Math.round(minutesSinceUpdate)} min`,
                        pipelineId: p.PIPELINE_ID,
                        correlationId: p.CORRELATION_ID || '',
                        asegurado: p.ASEGURADO,
                        estado: p.ESTADO,
                        fechaActualizacion: updatedAt.toISOString(),
                        acciones: [
                            { id: 'ver_detalle', label: 'Ver detalle' }
                        ]
                    });
                }
            });

            // Sort by severity
            const severityOrder = { CRITICA: 0, ALTA: 1, MEDIA: 2, INFO: 3 };
            notifications.sort((a, b) => severityOrder[a.severidad] - severityOrder[b.severidad]);

            return notifications;

        } catch (error) {
            Logger.warn(context, 'Failed to get pipeline notifications', error);
            return [];
        }
    },

    /**
     * Get all notifications (dual-tab)
     * 
     * @param {string} token - Session token
     * @return {Object} { ok, compromisos, pipeline, counts }
     */
    getAllNotifications(token) {
        const context = 'NotificationService.getAllNotifications';

        try {
            const compromisos = this.getCompromisosNotifications(token);
            const pipeline = this.getPipelineNotifications(token);

            const countCritica = compromisos.filter(n => n.severidad === 'CRITICA').length +
                pipeline.filter(n => n.severidad === 'CRITICA').length;
            const countAlta = compromisos.filter(n => n.severidad === 'ALTA').length +
                pipeline.filter(n => n.severidad === 'ALTA').length;

            return {
                ok: true,
                compromisos,
                pipeline,
                counts: {
                    compromisos: compromisos.length,
                    pipeline: pipeline.length,
                    total: compromisos.length + pipeline.length,
                    critica: countCritica,
                    alta: countAlta
                }
            };

        } catch (error) {
            Logger.error(context, 'Failed to get all notifications', error);
            return {
                ok: false,
                error: error.message,
                compromisos: [],
                pipeline: [],
                counts: { compromisos: 0, pipeline: 0, total: 0, critica: 0, alta: 0 }
            };
        }
    },

    /**
     * Helper: Days between two dates
     * @private
     */
    _daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
        return Math.round((d2 - d1) / oneDay);
    }
};
