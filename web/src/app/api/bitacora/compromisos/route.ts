import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { CompromisoActivo } from '@/lib/types';

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

        const response = await callGASAuthenticated<CompromisoActivo[]>(
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

        return NextResponse.json({
            ok: true,
            correlationId: response.correlationId,
            data: response.data || [],
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
