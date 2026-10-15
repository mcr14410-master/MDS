/* eslint-disable camelcase */

/**
 * Migration: Zeitmodell-Verlauf (user_time_models)
 *
 * Bisher hatte ein Mitarbeiter nur das aktuelle Zeitmodell (users.time_model_id). Jede spätere
 * Neuberechnung eines vergangenen Tages nahm das neue Modell. Jetzt: Zuordnung mit „gültig ab“ –
 * ein Eintrag gilt bis zum Tag vor dem nächsten; vor dem ersten Eintrag gilt kein Modell.
 *
 * Übernahme: Jeder Mitarbeiter mit Zeitmodell bekommt einen Eintrag ab seinem Zeiterfassungs-Start
 * (time_tracking_start_date, sonst Anlagedatum). users.time_model_id bleibt vorerst bestehen
 * (wird mitgeführt, Rechnen stellt erst der nächste Schritt um).
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE user_time_models (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      time_model_id INTEGER NOT NULL REFERENCES time_models(id) ON DELETE RESTRICT,
      valid_from    DATE NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT user_time_models_user_valid_from_key UNIQUE (user_id, valid_from)
    );

    COMMENT ON TABLE user_time_models IS 'Zeitmodell je Mitarbeiter mit „gültig ab“ – gilt bis zum Tag vor dem nächsten Eintrag';

    INSERT INTO user_time_models (user_id, time_model_id, valid_from)
    SELECT id, time_model_id, COALESCE(time_tracking_start_date, created_at::date)
    FROM users
    WHERE time_model_id IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS user_time_models;');
};
