/**
 * Test Suite: proc_mapfre.js — bug fix día↔mes (getDisplayValues vs getValues)
 *
 * Contexto del bug:
 *   La lectura de la columna FECHA (Q, índice 16) usaba getDisplayValues(), que
 *   devuelve un string locale-dependiente ("5/8/2026" puede ser 5-ago o 8-may).
 *   El fix lee `srcValues` (Date nativo) en su lugar.
 *
 * Ejecutar con: node gas/tests/test_proc_mapfre.js
 */

const fs = require('fs');
const path = require('path');

// ==================== MOCKS DEL ENTORNO GAS ====================

global.Logger = { log: () => {} };

// Stubs de servicios externos usados por processOptimized
global.ConciliacionCruceV2 = {
  ejecutarCruce: function () {
    return { _statusValues: [], totalCruzados: 0 };
  },
  limpiarStatusBDCruce: function () {}
};

global.ConciliacionExportV2 = {
  exportarResultados: function () {
    return { ok: true };
  }
};

// Mock mínimo de SpreadsheetApp — solo necesitamos no-ops encadenables
function makeRangeMock() {
  const range = {
    setValues: () => range,
    setNumberFormat: () => range,
    setNumberFormats: () => range,
    setFontWeight: () => range,
    setBackground: () => range,
    clearContent: () => range,
    getValues: () => [[]],
    getDisplayValues: () => [[]]
  };
  return range;
}

function makeSheetMock(name) {
  const sheet = {
    _name: name,
    getRange: () => makeRangeMock(),
    clear: () => sheet,
    insertSheet: () => sheet,
    setFrozenRows: () => sheet,
    getLastRow: () => 0,
    getLastColumn: () => 0,
    getName: () => name
  };
  return sheet;
}

global.SpreadsheetApp = {
  openById: () => ({
    getSheetByName: (n) => makeSheetMock(n),
    insertSheet: (n) => makeSheetMock(n),
    getSheets: () => [makeSheetMock('any')]
  })
};

// ==================== CARGAR MÓDULOS ====================

// eval() crea scope local: `const X = ...` queda atrapado dentro del eval. Reescribimos
// `const`/`let` de nivel superior a `var` para que escapen como globales (mismo truco
// que usa test_reports.js::loadGasFile).
function loadGasFile(filename) {
  let code = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  code = code.replace(/^const\s+/gm, 'var ');
  code = code.replace(/^let\s+/gm, 'var ');
  return code;
}

eval(loadGasFile('processor_base.js'));
eval(loadGasFile('proc_mapfre.js'));

// Monkey-patch ProcessorBase.writeTramaData para capturar las filas escritas
let capturedTramaRows = null;
ProcessorBase.writeTramaData = function (sheet, rows /*, formatConfig*/) {
  // Clonamos para evitar mutación en pasos posteriores (el código mapea Dates a strings
  // sólo en `exportRow`, no toca `rows`, pero clonamos por seguridad).
  capturedTramaRows = rows.map((r) => r.slice());
};
ProcessorBase.writeTramaHeaders = function () {};
ProcessorBase.clearFromRow = function () {};

// ==================== HELPERS DE TEST ====================

let passed = 0;
let failed = 0;
const failedNames = [];

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log('  PASS  ' + name);
  } else {
    failed++;
    failedNames.push(name);
    console.log('  FAIL  ' + name);
  }
}

function buildConvertResult({ withValues }) {
  // 17 columnas: A..Q. Índice 9 (col J) = NUM_RECIBO, índice 16 (col Q) = FECHA.
  const HEADERS = new Array(17).fill('');
  HEADERS[9] = 'NUM_RECIBO';
  HEADERS[16] = 'FEC_SITUACION';

  function emptyRow(numRecibo, fechaDisplay) {
    const row = new Array(17).fill('');
    row[9] = numRecibo;
    row[16] = fechaDisplay;
    return row;
  }

  // data (display strings) — incluye la fecha ambigua "5/8/2026"
  const data = [
    HEADERS,
    emptyRow('CUP-001', '5/8/2026'),
    emptyRow('CUP-002', '20/3/2026')
  ];

  const result = { data };

  if (withValues) {
    // values (Date nativos) — la verdad: "5/8/2026" => 8 de mayo de 2026 (mes=4)
    function emptyValueRow(numRecibo, fechaDate) {
      const row = new Array(17).fill('');
      row[9] = numRecibo;
      row[16] = fechaDate;
      return row;
    }
    result.values = [
      HEADERS,
      emptyValueRow('CUP-001', new Date(2026, 4, 8)),   // mes=4 (mayo), día=8
      emptyValueRow('CUP-002', new Date(2026, 2, 20))   // mes=2 (marzo), día=20
    ];
  }

  return result;
}

function buildDataContext() {
  return {
    bdCruceSheet: makeSheetMock('BD_Cruce'),
    bdCruceCupones: []
  };
}

// ==================== TESTS ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: proc_mapfre.js — bug día↔mes corregido');
console.log('='.repeat(60));

// ---------- Test 1: Regresión del bug día↔mes ----------
console.log('\nTest 1: Regresión bug día↔mes (fecha ambigua 5/8/2026)');
{
  capturedTramaRows = null;
  const convertResult = buildConvertResult({ withValues: true });
  const ss = SpreadsheetApp.openById('x');
  const ctx = buildDataContext();

  const out = MapfreProcessorV2.processOptimized(convertResult, ss, ctx);

  assert(out && out.ok === true, 'processOptimized retorna ok=true');
  assert(Array.isArray(capturedTramaRows), 'writeTramaData fue interceptado');
  assert(capturedTramaRows.length === 2, 'tramaRows tiene 2 filas (CUP-001 y CUP-002)');

  const row1 = capturedTramaRows[0];
  assert(row1.length === 4, 'fila tiene 4 columnas [cupon, fecha, factura, status]');
  assert(row1[0] === 'CUP-001', 'columna 0 = numeroCupon');
  assert(row1[2] === '' && row1[3] === '', 'columnas 2 y 3 son strings vacíos (FACTURA, STATUS)');

  const fecha1 = row1[1];
  assert(fecha1 instanceof Date, 'fecha es instancia de Date');
  // El bug previo (parseando "5/8/2026" como dd/mm/yyyy) habría dado mes=7 (agosto).
  // El fix lee el Date nativo (5/8/2026 en mm/dd interpretado por GAS Date) ⇒ mes=4 (mayo).
  assert(fecha1.getMonth() === 4, 'FIX: mes=4 (mayo), no 7 (agosto) — usa Date nativo en lugar de display string');
  assert(fecha1.getDate() === 8, 'FIX: día=8, no 5');
  assert(fecha1.getFullYear() === 2026, 'año=2026');
}

// ---------- Test 2: Fecha inequívoca (día > 12) ----------
console.log('\nTest 2: Fecha inequívoca día>12 (no se rompió comportamiento normal)');
{
  capturedTramaRows = null;
  const convertResult = buildConvertResult({ withValues: true });
  const ss = SpreadsheetApp.openById('x');
  const ctx = buildDataContext();

  MapfreProcessorV2.processOptimized(convertResult, ss, ctx);

  const row2 = capturedTramaRows[1];
  assert(row2[0] === 'CUP-002', 'segundo cupon correcto');
  const fecha2 = row2[1];
  assert(fecha2 instanceof Date, 'fecha2 es Date');
  assert(fecha2.getMonth() === 2, 'mes=2 (marzo)');
  assert(fecha2.getDate() === 20, 'día=20');
  assert(fecha2.getFullYear() === 2026, 'año=2026');
}

// ---------- Test 3: Fallback de compatibilidad (sin convertResult.values) ----------
console.log('\nTest 3: Fallback — convertResult.values ausente, no crashea');
{
  capturedTramaRows = null;
  const convertResult = buildConvertResult({ withValues: false });
  const ss = SpreadsheetApp.openById('x');
  const ctx = buildDataContext();

  let threw = false;
  let out = null;
  try {
    out = MapfreProcessorV2.processOptimized(convertResult, ss, ctx);
  } catch (e) {
    threw = true;
    console.log('  (excepción inesperada): ' + e.message);
  }

  assert(!threw, 'no lanza excepción cuando values está ausente (cae a srcData)');
  assert(out && out.ok === true, 'retorna ok=true');
  assert(Array.isArray(capturedTramaRows) && capturedTramaRows.length === 2, 'igual escribe 2 filas');

  // Sin `values`, el código usa srcData (display strings). parseToDate("5/8/2026")
  // sigue la regla dd/mm/yyyy → 5-agosto-2026 (mes=7). Esto valida el fallback,
  // no la corrección semántica (el caller debe pasar `values` para evitar la
  // ambigüedad locale).
  const fecha1 = capturedTramaRows[0][1];
  assert(fecha1 instanceof Date, 'fallback retorna Date (vía parseToDate sobre string)');
}

// ==================== RESULTADO ====================

console.log('\n' + '='.repeat(60));
if (failed === 0) {
  console.log('PASS — ' + passed + '/' + (passed + failed) + ' tests pasaron');
} else {
  console.log('FAIL — ' + passed + ' passed, ' + failed + ' failed (' + (passed + failed) + ' total)');
  console.log('\nFallidos:');
  failedNames.forEach((n) => console.log('  - ' + n));
}
console.log('='.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
