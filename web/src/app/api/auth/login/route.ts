import { NextResponse } from 'next/server';
import { callGAS } from '@/lib/gas-client';
import { createSession } from '@/lib/session';
import type { User, UserRole } from '@/lib/types';

// =============================================================================
// In-memory rate limiter for login attempts (per IP)
// =============================================================================
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = loginAttempts.get(ip);

    // Clean expired entries periodically
    if (loginAttempts.size > 10000) {
        for (const [key, val] of loginAttempts) {
            if (now > val.resetAt) loginAttempts.delete(key);
        }
    }

    if (!entry || now > entry.resetAt) {
        loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= MAX_LOGIN_ATTEMPTS) {
        return false;
    }

    entry.count++;
    return true;
}

function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const real = request.headers.get('x-real-ip');
    return real || 'unknown';
}

/**
 * Login Endpoint
 * POST /api/auth/login
 *
 * Authenticates user via GAS and creates BFF session
 * Rate limited: 5 attempts per 15 minutes per IP
 */
export async function POST(request: Request) {
    try {
        // Rate limiting
        const clientIP = getClientIP(request);
        if (!checkRateLimit(clientIP)) {
            return NextResponse.json({
                ok: false,
                error: {
                    code: 'RATE_LIMITED',
                    message: 'Demasiados intentos. Intente nuevamente en 15 minutos.',
                },
            }, { status: 429 });
        }

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

        // Validate username format: only alphanumeric, dots, hyphens, underscores (max 50 chars)
        const sanitizedUsername = username.trim().toLowerCase();
        if (!/^[a-z0-9._-]{1,50}$/.test(sanitizedUsername)) {
            return NextResponse.json({
                ok: false,
                error: { code: 'VALIDATION_ERROR', message: 'Formato de usuario inválido' },
            }, { status: 400 });
        }

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
