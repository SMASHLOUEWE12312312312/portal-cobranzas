import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { MailTemplate } from '@/lib/types';

/**
 * Mail Templates Endpoint
 * GET /api/mail/templates
 */
export async function GET() {
    const correlationId = `tpl-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'MAIL:READ')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await callGASAuthenticated<any>(
            'getMailTemplates',
            {},
            gasToken
        );

        if (!response.ok) {
            return NextResponse.json({
                ok: false,
                correlationId: response.correlationId,
                error: response.error,
            }, { status: 500 });
        }

        // GAS returns { ok, templates } directly (not nested in data)
        const templates = response.data?.templates || (response as unknown as { templates?: MailTemplate[] }).templates || [];

        return NextResponse.json({
            ok: true,
            correlationId: response.correlationId,
            data: templates,
        }, {
            status: 200,
            headers: { 'Cache-Control': 'max-age=300' },
        });

    } catch (error) {
        console.error('Mail templates error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
