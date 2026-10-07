/**
 * Tests für countWorkingDays (Urlaubstage nach Zeitmodell)
 * Ausführen: node backend/tests/test-working-days.js
 */
const assert = require('node:assert/strict');
const { countWorkingDays } = require('../src/utils/workingDays');

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

const VOLLZEIT = {
  monday_minutes: 510, tuesday_minutes: 510, wednesday_minutes: 510,
  thursday_minutes: 510, friday_minutes: 360,
  saturday_minutes: null, sunday_minutes: null
};
const VIER_TAGE_FR_FREI = { ...VOLLZEIT, friday_minutes: 0 };
const VIER_TAGE_MO_FREI_NULL = { ...VOLLZEIT, monday_minutes: null };
const MIT_SAMSTAG = { ...VOLLZEIT, saturday_minutes: 240 };
const KEINE_FEIERTAGE = new Set();

// KW 41/2026: Mo 05.10. – So 11.10.
const MO = '2026-10-05';
const FR = '2026-10-09';
const SO = '2026-10-11';

console.log('countWorkingDays');

test('ohne Zeitmodell: Mo–Fr zählen (bisheriges Verhalten)', () => {
  assert.equal(countWorkingDays(MO, SO, null, KEINE_FEIERTAGE), 5);
});

test('Vollzeit-Modell: ganze Woche = 5 Tage', () => {
  assert.equal(countWorkingDays(MO, SO, VOLLZEIT, KEINE_FEIERTAGE), 5);
});

test('4-Tage-Woche (Fr = 0): ganze Woche = 4 Tage', () => {
  assert.equal(countWorkingDays(MO, SO, VIER_TAGE_FR_FREI, KEINE_FEIERTAGE), 4);
});

test('4-Tage-Woche (Fr = 0): nur der freie Freitag = 0 Tage', () => {
  assert.equal(countWorkingDays(FR, FR, VIER_TAGE_FR_FREI, KEINE_FEIERTAGE), 0);
});

test('Soll-Zeit leer (null) gilt ebenfalls als frei', () => {
  assert.equal(countWorkingDays(MO, SO, VIER_TAGE_MO_FREI_NULL, KEINE_FEIERTAGE), 4);
});

test('Samstag mit Soll-Zeit zählt als Arbeitstag', () => {
  assert.equal(countWorkingDays(MO, SO, MIT_SAMSTAG, KEINE_FEIERTAGE), 6);
});

test('Feiertag an einem Arbeitstag wird nicht abgezogen', () => {
  assert.equal(countWorkingDays(MO, SO, VOLLZEIT, new Set(['2026-10-07'])), 4);
});

test('Feiertag am freien Tag ändert nichts', () => {
  assert.equal(countWorkingDays(MO, SO, VIER_TAGE_FR_FREI, new Set(['2026-10-09'])), 4);
});

test('Zeitraum über zwei Wochen (4-Tage-Woche) = 8 Tage', () => {
  assert.equal(countWorkingDays('2026-10-05', '2026-10-18', VIER_TAGE_FR_FREI, KEINE_FEIERTAGE), 8);
});

test('über Monats- und DST-Grenze (Ende Okt. 2026) korrekt', () => {
  // Mo 26.10. – So 01.11.2026, Zeitumstellung am 25.10.
  assert.equal(countWorkingDays('2026-10-26', '2026-11-01', VIER_TAGE_FR_FREI, KEINE_FEIERTAGE), 4);
});

test('Datum mit Zeitanteil wird auf den Tag gekürzt', () => {
  assert.equal(countWorkingDays('2026-10-05T00:00:00.000Z', '2026-10-09T00:00:00.000Z', VIER_TAGE_FR_FREI, KEINE_FEIERTAGE), 4);
});

test('Ende vor Start = 0 Tage', () => {
  assert.equal(countWorkingDays(FR, MO, VOLLZEIT, KEINE_FEIERTAGE), 0);
});

console.log(`\n${passed} Tests bestanden`);
