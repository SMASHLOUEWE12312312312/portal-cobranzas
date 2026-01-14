import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import { logAccessDenied, logApiError } from '@/lib/audit';
import type { Gestion } from '@/lib/types';

/**
 * Bitácora Gestiones by Ciclo ID
 * 
 * GET /api/bitacora/[id] - Get all gestiones for a ciclo
 */

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    const { id } = await params;
    const correlationId = `bit-${Date.now()}`;

    try {
        const session = await getSession();

        // RBAC Check
        if (!hasPermission(session, 'BITACORA:READ')) {
            logAccessDenied(session, 'BITACORA:READ', `/api/bitacora/${id}`, correlationId);
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        // Validate ID
        if (!id || id.length < 5) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'ID de ciclo inválido' },
            }, { status: 400 });
        }

        // Get GAS token
        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        // Call GAS API
        const response = await callGASAuthenticated<{
            data: Gestion[];
        }>('bitacoraGetGestionesPorCiclo', {
            idCiclo: id,
        }, gasToken);

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
            data: response.data?.data || [],
        }, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });

    } catch (error) {
        logApiError(error as Error, `/api/bitacora/${id}`, correlationId);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
