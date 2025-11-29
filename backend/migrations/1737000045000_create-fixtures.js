/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. FIXTURE TYPES (Vorrichtungstypen)
  // ============================================================================
  pgm.createTable('fixture_types', {
    id: 'id',
    
    name: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
      comment: 'Typenbezeichnung'
    },
    description: {
      type: 'text',
      comment: 'Beschreibung des Typs'
    },
    icon: {
      type: 'varchar(50)',
      comment: 'Icon-Name für UI'
    },
    sort_order: {
      type: 'integer',
      default: 0,
      comment: 'Sortierreihenfolge'
    },
    is_active: {
      type: 'boolean',
      default: true,
      notNull: true
    },
    
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Seed: Standard-Vorrichtungstypen
  pgm.sql(`
    INSERT INTO fixture_types (name, description, icon, sort_order) VALUES
    ('Aufspannvorrichtung', 'Vorrichtung zum Aufspannen von Werkstücken', 'box', 1),
    ('Schweißvorrichtung', 'Vorrichtung für Schweißarbeiten', 'flame', 2),
    ('Montagevorrichtung', 'Vorrichtung für Montagearbeiten', 'wrench', 3),
    ('Prüfvorrichtung', 'Vorrichtung für Prüfungen und Messungen', 'check-circle', 4),
    ('Messvorrichtung', 'Vorrichtung für Messaufgaben', 'ruler', 5),
    ('Bohrvorrichtung', 'Vorrichtung für Bohroperationen', 'circle', 6),
    ('Fräsvorrichtung', 'Vorrichtung für Fräsoperationen', 'square', 7),
    ('Drehvorrichtung', 'Vorrichtung für Drehoperationen', 'rotate-cw', 8),
    ('Schleifvorrichtung', 'Vorrichtung für Schleifoperationen', 'disc', 9),
    ('Sondervorrichtung', 'Sonstige Vorrichtungen', 'tool', 99)
  `);

  // ============================================================================
  // 2. FIXTURES (Vorrichtungs-Stammdaten)
  // ============================================================================
  pgm.createTable('fixtures', {
    id: 'id',
    
    // Identifikation - MANUELL vergeben
    fixture_number: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
      comment: 'Eindeutige Vorrichtungsnummer (z.B. V00123) - manuell vergeben'
    },
    name: {
      type: 'varchar(255)',
      comment: 'Bezeichnung/Beschreibung der Vorrichtung'
    },
    
    // Kategorisierung
    type_id: {
      type: 'integer',
      notNull: true,
      references: 'fixture_types',
      onDelete: 'RESTRICT',
      comment: 'Vorrichtungstyp'
    },
    
    // Zuordnungen (alle optional, UND/ODER möglich)
    part_id: {
      type: 'integer',
      references: 'parts',
      onDelete: 'SET NULL',
      comment: 'Zugeordnetes Bauteil'
    },
    operation_id: {
      type: 'integer',
      references: 'operations',
      onDelete: 'SET NULL',
      comment: 'Zugeordnete Operation'
    },
    machine_id: {
      type: 'integer',
      references: 'machines',
      onDelete: 'SET NULL',
      comment: 'Zugeordnete Maschine'
    },
    
    // Status
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'in_repair', 'retired')",
      comment: 'active=verwendbar, in_repair=in Reparatur, retired=ausgemustert'
    },
    
    // Bemerkungen
    notes: {
      type: 'text',
      comment: 'Bemerkungen'
    },
    
    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    updated_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    },
    deleted_at: {
      type: 'timestamptz',
      comment: 'Soft Delete'
    }
  });

  // Indizes
  pgm.createIndex('fixtures', 'type_id');
  pgm.createIndex('fixtures', 'status');
  pgm.createIndex('fixtures', 'part_id');
  pgm.createIndex('fixtures', 'operation_id');
  pgm.createIndex('fixtures', 'machine_id');
  pgm.createIndex('fixtures', 'deleted_at');

  // ============================================================================
  // 3. FIXTURE DOCUMENTS (Dokumente: Zeichnungen, Fotos)
  // ============================================================================
  pgm.createTable('fixture_documents', {
    id: 'id',
    
    fixture_id: {
      type: 'integer',
      notNull: true,
      references: 'fixtures',
      onDelete: 'CASCADE',
      comment: 'Zugehörige Vorrichtung'
    },
    
    document_type: {
      type: 'varchar(50)',
      notNull: true,
      check: "document_type IN ('drawing', 'photo', 'manual', 'datasheet', 'other')",
      comment: 'Dokumententyp'
    },
    
    file_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Originaler Dateiname'
    },
    file_path: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'Speicherpfad auf Server'
    },
    file_size: {
      type: 'integer',
      comment: 'Dateigröße in Bytes'
    },
    mime_type: {
      type: 'varchar(100)',
      comment: 'MIME-Type der Datei'
    },
    
    description: {
      type: 'text',
      comment: 'Beschreibung des Dokuments'
    },
    
    is_primary: {
      type: 'boolean',
      default: false,
      comment: 'Ist Hauptbild/Hauptdokument'
    },
    
    uploaded_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  pgm.createIndex('fixture_documents', 'fixture_id');
  pgm.createIndex('fixture_documents', 'document_type');

  // ============================================================================
  // 4. STORAGE_ITEMS ERWEITERN (für Lagerung)
  // ============================================================================
  pgm.addColumn('storage_items', {
    fixture_id: {
      type: 'integer',
      references: 'fixtures',
      onDelete: 'CASCADE',
      comment: 'Vorrichtung (wenn item_type = fixture)'
    }
  });

  pgm.createIndex('storage_items', 'fixture_id');

  // ============================================================================
  // 5. CONSTRAINTS AKTUALISIEREN
  // ============================================================================
  
  // check_item_type erweitern um 'fixture'
  pgm.sql(`
    ALTER TABLE storage_items 
    DROP CONSTRAINT IF EXISTS check_item_type;
    
    ALTER TABLE storage_items 
    ADD CONSTRAINT check_item_type 
    CHECK (item_type IN ('tool', 'insert', 'accessory', 'measuring_equipment', 'clamping_device', 'fixture', 'other'));
  `);

  // check_single_item_reference erweitern
  pgm.sql(`
    ALTER TABLE storage_items 
    DROP CONSTRAINT IF EXISTS check_single_item_reference;
    
    ALTER TABLE storage_items 
    ADD CONSTRAINT check_single_item_reference CHECK (
      (item_type IN ('tool', 'insert', 'accessory') AND tool_master_id IS NOT NULL AND measuring_equipment_id IS NULL AND clamping_device_id IS NULL AND fixture_id IS NULL)
      OR
      (item_type = 'measuring_equipment' AND measuring_equipment_id IS NOT NULL AND tool_master_id IS NULL AND clamping_device_id IS NULL AND fixture_id IS NULL)
      OR
      (item_type = 'clamping_device' AND clamping_device_id IS NOT NULL AND tool_master_id IS NULL AND measuring_equipment_id IS NULL AND fixture_id IS NULL)
      OR
      (item_type = 'fixture' AND fixture_id IS NOT NULL AND tool_master_id IS NULL AND measuring_equipment_id IS NULL AND clamping_device_id IS NULL)
    );
  `);

  // ============================================================================
  // 6. VIEW: fixtures_with_stock
  // ============================================================================
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

  // ============================================================================
  // 7. VIEWS AKTUALISIEREN (storage_items_with_stock, storage_items_complete)
  // ============================================================================
  
  // storage_items_with_stock droppen und neu erstellen
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');
  
  pgm.sql(`
    CREATE VIEW storage_items_with_stock AS
    SELECT
      si.*,
      
      -- Tool info
      tm.article_number,
      tm.tool_name,
      tm.diameter,
      tm.material,
      tm.coating,
      tm.manufacturer as tool_manufacturer,
      
      -- Measuring equipment info
      me.inventory_number as equipment_inventory_number,
      me.name as equipment_name,
      me.calibration_status as equipment_calibration_status,
      me.next_calibration_date as equipment_next_calibration,
      me.status as equipment_status,
      me.manufacturer as equipment_manufacturer,
      met.name as equipment_type_name,
      
      -- Clamping device info
      cd.inventory_number as clamping_device_inventory_number,
      cd.name as clamping_device_name,
      cd.status as clamping_device_status,
      cd.manufacturer as clamping_device_manufacturer,
      cdt.name as clamping_device_type_name,
      
      -- Fixture info
      fx.fixture_number as fixture_number,
      fx.name as fixture_name,
      fx.status as fixture_status,
      fxt.name as fixture_type_name,
      
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
      
      -- Total quantity (simple sum)
      (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
      
      -- Effective stock (weighted) - for tools
      CASE 
        WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN
          (
            si.quantity_new * COALESCE(si.weight_new, 1.0) + 
            si.quantity_used * COALESCE(si.weight_used, 0.5) + 
            si.quantity_reground * COALESCE(si.weight_reground, 0.8)
          )
        WHEN si.item_type IN ('clamping_device', 'fixture') THEN
          (si.quantity_new + si.quantity_used + si.quantity_reground)::numeric
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
    LEFT JOIN clamping_devices cd ON cd.id = si.clamping_device_id
    LEFT JOIN clamping_device_types cdt ON cdt.id = cd.type_id
    LEFT JOIN fixtures fx ON fx.id = si.fixture_id
    LEFT JOIN fixture_types fxt ON fxt.id = fx.type_id
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE si.deleted_at IS NULL
      AND si.is_active = true
  `);

  // storage_items_complete droppen und neu erstellen
  pgm.sql('DROP VIEW IF EXISTS storage_items_complete');
  
  pgm.sql(`
    CREATE VIEW storage_items_complete AS
    SELECT 
      si.*,
      sc.code AS compartment_code,
      sc.name AS compartment_name,
      sl.name AS location_name,
      sl.code AS location_code,
      
      -- Tool info
      CASE WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN tm.tool_name END AS tool_name,
      CASE WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN tc.name END AS tool_category_name,
      
      -- Measuring equipment info
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.name END AS equipment_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.inventory_number END AS equipment_inventory_number,
      CASE WHEN si.item_type = 'measuring_equipment' THEN met.name END AS equipment_type_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.status END AS equipment_status,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.next_calibration_date END AS equipment_next_calibration,
      
      -- Clamping device info
      CASE WHEN si.item_type = 'clamping_device' THEN cd.name END AS clamping_device_name,
      CASE WHEN si.item_type = 'clamping_device' THEN cd.inventory_number END AS clamping_device_inventory_number,
      CASE WHEN si.item_type = 'clamping_device' THEN cdt.name END AS clamping_device_type_name,
      CASE WHEN si.item_type = 'clamping_device' THEN cd.status END AS clamping_device_status,
      
      -- Fixture info
      CASE WHEN si.item_type = 'fixture' THEN fx.name END AS fixture_name,
      CASE WHEN si.item_type = 'fixture' THEN fx.fixture_number END AS fixture_number,
      CASE WHEN si.item_type = 'fixture' THEN fxt.name END AS fixture_type_name,
      CASE WHEN si.item_type = 'fixture' THEN fx.status END AS fixture_status,
      
      -- Display name for all types
      COALESCE(
        CASE WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN tm.tool_name END,
        CASE WHEN si.item_type = 'measuring_equipment' THEN me.name END,
        CASE WHEN si.item_type = 'clamping_device' THEN cd.name END,
        CASE WHEN si.item_type = 'fixture' THEN COALESCE(fx.name, fx.fixture_number) END
      ) AS display_name
      
    FROM storage_items si
    LEFT JOIN storage_compartments sc ON si.compartment_id = sc.id
    LEFT JOIN storage_locations sl ON sc.location_id = sl.id
    LEFT JOIN tool_master tm ON si.tool_master_id = tm.id
    LEFT JOIN tool_categories tc ON tm.category_id = tc.id
    LEFT JOIN measuring_equipment me ON si.measuring_equipment_id = me.id
    LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
    LEFT JOIN clamping_devices cd ON si.clamping_device_id = cd.id
    LEFT JOIN clamping_device_types cdt ON cd.type_id = cdt.id
    LEFT JOIN fixtures fx ON si.fixture_id = fx.id
    LEFT JOIN fixture_types fxt ON fx.type_id = fxt.id
  `);

  // ============================================================================
  // 8. COMMENTS
  // ============================================================================
  pgm.sql(`COMMENT ON TABLE fixtures IS 'Vorrichtungs-Stammdaten mit manueller Nummerierung'`);
  pgm.sql(`COMMENT ON TABLE fixture_types IS 'Vorrichtungstypen (Aufspann-, Schweiß-, Montagevorrichtung, etc.)'`);
  pgm.sql(`COMMENT ON TABLE fixture_documents IS 'Dokumente zu Vorrichtungen (Zeichnungen, Fotos)'`);
  pgm.sql(`COMMENT ON VIEW fixtures_with_stock IS 'Vorrichtungen mit berechnetem Lagerbestand und Zuordnungen'`);
};

exports.down = (pgm) => {
  // Views droppen
  pgm.sql('DROP VIEW IF EXISTS storage_items_complete');
  pgm.sql('DROP VIEW IF EXISTS storage_items_with_stock');
  pgm.dropView('fixtures_with_stock');
  
  // storage_items Spalte entfernen
  pgm.dropColumn('storage_items', 'fixture_id');
  
  // Constraints zurücksetzen (ohne fixture)
  pgm.sql(`
    ALTER TABLE storage_items 
    DROP CONSTRAINT IF EXISTS check_item_type;
    
    ALTER TABLE storage_items 
    ADD CONSTRAINT check_item_type 
    CHECK (item_type IN ('tool', 'insert', 'accessory', 'measuring_equipment', 'clamping_device', 'other'));
    
    ALTER TABLE storage_items 
    DROP CONSTRAINT IF EXISTS check_single_item_reference;
    
    ALTER TABLE storage_items 
    ADD CONSTRAINT check_single_item_reference CHECK (
      (item_type IN ('tool', 'insert', 'accessory') AND tool_master_id IS NOT NULL AND measuring_equipment_id IS NULL AND clamping_device_id IS NULL)
      OR
      (item_type = 'measuring_equipment' AND measuring_equipment_id IS NOT NULL AND tool_master_id IS NULL AND clamping_device_id IS NULL)
      OR
      (item_type = 'clamping_device' AND clamping_device_id IS NOT NULL AND tool_master_id IS NULL AND measuring_equipment_id IS NULL)
    );
  `);
  
  // storage_items_with_stock wiederherstellen (Version mit clamping_device, ohne fixture)
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
      cd.inventory_number as clamping_device_inventory_number,
      cd.name as clamping_device_name,
      cd.status as clamping_device_status,
      cd.manufacturer as clamping_device_manufacturer,
      cdt.name as clamping_device_type_name,
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
          (si.quantity_new * COALESCE(si.weight_new, 1.0) + si.quantity_used * COALESCE(si.weight_used, 0.5) + si.quantity_reground * COALESCE(si.weight_reground, 0.8))
        WHEN si.item_type = 'clamping_device' THEN
          (si.quantity_new + si.quantity_used + si.quantity_reground)::numeric
        ELSE 1
      END as effective_stock,
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory') AND si.enable_low_stock_alert = true AND si.reorder_point IS NOT NULL THEN
          (si.quantity_new * COALESCE(si.weight_new, 1.0) + si.quantity_used * COALESCE(si.weight_used, 0.5) + si.quantity_reground * COALESCE(si.weight_reground, 0.8)) <= si.reorder_point
        ELSE false
      END as is_low_stock,
      CASE
        WHEN si.item_type IN ('tool', 'insert', 'accessory') AND si.max_quantity IS NOT NULL AND si.max_quantity > 0 THEN
          ROUND(((si.quantity_new + si.quantity_used + si.quantity_reground)::numeric / si.max_quantity::numeric) * 100, 2)
        ELSE NULL
      END as stock_level_percent,
      CASE WHEN si.item_type = 'measuring_equipment' AND mec.id IS NOT NULL THEN true ELSE false END as is_checked_out
    FROM storage_items si
    LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
    LEFT JOIN measuring_equipment_with_status me ON me.id = si.measuring_equipment_id
    LEFT JOIN measuring_equipment_types met ON met.id = me.type_id
    LEFT JOIN measuring_equipment_checkouts mec ON mec.equipment_id = si.measuring_equipment_id AND mec.returned_at IS NULL
    LEFT JOIN users checkout_user ON checkout_user.id = mec.checked_out_by
    LEFT JOIN clamping_devices cd ON cd.id = si.clamping_device_id
    LEFT JOIN clamping_device_types cdt ON cdt.id = cd.type_id
    LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
    LEFT JOIN storage_locations sl ON sl.id = sc.location_id
    WHERE si.deleted_at IS NULL AND si.is_active = true
  `);
  
  // storage_items_complete wiederherstellen (Version mit clamping_device, ohne fixture)
  pgm.sql(`
    CREATE VIEW storage_items_complete AS
    SELECT 
      si.*,
      sc.code AS compartment_code,
      sc.name AS compartment_name,
      sl.name AS location_name,
      sl.code AS location_code,
      CASE WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN tm.tool_name END AS tool_name,
      CASE WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN tc.name END AS tool_category_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.name END AS equipment_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.inventory_number END AS equipment_inventory_number,
      CASE WHEN si.item_type = 'measuring_equipment' THEN met.name END AS equipment_type_name,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.status END AS equipment_status,
      CASE WHEN si.item_type = 'measuring_equipment' THEN me.next_calibration_date END AS equipment_next_calibration,
      CASE WHEN si.item_type = 'clamping_device' THEN cd.name END AS clamping_device_name,
      CASE WHEN si.item_type = 'clamping_device' THEN cd.inventory_number END AS clamping_device_inventory_number,
      CASE WHEN si.item_type = 'clamping_device' THEN cdt.name END AS clamping_device_type_name,
      CASE WHEN si.item_type = 'clamping_device' THEN cd.status END AS clamping_device_status,
      COALESCE(
        CASE WHEN si.item_type IN ('tool', 'insert', 'accessory') THEN tm.tool_name END,
        CASE WHEN si.item_type = 'measuring_equipment' THEN me.name END,
        CASE WHEN si.item_type = 'clamping_device' THEN cd.name END
      ) AS display_name
    FROM storage_items si
    LEFT JOIN storage_compartments sc ON si.compartment_id = sc.id
    LEFT JOIN storage_locations sl ON sc.location_id = sl.id
    LEFT JOIN tool_master tm ON si.tool_master_id = tm.id
    LEFT JOIN tool_categories tc ON tm.category_id = tc.id
    LEFT JOIN measuring_equipment me ON si.measuring_equipment_id = me.id
    LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
    LEFT JOIN clamping_devices cd ON si.clamping_device_id = cd.id
    LEFT JOIN clamping_device_types cdt ON cd.type_id = cdt.id
  `);
  
  // Tabellen droppen
  pgm.dropTable('fixture_documents');
  pgm.dropTable('fixtures');
  pgm.dropTable('fixture_types');
};
