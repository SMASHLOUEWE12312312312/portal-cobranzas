import { NextResponse } from 'next/server';
import { callGAS } from '@/lib/gas-client';
import { createSession } from '@/lib/session';
import type { User, UserRole } from '@/lib/types';

/**
 * Login Endpoint
 * POST /api/auth/login
 * 
 * Authenticates user via GAS and creates BFF session
 */
export async function POST(request: Request) {
    try {
        // Parse request body
        const body = await request.json();
        const { username, password } = body;

        // Validate input
        if (!username || typeof username !== 'string') {
            return NextResponse.json({
                ok: false,
                error: { code: 'VALIDATION_ERROR', message: 'Username required' },
            }, { status: 400 });
        }

        if (!password || typeof password !== 'string') {
            return NextResponse.json({
                ok: false,
                error: { code: 'VALIDATION_ERROR', message: 'Password required' },
            }, { status: 400 });
        }

        // Sanitize username (basic XSS prevention)
        const sanitizedUsername = username.trim().toLowerCase().replace(/[<>"'&]/g, '');

        // Call GAS login
        const gasResponse = await callGAS<{
            token: string;
            user: {
                username: string;
                role: string;
                displayName?: string;
                email?: string;
            };
            expiresAt: number;
        }>('login', {
            username: sanitizedUsername,
            password,
        });

        if (!gasResponse.ok || !gasResponse.data) {
            // Forward GAS error with generic message (don't leak info)
            return NextResponse.json({
                ok: false,
                correlationId: gasResponse.correlationId,
                error: {
                    code: 'AUTH_FAILED',
                    message: 'Credenciales inválidas',
                },
            }, { status: 401 });
        }

        // Map GAS user to our User type
        const user: User = {
            username: gasResponse.data.user.username,
            role: gasResponse.data.user.role as UserRole,
            displayName: gasResponse.data.user.displayName,
            email: gasResponse.data.user.email,
        };

        // Create BFF session with httpOnly cookie
        await createSession(user, gasResponse.data.token);

        // Return success (without token - it's in httpOnly cookie)
        return NextResponse.json({
            ok: true,
            correlationId: gasResponse.correlationId,
            data: {
                user: {
                    username: user.username,
                    role: user.role,
                    displayName: user.displayName,
                },
                expiresAt: gasResponse.data.expiresAt,
            },
        }, { status: 200 });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({
            ok: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Error interno del servidor',
            },
        }, { status: 500 });
    }
}
