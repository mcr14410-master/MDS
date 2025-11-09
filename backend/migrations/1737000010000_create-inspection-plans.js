/**
 * Migration: Create Inspection Plans System
 * 
 * Creates tables for inspection plans (Prüfpläne/Messanweisungen)
 * - inspection_plans: One plan per operation
 * - inspection_plan_items: Individual inspection points
 * 
 * Week 12 - Phase 3
 */

exports.up = async (pgm) => {
  // ============================================
  // INSPECTION PLANS TABLE
  // ============================================
  pgm.createTable('inspection_plans', {
    id: {
      type: 'serial',
      primaryKey: true
    },
    operation_id: {
      type: 'integer',
      notNull: true,
      references: 'operations',
      onDelete: 'CASCADE'
    },
    notes: {
      type: 'text',
      notNull: false,
      comment: 'General notes for the inspection plan'
    },
    created_by: {
      type: 'integer',
      notNull: true,
      references: 'users'
    },
    updated_by: {
      type: 'integer',
      notNull: false,
      references: 'users'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Unique constraint: One inspection plan per operation
  pgm.createIndex('inspection_plans', 'operation_id', { unique: true });

  // ============================================
  // INSPECTION PLAN ITEMS TABLE
  // ============================================
  pgm.createTable('inspection_plan_items', {
    id: {
      type: 'serial',
      primaryKey: true
    },
    inspection_plan_id: {
      type: 'integer',
      notNull: true,
      references: 'inspection_plans',
      onDelete: 'CASCADE'
    },
    sequence_number: {
      type: 'integer',
      notNull: true,
      default: 1,
      comment: 'Display order of inspection items'
    },
    measurement_description: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'What to measure (e.g., "Bohrung Ø10")'
    },
    tolerance: {
      type: 'varchar(100)',
      notNull: false,
      comment: 'Tolerance specification (e.g., "±0.05", "H7")'
    },
    min_value: {
      type: 'decimal(10,4)',
      notNull: false,
      comment: 'Minimum acceptable value'
    },
    max_value: {
      type: 'decimal(10,4)',
      notNull: false,
      comment: 'Maximum acceptable value'
    },
    nominal_value: {
      type: 'decimal(10,4)',
      notNull: false,
      comment: 'Nominal/target value'
    },
    measuring_tool: {
      type: 'varchar(200)',
      notNull: false,
      comment: 'Required measuring equipment (e.g., "Messschieber 0-150mm")'
    },
    instruction: {
      type: 'text',
      notNull: false,
      comment: 'Special instructions for measurement'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Indexes
  pgm.createIndex('inspection_plan_items', 'inspection_plan_id');
  pgm.createIndex('inspection_plan_items', ['inspection_plan_id', 'sequence_number']);

  // Comments
  pgm.sql(`
    COMMENT ON TABLE inspection_plans IS 'Inspection plans for operations (Messanweisungen)';
    COMMENT ON TABLE inspection_plan_items IS 'Individual inspection points within a plan';
  `);
};

exports.down = async (pgm) => {
  pgm.dropTable('inspection_plan_items');
  pgm.dropTable('inspection_plans');
};
