import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { UploadResponse } from '@/lib/types';

/**
 * Base Upload Endpoint
 * POST /api/base/upload
 * 
 * Uploads Excel/CSV file to update BD sheet
 */
export async function POST(request: Request) {
    const correlationId = `upload-${Date.now()}`;

    try {
        const session = await getSession();

        // RBAC Check - need admin or cobranzas role
        if (!hasPermission(session, 'BASE:WRITE')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado para actualizar base' },
            }, { status: 403 });
        }

        // Parse request body
        const body = await request.json();
        const { dataBase64, name, mimeType, tieneEncabezado } = body;

        // Validate input
        if (!dataBase64 || typeof dataBase64 !== 'string') {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Archivo no proporcionado' },
            }, { status: 400 });
        }

        if (!name || typeof name !== 'string') {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Nombre de archivo requerido' },
            }, { status: 400 });
        }

        // Validate file extension
        const validExtensions = ['.xlsx', '.xls', '.csv'];
        const ext = name.toLowerCase().substring(name.lastIndexOf('.'));
        if (!validExtensions.includes(ext)) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Tipo de archivo no soportado. Use .xlsx, .xls o .csv' },
            }, { status: 400 });
        }

        // Size limit check (50MB base64 ≈ 37.5MB file)
        const maxSizeBase64 = 50 * 1024 * 1024;
        if (dataBase64.length > maxSizeBase64) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Archivo demasiado grande (máx 37.5MB)' },
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

        // Call GAS API with extended timeout
        const response = await callGASAuthenticated<UploadResponse>(
            'subirArchivoBase',
            {
                payload: {
                    dataBase64,
                    name,
                    mimeType: mimeType || 'application/octet-stream',
                    tieneEncabezado: tieneEncabezado !== false,
                },
            },
            gasToken,
            { timeoutMs: 120000 } // 2 minutes for large files
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
            message: response.data?.mensaje || 'Archivo procesado correctamente',
        }, { status: 200 });

    } catch (error) {
        console.error('Base upload error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno al procesar archivo' },
        }, { status: 500 });
    }
}
