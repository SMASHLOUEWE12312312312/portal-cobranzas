import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { PreviewData } from '@/lib/types';

/**
 * Preview Asegurado Endpoint
 * POST /api/eecc/preview
 */
export async function POST(request: Request) {
    const correlationId = `preview-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'EECC:READ')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        const body = await request.json();
        const { asegurado, maxRows = 200, includeObs = false, obsForRAM = '__ALL__' } = body;

        if (!asegurado || typeof asegurado !== 'string') {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Asegurado requerido' },
            }, { status: 400 });
        }

        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        const response = await callGASAuthenticated<PreviewData>(
            'previewAsegurado',
            { asegurado, maxRows, includeObs, obsForRAM },
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
        console.error('Preview error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
