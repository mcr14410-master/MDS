/**
 * Migration: Create tool_compatible_inserts table
 *
 * Maps relationships between tools and compatible inserts (Wendeschneidplatten)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create tool_compatible_inserts table
  pgm.createTable('tool_compatible_inserts', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    tool_master_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_master',
      onDelete: 'CASCADE',
      comment: 'The tool that uses the insert',
    },
    insert_tool_master_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_master',
      onDelete: 'CASCADE',
      comment: 'The insert (must be item_type = insert)',
    },
    is_preferred: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'True if this is the preferred/recommended insert, false for alternatives',
    },
    quantity_per_tool: {
      type: 'integer',
      notNull: true,
      default: 1,
      comment: 'Number of inserts required per tool',
    },
    notes: {
      type: 'text',
      notNull: false,
      comment: 'Optional notes about this compatibility (e.g., position, special requirements)',
    },
    created_by: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    is_deleted: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Soft delete flag',
    },
    deleted_at: {
      type: 'timestamp',
      notNull: false,
    },
    deleted_by: {
      type: 'integer',
      notNull: false,
      references: 'users',
      onDelete: 'SET NULL',
    },
  });

  // Add indexes
  pgm.createIndex('tool_compatible_inserts', 'tool_master_id');
  pgm.createIndex('tool_compatible_inserts', 'insert_tool_master_id');
  pgm.createIndex('tool_compatible_inserts', ['tool_master_id', 'is_preferred']);
  pgm.createIndex('tool_compatible_inserts', ['is_deleted', 'tool_master_id']);

  // Add unique constraint to prevent duplicate mappings
  pgm.addConstraint('tool_compatible_inserts', 'tool_compatible_inserts_unique_mapping', {
    unique: ['tool_master_id', 'insert_tool_master_id', 'is_deleted'],
  });

  // Add constraint for quantity_per_tool
  pgm.addConstraint('tool_compatible_inserts', 'tool_compatible_inserts_quantity_check', {
    check: 'quantity_per_tool > 0 AND quantity_per_tool <= 1000',
  });

  // Add constraint to prevent self-reference
  pgm.addConstraint('tool_compatible_inserts', 'tool_compatible_inserts_no_self_reference', {
    check: 'tool_master_id != insert_tool_master_id',
  });

  // Add comment to table
  pgm.sql(`
    COMMENT ON TABLE tool_compatible_inserts IS 'Compatibility mapping between tools and their compatible inserts (Wendeschneidplatten)';
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('tool_compatible_inserts');
};
