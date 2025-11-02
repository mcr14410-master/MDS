/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add status field to parts table
  pgm.addColumn('parts', {
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'draft'
    }
  });

  // Add updated_by field to parts table
  pgm.addColumn('parts', {
    updated_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    }
  });

  // Add cad_file_path field to parts table
  pgm.addColumn('parts', {
    cad_file_path: {
      type: 'varchar(500)'
    }
  });

  // Create index for status field (for filtering)
  pgm.createIndex('parts', 'status');

  // Set existing parts to 'active' status based on is_active flag
  pgm.sql(`
    UPDATE parts 
    SET status = CASE 
      WHEN is_active = true THEN 'active'
      ELSE 'archived'
    END
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('parts', 'cad_file_path');
  pgm.dropColumn('parts', 'updated_by');
  pgm.dropColumn('parts', 'status');
};
