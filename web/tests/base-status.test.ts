/**
 * Base Status Feature Tests
 *
 * Verifies the "Estado de Base de Datos" implementation across all layers:
 * - GAS backend: getBaseStatus() function and baseGetStatus() wrapper
 * - GAS main.js: doPost routing for 'getBaseStatus' action
 * - GAS index.html: UI card, JS function refreshBaseStatus(), integration hooks
 */

import * as fs from 'fs';
import * as path from 'path';

function readGasFile(filename: string): string {
    return fs.readFileSync(
        path.join(__dirname, '../../gas', filename),
        'utf-8'
    );
}

// =============================================================================
// LAYER 1: GAS Backend — portal_api.js
// =============================================================================

describe('GAS Backend: getBaseStatus()', () => {
    const source = readGasFile('portal_api.js');

    it('should define getBaseStatus function', () => {
        expect(source).toMatch(/function\s+getBaseStatus\s*\(/);
    });

    it('should read from the BD sheet via CONFIG SHEETS.BASE', () => {
        // Must use getConfig to get the sheet name, same pattern as updateBaseSheet
        expect(source).toMatch(/getConfig\(['"]SHEETS\.BASE['"]/);
    });

    it('should use SheetsIO._getSpreadsheet() to get the spreadsheet', () => {
        expect(source).toContain('SheetsIO._getSpreadsheet()');
    });

    it('should get lastModified from DriveApp', () => {
        expect(source).toMatch(/DriveApp\.getFileById/);
        expect(source).toMatch(/getLastUpdated\(\)\.toISOString\(\)/);
    });

    it('should return { ok, loaded, rows, lastModified } on success', () => {
        // Verify the return shape includes all required fields
        expect(source).toMatch(/loaded:\s*lastRow\s*>\s*1/);
        expect(source).toMatch(/rows:\s*Math\.max\(0,\s*lastRow\s*-\s*1\)/);
        expect(source).toMatch(/lastModified:\s*lastModified/);
    });

    it('should handle missing sheet gracefully', () => {
        // When sheet doesn't exist, should return loaded: false
        expect(source).toMatch(/return\s*\{\s*ok:\s*true,\s*loaded:\s*false,\s*rows:\s*0/);
    });

    it('should catch errors and return { ok: false }', () => {
        expect(source).toMatch(/catch\s*\(error\)/);
        expect(source).toMatch(/ok:\s*false,\s*error:\s*error\.message/);
    });

    it('should validate session when token is provided', () => {
        expect(source).toMatch(/AuthService\.validateSession\(token\)/);
    });
});

// =============================================================================
// LAYER 2: GAS main.js — doPost routing + sidebar wrapper
// =============================================================================

describe('GAS main.js: routing and wrapper', () => {
    const source = readGasFile('main.js');

    it('should route getBaseStatus action in doPost switch', () => {
        expect(source).toMatch(/case\s+['"]getBaseStatus['"]/);
        expect(source).toMatch(/getBaseStatus\(token\)/);
    });

    it('should wrap result with _wrapApiResponse', () => {
        expect(source).toMatch(/_wrapApiResponse\(getBaseStatus\(token\)\)/);
    });

    it('should define baseGetStatus() wrapper for google.script.run', () => {
        expect(source).toMatch(/function\s+baseGetStatus\s*\(\)/);
    });

    it('baseGetStatus should call getBaseStatus(null)', () => {
        expect(source).toMatch(/getBaseStatus\(null\)/);
    });

    it('baseGetStatus should handle errors gracefully', () => {
        expect(source).toMatch(/baseGetStatus ERROR/);
    });
});

// =============================================================================
// LAYER 3: GAS index.html — UI Card
// =============================================================================

describe('GAS index.html: Estado de Base de Datos card', () => {
    const html = readGasFile('index.html');

    describe('HTML Structure', () => {
        it('should have the base status card section', () => {
            expect(html).toContain('id="baseStatusCard"');
        });

        it('should have the status badge element', () => {
            expect(html).toContain('id="baseStatusBadge"');
        });

        it('should have all three stat elements', () => {
            expect(html).toContain('id="statBaseLoaded"');
            expect(html).toContain('id="statBaseRows"');
            expect(html).toContain('id="statBaseDate"');
        });

        it('should have correct labels for the three KPIs', () => {
            // Check the stat cards have proper labels
            const baseCardMatch = html.indexOf('id="baseStatusCard"');
            const nextSection = html.indexOf('</section>', baseCardMatch);
            const cardHtml = html.substring(baseCardMatch, nextSection);

            expect(cardHtml).toContain('>Estado</div>');
            expect(cardHtml).toContain('>Registros</div>');
            expect(cardHtml).toContain('>Última carga</div>');
        });

        it('should have the refresh button calling refreshBaseStatus()', () => {
            expect(html).toMatch(/onclick="refreshBaseStatus\(\)"/);
        });

        it('should display title "Estado de Base de Datos"', () => {
            expect(html).toContain('Estado de Base de Datos');
        });

        it('should be placed inside view-actualizar', () => {
            const viewStart = html.indexOf('id="view-actualizar"');
            const cardPos = html.indexOf('id="baseStatusCard"');
            const viewEnd = html.indexOf('id="view-generar"'); // next view
            expect(cardPos).toBeGreaterThan(viewStart);
            expect(cardPos).toBeLessThan(viewEnd);
        });

        it('should appear before the upload form card', () => {
            const cardPos = html.indexOf('id="baseStatusCard"');
            const fileInputPos = html.indexOf('id="fileInput"');
            expect(cardPos).toBeLessThan(fileInputPos);
        });

        it('should use grid layout with 3 columns like BD Cruce', () => {
            const baseCardStart = html.indexOf('id="baseStatsGrid"');
            expect(baseCardStart).toBeGreaterThan(-1);
            const gridSection = html.substring(baseCardStart, baseCardStart + 200);
            expect(gridSection).toContain('grid-template-columns');
        });
    });
});

// =============================================================================
// LAYER 4: GAS index.html — JavaScript function
// =============================================================================

describe('GAS index.html: refreshBaseStatus() function', () => {
    const html = readGasFile('index.html');

    it('should define refreshBaseStatus function', () => {
        expect(html).toMatch(/function\s+refreshBaseStatus\s*\(\)/);
    });

    it('should call google.script.run.baseGetStatus()', () => {
        expect(html).toContain('.baseGetStatus()');
    });

    it('should update badge to "Cargando..." while loading', () => {
        // Extract the function body
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 2000);
        expect(fnBody).toContain("badge.textContent = 'Cargando...'");
    });

    it('should set badge to "CARGADA" when loaded', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 2000);
        expect(fnBody).toMatch(/badge\.textContent\s*=\s*['"]CARGADA/);
    });

    it('should set badge to "Sin cargar" when not loaded', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 2000);
        expect(fnBody).toMatch(/badge\.textContent\s*=\s*['"]Sin cargar['"]/);
    });

    it('should display check emoji when loaded', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 2000);
        expect(fnBody).toContain("statLoaded.textContent = '✅'");
    });

    it('should display X emoji when not loaded', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 3000);
        expect(fnBody).toContain("statLoaded.textContent = '❌'");
    });

    it('should format rows with toLocaleString()', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 2000);
        expect(fnBody).toContain('.toLocaleString()');
    });

    it('should format date in es-PE locale', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 2000);
        expect(fnBody).toContain("'es-PE'");
    });

    it('should handle errors setting badge to "Error"', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 3000);
        expect(fnBody).toContain("badge.textContent = 'Error'");
        expect(fnBody).toContain('withFailureHandler');
    });

    it('should reference all DOM element IDs correctly', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 500);
        expect(fnBody).toContain("getElementById('baseStatusBadge')");
        expect(fnBody).toContain("getElementById('statBaseLoaded')");
        expect(fnBody).toContain("getElementById('statBaseRows')");
        expect(fnBody).toContain("getElementById('statBaseDate')");
    });
});

// =============================================================================
// LAYER 5: Integration hooks
// =============================================================================

describe('Integration: auto-refresh triggers', () => {
    const html = readGasFile('index.html');

    it('should call refreshBaseStatus when navigating to actualizar view', () => {
        // In switchView function, check for actualizar trigger
        const switchViewStart = html.indexOf('function switchView(viewName)');
        const switchViewEnd = html.indexOf('function ', switchViewStart + 30);
        const switchViewBody = html.substring(switchViewStart, switchViewEnd);

        expect(switchViewBody).toContain("viewName === 'actualizar'");
        expect(switchViewBody).toContain('refreshBaseStatus()');
    });

    it('should call refreshBaseStatus after successful upload', () => {
        // In handleUpload success handler, after loadGrupos()
        const handleUploadStart = html.indexOf('function handleUpload()');
        const handleUploadEnd = html.indexOf('reader.onerror', handleUploadStart);
        const handleUploadBody = html.substring(handleUploadStart, handleUploadEnd);

        expect(handleUploadBody).toContain('refreshBaseStatus()');
    });

    it('should refresh after loadGrupos (correct order)', () => {
        // refreshBaseStatus should come after loadGrupos in the success handler
        const handleUploadStart = html.indexOf('function handleUpload()');
        const handleUploadEnd = html.indexOf('reader.onerror', handleUploadStart);
        const handleUploadBody = html.substring(handleUploadStart, handleUploadEnd);

        const loadGruposPos = handleUploadBody.indexOf('loadGrupos()');
        const refreshPos = handleUploadBody.indexOf('refreshBaseStatus()');
        expect(loadGruposPos).toBeGreaterThan(-1);
        expect(refreshPos).toBeGreaterThan(loadGruposPos);
    });
});

// =============================================================================
// LAYER 6: Parity with BD Cruce implementation
// =============================================================================

describe('Parity: Base Status vs BD Cruce Status', () => {
    const html = readGasFile('index.html');

    it('should have same stat-card structure as BD Cruce', () => {
        // Both should have 3 stat-card divs
        const baseSection = html.substring(
            html.indexOf('id="baseStatsGrid"'),
            html.indexOf('</section>', html.indexOf('id="baseStatusCard"'))
        );
        const cruceSection = html.substring(
            html.indexOf('id="bdCruceStatsGrid"'),
            html.indexOf('</section>', html.indexOf('id="conciliacionStatusCard"'))
        );

        const baseStatCards = (baseSection.match(/class="stat-card"/g) || []).length;
        const cruceStatCards = (cruceSection.match(/class="stat-card"/g) || []).length;

        expect(baseStatCards).toBe(3);
        expect(cruceStatCards).toBe(3);
    });

    it('should use same styling variables as BD Cruce cards', () => {
        const baseSection = html.substring(
            html.indexOf('id="baseStatsGrid"'),
            html.indexOf('</section>', html.indexOf('id="baseStatusCard"'))
        );

        // Same CSS variables as BD Cruce
        expect(baseSection).toContain('var(--tp-primary)');
        expect(baseSection).toContain('var(--tp-info)');
        expect(baseSection).toContain('var(--tp-text-secondary)');
        expect(baseSection).toContain('var(--tp-text-muted)');
    });

    it('refreshBaseStatus should follow same pattern as refreshConciliacionStatus', () => {
        const baseFn = html.substring(
            html.indexOf('function refreshBaseStatus()'),
            html.indexOf('.baseGetStatus()') + 20
        );
        const cruceFn = html.substring(
            html.indexOf('function refreshConciliacionStatus()'),
            html.indexOf('.conciliacionGetStatus()') + 30
        );

        // Both should use withSuccessHandler/withFailureHandler pattern
        expect(baseFn).toContain('withSuccessHandler');
        expect(baseFn).toContain('withFailureHandler');
        expect(cruceFn).toContain('withSuccessHandler');
        expect(cruceFn).toContain('withFailureHandler');

        // Both should check result.ok and result.loaded
        expect(baseFn).toContain('result.ok');
        expect(baseFn).toContain('result.loaded');
        expect(cruceFn).toContain('result.ok');
        expect(cruceFn).toContain('result.loaded');
    });

    it('GAS getBaseStatus should return same shape as getBDCruceStatus', () => {
        const portalApi = readGasFile('portal_api.js');
        const concService = readGasFile('conciliacion_service.js');

        // Both should return: ok, loaded, rows, lastModified
        const baseStart = portalApi.indexOf('function getBaseStatus');
        const baseReturn = portalApi.substring(baseStart, baseStart + 1200);

        const cruceStart = concService.indexOf('getBDCruceStatus');
        const cruceReturn = concService.substring(cruceStart, cruceStart + 1200);

        // Same return shape fields
        for (const field of ['ok:', 'loaded:', 'rows:', 'lastModified']) {
            expect(baseReturn).toContain(field);
            expect(cruceReturn).toContain(field);
        }
    });
});
