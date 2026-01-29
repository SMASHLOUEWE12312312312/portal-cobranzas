import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { MailQueueHealth } from '@/lib/types';

/**
 * Mail Queue Health Endpoint
 * GET /api/mail/queue-health
 */
export async function GET() {
    const correlationId = `qh-${Date.now()}`;

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
            'getMailQueueHealth',
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
        // GAS returns: { pendingCount, processingCount, failedCount24h, oldestPendingAgeMinutes, ... }
        const gasData = response.data || {};
        const health: MailQueueHealth = {
            pending: gasData.pendingCount || 0,
            processing: gasData.processingCount || 0,
            failed24h: gasData.failedCount24h || 0,
            staleCount: gasData.oldestProcessingAgeMinutes > 30 ? gasData.processingCount : 0,
            oldestPending: gasData.oldestPendingAgeMinutes 
                ? `${gasData.oldestPendingAgeMinutes} min` 
                : undefined,
            lastProcessed: gasData.lastProcessedAt || undefined,
        };

        return NextResponse.json({
            ok: true,
            correlationId: response.correlationId,
            data: health,
        }, {
            status: 200,
            headers: { 'Cache-Control': 'max-age=30' },
        });

    } catch (error) {
        console.error('Queue health error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
