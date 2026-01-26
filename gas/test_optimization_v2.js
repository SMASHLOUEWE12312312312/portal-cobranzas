/**
 * @fileoverview Performance tests for Conciliación module optimization
 * @version 1.0.0
 * 
 * Tests to validate:
 * 1. Performance improvements
 * 2. Functional parity (results match original)
 * 3. Memory usage
 * 4. API call counts
 */

/**
 * Benchmark wrapper that measures execution time
 */
function benchmark(name, fn) {
    const t0 = Date.now();
    const result = fn();
    const t1 = Date.now();
    const duration = t1 - t0;

    Logger.log('┌─────────────────────────────────────');
    Logger.log('│ BENCHMARK: ' + name);
    Logger.log('│ Duration: ' + duration + 'ms (' + (duration / 1000).toFixed(2) + 's)');
    Logger.log('│ Success: ' + (result && result.ok ? 'YES' : 'NO'));
    Logger.log('└─────────────────────────────────────');

    return { name, duration, result };
}

/**
 * Test 1: Compare BD_Cruce loading performance
 */
function test_BDCruce_Performance() {
    Logger.log('=== TEST: BD_Cruce Loading Performance ===');

    const ss = ConciliacionIOV2.getConciliacionSpreadsheet();
    if (!ss) {
        Logger.log('ERROR: No spreadsheet configured');
        return;
    }

    const sheet = ss.getSheetByName('BD_Cruce');
    if (!sheet) {
        Logger.log('ERROR: BD_Cruce sheet not found');
        return;
    }

    // Test 1: Standard read
    const test1 = benchmark('getValues() standard', () => {
        const data = sheet.getDataRange().getValues();
        return { ok: true, rows: data.length };
    });

    // Test 2: getDisplayValues
    const test2 = benchmark('getDisplayValues()', () => {
        const data = sheet.getDataRange().getDisplayValues();
        return { ok: true, rows: data.length };
    });

    // Test 3: Cached read
    let cachedData = null;
    const test3 = benchmark('Cached read (first)', () => {
        cachedData = sheet.getDataRange().getDisplayValues();
        return { ok: true, rows: cachedData.length };
    });

    const test4 = benchmark('Cached read (second - memory only)', () => {
        return { ok: true, rows: cachedData.length };
    });

    Logger.log('\n=== SUMMARY ===');
    Logger.log('Standard getValues: ' + test1.duration + 'ms');
    Logger.log('getDisplayValues: ' + test2.duration + 'ms');
    Logger.log('First cached read: ' + test3.duration + 'ms');
    Logger.log('Second cached read: ' + test4.duration + 'ms');
    Logger.log('Cache improvement: ' + ((1 - test4.duration / test3.duration) * 100).toFixed(1) + '%');
}

/**
 * Test 2: Compare export methods
 */
function test_Export_Performance() {
    Logger.log('=== TEST: Export Performance Comparison ===');

    // Generate test data (1000 rows)
    const testData = [['CUPON', 'FECHA', 'FACTURA']];
    for (let i = 0; i < 1000; i++) {
        testData.push(['CUPON' + i, new Date(), 'F' + i]);
    }

    // Test legacy export (if available)
    if (typeof ConciliacionExport !== 'undefined' &&
        typeof ConciliacionExport._generateXLSXLegacy === 'function') {
        const legacyTest = benchmark('Legacy Export (SpreadsheetApp.create)', () => {
            try {
                return ConciliacionExportV2._generateXLSXLegacy(testData, 'TestSheet', {});
            } catch (e) {
                return { ok: false, error: e.message };
            }
        });
        Logger.log('Legacy export: ' + legacyTest.duration + 'ms');
    }

    // Test SheetJS export (if available)
    if (typeof XLSX !== 'undefined') {
        const sheetjsTest = benchmark('SheetJS Export (direct)', () => {
            try {
                return ConciliacionExportV2._generateXLSXWithSheetJS(testData, 'TestSheet', {});
            } catch (e) {
                return { ok: false, error: e.message };
            }
        });
        Logger.log('SheetJS export: ' + sheetjsTest.duration + 'ms');
    } else {
        Logger.log('SheetJS not available - skipping direct export test');
    }
}

/**
 * Test 3: Full pipeline comparison
 */
function test_FullPipeline_Comparison() {
    Logger.log('=== TEST: Full Pipeline Comparison ===');
    Logger.log('This test requires a sample EECC file to be uploaded');
    Logger.log('Run manually with test file');
}

/**
 * Test 4: Normalization performance
 */
function test_Normalization_Performance() {
    Logger.log('=== TEST: Coupon Normalization Performance ===');

    const testCupons = [];
    for (let i = 0; i < 10000; i++) {
        testCupons.push('00' + Math.floor(Math.random() * 10000000));
    }

    // Test without memoization
    const test1 = benchmark('Without memoization (10k cupons)', () => {
        const results = [];
        for (const c of testCupons) {
            let result = String(c).trim().toUpperCase();
            while (result.length > 1 && result.charAt(0) === '0') {
                result = result.substring(1);
            }
            results.push(result);
        }
        return { ok: true, count: results.length };
    });

    // Test with memoization (using V2)
    ConciliacionCruceV2.clearCache();
    const test2 = benchmark('With memoization (10k cupons)', () => {
        const results = [];
        for (const c of testCupons) {
            results.push(ConciliacionCruceV2._normalizarCuponCached(c));
        }
        return { ok: true, count: results.length };
    });

    // Test second pass (all cached)
    const test3 = benchmark('Second pass (all cached)', () => {
        const results = [];
        for (const c of testCupons) {
            results.push(ConciliacionCruceV2._normalizarCuponCached(c));
        }
        return { ok: true, count: results.length };
    });

    ConciliacionCruceV2.clearCache();

    Logger.log('\n=== SUMMARY ===');
    Logger.log('Without memoization: ' + test1.duration + 'ms');
    Logger.log('With memoization (first): ' + test2.duration + 'ms');
    Logger.log('With memoization (cached): ' + test3.duration + 'ms');
}

/**
 * Test 5: Map vs Object lookup performance
 */
function test_Lookup_Performance() {
    Logger.log('=== TEST: Map vs Object Lookup Performance ===');

    const testData = {};
    const testMap = new Map();

    // Populate with 50k entries
    for (let i = 0; i < 50000; i++) {
        const key = 'KEY' + i;
        testData[key] = { row: i, value: 'data' + i };
        testMap.set(key, { row: i, value: 'data' + i });
    }

    const lookupKeys = [];
    for (let i = 0; i < 10000; i++) {
        lookupKeys.push('KEY' + Math.floor(Math.random() * 50000));
    }

    // Test Object lookup
    const test1 = benchmark('Object lookup (10k)', () => {
        let found = 0;
        for (const k of lookupKeys) {
            if (testData[k]) found++;
        }
        return { ok: true, found };
    });

    // Test Map lookup
    const test2 = benchmark('Map lookup (10k)', () => {
        let found = 0;
        for (const k of lookupKeys) {
            if (testMap.has(k)) found++;
        }
        return { ok: true, found };
    });

    Logger.log('\n=== SUMMARY ===');
    Logger.log('Object lookup: ' + test1.duration + 'ms');
    Logger.log('Map lookup: ' + test2.duration + 'ms');
    Logger.log('Map is ' + (test1.duration > test2.duration ? 'faster' : 'slower'));
}

/**
 * Run all performance tests
 */
function runAllPerformanceTests() {
    Logger.log('╔═══════════════════════════════════════════════╗');
    Logger.log('║  CONCILIACIÓN MODULE PERFORMANCE TEST SUITE   ║');
    Logger.log('║  Version: 1.0.0                               ║');
    Logger.log('║  Date: ' + new Date().toISOString().slice(0, 10) + '                           ║');
    Logger.log('╚═══════════════════════════════════════════════╝');
    Logger.log('');

    test_Normalization_Performance();
    Logger.log('\n');

    test_Lookup_Performance();
    Logger.log('\n');

    test_BDCruce_Performance();
    Logger.log('\n');

    test_Export_Performance();
    Logger.log('\n');

    Logger.log('╔═══════════════════════════════════════════════╗');
    Logger.log('║  ALL TESTS COMPLETED                          ║');
    Logger.log('╚═══════════════════════════════════════════════╝');
}

/**
 * Quick smoke test to verify V2 modules load correctly
 */
function test_V2_ModulesLoad() {
    Logger.log('=== TEST: V2 Modules Load Check ===');

    const modules = [
        { name: 'ConciliacionIOV2', ref: typeof ConciliacionIOV2 },
        { name: 'ConciliacionCruceV2', ref: typeof ConciliacionCruceV2 },
        { name: 'ConciliacionExportV2', ref: typeof ConciliacionExportV2 },
        { name: 'ConciliacionServiceV2', ref: typeof ConciliacionServiceV2 },
        { name: 'LaPositivaProcessorV2', ref: typeof LaPositivaProcessorV2 },
        { name: 'XLSX (SheetJS)', ref: typeof XLSX }
    ];

    let allOk = true;
    for (const m of modules) {
        const status = m.ref !== 'undefined' ? '✅ LOADED' : '❌ NOT FOUND';
        Logger.log(m.name + ': ' + status);
        if (m.ref === 'undefined') allOk = false;
    }

    Logger.log('\nAll critical modules loaded: ' + (allOk ? 'YES' : 'NO'));
    return allOk;
}

/**
 * Compare results between V1 and V2 for validation
 */
function test_ResultParity(insurerKey, testFileBase64) {
    Logger.log('=== TEST: Result Parity V1 vs V2 ===');
    Logger.log('This test compares outputs between original and optimized versions');
    Logger.log('Requires a test file to be provided');

    // This would need actual test data to run
    // The test would:
    // 1. Run original process
    // 2. Run V2 process
    // 3. Compare cruce results (registrado, validar, noRegistrado)
    // 4. Compare export row counts
    // 5. Verify data integrity
}
