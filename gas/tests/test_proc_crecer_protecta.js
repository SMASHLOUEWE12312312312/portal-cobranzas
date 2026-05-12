/**
 * Test Suite: proc_crecer_protecta.js
 *
 * Regression coverage for the dd/mm vs mm/dd date swap bug fixed by reading
 * the payment date from getValues() (native Date) instead of getDisplayValues()
 * (locale-dependent string).
 *
 * Crecer&Protecta has a special quirk: column E may be an extra "Estado"
 * column that gets spliced out, shifting every column to its right left by 1
 * (colOffset = -1). The fix must apply the same splice to BOTH srcData and
 * srcValues so the date column stays aligned in both arrays.
 *
 * Run with: node gas/tests/test_proc_crecer_protecta.js
 */

const fs = require('fs');
const path = require('path');

// ==================== MOCK GAS ENVIRONMENT ====================

global.Logger = { log: () => {}, info: () => {}, warn: () => {}, error: () => {} };

// Minimal SpreadsheetApp stub - processOptimized only uses ss.getSheetByName /
// ss.insertSheet on the spreadsheet handle we pass in. Drive fallback isn't
// exercised in these tests (we always pass convertResult.data).
global.SpreadsheetApp = {
    openById: () => ({ getSheets: () => [] })
};

// Stub external services touched by processOptimized.
global.ConciliacionCruceV2 = {
    ejecutarCruce: () => ({ _statusValues: [] }),
    limpiarStatusBDCruce: () => {}
};

global.ConciliacionExportV2 = {
    exportarResultados: () => ({ ok: true })
};

global.getConfig = function (key, defaultVal) { return defaultVal; };

// ==================== LOAD MODULES (const -> var) ====================

function loadGasFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    code = code.replace(/^const\s+/gm, 'var ');
    code = code.replace(/^let\s+/gm, 'var ');
    return code;
}

eval(loadGasFile(path.join(__dirname, '..', 'processor_base.js')));
eval(loadGasFile(path.join(__dirname, '..', 'proc_crecer_protecta.js')));

// ==================== TEST RUNNER ====================

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName) {
    if (condition) {
        passed++;
        console.log(`  PASS  ${testName}`);
    } else {
        failed++;
        errors.push(testName);
        console.log(`  FAIL  ${testName}`);
    }
}

// ==================== TEST HELPERS ====================

const CFG = CrecerProtectaProcessorV2.CONFIG;
// Layout A (with "Estado" in col E) needs 14 columns so that after splice we
// still have COL_FECHA (13) reachable. Layout B uses 13 columns directly.
// We use 14 everywhere for symmetry; the extra trailing column is harmless.
const TOTAL_COLS_A = 14;
const TOTAL_COLS_B = 13;

function buildEmptyRows(numRows, numCols) {
    const data = [];
    for (let r = 0; r < numRows; r++) {
        const row = new Array(numCols);
        for (let c = 0; c < numCols; c++) row[c] = '';
        data.push(row);
    }
    return data;
}

/**
 * Builds Layout A inputs: header row has "Estado" in column E (index 4).
 * The processor will splice index 4 from both arrays.
 *
 * Pre-splice column indices (1-indexed):
 *   F=6 documento, H=8 vigencia, J=10 comprobante, M=13 fecha.
 *
 * `entries` = [{ rowIndex, documento, vigencia, comprobante, fechaDisplay, fechaValue }]
 */
function buildLayoutA(entries, numRows) {
    const data = buildEmptyRows(numRows, TOTAL_COLS_A);
    const values = buildEmptyRows(numRows, TOTAL_COLS_A);

    // Header row 0 - "Estado" in col E (index 4) triggers splice in processor.
    data[0][4] = 'Estado';
    values[0][4] = 'Estado';

    entries.forEach((e) => {
        const r = e.rowIndex;
        if (e.documento !== undefined) {
            data[r][CFG.COL_DOCUMENTO - 1] = e.documento;
            values[r][CFG.COL_DOCUMENTO - 1] = e.documento;
        }
        if (e.vigencia !== undefined) {
            data[r][CFG.COL_VIGENCIA - 1] = e.vigencia;
            values[r][CFG.COL_VIGENCIA - 1] = e.vigencia;
        }
        if (e.comprobante !== undefined) {
            data[r][CFG.COL_COMPROBANTE - 1] = e.comprobante;
            values[r][CFG.COL_COMPROBANTE - 1] = e.comprobante;
        }
        if (e.fechaDisplay !== undefined) {
            data[r][CFG.COL_FECHA - 1] = e.fechaDisplay;
        }
        if (e.fechaValue !== undefined) {
            values[r][CFG.COL_FECHA - 1] = e.fechaValue;
        }
    });

    return { data, values };
}

/**
 * Builds Layout B inputs: column E header is NOT "Estado", so no splice
 * happens. Columns stay at their nominal positions (1-indexed):
 *   F=6 documento, H=8 vigencia, J=10 comprobante, M=13 fecha.
 */
function buildLayoutB(entries, numRows) {
    const data = buildEmptyRows(numRows, TOTAL_COLS_B);
    const values = buildEmptyRows(numRows, TOTAL_COLS_B);

    // Header row - put something other than "Estado" in col E.
    data[0][4] = 'OtraCol';
    values[0][4] = 'OtraCol';

    entries.forEach((e) => {
        const r = e.rowIndex;
        if (e.documento !== undefined) {
            data[r][CFG.COL_DOCUMENTO - 1] = e.documento;
            values[r][CFG.COL_DOCUMENTO - 1] = e.documento;
        }
        if (e.vigencia !== undefined) {
            data[r][CFG.COL_VIGENCIA - 1] = e.vigencia;
            values[r][CFG.COL_VIGENCIA - 1] = e.vigencia;
        }
        if (e.comprobante !== undefined) {
            data[r][CFG.COL_COMPROBANTE - 1] = e.comprobante;
            values[r][CFG.COL_COMPROBANTE - 1] = e.comprobante;
        }
        if (e.fechaDisplay !== undefined) {
            data[r][CFG.COL_FECHA - 1] = e.fechaDisplay;
        }
        if (e.fechaValue !== undefined) {
            values[r][CFG.COL_FECHA - 1] = e.fechaValue;
        }
    });

    return { data, values };
}

/**
 * Builds a fake spreadsheet (`ss`) that records work on sheets without doing
 * anything. dataContext provides the BD_Cruce stub needed by processOptimized.
 */
function buildContext() {
    const fakeSheet = {
        getRange: () => ({
            setNumberFormat: () => fakeSheet,
            setNumberFormats: () => fakeSheet,
            setValues: () => fakeSheet,
            setFontWeight: () => ({ setBackground: () => fakeSheet }),
            getDisplayValues: () => [],
            getValues: () => [],
            clearContent: () => fakeSheet
        }),
        setFrozenRows: () => fakeSheet,
        getLastRow: () => 0,
        getLastColumn: () => TOTAL_COLS_A
    };

    const ss = {
        getSheetByName: () => fakeSheet,
        insertSheet: () => fakeSheet
    };

    const dataContext = {
        bdCruceSheet: fakeSheet,
        bdCruceCupones: []
    };

    return { ss, dataContext, fakeSheet };
}

/**
 * Monkey-patches ProcessorBase.writeTramaData to capture the rows that would
 * have been written. Returns a restore function.
 */
function captureTramaRows() {
    const captured = { rows: null, formatConfig: null, callCount: 0 };
    const original = ProcessorBase.writeTramaData;
    ProcessorBase.writeTramaData = function (sheet, rows, formatConfig) {
        captured.rows = rows;
        captured.formatConfig = formatConfig;
        captured.callCount++;
    };
    const originalHeaders = ProcessorBase.writeTramaHeaders;
    ProcessorBase.writeTramaHeaders = function () {};
    const originalClear = ProcessorBase.clearFromRow;
    ProcessorBase.clearFromRow = function () {};

    return {
        captured,
        restore() {
            ProcessorBase.writeTramaData = original;
            ProcessorBase.writeTramaHeaders = originalHeaders;
            ProcessorBase.clearFromRow = originalClear;
        }
    };
}

// ==================== TESTS ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: proc_crecer_protecta.js');
console.log('='.repeat(60));

// --- Test 1: Layout A (con splice) - regresion dia<->mes ---
console.log('\nTest 1: Layout A (con splice "Estado") - regresion fecha dia<->mes');
{
    const expectedDate = new Date(2026, 4, 8); // 8 mayo 2026
    // START_ROW=8 -> data row at index 7. Add a few extra rows to be safe.
    const { data, values } = buildLayoutA([{
        rowIndex: 7,
        documento: 'EPS-12345',          // -> cupon "12345"
        vigencia: '01/01/2026',          // anio 2026 -> >= 2025
        comprobante: 'F001-001',
        fechaDisplay: '5/8/2026',        // ambiguous string (d/m -> 5 ago; m/d -> 8 may)
        fechaValue: expectedDate         // native Date the processor MUST use
    }], 12);

    const cap = captureTramaRows();
    try {
        const { ss, dataContext } = buildContext();
        CrecerProtectaProcessorV2.processOptimized({ data, values }, ss, dataContext);
    } finally {
        cap.restore();
    }

    assert(Array.isArray(cap.captured.rows) && cap.captured.rows.length === 1,
        'Captured exactly one tramaRow');

    const row = cap.captured.rows && cap.captured.rows[0];
    assert(row && row[1] instanceof Date, 'fechaPago is a Date');
    assert(row && row[1] instanceof Date && row[1].getFullYear() === 2026,
        'fechaPago year is 2026');
    assert(row && row[1] instanceof Date && row[1].getMonth() === 4,
        'fechaPago month is May (index 4) - not swapped to August');
    assert(row && row[1] instanceof Date && row[1].getDate() === 8,
        'fechaPago day is 8 - not swapped to 5');
    assert(row && row[0] === '12345', 'numeroCupon = "12345" (EPS- prefix stripped)');
    assert(row && row[2] === 'F001-001', 'comprobante propagated');
    assert(row && row[3] === '', 'status column initialized empty');
}

// --- Test 2: Layout B (sin splice) - regresion dia<->mes ---
console.log('\nTest 2: Layout B (sin splice) - regresion fecha dia<->mes');
{
    const expectedDate = new Date(2026, 4, 8); // 8 mayo 2026
    const { data, values } = buildLayoutB([{
        rowIndex: 7,
        documento: 'EPS-00777',          // -> cupon "777" (zeros stripped)
        vigencia: '15/06/2026',          // anio 2026 -> >= 2025
        comprobante: 'B002-002',
        fechaDisplay: '5/8/2026',        // ambiguous string
        fechaValue: expectedDate
    }], 12);

    const cap = captureTramaRows();
    try {
        const { ss, dataContext } = buildContext();
        CrecerProtectaProcessorV2.processOptimized({ data, values }, ss, dataContext);
    } finally {
        cap.restore();
    }

    assert(Array.isArray(cap.captured.rows) && cap.captured.rows.length === 1,
        'Captured exactly one tramaRow');

    const row = cap.captured.rows && cap.captured.rows[0];
    assert(row && row[1] instanceof Date, 'fechaPago is a Date');
    assert(row && row[1] instanceof Date && row[1].getFullYear() === 2026,
        'fechaPago year is 2026');
    assert(row && row[1] instanceof Date && row[1].getMonth() === 4,
        'fechaPago month is May (index 4) - not swapped to August');
    assert(row && row[1] instanceof Date && row[1].getDate() === 8,
        'fechaPago day is 8 - not swapped to 5');
    assert(row && row[0] === '777', 'numeroCupon = "777" (leading zeros stripped)');
    assert(row && row[2] === 'B002-002', 'comprobante propagated');
}

// --- Test 3: Layout A - splice se aplica a srcValues (alineamiento) ---
console.log('\nTest 3: Layout A - splice se aplica simetricamente a data y values');
{
    // If the splice were applied ONLY to srcData and not to srcValues, the
    // processor would read the wrong column from srcValues[i] using colFecha
    // (= 13 + (-1) = 12 -> index 11). To detect that misalignment, we put a
    // sentinel "wrong" value at the index that would be read in case of a bug
    // (the unspliced position, index 12) and the correct date at the spliced
    // position (index 11 after splice = original index 12, which is col M-1=12,
    // i.e. CFG.COL_FECHA - 1 = 12 in the source array). Use buildLayoutA which
    // writes the date at CFG.COL_FECHA - 1 = 12 in the pre-splice array; after
    // splice, that lands at index 11. We add a sentinel at index 12 of values
    // post-build (which represents the "wrong" cell post-splice).
    const correctDate = new Date(2026, 2, 14);  // 14 marzo 2026
    const sentinelWrong = new Date(2099, 11, 31); // would scream if read

    const { data, values } = buildLayoutA([{
        rowIndex: 7,
        documento: 'EPS-55555',
        vigencia: '01/01/2026',
        comprobante: 'X-1',
        fechaDisplay: '14/3/2026',
        fechaValue: correctDate    // lands at index CFG.COL_FECHA - 1 = 12
    }], 12);

    // Place sentinel one column to the right of the date in values. After the
    // splice removes index 4, what is currently at index 13 shifts to index 12.
    // colFecha after splice = COL_FECHA + (-1) = 12, so colFecha-1 = 11.
    // The correctly aligned read picks values[7][11], which is the original
    // values[7][12] before splice (the date we wrote). The sentinel sits at
    // original index 13 and would be at post-splice index 12 - never read.
    values[7][13] = sentinelWrong;

    const cap = captureTramaRows();
    try {
        const { ss, dataContext } = buildContext();
        CrecerProtectaProcessorV2.processOptimized({ data, values }, ss, dataContext);
    } finally {
        cap.restore();
    }

    const row = cap.captured.rows && cap.captured.rows[0];
    assert(row && row[1] instanceof Date, 'fechaPago is a Date');
    assert(row && row[1] instanceof Date && row[1].getFullYear() === 2026,
        'fechaPago year is 2026 (not 2099 - sentinel never read)');
    assert(row && row[1] instanceof Date && row[1].getMonth() === 2,
        'fechaPago month is March (correct date column read)');
    assert(row && row[1] instanceof Date && row[1].getDate() === 14,
        'fechaPago day is 14');
}

// --- Test 4: Filtro vigencia (>=2025 incluye, <2025 omite) ---
console.log('\nTest 4: Filtro vigencia anio >= 2025');
{
    const fecha2025 = new Date(2025, 5, 10);
    const fecha2024 = new Date(2024, 5, 10);

    const { data, values } = buildLayoutA([
        { rowIndex: 7, documento: 'EPS-1001', vigencia: '01/01/2024', comprobante: 'OLD', fechaDisplay: '10/6/2024', fechaValue: fecha2024 },
        { rowIndex: 8, documento: 'EPS-2002', vigencia: '01/01/2025', comprobante: 'NEW1', fechaDisplay: '10/6/2025', fechaValue: fecha2025 },
        { rowIndex: 9, documento: 'EPS-3003', vigencia: '15/03/2026', comprobante: 'NEW2', fechaDisplay: '10/6/2025', fechaValue: fecha2025 }
    ], 12);

    const cap = captureTramaRows();
    let result;
    try {
        const { ss, dataContext } = buildContext();
        result = CrecerProtectaProcessorV2.processOptimized({ data, values }, ss, dataContext);
    } finally {
        cap.restore();
    }

    const rows = cap.captured.rows || [];
    assert(rows.length === 2, 'Solo 2 filas (vigencia 2025 y 2026), vigencia 2024 omitida');

    const cupones = rows.map(r => r[0]);
    assert(cupones.indexOf('1001') === -1, 'Cupon de vigencia 2024 NO incluido');
    assert(cupones.indexOf('2002') !== -1, 'Cupon de vigencia 2025 incluido');
    assert(cupones.indexOf('3003') !== -1, 'Cupon de vigencia 2026 incluido');
    assert(result && result.ok === true, 'returns ok:true');
}

// --- Test 5: Fallback compat: convertResult.values ausente ---
console.log('\nTest 5: Fallback compatibilidad: convertResult.values ausente');
{
    const { data } = buildLayoutA([{
        rowIndex: 7,
        documento: 'EPS-99',
        vigencia: '01/01/2026',
        comprobante: 'F-X',
        fechaDisplay: '15/3/2026',
        fechaValue: undefined
    }], 12);

    const cap = captureTramaRows();
    let result = null;
    let threw = false;
    try {
        const { ss, dataContext } = buildContext();
        // Pass convertResult without `values` - the processor falls back to data.
        result = CrecerProtectaProcessorV2.processOptimized({ data }, ss, dataContext);
    } catch (e) {
        threw = true;
        console.log('    Threw: ' + e.message);
    } finally {
        cap.restore();
    }

    assert(!threw, 'processOptimized does not crash when values is absent');
    assert(result && result.ok === true, 'returns ok:true');
    assert(cap.captured.rows && cap.captured.rows.length === 1,
        'Still produces 1 tramaRow using data as fallback');

    const row = cap.captured.rows && cap.captured.rows[0];
    assert(row && row[1] instanceof Date, 'fechaPago is a Date even via fallback');
    assert(row && row[0] === '99', 'numeroCupon "99" correcto via fallback');
}

// ==================== RESULT ====================

console.log('\n' + '='.repeat(60));
if (failed === 0) {
    console.log(`ALL TESTS PASSED: ${passed}/${passed + failed}`);
} else {
    console.log(`RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
    console.log('\nFailed tests:');
    errors.forEach(e => console.log(`  - ${e}`));
}
console.log('='.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
