import { NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/session';
import { callGAS } from '@/lib/gas-client';

/**
 * Logout Endpoint
 * POST /api/auth/logout
 * 
 * Destroys BFF session and notifies GAS
 */
export async function POST() {
    try {
        const session = await getSession();

        // Notify GAS to invalidate token (best effort)
        if (session?.token) {
            await callGAS('logout', { token: session.token });
        }

        // Destroy BFF session
        await destroySession();

        return NextResponse.json({
            ok: true,
            message: 'Sesión cerrada',
        }, { status: 200 });

    } catch (error) {
        console.error('Logout error:', error);
        // Still destroy session even if GAS call fails
        await destroySession();

        return NextResponse.json({
            ok: true,
            message: 'Sesión cerrada',
        }, { status: 200 });
    }
}
