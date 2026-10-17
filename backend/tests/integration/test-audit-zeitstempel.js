/**
 * Integrations-Tests Audit-Log-Zeitstempel: created_at ist timestamptz – Einträge aus Sessions in UTC
 * (früher die Middleware mit eigenem Pool) und in Europe/Berlin (zentraler Pool) ergeben denselben
 * Zeitpunkt, die Lesefunktionen liefern ihn unverfälscht.
 * Läuft nur über tests/integration/run.js (Wegwerf-Datenbank).
 */
if (!(process.env.DB_NAME || '').includes('test')) {
  console.error('Abbruch: nur gegen eine Test-Datenbank (DB_NAME mit „test“) – Aufruf über tests/integration/run.js');
  process.exit(1);
}

const assert = require('node:assert/strict');
const { Client } = require('pg');
const pool = require('../../src/config/db');
const { getAuditLogs } = require('../../src/middleware/auditLogMiddleware');

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

(async () => {
  console.log('Audit-Log-Zeitstempel');
  await test('Spalte created_at ist timestamptz', async () => {
    const r = await pool.query(`SELECT data_type FROM information_schema.columns
                                WHERE table_name = 'audit_logs' AND column_name = 'created_at'`);
    assert.equal(r.rows[0].data_type, 'timestamp with time zone');
  });

  await test('Eintrag aus UTC-Session und aus Berliner Session: beide „jetzt“', async () => {
    const utc = new Client({ connectionString: process.env.DATABASE_URL });
    await utc.connect();
    await utc.query("SET timezone = 'UTC'");
    await utc.query(`INSERT INTO audit_logs (entity_type, entity_id, action) VALUES ('test_tz', 1, 'UTC')`);
    await utc.end();
    await pool.query(`INSERT INTO audit_logs (entity_type, entity_id, action) VALUES ('test_tz', 1, 'BERLIN')`);
    const rows = await getAuditLogs('test_tz', 1);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.ok(row.created_at instanceof Date, 'created_at als Date');
      const diff = Math.abs(Date.now() - row.created_at.getTime());
      assert.ok(diff < 60000, `${row.action}: Abweichung ${Math.round(diff / 60000)} min`);
    }
  });

  await pool.query(`DELETE FROM audit_logs WHERE entity_type = 'test_tz'`);
  console.log(`\n${passed} Tests bestanden`);
  await pool.end();
})();
