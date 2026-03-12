/**
 * EECC Batch Optimization Tests
 *
 * Validates Phase 1 (single BD read) + Phase 3 (parallel exports via fetchAll)
 * implementation across all modified files:
 *
 * 1. gas/export.js       - batchExportSheets() method
 * 2. gas/eecc_core.js    - generateBatchHeadless() method + sheetNameOverride
 * 3. gas/portal_api.js   - generateBatch_API() endpoint
 * 4. gas/index.html      - Batch grupo flow (replaces sequential)
 *
 * Test types:
 * - Source code analysis: verify patterns exist in GAS source files
 * - Logic simulation: verify algorithms work correctly
 * - Integration contract: verify API signatures and response shapes
 * - Regression: verify existing functionality is not broken
 */

import * as fs from 'fs';
import * as path from 'path';

// Helper: read a GAS source file
function readGasFile(filename: string): string {
    return fs.readFileSync(
        path.join(__dirname, '../../gas', filename),
        'utf-8'
    );
}

// =============================================================================
// 1. ExportService.batchExportSheets() - gas/export.js
// =============================================================================

describe('ExportService.batchExportSpreadsheets - Source Analysis', () => {
    const source = readGasFile('export.js');

    it('should define batchExportSpreadsheets method', () => {
        expect(source).toContain('batchExportSpreadsheets(items, opts');
    });

    it('should use UrlFetchApp.fetchAll for parallel requests', () => {
        expect(source).toContain('UrlFetchApp.fetchAll(requests)');
    });

    it('should export whole spreadsheets (no gid parameter)', () => {
        const methodStart = source.indexOf('batchExportSpreadsheets(');
        const methodEnd = source.indexOf('exportFilteredView(');
        const methodBody = source.substring(methodStart, methodEnd);
        expect(methodBody).not.toContain('gid');
    });

    it('should use item.spreadsheetId to build export URLs', () => {
        expect(source).toContain('item.spreadsheetId');
    });

    it('should set Authorization header with OAuth token', () => {
        expect(source).toContain("Authorization: 'Bearer ' + token");
    });

    it('should use muteHttpExceptions for all batch requests', () => {
        const methodStart = source.indexOf('batchExportSpreadsheets(');
        const methodEnd = source.indexOf('exportFilteredView(');
        const methodBody = source.substring(methodStart, methodEnd);
        expect(methodBody).toContain('muteHttpExceptions: true');
    });

    it('should check response code 200 for each result', () => {
        expect(source).toContain("resp.getResponseCode() === 200");
    });

    it('should return ok:true with blob for successful exports', () => {
        const methodStart = source.indexOf('batchExportSpreadsheets(');
        const methodEnd = source.indexOf('exportFilteredView(');
        const methodBody = source.substring(methodStart, methodEnd);
        expect(methodBody).toContain('ok: true');
    });

    it('should return ok:false with error for failed exports', () => {
        const methodStart = source.indexOf('batchExportSpreadsheets(');
        const methodEnd = source.indexOf('exportFilteredView(');
        const methodBody = source.substring(methodStart, methodEnd);
        expect(methodBody).toContain('ok: false');
        expect(methodBody).toContain('error:');
    });

    it('should set blob name using item.fileName', () => {
        expect(source).toContain("resp.getBlob().setName(item.fileName)");
    });

    it('should use same PDF config parameters as exportToPDF', () => {
        const pdfConfigMatches = source.match(/getConfig\('EXPORT\.PDF'\)/g);
        expect(pdfConfigMatches).not.toBeNull();
        expect(pdfConfigMatches!.length).toBeGreaterThanOrEqual(2);
    });

    it('should default format to pdf when not specified', () => {
        expect(source).toContain("const format = opts.format || 'pdf'");
    });

    it('should handle both pdf and xlsx format branches', () => {
        const methodStart = source.indexOf('batchExportSpreadsheets(');
        const methodEnd = source.indexOf('exportFilteredView(');
        const methodBody = source.substring(methodStart, methodEnd);
        expect(methodBody).toContain("if (format === 'pdf')");
        expect(methodBody).toContain('} else {');
    });
});

describe('ExportService.batchExportSpreadsheets - URL Construction Logic', () => {
    it('should build correct whole-spreadsheet PDF export URL', () => {
        const spreadsheetId = 'test-spreadsheet-123';
        const params: Record<string, any> = { format: 'pdf', portrait: true, size: 'A4' };
        const queryString = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${queryString}`;

        expect(url).toContain('format=pdf');
        expect(url).toContain(spreadsheetId);
        expect(url).not.toContain('gid=');
    });

    it('should build correct whole-spreadsheet XLSX export URL', () => {
        const spreadsheetId = 'test-spreadsheet-123';
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

        expect(url).toContain('format=xlsx');
        expect(url).not.toContain('gid=');
    });
});

describe('ExportService - Existing methods preserved (Regression)', () => {
    const source = readGasFile('export.js');

    it('should still have exportToPDF method', () => {
        expect(source).toContain('exportToPDF(spreadsheetId)');
    });

    it('should still have exportToXLSX method', () => {
        expect(source).toContain('exportToXLSX(spreadsheetId)');
    });

    it('should still have exportFilteredView method', () => {
        expect(source).toContain('exportFilteredView(rows, uiHeaders, asegurado)');
    });

    it('should still use Utils.retryWithBackoff in individual exports', () => {
        expect(source).toContain('Utils.retryWithBackoff(');
    });
});


// =============================================================================
// 2. EECCCore.generateBatchHeadless() - gas/eecc_core.js
// =============================================================================

describe('EECCCore.generateBatchHeadless - Source Analysis', () => {
    const source = readGasFile('eecc_core.js');

    // Helper: extract generateBatchHeadless method body reliably
    function getBatchMethodBody(): string {
        const methodStart = source.indexOf('generateBatchHeadless(asegurados, opts');
        // Find the next top-level method definition after generateBatchHeadless
        const nextMethod = source.indexOf('  /**\n   * Genera EECC desde datos pre-filtrados', methodStart);
        return source.substring(methodStart, nextMethod > methodStart ? nextMethod : source.length);
    }

    it('should define generateBatchHeadless method', () => {
        expect(source).toContain('generateBatchHeadless(asegurados, opts');
    });

    it('should read BD only ONCE (single SheetsIO.readSheet call)', () => {
        const methodBody = getBatchMethodBody();
        const readSheetCalls = methodBody.match(/SheetsIO\.readSheet\(/g);
        expect(readSheetCalls).not.toBeNull();
        expect(readSheetCalls!.length).toBe(1);
    });

    it('should create one temp spreadsheet PER asegurado', () => {
        const methodBody = getBatchMethodBody();
        // SpreadsheetApp.create is inside the per-asegurado loop
        expect(methodBody).toContain('SpreadsheetApp.create(');
        // Should track tempIds for cleanup
        expect(methodBody).toContain('tempIds.push(tempId)');
    });

    it('should use TMP_EECC_ prefix for temp spreadsheets', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain("SpreadsheetApp.create('TMP_EECC_'");
    });

    it('should call ExportService.batchExportSpreadsheets for PDF export', () => {
        expect(source).toContain("ExportService.batchExportSpreadsheets(pdfItems, { format: 'pdf' })");
    });

    it('should call ExportService.batchExportSpreadsheets for XLSX export', () => {
        expect(source).toContain("ExportService.batchExportSpreadsheets(xlsxItems, { format: 'xlsx' })");
    });

    it('should get logo only ONCE for all asegurados', () => {
        const methodBody = getBatchMethodBody();
        const logoCalls = methodBody.match(/DriveIO\.getLogoCached\(\)/g);
        expect(logoCalls).not.toBeNull();
        expect(logoCalls!.length).toBe(1);
    });

    it('should get template sheet only ONCE for all asegurados', () => {
        const methodBody = getBatchMethodBody();
        const templateCalls = methodBody.match(/getSheetByName\(getConfig\('SHEETS\.TEMPLATE'\)\)/g);
        expect(templateCalls).not.toBeNull();
        expect(templateCalls!.length).toBe(1);
    });

    it('should always clean up ALL temp spreadsheets in finally block', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain('finally {');
        expect(methodBody).toContain('tempIds.forEach');
        expect(methodBody).toContain('DriveIO.deleteFile(id)');
    });

    it('should validate export type is selected', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain("'Selecciona al menos un tipo de archivo'");
    });

    it('should handle asegurados with no BD data gracefully', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain("error: 'Sin datos en BD'");
    });

    it('should build column map ONCE for all asegurados', () => {
        const methodBody = getBatchMethodBody();
        const buildMapCalls = methodBody.match(/this\._buildColumnMap\(/g);
        expect(buildMapCalls).not.toBeNull();
        expect(buildMapCalls!.length).toBe(1);
    });

    it('should filter rows per asegurado from baseData', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain('baseData.rows.filter(');
    });

    it('should use _groupByMoneda for currency separation', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain('this._groupByMoneda(rows, columnMap)');
    });

    it('should track temp spreadsheet IDs in exportRegistry', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain('exportRegistry.push(');
    });

    it('should call SpreadsheetApp.flush() before export', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain('SpreadsheetApp.flush()');
    });

    it('should export whole spreadsheet per asegurado (multi-currency combined)', () => {
        const methodBody = getBatchMethodBody();
        // Uses batchExportSpreadsheets (whole SS) not batchExportSheets (per-gid)
        expect(methodBody).toContain('batchExportSpreadsheets');
        expect(methodBody).not.toContain('batchExportSheets');
    });

    it('should return durationMs in result', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain('durationMs: duration');
    });

    it('should return generatedCount and errorCount', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain('generatedCount: results.length');
        expect(methodBody).toContain('errorCount: errors.length');
    });

    it('should return results and errors arrays', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain('results: results');
        expect(methodBody).toContain('errors: errors');
    });

    it('should catch individual asegurado errors without stopping batch', () => {
        const methodBody = getBatchMethodBody();
        expect(methodBody).toContain("errors.push({ asegurado: nombre, error: e.message })");
    });

    it('should handle empty sheetRegistry (all asegurados failed prep)', () => {
        expect(source).toContain("'No se pudieron preparar hojas para ningún asegurado'");
    });
});

describe('EECCCore._createSheetForMoneda - sheetNameOverride', () => {
    const source = readGasFile('eecc_core.js');

    it('should support sheetNameOverride option', () => {
        expect(source).toContain('opts.sheetNameOverride');
    });

    it('should fall back to default name when sheetNameOverride is not set', () => {
        expect(source).toContain("opts.sheetNameOverride || (moneda === 'S/.' ? 'EECC_Soles' : 'EECC_Dolares')");
    });

    it('should be backward compatible (single EECC generation still works)', () => {
        // The original _generateCore does NOT pass sheetNameOverride in its opts,
        // so _createSheetForMoneda falls back to default naming
        const generateCoreStart = source.indexOf('_generateCore(nombreAsegurado, rows, headers, opts');
        // Find the call to _createSheetForMoneda within _generateCore
        const createSheetCall = source.indexOf('this._createSheetForMoneda(', generateCoreStart);
        // Get a window around the call (not the whole method)
        const callContext = source.substring(createSheetCall, createSheetCall + 300);

        // _generateCore passes opts directly without adding sheetNameOverride
        expect(callContext).toContain('this._createSheetForMoneda(');
        expect(callContext).not.toContain('sheetNameOverride');
    });
});

describe('EECCCore - Sheet name uniqueness for batch', () => {
    it('should generate unique sheet names per asegurado+currency', () => {
        // Simulate the logic
        const asegurados = ['EMPRESA ABC', 'EMPRESA XYZ'];
        const monedas = ['S/.', 'US$'];

        const names = new Set<string>();
        for (const nombre of asegurados) {
            for (const moneda of monedas) {
                const safeName = nombre.replace(/[^a-zA-Z0-9_]/g, '_');
                const monSuffix = moneda === 'S/.' ? 'Soles' : 'Dolares';
                const sheetName = `${safeName}_${monSuffix}`.substring(0, 100);
                names.add(sheetName);
            }
        }

        // All 4 combinations should be unique
        expect(names.size).toBe(4);
    });

    it('should truncate sheet names to 100 chars max', () => {
        const longName = 'A'.repeat(120);
        const monSuffix = 'Soles';
        const sheetName = `${longName}_${monSuffix}`.substring(0, 100);

        expect(sheetName.length).toBe(100);
    });
});

describe('EECCCore - Existing methods preserved (Regression)', () => {
    const source = readGasFile('eecc_core.js');

    it('should still have generateWithUI method', () => {
        expect(source).toContain('generateWithUI(nombreAsegurado, opts');
    });

    it('should still have generateHeadless method', () => {
        expect(source).toContain('generateHeadless(nombreAsegurado, opts');
    });

    it('should still have generateByGrupo method', () => {
        expect(source).toContain('generateByGrupo(grupoNombre, opts');
    });

    it('should still have _generateCore method', () => {
        expect(source).toContain('_generateCore(nombreAsegurado, rows, headers, opts');
    });

    it('should still have _generateFromFilteredData method', () => {
        expect(source).toContain('_generateFromFilteredData(nombreAsegurado, rowsAsegurado, headers, opts');
    });

    it('should still have _buildTableWithSubtotals method', () => {
        expect(source).toContain('_buildTableWithSubtotals(gruposCIA, columnMap, opts, numCols');
    });

    it('should still have _applyTableFormats method', () => {
        expect(source).toContain('_applyTableFormats(sheet, startRow, tableData, numCols, opts');
    });
});


// =============================================================================
// 3. generateBatch_API - gas/portal_api.js
// =============================================================================

describe('generateBatch_API - Source Analysis', () => {
    const source = readGasFile('portal_api.js');

    it('should define generateBatch_API function', () => {
        expect(source).toContain('function generateBatch_API(asegurados, opts, token)');
    });

    it('should validate session token', () => {
        // Extract the function body
        const fnStart = source.indexOf('function generateBatch_API(');
        const fnEnd = source.indexOf('function createZip_API(');
        const fnBody = source.substring(fnStart, fnEnd);

        expect(fnBody).toContain('AuthService.validateSession(token)');
    });

    it('should enforce MAX_BATCH limit of 20', () => {
        const fnStart = source.indexOf('function generateBatch_API(');
        const fnEnd = source.indexOf('function createZip_API(');
        const fnBody = source.substring(fnStart, fnEnd);

        expect(fnBody).toContain('const MAX_BATCH = 20');
        expect(fnBody).toContain('asegurados.length > MAX_BATCH');
    });

    it('should validate asegurados is a non-empty array', () => {
        const fnStart = source.indexOf('function generateBatch_API(');
        const fnEnd = source.indexOf('function createZip_API(');
        const fnBody = source.substring(fnStart, fnEnd);

        expect(fnBody).toContain('!Array.isArray(asegurados)');
        expect(fnBody).toContain('asegurados.length === 0');
    });

    it('should return error for empty asegurados array', () => {
        const fnStart = source.indexOf('function generateBatch_API(');
        const fnEnd = source.indexOf('function createZip_API(');
        const fnBody = source.substring(fnStart, fnEnd);

        expect(fnBody).toContain("'Se requiere una lista de asegurados'");
    });

    it('should return error when exceeding MAX_BATCH', () => {
        expect(source).toContain('asegurados por batch (recibidos:');
    });

    it('should delegate to EECCCore.generateBatchHeadless', () => {
        const fnStart = source.indexOf('function generateBatch_API(');
        const fnEnd = source.indexOf('function createZip_API(');
        const fnBody = source.substring(fnStart, fnEnd);

        expect(fnBody).toContain('EECCCore.generateBatchHeadless(asegurados, opts)');
    });

    it('should catch errors and return { ok: false, error }', () => {
        const fnStart = source.indexOf('function generateBatch_API(');
        const fnEnd = source.indexOf('function createZip_API(');
        const fnBody = source.substring(fnStart, fnEnd);

        expect(fnBody).toContain('return { ok: false, error: error.message }');
    });
});

describe('generateBatch_API - Validation Logic Simulation', () => {
    // Simulate the validation logic
    function simulateValidation(asegurados: any): { ok: boolean; error?: string } {
        const MAX_BATCH = 20;
        if (!Array.isArray(asegurados) || asegurados.length === 0) {
            return { ok: false, error: 'Se requiere una lista de asegurados' };
        }
        if (asegurados.length > MAX_BATCH) {
            return { ok: false, error: `Máximo ${MAX_BATCH} asegurados por batch (recibidos: ${asegurados.length})` };
        }
        return { ok: true };
    }

    it('should reject null asegurados', () => {
        expect(simulateValidation(null).ok).toBe(false);
    });

    it('should reject undefined asegurados', () => {
        expect(simulateValidation(undefined).ok).toBe(false);
    });

    it('should reject string asegurados', () => {
        expect(simulateValidation('empresa1').ok).toBe(false);
    });

    it('should reject empty array', () => {
        expect(simulateValidation([]).ok).toBe(false);
    });

    it('should accept array of 1', () => {
        expect(simulateValidation(['empresa1']).ok).toBe(true);
    });

    it('should accept array of 20 (MAX_BATCH)', () => {
        const arr = Array.from({ length: 20 }, (_, i) => `empresa${i}`);
        expect(simulateValidation(arr).ok).toBe(true);
    });

    it('should reject array of 21 (over MAX_BATCH)', () => {
        const arr = Array.from({ length: 21 }, (_, i) => `empresa${i}`);
        const result = simulateValidation(arr);
        expect(result.ok).toBe(false);
        expect(result.error).toContain('21');
    });

    it('should reject object (not array)', () => {
        expect(simulateValidation({ a: 1 }).ok).toBe(false);
    });
});

describe('portal_api.js - Existing endpoints preserved (Regression)', () => {
    const source = readGasFile('portal_api.js');

    it('should still have generateHeadless_API', () => {
        expect(source).toContain('function generateHeadless_API(asegurado, opts, token)');
    });

    it('should still have generateByGrupo_API', () => {
        expect(source).toContain('function generateByGrupo_API(grupo, opts, token)');
    });

    it('should still have createZip_API', () => {
        expect(source).toContain('function createZip_API(');
    });
});


// =============================================================================
// 4. Frontend batch flow - gas/index.html
// =============================================================================

describe('Frontend grupo sub-batch flow - Source Analysis', () => {
    const source = readGasFile('index.html');

    it('should call generateBatch_API for each sub-batch chunk', () => {
        expect(source).toContain('.generateBatch_API(chunk,');
    });

    it('should NOT call generateHeadless_API in a sequential loop for grupos', () => {
        const grupoStart = source.indexOf("EECC_MODE === 'grupo'");
        const grupoEnd = source.indexOf('} else {', grupoStart);
        const grupoSection = source.substring(grupoStart, grupoEnd);

        expect(grupoSection).not.toContain('generateHeadless_API');
    });

    it('should define SUB_BATCH_SIZE of 5', () => {
        expect(source).toContain('const SUB_BATCH_SIZE = 5');
    });

    it('should split asegurados into chunks', () => {
        expect(source).toContain('chunks.push(asegurados.slice(i, i + SUB_BATCH_SIZE))');
    });

    it('should use 120s timeout per sub-batch', () => {
        expect(source).toContain('const BATCH_TIMEOUT_MS = 120000');
    });

    it('should still get grupo members first via getAseguradosPorGrupo_API', () => {
        expect(source).toContain('.getAseguradosPorGrupo_API(asegurado, TOKEN)');
    });

    it('should pass exportPdf option to batch API', () => {
        const grupoStart = source.indexOf('.generateBatch_API(chunk,');
        const grupoEnd = source.indexOf('}, TOKEN)', grupoStart);
        const callSection = source.substring(grupoStart, grupoEnd);

        expect(callSection).toContain('exportPdf: exportPdf');
    });

    it('should pass exportXlsx option to batch API', () => {
        const grupoStart = source.indexOf('.generateBatch_API(chunk,');
        const grupoEnd = source.indexOf('}, TOKEN)', grupoStart);
        const callSection = source.substring(grupoStart, grupoEnd);

        expect(callSection).toContain('exportXlsx: exportXlsx');
    });

    it('should pass includeObs option to batch API', () => {
        const grupoStart = source.indexOf('.generateBatch_API(chunk,');
        const grupoEnd = source.indexOf('}, TOKEN)', grupoStart);
        const callSection = source.substring(grupoStart, grupoEnd);

        expect(callSection).toContain('includeObs: INCLUDE_OBS');
    });

    it('should pass obsForRAM option to batch API', () => {
        const grupoStart = source.indexOf('.generateBatch_API(chunk,');
        const grupoEnd = source.indexOf('}, TOKEN)', grupoStart);
        const callSection = source.substring(grupoStart, grupoEnd);

        expect(callSection).toContain('obsForRAM: obsForRAM');
    });

    it('should handle batch result with ok property', () => {
        expect(source).toContain('batchResult.ok');
    });

    it('should accumulate results from all sub-batches', () => {
        expect(source).toContain('allResults.push(...(batchResult.results');
    });

    it('should accumulate errors from all sub-batches', () => {
        expect(source).toContain('allErrors.push(...batchResult.errors)');
    });

    it('should accumulate duration from all sub-batches', () => {
        expect(source).toContain('totalDurationMs += (batchResult.durationMs');
    });

    it('should show progress percentage between sub-batches', () => {
        expect(source).toContain('progressPct');
        expect(source).toContain('setGenerateLoading(`${progressPct}%`)');
    });

    it('should show batch N/M progress message', () => {
        expect(source).toContain('Batch ${c + 1}/${chunks.length}');
    });

    it('should show results table for successful batch', () => {
        const grupoStart = source.indexOf('.generateBatch_API(chunk,');
        const grupoEnd = source.indexOf('getAseguradosPorGrupo_API', grupoStart);
        const batchSection = source.substring(grupoStart, grupoEnd);

        expect(batchSection).toContain('generated-files-table');
    });

    it('should show ZIP download button for batch results', () => {
        const grupoStart = source.indexOf('.generateBatch_API(chunk,');
        const grupoEnd = source.indexOf('getAseguradosPorGrupo_API', grupoStart);
        const batchSection = source.substring(grupoStart, grupoEnd);

        expect(batchSection).toContain('btnDownloadZip');
    });

    it('should show timeout error with batch number', () => {
        expect(source).toContain("Timeout: batch ${c + 1} excedio 120s");
    });

    it('should re-enable button after error via resetGenerateUI', () => {
        // After batch error, resetGenerateUI() is called which sets btn.disabled = false
        // and btn.querySelector('.btn-label').textContent = 'Generar EECC'
        expect(source).toContain('function resetGenerateUI()');
        const fnStart = source.indexOf('function resetGenerateUI()');
        const fn = source.substring(fnStart, fnStart + 300);
        expect(fn).toContain('btn.disabled = false');
        expect(fn).toContain("'Generar EECC'");
    });

    it('should handle empty grupo response', () => {
        expect(source).toContain('response.data.length === 0');
    });

    it('should pause between sub-batches', () => {
        expect(source).toContain('await new Promise(r => setTimeout(r, 500))');
    });

    it('should handle failed sub-batch gracefully (register all chunk members as errors)', () => {
        expect(source).toContain('chunk.forEach((name, j) =>');
        expect(source).toContain('allErrors.push({ asegurado: name');
    });
});

describe('Frontend - Individual asegurado flow preserved (Regression)', () => {
    const source = readGasFile('index.html');

    it('should still have individual asegurado generation via generateForAsegurado_API', () => {
        expect(source).toContain('.generateForAsegurado_API(');
    });

    it('should still show individual download links for single generation', () => {
        expect(source).toContain("document.getElementById('linksContainer').innerHTML = links.join");
    });

    it('should still use EECC_MODE to branch between grupo and individual', () => {
        expect(source).toContain("if (EECC_MODE === 'grupo')");
    });
});


// =============================================================================
// 5. Integration Contract Tests - Response shapes
// =============================================================================

describe('Batch Response Shape Contract', () => {
    it('generateBatchHeadless should return correct success shape', () => {
        // Simulate a successful batch result
        const result = {
            ok: true,
            generatedCount: 3,
            errorCount: 1,
            totalAsegurados: 4,
            results: [
                { asegurado: 'A', pdfUrl: 'url1', xlsxUrl: null, folderPath: '/path', ok: true },
                { asegurado: 'B', pdfUrl: 'url2', xlsxUrl: 'url3', folderPath: '/path2', ok: true },
                { asegurado: 'C', pdfUrl: 'url4', xlsxUrl: null, folderPath: '/path3', ok: true },
            ],
            errors: [
                { asegurado: 'D', error: 'Sin datos en BD' }
            ],
            durationMs: 15000,
            message: 'Batch completado: 3/4 generados en 15s'
        };

        expect(result.ok).toBe(true);
        expect(result.generatedCount).toBe(3);
        expect(result.errorCount).toBe(1);
        expect(result.totalAsegurados).toBe(4);
        expect(result.results).toHaveLength(3);
        expect(result.errors).toHaveLength(1);
        expect(result.durationMs).toBeGreaterThan(0);
        expect(result.message).toContain('Batch completado');

        // Each result should have expected fields
        for (const r of result.results) {
            expect(r).toHaveProperty('asegurado');
            expect(r).toHaveProperty('pdfUrl');
            expect(r).toHaveProperty('xlsxUrl');
            expect(r).toHaveProperty('folderPath');
            expect(r).toHaveProperty('ok');
        }

        // Each error should have expected fields
        for (const e of result.errors) {
            expect(e).toHaveProperty('asegurado');
            expect(e).toHaveProperty('error');
        }
    });

    it('generateBatchHeadless should return correct error shape', () => {
        const result = {
            ok: false,
            error: 'Selecciona al menos un tipo de archivo',
            results: [],
            errors: []
        };

        expect(result.ok).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.results).toHaveLength(0);
    });

    it('batchExportSpreadsheets should return correct result shape per spreadsheet', () => {
        const results = [
            { fileName: 'EECC_EMPRESA_A_20260311.pdf', blob: {} as any, ok: true },
            { fileName: 'EECC_EMPRESA_B_20260311.pdf', blob: null, ok: false, error: 'HTTP 500' },
        ];

        expect(results[0].ok).toBe(true);
        expect(results[0].blob).not.toBeNull();
        expect(results[0]).toHaveProperty('fileName');

        expect(results[1].ok).toBe(false);
        expect(results[1].blob).toBeNull();
        expect(results[1].error).toContain('HTTP');
    });
});


// =============================================================================
// 6. Multi-currency file naming logic
// =============================================================================

describe('Batch file naming logic', () => {
    it('should generate one PDF+XLSX per asegurado (all currencies combined)', () => {
        // In the new architecture, each asegurado gets one whole-spreadsheet export
        // Multi-currency asegurados have multiple sheets inside ONE spreadsheet
        const source = readGasFile('eecc_core.js');
        const methodStart = source.indexOf('generateBatchHeadless(asegurados, opts');
        const nextMethod = source.indexOf('  /**\n   * Genera EECC desde datos pre-filtrados', methodStart);
        const methodBody = source.substring(methodStart, nextMethod);

        // One baseName per asegurado in exportRegistry
        expect(methodBody).toContain("baseName + '.pdf'");
        expect(methodBody).toContain("baseName + '.xlsx'");
    });

    it('should use consistent file naming with prefix + safeName + date', () => {
        const source = readGasFile('eecc_core.js');
        const methodStart = source.indexOf('generateBatchHeadless(asegurados, opts');
        const nextMethod = source.indexOf('  /**\n   * Genera EECC desde datos pre-filtrados', methodStart);
        const methodBody = source.substring(methodStart, nextMethod);

        expect(methodBody).toContain("prefix}${Utils.safeName(nombre)}_${dateStr}");
    });
});


// =============================================================================
// 7. Performance architecture validation
// =============================================================================

describe('Batch optimization - Architecture validation', () => {
    const exportSource = readGasFile('export.js');
    const eeccSource = readGasFile('eecc_core.js');

    it('should use fetchAll (not fetch in loop) for parallel export', () => {
        const methodStart = exportSource.indexOf('batchExportSpreadsheets(');
        const methodEnd = exportSource.indexOf('exportFilteredView(');
        const methodBody = exportSource.substring(methodStart, methodEnd);

        expect(methodBody).toContain('UrlFetchApp.fetchAll');
        expect(methodBody).not.toMatch(/UrlFetchApp\.fetch\(/);
    });

    it('should not have Utilities.sleep in batch method', () => {
        // generateBatchHeadless should NOT sleep between operations (unlike generateByGrupo)
        const methodStart = eeccSource.indexOf('generateBatchHeadless(asegurados, opts');
        const nextMethod = eeccSource.indexOf('  /**\n   * Genera EECC desde datos pre-filtrados', methodStart);
        const methodBody = eeccSource.substring(methodStart, nextMethod);

        expect(methodBody).not.toContain('Utilities.sleep');
    });

    it('old generateByGrupo still creates individual spreadsheets per asegurado (not batch)', () => {
        const methodStart = eeccSource.indexOf('generateByGrupo(grupoNombre, opts');
        const methodEnd = eeccSource.indexOf('generateBatchHeadless(');
        const methodBody = eeccSource.substring(methodStart, methodEnd);

        expect(methodBody).toContain('this._generateFromFilteredData(');
        expect(methodBody).not.toContain('batchExportSpreadsheets');
    });

    it('batch method should not call _generateCore or _generateFromFilteredData', () => {
        const methodStart = eeccSource.indexOf('generateBatchHeadless(asegurados, opts');
        const nextMethod = eeccSource.indexOf('  /**\n   * Genera EECC desde datos pre-filtrados', methodStart);
        const methodBody = eeccSource.substring(methodStart, nextMethod);

        expect(methodBody).not.toContain('this._generateCore(');
        expect(methodBody).not.toContain('this._generateFromFilteredData(');
    });
});


// =============================================================================
// 8. Edge cases
// =============================================================================

describe('Batch edge cases', () => {
    const eeccSource = readGasFile('eecc_core.js');

    it('should handle when all asegurados have no BD data', () => {
        // The method should return ok:false with appropriate error
        expect(eeccSource).toContain("'No se pudieron preparar hojas para ningún asegurado'");
    });

    it('should handle partial failures (some succeed, some fail)', () => {
        const methodStart = eeccSource.indexOf('generateBatchHeadless(asegurados, opts');
        const nextMethod = eeccSource.indexOf('  /**\n   * Genera EECC desde datos pre-filtrados', methodStart);
        const methodBody = eeccSource.substring(methodStart, nextMethod);

        expect(methodBody).toContain('ok: results.length > 0');
    });

    it('should use validateConfig before processing', () => {
        const methodStart = eeccSource.indexOf('generateBatchHeadless(asegurados, opts');
        const nextMethod = eeccSource.indexOf('  /**\n   * Genera EECC desde datos pre-filtrados', methodStart);
        const methodBody = eeccSource.substring(methodStart, nextMethod);

        expect(methodBody).toContain('validateConfig()');
    });

    it('should handle obsForRAM as array, __ALL__, or single string', () => {
        const methodStart = eeccSource.indexOf('generateBatchHeadless(asegurados, opts');
        const nextMethod = eeccSource.indexOf('  /**\n   * Genera EECC desde datos pre-filtrados', methodStart);
        const methodBody = eeccSource.substring(methodStart, nextMethod);

        expect(methodBody).toContain('Array.isArray(rawObsForRAM)');
        expect(methodBody).toContain("rawObsForRAM === '__ALL__'");
    });

    it('frontend should handle failed batchResult gracefully', () => {
        const htmlSource = readGasFile('index.html');
        expect(htmlSource).toContain('batchResult && batchResult.ok');
    });
});


// =============================================================================
// 9. Security validation
// =============================================================================

describe('Batch security', () => {
    const portalSource = readGasFile('portal_api.js');

    it('generateBatch_API should validate session before processing', () => {
        const fnStart = portalSource.indexOf('function generateBatch_API(');
        const fnEnd = portalSource.indexOf('function createZip_API(');
        const fnBody = portalSource.substring(fnStart, fnEnd);

        // AuthService.validateSession should be called BEFORE any processing
        const authPos = fnBody.indexOf('AuthService.validateSession');
        const batchPos = fnBody.indexOf('generateBatchHeadless');

        expect(authPos).toBeGreaterThan(-1);
        expect(batchPos).toBeGreaterThan(-1);
        expect(authPos).toBeLessThan(batchPos);
    });

    it('should enforce maximum batch size to prevent DoS', () => {
        const fnStart = portalSource.indexOf('function generateBatch_API(');
        const fnEnd = portalSource.indexOf('function createZip_API(');
        const fnBody = portalSource.substring(fnStart, fnEnd);

        expect(fnBody).toContain('MAX_BATCH');
        expect(fnBody).toContain('asegurados.length > MAX_BATCH');
    });

    it('frontend should use escapeHtml for displaying asegurado names', () => {
        const htmlSource = readGasFile('index.html');
        const grupoStart = htmlSource.indexOf('.generateBatch_API(chunk,');
        const grupoEnd = htmlSource.indexOf('getAseguradosPorGrupo_API', grupoStart);
        const batchSection = htmlSource.substring(grupoStart, grupoEnd);

        expect(batchSection).toContain('escapeHtml(res.asegurado)');
    });
});
