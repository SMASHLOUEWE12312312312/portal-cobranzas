import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const SESSION_COOKIE_NAME = 'portal_session';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/api/health', '/api/auth/login'];

// Routes that are partially public (auth optional)
const OPTIONAL_AUTH_ROUTES = ['/api/test-gas'];

// Routes that need Power BI iframe (special CSP)
const POWERBI_ROUTES = ['/dashboard'];

/**
 * Middleware for route protection
 * 
 * - Validates session for protected routes
 * - Redirects to login if not authenticated
 * - Adds security headers
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const needsPowerBI = POWERBI_ROUTES.some(route => pathname === route || pathname.startsWith(route));

    // Allow public routes
    if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
        return addSecurityHeaders(NextResponse.next(), needsPowerBI);
    }

    // Optional auth routes - continue without validation
    if (OPTIONAL_AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        return addSecurityHeaders(NextResponse.next(), needsPowerBI);
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
        return addSecurityHeaders(NextResponse.next(), needsPowerBI);

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
 * CSP para rutas con Power BI embed
 * Note: Power BI requires 'unsafe-inline' for styles but NOT 'unsafe-eval' for scripts
 */
const POWERBI_CSP = [
    "default-src 'self'",
    "script-src 'self' https://app.powerbi.com https://*.powerbi.com https://*.msecnd.net https://vercel.live https://*.vercel.live",
    "style-src 'self' 'unsafe-inline' https://app.powerbi.com https://*.powerbi.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data: https://*.powerbi.com https://*.msecnd.net",
    "connect-src 'self' https://script.google.com https://app.powerbi.com https://*.powerbi.com https://*.analysis.windows.net https://*.microsoftonline.com wss://*.powerbi.com https://vercel.live wss://vercel.live",
    "frame-src 'self' https://app.powerbi.com https://*.powerbi.com",
    "child-src 'self' https://app.powerbi.com https://*.powerbi.com blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
].join("; ");

/**
 * CSP restrictiva para rutas normales (no Power BI)
 */
const DEFAULT_CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://script.google.com",
    "frame-src 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
].join("; ");

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse, allowPowerBI = false): NextResponse {
    // Prevent MIME sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // XSS protection (legacy, but still useful)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // HSTS - enforce HTTPS
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Prevent cross-domain policy loading
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

    if (allowPowerBI) {
        // Para rutas con Power BI: CSP permisiva para iframe, sin X-Frame-Options
        response.headers.set('Content-Security-Policy', POWERBI_CSP);
    } else {
        // Para otras rutas: CSP restrictiva + X-Frame-Options
        response.headers.set('Content-Security-Policy', DEFAULT_CSP);
        response.headers.set('X-Frame-Options', 'DENY');
    }

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
