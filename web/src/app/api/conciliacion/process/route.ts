import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { ConciliacionResult } from '@/lib/types';

/**
 * Process Conciliación Endpoint
 * POST /api/conciliacion/process
 * 
 * Processes insurer EECC file against BD_Cruce
 */
export async function POST(request: Request) {
    const correlationId = `conc-proc-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'CONCILIACION:PROCESS')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado para procesar' },
            }, { status: 403 });
        }

        const body = await request.json();
        const { insurerKey, base64Data, fileName, mimeType } = body;

        // Validate input
        if (!insurerKey || typeof insurerKey !== 'string') {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Aseguradora requerida' },
            }, { status: 400 });
        }

        if (!base64Data || typeof base64Data !== 'string') {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Archivo no proporcionado' },
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

        const response = await callGASAuthenticated<ConciliacionResult>(
            'conciliacion.process',
            { insurerKey, base64Data, fileName, mimeType },
            gasToken,
            { timeoutMs: 180000 } // 3 minutes for processing
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
        console.error('Conciliacion process error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno al procesar' },
        }, { status: 500 });
    }
}
