/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. MEASURING EQUIPMENT TYPES (Messmitteltypen)
  // ============================================================================
  pgm.createTable('measuring_equipment_types', {
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
      comment: 'Icon-Name für UI (z.B. ruler, gauge)'
    },
    default_calibration_interval_months: {
      type: 'integer',
      default: 12,
      comment: 'Standard-Kalibrierintervall in Monaten'
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

  // Seed: Standard-Messmitteltypen
  pgm.sql(`
    INSERT INTO measuring_equipment_types (name, description, icon, default_calibration_interval_months, sort_order) VALUES
    ('Messschieber', 'Digitaler oder analoger Messschieber', 'ruler', 12, 1),
    ('Bügelmessschraube', 'Mikrometer / Bügelmessschraube', 'circle-dot', 12, 2),
    ('Innenmessschraube', 'Innenmikrometer', 'circle', 12, 3),
    ('Messuhr', 'Messuhr mit Halter', 'gauge', 12, 4),
    ('Fühlerlehre', 'Fühlerlehren-Set', 'layers', 24, 5),
    ('Lehrdorn', 'Gut-/Ausschuss-Lehrdorn', 'cylinder', 12, 6),
    ('Lehrring', 'Gut-/Ausschuss-Lehrring', 'circle', 12, 7),
    ('Gewindelehrdorn', 'Gewinde-Gut-/Ausschuss-Lehrdorn', 'cylinder', 12, 8),
    ('Gewindelehrring', 'Gewinde-Gut-/Ausschuss-Lehrring', 'circle', 12, 9),
    ('Grenzrachenlehre', 'Rachenlehre für Außenmaße', 'move-horizontal', 12, 10),
    ('Tiefenmaß', 'Tiefenmessgerät', 'arrow-down', 12, 11),
    ('Höhenmessgerät', 'Höhenreißer / Höhenmessgerät', 'arrow-up', 12, 12),
    ('Endmaß', 'Endmaß-Satz / Parallelendmaße', 'square', 24, 13),
    ('Prüfstift', 'Prüfstifte-Satz', 'minus', 24, 14),
    ('Winkelmesser', 'Winkelmesser / Winkellehre', 'triangle', 12, 15),
    ('Oberflächenmessgerät', 'Rauheitsmessgerät', 'activity', 12, 16),
    ('Koordinatenmessgerät', '3D-Messmaschine (KMG)', 'box', 12, 17),
    ('Sonstiges', 'Sonstige Messmittel', 'tool', 12, 99)
  `);

  // ============================================================================
  // 2. MEASURING EQUIPMENT (Messmittel-Stammdaten)
  // ============================================================================
  pgm.createTable('measuring_equipment', {
    id: 'id',
    
    // Identifikation
    inventory_number: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
      comment: 'Eindeutige Inventar-Nummer (z.B. MM-2024-001)'
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Bezeichnung des Messmittels'
    },
    
    // Kategorisierung
    type_id: {
      type: 'integer',
      notNull: true,
      references: 'measuring_equipment_types',
      onDelete: 'RESTRICT',
      comment: 'Messmitteltyp'
    },
    
    // Hersteller & Modell
    manufacturer: {
      type: 'varchar(100)',
      comment: 'Hersteller (z.B. Mitutoyo, Mahr, Tesa)'
    },
    model: {
      type: 'varchar(100)',
      comment: 'Modellbezeichnung'
    },
    serial_number: {
      type: 'varchar(100)',
      comment: 'Seriennummer des Herstellers'
    },
    
    // Technische Daten
    measuring_range_min: {
      type: 'decimal(12,4)',
      comment: 'Messbereich von (mm)'
    },
    measuring_range_max: {
      type: 'decimal(12,4)',
      comment: 'Messbereich bis (mm)'
    },
    resolution: {
      type: 'decimal(10,4)',
      comment: 'Auflösung/Skalenteilung (mm), z.B. 0.01'
    },
    accuracy: {
      type: 'decimal(10,4)',
      comment: 'Genauigkeit/Messabweichung (mm)'
    },
    unit: {
      type: 'varchar(20)',
      default: 'mm',
      comment: 'Maßeinheit (mm, µm, °)'
    },
    
    // Für Lehren: Nennmaß und Toleranz
    nominal_value: {
      type: 'decimal(12,4)',
      comment: 'Nennmaß bei Lehren (mm)'
    },
    tolerance_class: {
      type: 'varchar(50)',
      comment: 'Toleranzklasse (z.B. H7, 6H)'
    },
    
    // Kalibrierung
    calibration_interval_months: {
      type: 'integer',
      notNull: true,
      default: 12,
      comment: 'Kalibrierintervall in Monaten'
    },
    last_calibration_date: {
      type: 'date',
      comment: 'Datum der letzten Kalibrierung'
    },
    next_calibration_date: {
      type: 'date',
      comment: 'Datum der nächsten fälligen Kalibrierung'
    },
    calibration_provider: {
      type: 'varchar(255)',
      comment: 'Kalibrierlabor / Dienstleister'
    },
    
    // Status
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'active',
      check: "status IN ('active', 'locked', 'in_calibration', 'repair', 'retired')",
      comment: 'active=verwendbar, locked=gesperrt, in_calibration=in Kalibrierung, repair=in Reparatur, retired=ausgemustert'
    },
    lock_reason: {
      type: 'text',
      comment: 'Grund für Sperrung'
    },
    
    // Lagerort (nutzt bestehendes Storage-System)
    storage_location_id: {
      type: 'integer',
      references: 'storage_locations',
      onDelete: 'SET NULL',
      comment: 'Lagerort'
    },
    
    // Beschaffung
    purchase_date: {
      type: 'date',
      comment: 'Kaufdatum'
    },
    purchase_price: {
      type: 'decimal(10,2)',
      comment: 'Anschaffungspreis'
    },
    supplier_id: {
      type: 'integer',
      references: 'suppliers',
      onDelete: 'SET NULL',
      comment: 'Lieferant'
    },
    
    // Sonstiges
    notes: {
      type: 'text',
      comment: 'Bemerkungen'
    },
    image_path: {
      type: 'varchar(500)',
      comment: 'Pfad zum Foto'
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

  // Indizes für measuring_equipment
  pgm.createIndex('measuring_equipment', 'type_id');
  pgm.createIndex('measuring_equipment', 'status');
  pgm.createIndex('measuring_equipment', 'next_calibration_date');
  pgm.createIndex('measuring_equipment', 'storage_location_id');
  pgm.createIndex('measuring_equipment', 'deleted_at');

  // ============================================================================
  // 3. CALIBRATIONS (Kalibrierungs-Historie)
  // ============================================================================
  pgm.createTable('calibrations', {
    id: 'id',
    
    equipment_id: {
      type: 'integer',
      notNull: true,
      references: 'measuring_equipment',
      onDelete: 'CASCADE',
      comment: 'Zugehöriges Messmittel'
    },
    
    // Kalibrierungsdaten
    calibration_date: {
      type: 'date',
      notNull: true,
      comment: 'Datum der Kalibrierung'
    },
    valid_until: {
      type: 'date',
      notNull: true,
      comment: 'Gültig bis'
    },
    
    // Ergebnis
    result: {
      type: 'varchar(20)',
      notNull: true,
      check: "result IN ('passed', 'failed', 'adjusted', 'limited')",
      comment: 'passed=bestanden, failed=nicht bestanden, adjusted=justiert, limited=eingeschränkt'
    },
    
    // Messwerte (optional, für detaillierte Dokumentation)
    measured_values: {
      type: 'jsonb',
      comment: 'Gemessene Werte als JSON'
    },
    deviation: {
      type: 'decimal(10,4)',
      comment: 'Festgestellte Abweichung'
    },
    
    // Dienstleister
    provider: {
      type: 'varchar(255)',
      comment: 'Kalibrierlabor / Dienstleister'
    },
    certificate_number: {
      type: 'varchar(100)',
      comment: 'Zertifikatsnummer'
    },
    
    // Kosten
    cost: {
      type: 'decimal(10,2)',
      comment: 'Kalibrierungskosten'
    },
    
    notes: {
      type: 'text',
      comment: 'Bemerkungen'
    },
    
    // Audit
    performed_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'Durchgeführt von (intern)'
    },
    created_by: {
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

  pgm.createIndex('calibrations', 'equipment_id');
  pgm.createIndex('calibrations', 'calibration_date');
  pgm.createIndex('calibrations', 'valid_until');

  // ============================================================================
  // 4. CALIBRATION CERTIFICATES (PDF-Uploads)
  // ============================================================================
  pgm.createTable('calibration_certificates', {
    id: 'id',
    
    calibration_id: {
      type: 'integer',
      notNull: true,
      references: 'calibrations',
      onDelete: 'CASCADE',
      comment: 'Zugehörige Kalibrierung'
    },
    
    file_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Original-Dateiname'
    },
    file_path: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'Speicherpfad'
    },
    file_size: {
      type: 'integer',
      comment: 'Dateigröße in Bytes'
    },
    mime_type: {
      type: 'varchar(100)',
      default: 'application/pdf'
    },
    
    uploaded_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    uploaded_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  pgm.createIndex('calibration_certificates', 'calibration_id');

  // ============================================================================
  // 5. VIEW: measuring_equipment_with_status
  // Berechnet automatisch den Kalibrierungsstatus
  // ============================================================================
  pgm.createView('measuring_equipment_with_status', {}, `
    SELECT 
      me.*,
      met.name AS type_name,
      met.icon AS type_icon,
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
        c.result AS last_calibration_result,
        c.provider AS last_calibration_provider,
        c.certificate_number AS last_calibration_certificate_number
      FROM calibrations c 
      WHERE c.equipment_id = me.id 
      ORDER BY c.calibration_date DESC 
      LIMIT 1
    ) lc ON true
    WHERE me.deleted_at IS NULL
  `);

  // ============================================================================
  // 6. TRIGGER: Auto-Update next_calibration_date
  // ============================================================================
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_next_calibration_date()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Update next_calibration_date im measuring_equipment
      UPDATE measuring_equipment
      SET 
        next_calibration_date = NEW.valid_until,
        last_calibration_date = NEW.calibration_date,
        calibration_provider = NEW.provider,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = NEW.equipment_id;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE TRIGGER trg_calibration_update_equipment
    AFTER INSERT ON calibrations
    FOR EACH ROW
    EXECUTE FUNCTION update_next_calibration_date();
  `);

  // ============================================================================
  // 7. COMMENTS
  // ============================================================================
  pgm.sql(`COMMENT ON TABLE measuring_equipment IS 'Messmittel-Stammdaten für ISO/Luftfahrt-konforme Verwaltung'`);
  pgm.sql(`COMMENT ON TABLE calibrations IS 'Kalibrierungs-Historie mit vollständigem Audit-Trail'`);
  pgm.sql(`COMMENT ON TABLE calibration_certificates IS 'PDF-Zertifikate für Kalibrierungen'`);
  pgm.sql(`COMMENT ON VIEW measuring_equipment_with_status IS 'Messmittel mit berechnetem Kalibrierungsstatus'`);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS trg_calibration_update_equipment ON calibrations');
  pgm.sql('DROP FUNCTION IF EXISTS update_next_calibration_date()');
  pgm.dropView('measuring_equipment_with_status');
  pgm.dropTable('calibration_certificates');
  pgm.dropTable('calibrations');
  pgm.dropTable('measuring_equipment');
  pgm.dropTable('measuring_equipment_types');
};
