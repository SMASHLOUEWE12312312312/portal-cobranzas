import { NextResponse } from 'next/server';
import { callGAS, checkGASConnection, validateGASConfig } from '@/lib/gas-client';

/**
 * Test GAS Connectivity Endpoint
 * GET /api/test-gas
 * 
 * Tests the BFF → GAS connection with HMAC authentication.
 * This is a diagnostic endpoint for verifying the proxy setup.
 */
export async function GET() {
    const correlationId = `test-${Date.now()}`;

    // Check configuration
    const config = validateGASConfig();
    if (!config.valid) {
        return NextResponse.json({
            ok: false,
            correlationId,
            status: 'config_error',
            message: `Missing environment variables: ${config.missing.join(', ')}`,
            checks: {
                gasUrl: !!process.env.GAS_BASE_URL,
                bffSecret: !!process.env.BFF_SHARED_SECRET,
            },
        }, { status: 500 });
    }

    // Test connectivity
    const connectionTest = await checkGASConnection();

    // Try a ping call
    let pingResult = null;
    if (connectionTest.connected) {
        pingResult = await callGAS('ping', {});
    }

    return NextResponse.json({
        ok: connectionTest.connected,
        correlationId,
        status: connectionTest.connected ? 'connected' : 'disconnected',
        latencyMs: connectionTest.latencyMs,
        pingResponse: pingResult,
        error: connectionTest.error,
        timestamp: new Date().toISOString(),
    }, {
        status: connectionTest.connected ? 200 : 503,
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
