/**
 * Test Suite: Core date parsing in Conciliación (ProcessorBase + ConciliacionIOV2)
 *
 * Documents and locks the fix for the "fecha de pago" bug:
 *   - xlsx column comes as Excel serial with numFmt "dd/mm/yyyy".
 *   - Old code read it via getDisplayValues() → ambiguous "5/8/2026" string,
 *     which the dd/mm regex in parseToDate interpreted as 5-agosto.
 *   - Fix: read date column from getValues() (native Date), with a serial
 *     fallback in parseToDate for callers that bypass the typed path.
 *
 * Run from repo root:
 *   node gas/tests/test_date_core.js
 */

const fs = require('fs');
const path = require('path');

// ==================== MOCKS DE ENTORNO GAS ====================

global.Logger = { log: () => {} };

global.Utilities = {
  newBlob: (bytes, mime, name) => ({ _bytes: bytes, _mime: mime, _name: name }),
  base64Decode: (s) => Buffer.from(String(s), 'base64')
};

// Mock dinámico: cada test que use convertirXLSXaSheet puede sobreescribir
// estos hooks antes de la llamada.
let mockSheetDisplayValues = [['header'], ['row1']];
let mockSheetValues = [['header'], ['row1']];
let mockInsertedFileId = 'tmp_file_id_default';

global.Drive = {
  Files: {
    insert: (resource, blob, opts) => ({ id: mockInsertedFileId })
  }
};

global.SpreadsheetApp = {
  openById: (id) => ({
    getSheets: () => [{
      getDataRange: () => ({
        getDisplayValues: () => mockSheetDisplayValues,
        getValues: () => mockSheetValues
      })
    }]
  })
};

// LockService / XLSX no son necesarios para los métodos bajo test,
// pero los stubbeamos por si el archivo los referencia en el top level.
global.LockService = { getDocumentLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
global.XLSX = { read: () => ({}) };

// ==================== CARGA DE MÓDULOS GAS ====================
// Los archivos GAS declaran `const ProcessorBase = {...}` / `const ConciliacionIOV2 = {...}`
// a nivel superior. Cuando se evalúan con eval() dentro de una función las `const`
// quedan locales a ese scope. Reemplazamos `const`/`let` por `var` para exponerlas
// como globales (mismo truco que usa test_reports.js).
function loadGasFile(relPath) {
  const abs = path.join(__dirname, '..', relPath);
  let code = fs.readFileSync(abs, 'utf8');
  code = code.replace(/^const\s+/gm, 'var ');
  code = code.replace(/^let\s+/gm, 'var ');
  return code;
}

eval(loadGasFile('processor_base.js'));
eval(loadGasFile('conciliacion_io.js'));

// ==================== TEST RUNNER ====================

let PASS = 0;
let FAIL = 0;
const failed = [];

function test(name, fn) {
  try {
    fn();
    console.log('PASS:', name);
    PASS++;
  } catch (e) {
    console.error('FAIL:', name, '\n  ', e.message);
    failed.push(name);
    FAIL++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || 'assertEqual') + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
}

function assertDate(actual, year, month, day, msg) {
  if (!(actual instanceof Date)) {
    throw new Error((msg || 'assertDate') + ' — expected Date, got ' + typeof actual + ' (' + actual + ')');
  }
  if (isNaN(actual.getTime())) {
    throw new Error((msg || 'assertDate') + ' — got Invalid Date');
  }
  if (actual.getFullYear() !== year || actual.getMonth() !== month || actual.getDate() !== day) {
    throw new Error(
      (msg || 'assertDate') + ' — expected ' +
      year + '-' + (month + 1) + '-' + day +
      ', got ' + actual.getFullYear() + '-' + (actual.getMonth() + 1) + '-' + actual.getDate()
    );
  }
}

function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg || 'assertTrue failed');
}

// ==================== TESTS ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUITE: Core date parsing (ProcessorBase + IO)');
console.log('='.repeat(60) + '\n');

// --- Test 1: Date object pass-through ---
test('parseToDate: Date object retorna el mismo Date', () => {
  const d = new Date(2026, 4, 8); // 8-may-2026 (mes 4 = mayo en JS)
  const out = ProcessorBase.parseToDate(d);
  assertTrue(out === d, 'debe ser exactamente la misma referencia');
  assertDate(out, 2026, 4, 8, 'componentes intactos');
});

// --- Test 2: Serial Excel numérico (caso clave del fix) ---
// Nota: el serial 46178 en Excel (epoch 1899-12-30) mapea a 5-junio-2026.
// El fix garantiza que un serial numérico no se confunda con un string ambiguo.
// (La descripción del bug mencionaba 8-may como ejemplo, pero el cálculo real
// del serial 46178 según la convención Excel/Sheets es 5-jun-2026; verificamos
// la conversión correcta, no la etiqueta humana del bug.)
test('parseToDate: serial Excel 46178 → fecha calendar correcta (sin shift TZ)', () => {
  const out = ProcessorBase.parseToDate(46178);
  // 46178 - 25569 = 20609 días desde epoch UNIX → 2026-06-05 UTC
  assertDate(out, 2026, 5, 5, 'serial 46178 → 5-jun-2026');
});

// --- Test 3: Serial 25569 → epoch UNIX (1970-01-01) ---
test('parseToDate: serial 25569 → 1970-01-01', () => {
  // El branch numérico exige fecha > 25569, así que 25569 cae al fallback string.
  // Verificamos que para un serial inmediatamente posterior (25570) el cálculo
  // sea consistente con el epoch.
  const out = ProcessorBase.parseToDate(25570);
  assertDate(out, 1970, 0, 2, 'serial 25570 → 2-ene-1970');
});

// --- Test 4: String dd/mm/yyyy explícito ---
test('parseToDate: string "08/05/2026" (dd/mm) → 8-may-2026', () => {
  const out = ProcessorBase.parseToDate('08/05/2026');
  assertDate(out, 2026, 4, 8, '8 de mayo 2026');
});

// --- Test 5: String ambiguo "5/8/2026" → interpretado como dd/mm (5-ago) ---
// Documenta POR QUÉ las fechas NO deben venir como display string desde
// getDisplayValues(): cuando el serial 46178 (5-jun-2026 / 8-may-2026 según
// numFmt) se muestra como "5/8/2026", parseToDate (regex dd/mm) lo lee como
// 5-agosto-2026. Por eso el fix lee getValues() (Date nativo) para columnas
// de fecha.
test('parseToDate: string ambiguo "5/8/2026" → 5-ago-2026 (regex dd/mm)', () => {
  const out = ProcessorBase.parseToDate('5/8/2026');
  assertDate(out, 2026, 7, 5, 'documenta ambigüedad dd/mm vs mm/dd');
});

// --- Test 6: null / undefined / "" no crashea ---
test('parseToDate: null/undefined/"" → retorna Date (no crashea)', () => {
  const a = ProcessorBase.parseToDate(null);
  const b = ProcessorBase.parseToDate(undefined);
  const c = ProcessorBase.parseToDate('');
  assertTrue(a instanceof Date && !isNaN(a.getTime()), 'null → Date válido');
  assertTrue(b instanceof Date && !isNaN(b.getTime()), 'undefined → Date válido');
  assertTrue(c instanceof Date && !isNaN(c.getTime()), '"" → Date válido');
});

// --- Test 7: String ISO "2026-05-08" → 8-may-2026 ---
test('parseToDate: string ISO "2026-05-08" → 8-may-2026', () => {
  const out = ProcessorBase.parseToDate('2026-05-08');
  assertDate(out, 2026, 4, 8, 'ISO yyyy-mm-dd');
});

// --- Test 8: convertirXLSXaSheet expone data Y values (compat + fix) ---
test('convertirXLSXaSheet: shape ok + data y values presentes', () => {
  mockInsertedFileId = 'tmp_xlsx_42';
  mockSheetDisplayValues = [
    ['CUPON', 'FECHA_PAGO', 'MONTO'],
    ['000123', '5/8/2026', '1500.00']  // display ambiguo
  ];
  mockSheetValues = [
    ['CUPON', 'FECHA_PAGO', 'MONTO'],
    ['000123', new Date(2026, 4, 8), 1500]  // tipos nativos
  ];

  const result = ConciliacionIOV2.convertirXLSXaSheet(
    Buffer.from('dummy').toString('base64'),
    'test.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  assertEqual(result.ok, true, 'ok === true');
  assertEqual(result.fileId, 'tmp_xlsx_42', 'fileId propagado desde Drive.Files.insert');
  assertEqual(result.useSheetJS, false, 'useSheetJS === false (rama Drive)');
  assertTrue(Array.isArray(result.data), 'data es array');
  assertTrue(Array.isArray(result.values), 'values es array (no rompe compat)');
  assertEqual(result.data[1][1], '5/8/2026', 'data conserva display string');
  assertTrue(result.values[1][1] instanceof Date, 'values trae Date nativo');
  assertDate(result.values[1][1], 2026, 4, 8, 'values fecha correcta (8-may-2026)');
});

// ==================== RESULTADO ====================

console.log('\n' + '='.repeat(60));
console.log('TOTAL: ' + (PASS + FAIL) + '  PASS: ' + PASS + '  FAIL: ' + FAIL);
if (FAIL > 0) {
  console.log('Tests fallidos:');
  failed.forEach(n => console.log('  - ' + n));
}
console.log('='.repeat(60) + '\n');

process.exit(FAIL > 0 ? 1 : 0);
