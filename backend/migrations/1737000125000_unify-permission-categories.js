/* eslint-disable camelcase */

/**
 * Migration: Rechte-Kategorien vereinheitlichen
 *
 * Befund nach Release 2.18.0: vacations.approve hatte die Kategorie „Urlaub“ (Migration 089), die übrigen
 * Urlaubsrechte „vacations“ (081) → in der Rollenverwaltung zwei Gruppen. Ebenso „Zeiterfassung“ als
 * einzige weitere deutsche Kategorie. Künftig ist die Kategorie ein Schlüssel wie bei allen anderen
 * (program, part, …); den deutschen Namen zeigt das Frontend (utils/permissionCategories.js).
 *
 * Nur das Feld category ändert sich – Rechte und ihre Zuordnung zu Rollen bleiben unverändert.
 */

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE permissions SET category = 'vacations' WHERE category = 'Urlaub';
    UPDATE permissions SET category = 'time_tracking' WHERE category = 'Zeiterfassung';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE permissions SET category = 'Urlaub' WHERE name = 'vacations.approve' AND category = 'vacations';
    UPDATE permissions SET category = 'Zeiterfassung' WHERE name LIKE 'time\\_tracking.%' AND category = 'time_tracking';
  `);
};
