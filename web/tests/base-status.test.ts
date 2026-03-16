/**
 * Base Status Feature Tests
 *
 * Verifies the "Estado de Base de Datos" implementation across all layers:
 * - GAS backend: getBaseStatus() function and baseGetStatus() wrapper
 * - GAS main.js: doPost routing for 'getBaseStatus' action
 * - GAS index.html: UI card, JS function refreshBaseStatus(), integration hooks
 * - Upload metadata: uploadedBy tracking via PropertiesService
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
        expect(source).toMatch(/getConfig\(['"]SHEETS\.BASE['"]/);
    });

    it('should use SheetsIO._getSpreadsheet() to get the spreadsheet', () => {
        expect(source).toContain('SheetsIO._getSpreadsheet()');
    });

    it('should get lastModified from DriveApp', () => {
        expect(source).toMatch(/DriveApp\.getFileById/);
        expect(source).toMatch(/getLastUpdated\(\)\.toISOString\(\)/);
    });

    it('should return { ok, loaded, rows, lastModified, uploadedBy } on success', () => {
        expect(source).toMatch(/loaded:\s*lastRow\s*>\s*1/);
        expect(source).toMatch(/rows:\s*Math\.max\(0,\s*lastRow\s*-\s*1\)/);
        expect(source).toMatch(/lastModified:\s*uploadDate/);
        expect(source).toMatch(/uploadedBy:\s*uploadedBy/);
    });

    it('should handle missing sheet gracefully', () => {
        expect(source).toMatch(/return\s*\{\s*ok:\s*true,\s*loaded:\s*false,\s*rows:\s*0/);
    });

    it('should catch errors and return { ok: false }', () => {
        expect(source).toMatch(/catch\s*\(error\)/);
        expect(source).toMatch(/ok:\s*false,\s*error:\s*error\.message/);
    });

    it('should validate session when token is provided', () => {
        expect(source).toMatch(/AuthService\.validateSession\(token\)/);
    });

    it('should read BD_LAST_UPLOAD from PropertiesService', () => {
        expect(source).toContain("getProperty('BD_LAST_UPLOAD')");
    });

    it('should parse uploadedBy from stored metadata', () => {
        expect(source).toContain('parsed.user');
    });
});

describe('GAS Backend: subirArchivoBase upload metadata', () => {
    const source = readGasFile('portal_api.js');

    it('should save BD_LAST_UPLOAD to ScriptProperties after successful upload', () => {
        expect(source).toContain("setProperty('BD_LAST_UPLOAD'");
    });

    it('should store user, date, and rows in metadata JSON', () => {
        // Extract the metadata saving block
        const metaStart = source.indexOf("setProperty('BD_LAST_UPLOAD'");
        const metaBlock = source.substring(metaStart, metaStart + 200);
        expect(metaBlock).toContain('user:');
        expect(metaBlock).toContain('date:');
        expect(metaBlock).toContain('rows:');
    });

    it('should try to get user name from session data', () => {
        const fnStart = source.indexOf('function subirArchivoBase');
        const fnEnd = source.indexOf('function ', fnStart + 30);
        const fnBody = source.substring(fnStart, fnEnd);
        expect(fnBody).toContain('AuthService.getSessionData');
        expect(fnBody).toContain('displayName');
    });

    it('should fall back to Session.getActiveUser().getEmail()', () => {
        const fnStart = source.indexOf('function subirArchivoBase');
        const fnEnd = source.indexOf('function ', fnStart + 30);
        const fnBody = source.substring(fnStart, fnEnd);
        expect(fnBody).toContain('Session.getActiveUser().getEmail()');
    });

    it('should not block upload if metadata save fails', () => {
        const fnStart = source.indexOf('function subirArchivoBase');
        const fnEnd = source.indexOf('function ', fnStart + 30);
        const fnBody = source.substring(fnStart, fnEnd);
        // The metadata block is wrapped in try/catch
        expect(fnBody).toContain('No se pudo guardar metadata');
    });
});

// =============================================================================
// LAYER 1b: GAS Backend — conciliacion (BD Cruce upload metadata)
// =============================================================================

describe('GAS Backend: BD Cruce upload metadata', () => {
    const ioSource = readGasFile('conciliacion_io.js');
    const serviceSource = readGasFile('conciliacion_service.js');

    it('should save BD_CRUCE_LAST_UPLOAD after successful BD Sisnet upload', () => {
        expect(ioSource).toContain("setProperty('BD_CRUCE_LAST_UPLOAD'");
    });

    it('should store user and date in BD Cruce metadata', () => {
        const metaStart = ioSource.indexOf("setProperty('BD_CRUCE_LAST_UPLOAD'");
        const metaBlock = ioSource.substring(metaStart, metaStart + 200);
        expect(metaBlock).toContain('user:');
        expect(metaBlock).toContain('date:');
    });

    it('getBDCruceStatus should read BD_CRUCE_LAST_UPLOAD from PropertiesService', () => {
        expect(serviceSource).toContain("getProperty('BD_CRUCE_LAST_UPLOAD')");
    });

    it('getBDCruceStatus should return uploadedBy field', () => {
        const fnStart = serviceSource.indexOf('getBDCruceStatus');
        const fnBody = serviceSource.substring(fnStart, fnStart + 1500);
        expect(fnBody).toContain('uploadedBy:');
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
// LAYER 3: GAS index.html — UI Cards
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

        it('should have all four stat elements', () => {
            expect(html).toContain('id="statBaseLoaded"');
            expect(html).toContain('id="statBaseRows"');
            expect(html).toContain('id="statBaseDate"');
            expect(html).toContain('id="statBaseUser"');
        });

        it('should have correct labels for the four KPIs', () => {
            const baseCardMatch = html.indexOf('id="baseStatusCard"');
            const nextSection = html.indexOf('</section>', baseCardMatch);
            const cardHtml = html.substring(baseCardMatch, nextSection);

            expect(cardHtml).toContain('>Estado</div>');
            expect(cardHtml).toContain('>Registros</div>');
            expect(cardHtml).toContain('>Última carga</div>');
            expect(cardHtml).toContain('>Subido por</div>');
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
            const viewEnd = html.indexOf('id="view-generar"');
            expect(cardPos).toBeGreaterThan(viewStart);
            expect(cardPos).toBeLessThan(viewEnd);
        });

        it('should appear before the upload form card', () => {
            const cardPos = html.indexOf('id="baseStatusCard"');
            const fileInputPos = html.indexOf('id="fileInput"');
            expect(cardPos).toBeLessThan(fileInputPos);
        });

        it('should use 4-column grid layout', () => {
            const baseCardStart = html.indexOf('id="baseStatsGrid"');
            expect(baseCardStart).toBeGreaterThan(-1);
            const gridSection = html.substring(baseCardStart, baseCardStart + 200);
            expect(gridSection).toContain('repeat(4, 1fr)');
        });
    });
});

describe('GAS index.html: BD Cruce "Subido por" card', () => {
    const html = readGasFile('index.html');

    it('should have statBDCruceUser element', () => {
        expect(html).toContain('id="statBDCruceUser"');
    });

    it('should have "Subido por" label in BD Cruce card', () => {
        const cruceCardMatch = html.indexOf('id="conciliacionStatusCard"');
        const nextSection = html.indexOf('</section>', cruceCardMatch);
        const cardHtml = html.substring(cruceCardMatch, nextSection);
        expect(cardHtml).toContain('>Subido por</div>');
    });

    it('should use 4-column grid for BD Cruce card', () => {
        const cruceGridStart = html.indexOf('id="bdCruceStatsGrid"');
        const gridSection = html.substring(cruceGridStart, cruceGridStart + 200);
        expect(gridSection).toContain('repeat(4, 1fr)');
    });

    it('should have 4 stat-cards in BD Cruce section', () => {
        const cruceSection = html.substring(
            html.indexOf('id="bdCruceStatsGrid"'),
            html.indexOf('</section>', html.indexOf('id="conciliacionStatusCard"'))
        );
        const cruceStatCards = (cruceSection.match(/class="stat-card"/g) || []).length;
        expect(cruceStatCards).toBe(4);
    });
});

// =============================================================================
// LAYER 4: GAS index.html — JavaScript functions
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
        const fnBody = html.substring(fnStart, fnStart + 3000);
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

    it('should display uploadedBy in statBaseUser', () => {
        const fnStart = html.indexOf('function refreshBaseStatus()');
        const fnBody = html.substring(fnStart, fnStart + 3000);
        expect(fnBody).toContain('result.uploadedBy');
        expect(fnBody).toContain('statUser');
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
        expect(fnBody).toContain("getElementById('statBaseUser')");
    });
});

describe('GAS index.html: refreshConciliacionStatus() uploadedBy', () => {
    const html = readGasFile('index.html');

    it('should reference statBDCruceUser DOM element', () => {
        const fnStart = html.indexOf('function refreshConciliacionStatus()');
        const fnBody = html.substring(fnStart, fnStart + 500);
        expect(fnBody).toContain("getElementById('statBDCruceUser')");
    });

    it('should display uploadedBy when loaded', () => {
        const fnStart = html.indexOf('function refreshConciliacionStatus()');
        const fnBody = html.substring(fnStart, fnStart + 3000);
        expect(fnBody).toContain('result.uploadedBy');
    });

    it('should reset user to dash when not loaded', () => {
        const fnStart = html.indexOf('function refreshConciliacionStatus()');
        const fnBody = html.substring(fnStart, fnStart + 3000);
        // Find the else block (not loaded) and check statUser reset
        expect(fnBody).toContain("statUser.textContent = '-'");
    });
});

// =============================================================================
// LAYER 5: Integration hooks
// =============================================================================

describe('Integration: auto-refresh triggers', () => {
    const html = readGasFile('index.html');

    it('should call refreshBaseStatus when navigating to actualizar view', () => {
        const switchViewStart = html.indexOf('function switchView(viewName)');
        const switchViewEnd = html.indexOf('function ', switchViewStart + 30);
        const switchViewBody = html.substring(switchViewStart, switchViewEnd);

        expect(switchViewBody).toContain("viewName === 'actualizar'");
        expect(switchViewBody).toContain('refreshBaseStatus()');
    });

    it('should call refreshBaseStatus after successful upload', () => {
        const handleUploadStart = html.indexOf('function handleUpload()');
        const handleUploadEnd = html.indexOf('reader.onerror', handleUploadStart);
        const handleUploadBody = html.substring(handleUploadStart, handleUploadEnd);

        expect(handleUploadBody).toContain('refreshBaseStatus()');
    });

    it('should refresh after loadGrupos (correct order)', () => {
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
// LAYER 6: Parity between Base and BD Cruce
// =============================================================================

describe('Parity: Base Status vs BD Cruce Status', () => {
    const html = readGasFile('index.html');

    it('should have same number of stat-cards in both cards (4 each)', () => {
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

        expect(baseStatCards).toBe(4);
        expect(cruceStatCards).toBe(4);
    });

    it('should use same styling variables as BD Cruce cards', () => {
        const baseSection = html.substring(
            html.indexOf('id="baseStatsGrid"'),
            html.indexOf('</section>', html.indexOf('id="baseStatusCard"'))
        );

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

        expect(baseFn).toContain('withSuccessHandler');
        expect(baseFn).toContain('withFailureHandler');
        expect(cruceFn).toContain('withSuccessHandler');
        expect(cruceFn).toContain('withFailureHandler');

        expect(baseFn).toContain('result.ok');
        expect(baseFn).toContain('result.loaded');
        expect(baseFn).toContain('result.uploadedBy');
        expect(cruceFn).toContain('result.ok');
        expect(cruceFn).toContain('result.loaded');
        expect(cruceFn).toContain('result.uploadedBy');
    });

    it('GAS getBaseStatus and getBDCruceStatus should return same shape', () => {
        const portalApi = readGasFile('portal_api.js');
        const concService = readGasFile('conciliacion_service.js');

        const baseStart = portalApi.indexOf('function getBaseStatus');
        const baseReturn = portalApi.substring(baseStart, baseStart + 1500);

        const cruceStart = concService.indexOf('getBDCruceStatus');
        const cruceReturn = concService.substring(cruceStart, cruceStart + 1500);

        for (const field of ['ok:', 'loaded:', 'rows:', 'lastModified', 'uploadedBy']) {
            expect(baseReturn).toContain(field);
            expect(cruceReturn).toContain(field);
        }
    });
});
