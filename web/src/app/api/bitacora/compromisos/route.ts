import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';

interface GASCompromiso {
    asegurado: string;
    fechaCompromiso: string;
    snapshotVencidoPEN?: number;
    estadoGestion?: string;
    responsable?: string;
}

interface CompromisoNotification {
    asegurado: string;
    fechaCompromiso: string;
    monto?: number;
    estado: string;
    diasRestantes: number;
}

/**
 * Compromisos Activos Endpoint
 * GET /api/bitacora/compromisos
 * 
 * Returns active payment commitments (for notifications)
 */
export async function GET() {
    const correlationId = `bit-comp-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'BITACORA:READ')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await callGASAuthenticated<any>(
            'bitacoraGetCompromisosActivos',
            {},
            gasToken
        );

        if (!response.ok) {
            return NextResponse.json({
                ok: false,
                correlationId: response.correlationId,
                error: response.error,
            }, { status: 500 });
        }

        // Transform GAS data to notification format
        const gasData: GASCompromiso[] = response.data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const compromisos: CompromisoNotification[] = gasData.map(c => {
            const fechaComp = c.fechaCompromiso ? new Date(c.fechaCompromiso) : null;
            let diasRestantes = 999;

            if (fechaComp) {
                fechaComp.setHours(0, 0, 0, 0);
                diasRestantes = Math.floor((fechaComp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            }

            // Format date for display
            const fechaDisplay = fechaComp 
                ? fechaComp.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : 'Sin fecha';

            return {
                asegurado: c.asegurado,
                fechaCompromiso: fechaDisplay,
                monto: c.snapshotVencidoPEN || undefined,
                estado: c.estadoGestion || 'COMPROMISO_PAGO',
                diasRestantes,
            };
        });

        // Sort by urgency (most urgent first)
        compromisos.sort((a, b) => a.diasRestantes - b.diasRestantes);

        return NextResponse.json({
            ok: true,
            correlationId: response.correlationId,
            data: compromisos,
        }, {
            status: 200,
            headers: { 'Cache-Control': 'max-age=60' },
        });

    } catch (error) {
        console.error('Bitacora compromisos error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
