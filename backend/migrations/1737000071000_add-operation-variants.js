/* eslint-disable camelcase */
/**
 * Migration: Operation Variants
 * 
 * Ermöglicht das Erstellen von Maschinen-Varianten für Operationen.
 * Operationen mit gleicher variant_group_id sind austauschbare Alternativen.
 */

exports.up = (pgm) => {
  // 1. variant_group_id hinzufügen (UUID für Gruppierung)
  pgm.addColumns('operations', {
    variant_group_id: {
      type: 'uuid',
      default: null
    },
    is_variant_primary: {
      type: 'boolean',
      notNull: true,
      default: true
    }
  });

  // 2. Index für schnelle Varianten-Abfragen
  pgm.createIndex('operations', 'variant_group_id', {
    where: 'variant_group_id IS NOT NULL'
  });

  // 3. Bestehende Operationen: Wenn machine_id gesetzt, variant_group_id generieren
  // (Optional - macht bestehende OPs zu "Primär-Varianten")
  pgm.sql(`
    UPDATE operations 
    SET variant_group_id = gen_random_uuid()
    WHERE machine_id IS NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('operations', 'variant_group_id');
  pgm.dropColumns('operations', ['variant_group_id', 'is_variant_primary']);
};
