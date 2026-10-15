/**
 * Tests für pickEntryForDate (welcher Zeitmodell-Eintrag gilt an einem Tag)
 * Ausführen: node backend/tests/test-time-model-history.js
 */
const assert = require('node:assert/strict');
const { pickEntryForDate } = require('../src/utils/timeModelHistory');

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

// bewusst unsortiert
const verlauf = [
  { time_model_id: 2, valid_from: '2026-11-01' },
  { time_model_id: 1, valid_from: '2026-09-01' },
  { time_model_id: 3, valid_from: '2027-01-01' },
];
const modell = (d) => pickEntryForDate(verlauf, d)?.time_model_id ?? null;

console.log('pickEntryForDate');
test('vor dem ersten Eintrag → kein Modell', () => assert.equal(modell('2026-08-31'), null));
test('am Tag des ersten Eintrags → erstes Modell', () => assert.equal(modell('2026-09-01'), 1));
test('Tag vor dem Wechsel → altes Modell', () => assert.equal(modell('2026-10-31'), 1));
test('Tag des Wechsels → neues Modell', () => assert.equal(modell('2026-11-01'), 2));
test('nach dem letzten Eintrag → letztes Modell', () => assert.equal(modell('2027-06-15'), 3));
test('leerer Verlauf → kein Modell', () => assert.equal(pickEntryForDate([], '2026-10-15'), null));
test('Datum als Date-Objekt im Verlauf (Ortszeit Europe/Berlin)', () => {
  const v = [{ time_model_id: 5, valid_from: new Date('2026-09-01T00:00:00+02:00') }];
  assert.equal(pickEntryForDate(v, '2026-09-01')?.time_model_id, 5);
  assert.equal(pickEntryForDate(v, '2026-08-31'), null);
});

console.log(`\n${passed} Tests bestanden`);
