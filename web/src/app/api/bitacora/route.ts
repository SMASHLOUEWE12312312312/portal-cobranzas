import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission, RBACError } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import { logAccessDenied, logApiError } from '@/lib/audit';
import type { Ciclo, BitacoraFilters, GestionInput, Pagination } from '@/lib/types';

/**
 * Bitácora API Routes
 * 
 * GET /api/bitacora - List ciclos with pagination and filters
 * POST /api/bitacora - Register a new gestión
 */

// =============================================================================
// GET: List Bitácora Ciclos
// =============================================================================

export async function GET(request: Request) {
    const correlationId = `bit-${Date.now()}`;

    try {
        const session = await getSession();

        // RBAC Check
        if (!hasPermission(session, 'BITACORA:READ')) {
            logAccessDenied(session, 'BITACORA:READ', '/api/bitacora', correlationId);
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado' },
            }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);

        // Build filters
        const filters: BitacoraFilters = {};
        const asegurado = searchParams.get('asegurado');
        const estadoGestion = searchParams.get('estadoGestion');
        const responsable = searchParams.get('responsable');
        const diasMin = searchParams.get('diasMin');
        const diasMax = searchParams.get('diasMax');

        if (asegurado) filters.asegurado = asegurado;
        if (estadoGestion) filters.estadoGestion = estadoGestion as BitacoraFilters['estadoGestion'];
        if (responsable) filters.responsable = responsable;
        if (diasMin) filters.diasMin = parseInt(diasMin, 10);
        if (diasMax) filters.diasMax = parseInt(diasMax, 10);

        // Get GAS token
        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        // Call GAS API
        const response = await callGASAuthenticated<{
            data: Ciclo[];
            pagination: Pagination;
        }>('getBitacoraResumen', {
            filtros: filters,
            opciones: { page, pageSize },
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
            data: response.data?.data || [],
            pagination: response.data?.pagination,
        }, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });

    } catch (error) {
        logApiError(error as Error, '/api/bitacora', correlationId);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}

// =============================================================================
// POST: Register New Gestión
// =============================================================================

export async function POST(request: Request) {
    const correlationId = `bit-${Date.now()}`;

    try {
        const session = await getSession();

        // RBAC Check
        if (!hasPermission(session, 'BITACORA:WRITE')) {
            logAccessDenied(session, 'BITACORA:WRITE', '/api/bitacora', correlationId);
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado para escribir' },
            }, { status: 403 });
        }

        // Parse request body
        const body: GestionInput = await request.json();

        // Validate required fields
        if (!body.asegurado || !body.tipoGestion || !body.estadoGestion) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Campos requeridos: asegurado, tipoGestion, estadoGestion',
                },
            }, { status: 400 });
        }

        // Sanitize text fields (XSS prevention)
        const sanitize = (str: string) => str.replace(/[<>"']/g, '').trim();
        const sanitizedPayload: GestionInput = {
            ...body,
            asegurado: sanitize(body.asegurado),
            observaciones: body.observaciones ? sanitize(body.observaciones) : undefined,
            proximaAccion: body.proximaAccion ? sanitize(body.proximaAccion) : undefined,
        };

        // Get GAS token
        const gasToken = await getGasToken();
        if (!gasToken) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'UNAUTHORIZED', message: 'Sesión inválida' },
            }, { status: 401 });
        }

        // Call GAS API
        const response = await callGASAuthenticated<{
            idGestion: string;
            idCiclo: string;
        }>('registrarGestionManualBitacora', {
            payload: sanitizedPayload,
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
            message: 'Gestión registrada exitosamente',
        }, { status: 201 });

    } catch (error) {
        if (error instanceof RBACError) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: error.code, message: error.message },
            }, { status: error.code === 'UNAUTHORIZED' ? 401 : 403 });
        }

        logApiError(error as Error, '/api/bitacora', correlationId);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno' },
        }, { status: 500 });
    }
}
