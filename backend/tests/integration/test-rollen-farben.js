/**
 * Integrations-Tests Farbe je Rolle (roles.color, Migration 1737000118000): Übernahme nach Rollenname,
 * Anlegen/Ändern mit Prüfung der Palette, Farbe in Benutzer-API, Profil und Urlaubs-API.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const pool = require('../../src/config/db');
const rolesController = require('../../src/controllers/rolesController');
const usersController = require('../../src/controllers/usersController');
const authController = require('../../src/controllers/authController');

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
const call = async (fn, req) => { const res = fakeRes(); await fn(req, res); return res; };

(async () => {
  const adminId = (await pool.query("SELECT id FROM users WHERE username = 'admin'")).rows[0].id;

  console.log('Migration');
  await test('Standardrollen behalten ihre bisherige Farbe (admin rot, programmer blau, …)', async () => {
    const rows = (await pool.query('SELECT name, color FROM roles')).rows;
    const byName = Object.fromEntries(rows.map(r => [r.name, r.color]));
    assert.equal(byName.admin, 'red');
    for (const [name, color] of [['programmer', 'blue'], ['reviewer', 'purple'], ['operator', 'green'], ['helper', 'yellow'], ['supervisor', 'orange']]) {
      if (byName[name] !== undefined) assert.equal(byName[name], color, name);
    }
  });
  await test('Ungültige Farbe direkt in der Datenbank → abgelehnt (CHECK)', async () => {
    await assert.rejects(pool.query("UPDATE roles SET color = 'lila' WHERE name = 'admin'"), /roles_color_check/);
  });

  console.log('Anlegen und Ändern');
  let roleId;
  await test('Neue Rolle ohne Farbe → grau', async () => {
    const res = await call(rolesController.create, { body: { name: 'Test Ohne Farbe' } });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    assert.equal(res.body.role.color, 'gray');
  });
  await test('Neue Rolle mit Farbe pink', async () => {
    const res = await call(rolesController.create, { body: { name: 'Test Einrichter', color: 'pink' } });
    assert.equal(res.statusCode, 201, JSON.stringify(res.body));
    assert.equal(res.body.role.color, 'pink');
    roleId = res.body.role.id;
  });
  await test('Ungültige Farbe beim Anlegen → 400', async () => {
    const res = await call(rolesController.create, { body: { name: 'Test Falsch', color: '#ff0000' } });
    assert.equal(res.statusCode, 400);
  });
  await test('Farbe ändern → grün, Name und Rechte unverändert', async () => {
    const res = await call(rolesController.update, { params: { id: String(roleId) }, body: { color: 'green' } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.deepEqual([res.body.role.name, res.body.role.color], ['Test Einrichter', 'green']);
  });
  await test('Ungültige Farbe beim Ändern → 400, Farbe bleibt', async () => {
    const res = await call(rolesController.update, { params: { id: String(roleId) }, body: { color: 'turquoise' } });
    assert.equal(res.statusCode, 400);
    assert.equal((await pool.query('SELECT color FROM roles WHERE id = $1', [roleId])).rows[0].color, 'green');
  });
  await test('Rollenliste und Einzelabruf liefern die Farbe', async () => {
    const list = await call(rolesController.getAll, {});
    assert.equal(list.body.roles.find(r => r.id === roleId).color, 'green');
    const one = await call(rolesController.getById, { params: { id: String(roleId) } });
    assert.equal(one.body.role.color, 'green');
  });

  console.log('Farbe bei Benutzern');
  const userId = (await pool.query(`
    INSERT INTO users (username, email, password_hash, first_name, last_name, is_active, vacation_tracking_enabled)
    VALUES ('test_rollenfarbe', 'test_rollenfarbe@example.invalid', 'x', 'Test', 'Rollenfarbe', true, true) RETURNING id`)).rows[0].id;
  await pool.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
  await test('Benutzer-API (Liste und Einzelabruf): Rollen mit Farbe', async () => {
    const one = await call(usersController.getById, { params: { id: String(userId) } });
    assert.deepEqual(one.body.user.roles.map(r => [r.name, r.color]), [['Test Einrichter', 'green']]);
    const list = await call(usersController.getAll, { query: {} });
    const u = list.body.users.find(x => x.id === userId);
    assert.deepEqual(u.roles.map(r => r.color), ['green']);
  });
  await test('Profil: Rollen als Namen wie bisher, dazu role_colors', async () => {
    const res = await call(authController.getProfile, { user: { id: userId } });
    assert.deepEqual(res.body.user.roles, ['Test Einrichter']);
    assert.deepEqual(res.body.user.role_colors, { 'Test Einrichter': 'green' });
  });
  await test('Profil ohne Rollen: role_colors leer', async () => {
    const plain = (await pool.query(`
      INSERT INTO users (username, email, password_hash, is_active)
      VALUES ('test_ohne_rolle', 'test_ohne_rolle@example.invalid', 'x', true) RETURNING id`)).rows[0].id;
    const res = await call(authController.getProfile, { user: { id: plain } });
    assert.deepEqual(res.body.user.role_colors, {});
  });
  await test('Urlaubs-API: Rollen der Abwesenheit mit Farbe', async () => {
    const typeId = (await pool.query("SELECT id FROM vacation_types WHERE name = 'Urlaub'")).rows[0].id;
    await pool.query(`INSERT INTO vacations (user_id, type_id, start_date, end_date, calculated_days, status)
                      VALUES ($1, $2, '2026-11-02', '2026-11-02', 1, 'approved')`, [userId, typeId]);
    const vacationsController = require('../../src/controllers/vacationsController');
    const res = await call(vacationsController.getVacations,
      { query: { user_id: String(userId), year: '2026' }, user: { id: adminId } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    const v = (Array.isArray(res.body) ? res.body : res.body.vacations).find(x => x.user_id === userId);
    assert.deepEqual(v.roles.map(r => [r.role_name, r.role_color]), [['Test Einrichter', 'green']]);
  });

  console.log(`\n${passed} Tests bestanden`);
})()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => process.exit()); // rolesController/usersController haben eigene Pools
