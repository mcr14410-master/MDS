/**
 * Migration: Add measuring equipment support to storage_items
 * 
 * Extends the storage system to support measuring equipment alongside tools.
 * Messmittel werden als Einzelstücke gelagert (quantity=1), nicht nach Zustand.
 * 
 * Changes:
 * - Add measuring_equipment_id FK
 * - Extend item_type constraint to include 'measuring_equipment'
 * - Add unique constraint for measuring equipment per compartment
 * - Update view to include measuring equipment info
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Add measuring_equipment_id column
  pgm.addColumn('storage_items', {
    measuring_equipment_id: {
      type: 'integer',
      references: 'measuring_equipment',
      onDelete: 'CASCADE',
      comment: 'Referenz zu measuring_equipment (bei item_type=measuring_equipment)'
    }
  });

  // 2. Create index for measuring_equipment_id
  pgm.createIndex('storage_items', 'measuring_equipment_id');

  // 3. Drop old item_type constraint
  pgm.dropConstraint('storage_items', 'check_item_type');

  // 4. Add new item_type constraint including measuring_equipment
  pgm.addConstraint('storage_items', 'check_item_type', {
    check: "item_type IN ('tool', 'insert', 'accessory', 'measuring_equipment')"
  });

  // 5. Add unique constraint: one measuring equipment per compartment
  pgm.addConstraint('storage_items', 'unique_measuring_equipment_per_compartment', {
    unique: ['measuring_equipment_id', 'compartment_id']
  });

  // 6. Add XOR constraint: either tool_master_id OR measuring_equipment_id, not both
  pgm.addConstraint('storage_items', 'check_single_item_reference', {
    check: `(
      (item_type IN ('tool', 'insert', 'accessory') AND tool_master_id IS NOT NULL AND measuring_equipment_id IS NULL)
      OR
      (item_type = 'measuring_equipment' AND measuring_equipment_id IS NOT NULL AND tool_master_id IS NULL)
    )`
  });

  // 7. Drop and recreate view with measuring equipment support
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');

  pgm.sql(`
    CREATE VIEW storage_items_with_stock AS
    SELECT
      si.*,
      
      -- Tool info (for tools/inserts/accessories)
      tm.article_number,
      tm.tool_name,
      tm.diameter,
      tm.material,
      tm.coating,
      tm.manufacturer as tool_manufacturer,
      
      -- Measuring equipment info (for measuring_equipment)
      me.inventory_number as equipment_inventory_number,
      me.name as equipment_name,
      me.calibration_status as equipment_calibration_status,
      me.next_calibration_date as equipment_next_calibration,
      me.status as equipment_status,
      me.manufacturer as equipment_manufacturer,
      met.name as equipment_type_name,
      
      -- Active checkout info for measuring equipment
      mec.id as equipment_checkout_id,
      mec.checked_out_by,
      checkout_user.username as checked_out_by_name,
      mec.checked_out_at,
      mec.purpose as checkout_purpose,
      
      -- Storage location info
      sc.name as compartment_name,
      sc.code as compartment_code,
      sl.name as location_name,
      sl.code as location_code,
      sl.building,
      sl.room,
      
      -- Total quantity (simple sum) - for tools
      (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
      
      -- Effective stock (weighted) - for tools
      CASE 
        WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN
          (
            si.quantity_new * COALESCE(si.weight_new, 1.0) + 
            si.quantity_used * COALESCE(si.weight_used, 0.5) + 
            si.quantity_reground * COALESCE(si.weight_reground, 0.8)
          )
        ELSE
          1  -- Messmittel = immer 1
      END as effective_stock,
      
      -- Low stock check - for tools only
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory') 
          AND si.enable_low_stock_alert = true 
          AND si.reorder_point IS NOT NULL THEN
          (
            si.quantity_new * COALESCE(si.weight_new, 1.0) + 
            si.quantity_used * COALESCE(si.weight_used, 0.5) + 
            si.quantity_reground * COALESCE(si.weight_reground, 0.8)
          ) <= si.reorder_point
        ELSE
          false
      END as is_low_stock,
      
      -- Stock level percentage - for tools
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory')
          AND si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE
          NULL
      END as stock_level_percent,
      
      -- Is measuring equipment checked out?
      CASE
        WHEN si.item_type = 'measuring_equipment' AND mec.id IS NOT NULL THEN true
        ELSE false
      END as is_checked_out
      
    FROM storage_items si
    LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
    LEFT JOIN measuring_equipment_with_status me ON me.id = si.measuring_equipment_id
    LEFT JOIN measuring_equipment_types met ON met.id = me.type_id
    LEFT JOIN measuring_equipment_checkouts mec ON mec.equipment_id = si.measuring_equipment_id 
      AND mec.returned_at IS NULL
    LEFT JOIN users checkout_user ON checkout_user.id = mec.checked_out_by
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE si.deleted_at IS NULL
      AND si.is_active = true
  `);

  pgm.sql(`
    COMMENT ON VIEW storage_items_with_stock IS 
    'Storage items with calculated stock information, supports both tools and measuring equipment';
  `);
};

exports.down = (pgm) => {
  // Recreate old view
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');

  pgm.sql(`
    CREATE VIEW storage_items_with_stock AS
    SELECT
      si.*,
      tm.article_number,
      tm.tool_name,
      tm.diameter,
      tm.material,
      tm.coating,
      tm.manufacturer,
      sc.name as compartment_name,
      sl.name as location_name,
      sl.building,
      sl.room,
      (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
      (si.weight_new + si.weight_used + si.weight_reground) as total_weight,
      (
        si.quantity_new * COALESCE(si.weight_new, 1.0) + 
        si.quantity_used * COALESCE(si.weight_used, 0.5) + 
        si.quantity_reground * COALESCE(si.weight_reground, 0.8)
      ) as effective_stock,
      CASE
        WHEN si.enable_low_stock_alert = true AND si.reorder_point IS NOT NULL THEN
          (
            si.quantity_new * COALESCE(si.weight_new, 1.0) + 
            si.quantity_used * COALESCE(si.weight_used, 0.5) + 
            si.quantity_reground * COALESCE(si.weight_reground, 0.8)
          ) <= si.reorder_point
        ELSE
          false
      END as is_low_stock,
      CASE
        WHEN si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE
          NULL
      END as stock_level_percent,
      CASE
        WHEN si.reorder_point IS NOT NULL AND si.reorder_point > 0 THEN
          ROUND((
            (
              si.quantity_new * COALESCE(si.weight_new, 1.0) + 
              si.quantity_used * COALESCE(si.weight_used, 0.5) + 
              si.quantity_reground * COALESCE(si.weight_reground, 0.8)
            )::numeric / si.reorder_point::numeric
          ) * 100, 2)
        ELSE
          NULL
      END as effective_stock_percent
    FROM storage_items si
    LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE si.deleted_at IS NULL
      AND si.is_active = true
  `);

  // Drop constraints
  pgm.dropConstraint('storage_items', 'check_single_item_reference', { ifExists: true });
  pgm.dropConstraint('storage_items', 'unique_measuring_equipment_per_compartment', { ifExists: true });

  // Restore old item_type constraint
  pgm.dropConstraint('storage_items', 'check_item_type');
  pgm.addConstraint('storage_items', 'check_item_type', {
    check: "item_type IN ('tool', 'insert', 'accessory')"
  });

  // Drop index and column
  pgm.dropIndex('storage_items', 'measuring_equipment_id', { ifExists: true });
  pgm.dropColumn('storage_items', 'measuring_equipment_id');
};
