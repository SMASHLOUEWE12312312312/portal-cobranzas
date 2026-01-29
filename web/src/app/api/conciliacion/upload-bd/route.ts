import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';

/**
 * Upload BD Sisnet Endpoint
 * POST /api/conciliacion/upload-bd
 * 
 * Uploads BD Sisnet file for conciliación
 */
export async function POST(request: Request) {
    const correlationId = `conc-upload-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'CONCILIACION:WRITE')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        const body = await request.json();
        const { base64Data, fileName, mimeType } = body;

        // Validate input
        if (!base64Data || typeof base64Data !== 'string') {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Archivo no proporcionado' },
            }, { status: 400 });
        }

        if (!fileName || typeof fileName !== 'string') {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Nombre de archivo requerido' },
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

        const response = await callGASAuthenticated<{ rowsLoaded: number }>(
            'conciliacion.uploadBDSisnet',
            { base64Data, fileName, mimeType },
            gasToken,
            { timeoutMs: 120000 }
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
            message: `BD Sisnet cargada con ${response.data?.rowsLoaded || 0} filas`,
        }, { status: 200 });

    } catch (error) {
        console.error('Conciliacion upload BD error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
