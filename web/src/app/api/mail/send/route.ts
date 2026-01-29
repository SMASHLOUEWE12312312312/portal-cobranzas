import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { SendMailResponse } from '@/lib/types';

/**
 * Send Emails Endpoint
 * POST /api/mail/send
 * 
 * Sends EECC emails to selected asegurados
 */
export async function POST(request: Request) {
    const correlationId = `send-${Date.now()}`;

    try {
        const session = await getSession();

        // Require MAIL:SEND permission
        if (!hasPermission(session, 'MAIL:SEND')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado para enviar correos' },
            }, { status: 403 });
        }

        const body = await request.json();
        const { items, options = {} } = body;

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Se requieren destinatarios' },
            }, { status: 400 });
        }

        // Limit batch size
        if (items.length > 50) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Máximo 50 correos por lote' },
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

        // Send emails
        const response = await callGASAuthenticated<SendMailResponse>(
            'sendEmailsNow',
            { items, options },
            gasToken,
            { timeoutMs: 180000 } // 3 minutes for batch send
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
        console.error('Send mail error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno al enviar correos' },
        }, { status: 500 });
    }
}
