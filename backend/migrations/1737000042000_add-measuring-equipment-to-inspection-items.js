/**
 * Migration: Add measuring equipment reference to inspection plan items
 * 
 * Adds foreign key to measuring_equipment for proper equipment tracking
 * while keeping the text field for backward compatibility
 */

exports.up = async (pgm) => {
  // Add measuring_equipment_id column
  pgm.addColumn('inspection_plan_items', {
    measuring_equipment_id: {
      type: 'integer',
      notNull: false,
      references: 'measuring_equipment',
      onDelete: 'SET NULL',
      comment: 'Reference to specific measuring equipment'
    }
  });

  // Add index for faster lookups
  pgm.createIndex('inspection_plan_items', 'measuring_equipment_id');
};

exports.down = async (pgm) => {
  pgm.dropIndex('inspection_plan_items', 'measuring_equipment_id');
  pgm.dropColumn('inspection_plan_items', 'measuring_equipment_id');
};
