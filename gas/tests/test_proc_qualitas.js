/**
 * Test Suite: Qualitas Processor - Regression for date parsing bug
 *
 * Bug being verified: In `proc_qualitas.js`, the date column (N / COL_FECHA = 14)
 * was previously read via `getDisplayValues()` (locale-dependent strings like
 * "5/8/2026" — ambiguous dd/mm vs mm/dd). The fix reads from `getValues()`
 * (native Date objects) so the day/month order is unambiguous.
 *
 * Ejecutar con: node gas/tests/test_proc_qualitas.js
 */

const fs = require('fs');
const path = require('path');

// ==================== TEST RUNNER ====================

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, testName) {
    if (condition) {
        passed++;
        console.log(`  PASS ${testName}`);
    } else {
        failed++;
        errors.push(testName);
        console.log(`  FAIL ${testName}`);
    }
}

// ==================== MOCK DEL ENTORNO GAS ====================

global.Logger = { log: () => {}, info: () => {}, warn: () => {}, error: () => {} };

global.SpreadsheetApp = {
    openById: () => ({
        getSheets: () => [makeMockSheet()],
    }),
};

function makeMockSheet(name) {
    const sheet = {
        _name: name || 'mock',
        _frozenRows: 0,
        clear: () => sheet,
        getLastRow: () => 0,
        getLastColumn: () => 1,
        setFrozenRows: (n) => { sheet._frozenRows = n; return sheet; },
        getRange: () => ({
            setValues: () => ({
                setFontWeight: () => ({ setBackground: () => ({}) }),
                setNumberFormat: () => ({}),
                setNumberFormats: () => ({}),
            }),
            setNumberFormat: () => ({}),
            setNumberFormats: () => ({}),
            setFontWeight: () => ({ setBackground: () => ({}) }),
            setBackground: () => ({}),
            getValues: () => [],
            getDisplayValues: () => [],
            clearContent: () => {},
        }),
        getDataRange: () => sheet.getRange(),
    };
    return sheet;
}

function makeMockSpreadsheet(sheetsByName) {
    return {
        getSheetByName: (name) => sheetsByName[name] || null,
        insertSheet: (name) => {
            const s = makeMockSheet(name);
            sheetsByName[name] = s;
            return s;
        },
    };
}

// Helper to fetch config used by the compatibility wrapper. Not exercised by
// these tests, but needs to exist because proc_qualitas.js references it.
global.getConfig = (key, defaultVal) => defaultVal;

// ==================== STUBS Conciliación ====================

global.ConciliacionCruceV2 = {
    ejecutarCruce: () => ({ _statusValues: [], filasCruzadas: 0 }),
    limpiarStatusBDCruce: () => {},
};

global.ConciliacionExportV2 = {
    exportarResultados: () => ({ ok: true }),
};

// ==================== CARGAR MÓDULOS ====================

// Convert `const NAME = {...}` to `NAME = {...}` so symbols become globals when eval'd.
function loadGasFile(p) {
    let code = fs.readFileSync(p, 'utf8');
    code = code.replace(/^const\s+/gm, 'var ');
    code = code.replace(/^let\s+/gm, 'var ');
    return code;
}

eval(loadGasFile(path.join(__dirname, '..', 'processor_base.js')));
eval(loadGasFile(path.join(__dirname, '..', 'proc_qualitas.js')));

// ==================== HELPER: capturar tramaRows ====================

let capturedTramaRows = null;
ProcessorBase.writeTramaHeaders = function () { /* no-op */ };
ProcessorBase.writeTramaData = function (sheet, rows /*, formatConfig */) {
    capturedTramaRows = rows;
};

// ==================== Helpers para construir convertResult ====================

const NUM_COLS = 20; // > COL_FECHA (14) y > COL_CUPON (10)

function makeEmptyRow() {
    return new Array(NUM_COLS).fill('');
}

/**
 * Build a convertResult with at least 18 rows (16 headers + at least 2 data rows).
 * Row index 16 is the first data row (Qualitas START_ROW=17, i.e. 1-indexed row 17).
 *
 * @param {Array<{cupon: string, fechaDate: Date|null, fechaDisplay: string}>} dataRows
 * @returns {{data: string[][], values: any[][]}}
 */
function buildConvertResult(dataRows) {
    const headerCount = 16;
    const totalRows = headerCount + dataRows.length;
    const data = [];
    const values = [];

    // Headers (16 rows of placeholders)
    for (let i = 0; i < headerCount; i++) {
        data.push(makeEmptyRow());
        values.push(makeEmptyRow());
    }

    // Data rows
    for (const r of dataRows) {
        const dispRow = makeEmptyRow();
        const valRow = makeEmptyRow();
        // COL_CUPON = 10 -> index 9
        dispRow[9] = r.cupon != null ? String(r.cupon) : '';
        valRow[9] = r.cupon != null ? String(r.cupon) : '';
        // COL_FECHA = 14 -> index 13
        dispRow[13] = r.fechaDisplay != null ? r.fechaDisplay : '';
        valRow[13] = r.fechaDate != null ? r.fechaDate : '';
        data.push(dispRow);
        values.push(valRow);
    }

    return { data, values };
}

function isSameDate(a, b) {
    return (
        a instanceof Date &&
        b instanceof Date &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

// ==================== TESTS ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: proc_qualitas.js - regresión fecha día/mes');
console.log('='.repeat(60));

// --- Test 1: Regresión día↔mes ---
console.log('\nTest 1: Regresión día↔mes (display string ambiguo)');
{
    capturedTramaRows = null;
    const expectedDate = new Date(2026, 4, 8); // 8 de mayo de 2026
    const convertResult = buildConvertResult([
        { cupon: 'CUP-001', fechaDate: expectedDate, fechaDisplay: '5/8/2026' },
    ]);
    const sheetsByName = {};
    const ss = makeMockSpreadsheet(sheetsByName);
    const dataContext = { bdCruceSheet: makeMockSheet('BD_Cruce'), bdCruceCupones: [] };

    const result = QualitasProcessorV2.processOptimized(convertResult, ss, dataContext);

    assert(result && result.ok === true, 'processOptimized retorna ok=true');
    assert(Array.isArray(capturedTramaRows), 'writeTramaData fue invocado con array');
    assert(capturedTramaRows && capturedTramaRows.length === 1, 'tramaRows tiene 1 fila');
    const row0 = capturedTramaRows && capturedTramaRows[0];
    assert(Array.isArray(row0) && row0.length === 4, 'fila tiene 4 columnas [cupon, fecha, factura, status]');
    assert(row0 && row0[0] === 'CUP-001', 'columna 0 es el número de cupón');
    assert(row0 && row0[1] instanceof Date, 'columna 1 es Date');
    assert(row0 && isSameDate(row0[1], expectedDate), 'fecha es Date(2026, 4, 8) — mayo, NO agosto');
    assert(row0 && row0[2] === '', 'columna 2 (FACTURA) está vacía');
    assert(row0 && row0[3] === '', 'columna 3 (STATUS) está vacía');
}

// --- Test 2: Fecha inequívoca (día > 12) ---
console.log('\nTest 2: Fecha inequívoca (día > 12)');
{
    capturedTramaRows = null;
    const expectedDate = new Date(2026, 2, 25); // 25 de marzo de 2026
    const convertResult = buildConvertResult([
        { cupon: 'CUP-002', fechaDate: expectedDate, fechaDisplay: '25/3/2026' },
    ]);
    const sheetsByName = {};
    const ss = makeMockSpreadsheet(sheetsByName);
    const dataContext = { bdCruceSheet: makeMockSheet('BD_Cruce'), bdCruceCupones: [] };

    QualitasProcessorV2.processOptimized(convertResult, ss, dataContext);

    assert(capturedTramaRows && capturedTramaRows.length === 1, 'tramaRows tiene 1 fila');
    const row0 = capturedTramaRows && capturedTramaRows[0];
    assert(row0 && row0[0] === 'CUP-002', 'cupón correcto');
    assert(row0 && isSameDate(row0[1], expectedDate), 'fecha Date(2026, 2, 25) preservada');
}

// --- Test 3: Saltado de filas iniciales (filas 0-15 = headers) ---
console.log('\nTest 3: Filas 0-15 son headers y no aparecen en tramaRows');
{
    capturedTramaRows = null;
    const dataDate1 = new Date(2026, 5, 1);
    const dataDate2 = new Date(2026, 5, 2);
    const convertResult = buildConvertResult([
        { cupon: 'DATA-1', fechaDate: dataDate1, fechaDisplay: '1/6/2026' },
        { cupon: 'DATA-2', fechaDate: dataDate2, fechaDisplay: '2/6/2026' },
    ]);
    // Contaminate headers with cupon-like values; should be ignored because START_ROW=17.
    for (let i = 0; i < 16; i++) {
        convertResult.data[i][9] = 'HEADER-CUPON-' + i;
        convertResult.values[i][9] = 'HEADER-CUPON-' + i;
        convertResult.data[i][13] = '1/1/2000';
        convertResult.values[i][13] = new Date(2000, 0, 1);
    }
    const sheetsByName = {};
    const ss = makeMockSpreadsheet(sheetsByName);
    const dataContext = { bdCruceSheet: makeMockSheet('BD_Cruce'), bdCruceCupones: [] };

    QualitasProcessorV2.processOptimized(convertResult, ss, dataContext);

    assert(capturedTramaRows && capturedTramaRows.length === 2, 'sólo 2 filas de datos (no headers)');
    const cupones = (capturedTramaRows || []).map((r) => r[0]);
    assert(cupones.indexOf('DATA-1') >= 0, 'DATA-1 presente');
    assert(cupones.indexOf('DATA-2') >= 0, 'DATA-2 presente');
    assert(
        cupones.every((c) => String(c).indexOf('HEADER-CUPON-') !== 0),
        'ningún cupón viene de las filas 0-15'
    );
}

// --- Test 4: Fallback compatibilidad - `values` ausente ---
console.log('\nTest 4: Fallback - convertResult.values ausente, sólo data');
{
    capturedTramaRows = null;
    // Build only `data` (display strings), with no `values` field. proc_qualitas
    // should fall back to using `data` for both reads (compat path).
    const dataOnly = buildConvertResult([
        { cupon: 'CUP-FB', fechaDate: new Date(2026, 0, 15), fechaDisplay: '15/01/2026' },
    ]);
    const convertResult = { data: dataOnly.data /* values intentionally omitted */ };
    const sheetsByName = {};
    const ss = makeMockSpreadsheet(sheetsByName);
    const dataContext = { bdCruceSheet: makeMockSheet('BD_Cruce'), bdCruceCupones: [] };

    let didThrow = false;
    let result;
    try {
        result = QualitasProcessorV2.processOptimized(convertResult, ss, dataContext);
    } catch (e) {
        didThrow = true;
        console.log('  Excepción inesperada:', e && e.message);
    }
    assert(!didThrow, 'no crashea sin convertResult.values');
    assert(result && result.ok === true, 'retorna ok=true en modo fallback');
    assert(capturedTramaRows && capturedTramaRows.length === 1, 'una fila procesada');
    const row0 = capturedTramaRows && capturedTramaRows[0];
    assert(row0 && row0[0] === 'CUP-FB', 'cupón leído desde data');
    // En fallback, parseToDate("15/01/2026") debe resolver a 15-ene-2026.
    assert(row0 && row0[1] instanceof Date, 'columna 1 es Date (parseada desde string)');
    assert(row0 && isSameDate(row0[1], new Date(2026, 0, 15)), 'fecha 15/01/2026 parseada correctamente');
}

// ==================== RESULTADO ====================

console.log('\n' + '='.repeat(60));
if (failed === 0) {
    console.log(`OK - TODOS LOS TESTS PASARON: ${passed}/${passed + failed}`);
} else {
    console.log(`FAIL - RESULTADO: ${passed} passed, ${failed} failed (${passed + failed} total)`);
    console.log('\nTests fallidos:');
    errors.forEach((e) => console.log(`  - ${e}`));
}
console.log('='.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
