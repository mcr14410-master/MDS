/**
 * Migration: Add soft delete columns to tool_master
 *
 * Adds is_deleted, deleted_at, deleted_by columns for consistent soft delete pattern
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add soft delete columns
  pgm.addColumns('tool_master', {
    is_deleted: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Soft delete flag',
    },
    deleted_at: {
      type: 'timestamp',
      notNull: false,
      comment: 'Timestamp when record was soft deleted',
    },
    deleted_by: {
      type: 'integer',
      notNull: false,
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'User who soft deleted the record',
    },
  });

  // Add index for better query performance
  pgm.createIndex('tool_master', ['is_deleted', 'is_active']);
  
  // Add index for deleted records
  pgm.createIndex('tool_master', 'deleted_at');

  // Add comment
  pgm.sql(`
    COMMENT ON COLUMN tool_master.is_deleted IS 'Soft delete flag - true if record is deleted but kept for audit';
    COMMENT ON COLUMN tool_master.deleted_at IS 'Timestamp when the tool was soft deleted';
    COMMENT ON COLUMN tool_master.deleted_by IS 'User ID who performed the soft delete';
  `);
};

exports.down = (pgm) => {
  // Drop indexes first
  pgm.dropIndex('tool_master', 'deleted_at', { ifExists: true });
  pgm.dropIndex('tool_master', ['is_deleted', 'is_active'], { ifExists: true });
  
  // Drop columns
  pgm.dropColumns('tool_master', ['is_deleted', 'deleted_at', 'deleted_by'], { ifExists: true });
};
