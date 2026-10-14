/* eslint-disable camelcase */

/**
 * Migration: Einstellung holiday_region entfernen
 *
 * Bundesland für Feiertage kommt einheitlich aus default_region (utils/holidayRegion.js).
 * holiday_region (aus 1737000081000) wurde nirgends gelesen.
 */

exports.up = (pgm) => {
  pgm.sql(`DELETE FROM vacation_settings WHERE key = 'holiday_region';`);
};

exports.down = (pgm) => {
  pgm.sql(`
    INSERT INTO vacation_settings (key, value, description)
    VALUES ('holiday_region', 'BY', 'Region für Feiertage (BY = Bayern)')
    ON CONFLICT (key) DO NOTHING;
  `);
};
