/**
 * UX Laws Implementation Tests
 * Validates all 10 Laws of UX improvements were implemented correctly
 */
import * as fs from 'fs';
import * as path from 'path';

const GAS_DIR = path.join(__dirname, '../../gas');

function readGasFile(filename: string): string {
  return fs.readFileSync(path.join(GAS_DIR, filename), 'utf-8');
}

const indexHtml = readGasFile('index.html');
const stylesHtml = readGasFile('styles.html');
const conciliacionService = readGasFile('conciliacion_service.js');

describe('UX Law #1: Doherty Threshold - Animated progress steps for reports', () => {
  it('should have reportStepsDashEj progress indicator', () => {
    expect(indexHtml).toContain('reportStepsDashEj');
  });

  it('should have reportStepsSaldos progress indicator', () => {
    expect(indexHtml).toContain('reportStepsSaldos');
  });

  it('should have reportStepsVenc60 progress indicator', () => {
    expect(indexHtml).toContain('reportStepsVenc60');
  });

  it('should have reportStepsBitacora progress indicator', () => {
    expect(indexHtml).toContain('reportStepsBitacora');
  });

  it('should show multi-step progress with timeouts', () => {
    // Each report should have setTimeout for animated step progression
    const dashEjSection = indexHtml.substring(
      indexHtml.indexOf('function descargarReporteDashEjecutivo'),
      indexHtml.indexOf('function descargarReporteSaldos')
    );
    const timeouts = (dashEjSection.match(/setTimeout/g) || []).length;
    expect(timeouts).toBeGreaterThanOrEqual(3); // At least 3 step transitions
  });
});

describe('UX Law #2: Goal Gradient - Visual stepper for Conciliación', () => {
  it('should have stepper HTML in conciliación view', () => {
    expect(indexHtml).toContain('conciliacion-stepper');
  });

  it('should have step 1 and step 2 indicators', () => {
    expect(indexHtml).toContain('step1Indicator');
    expect(indexHtml).toContain('step2Indicator');
  });
});

describe('UX Law #3: Hick\'s Law - Grouped estado options with optgroup', () => {
  it('should have "En gestión" optgroup', () => {
    expect(indexHtml).toContain('label="En gestión"');
  });

  it('should have "Derivados" optgroup', () => {
    expect(indexHtml).toContain('label="Derivados"');
  });

  it('should have "Cerrados" optgroup', () => {
    expect(indexHtml).toContain('label="Cerrados"');
  });

  it('should apply optgroups to filtroEstadoEmb select', () => {
    const selectStart = indexHtml.indexOf('id="filtroEstadoEmb"');
    const selectEnd = indexHtml.indexOf('</select>', selectStart);
    const selectHtml = indexHtml.substring(selectStart, selectEnd);
    expect(selectHtml).toContain('<optgroup');
  });

  it('should apply optgroups to gestionEstadoEmb select', () => {
    const selectStart = indexHtml.indexOf('id="gestionEstadoEmb"');
    const selectEnd = indexHtml.indexOf('</select>', selectStart);
    const selectHtml = indexHtml.substring(selectStart, selectEnd);
    expect(selectHtml).toContain('<optgroup');
  });
});

describe('UX Law #4: Serial Position - Sidebar order', () => {
  it('should have Dashboard as first sidebar item', () => {
    const sidebarStart = indexHtml.indexOf('sidebar-nav');
    const firstItem = indexHtml.indexOf("switchView('dashboard')", sidebarStart);
    const secondItem = indexHtml.indexOf("switchView('bitacora')", sidebarStart);
    expect(firstItem).toBeLessThan(secondItem);
  });

  it('should have Actualizar Base as last sidebar item', () => {
    const sidebarStart = indexHtml.indexOf('sidebar-nav');
    const actualizarItem = indexHtml.indexOf("switchView('actualizar')", sidebarStart);
    const reportesItem = indexHtml.indexOf("switchView('reportes')", sidebarStart);
    expect(actualizarItem).toBeGreaterThan(reportesItem);
  });
});

describe('UX Law #5: Proximity - Monitoring section grouping', () => {
  it('should have "Monitoreo del Sistema" header', () => {
    expect(indexHtml).toContain('Monitoreo del Sistema');
  });

  it('should wrap dashboard stats and queue health in a container', () => {
    const monitoreoIdx = indexHtml.indexOf('Monitoreo del Sistema');
    const dashboardStatsIdx = indexHtml.indexOf('dashboardStatsSection', monitoreoIdx);
    const queueHealthIdx = indexHtml.indexOf('queueHealthSection', monitoreoIdx);
    expect(dashboardStatsIdx).toBeGreaterThan(monitoreoIdx);
    expect(queueHealthIdx).toBeGreaterThan(monitoreoIdx);
  });
});

describe('UX Law #6: Chunking - Bitácora table header colors', () => {
  it('should have colored border-bottom on embedded bitácora table header groups', () => {
    // The embedded bitácora table headers use inline border-bottom with colors for visual chunking
    expect(indexHtml).toContain('border-bottom: 3px solid #1976D2');  // blue for client group
    expect(indexHtml).toContain('border-bottom: 3px solid #F57C00');  // orange for gestión group
    expect(indexHtml).toContain('border-bottom: 3px solid #7B1FA2');  // purple for dates group
  });
});

describe('UX Law #7: Peak-End Rule - Enhanced conciliación success', () => {
  it('should have showConciliacionStatus function', () => {
    expect(indexHtml).toContain('function showConciliacionStatus');
  });

  it('should support raw type for rich HTML status', () => {
    const fnStart = indexHtml.indexOf('function showConciliacionStatus');
    const fnEnd = indexHtml.indexOf('function', fnStart + 50);
    const fn = indexHtml.substring(fnStart, fnEnd);
    expect(fn).toContain("'raw'");
  });
});

describe('UX Law #8: Von Restorff - Timestamps on report success', () => {
  const reportFunctions = [
    { name: 'descargarReporteDashEjecutivo', endMarker: 'descargarReporteSaldos' },
    { name: 'descargarReporteSaldos', endMarker: 'descargarReporteVencidos' },
    { name: 'descargarReporteVencidos', endMarker: 'descargarReporteBitacora' },
    { name: 'descargarReporteBitacora', endMarker: 'downloadBase64File' }
  ];

  reportFunctions.forEach(({ name, endMarker }) => {
    it(`${name} should include timestamp in success message`, () => {
      const fnStart = indexHtml.indexOf(`function ${name}`);
      const fnEnd = indexHtml.indexOf(`function ${endMarker}`, fnStart + 10);
      const fn = fnEnd > fnStart ? indexHtml.substring(fnStart, fnEnd) : indexHtml.substring(fnStart, fnStart + 3000);
      expect(fn).toContain('toLocaleTimeString');
    });
  });
});

describe('UX Law #9: Postel\'s Law - File input validation', () => {
  it('should define validateFileInput function', () => {
    expect(indexHtml).toContain('function validateFileInput');
  });

  it('should have onchange handler on file inputs', () => {
    expect(indexHtml).toContain("onchange=\"validateFileInput(this");
  });

  it('should have error display divs for file inputs', () => {
    expect(indexHtml).toContain('uploadFileError');
  });
});

describe('UX Law #10: Active User Paradox - Onboarding & empty states', () => {
  it('should have onboarding banner HTML', () => {
    expect(indexHtml).toContain('id="onboardingBanner"');
  });

  it('should define showOnboardingIfNew function', () => {
    expect(indexHtml).toContain('function showOnboardingIfNew');
  });

  it('should define dismissOnboarding function', () => {
    expect(indexHtml).toContain('function dismissOnboarding');
  });

  it('should call showOnboardingIfNew in initPortal', () => {
    const initStart = indexHtml.indexOf('function initPortal()');
    const initEnd = indexHtml.indexOf('function showOnboardingIfNew') > initStart
      ? indexHtml.indexOf('function showOnboardingIfNew')
      : indexHtml.indexOf('// PSI: Defer non-critical', initStart);
    const initFn = indexHtml.substring(initStart, initStart + 2000);
    expect(initFn).toContain('showOnboardingIfNew()');
  });

  it('should use sessionStorage to track dismissal', () => {
    expect(indexHtml).toContain('portal_onboarding_dismissed');
  });

  it('should have onboarding steps linking to all 6 modules', () => {
    const bannerStart = indexHtml.indexOf('id="onboardingBanner"');
    const bannerEnd = indexHtml.indexOf('DASHBOARD ANALÍTICO', bannerStart);
    const banner = indexHtml.substring(bannerStart, bannerEnd);
    expect(banner).toContain("switchView('actualizar')");
    expect(banner).toContain("switchView('generar')");
    expect(banner).toContain("switchView('enviar')");
    expect(banner).toContain("switchView('bitacora')");
    expect(banner).toContain("switchView('reportes')");
    expect(banner).toContain("switchView('conciliacion')");
  });

  it('should have renderEmptyState helper for tables', () => {
    expect(indexHtml).toContain('function renderEmptyState');
  });

  it('should use renderEmptyState in bitácora table', () => {
    const fnStart = indexHtml.indexOf('function renderBitacoraTable()');
    const fnEnd = indexHtml.indexOf('function', fnStart + 50);
    const fn = indexHtml.substring(fnStart, fnStart + 2000);
    expect(fn).toContain('renderEmptyState');
  });

  it('should use tp-empty-state class in embedded bitácora', () => {
    const fnStart = indexHtml.indexOf('function renderBitacoraTableEmb()');
    const fnEnd = indexHtml.indexOf('function', fnStart + 50);
    const fn = indexHtml.substring(fnStart, fnStart + 1000);
    expect(fn).toContain('tp-empty-state');
  });
});

describe('Conciliación: lastModified in getBDCruceStatus', () => {
  it('should return lastModified field', () => {
    const fnStart = conciliacionService.indexOf('getBDCruceStatus');
    expect(fnStart).toBeGreaterThan(-1);
    const fn = conciliacionService.substring(fnStart, fnStart + 1000);
    expect(fn).toContain('lastModified');
  });

  it('should use DriveApp.getFileById to get last updated date', () => {
    expect(conciliacionService).toContain('DriveApp.getFileById(ss.getId())');
    expect(conciliacionService).toContain('getLastUpdated().toISOString()');
  });

  it('should display formatted date instead of "Hoy"', () => {
    // The client should format lastModified as dd/mm/yyyy HH:mm
    const section = indexHtml.substring(
      indexHtml.indexOf('lastModified') - 200,
      indexHtml.indexOf('lastModified') + 500
    );
    expect(section).toContain('toLocaleDateString');
  });
});

describe('CSS: Empty state styles exist', () => {
  it('should define tp-empty-state class', () => {
    expect(stylesHtml).toContain('.tp-empty-state');
  });

  it('should define tp-empty-state-icon class', () => {
    expect(stylesHtml).toContain('.tp-empty-state-icon');
  });

  it('should define tp-empty-state-title class', () => {
    expect(stylesHtml).toContain('.tp-empty-state-title');
  });
});
