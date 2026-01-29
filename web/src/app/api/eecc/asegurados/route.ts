import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';

/**
 * Asegurados List Endpoint
 * GET /api/eecc/asegurados
 * 
 * Supports both safe (full list) and paged modes
 */
export async function GET(request: Request) {
    const correlationId = `aseg-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'EECC:READ')) {
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

        // Parse query params
        const { searchParams } = new URL(request.url);
        const paged = searchParams.get('paged') === 'true';
        const search = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const cursor = searchParams.get('cursor') || null;

        if (paged) {
            // Paginated endpoint
            const response = await callGASAuthenticated<{
                items: string[];
                nextCursor: string | null;
                total: number;
                hasMore: boolean;
            }>('getAseguradosPaged', {
                options: { limit, cursor, search },
            }, gasToken);

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
            }, {
                status: 200,
                headers: { 'Cache-Control': 'max-age=60' },
            });
        } else {
            // Full list (safe)
            const response = await callGASAuthenticated<{
                list: string[];
                cached: boolean;
            }>('getAseguradosSafe', {}, gasToken);

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
                data: response.data?.list || [],
                cached: response.data?.cached,
            }, {
                status: 200,
                headers: { 'Cache-Control': 'max-age=300' },
            });
        }

    } catch (error) {
        console.error('Asegurados list error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
