/**
 * Migration: Add mean_value column to inspection_plan_items
 * 
 * Adds mean_value column to store calculated mean/center value
 * separately from nominal_value (which is used for tolerance calculation input)
 * 
 * Week 12 - Tolerance Calculation Enhancement
 */

exports.up = async (pgm) => {
  // Add mean_value column
  pgm.addColumn('inspection_plan_items', {
    mean_value: {
      type: 'decimal(10,4)',
      notNull: false,
      comment: 'Calculated mean/center value between min and max'
    }
  });

  // Add comment
  pgm.sql(`
    COMMENT ON COLUMN inspection_plan_items.mean_value IS 'Calculated mean value (min + max) / 2';
  `);
};

exports.down = async (pgm) => {
  pgm.dropColumn('inspection_plan_items', 'mean_value');
};
