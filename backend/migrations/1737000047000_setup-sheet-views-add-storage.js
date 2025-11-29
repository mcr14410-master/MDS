/**
 * Migration: Setup Sheet Views mit Lagerort erweitern
 * 
 * Erweitert die Views für Spannmittel und Vorrichtungen um Lagerort-Informationen
 */

exports.up = pgm => {
  // Drop alte Views
  pgm.dropView('setup_sheet_clamping_devices_view', { ifExists: true });
  pgm.dropView('setup_sheet_fixtures_view', { ifExists: true });
  
  // View: Setup Sheet Spannmittel mit Details + alle Lagerorte
  pgm.createView('setup_sheet_clamping_devices_view', {}, `
    SELECT 
      sscd.id,
      sscd.setup_sheet_id,
      sscd.clamping_device_id,
      sscd.quantity,
      sscd.notes,
      sscd.sort_order,
      sscd.created_at,
      cd.inventory_number,
      cd.name as clamping_device_name,
      cd.status as clamping_device_status,
      cdt.name as type_name,
      cdt.icon as type_icon,
      u.username as created_by_name,
      -- Alle Lagerorte als JSON Array
      (
        SELECT COALESCE(json_agg(json_build_object(
          'location_code', sl.code,
          'location_name', sl.name,
          'compartment_code', sc.code,
          'compartment_name', sc.name,
          'quantity_total', si.quantity_new + si.quantity_used + si.quantity_reground
        ) ORDER BY (si.quantity_new + si.quantity_used + si.quantity_reground) DESC), '[]'::json)
        FROM storage_items si
        JOIN storage_compartments sc ON sc.id = si.compartment_id
        JOIN storage_locations sl ON sl.id = sc.location_id
        WHERE si.clamping_device_id = cd.id
          AND si.is_deleted = false
          AND (si.quantity_new + si.quantity_used + si.quantity_reground) > 0
      ) as storage_locations
    FROM setup_sheet_clamping_devices sscd
    JOIN clamping_devices cd ON cd.id = sscd.clamping_device_id
    LEFT JOIN clamping_device_types cdt ON cdt.id = cd.type_id
    LEFT JOIN users u ON u.id = sscd.created_by
    WHERE cd.deleted_at IS NULL
  `);

  // View: Setup Sheet Vorrichtungen mit Details + alle Lagerorte
  pgm.createView('setup_sheet_fixtures_view', {}, `
    SELECT 
      ssf.id,
      ssf.setup_sheet_id,
      ssf.fixture_id,
      ssf.quantity,
      ssf.notes,
      ssf.sort_order,
      ssf.created_at,
      f.fixture_number,
      f.name as fixture_name,
      f.status as fixture_status,
      ft.name as type_name,
      ft.icon as type_icon,
      u.username as created_by_name,
      -- Alle Lagerorte als JSON Array
      (
        SELECT COALESCE(json_agg(json_build_object(
          'location_code', sl.code,
          'location_name', sl.name,
          'compartment_code', sc.code,
          'compartment_name', sc.name,
          'quantity_total', si.quantity_new + si.quantity_used + si.quantity_reground
        ) ORDER BY (si.quantity_new + si.quantity_used + si.quantity_reground) DESC), '[]'::json)
        FROM storage_items si
        JOIN storage_compartments sc ON sc.id = si.compartment_id
        JOIN storage_locations sl ON sl.id = sc.location_id
        WHERE si.fixture_id = f.id
          AND si.is_deleted = false
          AND (si.quantity_new + si.quantity_used + si.quantity_reground) > 0
      ) as storage_locations
    FROM setup_sheet_fixtures ssf
    JOIN fixtures f ON f.id = ssf.fixture_id
    LEFT JOIN fixture_types ft ON ft.id = f.type_id
    LEFT JOIN users u ON u.id = ssf.created_by
    WHERE f.deleted_at IS NULL
  `);
};

exports.down = pgm => {
  // Drop erweiterte Views
  pgm.dropView('setup_sheet_clamping_devices_view', { ifExists: true });
  pgm.dropView('setup_sheet_fixtures_view', { ifExists: true });
  
  // Original Views wiederherstellen
  pgm.createView('setup_sheet_clamping_devices_view', {}, `
    SELECT 
      sscd.id,
      sscd.setup_sheet_id,
      sscd.clamping_device_id,
      sscd.quantity,
      sscd.notes,
      sscd.sort_order,
      sscd.created_at,
      cd.inventory_number,
      cd.name as clamping_device_name,
      cd.status as clamping_device_status,
      cdt.name as type_name,
      cdt.icon as type_icon,
      u.username as created_by_name
    FROM setup_sheet_clamping_devices sscd
    JOIN clamping_devices cd ON cd.id = sscd.clamping_device_id
    LEFT JOIN clamping_device_types cdt ON cdt.id = cd.type_id
    LEFT JOIN users u ON u.id = sscd.created_by
    WHERE cd.deleted_at IS NULL
  `);

  pgm.createView('setup_sheet_fixtures_view', {}, `
    SELECT 
      ssf.id,
      ssf.setup_sheet_id,
      ssf.fixture_id,
      ssf.quantity,
      ssf.notes,
      ssf.sort_order,
      ssf.created_at,
      f.fixture_number,
      f.name as fixture_name,
      f.status as fixture_status,
      ft.name as type_name,
      ft.icon as type_icon,
      u.username as created_by_name
    FROM setup_sheet_fixtures ssf
    JOIN fixtures f ON f.id = ssf.fixture_id
    LEFT JOIN fixture_types ft ON ft.id = f.type_id
    LEFT JOIN users u ON u.id = ssf.created_by
    WHERE f.deleted_at IS NULL
  `);
};
