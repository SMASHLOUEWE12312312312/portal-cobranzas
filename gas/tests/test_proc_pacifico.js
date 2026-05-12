/**
 * Test Suite: Pacífico processor — fix de fecha (regresión swap día↔mes)
 *
 * Ejecutar con: node gas/tests/test_proc_pacifico.js
 *
 * Cubre el bug donde proc_pacifico.js leía la fecha desde getDisplayValues()
 * (string locale-dependiente) y un valor como "5/8/2026" terminaba escrito como
 * 5-agosto en lugar de 8-mayo. El fix consiste en leer la columna fecha desde
 * srcValues = getValues() (Date nativo) y conservar getDisplayValues() solo
 * para columnas de texto (cupón, factura).
 */

const fs = require('fs');
const path = require('path');

// ==================== MOCK DEL ENTORNO GAS ====================

global.Logger = { log: () => {}, info: () => {}, warn: () => {}, error: () => {} };

// Mock mínimo de SpreadsheetApp: las hojas son objetos con stubs no-op.
function makeSheetMock(name) {
  const sheet = {
    _name: name,
    clear: () => sheet,
    clearContent: () => sheet,
    setFrozenRows: () => sheet,
    setNumberFormat: () => sheet,
    setNumberFormats: () => sheet,
    setValues: () => sheet,
    setFontWeight: () => sheet,
    setBackground: () => sheet,
    getLastRow: () => 0,
    getLastColumn: () => 0,
    getRange: () => ({
      setValues: () => ({}),
      setNumberFormat: () => ({}),
      setNumberFormats: () => ({}),
      setFontWeight: () => ({ setBackground: () => ({}) }),
      setBackground: () => ({}),
      clearContent: () => ({}),
      getValues: () => [],
      getDisplayValues: () => []
    })
  };
  return sheet;
}

function makeSpreadsheetMock() {
  const sheets = {};
  return {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => {
      sheets[n] = makeSheetMock(n);
      return sheets[n];
    }
  };
}

global.SpreadsheetApp = {
  openById: () => makeSpreadsheetMock()
};

// ==================== CARGAR MÓDULOS ====================

function loadGasFile(p) {
  let code = fs.readFileSync(p, 'utf8');
  // Convertir const/let de nivel superior a var para que sean globales bajo eval.
  code = code.replace(/^const\s+/gm, 'var ');
  code = code.replace(/^let\s+/gm, 'var ');
  return code;
}

eval(loadGasFile(path.join(__dirname, '..', 'processor_base.js')));
eval(loadGasFile(path.join(__dirname, '..', 'proc_pacifico.js')));

// ==================== STUBS DEPENDENCIAS ====================

// Capturamos lo que el processor escribe en la Trama interceptando
// ProcessorBase.writeTramaData.
let capturedTramaRows = null;
let capturedTramaFormat = null;
ProcessorBase.writeTramaData = function (ws, rows, fmt) {
  capturedTramaRows = rows;
  capturedTramaFormat = fmt;
};
// writeTramaHeaders / clearFromRow son no-ops sobre el sheet mock; los dejamos.
ProcessorBase.writeTramaHeaders = function () {};
ProcessorBase.clearFromRow = function () {};

// Stub del cruce / export: no nos interesa su comportamiento aquí.
global.ConciliacionCruceV2 = {
  ejecutarCruce: () => ({ _statusValues: [] }),
  limpiarStatusBDCruce: () => {}
};
global.ConciliacionExportV2 = {
  exportarResultados: () => ({ ok: true })
};

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

function resetCaptures() {
  capturedTramaRows = null;
  capturedTramaFormat = null;
}

// ==================== FIXTURES ====================

// Filas con 12 columnas (A..L). El cupón puede ir en col E (idx 4) o F (idx 5),
// la factura en col J (idx 9), y la fecha en col K (idx 10).
function buildConvertResult({ dateValueK, dateDisplayK, cuponE = '', cuponF = '', factura = 'FAC-001' }) {
  const header = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const dataRow = ['', '', '', '', cuponE, cuponF, '', '', '', factura, dateDisplayK, ''];
  const valuesRow = ['', '', '', '', cuponE, cuponF, '', '', '', factura, dateValueK, ''];
  return {
    data: [header, dataRow],
    values: [header, valuesRow]
  };
}

function makeDataContext(bdCupones) {
  return {
    bdCruceSheet: makeSheetMock('BD_Cruce'),
    // El primer elemento es ignorado como header dentro de processOptimized.
    bdCruceCupones: ['HEADER', ...bdCupones]
  };
}

// ==================== TESTS ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: proc_pacifico — fix swap día/mes en fecha');
console.log('='.repeat(60));

// --- Test 1: Regresión del bug 1233110429 / "5/8/2026" → debe ser 8-may, no 5-ago.
console.log('\nTest 1: Regresion bug original — "5/8/2026" debe interpretarse como 8-may-2026');
{
  resetCaptures();
  const cupon = '1233110429';
  // Date nativo en values: 8-may-2026 (mes 4).
  // Display string ambiguo locale-MM/dd que llevaba al bug.
  const convertResult = buildConvertResult({
    dateValueK: new Date(2026, 4, 8),
    dateDisplayK: '5/8/2026',
    cuponE: cupon
  });
  const dataContext = makeDataContext([cupon]);
  const ss = makeSpreadsheetMock();

  const result = PacificoProcessorV2.processOptimized(convertResult, ss, dataContext);

  assert(result.ok === true, 'processOptimized retorna ok=true');
  assert(Array.isArray(capturedTramaRows) && capturedTramaRows.length === 1, 'Se capturó una fila de trama');

  const tramaRow = capturedTramaRows[0];
  assert(tramaRow[0] === cupon, 'numeroCupon == cupón esperado');
  assert(tramaRow[4] === 'E', 'origen == "E" (matcheó por col E)');
  assert(tramaRow[1] instanceof Date, 'fecha en la trama es un Date');
  assert(tramaRow[1].getFullYear() === 2026, 'year == 2026');
  assert(tramaRow[1].getMonth() === 4, 'month == 4 (mayo), NO 7 (agosto)');
  assert(tramaRow[1].getDate() === 8, 'day == 8, NO 5');
}

// --- Test 2: Fecha inequívoca (día > 12).
console.log('\nTest 2: Fecha inequivoca 25/04/2026');
{
  resetCaptures();
  const cupon = '9876543210';
  const convertResult = buildConvertResult({
    dateValueK: new Date(2026, 3, 25),
    dateDisplayK: '25/04/2026',
    cuponE: cupon
  });
  const dataContext = makeDataContext([cupon]);
  const ss = makeSpreadsheetMock();

  PacificoProcessorV2.processOptimized(convertResult, ss, dataContext);

  const tramaRow = capturedTramaRows[0];
  assert(tramaRow[1] instanceof Date, 'fecha es Date');
  assert(tramaRow[1].getFullYear() === 2026, 'year == 2026');
  assert(tramaRow[1].getMonth() === 3, 'month == 3 (abril)');
  assert(tramaRow[1].getDate() === 25, 'day == 25');
}

// --- Test 3: Fallback de compatibilidad — sin convertResult.values.
console.log('\nTest 3: Fallback cuando convertResult.values es undefined');
{
  resetCaptures();
  const cupon = '5550001111';
  const convertResult = buildConvertResult({
    dateValueK: new Date(2026, 5, 10), // se ignorará — borramos values abajo
    dateDisplayK: '10/06/2026',
    cuponE: cupon
  });
  // Forzamos el escenario "caller legacy": no hay values; srcValues cae a data.
  delete convertResult.values;
  const dataContext = makeDataContext([cupon]);
  const ss = makeSpreadsheetMock();

  let threw = false;
  let result;
  try {
    result = PacificoProcessorV2.processOptimized(convertResult, ss, dataContext);
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'No crashea sin convertResult.values');
  assert(result && result.ok === true, 'Retorna ok=true');
  assert(capturedTramaRows && capturedTramaRows.length === 1, 'Procesa la fila igual');

  const tramaRow = capturedTramaRows[0];
  // Al caer a srcValues = data, parseToDate recibe el string "10/06/2026"
  // (dd/mm/yyyy bien parseable) y debería devolver junio 10.
  assert(tramaRow[1] instanceof Date, 'fecha es Date aún en fallback');
  assert(tramaRow[1].getFullYear() === 2026, 'year == 2026 en fallback');
  // No exigimos un mes específico para strings ambiguos, sólo que no rompa
  // y que devuelva una Date válida. Para "10/06/2026" el regex dd/mm/yyyy
  // del parseToDate sí da junio.
  assert(tramaRow[1].getMonth() === 5, 'month == 5 (junio) parseando string dd/mm/yyyy');
  assert(tramaRow[1].getDate() === 10, 'day == 10');
}

// --- Test 4: Lógica dual de cupón — cupón en col E con match en BD.
console.log('\nTest 4: Logica dual — cupon en col E matchea BD, fecha asociada correcta');
{
  resetCaptures();
  const cuponE = 'AAA111';
  const cuponF = 'BBB222'; // no debería usarse porque E ya matchea.
  const convertResult = buildConvertResult({
    dateValueK: new Date(2026, 1, 14), // 14-feb-2026
    dateDisplayK: '14/02/2026',
    cuponE,
    cuponF
  });
  const dataContext = makeDataContext([cuponE]); // sólo E está en BD.
  const ss = makeSpreadsheetMock();

  const result = PacificoProcessorV2.processOptimized(convertResult, ss, dataContext);

  assert(result.ok === true, 'processOptimized ok');
  assert(capturedTramaRows.length === 1, 'una fila en trama');
  const tramaRow = capturedTramaRows[0];
  assert(tramaRow[0] === cuponE, 'numeroCupon viene de col E');
  assert(tramaRow[4] === 'E', 'origen == "E"');
  assert(tramaRow[1] instanceof Date, 'fecha es Date');
  assert(tramaRow[1].getMonth() === 1 && tramaRow[1].getDate() === 14, 'fecha asociada == 14-feb-2026');
  assert(result.stats.usedColE === 1, 'stats.usedColE == 1');
  assert(result.stats.usedColF === 0, 'stats.usedColF == 0');
}

// --- Test 4b (bonus): cupón ausente en BD por col E → cae a col F.
console.log('\nTest 4b: Logica dual — cupon E no esta en BD, cae a col F');
{
  resetCaptures();
  const cuponE = 'AAA111';
  const cuponF = 'BBB222';
  const convertResult = buildConvertResult({
    dateValueK: new Date(2026, 6, 3),
    dateDisplayK: '03/07/2026',
    cuponE,
    cuponF
  });
  // BD no contiene ninguno de los dos: el algoritmo debe quedarse con F
  // (porque al no matchear E, prueba F sin más; ese es el comportamiento real).
  const dataContext = makeDataContext(['ZZZ999']);
  const ss = makeSpreadsheetMock();

  const result = PacificoProcessorV2.processOptimized(convertResult, ss, dataContext);

  assert(capturedTramaRows.length === 1, 'una fila en trama');
  const tramaRow = capturedTramaRows[0];
  assert(tramaRow[0] === cuponF, 'numeroCupon viene de col F');
  assert(tramaRow[4] === 'F', 'origen == "F"');
  assert(tramaRow[1] instanceof Date && tramaRow[1].getMonth() === 6 && tramaRow[1].getDate() === 3,
    'fecha asociada == 3-jul-2026');
  assert(result.stats.usedColF === 1, 'stats.usedColF == 1');
}

// ==================== RESULTADO ====================

console.log('\n' + '='.repeat(60));
if (failed === 0) {
  console.log(`TODOS LOS TESTS PASARON: ${passed}/${passed + failed}`);
} else {
  console.log(`RESULTADO: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log('\nTests fallidos:');
  errors.forEach((e) => console.log(`  - ${e}`));
}
console.log('='.repeat(60) + '\n');

process.exit(failed > 0 ? 1 : 0);
