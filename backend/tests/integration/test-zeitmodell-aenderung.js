/**
 * Integrations-Tests Zeitmodell-Verlauf ändern (Schritt 3): neues Zeitmodell ab Datum (auch rückwirkend
 * und künftig), Eintrag korrigieren/löschen – mit Vorschau, Neuberechnung von Tagen, Urlauben und Salden,
 * Audit-Log. Dazu: Anzeige „heute gültig“, Zeitmodell löschen, Zeitnachweis-Kopf, Deaktivieren.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 *
 * Modelle: „Vollzeit 40h“ (id 1, Migration) Mo–Do 8:30, Fr 6:00; „Test 4-Tage“ Mo–Do 8:00, Fr frei.
 * September 2026 hat in Bayern keinen Feiertag (01.09. = Di).
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
const { getPayrollTimeModelLabel } = require('../../src/controllers/timeBalancesController');
const timeModelsController = require('../../src/controllers/timeModelsController');
const usersController = require('../../src/controllers/usersController');
const userTimeModelsController = require('../../src/controllers/userTimeModelsController');
const { previewChange, applyChange } = require('../../src/services/timeModelChangeService');
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

const VOLLZEIT = 1;
let vierTage;
let adminId;
let userCount = 0;

const fakeRes = () => ({ statusCode: 200, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } });

async function createUser(startDate, timeModelId = VOLLZEIT) {
  userCount++;
  const r = await pool.query(`
    INSERT INTO users (username, email, password_hash, first_name, last_name, is_active,
                       vacation_tracking_enabled, time_tracking_enabled, time_model_id, time_tracking_start_date)
    VALUES ($1, $2, 'x', 'Test', $3, true, true, true, $4, $5) RETURNING id`,
    [`test_aend_${userCount}`, `test_aend_${userCount}@example.invalid`, `Änderung ${userCount}`, timeModelId, startDate]);
  const id = r.rows[0].id;
  await pool.query('INSERT INTO user_time_models (user_id, time_model_id, valid_from) VALUES ($1, $2, $3)',
    [id, timeModelId, startDate]);
  return id;
}

async function nightly(userId, since) {
  const days = Math.ceil((Date.now() - Date.parse(`${since}T00:00:00Z`)) / 86400000) + 1;
  await generateAbsenceEntries(userId, days);
}

async function stamp(userId, date, from, to) {
  await pool.query(`
    INSERT INTO time_entries (user_id, entry_type, timestamp, source) VALUES
    ($1, 'clock_in',  ($2 || ' ' || $3)::timestamp AT TIME ZONE 'Europe/Berlin', 'test'),
    ($1, 'clock_out', ($2 || ' ' || $4)::timestamp AT TIME ZONE 'Europe/Berlin', 'test')`,
    [userId, date, from, to]);
  await updateDailySummary(userId, new Date(`${date}T12:00:00`));
}

async function addAbsence(userId, type, start, end = start) {
  const typeId = (await pool.query('SELECT id FROM vacation_types WHERE name = $1', [type])).rows[0].id;
  const res = fakeRes();
  await vacationsController.createVacation(
    { body: { user_id: userId, type_id: typeId, start_date: start, end_date: end }, user: { id: adminId } }, res);
  assert.ok(res.statusCode < 300, `Urlaub anlegen: ${res.statusCode} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function day(userId, date) {
  const r = await pool.query(`
    SELECT status, target_minutes AS soll, worked_minutes AS ist, overtime_minutes AS saldo, has_missing_entries AS fehlt
    FROM time_daily_summary WHERE user_id = $1 AND date = $2`, [userId, date]);
  return r.rows[0] || null;
}

const verlauf = async (userId) => (await pool.query(
  'SELECT id, time_model_id, valid_from::text AS ab FROM user_time_models WHERE user_id = $1 ORDER BY valid_from', [userId]
)).rows;

// Monatssaldo muss zur Summe der Tageswerte passen, Übertrag zum Vormonat
async function assertBalanceConsistent(userId, year, month) {
  const sum = (await pool.query(`
    SELECT COALESCE(SUM(overtime_minutes), 0)::int AS s FROM time_daily_summary
    WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`, [userId, year, month])).rows[0].s;
  const tb = (await pool.query(
    'SELECT overtime_minutes, carryover_minutes, balance_minutes FROM time_balances WHERE user_id = $1 AND year = $2 AND month = $3',
    [userId, year, month])).rows[0];
  assert.ok(tb, `kein Monatssaldo ${month}/${year}`);
  assert.equal(tb.overtime_minutes, sum, `Monat ${month}/${year}: Saldo-Monat ≠ Summe der Tage`);
  return tb;
}

const snapshot = async (userId) => JSON.stringify((await pool.query(
  'SELECT date::text, target_minutes, overtime_minutes, status FROM time_daily_summary WHERE user_id = $1 ORDER BY date', [userId]
)).rows);

// ---------- Tests ----------

(async () => {
  adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;
  await pool.query("UPDATE vacation_settings SET value = 'BY' WHERE key = 'default_region'");
  for (const y of [2026, 2027]) await ensureHolidaysForYear(y, 'BY');
  vierTage = (await pool.query(`
    INSERT INTO time_models (name, monday_minutes, tuesday_minutes, wednesday_minutes, thursday_minutes, friday_minutes)
    VALUES ('Test 4-Tage', 480, 480, 480, 480, 0) RETURNING id`)).rows[0].id;
  const today = toDateStr(new Date());

  console.log('Rückwirkend: Vollzeit → 4-Tage ab 01.09.2026');
  const u1 = await createUser('2026-08-03');
  await nightly(u1, '2026-08-03');
  await stamp(u1, '2026-09-11', '08:00', '12:00');                  // Fr mit Stempel – wird frei
  await pool.query("UPDATE time_daily_summary SET target_override_minutes = 240 WHERE user_id = $1 AND date = '2026-09-16'", [u1]);
  await updateDailySummary(u1, new Date('2026-09-16T12:00:00'));      // Mi mit manuellem Soll 4:00
  const urlaub = await addAbsence(u1, 'Urlaub', '2026-09-21', '2026-09-25');
  await test('Ausgangslage: Urlaub 21.–25.09. mit Vollzeit = 5 Tage, Fr 04.09. −6:00', async () => {
    assert.equal(parseFloat(urlaub.calculated_days), 5);
    assert.equal((await day(u1, '2026-09-04')).saldo, -360);
  });

  const before = await snapshot(u1);
  let preview;
  await test('Vorschau: nichts gespeichert, Tage/Urlaub/Monate aufgeführt, Monat als vergangen markiert', async () => {
    preview = await previewChange(u1, { action: 'create', timeModelId: vierTage, validFrom: '2026-09-01' });
    assert.equal(await snapshot(u1), before);
    assert.equal((await verlauf(u1)).length, 1);
    const fr = preview.days.find(d => d.date === '2026-09-04');
    assert.equal(fr.action, 'delete');
    const mo = preview.days.find(d => d.date === '2026-09-07');
    assert.deepEqual([mo.action, mo.old.target, mo.new.target, mo.new.overtime], ['recalc', 510, 480, -480]);
    assert.equal(preview.days.find(d => d.date === '2026-09-16'), undefined, 'manuelles Soll bleibt → unverändert');
    assert.ok(preview.summary.kept_overrides >= 1);
    assert.equal(preview.vacations.length, 1);
    assert.deepEqual([preview.vacations[0].old_days, preview.vacations[0].new_days], [5, 4]);
    const sep = preview.months.find(m => m.month === '2026-09');
    assert.ok(sep && sep.is_past);
    assert.deepEqual(preview.summary.past_months.includes('2026-09'), true);
  });

  await test('Übernehmen: Verlauf, users.time_model_id, Audit-Log', async () => {
    const result = await applyChange(u1, { action: 'create', timeModelId: vierTage, validFrom: '2026-09-01' },
      { actorId: adminId, reason: 'Test' });
    assert.equal(result.summary.changed_days, preview.summary.changed_days);
    assert.deepEqual((await verlauf(u1)).map(e => [e.time_model_id, e.ab]), [[VOLLZEIT, '2026-08-03'], [vierTage, '2026-09-01']]);
    const u = (await pool.query('SELECT time_model_id FROM users WHERE id = $1', [u1])).rows[0];
    assert.equal(u.time_model_id, vierTage);
    const audit = (await pool.query(
      "SELECT user_id, action, reason, changes FROM audit_logs WHERE entity_type = 'user_time_model' AND entity_id = $1", [u1])).rows;
    assert.equal(audit.length, 1);
    assert.deepEqual([audit[0].user_id, audit[0].action, audit[0].reason], [adminId, 'CREATE', 'Test']);
    assert.equal(audit[0].changes.after.valid_from, '2026-09-01');
  });
  await test('August unverändert (Fr 28.08. −6:00), Fr 04.09. ohne Stempel entfernt, Mo 07.09. −8:00', async () => {
    assert.equal((await day(u1, '2026-08-28')).saldo, -360);
    assert.equal(await day(u1, '2026-09-04'), null);
    assert.deepEqual(await day(u1, '2026-09-07'), { status: 'absent', soll: 480, ist: 0, saldo: -480, fehlt: true });
  });
  await test('Fr 11.09. mit Stempel bleibt: Soll 0, +4:00', async () => {
    const d = await day(u1, '2026-09-11');
    assert.deepEqual([d.soll, d.saldo], [0, 240]);
  });
  await test('Mi 16.09. mit manuellem Soll 4:00 bleibt bei 4:00', async () => {
    assert.equal((await day(u1, '2026-09-16')).soll, 240);
  });
  await test('Urlaub 21.–25.09. jetzt 4 Tage, Urlaubstage ±0 mit Soll 8:00', async () => {
    const v = (await pool.query('SELECT calculated_days, days_by_year FROM vacations WHERE id = $1', [urlaub.id])).rows[0];
    assert.equal(parseFloat(v.calculated_days), 4);
    assert.deepEqual(v.days_by_year, { 2026: 4 });
    assert.deepEqual([(await day(u1, '2026-09-22')).soll, (await day(u1, '2026-09-22')).saldo], [480, 0]);
  });
  await test('Monatssalden September und Oktober passen zu den Tageswerten, Übertrag stimmt', async () => {
    const sep = await assertBalanceConsistent(u1, 2026, 9);
    const okt = await assertBalanceConsistent(u1, 2026, 10);
    assert.equal(okt.carryover_minutes, sep.balance_minutes);
  });
  await test('Verlauf über die API: gültig bis, aktuell', async () => {
    const res = fakeRes();
    await userTimeModelsController.getHistory({ params: { id: String(u1) } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.map(e => [e.valid_from, e.valid_to, e.is_current, e.time_model_name]),
      [['2026-08-03', '2026-08-31', false, 'Vollzeit 40h'], ['2026-09-01', null, true, 'Test 4-Tage']]);
    assert.equal(res.body[1].weekly_minutes, 1920);
  });
  await test('Zeitnachweis-Kopf: August Vollzeit, September 4-Tage', async () => {
    assert.equal(await getPayrollTimeModelLabel(u1, 2026, 8), 'Vollzeit 40h');
    assert.equal(await getPayrollTimeModelLabel(u1, 2026, 9), 'Test 4-Tage');
    assert.equal(await getPayrollTimeModelLabel(u1, 2026, 7), null);
  });

  console.log('Prüfungen');
  const entries1 = await verlauf(u1);
  await test('Gleiches Datum noch einmal → 409 über die API', async () => {
    const res = fakeRes();
    await userTimeModelsController.create(
      { params: { id: String(u1) }, body: { time_model_id: VOLLZEIT, valid_from: '2026-09-01' }, user: { id: adminId } }, res);
    assert.equal(res.statusCode, 409);
  });
  await test('Modell, das am Datum schon gilt → 400', async () => {
    await assert.rejects(previewChange(u1, { action: 'create', timeModelId: vierTage, validFrom: '2026-09-10' }),
      e => e.status === 400);
  });
  await test('Ungültiges Datum → 400, unbekanntes Modell → 404', async () => {
    await assert.rejects(previewChange(u1, { action: 'create', timeModelId: VOLLZEIT, validFrom: '2026-13-01' }), e => e.status === 400);
    await assert.rejects(previewChange(u1, { action: 'create', timeModelId: 99999, validFrom: '2026-10-01' }), e => e.status === 404);
  });
  await test('Eintrag eines anderen Mitarbeiters → 404', async () => {
    const other = await createUser('2026-08-03');
    await assert.rejects(previewChange(other, { action: 'delete', entryId: entries1[1].id }), e => e.status === 404);
  });

  console.log('Korrigieren und Löschen');
  await test('Gültig ab 01.09. → 15.09. korrigiert: Fr 04.09. wieder −6:00, Fr 18.09. bleibt frei', async () => {
    await applyChange(u1, { action: 'update', entryId: entries1[1].id, validFrom: '2026-09-15' }, { actorId: adminId });
    assert.equal((await day(u1, '2026-09-04')).saldo, -360);
    assert.equal((await day(u1, '2026-09-07')).soll, 510);
    assert.equal(await day(u1, '2026-09-18'), null);
    await assertBalanceConsistent(u1, 2026, 9);
  });
  await test('Zeitnachweis-Kopf September mit beiden Modellen', async () => {
    assert.equal(await getPayrollTimeModelLabel(u1, 2026, 9), 'Vollzeit 40h (bis 14.09.), Test 4-Tage (ab 15.09.)');
  });
  await test('Eintrag gelöscht: alles wieder Vollzeit, Urlaub 5 Tage, Fr 18.09. als fehlende Buchung angelegt', async () => {
    await applyChange(u1, { action: 'delete', entryId: entries1[1].id }, { actorId: adminId });
    assert.equal((await verlauf(u1)).length, 1);
    assert.deepEqual(await day(u1, '2026-09-18'), { status: 'absent', soll: 360, ist: 0, saldo: -360, fehlt: true });
    const v = (await pool.query('SELECT calculated_days FROM vacations WHERE id = $1', [urlaub.id])).rows[0];
    assert.equal(parseFloat(v.calculated_days), 5);
    assert.equal((await day(u1, '2026-09-25')).status, 'Urlaub');
    const u = (await pool.query('SELECT time_model_id FROM users WHERE id = $1', [u1])).rows[0];
    assert.equal(u.time_model_id, VOLLZEIT);
    await assertBalanceConsistent(u1, 2026, 9);
    const actions = (await pool.query(
      "SELECT action FROM audit_logs WHERE entity_type = 'user_time_model' AND entity_id = $1 ORDER BY id", [u1])).rows;
    assert.deepEqual(actions.map(a => a.action), ['CREATE', 'UPDATE', 'DELETE']);
  });
  await test('Einziger Eintrag nicht löschbar → 400', async () => {
    await assert.rejects(applyChange(u1, { action: 'delete', entryId: entries1[0].id }), e => e.status === 400);
  });

  console.log('Neuer Arbeitstag rückwirkend');
  const u2 = await createUser('2026-08-03', vierTage);
  await nightly(u2, '2026-08-03');
  await addAbsence(u2, 'Urlaub', '2026-09-11', '2026-09-11'); // Fr – mit 4-Tage-Woche kein Urlaubstag
  await test('Vorher: Fr 04.09. ohne Tageswert', async () => {
    assert.equal(await day(u2, '2026-09-04'), null);
  });
  await test('4-Tage → Vollzeit ab 01.09.: Fr 04.09. angelegt wie Nacht-Job (−6:00), Fr 11.09. Urlaub ±0', async () => {
    const p = await previewChange(u2, { action: 'create', timeModelId: VOLLZEIT, validFrom: '2026-09-01' });
    assert.equal(p.days.find(d => d.date === '2026-09-04').action, 'create');
    await applyChange(u2, { action: 'create', timeModelId: VOLLZEIT, validFrom: '2026-09-01' }, { actorId: adminId });
    assert.deepEqual(await day(u2, '2026-09-04'), { status: 'absent', soll: 360, ist: 0, saldo: -360, fehlt: true });
    const fr = await day(u2, '2026-09-11');
    assert.deepEqual([fr.status, fr.saldo], ['Urlaub', 0]);
    await assertBalanceConsistent(u2, 2026, 9);
  });

  console.log('Abwesenheit mit veralteter Tageszahl außerhalb der Änderung (Fall MA 13)');
  const moFrei = (await pool.query(`
    INSERT INTO time_models (name, monday_minutes, tuesday_minutes, wednesday_minutes, thursday_minutes, friday_minutes)
    VALUES ('Test Mo frei', 0, 480, 480, 480, 480) RETURNING id`)).rows[0].id;
  const u6 = await createUser('2026-09-01', moFrei);
  const alt = await addAbsence(u6, 'Überstundenabbau', '2026-09-14');   // Mo – frei → 0 Tage
  await pool.query(`UPDATE vacations SET calculated_days = 1, days_by_year = '{"2026": 1}' WHERE id = $1`, [alt.id]);
  const vorher = await addAbsence(u6, 'Urlaub', '2026-08-24');          // Mo vor dem ersten Eintrag → Mo–Fr → 1 Tag
  await test('Vorschau nennt nur die Abwesenheit, die sich durch die Änderung ändert', async () => {
    const p = await previewChange(u6, { action: 'create', timeModelId: moFrei, validFrom: '2026-08-01' });
    assert.deepEqual(p.vacations.map(v => [v.id, v.old_days, v.new_days]), [[vorher.id, 1, 0]]);
  });
  await test('Übernehmen lässt die veraltete Abwesenheit unangetastet', async () => {
    await applyChange(u6, { action: 'create', timeModelId: moFrei, validFrom: '2026-08-01' }, { actorId: adminId });
    const rows = (await pool.query('SELECT id, calculated_days FROM vacations WHERE user_id = $1 ORDER BY id', [u6])).rows;
    assert.deepEqual(rows.map(r => [r.id, parseFloat(r.calculated_days)]), [[alt.id, 1], [vorher.id, 0]]);
  });

  console.log('Künftig datiert');
  const future = (() => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 40); return d.toISOString().slice(0, 10); })();
  const futureEnd = (() => { const d = new Date(`${future}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 13); return d.toISOString().slice(0, 10); })();
  const u3 = await createUser('2026-08-03');
  const urlaub3 = await addAbsence(u3, 'Urlaub', future, futureEnd);
  await test(`Neues Modell ab ${future}: keine Tageswerte, Urlaub dort neu gezählt, heute weiter Vollzeit`, async () => {
    const r = await applyChange(u3, { action: 'create', timeModelId: vierTage, validFrom: future }, { actorId: adminId });
    assert.equal(r.summary.changed_days, 0);
    assert.equal(r.summary.vacations, 1);
    const v = (await pool.query('SELECT calculated_days FROM vacations WHERE id = $1', [urlaub3.id])).rows[0];
    assert.ok(parseFloat(v.calculated_days) < parseFloat(urlaub3.calculated_days));
    assert.equal((await pool.query('SELECT time_model_id FROM users WHERE id = $1', [u3])).rows[0].time_model_id, VOLLZEIT);
  });
  await test('Anzeige heute gültig: Benutzer-API, Zeitmodell-Liste, Verlauf mit is_future', async () => {
    // users.time_model_id absichtlich falsch – die Anzeige muss aus dem Verlauf kommen
    await pool.query('UPDATE users SET time_model_id = $2 WHERE id = $1', [u3, vierTage]);
    const res = fakeRes();
    await usersController.getById({ params: { id: String(u3) } }, res);
    assert.deepEqual([res.body.user?.time_model_id ?? res.body.time_model_id, res.body.user?.time_model_name ?? res.body.time_model_name],
      [VOLLZEIT, 'Vollzeit 40h']);
    const hist = fakeRes();
    await userTimeModelsController.getHistory({ params: { id: String(u3) } }, hist);
    assert.deepEqual(hist.body.map(e => e.is_future), [false, true]);
    const model = fakeRes();
    await timeModelsController.getById({ params: { id: String(vierTage) } }, model);
    assert.equal(model.body.users.some(u => u.id === u3), false);
  });

  console.log('Zeitmodell löschen, Zeiterfassung deaktivieren');
  await test('Modell nur noch im Verlauf → 400 mit Hinweis statt 500', async () => {
    const nurVerlauf = (await pool.query(`
      INSERT INTO time_models (name, monday_minutes) VALUES ('Test nur Verlauf', 480) RETURNING id`)).rows[0].id;
    const u4 = await createUser('2026-08-03', nurVerlauf);
    await applyChange(u4, { action: 'create', timeModelId: VOLLZEIT, validFrom: '2026-09-01' }, { actorId: adminId });
    assert.equal((await pool.query('SELECT time_model_id FROM users WHERE id = $1', [u4])).rows[0].time_model_id, VOLLZEIT);
    const res = fakeRes();
    await timeModelsController.remove({ params: { id: String(nurVerlauf) } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.error, /Verlauf/);
  });
  await test('Unbenutztes Modell lässt sich löschen', async () => {
    const frei = (await pool.query("INSERT INTO time_models (name) VALUES ('Test unbenutzt') RETURNING id")).rows[0].id;
    const res = fakeRes();
    await timeModelsController.remove({ params: { id: String(frei) } }, res);
    assert.equal(res.statusCode, 200);
  });
  await test('Zeiterfassung deaktivieren (time_model_id: null) lässt Modell und Verlauf stehen', async () => {
    const u5 = await createUser('2026-08-03');
    const res = fakeRes();
    await usersController.update({ params: { id: String(u5) }, body: { time_tracking_enabled: false, time_model_id: null }, user: { id: adminId } }, res);
    assert.ok(res.statusCode < 300, JSON.stringify(res.body));
    const u = (await pool.query('SELECT time_tracking_enabled, time_model_id FROM users WHERE id = $1', [u5])).rows[0];
    assert.deepEqual([u.time_tracking_enabled, u.time_model_id], [false, VOLLZEIT]);
    assert.equal((await verlauf(u5)).length, 1);
  });

  console.log(`\n${passed} Tests bestanden`);
})()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => process.exit()); // usersController hat einen eigenen Pool
