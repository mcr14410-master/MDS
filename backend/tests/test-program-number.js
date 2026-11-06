/**
 * Tests für programNumber (Programmnummern nach Schema, reine Funktionen)
 * Ausführen: node backend/tests/test-program-number.js
 * DB-Teil (Zähler, Varianten, Sperre): tests/integration/test-programmnummern.js
 */
const assert = require('node:assert/strict');
const {
  formatProgramNumber, parseSchemaSeq, normalizeProgramNumber, checkLength, pickVariantNumber,
} = require('../src/utils/programNumber');

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

test('Format NC und Messprogramm', () => {
  assert.equal(formatProgramNumber('KD00000-00004', 'nc', 1), 'KD00000-00004-1');
  assert.equal(formatProgramNumber('KD00000-00004', 'cmm', 1), 'KD00000-00004-M1');
  assert.equal(formatProgramNumber(' KD00000-00004 ', 'nc', 12), 'KD00000-00004-12');
});

test('n aus einer Nummer im Schema lesen', () => {
  assert.equal(parseSchemaSeq('KD00000-00004-7', 'KD00000-00004', 'nc'), 7);
  assert.equal(parseSchemaSeq('KD00000-00004-M3', 'KD00000-00004', 'cmm'), 3);
  assert.equal(parseSchemaSeq('kd00000-00004-m3', 'KD00000-00004', 'cmm'), 3);
});

test('NC und Messen werden nicht verwechselt', () => {
  assert.equal(parseSchemaSeq('KD00000-00004-M3', 'KD00000-00004', 'nc'), null);
  assert.equal(parseSchemaSeq('KD00000-00004-3', 'KD00000-00004', 'cmm'), null);
});

test('Fremde Nummern zählen nicht', () => {
  for (const nr of ['CNC-M-001', 'KD00000-00005-1', 'KD00000-00004-1A', 'KD00000-00004-0', 'KD00000-00004-', 'KD00000-00004-01']) {
    assert.equal(parseSchemaSeq(nr, 'KD00000-00004', 'nc'), null, nr);
  }
  assert.equal(parseSchemaSeq('KD00000-00004-M1_KAL', 'KD00000-00004', 'cmm'), null);
  assert.equal(parseSchemaSeq('', 'KD00000-00004', 'nc'), null);
  assert.equal(parseSchemaSeq('KD00000-00004-1', null, 'nc'), null);
});

test('Vergleichsform: getrimmt, Großbuchstaben', () => {
  assert.equal(normalizeProgramNumber(' kd00000-00004-m1 '), 'KD00000-00004-M1');
  assert.equal(normalizeProgramNumber(null), '');
});

test('Länge: Hinweis ab 24 Zeichen (nur NC), Fehler über 50', () => {
  assert.deepEqual(checkLength('KD00000-00004-1', 'nc'), { error: null, hints: [] });
  assert.equal(checkLength('A'.repeat(25), 'nc').hints.length, 1);
  assert.equal(checkLength('A'.repeat(25), 'cmm').hints.length, 0);
  assert.equal(checkLength('A'.repeat(50), 'nc').error, null);
  assert.match(checkLength('A'.repeat(51), 'nc').error, /51 Zeichen/);
});

test('Variante: kleinste Nummer der Gruppe, die im eigenen Arbeitsgang fehlt', () => {
  const group = ['KD00000-00004-3', 'KD00000-00004-1', 'KD00000-00004-2'];
  assert.equal(pickVariantNumber(group, [], 'KD00000-00004', 'nc'), 'KD00000-00004-1');
  assert.equal(pickVariantNumber(group, ['KD00000-00004-1'], 'KD00000-00004', 'nc'), 'KD00000-00004-2');
  assert.equal(pickVariantNumber(group, ['kd00000-00004-1', 'KD00000-00004-2'], 'KD00000-00004', 'nc'), 'KD00000-00004-3');
});

test('Variante: alle vorhanden → keine (neue Nummer vom Zähler)', () => {
  assert.equal(pickVariantNumber(['KD00000-00004-1'], ['KD00000-00004-1'], 'KD00000-00004', 'nc'), null);
  assert.equal(pickVariantNumber([], [], 'KD00000-00004', 'nc'), null);
});

test('Variante: Nummern im Schema nach n (10 nach 9), andere danach', () => {
  const group = ['ALT-001', 'KD00000-00004-10', 'KD00000-00004-9'];
  assert.equal(pickVariantNumber(group, [], 'KD00000-00004', 'nc'), 'KD00000-00004-9');
  assert.equal(pickVariantNumber(group, ['KD00000-00004-9', 'KD00000-00004-10'], 'KD00000-00004', 'nc'), 'ALT-001');
});

console.log(`\n${passed} Tests bestanden`);
