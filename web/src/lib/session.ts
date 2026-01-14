/**
 * Session Management Library
 * 
 * Handles httpOnly cookie-based sessions for the BFF.
 * Implements OWASP session management best practices:
 * - httpOnly cookies (not accessible to JS)
 * - Secure flag (HTTPS only)
 * - SameSite=Strict (CSRF protection)
 * - Inactivity timeout
 * - Absolute session timeout
 * 
 * @module session
 */

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Session, User, UserRole } from './types';

// =============================================================================
// Configuration
// =============================================================================

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const SESSION_TTL_SECONDS = parseInt(process.env.SESSION_TTL_SECONDS || '28800', 10); // 8 hours
const INACTIVITY_TIMEOUT_SECONDS = 3600; // 1 hour
const SESSION_COOKIE_NAME = 'portal_session';

// Encode secret for jose
const getSecretKey = () => new TextEncoder().encode(SESSION_SECRET);

// =============================================================================
// Types
// =============================================================================

interface SessionPayload extends JWTPayload {
    user: User;
    gasToken: string;
    createdAt: number;
    lastActivity: number;
}

// =============================================================================
// Session Creation
// =============================================================================

/**
 * Create a new session after successful login
 * Sets httpOnly cookie with signed JWT
 */
export async function createSession(user: User, gasToken: string): Promise<void> {
    if (!SESSION_SECRET) {
        throw new Error('SESSION_SECRET not configured');
    }

    const now = Date.now();
    const expiresAt = now + (SESSION_TTL_SECONDS * 1000);

    const payload: SessionPayload = {
        user,
        gasToken,
        createdAt: now,
        lastActivity: now,
    };

    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(expiresAt / 1000))
        .sign(getSecretKey());

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
    });
}

// =============================================================================
// Session Validation
// =============================================================================

/**
 * Get and validate current session
 * Returns null if no session or session invalid/expired
 */
export async function getSession(): Promise<Session | null> {
    if (!SESSION_SECRET) {
        return null;
    }

    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

        if (!sessionCookie?.value) {
            return null;
        }

        const { payload } = await jwtVerify<SessionPayload>(
            sessionCookie.value,
            getSecretKey()
        );

        // Check inactivity timeout
        const now = Date.now();
        const lastActivity = payload.lastActivity;
        const inactivityMs = now - lastActivity;

        if (inactivityMs > INACTIVITY_TIMEOUT_SECONDS * 1000) {
            // Session expired due to inactivity
            await destroySession();
            return null;
        }

        // Build session object
        const session: Session = {
            user: payload.user,
            token: payload.gasToken,
            expiresAt: (payload.exp || 0) * 1000,
            createdAt: payload.createdAt,
        };

        return session;
    } catch (error) {
        // Invalid or expired token
        console.error('Session validation error:', error);
        return null;
    }
}

/**
 * Refresh session - extend inactivity timeout
 * Call this on user activity
 */
export async function refreshSession(): Promise<boolean> {
    if (!SESSION_SECRET) {
        return false;
    }

    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

        if (!sessionCookie?.value) {
            return false;
        }

        const { payload } = await jwtVerify<SessionPayload>(
            sessionCookie.value,
            getSecretKey()
        );

        // Check absolute timeout
        const now = Date.now();
        const absoluteExpiry = payload.createdAt + (SESSION_TTL_SECONDS * 1000);
        if (now > absoluteExpiry) {
            await destroySession();
            return false;
        }

        // Update last activity and re-sign
        const updatedPayload: SessionPayload = {
            ...payload,
            lastActivity: now,
        };

        const remainingSeconds = Math.floor((absoluteExpiry - now) / 1000);

        const newToken = await new SignJWT(updatedPayload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime(Math.floor(absoluteExpiry / 1000))
            .sign(getSecretKey());

        cookieStore.set(SESSION_COOKIE_NAME, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: remainingSeconds,
        });

        return true;
    } catch {
        return false;
    }
}

// =============================================================================
// Session Destruction
// =============================================================================

/**
 * Destroy session - logout
 */
export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

// =============================================================================
// Session Helpers
// =============================================================================

/**
 * Check if user has a specific role
 */
export function hasRole(session: Session | null, role: UserRole): boolean {
    if (!session) return false;
    return session.user.role === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(session: Session | null): boolean {
    return hasRole(session, 'ADMIN');
}

/**
 * Get GAS token from session
 * Used for forwarding auth to GAS
 */
export async function getGasToken(): Promise<string | null> {
    const session = await getSession();
    return session?.token || null;
}

/**
 * Validate session secret is configured
 */
export function isSessionConfigured(): boolean {
    return !!SESSION_SECRET;
}
