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

        // Validate file extension
        const ext = fileName.toLowerCase().split('.').pop();
        if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Tipo de archivo no soportado. Use .xlsx, .xls o .csv' },
            }, { status: 400 });
        }

        // Validate file size (base64: ~4/3 of original size, limit to 50MB base64)
        const maxBase64Size = 50 * 1024 * 1024;
        if (base64Data.length > maxBase64Size) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Archivo demasiado grande (máx ~37MB)' },
            }, { status: 413 });
        }

        // Sanitize filename - remove path traversal and invalid chars
        const sanitizedFileName = fileName
            .replace(/\.\./g, '')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
            .slice(-255);

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
            { base64Data, fileName: sanitizedFileName, mimeType },
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
