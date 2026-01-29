import { NextResponse } from 'next/server';
import { getSession, getGasToken } from '@/lib/session';
import { hasPermission } from '@/lib/rbac';
import { callGASAuthenticated } from '@/lib/gas-client';
import type { GenerateEECCResponse, GenerateEECCOptions } from '@/lib/types';

/**
 * Generate EECC Endpoint
 * POST /api/eecc/generate
 * 
 * Generates EECC for a single asegurado or grupo
 */
export async function POST(request: Request) {
    const correlationId = `gen-${Date.now()}`;

    try {
        const session = await getSession();

        if (!hasPermission(session, 'EECC:GENERATE')) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'FORBIDDEN', message: 'Permiso denegado para generar EECC' },
            }, { status: 403 });
        }

        const body = await request.json();
        const { asegurado, grupo, options = {} } = body;

        // Validate input
        if (!asegurado && !grupo) {
            return NextResponse.json({
                ok: false,
                correlationId,
                error: { code: 'VALIDATION_ERROR', message: 'Se requiere asegurado o grupo' },
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

        // Build generation options
        const genOptions: GenerateEECCOptions = {
            exportPdf: options.exportPdf !== false,
            exportXlsx: options.exportXlsx !== false,
            includeObs: options.includeObs || false,
            obsForRAM: options.obsForRAM || '__ALL__',
            rowsToSkip: options.rowsToSkip || [],
        };

        let response;

        if (grupo) {
            // Generate for entire grupo
            response = await callGASAuthenticated<GenerateEECCResponse>(
                'generateByGrupo_API',
                { grupo, opts: genOptions },
                gasToken,
                { timeoutMs: 120000 } // 2 minutes for groups
            );
        } else {
            // Generate for single asegurado
            response = await callGASAuthenticated<GenerateEECCResponse>(
                'generateForAsegurado_API',
                { asegurado, opts: genOptions },
                gasToken,
                { timeoutMs: 60000 }
            );
        }

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
        console.error('Generate EECC error:', error);
        return NextResponse.json({
            ok: false,
            correlationId,
            error: { code: 'INTERNAL_ERROR', message: 'Error interno al generar EECC' },
        }, { status: 500 });
    }
}
