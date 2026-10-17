/* eslint-disable camelcase */

/**
 * Migration: Audit-Log-Zeitstempel mit Zeitzone
 *
 * created_at war `timestamp` ohne Zeitzone mit Default CURRENT_TIMESTAMP – gespeichert wurde die Uhrzeit
 * der jeweiligen Session. Middleware und partsController haben eigene Pools ohne SET timezone (Container:
 * UTC); nur der Zeitmodell-Verlauf (user_time_model, zentraler Pool) schrieb Europe/Berlin – in Produktion
 * am 17.10.2026 geprüft (z. B. time-models 17:55 / user_time_model 19:55 für denselben Vorgang).
 * Umstellung auf timestamptz, Altdaten nach Herkunft umgerechnet.
 */

const ORIGIN_TZ = `CASE WHEN entity_type = 'user_time_model' THEN 'Europe/Berlin' ELSE 'UTC' END`;

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
