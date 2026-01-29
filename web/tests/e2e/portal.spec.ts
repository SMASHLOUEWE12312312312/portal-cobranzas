/**
 * E2E Tests - Portal de Cobranzas
 * 
 * Playwright tests for critical user flows
 * Run: npx playwright test
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('Portal Public Pages', () => {
    test('should display landing page', async ({ page }) => {
        await page.goto(BASE_URL);
        await expect(page.locator('h1')).toContainText('Portal de Cobranzas');
        await expect(page.locator('a[href="/login"]')).toBeVisible();
    });

    test('should display login page', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await expect(page.locator('input[name="username"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
});

test.describe('Login Flow', () => {
    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', 'invalid');
        await page.fill('input[name="password"]', 'invalid');
        await page.click('button[type="submit"]');
        
        // Should show error message
        await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
    });

    test('should redirect to dashboard after valid login', async ({ page }) => {
        // Skip if no test credentials
        const username = process.env.TEST_USERNAME;
        const password = process.env.TEST_PASSWORD;
        if (!username || !password) {
            test.skip();
            return;
        }

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });
});

test.describe('Authenticated Flows', () => {
    // Setup: login before each test
    test.beforeEach(async ({ page }) => {
        const username = process.env.TEST_USERNAME;
        const password = process.env.TEST_PASSWORD;
        if (!username || !password) {
            test.skip();
            return;
        }

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('should navigate to dashboard and see stats', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`);
        await expect(page.locator('h1')).toContainText('Dashboard');
        
        // Should show quick actions
        await expect(page.locator('text=Accesos Directos')).toBeVisible();
    });

    test('should navigate to bitacora and see table', async ({ page }) => {
        await page.goto(`${BASE_URL}/bitacora`);
        await expect(page.locator('h1')).toContainText('Bitácora');
        
        // Should show filters
        await expect(page.locator('select')).toHaveCount({ minimum: 2 });
        
        // Should show table or loading
        await expect(page.locator('table, .skeleton')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to generar and see selector', async ({ page }) => {
        await page.goto(`${BASE_URL}/generar`);
        await expect(page.locator('h1')).toContainText('Generar Estado de Cuenta');
        
        // Should show mode selector
        await expect(page.locator('input[type="radio"]')).toHaveCount(2);
    });

    test('should navigate to enviar and see stepper', async ({ page }) => {
        await page.goto(`${BASE_URL}/enviar`);
        await expect(page.locator('h1')).toContainText('Enviar EECC');
        
        // Should show step 1 (Selection)
        await expect(page.locator('text=Selección')).toBeVisible();
    });

    test('should navigate to conciliacion and see status', async ({ page }) => {
        await page.goto(`${BASE_URL}/conciliacion`);
        await expect(page.locator('h1')).toContainText('Conciliación');
        
        // Should show BD Cruce status section
        await expect(page.locator('text=Estado de BD Cruce')).toBeVisible();
    });

    test('should navigate to actualizar and see upload form', async ({ page }) => {
        await page.goto(`${BASE_URL}/actualizar`);
        await expect(page.locator('h1')).toContainText('Actualizar Base');
        
        // Should show file input
        await expect(page.locator('input[type="file"]')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`);
        
        // Click logout
        await page.click('button:has-text("Cerrar Sesión")');
        
        // Should redirect to login
        await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
});

test.describe('Bitácora CRUD Flow', () => {
    test.beforeEach(async ({ page }) => {
        const username = process.env.TEST_USERNAME;
        const password = process.env.TEST_PASSWORD;
        if (!username || !password) {
            test.skip();
            return;
        }

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('should open new gestion modal', async ({ page }) => {
        await page.goto(`${BASE_URL}/bitacora`);
        
        // Click new gestion button
        await page.click('button:has-text("Nueva Gestión")');
        
        // Should show modal
        await expect(page.locator('h2:has-text("Nueva Gestión")')).toBeVisible();
        
        // Should have required fields
        await expect(page.locator('input[placeholder*="asegurado"]')).toBeVisible();
        await expect(page.locator('textarea')).toBeVisible();
    });

    test('should filter by estado', async ({ page }) => {
        await page.goto(`${BASE_URL}/bitacora`);
        
        // Select a filter
        await page.selectOption('select:first-of-type', 'EN_SEGUIMIENTO');
        
        // Wait for reload
        await page.waitForTimeout(1000);
        
        // Table should still be visible
        await expect(page.locator('table')).toBeVisible();
    });

    test('should search asegurado', async ({ page }) => {
        await page.goto(`${BASE_URL}/bitacora`);
        
        // Type in search
        await page.fill('input[type="search"]', 'test');
        
        // Wait for reload
        await page.waitForTimeout(1000);
        
        // Table should still be visible
        await expect(page.locator('table')).toBeVisible();
    });
});
