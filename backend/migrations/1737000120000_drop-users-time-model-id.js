/* eslint-disable camelcase */

/**
 * Migration: users.time_model_id entfernen (Zeitmodell-Verlauf, Schritt 4)
 *
 * Seit Schritt 2/3 rechnen und zeigen alle Stellen das Zeitmodell aus dem Verlauf (user_time_models);
 * die Spalte wurde nur noch mitgeführt. Vor dem Entfernen in Produktion geprüft: Spalte und
 * heute gültiger Verlaufseintrag stimmen überein, kein Modell steht nur in der Spalte.
 *
 * Down: Spalte wieder anlegen und mit dem heute gültigen Modell füllen (sonst dem ersten Eintrag,
 * falls der Verlauf erst künftig beginnt).
 */

exports.up = (pgm) => {
  pgm.sql('ALTER TABLE users DROP COLUMN time_model_id;');
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN time_model_id INTEGER REFERENCES time_models(id) ON DELETE SET NULL;

    UPDATE users u
    SET time_model_id = COALESCE(
      (SELECT utm.time_model_id FROM user_time_models utm
       WHERE utm.user_id = u.id AND utm.valid_from <= (NOW() AT TIME ZONE 'Europe/Berlin')::date
       ORDER BY utm.valid_from DESC LIMIT 1),
      (SELECT utm.time_model_id FROM user_time_models utm
       WHERE utm.user_id = u.id
       ORDER BY utm.valid_from LIMIT 1)
    );
  `);
};
