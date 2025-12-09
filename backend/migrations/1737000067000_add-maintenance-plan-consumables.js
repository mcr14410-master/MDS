/**
 * Migration: Add Maintenance Plan Consumables
 * Verknüpfungstabelle für Wartungspläne und Verbrauchsmaterialien
 */

exports.up = async (pgm) => {
  // Verknüpfungstabelle für Wartungspläne und Verbrauchsmaterialien
  pgm.createTable('maintenance_plan_consumables', {
    id: { type: 'serial', primaryKey: true },
    maintenance_plan_id: {
      type: 'integer',
      notNull: true,
      references: '"maintenance_plans"',
      onDelete: 'CASCADE'
    },
    consumable_id: {
      type: 'integer',
      notNull: true,
      references: '"consumables"',
      onDelete: 'CASCADE'
    },
    quantity: {
      type: 'decimal(10,2)',
      notNull: false,
      comment: 'Benötigte Menge pro Wartung (optional)'
    },
    notes: {
      type: 'text',
      notNull: false,
      comment: 'Zusätzliche Hinweise'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    created_by: {
      type: 'integer',
      references: '"users"',
      onDelete: 'SET NULL'
    }
  });

  // Unique constraint - jedes Consumable nur einmal pro Plan
  pgm.addConstraint('maintenance_plan_consumables', 'uq_plan_consumable', {
    unique: ['maintenance_plan_id', 'consumable_id']
  });

  // Indices
  pgm.createIndex('maintenance_plan_consumables', 'maintenance_plan_id');
  pgm.createIndex('maintenance_plan_consumables', 'consumable_id');
};

exports.down = async (pgm) => {
  pgm.dropTable('maintenance_plan_consumables');
};
