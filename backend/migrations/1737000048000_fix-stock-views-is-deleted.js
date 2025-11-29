/**
 * Migration: Fix Stock Views - is_deleted Filter hinzufügen
 * 
 * Korrigiert die Bestandsberechnung in Views, die soft-deleted storage_items ausschließen sollen
 */

exports.up = pgm => {
  // ============================================================================
  // 1. clamping_devices_with_stock View korrigieren
  // ============================================================================
  pgm.dropView('clamping_devices_with_stock', { ifExists: true });
  
  pgm.createView('clamping_devices_with_stock', {}, `
    SELECT 
      cd.*,
      cdt.name AS type_name,
      cdt.icon AS type_icon,
      m.name AS machine_name,
      s.name AS supplier_name,
      
      -- Gesamtbestand aus storage_items (nur nicht-gelöschte)
      COALESCE(stock.total_quantity, 0) AS total_stock,
      COALESCE(stock.location_count, 0) AS storage_location_count
      
    FROM clamping_devices cd
    LEFT JOIN clamping_device_types cdt ON cd.type_id = cdt.id
    LEFT JOIN machines m ON cd.machine_id = m.id
    LEFT JOIN suppliers s ON cd.supplier_id = s.id
    LEFT JOIN LATERAL (
      SELECT 
        SUM(si.quantity_new + si.quantity_used + si.quantity_reground) AS total_quantity,
        COUNT(DISTINCT si.compartment_id) AS location_count
      FROM storage_items si 
      WHERE si.clamping_device_id = cd.id
        AND si.is_deleted = false
    ) stock ON true
    WHERE cd.deleted_at IS NULL
  `);

  // ============================================================================
  // 2. fixtures_with_stock View korrigieren (falls gleicher Fehler)
  // ============================================================================
  pgm.dropView('fixtures_with_stock', { ifExists: true });
  
  pgm.createView('fixtures_with_stock', {}, `
    SELECT 
      f.*,
      ft.name as type_name,
      ft.icon as type_icon,
      p.part_number,
      p.part_name,
      o.op_number,
      o.op_name as operation_name,
      m.name as machine_name,
      creator.username as created_by_name,
      updater.username as updated_by_name,
      COALESCE(stock.total_quantity, 0) as total_stock,
      COALESCE(stock.location_count, 0) as storage_location_count
    FROM fixtures f
    LEFT JOIN fixture_types ft ON ft.id = f.type_id
    LEFT JOIN parts p ON p.id = f.part_id
    LEFT JOIN operations o ON o.id = f.operation_id
    LEFT JOIN machines m ON m.id = f.machine_id
    LEFT JOIN users creator ON creator.id = f.created_by
    LEFT JOIN users updater ON updater.id = f.updated_by
    LEFT JOIN (
      SELECT 
        fixture_id,
        SUM(quantity_new + quantity_used + quantity_reground) as total_quantity,
        COUNT(DISTINCT compartment_id) as location_count
      FROM storage_items
      WHERE fixture_id IS NOT NULL 
        AND is_deleted = false
      GROUP BY fixture_id
    ) stock ON stock.fixture_id = f.id
    WHERE f.deleted_at IS NULL
  `);
};

exports.down = pgm => {
  // Alte Views wiederherstellen (ohne is_deleted Filter)
  pgm.dropView('clamping_devices_with_stock', { ifExists: true });
  
  pgm.createView('clamping_devices_with_stock', {}, `
    SELECT 
      cd.*,
      cdt.name AS type_name,
      cdt.icon AS type_icon,
      m.name AS machine_name,
      s.name AS supplier_name,
      
      COALESCE(stock.total_quantity, 0) AS total_stock,
      COALESCE(stock.location_count, 0) AS storage_location_count
      
    FROM clamping_devices cd
    LEFT JOIN clamping_device_types cdt ON cd.type_id = cdt.id
    LEFT JOIN machines m ON cd.machine_id = m.id
    LEFT JOIN suppliers s ON cd.supplier_id = s.id
    LEFT JOIN LATERAL (
      SELECT 
        SUM(si.quantity_new + si.quantity_used + si.quantity_reground) AS total_quantity,
        COUNT(DISTINCT si.compartment_id) AS location_count
      FROM storage_items si 
      WHERE si.clamping_device_id = cd.id
    ) stock ON true
    WHERE cd.deleted_at IS NULL
  `);

  pgm.dropView('fixtures_with_stock', { ifExists: true });
  
  pgm.createView('fixtures_with_stock', {}, `
    SELECT 
      f.*,
      ft.name as type_name,
      ft.icon as type_icon,
      p.part_number,
      p.part_name,
      o.op_number,
      o.op_name as operation_name,
      m.name as machine_name,
      creator.username as created_by_name,
      updater.username as updated_by_name,
      COALESCE(stock.total_quantity, 0) as total_stock,
      COALESCE(stock.location_count, 0) as storage_location_count
    FROM fixtures f
    LEFT JOIN fixture_types ft ON ft.id = f.type_id
    LEFT JOIN parts p ON p.id = f.part_id
    LEFT JOIN operations o ON o.id = f.operation_id
    LEFT JOIN machines m ON m.id = f.machine_id
    LEFT JOIN users creator ON creator.id = f.created_by
    LEFT JOIN users updater ON updater.id = f.updated_by
    LEFT JOIN (
      SELECT 
        fixture_id,
        SUM(quantity_new + quantity_used + quantity_reground) as total_quantity,
        COUNT(DISTINCT compartment_id) as location_count
      FROM storage_items
      WHERE fixture_id IS NOT NULL 
        AND deleted_at IS NULL 
        AND is_active = true
      GROUP BY fixture_id
    ) stock ON stock.fixture_id = f.id
    WHERE f.deleted_at IS NULL
  `);
};
