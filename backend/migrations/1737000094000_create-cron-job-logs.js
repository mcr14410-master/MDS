/* eslint-disable camelcase */

/**
 * Migration: Cron-Job-Logs
 *
 * Läuft über die Verbindung von node-pg-migrate (pgm). Bis 2026-10 nutzte diese
 * Migration den App-Pool (src/config/db, Variablen DB_*) und damit u. U. eine andere
 * DB als DATABASE_URL, außerhalb der Migrations-Transaktion. Bereits migrierte DBs
 * sind nicht betroffen (gleiche Tabelle, IF NOT EXISTS).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Cron Job Log Tabelle
  pgm.sql(`
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
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_cron_job_logs_name_started
    ON cron_job_logs (job_name, started_at DESC)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status
    ON cron_job_logs (status)
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS cron_job_logs');
};
