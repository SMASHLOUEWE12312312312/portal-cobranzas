import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { ZipResponse } from '@/lib/types';

/**
 * Create ZIP Endpoint
 * POST /api/eecc/zip
 * 
 * Creates a ZIP file from multiple generated files
 */
export async function POST(request: Request) {
    const correlationId = `zip-${Date.now()}`;

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
        const { fileUrls, zipName } = body;

        // Validate input
        if (!fileUrls || !Array.isArray(fileUrls) || fileUrls.length === 0) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Se requieren URLs de archivos' },
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

        const response = await callGASAuthenticated<ZipResponse>(
            'createZip_API',
            {
                fileUrls,
                zipName: zipName || `EECC_${new Date().toISOString().split('T')[0]}.zip`,
            },
            gasToken,
            { timeoutMs: 60000 }
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
        console.error('ZIP creation error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno al crear ZIP' },
        }, { status: 500 });
    }
}
