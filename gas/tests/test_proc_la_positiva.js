/**
 * Test Suite: proc_la_positiva.js
 *
 * Regression coverage for the dd/mm vs mm/dd date swap bug fixed by reading
 * the payment date from getValues() (native Date) instead of getDisplayValues()
 * (locale-dependent string).
 *
 * Run with: node gas/tests/test_proc_la_positiva.js
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

// ==================== LOAD MODULES (const -> var) ====================

function loadGasFile(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');
    code = code.replace(/^const\s+/gm, 'var ');
    code = code.replace(/^let\s+/gm, 'var ');
    return code;
}

eval(loadGasFile(path.join(__dirname, '..', 'processor_base.js')));
eval(loadGasFile(path.join(__dirname, '..', 'proc_la_positiva.js')));

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

const CFG = LaPositivaProcessorV2.CONFIG;
const TOTAL_COLS = 22; // covers up to COL_FECHA (21)

/**
 * Builds a srcData / srcValues pair of length `numRows`. Pre-data rows
 * (index 0..START_ROW-2) are empty arrays of TOTAL_COLS length so the loop
 * skips them naturally (estado normalizes to '').
 */
function buildEmptyRows(numRows) {
    const data = [];
    for (let r = 0; r < numRows; r++) {
        const row = new Array(TOTAL_COLS);
        for (let c = 0; c < TOTAL_COLS; c++) row[c] = '';
        data.push(row);
    }
    return data;
}

/**
 * Builds a paired (display, native) row set. `entries` is an array of
 * { rowIndex, estado, numero, giro, factura, fechaDisplay, fechaValue }.
 */
function buildSrcPair(entries, numRows) {
    const data = buildEmptyRows(numRows);
    const values = buildEmptyRows(numRows);

    entries.forEach((e) => {
        if (e.estado !== undefined) {
            data[e.rowIndex][CFG.COL_ESTADO - 1] = e.estado;
            values[e.rowIndex][CFG.COL_ESTADO - 1] = e.estado;
        }
        if (e.numero !== undefined) {
            data[e.rowIndex][CFG.COL_NUMERO - 1] = e.numero;
            values[e.rowIndex][CFG.COL_NUMERO - 1] = e.numero;
        }
        if (e.giro !== undefined) {
            data[e.rowIndex][CFG.COL_GIRO - 1] = e.giro;
            values[e.rowIndex][CFG.COL_GIRO - 1] = e.giro;
        }
        if (e.factura !== undefined) {
            data[e.rowIndex][CFG.COL_FACTURA - 1] = e.factura;
            values[e.rowIndex][CFG.COL_FACTURA - 1] = e.factura;
        }
        if (e.fechaDisplay !== undefined) {
            data[e.rowIndex][CFG.COL_FECHA - 1] = e.fechaDisplay;
        }
        if (e.fechaValue !== undefined) {
            values[e.rowIndex][CFG.COL_FECHA - 1] = e.fechaValue;
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
        getLastColumn: () => TOTAL_COLS
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
    // Headers + clearFromRow no-ops so they don't crash on the fake sheet.
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
console.log('TEST SUITE: proc_la_positiva.js');
console.log('='.repeat(60));

// --- Test 1: Regression dd/mm vs mm/dd swap bug ---
console.log('\nTest 1: Regression bug fecha dia<->mes');
{
    const expectedDate = new Date(2026, 4, 8); // 8 mayo 2026
    const { data, values } = buildSrcPair([{
        rowIndex: 10, // START_ROW (11) - 1
        estado: 'CANCELADO',
        numero: '0012345',
        giro: 0,
        factura: 'F001-001',
        fechaDisplay: '5/8/2026',   // ambiguous string (would be parsed as 5-aug under d/m/y)
        fechaValue: expectedDate    // native Date the processor must use
    }], 11);

    const cap = captureTramaRows();
    try {
        const { ss, dataContext } = buildContext();
        LaPositivaProcessorV2.processOptimized({ data, values }, ss, dataContext);
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
    assert(row && row[0] === '0012345', 'numeroCupon matches numero (giro=0)');
    assert(row && row[2] === 'F001-001', 'factura propagated');
    assert(row && row[3] === '', 'status column initialized empty');
}

// --- Test 2: State filter excludes non-cancelado rows ---
console.log('\nTest 2: Solo procesa filas con estado=cancelado');
{
    const fecha = new Date(2026, 3, 15);
    const { data, values } = buildSrcPair([
        { rowIndex: 10, estado: 'PENDIENTE', numero: 'A1', giro: 0, factura: 'F-A', fechaDisplay: '15/4/2026', fechaValue: fecha },
        { rowIndex: 11, estado: 'CANCELADO', numero: 'B2', giro: 0, factura: 'F-B', fechaDisplay: '15/4/2026', fechaValue: fecha },
        { rowIndex: 12, estado: 'ANULADO',   numero: 'C3', giro: 0, factura: 'F-C', fechaDisplay: '15/4/2026', fechaValue: fecha },
        { rowIndex: 13, estado: 'cancelado', numero: 'D4', giro: 0, factura: 'F-D', fechaDisplay: '15/4/2026', fechaValue: fecha }
    ], 14);

    const cap = captureTramaRows();
    let result;
    try {
        const { ss, dataContext } = buildContext();
        result = LaPositivaProcessorV2.processOptimized({ data, values }, ss, dataContext);
    } finally {
        cap.restore();
    }

    assert(cap.captured.rows && cap.captured.rows.length === 2,
        'Only 2 cancelado rows captured (not 4)');
    const cupones = (cap.captured.rows || []).map(r => r[0]);
    assert(cupones.indexOf('B2') !== -1, 'Row B2 (CANCELADO uppercase) included');
    assert(cupones.indexOf('D4') !== -1, 'Row D4 (cancelado lowercase) included');
    assert(cupones.indexOf('A1') === -1, 'Row A1 (PENDIENTE) excluded');
    assert(cupones.indexOf('C3') === -1, 'Row C3 (ANULADO) excluded');
    assert(result && result.stats && result.stats.filasCancelado === 2,
        'stats.filasCancelado === 2');
}

// --- Test 3: numeroCupon composition with giro > 0 ---
console.log('\nTest 3: Composicion numeroCupon (numero + giro si giro>0)');
{
    const fecha = new Date(2026, 0, 10);
    const { data, values } = buildSrcPair([
        { rowIndex: 10, estado: 'CANCELADO', numero: '12345', giro: 0, factura: 'F1', fechaDisplay: '10/1/2026', fechaValue: fecha },
        { rowIndex: 11, estado: 'CANCELADO', numero: '67890', giro: 2, factura: 'F2', fechaDisplay: '10/1/2026', fechaValue: fecha },
        { rowIndex: 12, estado: 'CANCELADO', numero: '111',   giro: 10, factura: 'F3', fechaDisplay: '10/1/2026', fechaValue: fecha }
    ], 13);

    const cap = captureTramaRows();
    try {
        const { ss, dataContext } = buildContext();
        LaPositivaProcessorV2.processOptimized({ data, values }, ss, dataContext);
    } finally {
        cap.restore();
    }

    const rows = cap.captured.rows || [];
    assert(rows.length === 3, '3 tramaRows generated');
    assert(rows[0] && rows[0][0] === '12345',
        'giro=0 -> numeroCupon = numeroRaw');
    assert(rows[1] && rows[1][0] === '678902',
        'giro=2 -> numeroCupon = numeroRaw + "2" ("678902")');
    assert(rows[2] && rows[2][0] === '11110',
        'giro=10 -> numeroCupon = numeroRaw + "10" ("11110")');
}

// --- Test 4: Backward-compat fallback when convertResult.values is missing ---
console.log('\nTest 4: Fallback compatibilidad: convertResult.values ausente');
{
    const { data } = buildSrcPair([
        { rowIndex: 10, estado: 'CANCELADO', numero: 'X1', giro: 0, factura: 'F-X', fechaDisplay: '15/3/2026', fechaValue: undefined }
    ], 11);

    const cap = captureTramaRows();
    let result = null;
    let threw = false;
    try {
        const { ss, dataContext } = buildContext();
        // Pass convertResult without `values` - the processor falls back to data.
        result = LaPositivaProcessorV2.processOptimized({ data }, ss, dataContext);
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

    // With the fallback, the date column comes from the display string. The
    // processor calls ProcessorBase.parseToDate on it - we just verify it does
    // not throw and yields a Date instance.
    const row = cap.captured.rows && cap.captured.rows[0];
    assert(row && row[1] instanceof Date, 'fechaPago is a Date even via fallback');
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
