/**
 * Tests für programNumber (Programmnummer vorschlagen)
 * Ausführen: node backend/tests/test-program-number.js
 */
const assert = require('node:assert/strict');
const { nextProgramNumber } = require('../src/utils/programNumber');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('Erstes Programm am Arbeitsgang', () => {
  assert.equal(nextProgramNumber('OP10', []), 'OP10-001');
});

test('Höchste Nummer + 1, auch mit Lücke nach dem Löschen', () => {
  // OP10-002 gelöscht: Anzahl + 1 ergäbe 003 doppelt
  assert.equal(nextProgramNumber('OP10', ['OP10-001', 'OP10-003']), 'OP10-004');
});

test('Fremde und manuell vergebene Nummern zählen nicht', () => {
  assert.equal(nextProgramNumber('OP10', ['O1234', 'OP100-007', 'OP10-A1', 'OP10-002']), 'OP10-003');
});

test('OP-Code mit Bindestrich (aus dem Operationstyp, z. B. CNC-F)', () => {
  assert.equal(nextProgramNumber('CNC-F', ['CNC-F-001', 'CNC-F-009']), 'CNC-F-010');
});

test('Mehr als 999 Programme laufen weiter', () => {
  assert.equal(nextProgramNumber('OP10', ['OP10-999']), 'OP10-1000');
});

console.log(`\n${passed} Tests bestanden`);
