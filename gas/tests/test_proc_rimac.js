/**
 * Test Suite: proc_rimac.js — bug fix día↔mes (getDisplayValues vs getValues)
 *
 * Contexto del bug:
 *   La lectura de la columna FEC_EMISION (N, índice 13) usaba getDisplayValues(),
 *   que devuelve un string locale-dependiente ("5/8/2026" puede ser 5-ago o 8-may).
 *   El fix lee `srcValues` (Date nativo) en su lugar.
 *
 * Particularidades de Rímac (CONFIG):
 *   - COL_TIPO        = 7  (G) — filtro: solo 'COB' o 'PAG'
 *   - COL_TIPO_DOC    = 10 (J) — fuente del CUPON (via extraerCuponRimac)
 *   - COL_FEC_EMISION = 14 (N) — se MAPEA a tramaRows[][1] (FECHA_PAGO)
 *   - COL_FEC_PAG     = 15 (O) — se MAPEA a tramaRows[][2] (FACTURA) — contraintuitivo
 *   - tramaRows[i] = [numeroCupon, fechaPago, factura, '']
 *
 * Ejecutar con: node gas/tests/test_proc_rimac.js
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
// que usa test_reports.js::loadGasFile y test_proc_mapfre.js).
function loadGasFile(filename) {
  let code = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  code = code.replace(/^const\s+/gm, 'var ');
  code = code.replace(/^let\s+/gm, 'var ');
  return code;
}

eval(loadGasFile('processor_base.js'));
eval(loadGasFile('proc_rimac.js'));

// Monkey-patch ProcessorBase.writeTramaData para capturar las filas escritas
let capturedTramaRows = null;
ProcessorBase.writeTramaData = function (sheet, rows /*, formatConfig*/) {
  // Clonamos para evitar mutación en pasos posteriores.
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

/**
 * Construye una fila de 15 columnas (A..O, índices 0..14) con valores por defecto vacíos.
 * - Índice 6 (col G) = tipo (COB/PAG/otro)
 * - Índice 9 (col J) = tipoDoc (CUPON source)
 * - Índice 13 (col N) = FEC_EMISION (se mapea a FECHA_PAGO)
 * - Índice 14 (col O) = FEC_PAG (se mapea a FACTURA — contraintuitivo)
 */
function buildRow({ tipo = '', tipoDoc = '', colN = '', colO = '' } = {}) {
  const row = new Array(15).fill('');
  row[6] = tipo;
  row[9] = tipoDoc;
  row[13] = colN;
  row[14] = colO;
  return row;
}

function buildDataContext() {
  return {
    bdCruceSheet: makeSheetMock('BD_Cruce'),
    bdCruceCupones: []
  };
}

// ==================== TESTS ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: proc_rimac.js — bug día↔mes corregido');
console.log('='.repeat(60));

// ---------- Test 1: Regresión del bug día↔mes ----------
console.log('\nTest 1: Regresión bug día↔mes (fecha ambigua 5/8/2026)');
{
  capturedTramaRows = null;

  // HEADERS en fila 0; data desde fila 1.
  const HEADERS = new Array(15).fill('');
  const data = [
    HEADERS,
    buildRow({ tipo: 'COB', tipoDoc: '1234567890', colN: '5/8/2026', colO: 'FA-F581 0007375086' })
  ];
  // values: copia con Date nativo en col N (índice 13). "5/8/2026" => 8 de mayo (mes=4)
  const values = [
    HEADERS,
    buildRow({ tipo: 'COB', tipoDoc: '1234567890', colN: new Date(2026, 4, 8), colO: 'FA-F581 0007375086' })
  ];

  const convertResult = { data, values };
  const ss = SpreadsheetApp.openById('x');
  const ctx = buildDataContext();

  const out = RimacProcessorV2.processOptimized(convertResult, ss, ctx);

  assert(out && out.ok === true, 'processOptimized retorna ok=true');
  assert(Array.isArray(capturedTramaRows), 'writeTramaData fue interceptado');
  assert(capturedTramaRows.length === 1, 'tramaRows tiene 1 fila (1 COB)');

  const row = capturedTramaRows[0];
  assert(row.length === 4, 'fila tiene 4 columnas [cupon, fecha, factura, status]');
  assert(row[0] === '1234567890', 'col 0 = numeroCupon (10 chars, sin transformar)');
  assert(row[3] === '', 'col 3 = STATUS vacío');

  const fecha = row[1];
  assert(fecha instanceof Date, 'fecha es Date');
  // El bug previo (parseando "5/8/2026" como dd/mm/yyyy) habría dado mes=7 (agosto).
  // El fix lee el Date nativo desde values[i][13] ⇒ mes=4 (mayo).
  assert(fecha.getMonth() === 4, 'FIX: mes=4 (mayo), no 7 (agosto) — usa Date nativo de srcValues[i][13]');
  assert(fecha.getDate() === 8, 'FIX: día=8, no 5');
  assert(fecha.getFullYear() === 2026, 'año=2026');
}

// ---------- Test 2: Filtro por tipo (omitir filas no-COB/PAG) ----------
console.log('\nTest 2: Filtro por tipo — filas con tipo ≠ COB/PAG se omiten');
{
  capturedTramaRows = null;

  const HEADERS = new Array(15).fill('');
  const data = [
    HEADERS,
    buildRow({ tipo: 'XYZ', tipoDoc: '1111111111', colN: '10/3/2026', colO: 'FACT-A' }), // se omite
    buildRow({ tipo: 'ANUL', tipoDoc: '2222222222', colN: '11/3/2026', colO: 'FACT-B' }), // se omite
    buildRow({ tipo: '', tipoDoc: '3333333333', colN: '12/3/2026', colO: 'FACT-C' }),    // se omite
    buildRow({ tipo: 'COB', tipoDoc: '4444444444', colN: '13/3/2026', colO: 'FACT-D' })   // pasa
  ];
  const values = [
    HEADERS,
    buildRow({ tipo: 'XYZ', tipoDoc: '1111111111', colN: new Date(2026, 2, 10), colO: 'FACT-A' }),
    buildRow({ tipo: 'ANUL', tipoDoc: '2222222222', colN: new Date(2026, 2, 11), colO: 'FACT-B' }),
    buildRow({ tipo: '', tipoDoc: '3333333333', colN: new Date(2026, 2, 12), colO: 'FACT-C' }),
    buildRow({ tipo: 'COB', tipoDoc: '4444444444', colN: new Date(2026, 2, 13), colO: 'FACT-D' })
  ];

  const out = RimacProcessorV2.processOptimized({ data, values }, SpreadsheetApp.openById('x'), buildDataContext());

  assert(out && out.ok === true, 'retorna ok=true');
  assert(Array.isArray(capturedTramaRows), 'capturó tramaRows');
  assert(capturedTramaRows.length === 1, 'solo 1 fila escrita (las 3 no-COB/PAG fueron omitidas)');
  assert(capturedTramaRows[0][0] === '4444444444', 'la única fila escrita corresponde al tipo COB');
}

// ---------- Test 3: Filtros COB y PAG ambos válidos ----------
console.log('\nTest 3: Tipos COB y PAG ambos pasan el filtro');
{
  capturedTramaRows = null;

  const HEADERS = new Array(15).fill('');
  const data = [
    HEADERS,
    buildRow({ tipo: 'COB', tipoDoc: 'ABC1234567', colN: '15/3/2026', colO: 'FACT-COB' }),
    buildRow({ tipo: 'PAG', tipoDoc: 'XYZ9876543', colN: '20/3/2026', colO: 'FACT-PAG' }),
    buildRow({ tipo: 'cob', tipoDoc: 'LOW1111111', colN: '25/3/2026', colO: 'FACT-LOW' }), // lowercase → uppercase → COB
    buildRow({ tipo: 'pag', tipoDoc: 'LOW2222222', colN: '26/3/2026', colO: 'FACT-LOW2' }) // lowercase → uppercase → PAG
  ];
  const values = [
    HEADERS,
    buildRow({ tipo: 'COB', tipoDoc: 'ABC1234567', colN: new Date(2026, 2, 15), colO: 'FACT-COB' }),
    buildRow({ tipo: 'PAG', tipoDoc: 'XYZ9876543', colN: new Date(2026, 2, 20), colO: 'FACT-PAG' }),
    buildRow({ tipo: 'cob', tipoDoc: 'LOW1111111', colN: new Date(2026, 2, 25), colO: 'FACT-LOW' }),
    buildRow({ tipo: 'pag', tipoDoc: 'LOW2222222', colN: new Date(2026, 2, 26), colO: 'FACT-LOW2' })
  ];

  RimacProcessorV2.processOptimized({ data, values }, SpreadsheetApp.openById('x'), buildDataContext());

  assert(capturedTramaRows.length === 4, 'COB, PAG, cob y pag (case-insensitive) pasan: 4 filas');
  const cupones = capturedTramaRows.map((r) => r[0]);
  assert(cupones.indexOf('ABC1234567') !== -1, 'fila COB presente');
  assert(cupones.indexOf('XYZ9876543') !== -1, 'fila PAG presente');
  assert(cupones.indexOf('LOW1111111') !== -1, 'fila cob (lowercase) presente — toUpperCase aplicado');
  assert(cupones.indexOf('LOW2222222') !== -1, 'fila pag (lowercase) presente — toUpperCase aplicado');
}

// ---------- Test 4: Mapeo N→FECHA_PAGO, O→FACTURA (no swapeado) ----------
console.log('\nTest 4: Mapeo de columnas N→FECHA_PAGO, O→FACTURA (contraintuitivo, no swap)');
{
  capturedTramaRows = null;

  const HEADERS = new Array(15).fill('');
  // Valores N y O claramente distintos para que un swap sea inmediatamente detectable.
  const data = [
    HEADERS,
    buildRow({
      tipo: 'COB',
      tipoDoc: '0123456789',
      colN: '8/5/2026',                  // display string para N
      colO: 'FA-F581 0007375086'         // factura en O (string)
    })
  ];
  const values = [
    HEADERS,
    buildRow({
      tipo: 'COB',
      tipoDoc: '0123456789',
      colN: new Date(2026, 4, 8),        // Date nativo en N
      colO: 'FA-F581 0007375086'         // mismo string en O
    })
  ];

  RimacProcessorV2.processOptimized({ data, values }, SpreadsheetApp.openById('x'), buildDataContext());

  assert(capturedTramaRows.length === 1, '1 fila escrita');
  const row = capturedTramaRows[0];

  // Columna 1 (FECHA_PAGO) viene de col N (índice 13) en `values` — debe ser Date
  assert(row[1] instanceof Date, 'tramaRows[0][1] es Date (viene de col N en srcValues)');
  assert(row[1].getMonth() === 4 && row[1].getDate() === 8, 'fecha = 8-mayo-2026 (de col N)');

  // Columna 2 (FACTURA) viene de col O (índice 14) en `data` — debe ser el string factura
  assert(row[2] === 'FA-F581 0007375086', 'tramaRows[0][2] = factura (viene de col O en srcData)');

  // Anti-swap: la fecha NO debe ser el string de factura, y la factura NO debe ser una Date.
  assert(row[1] !== 'FA-F581 0007375086', 'col 1 no es la factura (no swap)');
  assert(!(row[2] instanceof Date), 'col 2 no es una Date (no swap)');
}

// ---------- Test 5: Fallback de compatibilidad (sin convertResult.values) ----------
console.log('\nTest 5: Fallback — convertResult.values ausente, no crashea');
{
  capturedTramaRows = null;

  const HEADERS = new Array(15).fill('');
  const data = [
    HEADERS,
    buildRow({ tipo: 'COB', tipoDoc: '5555555555', colN: '15/3/2026', colO: 'FACT-X' })
  ];

  // Sin `values` — el código en proc_rimac.js cae a `srcValues = convertResult.values || convertResult.data`.
  const convertResult = { data }; // values ausente
  const ss = SpreadsheetApp.openById('x');
  const ctx = buildDataContext();

  let threw = false;
  let out = null;
  try {
    out = RimacProcessorV2.processOptimized(convertResult, ss, ctx);
  } catch (e) {
    threw = true;
    console.log('  (excepción inesperada): ' + e.message);
  }

  assert(!threw, 'no lanza excepción cuando values está ausente (cae a srcData)');
  assert(out && out.ok === true, 'retorna ok=true');
  assert(Array.isArray(capturedTramaRows) && capturedTramaRows.length === 1, 'escribe 1 fila igual');

  // Sin `values`, srcValues = srcData (display strings). parseToDate("15/3/2026") sigue
  // la regla dd/mm/yyyy → 15-marzo-2026 (mes=2). Esto valida el fallback, no la
  // corrección semántica (el caller debe pasar `values` para evitar ambigüedad locale).
  const fecha = capturedTramaRows[0][1];
  assert(fecha instanceof Date, 'fallback retorna Date (vía parseToDate sobre display string)');
  assert(fecha.getMonth() === 2 && fecha.getDate() === 15, 'fallback: 15/3/2026 → 15-marzo (dd/mm/yyyy)');
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
