/* eslint-disable camelcase */

/**
 * Migration: Add Wiki Permissions
 * 
 * Permissions for wiki system:
 * - wiki.read: View wiki articles
 * - wiki.create: Create new articles
 * - wiki.update: Edit articles
 * - wiki.delete: Delete articles
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    ('wiki.read', 'Wiki-Artikel lesen', 'wiki'),
    ('wiki.create', 'Wiki-Artikel erstellen', 'wiki'),
    ('wiki.update', 'Wiki-Artikel bearbeiten', 'wiki'),
    ('wiki.delete', 'Wiki-Artikel löschen', 'wiki')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Grant all wiki permissions to admin role
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin' AND p.category = 'wiki'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);

  // Grant read and create to Fertigungsleiter
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Fertigungsleiter' AND p.name IN ('wiki.read', 'wiki.create', 'wiki.update')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);

  // Grant read and create to CNC-Programmierer
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'CNC-Programmierer' AND p.name IN ('wiki.read', 'wiki.create', 'wiki.update')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);

  // Grant read to Maschinenbediener
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Maschinenbediener' AND p.name = 'wiki.read'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM role_permissions WHERE permission_id IN (
      SELECT id FROM permissions WHERE category = 'wiki'
    );
  `);
  pgm.sql(`DELETE FROM permissions WHERE category = 'wiki';`);
};
