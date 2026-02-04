const pool = require('../src/config/db');

async function up() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Cron Job Log Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS cron_job_logs (
        id SERIAL PRIMARY KEY,
        job_name VARCHAR(100) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMPTZ,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        duration_ms INTEGER,
        result JSONB,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Index für schnelle Abfragen
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cron_job_logs_name_started 
      ON cron_job_logs (job_name, started_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status 
      ON cron_job_logs (status)
    `);

    console.log('✅ Cron Job Logs Tabelle erstellt');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  await pool.query('DROP TABLE IF EXISTS cron_job_logs');
}

module.exports = { up, down };
