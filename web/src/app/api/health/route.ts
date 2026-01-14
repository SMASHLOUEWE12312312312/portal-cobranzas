import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * GET /api/health
 * 
 * Returns system health status. Used by monitoring and load balancers.
 * This is the first BFF endpoint - simple ping to verify deployment.
 */
export async function GET() {
    const healthResponse = {
        ok: true,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        checks: {
            gas: {
                configured: !!process.env.GAS_BASE_URL,
                // Actual connectivity check will be in COMMIT 2
            },
            session: {
                configured: !!process.env.SESSION_SECRET,
            },
        },
    };

    return NextResponse.json(healthResponse, {
        status: 200,
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        },
    });
}
