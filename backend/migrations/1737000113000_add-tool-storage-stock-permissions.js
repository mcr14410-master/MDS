/* eslint-disable camelcase */

/**
 * Migration: Berechtigungen für Werkzeuge, Lagerorte und Bestand
 *
 * Die Routen verlangen tools.*, storage.* und stock.*, angelegt wurden diese
 * Berechtigungen bisher nur von scripts/init.sh. Eine nur per Migration aufgesetzte
 * DB (Dev, Tests) hatte sie nicht – auch der Admin bekam dort 403.
 *
 * Produktion: Die Berechtigungen gibt es dort schon (init.sh), ON CONFLICT lässt sie
 * unverändert. Zugewiesen wird nur der Rolle 'admin'; andere Rollen werden über die
 * Benutzerverwaltung gepflegt.
 */

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    ('tools.view', 'Werkzeuge anzeigen', 'tools'),
    ('tools.create', 'Werkzeuge anlegen', 'tools'),
    ('tools.edit', 'Werkzeuge bearbeiten', 'tools'),
    ('tools.delete', 'Werkzeuge löschen', 'tools'),
    ('tools.categories.manage', 'Werkzeugkategorien verwalten', 'tools'),
    ('tools.documents.upload', 'Werkzeugdokumente hochladen', 'tools'),
    ('tools.documents.delete', 'Werkzeugdokumente löschen', 'tools'),
    ('storage.view', 'Lagerorte anzeigen', 'storage'),
    ('storage.create', 'Lagerorte anlegen', 'storage'),
    ('storage.edit', 'Lagerorte bearbeiten', 'storage'),
    ('storage.delete', 'Lagerorte löschen', 'storage'),
    ('stock.issue', 'Bestand entnehmen', 'stock'),
    ('stock.receive', 'Bestand einbuchen', 'stock'),
    ('stock.transfer', 'Bestand umlagern', 'stock'),
    ('stock.adjust', 'Bestand korrigieren', 'stock'),
    ('stock.scrap', 'Bestand verschrotten', 'stock')
    ON CONFLICT (name) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin'
    AND split_part(p.name, '.', 1) IN ('tools', 'storage', 'stock')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = () => {
  // Bewusst leer: In Produktion bestanden die Berechtigungen schon vor dieser Migration
  // (scripts/init.sh) und sind Rollen zugewiesen – ein DELETE würde dort Rechte entziehen.
};
