const { Pool } = require('pg');
const dotenv = require('dotenv');
const { hashPassword } = require('../utils/password');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...\n');
    
    await client.query('BEGIN');

    // 1. Test-Kunden
    console.log('Creating customers...');
    await client.query(`
      INSERT INTO customers (name, customer_number, contact_person, email, phone, address)
      VALUES 
        ('Musterkunde Luftfahrt GmbH', 'KD00001', 'Max Mustermann', 'max.mustermann@kunde1.example', '+49 000 0000001', 'Musterstadt, Deutschland'),
        ('Musterkunde Fahrzeugbau AG', 'KD00002', 'Anna Schmidt', 'anna.schmidt@kunde2.example', '+49 000 0000002', 'Musterstadt, Deutschland'),
        ('Musterkunde Industrie AG', 'KD00003', 'Thomas Weber', 'thomas.weber@kunde3.example', '+49 000 0000003', 'Musterstadt, Deutschland')
      ON CONFLICT DO NOTHING;
    `);

    // 2. Test-Maschinen (Typ/Steuerung ueber FKs, technische Daten in custom_fields)
    console.log('Creating machines...');
    await client.query(`
      INSERT INTO machines (
        name, manufacturer, model, serial_number,
        machine_type_id, control_type_id, control_version,
        location, postprocessor_name, network_path,
        custom_fields
      )
      VALUES
        ('DMG DMU 50', 'DMG Mori', 'DMU 50', 'SN12345',
         (SELECT id FROM machine_types WHERE name = 'Fräsen'),
         (SELECT id FROM control_types WHERE name = 'Heidenhain'),
         'TNC640 640 SP5',
         'Halle A, Pos. 1', 'Heidenhain_5Axis', '\\\\fileserver\\cnc\\dmu50',
         '{"num_axes":5,"workspace_x":500,"workspace_y":400,"workspace_z":400,"spindle_power":18.5,"max_rpm":18000,"tool_capacity":30}'::jsonb),

        ('Hermle C42U', 'Hermle', 'C42U', 'SN67890',
         (SELECT id FROM machine_types WHERE name = 'Fräsen'),
         (SELECT id FROM control_types WHERE name = 'Heidenhain'),
         'TNC640 640 SP6',
         'Halle A, Pos. 2', 'Heidenhain_5Axis_C42', '\\\\fileserver\\cnc\\hermle',
         '{"num_axes":5,"workspace_x":1000,"workspace_y":1100,"workspace_z":600,"spindle_power":33,"max_rpm":18000,"tool_capacity":42}'::jsonb),

        ('Mazak Integrex i-200', 'Mazak', 'Integrex i-200', 'SN11122',
         (SELECT id FROM machine_types WHERE name = 'Dreh-Fräsen'),
         (SELECT id FROM control_types WHERE name = 'Mazatrol'),
         'Matrix Nexus 2 2.0',
         'Halle B, Pos. 1', 'Mazak_Matrix', '\\\\fileserver\\cnc\\mazak',
         '{"num_axes":5,"workspace_x":560,"workspace_y":1000,"workspace_z":500,"spindle_power":26,"max_rpm":6000,"tool_capacity":40}'::jsonb)
      ON CONFLICT (name) DO NOTHING;
    `);

    // 3. Test-Bauteile
    console.log('Creating parts...');
    const customerResult = await client.query('SELECT id FROM customers LIMIT 1');
    const customerId = customerResult.rows[0]?.id;
    const userResult = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    const userId = userResult.rows[0]?.id;

    if (customerId && userId) {
      await client.query(`
        INSERT INTO parts (
          customer_id, part_number, part_name, revision, material,
          drawing_number, weight, dimensions, description, created_by
        )
        VALUES 
          ($1, 'P-12345', 'Gehäuse Hauptlager', 'A', 'AlMgSi1 F28',
           'Z-12345-001', 2.450, '200x150x80', 'Flugzeug-Strukturteil, Luftfahrt-Zertifiziert', $2),
          
          ($1, 'P-12346', 'Befestigungsflansch', 'B', '42CrMo4',
           'Z-12346-002', 5.200, '300x300x50', 'Hochfester Flansch für Motorhalterung', $2),
          
          ($1, 'P-12347', 'Distanzhülse', 'A', 'AlCuMg2',
           'Z-12347-003', 0.125, '60x40x20', 'Präzisions-Distanzhülse', $2)
        ON CONFLICT (part_number) DO NOTHING;
      `, [customerId, userId]);
    }

    // 4. Test-Arbeitsgänge
    console.log('Creating operations...');
    const partResult = await client.query('SELECT id FROM parts WHERE part_number = $1', ['P-12345']);
    const partId = partResult.rows[0]?.id;
    const machineResult = await client.query('SELECT id FROM machines WHERE name = $1', ['DMG DMU 50']);
    const machineId = machineResult.rows[0]?.id;

    if (partId && machineId && userId) {
      // Kein Unique-Constraint auf (part_id, op_number) mehr (Varianten), daher NOT EXISTS
      await client.query(`
        INSERT INTO operations (
          part_id, op_number, op_name, machine_id,
          setup_time_minutes, cycle_time_seconds, description, sequence, created_by
        )
        SELECT $1::integer, v.op_number, v.op_name, $2::integer,
               v.setup_time_minutes, v.cycle_time_seconds, v.description, v.sequence, $3::integer
        FROM (VALUES
          ('OP10', 'Schruppen Oberseite', 45, 180.5, 'Schruppen der Oberseite mit Aufmaß 0.5mm', 1),
          ('OP20', 'Schlichten Oberseite', 30, 240.3, 'Schlichtbearbeitung Oberseite auf Endmaß', 2),
          ('OP30', 'Taschen und Bohrungen', 20, 156.8, 'Taschen fräsen und Bohrungen M6 und M8', 3)
        ) AS v(op_number, op_name, setup_time_minutes, cycle_time_seconds, description, sequence)
        WHERE NOT EXISTS (
          SELECT 1 FROM operations o WHERE o.part_id = $1::integer AND o.op_number = v.op_number
        );
      `, [partId, machineId, userId]);
    }

    // 5. Test-Werkzeuge
    console.log('Creating tools...');
    await client.query(`
      INSERT INTO tools (
        tool_number, tool_name, tool_type, diameter, length, flutes,
        material, coating, manufacturer, order_number,
        cutting_speed, feed_per_tooth, max_rpm, cost, stock_quantity, min_stock
      )
      VALUES 
        ('T0001', 'Schaftfräser D16 VHM', 'end_mill', 16.000, 100.00, 4,
         'VHM', 'TiAlN', 'Gühring', '5510-16.000', 
         200.00, 0.1200, 12000, 89.50, 5, 2),
        
        ('T0002', 'Bohrer D8.0 VHM', 'drill', 8.000, 80.00, 2,
         'VHM', 'TiN', 'Gühring', '5512-8.000',
         80.00, 0.0800, 8000, 45.00, 10, 3),
        
        ('T0003', 'Gewindebohrer M6 HSS-E', 'tap', 5.000, 60.00, 3,
         'HSS-E', 'TiCN', 'Emuge', 'B1251060',
         15.00, 0.0000, 800, 12.50, 15, 5)
      ON CONFLICT (tool_number) DO NOTHING;
    `);

    // 6. Test-Programm
    console.log('Creating test program...');
    const opResult = await client.query(`
      SELECT o.id 
      FROM operations o 
      JOIN parts p ON o.part_id = p.id 
      WHERE p.part_number = $1 AND o.op_number = $2
    `, ['P-12345', 'OP10']);
    
    const operationId = opResult.rows[0]?.id;
    const draftState = await client.query('SELECT id FROM workflow_states WHERE name = $1', ['draft']);
    const stateId = draftState.rows[0]?.id;

    if (operationId && stateId && userId) {
      const programResult = await client.query(`
        INSERT INTO programs (
          operation_id, program_number, program_name, description,
          workflow_state_id, created_by
        )
        SELECT $1::integer, 'O1234', 'GEHAEUSE_OP10', 'Schruppprogramm für Gehäuse', $2::integer, $3::integer
        WHERE NOT EXISTS (
          SELECT 1 FROM programs WHERE operation_id = $1::integer AND program_number = 'O1234'
        )
        RETURNING id;
      `, [operationId, stateId, userId]);

      if (programResult.rows.length > 0) {
        const programId = programResult.rows[0].id;
        
        // Erste Revision
        await client.query(`
          INSERT INTO program_revisions (
            program_id, version_major, version_minor, version_patch, version_string,
            filename, filepath, filesize, mime_type, content, comment,
            is_cam_original, workflow_state_id, created_by
          )
          VALUES (
            $1, 1, 0, 0, '1.0.0',
            'O1234_v1.0.0.nc', '/uploads/programs/O1234_v1.0.0.nc', 2048, 'text/plain',
            'BEGIN PGM O1234 MM\nBLK FORM 0.1 Z X+0 Y+0 Z-80\n...(G-Code Content)...\nEND PGM O1234 MM',
            'Initial CAM output from TopSolid',
            true, $2, $3
          )
          ON CONFLICT DO NOTHING;
        `, [programId, stateId, userId]);
      }
    }

    // 7. Test-Wartungsplan
    console.log('Creating maintenance plan...');
    const typeResult = await client.query('SELECT id FROM maintenance_types WHERE name = $1', ['daily_inspection']);
    const maintenanceTypeId = typeResult.rows[0]?.id;

    if (machineId && maintenanceTypeId && userId) {
      const planResult = await client.query(`
        INSERT INTO maintenance_plans (
          machine_id, maintenance_type_id, title, description,
          interval_type, interval_value, next_due_at,
          required_skill_level, estimated_duration_minutes,
          priority, instructions, created_by
        )
        SELECT
          $1::integer, $2::integer, 'Tägliche Sichtkontrolle DMG DMU 50',
          'Tägliche Überprüfung von Kühlmittelstand, Schmierung und Sauberkeit',
          'days', 1, NOW() + INTERVAL '1 day',
          'helper', 15, 'normal',
          '1. Kühlmittelstand prüfen\n2. Späne entfernen\n3. Sichtprüfung auf Leckagen',
          $3::integer
        WHERE NOT EXISTS (
          SELECT 1 FROM maintenance_plans
          WHERE machine_id = $1::integer AND title = 'Tägliche Sichtkontrolle DMG DMU 50'
        )
        RETURNING id;
      `, [machineId, maintenanceTypeId, userId]);

      if (planResult.rows.length > 0) {
        const planId = planResult.rows[0].id;
        
        // Checklist Items
        await client.query(`
          INSERT INTO maintenance_checklist_items (
            maintenance_plan_id, title, description, sequence,
            requires_photo, requires_measurement, is_critical
          )
          VALUES 
            ($1, 'Kühlmittelstand prüfen', 'Stand sollte zwischen MIN und MAX liegen', 1, false, false, true),
            ($1, 'Späne entfernen', 'Spänecontainer leeren wenn >80% voll', 2, true, false, false),
            ($1, 'Leckagen prüfen', 'Sichtprüfung auf Öl/Kühlmittel-Leckagen', 3, false, false, true)
          ON CONFLICT DO NOTHING;
        `, [planId]);
      }
    }

    // 8. Lagerorte
    console.log('Creating storage locations...');
    await client.query(`
      INSERT INTO storage_locations (name, code, description, location_type, item_category, building, room, is_active)
      VALUES 
        ('Werkzeugschrank WZ-01', 'WZ-01', 'Hauptwerkzeugschrank Halle A', 'cabinet', 'tools', 'Halle A', 'Werkstatt', true),
        ('Werkzeugschrank WZ-02', 'WZ-02', 'Sonderwerkzeuge', 'cabinet', 'tools', 'Halle A', 'Werkstatt', true),
        ('Messmittelschrank MM-01', 'MM-01', 'Kalibrierte Messmittel', 'cabinet', 'measuring_equipment', 'Halle A', 'QS-Raum', true),
        ('Spannmittelregal SR-01', 'SR-01', 'Spannmittel Fräsmaschinen', 'shelf_unit', 'clamping_devices', 'Halle A', 'Werkstatt', true),
        ('Vorrichtungslager VL-01', 'VL-01', 'Vorrichtungen und Aufspannungen', 'shelf_unit', 'fixtures', 'Halle B', 'Lager', true),
        ('Rohmateriallager RM-01', 'RM-01', 'Aluminium und Stahl', 'area', 'consumables', 'Halle B', 'Lager', true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // 9. Lieferanten
    console.log('Creating suppliers...');
    await client.query(`
      INSERT INTO suppliers (name, supplier_code, contact_person, email, phone, website, address_line1, postal_code, city, country, payment_terms, delivery_time_days, is_preferred, is_active)
      VALUES 
        ('Musterlieferant Zerspanung GmbH', 'LF-001', 'Herr Schmidt', 'vertrieb@lieferant1.example', '+49 000 0000101', 'www.lieferant1.example', 'Musterstraße 1', '00000', 'Musterstadt', 'Deutschland', '30 Tage netto', 3, true, true),
        ('Musterlieferant Werkstattbedarf', 'LF-002', 'Frau Weber', 'service@lieferant2.example', '+49 000 0000102', 'www.lieferant2.example', 'Musterstraße 2', '00000', 'Musterstadt', 'Deutschland', '14 Tage 2% Skonto', 2, true, true),
        ('Musterlieferant Messtechnik', 'LF-003', 'Herr Müller', 'info@lieferant3.example', '+49 000 0000103', 'www.lieferant3.example', 'Musterstraße 3', '00000', 'Musterstadt', 'Deutschland', '30 Tage netto', 5, false, true),
        ('Musterlieferant Spanntechnik GmbH', 'LF-004', 'Frau Bauer', 'info@lieferant4.example', '+49 000 0000104', 'www.lieferant4.example', 'Musterstraße 4', '00000', 'Musterstadt', 'Deutschland', '30 Tage netto', 7, true, true),
        ('Musterlieferant Gewindetechnik', 'LF-005', 'Herr Fischer', 'info@lieferant5.example', '+49 000 0000105', 'www.lieferant5.example', 'Musterstraße 5', '00000', 'Musterstadt', 'Deutschland', '30 Tage netto', 4, false, true)
      ON CONFLICT (name) DO NOTHING;
    `);

    // 10. Messmittel
    console.log('Creating measuring equipment...');
    const messmittelSchrank = await client.query("SELECT id FROM storage_locations WHERE code = 'MM-01'");
    const mmStorageId = messmittelSchrank.rows[0]?.id;
    const messchieberType = await client.query("SELECT id FROM measuring_equipment_types WHERE name = 'Messschieber'");
    const buegelmessType = await client.query("SELECT id FROM measuring_equipment_types WHERE name = 'Bügelmessschraube'");
    const messschieberTypeId = messchieberType.rows[0]?.id;
    const buegelmessTypeId = buegelmessType.rows[0]?.id;

    if (messschieberTypeId && mmStorageId) {
      await client.query(`
        INSERT INTO measuring_equipment (inventory_number, name, type_id, manufacturer, model, serial_number, measuring_range_min, measuring_range_max, resolution, status, calibration_interval_months, last_calibration_date, next_calibration_date, storage_location_id)
        VALUES 
          ('MM-2024-001', 'Digitaler Messschieber 150mm', $1, 'Mitutoyo', 'CD-15DCX', 'SN-12345678', 0, 150, 0.01, 'active', 12, '2024-06-01', '2025-06-01', $2),
          ('MM-2024-002', 'Digitaler Messschieber 300mm', $1, 'Mitutoyo', 'CD-30DCX', 'SN-23456789', 0, 300, 0.01, 'active', 12, '2024-06-01', '2025-06-01', $2),
          ('MM-2024-003', 'Analoger Messschieber 200mm', $1, 'Mahr', 'MarCal 16 ER', 'SN-34567890', 0, 200, 0.02, 'active', 12, '2024-03-15', '2025-03-15', $2)
        ON CONFLICT (inventory_number) DO NOTHING;
      `, [messschieberTypeId, mmStorageId]);
    }

    if (buegelmessTypeId && mmStorageId) {
      await client.query(`
        INSERT INTO measuring_equipment (inventory_number, name, type_id, manufacturer, model, serial_number, measuring_range_min, measuring_range_max, resolution, status, calibration_interval_months, last_calibration_date, next_calibration_date, storage_location_id)
        VALUES 
          ('MM-2024-004', 'Bügelmessschraube 0-25mm', $1, 'Mitutoyo', 'Digimatic 293-240', 'SN-45678901', 0, 25, 0.001, 'active', 12, '2024-06-01', '2025-06-01', $2),
          ('MM-2024-005', 'Bügelmessschraube 25-50mm', $1, 'Mitutoyo', 'Digimatic 293-241', 'SN-56789012', 25, 50, 0.001, 'active', 12, '2024-06-01', '2025-06-01', $2)
        ON CONFLICT (inventory_number) DO NOTHING;
      `, [buegelmessTypeId, mmStorageId]);
    }

    // 11. Spannmittel
    console.log('Creating clamping devices...');
    const schraubstockType = await client.query("SELECT id FROM clamping_device_types WHERE name = 'Schraubstock'");
    const spannzangeType = await client.query("SELECT id FROM clamping_device_types WHERE name = 'Spannzange'");
    const schraubstockTypeId = schraubstockType.rows[0]?.id;
    const spannzangeTypeId = spannzangeType.rows[0]?.id;

    if (schraubstockTypeId) {
      await client.query(`
        INSERT INTO clamping_devices (inventory_number, name, type_id, manufacturer, model, clamping_range_min, clamping_range_max, status)
        VALUES 
          ('SPANN-001', 'NC-Schraubstock 125mm Schunk', $1, 'Schunk', 'KONTEC KSC 125', 0, 125, 'active'),
          ('SPANN-002', 'NC-Schraubstock 160mm Schunk', $1, 'Schunk', 'KONTEC KSC 160', 0, 160, 'active'),
          ('SPANN-003', 'Präzisions-Schraubstock 100mm', $1, 'Röhm', 'RKP 100', 0, 100, 'active')
        ON CONFLICT (inventory_number) DO NOTHING;
      `, [schraubstockTypeId]);
    }

    if (spannzangeTypeId) {
      await client.query(`
        INSERT INTO clamping_devices (inventory_number, name, type_id, manufacturer, model, clamping_range_min, clamping_range_max, status)
        VALUES 
          ('SPANN-004', 'ER32 Spannzangensatz 2-20mm', $1, 'Rego-Fix', 'ER32', 2, 20, 'active'),
          ('SPANN-005', 'ER40 Spannzangensatz 3-26mm', $1, 'Rego-Fix', 'ER40', 3, 26, 'active')
        ON CONFLICT (inventory_number) DO NOTHING;
      `, [spannzangeTypeId]);
    }

    // 12. Vorrichtungen
    console.log('Creating fixtures...');
    const aufspannType = await client.query("SELECT id FROM fixture_types WHERE name = 'Aufspannvorrichtung'");
    const aufspannTypeId = aufspannType.rows[0]?.id;

    if (aufspannTypeId && partId) {
      await client.query(`
        INSERT INTO fixtures (fixture_number, name, type_id, part_id, status)
        VALUES 
          ('V00001', 'Aufspannvorrichtung Gehäuse OP10', $1, $2, 'active'),
          ('V00002', 'Aufspannvorrichtung Gehäuse OP20', $1, $2, 'active')
        ON CONFLICT (fixture_number) DO NOTHING;
      `, [aufspannTypeId, partId]);
    }

    // Allgemeine Vorrichtungen ohne Bauteilbindung
    if (aufspannTypeId) {
      await client.query(`
        INSERT INTO fixtures (fixture_number, name, type_id, status)
        VALUES 
          ('V00003', 'Universal-Aufspannplatte 400x400', $1, 'active'),
          ('V00004', 'Würfelvorrichtung 6-seitig', $1, 'active')
        ON CONFLICT (fixture_number) DO NOTHING;
      `, [aufspannTypeId]);
    }

    // 13. Werkzeugstamm (Beispiele)
    console.log('Creating tool master examples...');
    await client.query(`
      INSERT INTO tool_master (
        article_number, tool_name, category_id, subcategory_id,
        item_type, tool_category, diameter, length, flutes,
        material, coating, substrate_grade, manufacturer,
        manufacturer_part_number, uses_inserts, custom_fields, created_by
      )
      VALUES
        ('T001', 'Schaftfräser D10 Z2 HSS-E TiAlN',
         (SELECT id FROM tool_categories WHERE name = 'Milling'),
         (SELECT id FROM tool_subcategories WHERE name = 'End Mill'),
         'tool', 'standard', 10.0, 100.0, 2, 'HSS-E', 'TiAlN', NULL, 'Garant', 'GAR-10-HSS-TiAlN', false,
         '{"corner_radius": 0.2, "helix_angle": 30, "center_cutting": true}'::jsonb, $1),

        ('T002', 'Spiralbohrer D8.5 HSS-Co DIN338',
         (SELECT id FROM tool_categories WHERE name = 'Drilling'),
         (SELECT id FROM tool_subcategories WHERE name = 'Twist Drill'),
         'tool', 'standard', 8.5, 120.0, NULL, 'HSS-Co', 'TiN', NULL, 'Dormer', 'DOR-850-HSS-Co', false,
         NULL, $1),

        ('I001', 'SEKT 1204 AZ TiAlN',
         (SELECT id FROM tool_categories WHERE name = 'Inserts'),
         (SELECT id FROM tool_subcategories WHERE name = 'SEKT'),
         'insert', 'standard', 12.0, NULL, NULL, 'Carbide', 'TiAlN', 'K20', 'Sandvik', 'SEKT1204AZ-TN', false,
         '{"insert_shape": "SEKT", "insert_size": "1204", "nose_radius": 0.4, "cutting_edges": 4}'::jsonb, $1),

        ('T003', 'Gewindebohrer M10x1.5 HSS-E',
         (SELECT id FROM tool_categories WHERE name = 'Threading'),
         (SELECT id FROM tool_subcategories WHERE name = 'Thread Tap'),
         'tool', 'standard', 10.0, 90.0, NULL, 'HSS-E', 'TiN', NULL, 'OSG', 'OSG-M10-1.5', false,
         '{"thread_size": "M10x1.5", "thread_type": "metric"}'::jsonb, $1),

        ('T100', 'Spezial-Formfräser Kontur-XY',
         (SELECT id FROM tool_categories WHERE name = 'Milling'),
         (SELECT id FROM tool_subcategories WHERE name = 'Slot Mill'),
         'tool', 'special', 25.0, 150.0, 4, 'Carbide', 'AlTiN', NULL, 'Sonderanfertigung', 'SPECIAL-FORM-001', false,
         '{"special_profile": "custom_contour_xy"}'::jsonb, $1)
      ON CONFLICT (article_number) DO NOTHING;
    `, [userId || null]);

    // 14. Rüstblatt (P-12345 OP10)
    console.log('Creating setup sheet...');
    const programRow = await client.query(
      "SELECT id FROM programs WHERE operation_id = $1 AND program_number = 'O1234'",
      [operationId || null]
    );
    const programId = programRow.rows[0]?.id;
    const fixtureRow = await client.query("SELECT id FROM fixtures WHERE fixture_number = 'V00001'");
    const fixtureId = fixtureRow.rows[0]?.id;

    if (operationId && machineId && userId) {
      await client.query(`
        INSERT INTO setup_sheets (
          operation_id, machine_id, program_id, fixture_id,
          fixture_description, clamping_description,
          control_type, preset_number, wcs_x, wcs_y, wcs_z, reference_point,
          raw_material_dimensions, material_specification,
          setup_instructions, special_notes,
          status, created_by, updated_by
        )
        SELECT
          $1::integer, $2::integer, $3::integer, $4::integer,
          'Aufspannvorrichtung V00001 (Gehäuse OP10)',
          'Hydraulische Niederzugspanner 4x, Anzugsmoment 50 Nm',
          'heidenhain', 15, 100.000, 75.000, 80.000,
          'Nullpunkt: Oberkante Rohteil, Mitte Bohrung Ø12 vorne links',
          '210x160x85 mm', 'AlMgSi1 F28, gesägt',
          'EINRICHTUNG:\n1. Vorrichtung V00001 mit 4x M12 befestigen\n2. Rohteil einlegen, Anschlag hinten und links\n3. Niederzugspanner aktivieren (50 Nm)\n4. Preset 15 antasten: Oberkante + Mitte Ø12\n5. Werkzeugliste prüfen\n6. Programm O1234 laden\n\nPRÜFUNG NACH SPANNUNG:\n- Rohteil auf festen Sitz prüfen\n- Ausrichtung mit Messuhr ±0.02 mm',
          'ACHTUNG:\n- Bei Vibrationen sofort Stopp, Spannung nachprüfen\n- Kühlmittel: Emulsion 8 %, mind. 40 l/min\n- Nach jedem Teil Späne aus der Vorrichtung entfernen',
          'active', $5::integer, $5::integer
        WHERE NOT EXISTS (SELECT 1 FROM setup_sheets WHERE operation_id = $1::integer);
      `, [operationId, machineId, programId || null, fixtureId || null, userId]);
    }

    // 15. Werkzeugliste (Programm O1234)
    console.log('Creating tool list...');
    if (programId && userId) {
      const toolListResult = await client.query(`
        INSERT INTO tool_lists (program_id, created_by)
        VALUES ($1, $2)
        ON CONFLICT (program_id) DO NOTHING
        RETURNING id;
      `, [programId, userId]);

      if (toolListResult.rows.length > 0) {
        await client.query(`
          INSERT INTO tool_list_items (
            tool_list_id, tool_number, description, tool_type,
            manufacturer, order_number, tool_holder, notes, sequence
          )
          VALUES
            ($1, 'T01', 'Planfräser D63 Z4', 'Planfräser', 'ISCAR', 'F90LN D063-05-31.75-R-N15', 'HSK-A63', 'Planen Oberseite, Wendeschneidplatten APKT 1604', 1),
            ($1, 'T02', 'Schaftfräser D16 VHM', 'Schaftfräser', 'Gühring', '5510-16.000', 'HSK-A63 Spannzange ER32', 'Schruppen Oberseite', 2),
            ($1, 'T03', 'Bohrer D8.0 VHM', 'Bohrer', 'Gühring', '5512-8.000', 'HSK-A63 Spannzange ER32', 'Bohrungen vorbohren', 3);
        `, [toolListResult.rows[0].id]);
      }
    }

    // 16. Prüfplan (P-12345 OP20)
    console.log('Creating inspection plan...');
    const op20Result = await client.query(`
      SELECT o.id
      FROM operations o
      JOIN parts p ON o.part_id = p.id
      WHERE p.part_number = 'P-12345' AND o.op_number = 'OP20'
    `);
    const op20Id = op20Result.rows[0]?.id;

    if (op20Id && userId) {
      const planRes = await client.query(`
        INSERT INTO inspection_plans (operation_id, notes, created_by, updated_by)
        VALUES ($1, 'Erstmuster vollständig prüfen, danach jedes 10. Teil. Messprotokoll ablegen.', $2, $2)
        ON CONFLICT (operation_id) DO NOTHING
        RETURNING id;
      `, [op20Id, userId]);

      if (planRes.rows.length > 0) {
        await client.query(`
          INSERT INTO inspection_plan_items (
            inspection_plan_id, sequence_number, measurement_description,
            tolerance, min_value, max_value, nominal_value, mean_value,
            measuring_tool, instruction
          )
          VALUES
            ($1, 1, 'Gesamtlänge', '±0.1 mm', 199.90, 200.10, 200.00, 200.00, 'Messschieber 0-300 mm', 'Auf Messplatte, 20 °C ±2 °C'),
            ($1, 2, 'Gesamtbreite', '±0.1 mm', 149.90, 150.10, 150.00, 150.00, 'Messschieber 0-300 mm', 'An 3 Stellen messen, Mittelwert bilden'),
            ($1, 3, 'Höhe', 'ISO 2768-m (±0.3 mm)', 79.70, 80.30, 80.00, 80.00, 'Messschieber 0-150 mm', NULL),
            ($1, 4, 'Bohrung Ø12 H7 (Referenzbohrung)', 'H7', 12.000, 12.018, 12.009, 12.009, 'Grenzlehrdorn Ø12 H7', 'Gut-Seite muss durchgehen, Ausschuss-Seite nicht'),
            ($1, 5, 'Ebenheit Oberseite', '0.05 mm', NULL, 0.05, NULL, NULL, 'Messuhr auf Messplatte', 'Messuhr über die gesamte Fläche führen'),
            ($1, 6, 'Rauheit Ra Funktionsflächen', 'Ra ≤ 1.6 µm', NULL, 1.6, NULL, NULL, 'Rauheitsmessgerät', 'An 3 Messpunkten'),
            ($1, 7, 'Kanten entgratet', 'Grat max. 0.1 mm', NULL, 0.1, NULL, NULL, 'Sichtprüfung', 'Scharfe Kanten nicht zulässig');
        `, [planRes.rows[0].id]);
      }
    }

    // 17. Testbenutzer je Rolle (optional, nur mit eigenem Passwort, nie in Produktion)
    console.log('Creating test users...');
    let testUsersCreated = false;
    if (process.env.NODE_ENV === 'production') {
      console.log('   übersprungen (NODE_ENV=production)');
    } else if (!process.env.SEED_TEST_USER_PASSWORD) {
      console.log('   übersprungen (Passwort per SEED_TEST_USER_PASSWORD übergeben)');
    } else {
      const testHash = await hashPassword(process.env.SEED_TEST_USER_PASSWORD);
      await client.query(`
        INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
        VALUES
          ('programmer1', 'programmer1@example.com', $1, 'Hans', 'Müller', true),
          ('reviewer1', 'reviewer1@example.com', $1, 'Anna', 'Schmidt', true),
          ('operator1', 'operator1@example.com', $1, 'Michael', 'Weber', true),
          ('helper1', 'helper1@example.com', $1, 'Thomas', 'Meyer', true)
        ON CONFLICT (username) DO NOTHING;
      `, [testHash]);
      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        SELECT u.id, r.id FROM users u JOIN roles r ON r.name = regexp_replace(u.username, '1$', '')
        WHERE u.username IN ('programmer1', 'reviewer1', 'operator1', 'helper1')
        ON CONFLICT DO NOTHING;
      `);
      testUsersCreated = true;
    }

    await client.query('COMMIT');
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Erstellte Testdaten:');
    console.log('   • 3 Musterkunden (KD00001–KD00003)');
    console.log('   • 3 Maschinen (DMG DMU 50, Hermle C42U, Mazak Integrex)');
    console.log('   • 3 Bauteile mit Arbeitsgängen');
    console.log('   • 3 Werkzeuge');
    console.log('   • 1 NC-Programm mit Revision');
    console.log('   • 1 Wartungsplan mit Checkliste');
    console.log('   • 6 Lagerorte');
    console.log('   • 5 Lieferanten');
    console.log('   • 5 Messmittel');
    console.log('   • 5 Spannmittel');
    console.log('   • 4 Vorrichtungen');
    console.log('   • 5 Einträge im Werkzeugstamm');
    console.log('   • 1 Rüstblatt, 1 Werkzeugliste, 1 Prüfplan');
    if (testUsersCreated) {
      console.log('   • 4 Testbenutzer (programmer1, reviewer1, operator1, helper1)');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run seeding
if (require.main === module) {
  seed()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seed;
