/**
 * Integrations-Tests Zeiterfassung und Urlaub – ruft die echten Rechenwege auf
 * (Tagesberechnung, Nacht-Job, Urlaub anlegen inkl. Sync, Urlaubstage, Zeitnachweis-Stichtag).
 * Abgestimmte Regeln (Buchhaltung 15.10.2026): Feiertag ±0, halber Feiertag = halber Arbeitstag,
 * Krank nach Arbeitsbeginn = bis zum Soll auffüllen.
 *
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank), nie gegen Dev- oder Produktions-DB.
 * Zeitmodell aus der Migration: „Vollzeit 40h“ (id 1) – Mo–Do 8:30, Fr 6:00. Gerechnet wird mit dem
 * Zeitmodell-Verlauf (user_time_models) – createUser legt den ersten Eintrag ab Zeiterfassungs-Start an.
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const pool = require('../../src/config/db');
const { ensureHolidaysForYear } = require('../../src/controllers/holidaysController');
const vacationsController = require('../../src/controllers/vacationsController');
const { updateDailySummary, generateAbsenceEntries } = require('../../src/controllers/timeEntriesController');
const { getPayrollVacation } = require('../../src/controllers/timeBalancesController');
const terminalController = require('../../src/controllers/terminalController');
const { toDateStr } = require('../../src/utils/workingDays');

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ---------- Hilfen ----------

let adminId;
let userCount = 0;

// Mitarbeiter mit Zeiterfassung ab startDate und Zeitmodell-Verlauf ab demselben Tag
async function createUser(startDate, timeModelId = 1) {
  userCount++;
  const r = await pool.query(`
    INSERT INTO users (username, email, password_hash, first_name, last_name, is_active,
                       vacation_tracking_enabled, time_tracking_enabled, time_tracking_start_date)
    VALUES ($1, $2, 'x', 'Test', $3, true, true, true, $4) RETURNING id`,
    [`test_${userCount}`, `test_${userCount}@example.invalid`, `Nr. ${userCount}`, startDate]);
  const id = r.rows[0].id;
  await pool.query('INSERT INTO user_time_models (user_id, time_model_id, valid_from) VALUES ($1, $2, $3)',
    [id, timeModelId, startDate]);
  return id;
}

// Modellwechsel ab Datum
async function switchModel(userId, timeModelId, validFrom) {
  await pool.query('INSERT INTO user_time_models (user_id, time_model_id, valid_from) VALUES ($1, $2, $3)',
    [userId, timeModelId, validFrom]);
}

async function createModel(name, minutes) {
  const [mo, di, mi, don, fr, sa, so] = minutes;
  return (await pool.query(`
    INSERT INTO time_models (name, monday_minutes, tuesday_minutes, wednesday_minutes, thursday_minutes,
                             friday_minutes, saturday_minutes, sunday_minutes)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, [name, mo, di, mi, don, fr, sa, so])).rows[0].id;
}

const hasDay = async (userId, date) =>
  (await pool.query('SELECT 1 FROM time_daily_summary WHERE user_id = $1 AND date = $2', [userId, date])).rows.length > 0;

async function typeId(name) {
  return (await pool.query('SELECT id FROM vacation_types WHERE name = $1', [name])).rows[0].id;
}

// Urlaub/Krank über den echten Controller anlegen (genehmigt, inkl. Tageswerte-Sync)
async function addAbsence(userId, type, start, end = start) {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
  await vacationsController.createVacation(
    { body: { user_id: userId, type_id: await typeId(type), start_date: start, end_date: end }, user: { id: adminId } },
    res
  );
  assert.ok(res.statusCode < 300, `Urlaub anlegen: ${res.statusCode} ${JSON.stringify(res.body)}`);
  return res.body;
}

// Kommen/Gehen in Ortszeit (Europe/Berlin)
async function stamp(userId, date, from, to) {
  await pool.query(`
    INSERT INTO time_entries (user_id, entry_type, timestamp, source) VALUES
    ($1, 'clock_in',  ($2 || ' ' || $3)::timestamp AT TIME ZONE 'Europe/Berlin', 'test'),
    ($1, 'clock_out', ($2 || ' ' || $4)::timestamp AT TIME ZONE 'Europe/Berlin', 'test')`,
    [userId, date, from, to]);
}

// Tag neu berechnen – so wie bei Buchung, Korrektur oder Tagesinfo
const recalc = (userId, date) => updateDailySummary(userId, new Date(`${date}T12:00:00`));

// Nacht-Job über alle Tage seit Zeiterfassungs-Start
async function nightly(userId, since) {
  const days = Math.ceil((Date.now() - Date.parse(`${since}T00:00:00Z`)) / 86400000) + 1;
  await generateAbsenceEntries(userId, days);
}

async function day(userId, date) {
  const r = await pool.query(`
    SELECT status, target_minutes AS soll, worked_minutes AS ist, overtime_minutes AS saldo,
           has_missing_entries AS fehlt, holiday_id IS NOT NULL AS feiertag, vacation_id IS NOT NULL AS urlaub
    FROM time_daily_summary WHERE user_id = $1 AND date = $2`, [userId, date]);
  assert.ok(r.rows[0], `kein Tageswert für ${date}`);
  return r.rows[0];
}

const setRegion = (region) =>
  pool.query("UPDATE vacation_settings SET value = $1 WHERE key = 'default_region'", [region]);

// ---------- Tests ----------

(async () => {
  adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  for (const y of [2025, 2026, 2027]) await ensureHolidaysForYear(y, 'BY');
  const credit = (await pool.query("SELECT value FROM time_settings WHERE key = 'absence_credits_target'")).rows[0];
  assert.equal(credit?.value, 'true', 'Einstellung „Feiertage gutschreiben“ muss an sein (wie in der Produktion)');

  console.log('Urlaubstage');
  const u0 = await createUser('2025-01-01');
  await test('Urlaub über Ostern 2026 (30.03.–10.04.) = 8 Tage, Karfreitag und Ostermontag zählen nicht', async () => {
    assert.deepEqual(await vacationsController.calculateWorkingDaysByYear(u0, '2026-03-30', '2026-04-10'), { 2026: 8 });
  });
  await test('Urlaub über den Jahreswechsel 21.12.2026–08.01.2027 = 7 + 4 Tage (Heiligabend/Silvester je 0,5)', async () => {
    assert.deepEqual(await vacationsController.calculateWorkingDaysByYear(u0, '2026-12-21', '2027-01-08'), { 2026: 7, 2027: 4 });
  });
  await test('Heiligabend allein = 0,5 Urlaubstage', async () => {
    assert.deepEqual(await vacationsController.calculateWorkingDaysByYear(u0, '2025-12-24', '2025-12-24'), { 2025: 0.5 });
  });

  console.log('Feiertag');
  const u1 = await createUser('2026-03-30');
  await nightly(u1, '2026-03-30');
  await test('Nacht-Job: Karfreitag (Fr) Status Feiertag, ±0', async () => {
    const d = await day(u1, '2026-04-03');
    assert.equal(d.status, 'holiday');
    assert.equal(d.saldo, 0);
  });
  await test('Nacht-Job: normaler Tag ohne Stempel → fehlende Buchung, −Soll', async () => {
    const d = await day(u1, '2026-04-14');
    assert.equal(d.status, 'absent');
    assert.equal(d.fehlt, true);
    assert.equal(d.saldo, -510);
  });
  await test('Neuberechnung (z. B. Tagesinfo) an einem Feiertag bleibt ±0', async () => {
    await recalc(u1, '2026-04-03');
    const d = await day(u1, '2026-04-03');
    assert.equal(d.status, 'holiday');
    assert.equal(d.saldo, 0);
  });
  await test('4 h gestempelt am 1. Mai → +4:00', async () => {
    await stamp(u1, '2026-05-01', '08:00', '12:00');
    await recalc(u1, '2026-05-01');
    assert.equal((await day(u1, '2026-05-01')).saldo, 240);
  });

  console.log('Urlaub über Feiertage');
  const u2 = await createUser('2026-03-23');
  await test('Urlaub 30.03.–10.04.2026 über die Oberfläche angelegt = 8 Tage', async () => {
    const v = await addAbsence(u2, 'Urlaub', '2026-03-30', '2026-04-10');
    assert.equal(parseFloat(v.calculated_days), 8);
  });
  await test('Urlaubstag ±0, Status Urlaub', async () => {
    const d = await day(u2, '2026-04-02');
    assert.equal(d.status, 'Urlaub');
    assert.equal(d.saldo, 0);
  });
  await test('Karfreitag im Urlaub: Status Feiertag, ±0, keine Doppel-Gutschrift', async () => {
    const d = await day(u2, '2026-04-03');
    assert.equal(d.status, 'holiday');
    assert.equal(d.saldo, 0);
    assert.equal(d.ist, d.soll);
  });

  console.log('Halber Feiertag = halber Arbeitstag');
  const u3 = await createUser('2025-12-01');
  await nightly(u3, '2025-12-01');
  await test('Heiligabend 2025 (Mi) ohne Stempel → fehlende Buchung, −4:15', async () => {
    const d = await day(u3, '2025-12-24');
    assert.equal(d.status, 'absent');
    assert.equal(d.fehlt, true);
    assert.equal(d.feiertag, true);
    assert.equal(d.saldo, -255);
  });
  await test('Silvester 2025 (Mi) ohne Stempel → −4:15', async () => {
    assert.equal((await day(u3, '2025-12-31')).saldo, -255);
  });
  const u4 = await createUser('2025-12-01');
  await test('Heiligabend 08:00–12:15 gestempelt → vollständig, ±0', async () => {
    await stamp(u4, '2025-12-24', '08:00', '12:15');
    await recalc(u4, '2025-12-24');
    const d = await day(u4, '2025-12-24');
    assert.equal(d.status, 'complete');
    assert.equal(d.saldo, 0);
  });
  const u5 = await createUser('2025-12-01');
  await test('Heiligabend mit halbem Urlaubstag → 0,5 Tage, ±0, Status Urlaub', async () => {
    const v = await addAbsence(u5, 'Urlaub', '2025-12-24');
    assert.equal(parseFloat(v.calculated_days), 0.5);
    const d = await day(u5, '2025-12-24');
    assert.equal(d.status, 'Urlaub');
    assert.equal(d.saldo, 0);
  });

  console.log('Krank nach Arbeitsbeginn (bis zum Soll auffüllen)');
  const u6 = await createUser('2026-09-01');
  await test('07:00–09:00 gestempelt → −6:30', async () => {
    await stamp(u6, '2026-09-15', '07:00', '09:00');
    await recalc(u6, '2026-09-15');
    assert.equal((await day(u6, '2026-09-15')).saldo, -390);
  });
  await test('danach „Krank“ eingetragen → ±0, Status Krank', async () => {
    await addAbsence(u6, 'Krank', '2026-09-15');
    const d = await day(u6, '2026-09-15');
    assert.equal(d.status, 'Krank');
    assert.equal(d.saldo, 0);
  });
  await test('Tag später neu berechnet (Korrektur, Tagesinfo) → bleibt ±0', async () => {
    await recalc(u6, '2026-09-15');
    assert.equal((await day(u6, '2026-09-15')).saldo, 0);
  });
  await test('umgekehrt: erst „Krank“, dann doch 07:00–09:00 gestempelt → ±0', async () => {
    await addAbsence(u6, 'Krank', '2026-09-16');
    await stamp(u6, '2026-09-16', '07:00', '09:00');
    await recalc(u6, '2026-09-16');
    const d = await day(u6, '2026-09-16');
    assert.equal(d.status, 'Krank');
    assert.equal(d.saldo, 0);
  });

  console.log('Bundesland');
  const u7 = await createUser('2026-09-01');
  await ensureHolidaysForYear(2026, 'SN'); // Feiertage eines fremden Bundeslands in der DB
  await test('Einstellung Bayern: Buß- und Bettag (SN, 18.11.2026) zählt nicht – weder Zeiterfassung noch Urlaub', async () => {
    await recalc(u7, '2026-11-18');
    assert.equal((await day(u7, '2026-11-18')).feiertag, false);
    assert.deepEqual(await vacationsController.calculateWorkingDaysByYear(u7, '2026-11-16', '2026-11-20'), { 2026: 5 });
  });
  await test('Einstellung Sachsen: Buß- und Bettag zählt überall', async () => {
    await setRegion('SN');
    try {
      await recalc(u7, '2026-11-18');
      assert.equal((await day(u7, '2026-11-18')).feiertag, true);
      assert.deepEqual(await vacationsController.calculateWorkingDaysByYear(u7, '2026-11-16', '2026-11-20'), { 2026: 4 });
    } finally {
      await setRegion('BY');
    }
  });

  console.log('Zeitnachweis – Stichtag Urlaubskonto');
  const u8 = await createUser('2025-01-01');
  await test('laufender Monat: Stand heute', async () => {
    const today = toDateStr(new Date());
    const [y, m, d] = today.split('-');
    const v = await getPayrollVacation(u8, Number(y), Number(m));
    assert.equal(v.stichtag, `${d}.${m}.`);
  });
  await test('vergangener Monat (September 2026): Stand Monatsende', async () => {
    const v = await getPayrollVacation(u8, 2026, 9);
    assert.equal(v.stichtag, '30.09.');
  });

  console.log('Zeitmodell-Wechsel (Verlauf)');
  // Vollzeit (id 1): Mo–Do 8:30, Fr 6:00 → ab Mo 14.09.2026 4-Tage-Woche Mo–Do 8:00, Fr frei
  const vierTage = await createModel('Test 4-Tage-Woche', [480, 480, 480, 480, 0, 0, 0]);
  const u9 = await createUser('2026-09-01');
  await switchModel(u9, vierTage, '2026-09-14');
  await nightly(u9, '2026-09-01');
  await test('Nacht-Job: Fr 11.09. (vor dem Wechsel) ohne Stempel → −6:00 nach altem Modell', async () => {
    const d = await day(u9, '2026-09-11');
    assert.equal(d.soll, 360);
    assert.equal(d.saldo, -360);
  });
  await test('Nacht-Job: Mo 14.09. (nach dem Wechsel) → −8:00, Fr 18.09. frei → kein Eintrag', async () => {
    assert.equal((await day(u9, '2026-09-14')).saldo, -480);
    assert.equal(await hasDay(u9, '2026-09-18'), false);
  });
  await test('Neuberechnung Fr 11.09. nach dem Wechsel → bleibt beim alten Soll 6:00', async () => {
    await recalc(u9, '2026-09-11');
    const d = await day(u9, '2026-09-11');
    assert.equal(d.soll, 360);
    assert.equal(d.saldo, -360);
  });
  await test('Fr 18.09. 08:00–12:00 gestempelt → Soll 0, +4:00', async () => {
    await stamp(u9, '2026-09-18', '08:00', '12:00');
    await recalc(u9, '2026-09-18');
    const d = await day(u9, '2026-09-18');
    assert.equal(d.soll, 0);
    assert.equal(d.saldo, 240);
  });

  const u10 = await createUser('2026-09-01');
  await switchModel(u10, vierTage, '2026-09-14');
  await test('Urlaub 07.–18.09.2026 über den Wechsel = 5 + 4 Tage', async () => {
    const v = await addAbsence(u10, 'Urlaub', '2026-09-07', '2026-09-18');
    assert.equal(parseFloat(v.calculated_days), 9);
  });
  await test('Urlaub über den Wechsel: Fr 11.09. Soll 6:00 ±0, Fr 18.09. kein Eintrag', async () => {
    const d = await day(u10, '2026-09-11');
    assert.equal(d.status, 'Urlaub');
    assert.equal(d.soll, 360);
    assert.equal(d.saldo, 0);
    assert.equal(await hasDay(u10, '2026-09-18'), false);
  });

  // Verlauf erst ab Do 01.10.2026 (4-Tage-Woche), Zeiterfassung schon ab 21.09.
  const u11 = await createUser('2026-10-01', vierTage);
  await pool.query("UPDATE users SET time_tracking_start_date = '2026-09-21' WHERE id = $1", [u11]);
  await test('Urlaub 21.09.–09.10.2026: vor dem ersten Eintrag Mo–Fr, danach 4-Tage-Woche = 8 + 5 Tage', async () => {
    assert.deepEqual(await vacationsController.calculateWorkingDaysByYear(u11, '2026-09-21', '2026-10-09'), { 2026: 13 });
  });
  await test('Nacht-Job: Tage vor dem ersten Eintrag bekommen keinen Tageswert', async () => {
    await nightly(u11, '2026-09-21');
    assert.equal(await hasDay(u11, '2026-09-28'), false);
    assert.equal((await day(u11, '2026-10-05')).saldo, -480);
  });

  await test('Terminal: Tagessoll heute aus dem Verlauf', async () => {
    const today = toDateStr(new Date());
    const fuenfStunden = await createModel('Test 5 h täglich', [300, 300, 300, 300, 300, 300, 300]);
    const u12 = await createUser('2026-09-01');
    await pool.query('INSERT INTO user_time_models (user_id, time_model_id, valid_from) VALUES ($1, $2, $3)',
      [u12, fuenfStunden, today]);
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await terminalController.getUserInfo({ params: { id: String(u12) } }, res);
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(res.body.today.target_minutes, 300);
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  await pool.end();
});
