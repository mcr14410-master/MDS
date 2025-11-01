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

    // 2. Test-Maschinen
    console.log('Creating machines...');
    await client.query(`
      INSERT INTO machines (
        name, manufacturer, model, serial_number, machine_type, 
        control_type, control_version, num_axes, 
        workspace_x, workspace_y, workspace_z,
        spindle_power, max_rpm, tool_capacity, location, 
        postprocessor_name, network_path
      )
      VALUES 
        ('DMG DMU 50', 'DMG Mori', 'DMU 50', 'SN12345', 'milling', 
         'Heidenhain TNC640', '640 SP5', 5, 
         500, 400, 400, 
         18.5, 18000, 30, 'Halle A, Pos. 1', 
         'Heidenhain_5Axis', '\\\\fileserver\\cnc\\dmu50'),
        
        ('Hermle C42U', 'Hermle', 'C42U', 'SN67890', 'milling',
         'Heidenhain TNC640', '640 SP6', 5,
         1000, 1100, 600,
         33, 18000, 42, 'Halle A, Pos. 2',
         'Heidenhain_5Axis_C42', '\\\\fileserver\\cnc\\hermle'),
        
        ('Mazak Integrex i-200', 'Mazak', 'Integrex i-200', 'SN11122', 'mill-turn',
         'Mazatrol Matrix Nexus 2', '2.0', 5,
         560, 1000, 500,
         26, 6000, 40, 'Halle B, Pos. 1',
         'Mazak_Matrix', '\\\\fileserver\\cnc\\mazak')
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

    await client.query('COMMIT');
    console.log('\n✅ Database seeding completed successfully!');
    
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
