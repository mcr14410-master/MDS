/**
 * Integrations-Tests Zeitmodell-Verlauf (user_time_models) – Grundlage:
 * Einträge entstehen beim Ändern des Mitarbeiters, „Modell an Datum X“ liest den Verlauf.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const pool = require('../../src/config/db');
const usersController = require('../../src/controllers/usersController');
const { getTimeModelAt, loadTimeModelResolver } = require('../../src/utils/timeModelHistory');
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

let adminId;

// Mitarbeiter über den echten Controller ändern (wie die Oberfläche)
async function updateUser(id, body) {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
  await usersController.update({ params: { id: String(id) }, body, user: { id: adminId } }, res);
  assert.ok(res.statusCode < 300, `Update: ${res.statusCode} ${JSON.stringify(res.body)}`);
}

const verlauf = async (userId) => (await pool.query(
  'SELECT time_model_id, valid_from::text AS ab, created_by FROM user_time_models WHERE user_id = $1 ORDER BY valid_from', [userId]
)).rows;

(async () => {
  adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  const today = toDateStr(new Date());
  const vollzeit = 1; // aus der Migration
  const teilzeit = (await pool.query(`
    INSERT INTO time_models (name, monday_minutes, tuesday_minutes, wednesday_minutes, thursday_minutes, friday_minutes)
    VALUES ('Test Teilzeit 4 Tage', 480, 480, 480, 480, 0) RETURNING id`)).rows[0].id;
  const user = (await pool.query(`
    INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
    VALUES ('test_verlauf', 'test_verlauf@example.invalid', 'x', 'Test', 'Verlauf', true) RETURNING id`)).rows[0].id;

  console.log('Einträge beim Ändern des Mitarbeiters');
  await test('Neuer Mitarbeiter ohne Zeitmodell → kein Verlauf', async () => {
    assert.deepEqual(await verlauf(user), []);
  });
  await test('Erste Zuordnung (Zeiterfassung ab 01.09.2026) → Eintrag ab 01.09.2026, angelegt von admin', async () => {
    await updateUser(user, { time_tracking_enabled: true, time_tracking_start_date: '2026-09-01', time_model_id: vollzeit });
    assert.deepEqual(await verlauf(user), [{ time_model_id: vollzeit, ab: '2026-09-01', created_by: adminId }]);
  });
  await test('Gleiches Modell erneut gesendet → kein neuer Eintrag', async () => {
    await updateUser(user, { time_model_id: vollzeit });
    assert.equal((await verlauf(user)).length, 1);
  });
  await test('Anderes Modell → neuer Eintrag ab heute, alter bleibt', async () => {
    await updateUser(user, { time_model_id: teilzeit });
    assert.deepEqual((await verlauf(user)).map(e => [e.time_model_id, e.ab]), [[vollzeit, '2026-09-01'], [teilzeit, today]]);
  });
  await test('Zeiterfassung aus (Modell entfernt) → Verlauf bleibt erhalten', async () => {
    await updateUser(user, { time_tracking_enabled: false, time_model_id: null });
    assert.equal((await verlauf(user)).length, 2);
  });

  console.log('Modell an einem Datum');
  await test('vor dem ersten Eintrag → kein Modell', async () => {
    assert.equal(await getTimeModelAt(user, '2026-08-31'), null);
  });
  await test('ab 01.09.2026 → Vollzeit', async () => {
    assert.equal((await getTimeModelAt(user, '2026-09-01')).id, vollzeit);
  });
  await test('heute → Teilzeit', async () => {
    assert.equal((await getTimeModelAt(user, today)).id, teilzeit);
  });
  await test('Resolver für Schleifen liefert dieselben Modelle', async () => {
    const modelAt = await loadTimeModelResolver(user);
    assert.equal(modelAt('2026-08-31'), null);
    assert.equal(modelAt('2026-09-15').id, vollzeit);
    assert.equal(modelAt(today).id, teilzeit);
    assert.equal(modelAt(today).friday_minutes, 0);
    assert.equal(modelAt(today).valid_from, undefined);
  });

  console.log(`\n${passed} Tests bestanden`);
})()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => process.exit()); // usersController hat einen eigenen Pool
