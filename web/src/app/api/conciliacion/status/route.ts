import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { ConciliacionStatus } from '@/lib/types';

/**
 * Conciliación Status Endpoint
 * GET /api/conciliacion/status
 * 
 * Returns BD_Cruce status (loaded, rows, etc.)
 */
export async function GET() {
    const correlationId = `conc-status-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'CONCILIACION:READ')) {
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
            'conciliacion.getStatus',
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

        // GAS returns { ok, loaded, rows } directly (not nested in data)
        const gasData = response.data || response;
        const status: ConciliacionStatus = {
            bdCruceStatus: gasData.loaded ? 'loaded' : 'empty',
            lastUpdate: gasData.lastUpdate || null,
            rowCount: gasData.rows || 0,
        };

        return NextResponse.json({
            ok: true,
            correlationId: response.correlationId,
            data: status,
        }, {
            status: 200,
            headers: { 'Cache-Control': 'max-age=30' },
        });

    } catch (error) {
        console.error('Conciliacion status error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
