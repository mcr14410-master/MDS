/* eslint-disable camelcase */

/**
 * Migration: Audit-Log-Zeitstempel mit Zeitzone
 *
 * created_at war `timestamp` ohne Zeitzone mit Default CURRENT_TIMESTAMP – gespeichert wurde die Uhrzeit
 * der jeweiligen Session: Einträge der Middleware (eigener Pool ohne SET timezone) in UTC, direkt
 * geschriebene (Teile, Zeitmodell-Verlauf; zentraler Pool) in Europe/Berlin. Umstellung auf timestamptz;
 * Altdaten nach Herkunft umgerechnet – die Middleware schreibt immer changes.method, die direkten nie.
 */

const ORIGIN_TZ = `CASE WHEN changes ? 'method' THEN 'UTC' ELSE 'Europe/Berlin' END`;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE audit_logs
      ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE ${ORIGIN_TZ};
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE audit_logs
      ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE ${ORIGIN_TZ};
  `);
};
