import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';

/**
 * Asegurados por Grupo Endpoint
 * GET /api/eecc/grupos/[grupo]
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ grupo: string }> }
) {
    const correlationId = `grupo-aseg-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'EECC:READ')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        const { grupo } = await params;
        const decodedGrupo = decodeURIComponent(grupo);

        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        const response = await callGASAuthenticated<string[]>(
            'getAseguradosPorGrupo_API',
            { grupo: decodedGrupo },
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
            headers: { 'Cache-Control': 'max-age=300' },
        });

    } catch (error) {
        console.error('Grupo asegurados error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
