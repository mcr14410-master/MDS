/* eslint-disable camelcase */

/**
 * Migration: Dynamic role limits for vacation overlap check
 * 
 * Replaces hardcoded max_concurrent_helper/operator settings
 * with a flexible role-based configuration
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create role limits table
  pgm.createTable('vacation_role_limits', {
    id: 'id',
    role_id: {
      type: 'integer',
      notNull: true,
      references: 'roles',
      onDelete: 'CASCADE'
    },
    max_concurrent: {
      type: 'integer',
      notNull: true,
      default: 1
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Unique constraint - one limit per role
  pgm.addConstraint('vacation_role_limits', 'vacation_role_limits_role_id_unique', {
    unique: ['role_id']
  });

  // Migrate existing settings to new table (if roles exist)
  pgm.sql(`
    INSERT INTO vacation_role_limits (role_id, max_concurrent)
    SELECT r.id, 1
    FROM roles r
    WHERE LOWER(r.name) IN ('helper', 'helfer', 'operator', 'maschinenbediener')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('vacation_role_limits');
};
