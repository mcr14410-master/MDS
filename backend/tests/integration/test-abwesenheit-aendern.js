/**
 * Integrations-Tests: genehmigte Abwesenheit löschen oder ändern zieht die Tageswerte nach
 * (vorher blieben Status und Gutschrift stehen, bis der Tag aus anderem Grund neu gerechnet wurde).
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 *
 * Zeitmodell „Vollzeit 40h“ (id 1): Mo–Do 8:30, Fr 6:00. September 2026 ohne Feiertag in Bayern.
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

const fakeRes = () => ({ statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } });
let adminId;
let userCount = 0;

async function createUser(startDate) {
  userCount++;
  const id = (await pool.query(`
    INSERT INTO users (username, email, password_hash, first_name, last_name, is_active,
                       vacation_tracking_enabled, time_tracking_enabled, time_model_id, time_tracking_start_date)
    VALUES ($1, $2, 'x', 'Test', $3, true, true, true, 1, $4) RETURNING id`,
    [`test_abw_${userCount}`, `test_abw_${userCount}@example.invalid`, `Abwesenheit ${userCount}`, startDate])).rows[0].id;
  await pool.query('INSERT INTO user_time_models (user_id, time_model_id, valid_from) VALUES ($1, 1, $2)', [id, startDate]);
  const days = Math.ceil((Date.now() - Date.parse(`${startDate}T00:00:00Z`)) / 86400000) + 1;
  await generateAbsenceEntries(id, days);
  return id;
}

const typeId = async (name) => (await pool.query('SELECT id FROM vacation_types WHERE name = $1', [name])).rows[0].id;

async function addAbsence(userId, type, start, end = start) {
  const res = fakeRes();
  await vacationsController.createVacation(
    { body: { user_id: userId, type_id: await typeId(type), start_date: start, end_date: end }, user: { id: adminId } }, res);
  assert.ok(res.statusCode < 300, `Anlegen: ${res.statusCode} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function deleteAbsence(id) {
  const res = fakeRes();
  await vacationsController.deleteVacation({ params: { id: String(id) }, user: { id: adminId } }, res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
}

async function updateAbsence(id, body) {
  const res = fakeRes();
  await vacationsController.updateVacation({ params: { id: String(id) }, body, user: { id: adminId } }, res);
  assert.ok(res.statusCode < 300, `Ändern: ${res.statusCode} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function stamp(userId, date, from, to) {
  await pool.query(`
    INSERT INTO time_entries (user_id, entry_type, timestamp, source) VALUES
    ($1, 'clock_in',  ($2 || ' ' || $3)::timestamp AT TIME ZONE 'Europe/Berlin', 'test'),
    ($1, 'clock_out', ($2 || ' ' || $4)::timestamp AT TIME ZONE 'Europe/Berlin', 'test')`, [userId, date, from, to]);
  await updateDailySummary(userId, new Date(`${date}T12:00:00`));
}

async function day(userId, date) {
  const r = await pool.query(`
    SELECT status, target_minutes AS soll, overtime_minutes AS saldo, has_missing_entries AS fehlt, vacation_id IS NOT NULL AS urlaub
    FROM time_daily_summary WHERE user_id = $1 AND date = $2`, [userId, date]);
  return r.rows[0] || null;
}

async function assertBalanceConsistent(userId, year, month) {
  const sum = (await pool.query(`
    SELECT COALESCE(SUM(overtime_minutes), 0)::int AS s FROM time_daily_summary
    WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`, [userId, year, month])).rows[0].s;
  const tb = (await pool.query('SELECT overtime_minutes FROM time_balances WHERE user_id = $1 AND year = $2 AND month = $3',
    [userId, year, month])).rows[0];
  assert.equal(tb.overtime_minutes, sum, `Monat ${month}/${year}: Saldo-Monat ≠ Summe der Tage`);
}

const ABSENT_MO = { status: 'absent', soll: 510, saldo: -510, fehlt: true, urlaub: false };

(async () => {
  adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  await pool.query("UPDATE vacation_settings SET value = 'BY' WHERE key = 'default_region'");
  await ensureHolidaysForYear(2026, 'BY');

  console.log('Löschen');
  const u1 = await createUser('2026-08-03');
  const urlaub = await addAbsence(u1, 'Urlaub', '2026-09-07', '2026-09-11');
  await test('Vorher: Mo 07.09. Urlaub ±0', async () => {
    assert.deepEqual(await day(u1, '2026-09-07'), { status: 'Urlaub', soll: 510, saldo: 0, fehlt: false, urlaub: true });
  });
  await test('Genehmigten Urlaub löschen → Tage wieder fehlende Buchung (−Soll), Monatssaldo passt', async () => {
    await deleteAbsence(urlaub.id);
    assert.deepEqual(await day(u1, '2026-09-07'), ABSENT_MO);
    assert.deepEqual(await day(u1, '2026-09-11'), { status: 'absent', soll: 360, saldo: -360, fehlt: true, urlaub: false });
    await assertBalanceConsistent(u1, 2026, 9);
  });

  const u2 = await createUser('2026-08-03');
  await stamp(u2, '2026-09-14', '07:00', '09:00');
  const krank = await addAbsence(u2, 'Krank', '2026-09-14');
  await test('Krank nach 2 h Arbeit löschen → nur die gearbeitete Zeit zählt (−6:30)', async () => {
    assert.equal((await day(u2, '2026-09-14')).saldo, 0);
    await deleteAbsence(krank.id);
    const d = await day(u2, '2026-09-14');
    assert.deepEqual([d.soll, d.saldo, d.urlaub], [510, -390, false]);
  });

  const u3 = await createUser('2026-08-03');
  await test('Beantragten (nicht genehmigten) Eintrag löschen → Tage unverändert', async () => {
    const pending = (await pool.query(`INSERT INTO vacations (user_id, type_id, start_date, end_date, calculated_days, status)
      VALUES ($1, $2, '2026-09-21', '2026-09-21', 1, 'pending') RETURNING id`, [u3, await typeId('Urlaub')])).rows[0].id;
    const vorher = await day(u3, '2026-09-21');
    await deleteAbsence(pending);
    assert.deepEqual(await day(u3, '2026-09-21'), vorher);
  });

  console.log('Ändern');
  const u4 = await createUser('2026-08-03');
  const verschoben = await addAbsence(u4, 'Urlaub', '2026-09-14', '2026-09-15');
  await test('Zeitraum verschoben (14.–15.09. → 17.–18.09.): alte Tage fehlende Buchung, neue Urlaub', async () => {
    await updateAbsence(verschoben.id, { start_date: '2026-09-17', end_date: '2026-09-18' });
    assert.deepEqual(await day(u4, '2026-09-14'), ABSENT_MO);
    assert.deepEqual(await day(u4, '2026-09-17'), { status: 'Urlaub', soll: 510, saldo: 0, fehlt: false, urlaub: true });
    assert.deepEqual(await day(u4, '2026-09-18'), { status: 'Urlaub', soll: 360, saldo: 0, fehlt: false, urlaub: true });
    await assertBalanceConsistent(u4, 2026, 9);
  });
  await test('Art geändert (Urlaub → Krank): Status der Tage Krank', async () => {
    await updateAbsence(verschoben.id, { type_id: await typeId('Krank') });
    assert.equal((await day(u4, '2026-09-17')).status, 'Krank');
  });
  await test('Status auf storniert gesetzt → Tage wieder fehlende Buchung', async () => {
    await updateAbsence(verschoben.id, { status: 'cancelled' });
    assert.deepEqual(await day(u4, '2026-09-17'), { status: 'absent', soll: 510, saldo: -510, fehlt: true, urlaub: false });
    await assertBalanceConsistent(u4, 2026, 9);
  });
  await test('Nur Notiz geändert → Tage unverändert', async () => {
    const u5 = await createUser('2026-08-03');
    const v = await addAbsence(u5, 'Urlaub', '2026-09-22');
    await pool.query("UPDATE time_daily_summary SET review_note = 'Marker' WHERE user_id = $1 AND date = '2026-09-22'", [u5]);
    await updateAbsence(v.id, { note: 'nur Notiz' });
    const marker = (await pool.query("SELECT review_note FROM time_daily_summary WHERE user_id = $1 AND date = '2026-09-22'", [u5])).rows[0];
    assert.equal(marker.review_note, 'Marker');
  });

  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  await pool.end();
});
