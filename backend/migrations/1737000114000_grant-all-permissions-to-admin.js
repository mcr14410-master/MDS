/* eslint-disable camelcase */

/**
 * Migration: Rolle 'admin' erhält alle vorhandenen Berechtigungen
 *
 * Einige Migrationen haben ihre Berechtigungen nicht oder an nicht existierende
 * Rollennamen vergeben (1737000050000 maintenance.*, 1737000079000 measuring.* an
 * 'Administrator', 1737000091000 time_tracking.manage/settings). Bisher glich das
 * scripts/init.sh aus, indem es der Rolle admin alles gab – das läuft aber nur einmal
 * bei der Ersteinrichtung. Jetzt übernimmt das diese Migration.
 *
 * Produktion: Die Rolle admin hat dort schon alle Berechtigungen (init.sh),
 * ON CONFLICT lässt bestehende Zuweisungen unverändert.
 *
 * Ab hier gilt: Jede Migration, die Berechtigungen anlegt, weist sie selbst der
 * Rolle 'admin' zu (siehe CLAUDE.md, Datenbank-Patterns).
 */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin'
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = () => {
  // Bewusst leer: In Produktion bestanden die Zuweisungen schon vor dieser Migration
  // (scripts/init.sh) – ein DELETE würde dem Admin dort Rechte entziehen.
};
