/**
 * Migration: Fix storage_items_with_stock VIEW - Roadmap Conform
 * 
 * Changes:
 * - Add effective_stock calculation with weights (new=1.0, used=0.5, reground=0.8)
 * - Use reorder_point instead of min_quantity for low stock check
 * - Add effective_stock_percent based on reorder_point
 * - Keep backward compatibility with existing columns
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Drop old view
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');

  // Recreate with effective stock calculation and reorder_point
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
      
      -- Total quantity (simple sum)
      (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
      
      -- Total weight
      (si.weight_new + si.weight_used + si.weight_reground) as total_weight,
      
      -- Effective stock (weighted: new=1.0, used=0.5, reground=0.8) - ROADMAP CONFORM
      (
        si.quantity_new * COALESCE(si.weight_new, 1.0) + 
        si.quantity_used * COALESCE(si.weight_used, 0.5) + 
        si.quantity_reground * COALESCE(si.weight_reground, 0.8)
      ) as effective_stock,
      
      -- Low stock check (uses reorder_point and enable_low_stock_alert) - ROADMAP CONFORM
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
      
      -- Stock level percentage based on max_quantity (0-100%)
      CASE
        WHEN si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE
          NULL
      END as stock_level_percent,
      
      -- Effective stock percentage based on reorder_point (how much above reorder point)
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

  pgm.sql(`
    COMMENT ON VIEW storage_items_with_stock IS 
    'Storage items with calculated stock information (roadmap-conform: uses effective_stock with weights and reorder_point for low stock alerts)';
  `);
};

exports.down = (pgm) => {
  // Drop updated view
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');

  // Recreate old view (simple calculation, min_quantity)
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
    WHERE si.deleted_at IS NULL
      AND si.is_active = true
  `);
};
