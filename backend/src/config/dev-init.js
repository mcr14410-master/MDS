/**
 * Dev-Init: macht eine frisch migrierte Entwicklungs-DB benutzbar.
 *
 * - legt den Benutzer 'admin' an, falls er fehlt, und setzt sein Passwort
 * - weist ihm die Rolle 'admin' zu
 * - gibt der Rolle 'admin' alle vorhandenen Berechtigungen
 *
 * Passwort aus DEV_ADMIN_PASSWORD oder per verdeckter Eingabe. Beliebig oft
 * wiederholbar, z. B. nach neuen Migrationen. Nur für Entwicklung – Produktion
 * wird über scripts/init.sh eingerichtet.
 *
 * Aufruf: npm run dev:init
 */
const readline = require('readline');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { hashPassword } = require('../utils/password');

dotenv.config();

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    rl._writeToOutput = () => {};
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function getPassword() {
  if (process.env.DEV_ADMIN_PASSWORD) {
    return process.env.DEV_ADMIN_PASSWORD;
  }
  if (!process.stdin.isTTY) {
    throw new Error('Kein Terminal für die Eingabe – Passwort per DEV_ADMIN_PASSWORD übergeben.');
  }
  // Deutlich absetzen – nach den npm-Kopfzeilen ging die Abfrage leicht unter
  const line = '═'.repeat(44);
  console.log(`\n${line}\n  🔑 Admin-Passwort festlegen\n     Eingabe wird nicht angezeigt\n${line}`);
  const password = await askHidden('Neues Passwort für admin: ');
  const repeat = await askHidden('Passwort wiederholen: ');
  if (!password) throw new Error('Leeres Passwort.');
  if (password !== repeat) throw new Error('Passwörter stimmen nicht überein.');
  return password;
}

async function devInit() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NODE_ENV=production – dev:init ist nur für Entwicklungs-DBs. Produktion: scripts/init.sh');
  }

  const password = await getPassword();
  const passwordHash = await hashPassword(password);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🔧 Dev-Init startet...\n');
    await client.query('BEGIN');

    const user = await client.query(`
      INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
      VALUES ('admin', 'admin@example.com', $1, 'System', 'Administrator', true)
      ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true
      RETURNING id, (xmax = 0) AS created;
    `, [passwordHash]);
    console.log(user.rows[0].created ? 'Benutzer admin angelegt' : 'Passwort von admin gesetzt');

    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, r.id FROM roles r WHERE r.name = 'admin'
      ON CONFLICT DO NOTHING;
    `, [user.rows[0].id]);

    const granted = await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin'
      ON CONFLICT DO NOTHING;
    `);
    const total = await client.query('SELECT count(*)::int AS n FROM permissions');
    console.log(`Rolle admin: ${granted.rowCount} Berechtigungen ergänzt, jetzt alle ${total.rows[0].n}`);

    await client.query('COMMIT');
    console.log('\n✅ Dev-Init abgeschlossen – Login mit Benutzer admin');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  devInit()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n💥 Dev-Init fehlgeschlagen:', error.message);
      process.exit(1);
    });
}

module.exports = devInit;
