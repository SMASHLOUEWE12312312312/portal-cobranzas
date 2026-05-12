/**
 * Test Suite: proc_crecer_vle.js
 *
 * Cubre la regresión del bug donde la fecha de pago se leía desde
 * getDisplayValues() (string ambiguo dd/mm vs mm/dd) en lugar de getValues()
 * (Date nativo). Verifica:
 *   1) Regresión día↔mes: se usa srcValues (Date) en vez de srcData (string).
 *   2) Transformación de numeroCupon con buildNumeroCuponVLE.
 *   3) FACTURA = nroComprobante original.
 *   4) Compatibilidad: si convertResult.values está ausente, no crashea.
 *
 * Ejecutar con: node gas/tests/test_proc_crecer_vle.js
 */

const fs = require('fs');
const path = require('path');

// ==================== MOCKS DEL ENTORNO GAS ====================

global.Logger = { log: () => {}, info: () => {}, warn: () => {}, error: () => {} };

// Stubs de servicios cruzados (no se ejercitan en estos tests, solo evitan ReferenceError)
global.ConciliacionCruceV2 = {
  ejecutarCruce: () => ({ _statusValues: [] }),
  limpiarStatusBDCruce: () => {}
};

global.ConciliacionExportV2 = {
  exportarResultados: () => ({ ok: true })
};

global.SpreadsheetApp = {
  openById: () => ({
    getSheetByName: () => null,
    getSheets: () => [],
    insertSheet: () => stubSheet()
  })
};

function stubSheet() {
  // Minimal Sheet stub used as wsEECC / wsTrama
  return {
    clear: () => {},
    getLastRow: () => 1,
    getLastColumn: () => 1,
    getDataRange: () => ({
      getDisplayValues: () => [],
      getValues: () => []
    }),
    getRange: () => ({
      setNumberFormat: () => ({}),
      setNumberFormats: () => ({}),
      setValues: () => ({ setFontWeight: () => ({ setBackground: () => ({}) }) }),
      setFontWeight: () => ({ setBackground: () => ({}) }),
      setBackground: () => ({}),
      clearContent: () => {},
      getValues: () => [],
      getDisplayValues: () => []
    }),
    setFrozenRows: () => {}
  };
}

function makeSpreadsheetMock() {
  return {
    getSheetByName: (name) => null, // forzar insertSheet
    insertSheet: (name) => stubSheet()
  };
}

// ==================== CARGA DE MÓDULOS GAS ====================

// Los archivos de GAS declaran `const ProcessorBase`, `const CrecerVLEProcessorV2`, etc.
// `const` dentro de eval() no escapa a global, así que reemplazamos `const`/`let` de
// nivel superior por `var` (mismo truco que test_reports.js).
function loadGasFile(p) {
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/^const\s+/gm, 'var ');
  code = code.replace(/^let\s+/gm, 'var ');
  return code;
}

eval(loadGasFile(path.join(__dirname, '..', 'processor_base.js')));
eval(loadGasFile(path.join(__dirname, '..', 'proc_crecer_vle.js')));

// ==================== INSTRUMENTACIÓN ====================

// Capturamos las filas que el processor escribiría en la Trama interceptando
// ProcessorBase.writeTramaData. También dejamos writeTramaHeaders / clearFromRow
// como no-op para no requerir un Sheet real.
let capturedTramaRows = null;
ProcessorBase.writeTramaHeaders = () => {};
ProcessorBase.clearFromRow = () => {};
ProcessorBase.writeTramaData = (sheet, rows /*, formatConfig */) => {
  capturedTramaRows = rows;
};

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

function makeDataContext() {
  return {
    bdCruceSheet: stubSheet(),
    bdCruceCupones: []
  };
}

// Construye un convertResult con N columnas (al menos 12 = col L), START_ROW = 2.
// row index 0 = header, row index 1 = primer registro.
function buildConvertResult({ nroComprobante, fechaDate, fechaDisplay, includeValues = true }) {
  const numCols = 12; // col L = index 11
  const header = new Array(numCols).fill('');
  header[8] = 'NRO_COMPROBANTE'; // col I (index 8)
  header[11] = 'FECHA';          // col L (index 11)

  const displayRow = new Array(numCols).fill('');
  displayRow[8] = nroComprobante;
  displayRow[11] = fechaDisplay; // string ambiguo (dd/mm vs mm/dd)

  const valuesRow = new Array(numCols).fill('');
  valuesRow[8] = nroComprobante;
  valuesRow[11] = fechaDate; // Date nativo

  const data = [header, displayRow];
  const result = { data };
  if (includeValues) {
    result.values = [header, valuesRow];
  }
  return result;
}

// ==================== TESTS ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: proc_crecer_vle.js');
console.log('='.repeat(60));

// --- Test 1: Regresión día↔mes ---
// values[1][11] = Date(2026, 4, 8)  -> 8 de mayo (mes 4 = mayo, zero-indexed)
// data[1][11]   = "5/8/2026"        -> string ambiguo: parseToDate lo leería como 5 de agosto (dd/mm/yyyy)
// El processor debe usar values (Date) y por tanto el resultado debe ser 8 de mayo, NO 5 de agosto.
console.log('\nTest 1: Regresión día/mes (lee de values, no de data)');
{
  capturedTramaRows = null;
  const fechaEsperada = new Date(2026, 4, 8); // 8 mayo 2026
  const convertResult = buildConvertResult({
    nroComprobante: 'F008-00090390',
    fechaDate: fechaEsperada,
    fechaDisplay: '5/8/2026'
  });

  CrecerVLEProcessorV2.processOptimized(convertResult, makeSpreadsheetMock(), makeDataContext());

  assert(Array.isArray(capturedTramaRows) && capturedTramaRows.length === 1,
    'tramaRows tiene exactamente 1 fila');

  const fechaPago = capturedTramaRows[0][1];
  assert(fechaPago instanceof Date,
    'fechaPago es Date nativo (no string)');
  assert(fechaPago.getFullYear() === 2026,
    `año = 2026 (got ${fechaPago.getFullYear()})`);
  assert(fechaPago.getMonth() === 4,
    `mes = 4 (mayo, zero-indexed) (got ${fechaPago.getMonth()})`);
  assert(fechaPago.getDate() === 8,
    `día = 8 (got ${fechaPago.getDate()})`);

  // Anti-regresión explícita: si se hubiese leído del string display "5/8/2026"
  // vía parseToDate (dd/mm/yyyy), el mes resultante sería 7 (agosto) y día 5.
  const interpretacionBuggy = fechaPago.getMonth() === 7 && fechaPago.getDate() === 5;
  assert(!interpretacionBuggy,
    'NO se interpretó "5/8/2026" como 5-agosto (regresión del bug original)');
}

// --- Test 2: Transformación de numeroCupon ---
// buildNumeroCuponVLE("F008-00090390") -> char4 ('8') + substring(5) ('00090390') -> '800090390'
console.log('\nTest 2: Transformación de numeroCupon (buildNumeroCuponVLE)');
{
  capturedTramaRows = null;
  const nroComprobante = 'F008-00090390';
  const cuponEsperado = ProcessorBase.buildNumeroCuponVLE(nroComprobante);
  assert(cuponEsperado === '800090390',
    `sanity: buildNumeroCuponVLE("F008-00090390") === "800090390" (got "${cuponEsperado}")`);

  const convertResult = buildConvertResult({
    nroComprobante: nroComprobante,
    fechaDate: new Date(2026, 0, 15),
    fechaDisplay: '15/1/2026'
  });

  CrecerVLEProcessorV2.processOptimized(convertResult, makeSpreadsheetMock(), makeDataContext());

  assert(capturedTramaRows && capturedTramaRows.length === 1,
    'tramaRows con 1 fila');
  assert(capturedTramaRows[0][0] === cuponEsperado,
    `NUMERO_CUPON = "${cuponEsperado}" (got "${capturedTramaRows[0][0]}")`);
}

// --- Test 3: FACTURA = nroComprobante original ---
console.log('\nTest 3: FACTURA = nroComprobante original (sin transformar)');
{
  capturedTramaRows = null;
  const nroComprobante = 'F008-00090390';
  const convertResult = buildConvertResult({
    nroComprobante: nroComprobante,
    fechaDate: new Date(2026, 5, 1),
    fechaDisplay: '1/6/2026'
  });

  CrecerVLEProcessorV2.processOptimized(convertResult, makeSpreadsheetMock(), makeDataContext());

  assert(capturedTramaRows && capturedTramaRows.length === 1,
    'tramaRows con 1 fila');

  // Estructura esperada: [numeroCupon, Date, nroComprobante, '']
  assert(capturedTramaRows[0].length === 4,
    `cada fila tiene 4 columnas (got ${capturedTramaRows[0].length})`);
  assert(capturedTramaRows[0][2] === nroComprobante,
    `FACTURA (col 3) = "${nroComprobante}" (got "${capturedTramaRows[0][2]}")`);
  assert(capturedTramaRows[0][3] === '',
    `STATUS (col 4) inicial = "" (got "${capturedTramaRows[0][3]}")`);
  assert(capturedTramaRows[0][0] !== nroComprobante,
    'NUMERO_CUPON (col 1) NO es igual al nroComprobante (fue transformado)');
}

// --- Test 4: Fallback de compatibilidad (values ausente) ---
// Si convertResult.values no viene, el processor cae a srcValues = srcData. No debe
// crashear, debe ejecutar el flujo y producir tramaRows. La fecha en este caso
// vendrá del string display (parseToDate como dd/mm/yyyy).
console.log('\nTest 4: Fallback de compatibilidad cuando values está ausente');
{
  capturedTramaRows = null;
  const convertResult = buildConvertResult({
    nroComprobante: 'F008-00090390',
    fechaDate: null,
    fechaDisplay: '8/5/2026', // dd/mm/yyyy -> 8 mayo
    includeValues: false      // omitimos values intencionalmente
  });

  let crasheo = false;
  try {
    CrecerVLEProcessorV2.processOptimized(convertResult, makeSpreadsheetMock(), makeDataContext());
  } catch (e) {
    crasheo = true;
    console.log(`     (error inesperado: ${e && e.message})`);
  }

  assert(!crasheo, 'no crashea cuando convertResult.values está ausente');
  assert(capturedTramaRows && capturedTramaRows.length === 1,
    'tramaRows con 1 fila usando fallback a srcData');
  assert(capturedTramaRows[0][1] instanceof Date,
    'fechaPago sigue siendo Date (parseToDate sobre string display)');
}

// ==================== RESULTADO ====================

console.log('\n' + '='.repeat(60));
if (failed === 0) {
  console.log(`OK  ${passed}/${passed + failed} tests pasaron`);
} else {
  console.log(`FAIL  ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('\nTests fallidos:');
  errors.forEach(e => console.log(`  - ${e}`));
}
console.log('='.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
