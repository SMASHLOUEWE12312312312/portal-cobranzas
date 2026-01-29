import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { Gestion } from '@/lib/types';

/**
 * Gestiones por Asegurado Endpoint
 * GET /api/bitacora/asegurado/[nombre]
 * 
 * Returns all gestiones for an asegurado (for timeline view)
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ nombre: string }> }
) {
    const correlationId = `bit-aseg-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'BITACORA:READ')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        const { nombre } = await params;
        const decodedNombre = decodeURIComponent(nombre);

        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        const response = await callGASAuthenticated<Gestion[]>(
            'bitacoraGetGestionesPorAsegurado',
            { asegurado: decodedNombre },
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
        }, { status: 200 });

    } catch (error) {
        console.error('Bitacora asegurado gestiones error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
