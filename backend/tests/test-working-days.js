/**
 * Tests für countWorkingDays (Urlaubstage nach Zeitmodell)
 * Ausführen: node backend/tests/test-working-days.js
 */
const assert = require('node:assert/strict');
const { countWorkingDays, countWorkingDaysByYear } = require('../src/utils/workingDays');

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

console.log('\ncountWorkingDaysByYear');

// Bayern: 25./26.12., 01.01., 06.01.
const FEIERTAGE_JAHRESWECHSEL = new Set(['2026-12-25', '2026-12-26', '2027-01-01', '2027-01-06']);

test('Urlaub über den Jahreswechsel wird je Jahr aufgeteilt', () => {
  // Mo 21.12.2026 – Fr 08.01.2027: 8 Tage in 2026, 4 Tage in 2027
  assert.deepEqual(
    countWorkingDaysByYear('2026-12-21', '2027-01-08', null, FEIERTAGE_JAHRESWECHSEL),
    { 2026: 8, 2027: 4 }
  );
});

test('Summe je Jahr = Gesamtzahl', () => {
  const byYear = countWorkingDaysByYear('2026-12-21', '2027-01-08', VIER_TAGE_FR_FREI, FEIERTAGE_JAHRESWECHSEL);
  const total = Object.values(byYear).reduce((a, b) => a + b, 0);
  assert.equal(total, countWorkingDays('2026-12-21', '2027-01-08', VIER_TAGE_FR_FREI, FEIERTAGE_JAHRESWECHSEL));
});

test('Urlaub innerhalb eines Jahres = ein Eintrag', () => {
  assert.deepEqual(countWorkingDaysByYear(MO, SO, VOLLZEIT, KEINE_FEIERTAGE), { 2026: 5 });
});

test('berührtes Jahr ohne Arbeitstag bekommt 0', () => {
  // Mo 28.12.2026 – Fr 01.01.2027 (Neujahr Feiertag)
  assert.deepEqual(
    countWorkingDaysByYear('2026-12-28', '2027-01-01', null, FEIERTAGE_JAHRESWECHSEL),
    { 2026: 4, 2027: 0 }
  );
});

test('über mehrere Jahre', () => {
  const byYear = countWorkingDaysByYear('2026-12-31', '2028-01-03', null, KEINE_FEIERTAGE);
  assert.deepEqual(Object.keys(byYear), ['2026', '2027', '2028']);
  assert.equal(byYear[2026], 1);
  assert.equal(byYear[2028], 1); // Mo 03.01.2028
});

test('Date-Objekte werden als Berliner Kalendertag gelesen', () => {
  // 01.01.2027 00:00 Berlin = 31.12.2026 23:00 UTC
  const start = new Date('2026-12-31T23:00:00Z');
  assert.deepEqual(countWorkingDaysByYear(start, '2027-01-04', null, KEINE_FEIERTAGE), { 2027: 2 });
});

console.log('\nhalbe Feiertage');

const HALBE = new Set(['2026-12-24', '2026-12-31']);
const GANZE = new Set(['2026-12-25', '2026-12-26']);

test('Heiligabend (Do) als halber Feiertag = 0,5 Tage', () => {
  assert.equal(countWorkingDays('2026-12-24', '2026-12-24', null, GANZE, HALBE), 0.5);
});

test('Urlaub 21.–31.12.2026: 6 volle + 2 halbe Tage = 7', () => {
  // Mo–Mi 21.–23. (3), Do 24. halb, Fr 25. frei, Mo–Mi 28.–30. (3), Do 31. halb
  assert.equal(countWorkingDays('2026-12-21', '2026-12-31', null, GANZE, HALBE), 7);
});

test('halber Feiertag an freiem Tag laut Zeitmodell = 0', () => {
  // 2027: Fr 24.12. bei 4-Tage-Woche (Fr frei)
  assert.equal(countWorkingDays('2027-12-24', '2027-12-24', VIER_TAGE_FR_FREI, new Set(), new Set(['2027-12-24'])), 0);
});

test('ohne halbe Feiertage unverändert (Parameter optional)', () => {
  assert.equal(countWorkingDays('2026-12-21', '2026-12-31', null, GANZE), 8);
});

test('je Jahr: 28.12.2026–05.01.2027 mit Silvester halb', () => {
  assert.deepEqual(
    countWorkingDaysByYear('2026-12-28', '2027-01-05', null, new Set(['2027-01-01']), HALBE),
    { 2026: 3.5, 2027: 2 }
  );
});

console.log('\nZeitmodell-Verlauf (Modell je Tag)');
// Funktion (dateStr) => Modell | null statt eines Modells
const wechselAm19 = (dateStr) => (dateStr < '2026-10-19' ? VOLLZEIT : VIER_TAGE_FR_FREI);

test('Modell je Tag: 12.–23.10.2026, Wechsel am 19.10. auf 4-Tage-Woche = 5 + 4 Tage', () => {
  assert.equal(countWorkingDays('2026-10-12', '2026-10-23', wechselAm19, new Set()), 9);
});

test('Modell je Tag: vor dem ersten Eintrag (null) Mo–Fr', () => {
  const abDem19 = (dateStr) => (dateStr < '2026-10-19' ? null : VIER_TAGE_FR_FREI);
  assert.equal(countWorkingDays('2026-10-12', '2026-10-23', abDem19, new Set()), 9);
  assert.equal(countWorkingDays('2026-10-16', '2026-10-16', abDem19, new Set()), 1); // Fr vor dem Eintrag
  assert.equal(countWorkingDays('2026-10-23', '2026-10-23', abDem19, new Set()), 0); // Fr danach frei
});

test('Modell je Tag, je Jahr: Wechsel zum 01.01.2027 auf 4-Tage-Woche', () => {
  const ab2027 = (dateStr) => (dateStr < '2027-01-01' ? VOLLZEIT : VIER_TAGE_FR_FREI);
  // 2026: Mo 28.–Do 31.12. (4); 2027: Fr 01.01. frei laut Modell, Mo–Do 04.–07.01. (4), Fr 08.01. frei
  assert.deepEqual(countWorkingDaysByYear('2026-12-28', '2027-01-08', ab2027, new Set()), { 2026: 4, 2027: 4 });
});

console.log(`\n${passed} Tests bestanden`);
