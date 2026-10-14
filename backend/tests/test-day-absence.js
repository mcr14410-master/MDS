/**
 * Tests für calculateDayAbsence (Soll/Gutschrift/Status bei Feiertag und Abwesenheit)
 * Ausführen: node backend/tests/test-day-absence.js
 */
const assert = require('node:assert/strict');
const { calculateDayAbsence, HALF_HOLIDAY_IS_WORKDAY } = require('../src/utils/dayAbsence');

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

const FULL = { id: 1, is_half_day: false };
const HALF = { id: 2, is_half_day: true };
const URLAUB = { id: 7, type: 'Urlaub', credits_target_hours: true };
const UNBEZAHLT = { id: 8, type: 'Unbezahlt', credits_target_hours: false };
const saldo = (r, gestempelt = 0) => r.credit + gestempelt - r.target;
const calc = (p) => calculateDayAbsence({ baseTarget: 510, holiday: null, vacation: null, holidayCredit: true, ...p });

console.log('Normaler Tag und Abwesenheit');
test('Arbeitstag ohne Abwesenheit: volles Soll, keine Gutschrift, kein Status', () => {
  assert.deepEqual(calc({}), { target: 510, credit: 0, status: null, holidayId: null, vacationId: null });
});
test('Urlaub mit Gutschrift → ±0', () => {
  const r = calc({ vacation: URLAUB });
  assert.equal(saldo(r), 0);
  assert.equal(r.status, 'Urlaub');
  assert.equal(r.vacationId, 7);
});
test('Abwesenheit ohne Gutschrift (unbezahlt) → −Soll', () => {
  assert.equal(saldo(calc({ vacation: UNBEZAHLT })), -510);
});

console.log('Ganzer Feiertag');
test('ohne Stempel → ±0, Status Feiertag', () => {
  const r = calc({ holiday: FULL });
  assert.equal(saldo(r), 0);
  assert.equal(r.status, 'holiday');
  assert.equal(r.holidayId, 1);
});
test('gestempelte Zeit kommt obendrauf (4 h am Feiertag → +4 h)', () => {
  assert.equal(saldo(calc({ holiday: FULL }), 240), 240);
});
test('Urlaub über einem Feiertag: keine Doppel-Gutschrift, Status Feiertag', () => {
  const r = calc({ holiday: FULL, vacation: URLAUB });
  assert.equal(saldo(r), 0);
  assert.equal(r.credit, 510);
  assert.equal(r.status, 'holiday');
});
test('unbezahlt über einem Feiertag → ±0 (Feiertag bleibt Feiertag)', () => {
  assert.equal(saldo(calc({ holiday: FULL, vacation: UNBEZAHLT })), 0);
});
test('Einstellung „gutschreiben“ aus → Soll 0, Saldo gleich', () => {
  const r = calc({ holiday: FULL, holidayCredit: false });
  assert.equal(r.target, 0);
  assert.equal(r.credit, 0);
  assert.equal(saldo(r), 0);
});

console.log(`Halber Feiertag (HALF_HOLIDAY_IS_WORKDAY = ${HALF_HOLIDAY_IS_WORKDAY})`);
if (!HALF_HOLIDAY_IS_WORKDAY) {
  test('wie bisher im Nacht-Job: halbes Soll, halbe Gutschrift → ohne Stempel ±0', () => {
    const r = calc({ holiday: HALF });
    assert.equal(r.target, 255);
    assert.equal(r.credit, 255);
    assert.equal(saldo(r), 0);
  });
  test('4:15 gestempelt → +4:15', () => {
    assert.equal(saldo(calc({ holiday: HALF }), 255), 255);
  });
} else {
  test('halber Arbeitstag: ohne Stempel −halbes Soll', () => {
    assert.equal(saldo(calc({ holiday: HALF })), -255);
  });
  test('halber Arbeitstag: 4:15 gestempelt → ±0', () => {
    assert.equal(saldo(calc({ holiday: HALF }), 255), 0);
  });
}
test('Urlaub am halben Feiertag → ±0, Status Urlaub', () => {
  const r = calc({ holiday: HALF, vacation: URLAUB });
  assert.equal(saldo(r), 0);
  assert.equal(r.status, 'Urlaub');
  assert.equal(r.holidayId, 2);
});
test('Einstellung „gutschreiben“ aus, halber Feiertag → Saldo wie mit Gutschrift', () => {
  assert.equal(saldo(calc({ holiday: HALF, holidayCredit: false })), saldo(calc({ holiday: HALF })));
});

console.log(`\n${passed} Tests bestanden`);
