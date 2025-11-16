/**
 * Migration: Update storage_items_with_stock view to filter is_deleted
 *
 * Recreates the view to exclude soft-deleted storage items
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Drop existing view
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');

  // Recreate view with is_deleted filter
  pgm.sql(`
    CREATE VIEW storage_items_with_stock AS
    SELECT
      si.*,
      tm.tool_number,
      tm.tool_name,
      tm.diameter,
      tm.material,
      tm.coating,
      tm.manufacturer,
      sc.name as compartment_name,
      sl.name as location_name,
      sl.building,
      sl.room,
      -- Calculate total stock
      (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
      (si.weight_new + si.weight_used + si.weight_reground) as total_weight,
      -- Check if low stock (only if alert is enabled)
      CASE
        WHEN si.enable_low_stock_alert = true AND si.min_quantity IS NOT NULL THEN
          (si.quantity_new + si.quantity_used + si.quantity_reground) <= si.min_quantity
        ELSE
          false
      END as is_low_stock,
      -- Calculate stock level percentage (0-100%)
      CASE
        WHEN si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE
          NULL
      END as stock_level_percent
    FROM storage_items si
    LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE si.is_deleted = false
      AND si.is_active = true
  `);

  pgm.sql(`
    COMMENT ON VIEW storage_items_with_stock IS 'Storage items with calculated stock information, excluding soft-deleted items';
  `);
};

exports.down = (pgm) => {
  // Drop view
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');

  // Recreate old view without is_deleted filter
  pgm.sql(`
    CREATE VIEW storage_items_with_stock AS
    SELECT
      si.*,
      tm.tool_number,
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
      CASE
        WHEN si.enable_low_stock_alert = true AND si.min_quantity IS NOT NULL THEN
          (si.quantity_new + si.quantity_used + si.quantity_reground) <= si.min_quantity
        ELSE
          false
      END as is_low_stock,
      CASE
        WHEN si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE
          NULL
      END as stock_level_percent
    FROM storage_items si
    LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE si.is_active = true
  `);
};
