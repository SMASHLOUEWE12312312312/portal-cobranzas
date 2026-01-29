/**
 * Smoke Tests - Portal de Cobranzas
 * 
 * Quick tests to verify basic functionality works
 * Run: npx jest tests/smoke.test.ts
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Smoke Tests', () => {
    describe('Health Endpoints', () => {
        it('should return health status', async () => {
            const res = await fetch(`${BASE_URL}/api/health`);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBe(true);
            expect(data.status).toBe('healthy');
        });
    });

    describe('Auth Endpoints', () => {
        it('should reject unauthenticated requests to protected routes', async () => {
            const res = await fetch(`${BASE_URL}/api/dashboard/stats`);
            expect(res.status).toBe(403);
        });

        it('should reject invalid login', async () => {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'invalid',
                    password: 'invalid',
                }),
            });
            expect(res.status).toBe(401);
        });
    });

    describe('Public Pages', () => {
        it('should load landing page', async () => {
            const res = await fetch(`${BASE_URL}/`);
            expect(res.status).toBe(200);
        });

        it('should load login page', async () => {
            const res = await fetch(`${BASE_URL}/login`);
            expect(res.status).toBe(200);
        });
    });

    describe('Protected Pages (redirect to login)', () => {
        it('should redirect dashboard to login', async () => {
            const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
            expect([302, 307]).toContain(res.status);
        });

        it('should redirect bitacora to login', async () => {
            const res = await fetch(`${BASE_URL}/bitacora`, { redirect: 'manual' });
            expect([302, 307]).toContain(res.status);
        });
    });
});

// Integration tests that require authentication
describe('Integration Tests (Authenticated)', () => {
    let authCookie: string | null = null;

    // Skip if no credentials provided
    const username = process.env.TEST_USERNAME;
    const password = process.env.TEST_PASSWORD;

    beforeAll(async () => {
        if (!username || !password) {
            console.log('Skipping authenticated tests - no credentials provided');
            return;
        }

        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
            const setCookie = res.headers.get('set-cookie');
            if (setCookie) {
                authCookie = setCookie.split(';')[0];
            }
        }
    });

    const authenticatedFetch = async (path: string, options: RequestInit = {}) => {
        if (!authCookie) throw new Error('Not authenticated');
        return fetch(`${BASE_URL}${path}`, {
            ...options,
            headers: {
                ...options.headers,
                Cookie: authCookie,
            },
        });
    };

    describe('Dashboard', () => {
        it('should load dashboard stats', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/dashboard/stats');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });
    });

    describe('Bitácora', () => {
        it('should load bitácora resumen', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/bitacora?page=1&limit=10');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });

        it('should load responsables', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/bitacora/responsables');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });
    });

    describe('EECC', () => {
        it('should load asegurados list', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/eecc/asegurados');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });

        it('should load grupos list', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/eecc/grupos');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });
    });

    describe('Mail', () => {
        it('should load queue health', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/mail/queue-health');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });

        it('should load templates', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/mail/templates');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });
    });

    describe('Conciliación', () => {
        it('should load status', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/conciliacion/status');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });

        it('should load insurers', async () => {
            if (!authCookie) return;
            const res = await authenticatedFetch('/api/conciliacion/insurers');
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.ok).toBeDefined();
        });
    });
});
