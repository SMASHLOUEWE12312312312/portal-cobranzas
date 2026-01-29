import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { Insurer } from '@/lib/types';

/**
 * Conciliación Insurers Endpoint
 * GET /api/conciliacion/insurers
 * 
 * Returns list of enabled insurers
 */
export async function GET() {
    const correlationId = `conc-ins-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'CONCILIACION:READ')) {
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
            'conciliacion.getInsurers',
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

        // GAS returns { ok: true, insurers: [...] } directly (not nested in data)
        const insurers = response.data?.insurers || (response as unknown as { insurers?: Insurer[] }).insurers || [];

        return NextResponse.json({
            ok: true,
            correlationId: response.correlationId,
            data: insurers,
        }, {
            status: 200,
            headers: { 'Cache-Control': 'max-age=3600' },
        });

    } catch (error) {
        console.error('Conciliacion insurers error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
