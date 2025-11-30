/**
 * Migration: Add reference_image to maintenance_checklist_items
 * Für Referenzbilder bei der Wartungsplan-Erstellung
 */

exports.up = pgm => {
  // Referenzbild für Checklist-Items
  pgm.addColumn('maintenance_checklist_items', {
    reference_image: { type: 'varchar(500)' }
  });

  // Optionales Referenzbild für den gesamten Wartungsplan
  pgm.addColumn('maintenance_plans', {
    reference_image: { type: 'varchar(500)' }
  });
};

exports.down = pgm => {
  pgm.dropColumn('maintenance_checklist_items', 'reference_image');
  pgm.dropColumn('maintenance_plans', 'reference_image');
};
