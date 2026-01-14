import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const SESSION_COOKIE_NAME = 'portal_session';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/api/health', '/api/auth/login'];

// Routes that are partially public (auth optional)
const OPTIONAL_AUTH_ROUTES = ['/api/test-gas'];

/**
 * Middleware for route protection
 * 
 * - Validates session for protected routes
 * - Redirects to login if not authenticated
 * - Adds security headers
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
        return addSecurityHeaders(NextResponse.next());
    }

    // Optional auth routes - continue without validation
    if (OPTIONAL_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        return addSecurityHeaders(NextResponse.next());
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
        return handleUnauthenticated(request, pathname);
    }

    // Validate JWT
    try {
        if (!SESSION_SECRET) {
            console.warn('SESSION_SECRET not configured');
            return handleUnauthenticated(request, pathname);
        }

        const secretKey = new TextEncoder().encode(SESSION_SECRET);
        await jwtVerify(sessionCookie.value, secretKey);

        // Valid session - continue
        return addSecurityHeaders(NextResponse.next());

    } catch {
        // Invalid or expired token
        return handleUnauthenticated(request, pathname);
    }
}

/**
 * Handle unauthenticated requests
 */
function handleUnauthenticated(request: NextRequest, pathname: string): NextResponse {
    // API routes return 401
    if (pathname.startsWith('/api/')) {
        return NextResponse.json(
            { ok: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
            { status: 401 }
        );
    }

    // Page routes redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');

    // Prevent MIME sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // XSS protection (legacy, but still useful)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return response;
}

/**
 * Configure which routes the middleware runs on
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
