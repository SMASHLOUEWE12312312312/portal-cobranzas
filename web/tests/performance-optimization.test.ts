/**
 * Performance Optimization Tests
 * Validates Priority 1 & Priority 2 optimizations were implemented correctly
 */
import * as fs from 'fs';
import * as path from 'path';

const GAS_DIR = path.join(__dirname, '../../gas');

function readGasFile(filename: string): string {
  return fs.readFileSync(path.join(GAS_DIR, filename), 'utf-8');
}

describe('Priority 1: Consolidated google.script.run calls', () => {
  const portalApi = readGasFile('portal_api.js');
  const indexHtml = readGasFile('index.html');

  describe('Item 1: obtenerDatosIniciales (server)', () => {
    it('should define obtenerDatosIniciales function', () => {
      expect(portalApi).toContain('function obtenerDatosIniciales(token)');
    });

    it('should validate session', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerDatosIniciales'),
        portalApi.indexOf('function refreshDashboardConsolidado')
      );
      expect(fn).toContain('AuthService.validateSession(token)');
    });

    it('should fetch dashboardStats, queueHealth, and grupos', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerDatosIniciales'),
        portalApi.indexOf('function refreshDashboardConsolidado')
      );
      expect(fn).toContain('MonitoringService.getDashboardStats()');
      expect(fn).toContain('MonitoringService.getMailQueueHealth()');
      expect(fn).toContain('GrupoEconomicoService.getGrupos()');
    });

    it('should return ok with all three data keys', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerDatosIniciales'),
        portalApi.indexOf('function refreshDashboardConsolidado')
      );
      expect(fn).toContain('dashboardStats:');
      expect(fn).toContain('queueHealth:');
      expect(fn).toContain('grupos:');
    });

    it('should handle individual failures gracefully with try-catch', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerDatosIniciales'),
        portalApi.indexOf('function refreshDashboardConsolidado')
      );
      // Each sub-call wrapped in its own try-catch
      const tryCatchCount = (fn.match(/try\s*\{/g) || []).length;
      expect(tryCatchCount).toBeGreaterThanOrEqual(4); // outer + 3 inner
    });

    it('should provide fallback defaults for failed sub-calls', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerDatosIniciales'),
        portalApi.indexOf('function refreshDashboardConsolidado')
      );
      expect(fn).toContain('dashboardStats || { ok: false }');
      expect(fn).toContain('queueHealth || { ok: false }');
      expect(fn).toContain('grupos || []');
    });
  });

  describe('Item 1: obtenerDatosIniciales (client)', () => {
    it('should call obtenerDatosIniciales in initPortal', () => {
      expect(indexHtml).toContain('.obtenerDatosIniciales(TOKEN)');
    });

    it('should have fallback to individual calls on failure', () => {
      // On withFailureHandler, should fall back to loadGrupos, refreshDashboardStats, loadQueueHealth
      const initSection = indexHtml.substring(
        indexHtml.indexOf('obtenerDatosIniciales'),
        indexHtml.indexOf('obtenerDatosIniciales') + 2000
      );
      expect(initSection).toContain('loadGrupos()');
      expect(initSection).toContain('refreshDashboardStats()');
      expect(initSection).toContain('loadQueueHealth()');
    });
  });

  describe('Item 2: obtenerBitacoraCompleta (server)', () => {
    it('should define obtenerBitacoraCompleta function', () => {
      expect(portalApi).toContain('function obtenerBitacoraCompleta(token)');
    });

    it('should validate session', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerBitacoraCompleta'),
        portalApi.indexOf('function bitacoraGetResumenCiclos')
      );
      expect(fn).toContain('AuthService.validateSession(token)');
    });

    it('should return resumen, clientes, and responsables', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerBitacoraCompleta'),
        portalApi.indexOf('function bitacoraGetResumenCiclos')
      );
      expect(fn).toContain('resumen:');
      expect(fn).toContain('clientes:');
      expect(fn).toContain('responsables:');
    });

    it('should serialize dates to ISO string', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerBitacoraCompleta'),
        portalApi.indexOf('function bitacoraGetResumenCiclos')
      );
      expect(fn).toContain('toISOString()');
      expect(fn).toContain('fechaEnvioEECC');
      expect(fn).toContain('fechaRegistro');
      expect(fn).toContain('fechaCompromiso');
    });

    it('should handle individual failures gracefully', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerBitacoraCompleta'),
        portalApi.indexOf('function bitacoraGetResumenCiclos')
      );
      const tryCatchCount = (fn.match(/try\s*\{/g) || []).length;
      expect(tryCatchCount).toBeGreaterThanOrEqual(4); // outer + 3 inner
    });

    it('should return empty arrays on auth failure', () => {
      const fn = portalApi.substring(
        portalApi.indexOf('function obtenerBitacoraCompleta'),
        portalApi.indexOf('function bitacoraGetResumenCiclos')
      );
      expect(fn).toContain('resumen: [], clientes: [], responsables: []');
    });
  });

  describe('Item 2: obtenerBitacoraCompleta (client)', () => {
    it('should call obtenerBitacoraCompleta in initBitacoraInline', () => {
      expect(indexHtml).toContain('.obtenerBitacoraCompleta(TOKEN)');
    });

    it('should populate BITACORA_DATA from resumen', () => {
      const section = indexHtml.substring(
        indexHtml.indexOf('.obtenerBitacoraCompleta(TOKEN)') - 3000,
        indexHtml.indexOf('.obtenerBitacoraCompleta(TOKEN)')
      );
      expect(section).toContain('BITACORA_DATA = result.resumen');
    });

    it('should populate BITACORA_CLIENTES from clientes', () => {
      const section = indexHtml.substring(
        indexHtml.indexOf('.obtenerBitacoraCompleta(TOKEN)') - 2000,
        indexHtml.indexOf('.obtenerBitacoraCompleta(TOKEN)') + 500
      );
      expect(section).toContain('BITACORA_CLIENTES = result.clientes');
    });

    it('should populate BITACORA_RESPONSABLES from responsables', () => {
      const section = indexHtml.substring(
        indexHtml.indexOf('.obtenerBitacoraCompleta(TOKEN)') - 2000,
        indexHtml.indexOf('.obtenerBitacoraCompleta(TOKEN)') + 500
      );
      expect(section).toContain('BITACORA_RESPONSABLES = result.responsables');
    });

    it('should have fallback to individual calls on failure', () => {
      const section = indexHtml.substring(
        indexHtml.indexOf('.obtenerBitacoraCompleta(TOKEN)') - 2000,
        indexHtml.indexOf('.obtenerBitacoraCompleta(TOKEN)') + 500
      );
      expect(section).toContain('window.loadBitacoraData');
      expect(section).toContain('window.loadClientesConCiclos');
      expect(section).toContain('window.loadResponsablesUnicos');
    });
  });

  describe('Item 3: _loadBDForDashboard cache', () => {
    const dashReports = readGasFile('dashboard_reports.js');

    it('should define cache variables', () => {
      expect(dashReports).toContain('var _bdDashboardCache = null');
      expect(dashReports).toContain('var _bdDashboardCacheTime = 0');
      expect(dashReports).toContain('BD_DASHBOARD_CACHE_TTL');
    });

    it('should have 60s TTL', () => {
      expect(dashReports).toContain('BD_DASHBOARD_CACHE_TTL = 60000');
    });

    it('should check cache before reading sheet', () => {
      const fn = dashReports.substring(
        dashReports.indexOf('function _loadBDForDashboard()'),
        dashReports.indexOf('function _parseNum')
      );
      // Cache check should come before SheetsIO.readSheet
      const cacheCheckIdx = fn.indexOf('_bdDashboardCache &&');
      const sheetReadIdx = fn.indexOf('SheetsIO.readSheet');
      expect(cacheCheckIdx).toBeLessThan(sheetReadIdx);
      expect(cacheCheckIdx).toBeGreaterThan(0);
    });

    it('should return cached result when valid', () => {
      const fn = dashReports.substring(
        dashReports.indexOf('function _loadBDForDashboard()'),
        dashReports.indexOf('function _parseNum')
      );
      expect(fn).toContain('return _bdDashboardCache');
    });

    it('should store result in cache after fresh read', () => {
      const fn = dashReports.substring(
        dashReports.indexOf('function _loadBDForDashboard()'),
        dashReports.indexOf('function _parseNum')
      );
      expect(fn).toContain('_bdDashboardCache = result');
      expect(fn).toContain('_bdDashboardCacheTime = Date.now()');
    });
  });

  describe('Item 4: Polling interval 180s', () => {
    it('should use 180000ms interval', () => {
      expect(indexHtml).toContain('180000');
    });

    it('should NOT use 60000ms interval for dashboard refresh', () => {
      // The old 60000 should be gone from startDashboardAutoRefresh
      const fnStart = indexHtml.indexOf('function startDashboardAutoRefresh()');
      const fnEnd = indexHtml.indexOf('function stopDashboardAutoRefresh()');
      const fn = indexHtml.substring(fnStart, fnEnd);
      expect(fn).not.toContain('60000');
      expect(fn).toContain('180000');
    });
  });
});

describe('Priority 2: Additional optimizations', () => {
  const indexHtml = readGasFile('index.html');
  const portalApi = readGasFile('portal_api.js');

  describe('Item 5: loadGrupos sessionStorage cache', () => {
    it('should define GRUPOS_CACHE_KEY', () => {
      expect(indexHtml).toContain("GRUPOS_CACHE_KEY = 'portal_grupos_cache'");
    });

    it('should define GRUPOS_CACHE_TTL as 10 minutes', () => {
      expect(indexHtml).toContain('GRUPOS_CACHE_TTL = 10 * 60 * 1000');
    });

    it('should check sessionStorage before server call', () => {
      const fnStart = indexHtml.indexOf('function loadGrupos()');
      const fnEnd = indexHtml.indexOf('function toggleEECCMode');
      const fn = indexHtml.substring(fnStart, fnEnd);
      // sessionStorage check should appear before getGrupos_API
      const cacheCheckIdx = fn.indexOf('sessionStorage.getItem(GRUPOS_CACHE_KEY)');
      const serverCallIdx = fn.indexOf('.getGrupos_API(TOKEN)');
      expect(cacheCheckIdx).toBeGreaterThan(0);
      expect(cacheCheckIdx).toBeLessThan(serverCallIdx);
    });

    it('should save to sessionStorage on successful server response', () => {
      const fnStart = indexHtml.indexOf('function loadGrupos()');
      const fnEnd = indexHtml.indexOf('function toggleEECCMode');
      const fn = indexHtml.substring(fnStart, fnEnd);
      expect(fn).toContain('sessionStorage.setItem(GRUPOS_CACHE_KEY');
    });

    it('should validate cache TTL before using cached data', () => {
      const fnStart = indexHtml.indexOf('function loadGrupos()');
      const fnEnd = indexHtml.indexOf('function toggleEECCMode');
      const fn = indexHtml.substring(fnStart, fnEnd);
      expect(fn).toContain('GRUPOS_CACHE_TTL');
      expect(fn).toContain('Date.now() - timestamp');
    });
  });

  describe('Item 6: loadAsegurados preload preserved', () => {
    it('should preload asegurados in initPortal with setTimeout', () => {
      const initSection = indexHtml.substring(
        indexHtml.indexOf('Portal inicializado'),
        indexHtml.indexOf('inicializarNotificaciones')
      );
      expect(initSection).toContain('setTimeout(() => loadAsegurados(), 500)');
    });
  });

  describe('Item 7: Consolidated polling', () => {
    it('should define refreshDashboardConsolidado server function', () => {
      expect(portalApi).toContain('function refreshDashboardConsolidado(token)');
    });

    it('should define refreshDashboardAll client function', () => {
      expect(indexHtml).toContain('function refreshDashboardAll()');
    });

    it('should call refreshDashboardConsolidado from client', () => {
      expect(indexHtml).toContain('.refreshDashboardConsolidado(TOKEN)');
    });

    it('should use refreshDashboardAll in startDashboardAutoRefresh', () => {
      const fnStart = indexHtml.indexOf('function startDashboardAutoRefresh()');
      const fnEnd = indexHtml.indexOf('function stopDashboardAutoRefresh()');
      const fn = indexHtml.substring(fnStart, fnEnd);
      expect(fn).toContain('refreshDashboardAll()');
    });

    it('should use refreshDashboardAll when switching to dashboard view', () => {
      const switchSection = indexHtml.substring(
        indexHtml.indexOf("viewName === 'dashboard'"),
        indexHtml.indexOf("viewName === 'dashboard'") + 200
      );
      expect(switchSection).toContain('refreshDashboardAll()');
    });

    it('should use _applyDashboardStats and _applyQueueHealth helpers', () => {
      const fnStart = indexHtml.indexOf('function refreshDashboardAll()');
      const fnEnd = indexHtml.indexOf('function startDashboardAutoRefresh()');
      const fn = indexHtml.substring(fnStart, fnEnd);
      expect(fn).toContain('_applyDashboardStats');
      expect(fn).toContain('_applyQueueHealth');
    });
  });
});

describe('Processor files: Already optimized (V2)', () => {
  const procFiles = [
    'proc_rimac.js', 'proc_mapfre.js', 'proc_chubb.js',
    'proc_qualitas.js', 'proc_crecer_protecta.js',
    'proc_crecer_vle.js', 'proc_pacifico.js'
  ];

  describe('Issue 1: No active perfLog calls', () => {
    procFiles.forEach(file => {
      it(`${file} should not have uncommented perfLog calls`, () => {
        const content = readGasFile(file);
        const lines = content.split('\n');
        const activePerfLogCalls = lines.filter(line => {
          const trimmed = line.trim();
          return trimmed.startsWith('perfLog(') && !trimmed.startsWith('//');
        });
        expect(activePerfLogCalls).toHaveLength(0);
      });
    });
  });

  describe('Issue 2: Uses cruceResult._statusValues', () => {
    procFiles.forEach(file => {
      it(`${file} should use cruceResult._statusValues`, () => {
        const content = readGasFile(file);
        expect(content).toContain('_statusValues');
      });
    });

    procFiles.forEach(file => {
      it(`${file} should NOT re-read STATUS from sheet after cruce`, () => {
        const content = readGasFile(file);
        const cruceIdx = content.indexOf('ejecutarCruce');
        const afterCruce = content.substring(cruceIdx);
        // Should not have getRange for status column after cruce
        const statusReRead = afterCruce.match(/wsTrama\.getRange\(2,\s*4,.*getDisplayValues/);
        expect(statusReRead).toBeNull();
      });
    });
  });

  describe('Issue 3: processor_base uses batch setNumberFormats', () => {
    it('should use setNumberFormats (plural) for batch formatting', () => {
      const content = readGasFile('processor_base.js');
      expect(content).toContain('setNumberFormats(formats)');
    });

    it('should build format matrix for batch call', () => {
      const content = readGasFile('processor_base.js');
      expect(content).toContain('formats.push(formatRow)');
    });
  });
});
