const { Pool } = require('pg');
const dotenv = require('dotenv');

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
        ('Airbus Defence & Space GmbH', 'K-001', 'Max Mustermann', 'max.mustermann@airbus.com', '+49 89 1234567', 'München, Deutschland'),
        ('BMW AG', 'K-002', 'Anna Schmidt', 'anna.schmidt@bmw.de', '+49 89 7654321', 'München, Deutschland'),
        ('Siemens AG', 'K-003', 'Thomas Weber', 'thomas.weber@siemens.com', '+49 89 9876543', 'München, Deutschland')
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
      await client.query(`
        INSERT INTO operations (
          part_id, op_number, op_name, machine_id,
          setup_time_minutes, cycle_time_seconds, description, sequence, created_by
        )
        VALUES 
          ($1, 'OP10', 'Schruppen Oberseite', $2, 45, 180.5, 'Schruppen der Oberseite mit Aufmaß 0.5mm', 1, $3),
          ($1, 'OP20', 'Schlichten Oberseite', $2, 30, 240.3, 'Schlichtbearbeitung Oberseite auf Endmaß', 2, $3),
          ($1, 'OP30', 'Taschen und Bohrungen', $2, 20, 156.8, 'Taschen fräsen und Bohrungen M6 und M8', 3, $3)
        ON CONFLICT (part_id, op_number) DO NOTHING;
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
        VALUES ($1, 'O1234', 'GEHAEUSE_OP10', 'Schruppprogramm für Gehäuse', $2, $3)
        ON CONFLICT DO NOTHING
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
        VALUES (
          $1, $2, 'Tägliche Sichtkontrolle DMG DMU 50',
          'Tägliche Überprüfung von Kühlmittelstand, Schmierung und Sauberkeit',
          'days', 1, NOW() + INTERVAL '1 day',
          'helper', 15, 'normal',
          '1. Kühlmittelstand prüfen\n2. Späne entfernen\n3. Sichtprüfung auf Leckagen',
          $3
        )
        ON CONFLICT DO NOTHING
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
        ('Gühring KG', 'LF-001', 'Herr Schmidt', 'vertrieb@guehring.de', '+49 7443 17-0', 'www.guehring.de', 'Herderstraße 50-54', '72458', 'Albstadt', 'Deutschland', '30 Tage netto', 3, true, true),
        ('Hoffmann Group', 'LF-002', 'Frau Weber', 'service@hoffmann-group.com', '+49 89 8391-0', 'www.hoffmann-group.com', 'Haberlandstraße 55', '81241', 'München', 'Deutschland', '14 Tage 2% Skonto', 2, true, true),
        ('Mitutoyo Deutschland', 'LF-003', 'Herr Müller', 'info@mitutoyo.de', '+49 2104 4868-0', 'www.mitutoyo.de', 'Borsigstraße 8-10', '41469', 'Neuss', 'Deutschland', '30 Tage netto', 5, false, true),
        ('Schunk GmbH', 'LF-004', 'Frau Bauer', 'info@schunk.com', '+49 7133 103-0', 'www.schunk.com', 'Bahnhofstraße 106-134', '74348', 'Lauffen', 'Deutschland', '30 Tage netto', 7, true, true),
        ('Emuge-Franken', 'LF-005', 'Herr Fischer', 'info@emuge.de', '+49 9131 87-0', 'www.emuge.de', 'Nürnberger Straße 96-100', '91207', 'Lauf', 'Deutschland', '30 Tage netto', 4, false, true)
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

    await client.query('COMMIT');
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Erstellte Testdaten:');
    console.log('   • 3 Kunden (Airbus, BMW, Siemens)');
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
