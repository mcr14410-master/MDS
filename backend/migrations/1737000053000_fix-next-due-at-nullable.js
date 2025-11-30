'use strict';

exports.up = async (pgm) => {
  // Allow NULL for next_due_at (needed for operating-hours-based plans)
  pgm.alterColumn('maintenance_plans', 'next_due_at', {
    notNull: false
  });

  // Update existing operating-hours-based plans to have NULL next_due_at
  pgm.sql(`
    UPDATE maintenance_plans 
    SET next_due_at = NULL 
    WHERE interval_hours IS NOT NULL 
      AND (interval_type IS NULL OR interval_value IS NULL)
  `);
};

exports.down = async (pgm) => {
  // Set a far-future date for any NULL values before adding constraint back
  pgm.sql(`
    UPDATE maintenance_plans 
    SET next_due_at = '2099-12-31'::timestamp 
    WHERE next_due_at IS NULL
  `);

  pgm.alterColumn('maintenance_plans', 'next_due_at', {
    notNull: true
  });
};
