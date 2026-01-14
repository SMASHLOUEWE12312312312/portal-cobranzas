import { NextResponse } from 'next/server';
import { getSession, refreshSession, isSessionConfigured } from '@/lib/session';

/**
 * Session Endpoint
 * GET /api/auth/session
 * 
 * Returns current session info or null if not authenticated.
 * Also refreshes the session to extend inactivity timeout.
 */
export async function GET() {
    // Check configuration
    if (!isSessionConfigured()) {
        return NextResponse.json({
            ok: false,
            error: {
                code: 'CONFIG_ERROR',
                message: 'Session not configured',
            },
        }, { status: 500 });
    }

    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({
                ok: true,
                data: null,
                authenticated: false,
            }, {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, max-age=0',
                },
            });
        }

        // Refresh session to extend inactivity timeout
        await refreshSession();

        // Calculate time remaining
        const now = Date.now();
        const expiresIn = Math.max(0, session.expiresAt - now);
        const expiresInMinutes = Math.floor(expiresIn / 60000);

        // Warning if session expires soon (< 30 min)
        const sessionWarning = expiresInMinutes < 30;

        return NextResponse.json({
            ok: true,
            authenticated: true,
            data: {
                user: {
                    username: session.user.username,
                    role: session.user.role,
                    displayName: session.user.displayName,
                },
                expiresAt: session.expiresAt,
                expiresInMinutes,
                createdAt: session.createdAt,
                sessionWarning,
            },
        }, {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });

    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({
            ok: false,
            error: {
                code: 'SESSION_ERROR',
                message: 'Error checking session',
            },
        }, { status: 500 });
    }
}
