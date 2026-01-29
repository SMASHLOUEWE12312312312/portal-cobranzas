import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';

/**
 * Test Email Endpoint
 * POST /api/mail/test
 * 
 * Sends a test email to the current user
 */
export async function POST(request: Request) {
    const correlationId = `test-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'MAIL:SEND')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        const body = await request.json();
        const { aseguradoId } = body;

        if (!aseguradoId || typeof aseguradoId !== 'string') {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'aseguradoId requerido' },
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

        const response = await callGASAuthenticated<{ messageId: string }>(
            'sendTestEmail',
            { aseguradoId },
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
            message: 'Correo de prueba enviado a tu bandeja',
        }, { status: 200 });

    } catch (error) {
        console.error('Test email error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
