/**
 * Tests für deploymentChecks (Bereitstellungen: Programmauswahl, Vorlagen- und Ordnerkonflikte)
 * Ausführen: node backend/tests/test-deployment-checks.js
 */
const assert = require('node:assert/strict');
const {
  selectPrograms, templateConflicts, localDirConflicts, newerRelease,
} = require('../src/services/deploymentChecks');

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

const PROGRAMS = [
  { id: 1, program_number: 'M1', released_revision_id: 11, workflow_state: 'released' },
  { id: 2, program_number: 'M2', released_revision_id: 21, workflow_state: 'draft' },   // neue Version in Arbeit
  { id: 3, program_number: 'M3', released_revision_id: null, workflow_state: 'draft' }, // nie freigegeben
  { id: 4, program_number: 'M4', released_revision_id: 41, workflow_state: 'archived' },
];

test('Ohne Auswahl: alle freigegebenen, auch mit neuer Version in Arbeit; Rest mit Grund', () => {
  const r = selectPrograms(PROGRAMS, undefined);
  assert.deepEqual(r.selected.map(p => p.id), [1, 2]);
  assert.deepEqual(r.skipped.map(s => [s.program_number, s.reason]),
    [['M3', 'nicht freigegeben, nicht bereitgestellt'], ['M4', 'archiviert, nicht bereitgestellt']]);
  assert.deepEqual(r.errors, []);
});

test('Mit Auswahl: nur diese, IDs als Text erlaubt, Doppelte einmal', () => {
  const r = selectPrograms(PROGRAMS, ['2', 2]);
  assert.deepEqual(r.selected.map(p => p.id), [2]);
  assert.deepEqual(r.errors, []);
});

test('Mit Auswahl: fremdes, nicht freigegebenes oder archiviertes Programm → Fehler', () => {
  const r = selectPrograms(PROGRAMS, [1, 3, 4, 99]);
  assert.equal(r.errors.length, 3);
  assert.match(r.errors[0], /M3: nicht freigegeben/);
  assert.match(r.errors[1], /M4: archiviert/);
  assert.match(r.errors[2], /99 gehört nicht/);
});

test('Nichts bereitstellbar → Fehler', () => {
  assert.match(selectPrograms([], undefined).errors[0], /keine Messprogramme/);
  assert.match(selectPrograms([PROGRAMS[2]], undefined).errors[0], /Kein freigegebenes/);
  assert.match(selectPrograms(PROGRAMS, []).errors[0], /Kein freigegebenes/);
});

test('Vorlage: doppelt in der Bereitstellung oder schon auf dem Gerät (ohne Groß-/Kleinschreibung)', () => {
  assert.deepEqual(templateConflicts([{ program_number: 'M1', filename: 'A.xlsx' }], []), []);
  const dup = templateConflicts([{ program_number: 'M1', filename: 'A.xlsx' }, { program_number: 'M2', filename: 'a.XLSX' }], []);
  assert.equal(dup.length, 1);
  assert.match(dup[0], /gehört zu M1 und M2/);
  const onDevice = templateConflicts([{ program_number: 'M1', filename: 'A.xlsx' }],
    [{ program_number: 'M9', part_number: 'TEIL-0002', op_number: 'OP30', filename: 'A.XLSX' }]);
  assert.match(onDevice[0], /schon bereitgestellt \(M9, TEIL-0002 OP30\)/);
});

test('Ordner: doppelt oder auf dem Gerät belegt', () => {
  assert.deepEqual(localDirConflicts([{ program_number: 'M1', local_dir: 'T\\M1' }], []), []);
  assert.equal(localDirConflicts([{ local_dir: 'T\\M1' }, { local_dir: 't\\m1' }], []).length, 1);
  assert.match(localDirConflicts([{ local_dir: 'T\\M1' }], [{ program_number: 'M1', part_number: 'T', op_number: 'OP10', local_dir: 'T\\M1' }])[0],
    /schon belegt/);
});

test('Neuere Freigabe nur, wenn sie von der festgehaltenen Version abweicht', () => {
  assert.equal(newerRelease(11, 11, '1.0.0'), null);
  assert.equal(newerRelease(11, null, null), null);
  assert.equal(newerRelease(11, 12, '1.1.0'), '1.1.0');
});

console.log(`\n${passed} Tests bestanden`);
