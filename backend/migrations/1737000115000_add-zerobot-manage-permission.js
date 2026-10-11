/* eslint-disable camelcase */

/**
 * Migration: Berechtigung zerobot.manage
 *
 * Die Zerobot-Routen zum Bearbeiten (Parameter, Maschinen, Backen) verlangten
 * requirePermission('admin'). Eine Berechtigung 'admin' gab es nie – auch der Admin
 * bekam 403. Die Routen verlangen jetzt zerobot.manage.
 *
 * Zugewiesen wird nur der Rolle 'admin'; andere Rollen werden über die
 * Benutzerverwaltung gepflegt.
 */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    ('zerobot.manage', 'Zerobot-Parameter, Maschinen und Backen verwalten', 'zerobot')
    ON CONFLICT (name) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin'
    AND p.name = 'zerobot.manage'
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM role_permissions
    WHERE permission_id = (SELECT id FROM permissions WHERE name = 'zerobot.manage');
  `);
  pgm.sql(`DELETE FROM permissions WHERE name = 'zerobot.manage';`);
};
