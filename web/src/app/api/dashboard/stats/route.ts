import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { DashboardStats } from '@/lib/types';

/**
 * Dashboard Stats Endpoint
 * GET /api/dashboard/stats
 */
export async function GET() {
    const correlationId = `dash-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'DASHBOARD:READ')) {
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
            'getDashboardStats',
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

        // Transform GAS response to expected format
        // GAS returns: { eecc: {today, week}, mail: {sent24h, queuedNow}, system: {errors24h}, timestamp }
        const gasData = response.data || {};
        const stats: DashboardStats = {
            eeccToday: gasData.eecc?.today || 0,
            eeccWeek: gasData.eecc?.week || 0,
            mailSent24h: gasData.mail?.sent24h || 0,
            mailQueued: gasData.mail?.queuedNow || 0,
            errors24h: gasData.system?.errors24h || 0,
            lastUpdated: gasData.timestamp || new Date().toISOString(),
        };

        return NextResponse.json({
            ok: true,
            correlationId: response.correlationId,
            data: stats,
        }, {
            status: 200,
            headers: { 'Cache-Control': 'max-age=60, stale-while-revalidate=30' },
        });

    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
