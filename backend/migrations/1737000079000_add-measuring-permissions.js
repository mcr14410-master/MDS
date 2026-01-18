/**
 * Migration: Messmittel-Berechtigungen
 * 
 * Fügt eigene Berechtigungskategorie für Messmittelverwaltung hinzu
 */

exports.up = (pgm) => {
  // Messmittel-Berechtigungen einfügen
  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    ('measuring.view', 'Messmittel anzeigen', 'measuring'),
    ('measuring.create', 'Messmittel erstellen', 'measuring'),
    ('measuring.edit', 'Messmittel bearbeiten', 'measuring'),
    ('measuring.delete', 'Messmittel löschen', 'measuring'),
    ('measuring.calibrate', 'Kalibrierungen erfassen/bearbeiten', 'measuring'),
    ('measuring.checkout', 'Messmittel entnehmen/zurückgeben', 'measuring')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Admin-Rolle alle neuen Berechtigungen zuweisen
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Administrator'
    AND p.category = 'measuring'
    ON CONFLICT DO NOTHING;
  `);

  // Fertigungsleiter-Rolle alle neuen Berechtigungen zuweisen (falls vorhanden)
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Fertigungsleiter'
    AND p.category = 'measuring'
    ON CONFLICT DO NOTHING;
  `);

  // Meister-Rolle: view, calibrate, checkout (falls vorhanden)
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Meister'
    AND p.name IN ('measuring.view', 'measuring.calibrate', 'measuring.checkout')
    ON CONFLICT DO NOTHING;
  `);

  // Einrichter/Bediener-Rolle: view, checkout (falls vorhanden)
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name IN ('Einrichter', 'Bediener', 'Maschinenbediener')
    AND p.name IN ('measuring.view', 'measuring.checkout')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  // Berechtigungszuweisungen entfernen
  pgm.sql(`
    DELETE FROM role_permissions
    WHERE permission_id IN (
      SELECT id FROM permissions WHERE category = 'measuring'
    );
  `);

  // Berechtigungen entfernen
  pgm.sql(`
    DELETE FROM permissions WHERE category = 'measuring';
  `);
};
