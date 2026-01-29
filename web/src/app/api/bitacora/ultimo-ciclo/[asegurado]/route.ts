import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { Ciclo } from '@/lib/types';

/**
 * Último Ciclo por Asegurado Endpoint
 * GET /api/bitacora/ultimo-ciclo/[asegurado]
 * 
 * Returns the most recent cycle for an asegurado (for form prefill)
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ asegurado: string }> }
) {
    const correlationId = `bit-ult-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'BITACORA:READ')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        const { asegurado } = await params;
        const decodedAsegurado = decodeURIComponent(asegurado);

        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        const response = await callGASAuthenticated<Ciclo | null>(
            'getUltimoCicloPorAsegurado',
            { asegurado: decodedAsegurado },
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
            data: response.data,
        }, { status: 200 });

    } catch (error) {
        console.error('Bitacora ultimo ciclo error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
