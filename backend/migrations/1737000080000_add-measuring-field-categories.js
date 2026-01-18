/**
 * Migration: Messmittel Feld-Kategorien und Gewinde-Felder
 * 
 * Fügt field_category zu Typen hinzu und erweitert Messmittel um Gewinde-Felder
 */

exports.up = (pgm) => {
  // 1. field_category zu measuring_equipment_types hinzufügen
  pgm.addColumn('measuring_equipment_types', {
    field_category: {
      type: 'varchar(30)',
      default: 'measuring_instrument',
      notNull: true,
      comment: 'Bestimmt welche Felder angezeigt werden: measuring_instrument, gauge, thread_gauge, gauge_block, angle_gauge, surface_tester, other'
    }
  });

  // 2. Neue Felder für Gewinde zu measuring_equipment hinzufügen
  pgm.addColumns('measuring_equipment', {
    thread_standard: {
      type: 'varchar(20)',
      comment: 'Gewindenorm: M, MF, UNC, UNF, UNEF, UN, G, R, Rp, NPT, NPTF, Tr, ACME, Pg, Rd'
    },
    thread_size: {
      type: 'varchar(30)',
      comment: 'Gewindegröße: z.B. M8, 1/4, G1/2'
    },
    thread_pitch: {
      type: 'varchar(20)',
      comment: 'Steigung: z.B. 1.0, 1.25, 20 TPI'
    },
    accuracy_class: {
      type: 'varchar(10)',
      comment: 'Genauigkeitsklasse für Endmaße: 0, 1, 2, K'
    }
  });

  // 3. Bestehende Typen mit passender field_category updaten
  pgm.sql(`
    UPDATE measuring_equipment_types SET field_category = 'measuring_instrument' 
    WHERE name IN ('Messschieber', 'Bügelmessschraube', 'Innenmessschraube', 'Messuhr', 'Tiefenmaß', 'Höhenmessgerät', 'Koordinatenmessgerät');
  `);

  pgm.sql(`
    UPDATE measuring_equipment_types SET field_category = 'gauge' 
    WHERE name IN ('Lehrdorn', 'Lehrring', 'Grenzrachenlehre', 'Prüfstift');
  `);

  pgm.sql(`
    UPDATE measuring_equipment_types SET field_category = 'thread_gauge' 
    WHERE name IN ('Gewindelehrdorn', 'Gewindelehrring');
  `);

  pgm.sql(`
    UPDATE measuring_equipment_types SET field_category = 'gauge_block' 
    WHERE name IN ('Endmaß');
  `);

  pgm.sql(`
    UPDATE measuring_equipment_types SET field_category = 'angle_gauge' 
    WHERE name IN ('Winkelmesser');
  `);

  pgm.sql(`
    UPDATE measuring_equipment_types SET field_category = 'surface_tester' 
    WHERE name IN ('Oberflächenmessgerät');
  `);

  pgm.sql(`
    UPDATE measuring_equipment_types SET field_category = 'other' 
    WHERE name IN ('Sonstiges', 'Fühlerlehre');
  `);

  // 4. Views neu erstellen - in korrekter Reihenfolge wegen Abhängigkeiten
  // Erst abhängige View droppen, dann Basis-View, dann beide neu erstellen
  pgm.sql(`DROP VIEW IF EXISTS storage_items_with_stock`);
  pgm.sql(`DROP VIEW IF EXISTS measuring_equipment_with_status`);
  
  // measuring_equipment_with_status neu erstellen (mit field_category)
  pgm.sql(`
    CREATE VIEW measuring_equipment_with_status AS
    SELECT 
      me.*,
      met.name AS type_name,
      met.icon AS type_icon,
      met.field_category AS type_field_category,
      sl.name AS storage_location_name,
      sl.code AS storage_location_code,
      s.name AS supplier_name,
      
      -- Berechneter Kalibrierungsstatus
      CASE
        WHEN me.status = 'locked' THEN 'locked'
        WHEN me.status = 'retired' THEN 'retired'
        WHEN me.status = 'in_calibration' THEN 'in_calibration'
        WHEN me.status = 'repair' THEN 'repair'
        WHEN me.next_calibration_date IS NULL THEN 'unknown'
        WHEN me.next_calibration_date < CURRENT_DATE THEN 'overdue'
        WHEN me.next_calibration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'ok'
      END AS calibration_status,
      
      -- Tage bis zur nächsten Kalibrierung (negativ = überfällig)
      CASE
        WHEN me.next_calibration_date IS NOT NULL 
        THEN (me.next_calibration_date - CURRENT_DATE)
        ELSE NULL
      END AS days_until_calibration,
      
      -- Letzte Kalibrierung
      lc.last_calibration_result,
      lc.last_calibration_provider,
      lc.last_calibration_certificate_number,
      
      -- Zähler
      (SELECT COUNT(*) FROM calibrations c WHERE c.equipment_id = me.id) AS calibration_count
      
    FROM measuring_equipment me
    LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
    LEFT JOIN storage_locations sl ON me.storage_location_id = sl.id
    LEFT JOIN suppliers s ON me.supplier_id = s.id
    LEFT JOIN LATERAL (
      SELECT 
        result AS last_calibration_result,
        calibration_provider AS last_calibration_provider,
        certificate_number AS last_calibration_certificate_number
      FROM calibrations
      WHERE equipment_id = me.id
      ORDER BY calibration_date DESC
      LIMIT 1
    ) lc ON true
    WHERE me.deleted_at IS NULL
  `);

  // storage_items_with_stock neu erstellen (abhängig von measuring_equipment_with_status)
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
};

exports.down = (pgm) => {
  // Views in korrekter Reihenfolge droppen und neu erstellen
  pgm.sql(`DROP VIEW IF EXISTS storage_items_with_stock`);
  pgm.sql(`DROP VIEW IF EXISTS measuring_equipment_with_status`);
  
  // measuring_equipment_with_status ohne field_category neu erstellen
  pgm.sql(`
    CREATE VIEW measuring_equipment_with_status AS
    SELECT 
      me.*,
      met.name AS type_name,
      met.icon AS type_icon,
      sl.name AS storage_location_name,
      sl.code AS storage_location_code,
      s.name AS supplier_name,
      CASE
        WHEN me.status = 'locked' THEN 'locked'
        WHEN me.status = 'retired' THEN 'retired'
        WHEN me.status = 'in_calibration' THEN 'in_calibration'
        WHEN me.status = 'repair' THEN 'repair'
        WHEN me.next_calibration_date IS NULL THEN 'unknown'
        WHEN me.next_calibration_date < CURRENT_DATE THEN 'overdue'
        WHEN me.next_calibration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'ok'
      END AS calibration_status,
      CASE
        WHEN me.next_calibration_date IS NOT NULL 
        THEN (me.next_calibration_date - CURRENT_DATE)
        ELSE NULL
      END AS days_until_calibration,
      lc.last_calibration_result,
      lc.last_calibration_provider,
      lc.last_calibration_certificate_number,
      (SELECT COUNT(*) FROM calibrations c WHERE c.equipment_id = me.id) AS calibration_count
    FROM measuring_equipment me
    LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
    LEFT JOIN storage_locations sl ON me.storage_location_id = sl.id
    LEFT JOIN suppliers s ON me.supplier_id = s.id
    LEFT JOIN LATERAL (
      SELECT 
        result AS last_calibration_result,
        calibration_provider AS last_calibration_provider,
        certificate_number AS last_calibration_certificate_number
      FROM calibrations
      WHERE equipment_id = me.id
      ORDER BY calibration_date DESC
      LIMIT 1
    ) lc ON true
    WHERE me.deleted_at IS NULL
  `);

  // storage_items_with_stock neu erstellen
  pgm.sql(`
    CREATE VIEW storage_items_with_stock AS
    SELECT
      si.*,
      tm.article_number,
      tm.tool_name,
      tm.diameter,
      tm.material,
      tm.coating,
      tm.manufacturer as tool_manufacturer,
      me.inventory_number as equipment_inventory_number,
      me.name as equipment_name,
      me.calibration_status as equipment_calibration_status,
      me.next_calibration_date as equipment_next_calibration,
      me.status as equipment_status,
      me.manufacturer as equipment_manufacturer,
      met.name as equipment_type_name,
      mec.id as equipment_checkout_id,
      mec.checked_out_by,
      checkout_user.username as checked_out_by_name,
      mec.checked_out_at,
      mec.purpose as checkout_purpose,
      sc.name as compartment_name,
      sc.code as compartment_code,
      sl.name as location_name,
      sl.code as location_code,
      sl.building,
      sl.room,
      (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
      CASE 
        WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN
          (si.quantity_new * COALESCE(si.weight_new, 1.0) + 
           si.quantity_used * COALESCE(si.weight_used, 0.5) + 
           si.quantity_reground * COALESCE(si.weight_reground, 0.8))
        ELSE 1
      END as effective_stock,
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory') 
          AND si.enable_low_stock_alert = true 
          AND si.reorder_point IS NOT NULL THEN
          (si.quantity_new * COALESCE(si.weight_new, 1.0) + 
           si.quantity_used * COALESCE(si.weight_used, 0.5) + 
           si.quantity_reground * COALESCE(si.weight_reground, 0.8)) <= si.reorder_point
        ELSE false
      END as is_low_stock,
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory')
          AND si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE NULL
      END as stock_level_percent,
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

  // Spalten entfernen
  pgm.dropColumn('measuring_equipment', 'thread_standard');
  pgm.dropColumn('measuring_equipment', 'thread_size');
  pgm.dropColumn('measuring_equipment', 'thread_pitch');
  pgm.dropColumn('measuring_equipment', 'accuracy_class');
  pgm.dropColumn('measuring_equipment_types', 'field_category');
};
