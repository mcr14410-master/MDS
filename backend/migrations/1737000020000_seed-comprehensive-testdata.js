/* eslint-disable camelcase */

/**
 * Comprehensive Test Data Seed
 * 
 * Befüllt alle Tabellen mit realistischen Testdaten für Entwicklung
 * 
 * ACHTUNG: Nur für Entwicklungsumgebung verwenden!
 * Nicht in Produktion ausführen!
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // ==========================================================================
  // USERS - Zusätzliche Test-User
  // ==========================================================================
  pgm.sql(`
    INSERT INTO users (username, email, password_hash, first_name, last_name, is_active) VALUES
    ('programmer1', 'programmer@mds-test.de', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Hans', 'Müller', true),
    ('reviewer1', 'reviewer@mds-test.de', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Anna', 'Schmidt', true),
    ('operator1', 'operator@mds-test.de', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Michael', 'Weber', true),
    ('helper1', 'helper@mds-test.de', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'Thomas', 'Meyer', true)
    ON CONFLICT (username) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id FROM users u, roles r
    WHERE (u.username = 'programmer1' AND r.name = 'programmer')
       OR (u.username = 'reviewer1' AND r.name = 'reviewer')
       OR (u.username = 'operator1' AND r.name = 'operator')
       OR (u.username = 'helper1' AND r.name = 'helper')
    ON CONFLICT DO NOTHING;
  `);

  // ==========================================================================
  // CUSTOMERS
  // ==========================================================================
  pgm.sql(`
    INSERT INTO customers (name, customer_number, contact_person, email, phone, address, notes, is_active) VALUES
    ('Airbus Defence and Space GmbH', 'CUST-1001', 'Dr. Stefan Hoffmann', 's.hoffmann@airbus.com', '+49 89 607-0', 'Willy-Messerschmitt-Straße 1, 82024 Taufkirchen', 'Hauptkunde - Luft- und Raumfahrt', true),
    ('MTU Aero Engines AG', 'CUST-1002', 'Dipl.-Ing. Maria Bauer', 'm.bauer@mtu.de', '+49 89 1489-0', 'Dachauer Straße 665, 80995 München', 'Triebwerksteile, hohe Präzision', true),
    ('Premium AEROTEC GmbH', 'CUST-1003', 'Thomas Klein', 't.klein@premium-aerotec.com', '+49 421 538-0', 'Hünefeldstraße 1-5, 28199 Bremen', 'Strukturbauteile Großserien', true),
    ('Liebherr-Aerospace Lindenberg GmbH', 'CUST-1004', 'Sabine Wolf', 's.wolf@liebherr.com', '+49 8381 46-0', 'Pfänderstraße 50-52, 88161 Lindenberg', 'Fahrwerkskomponenten', true),
    ('RUAG Aviation', 'CUST-1005', 'Peter Schneider', 'p.schneider@ruag.com', '+41 58 204 50 00', 'Seetalstrasse 175, 6032 Emmen, Schweiz', 'Internationaler Partner', true)
    ON CONFLICT (customer_number) DO NOTHING;
  `);

  // ==========================================================================
  // MACHINES
  // ==========================================================================
  pgm.sql(`
    INSERT INTO machines (
      name, manufacturer, model, serial_number, machine_type, 
      control_type, control_version, num_axes,
      workspace_x, workspace_y, workspace_z,
      spindle_power, max_rpm, tool_capacity,
      location, postprocessor_name, is_active
    ) VALUES
    ('DMG-01', 'DMG MORI', 'DMU 65 monoBLOCK', 'DMU65-2021-001', '5-Achs-Bearbeitungszentrum', 'Heidenhain', 'TNC 640', 5, 650, 650, 560, 42, 18000, 42, 'Halle 1 - Position A1', 'HEIDENHAIN_TNC640_5AXIS', true),
    ('DMG-02', 'DMG MORI', 'DMC 125 FD duoBLOCK', 'DMC125-2020-002', '5-Achs-Portal', 'Heidenhain', 'TNC 640', 5, 1250, 1000, 1000, 57, 18000, 80, 'Halle 1 - Position B1', 'HEIDENHAIN_TNC640_5AXIS_PORTAL', true),
    ('HAAS-01', 'HAAS Automation', 'VF-3SS', 'VF3SS-2019-003', '3-Achs-Fräsmaschine', 'Haas', 'NGC', 3, 1016, 660, 635, 22.4, 12000, 24, 'Halle 2 - Position C2', 'HAAS_NGC_3AXIS', true),
    ('INDEX-01', 'INDEX-Werke', 'TRAUB TNL12', 'TNL12-2022-004', 'CNC-Drehmaschine', 'Siemens', '840D sl', 2, 300, 0, 450, 15, 6000, 12, 'Halle 1 - Position D3', 'SIEMENS_840D_TURNING', true),
    ('MAZAK-01', 'MAZAK', 'VARIAXIS i-700', 'VAR700-2018-005', '5-Achs-Bearbeitungszentrum', 'Mazatrol', '640M', 5, 700, 730, 660, 37, 12000, 40, 'Halle 2 - Position E1', 'MAZATROL_640M_5AXIS', true),
    ('HERMLE-01', 'HERMLE', 'C 42 U', 'C42U-2021-006', '5-Achs-Bearbeitungszentrum', 'Heidenhain', 'TNC 640', 5, 850, 900, 550, 40, 18000, 42, 'Halle 1 - Position F2', 'HEIDENHAIN_TNC640_5AXIS', true)
    ON CONFLICT (name) DO NOTHING;
  `);

  // ==========================================================================
  // PARTS
  // ==========================================================================
  pgm.sql(`
    INSERT INTO parts (
      customer_id, part_number, part_name, revision, material,
      drawing_number, weight, dimensions, description, is_active, created_by, status
    )
    SELECT 
      c.id,
      'A320-001-0815',
      'Flügelrippe Vorderkante',
      'C',
      'AlMgSi1 F28',
      'DWG-A320-FR-0815-C',
      2.45,
      '450x180x25',
      'Strukturbauteil für A320 Vorderkante, kritische Toleranzen nach EN 9100',
      true,
      u.id,
      'active'
    FROM customers c, users u
    WHERE c.customer_number = 'CUST-1001' AND u.username = 'admin'
    ON CONFLICT (part_number) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO parts (
      customer_id, part_number, part_name, revision, material,
      drawing_number, weight, dimensions, description, is_active, created_by, status
    )
    SELECT 
      c.id,
      'GTF-2023-4711',
      'Turbinenschaufel Stufe 2',
      'D',
      'Inconel 718',
      'DWG-GTF-TS2-4711-D',
      0.285,
      '120x35x8',
      'Hochtemperaturbauteil, Schaufelprofil mit Kühlkanälen',
      true,
      u.id,
      'active'
    FROM customers c, users u
    WHERE c.customer_number = 'CUST-1002' AND u.username = 'admin'
    ON CONFLICT (part_number) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO parts (
      customer_id, part_number, part_name, revision, material,
      drawing_number, weight, dimensions, description, is_active, created_by, status
    )
    SELECT 
      c.id,
      'LG-2024-1523',
      'Hauptfahrwerksbuchse',
      'B',
      '42CrMo4 V',
      'DWG-LG-HFB-1523-B',
      5.8,
      '200x80x80',
      'Hochfeste Buchse für Hauptfahrwerk, gehärtet HRC 32-38',
      true,
      u.id,
      'active'
    FROM customers c, users u
    WHERE c.customer_number = 'CUST-1004' AND u.username = 'admin'
    ON CONFLICT (part_number) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO parts (
      customer_id, part_number, part_name, revision, material,
      drawing_number, weight, dimensions, description, is_active, created_by, status
    )
    SELECT 
      c.id,
      'A350-2024-9988',
      'Kabinenbeschlag mittig',
      'A',
      'Ti6Al4V Grade 5',
      'DWG-A350-KB-9988-A',
      1.15,
      '250x120x15',
      'Titanbauteil für Kabinenstruktur, eloxiert',
      true,
      u.id,
      'active'
    FROM customers c, users u
    WHERE c.customer_number = 'CUST-1003' AND u.username = 'admin'
    ON CONFLICT (part_number) DO NOTHING;
  `);

  // ==========================================================================
  // OPERATIONS
  // ==========================================================================
  
  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP10',
      'Vorfräsen Oberseite',
      m.id,
      45,
      180.5,
      'Planfräsen der Oberseite, Aufmaß 0.5mm für Finish',
      10,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'A320-001-0815' 
      AND m.name = 'DMG-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP20',
      'Finish-Fräsen Kontur',
      m.id,
      30,
      425.8,
      '3D-Kontur mit Kugelfräser, IT8 Toleranz',
      20,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'A320-001-0815' 
      AND m.name = 'DMG-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP30',
      'Bohrungen Nietlöcher',
      m.id,
      20,
      95.2,
      '48x Bohrung Ø4.8mm H9, Positionstoleranz ±0.05mm',
      30,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'A320-001-0815' 
      AND m.name = 'HAAS-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP10',
      'Schaufelprofil Schruppen',
      m.id,
      90,
      285.0,
      '5-Achs Schruppen der Schaufelgeometrie',
      10,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'GTF-2023-4711' 
      AND m.name = 'HERMLE-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP20',
      'Schaufelprofil Schlichten',
      m.id,
      60,
      420.5,
      '5-Achs Finish mit Torusfräser, Ra 0.8µm',
      20,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'GTF-2023-4711' 
      AND m.name = 'HERMLE-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP10',
      'Drehen Außenkontur',
      m.id,
      25,
      145.8,
      'Drehen Ø80h6, Länge 200mm',
      10,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'LG-2024-1523' 
      AND m.name = 'INDEX-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP20',
      'Bohren Innenbohrung',
      m.id,
      30,
      95.5,
      'Bohren + Reiben Ø50H7',
      20,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'LG-2024-1523' 
      AND m.name = 'INDEX-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP30',
      'Fräsen Schlüsselflächen',
      m.id,
      35,
      68.2,
      'Fräsen 2x Nut 12mm x 80mm',
      30,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'LG-2024-1523' 
      AND m.name = 'DMG-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP10',
      'Fräsen Grundkörper',
      m.id,
      55,
      320.5,
      '5-Achs Bearbeitung Titankontur',
      10,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'A350-2024-9988' 
      AND m.name = 'MAZAK-01'
      AND u.username = 'admin';
  `);

  pgm.sql(`
    INSERT INTO operations (
      part_id, op_number, op_name, machine_id, 
      setup_time_minutes, cycle_time_seconds, description, sequence, created_by
    )
    SELECT 
      p.id,
      'OP20',
      'Bohrungen + Gewinde',
      m.id,
      25,
      125.0,
      '8x M6 Gewinde, 4x Durchgangsbohrung Ø8mm',
      20,
      u.id
    FROM parts p, machines m, users u
    WHERE p.part_number = 'A350-2024-9988' 
      AND m.name = 'MAZAK-01'
      AND u.username = 'admin';
  `);

  // ==========================================================================
  // PROGRAMS + REVISIONS
  // ==========================================================================
  
  pgm.sql(`
    WITH prog_insert AS (
      INSERT INTO programs (
        operation_id, program_number, program_name, description,
        workflow_state_id, created_by
      )
      SELECT 
        o.id,
        'A320_0815_OP10',
        'Vorfräsen Oberseite A320 Rippe',
        'CAM-Programm aus TopSolid, optimiert für DMG-01',
        ws.id,
        u.id
      FROM operations o, workflow_states ws, users u
      WHERE o.op_number = 'OP10'
        AND o.part_id = (SELECT id FROM parts WHERE part_number = 'A320-001-0815')
        AND ws.name = 'released'
        AND u.username = 'programmer1'
      RETURNING id
    )
    INSERT INTO program_revisions (
      program_id, version_major, version_minor, version_patch, version_string,
      filename, filepath, filesize, file_hash, mime_type,
      comment, is_cam_original, workflow_state_id,
      released_by, released_at, created_by
    )
    SELECT 
      pi.id,
      1, 0, 0, '1.0.0',
      'A320_0815_OP10_V1.nc',
      '/programs/A320_0815_OP10_V1.nc',
      15420,
      'abc123def456',
      'application/x-nc-program',
      'Initiale Version aus CAM, freigegeben für Produktion',
      true,
      ws.id,
      u.id,
      CURRENT_TIMESTAMP,
      u.id
    FROM prog_insert pi, workflow_states ws, users u
    WHERE ws.name = 'released' AND u.username = 'reviewer1';
  `);

  pgm.sql(`
    WITH prog_insert AS (
      INSERT INTO programs (
        operation_id, program_number, program_name, description,
        workflow_state_id, created_by
      )
      SELECT 
        o.id,
        'A320_0815_OP20',
        'Finish-Fräsen Kontur A320 Rippe',
        '3D-Konturbearbeitung mit Ballnose-Strategie',
        ws.id,
        u.id
      FROM operations o, workflow_states ws, users u
      WHERE o.op_number = 'OP20'
        AND o.part_id = (SELECT id FROM parts WHERE part_number = 'A320-001-0815')
        AND ws.name = 'released'
        AND u.username = 'programmer1'
      RETURNING id
    )
    INSERT INTO program_revisions (
      program_id, version_major, version_minor, version_patch, version_string,
      filename, filepath, filesize, file_hash, mime_type,
      comment, is_cam_original, workflow_state_id,
      released_by, released_at, created_by
    )
    SELECT 
      pi.id,
      1, 1, 0, '1.1.0',
      'A320_0815_OP20_V1-1.nc',
      '/programs/A320_0815_OP20_V1-1.nc',
      28540,
      'def789ghi012',
      'application/x-nc-program',
      'Optimierte Version - Vorschub erhöht, Zykluszeit -45s',
      false,
      ws.id,
      u.id,
      CURRENT_TIMESTAMP,
      u.id
    FROM prog_insert pi, workflow_states ws, users u
    WHERE ws.name = 'released' AND u.username = 'reviewer1';
  `);

  pgm.sql(`
    WITH prog_insert AS (
      INSERT INTO programs (
        operation_id, program_number, program_name, description,
        workflow_state_id, created_by
      )
      SELECT 
        o.id,
        'GTF_4711_OP10',
        'Schaufelprofil Schruppen',
        '5-Achs Schruppstrategie für Inconel',
        ws.id,
        u.id
      FROM operations o, workflow_states ws, users u
      WHERE o.op_number = 'OP10'
        AND o.part_id = (SELECT id FROM parts WHERE part_number = 'GTF-2023-4711')
        AND ws.name = 'released'
        AND u.username = 'programmer1'
      RETURNING id
    )
    INSERT INTO program_revisions (
      program_id, version_major, version_minor, version_patch, version_string,
      filename, filepath, filesize, file_hash, mime_type,
      comment, is_cam_original, workflow_state_id,
      released_by, released_at, created_by
    )
    SELECT 
      pi.id,
      2, 0, 1, '2.0.1',
      'GTF_4711_OP10_V2-0-1.nc',
      '/programs/GTF_4711_OP10_V2-0-1.nc',
      42180,
      'jkl345mno678',
      'application/x-nc-program',
      'Major Update: Neue Schruppstrategie mit Trochoidal-Fräsen',
      false,
      ws.id,
      u.id,
      CURRENT_TIMESTAMP,
      u.id
    FROM prog_insert pi, workflow_states ws, users u
    WHERE ws.name = 'released' AND u.username = 'reviewer1';
  `);

  pgm.sql(`
    INSERT INTO programs (
      operation_id, program_number, program_name, description,
      workflow_state_id, created_by
    )
    SELECT 
      o.id,
      'A350_9988_OP10',
      'Fräsen Grundkörper Titan',
      'Noch in Entwicklung - Titan-Bearbeitungsparameter werden optimiert',
      ws.id,
      u.id
    FROM operations o, workflow_states ws, users u
    WHERE o.op_number = 'OP10'
      AND o.part_id = (SELECT id FROM parts WHERE part_number = 'A350-2024-9988')
      AND ws.name = 'draft'
      AND u.username = 'programmer1';
  `);

  // ==========================================================================
  // SETUP SHEETS
  // ==========================================================================
  
  pgm.sql(`
    INSERT INTO setup_sheets (
      operation_id, machine_id, program_id,
      fixture_description, clamping_description,
      control_type, preset_number, wcs_x, wcs_y, wcs_z, reference_point,
      raw_material_dimensions, material_specification,
      setup_instructions, special_notes,
      status, created_by, updated_by
    )
    SELECT 
      o.id,
      m.id,
      p.id,
      'Spannvorrichtung SPV-A320-FR-001 (Aluminium 3-Backen-Spannung)',
      'Hydraulische Niederzugspanner 4x, Anzugsmoment 50Nm',
      'heidenhain',
      15,
      225.000,
      90.000,
      25.000,
      'Nullpunkt: Oberkante Rohteil, Mitte Bohrung Ø12mm vorne links',
      '480x200x30mm',
      'AlMgSi1 F28, gewalzt, entgratet',
      E'EINRICHTUNG:\n1. Spannvorrichtung SPV-A320-FR-001 mit 4x M12 Schrauben befestigen\n2. Rohteil einlegen, Anschlag hinten und links\n3. Niederzugspanner aktivieren (50Nm)\n4. Preset 15 antasten: Oberkante + Mittelpunkt Ø12\n5. Werkzeugliste prüfen (siehe Tool List)\n6. Programm A320_0815_OP10 laden\n\nPRÜFUNG NACH SPANNUNG:\n- Rohteil auf festen Sitz prüfen\n- Anschläge kontrollieren\n- Ausrichtung mit Messuhr ±0.02mm',
      E'ACHTUNG:\n- Bei Vibrationen sofort Stop! → Spannung nachprüfen\n- Kühlmittel: Emulsion 8%, Durchfluss min. 40 l/min\n- Nach jedem Teil: Späne aus Vorrichtung entfernen',
      'active',
      u.id,
      u.id
    FROM operations o
    JOIN machines m ON o.machine_id = m.id
    JOIN programs p ON p.operation_id = o.id
    JOIN users u ON u.username = 'programmer1'
    WHERE o.op_number = 'OP10'
      AND o.part_id = (SELECT id FROM parts WHERE part_number = 'A320-001-0815');
  `);

  pgm.sql(`
    INSERT INTO setup_sheets (
      operation_id, machine_id, program_id,
      fixture_description, clamping_description,
      control_type, preset_number, wcs_x, wcs_y, wcs_z, reference_point,
      raw_material_dimensions, material_specification,
      setup_instructions, special_notes,
      status, created_by, updated_by
    )
    SELECT 
      o.id,
      m.id,
      p.id,
      'Universal-Schraubstock 5-Achs mit Prismenbacken',
      'Schraubstock Typ HILMA NC5, Spannkraft 35kN',
      'heidenhain',
      8,
      0.000,
      0.000,
      0.000,
      'Nullpunkt: Maschinennullpunkt (Schwenkpunkt 5-Achs-Kopf)',
      '130x40x12mm (bereits vorbearbeitet aus OP10)',
      'Inconel 718, lösungsgeglüht',
      E'EINRICHTUNG:\n1. 5-Achs Schraubstock in Position A=0° B=0° bringen\n2. Werkstück mit geschliffenen Parallelunterlagen (8mm) einspannen\n3. Spannkraft 35kN einstellen und kontrollieren\n4. Preset 8 auf Maschinennullpunkt setzen\n5. Werkstücknullpunkt als Offset in CAM-Koordinaten\n6. Alle 12 Werkzeuge im Magazin prüfen\n\nKONTROLLE:\n- Schwenkwinkel vor Programmstart: A=0° B=0°\n- Werkstückausrichtung mit 3D-Taster ±0.01mm\n- Parallelunterlagen fest und sauber',
      E'KRITISCH - INCONEL:\n- Nur scharfe Werkzeuge verwenden (max. 3 Teile pro Schneide)\n- Schnittdaten NICHT erhöhen\n- Bei Rattern SOFORT STOP → Programmierer informieren\n- Kühlschmierung: Hochdruckkühlung 80bar, Durchfluss 60 l/min\n- Späne regelmäßig entfernen (Brandgefahr!)',
      'active',
      u.id,
      u.id
    FROM operations o
    JOIN machines m ON o.machine_id = m.id
    JOIN programs p ON p.operation_id = o.id
    JOIN users u ON u.username = 'programmer1'
    WHERE o.op_number = 'OP10'
      AND o.part_id = (SELECT id FROM parts WHERE part_number = 'GTF-2023-4711');
  `);

  // ==========================================================================
  // TOOL LISTS
  // ==========================================================================
  
  pgm.sql(`
    WITH tl_insert AS (
      INSERT INTO tool_lists (program_id, created_by)
      SELECT p.id, u.id
      FROM programs p, users u
      WHERE p.program_number = 'A320_0815_OP10'
        AND u.username = 'programmer1'
      RETURNING id
    )
    INSERT INTO tool_list_items (
      tool_list_id, tool_number, description, tool_type,
      manufacturer, order_number, tool_holder, notes, sequence
    ) VALUES
    ((SELECT id FROM tl_insert), 'T01', 'Planfräser D63 Z4 APKT', 'Planfräser', 'ISCAR', 'F90LN D063-05-31.75-R-N15', 'HSK-A63', 'Hauptzeit-Werkzeug, Wendeschneidplatten APKT 1604', 1),
    ((SELECT id FROM tl_insert), 'T02', 'Schaftfräser D16 Z3 VHM', 'Schaftfräser', 'Garant', '202460 16', 'HSK-A63 Spannzange ER32', 'Schruppen Taschen', 2),
    ((SELECT id FROM tl_insert), 'T03', 'Schaftfräser D12 Z4 VHM', 'Schaftfräser', 'Walter', 'MC326-12.0', 'HSK-A63 Spannzange ER32', 'Konturbearbeitung', 3);
  `);

  pgm.sql(`
    WITH tl_insert AS (
      INSERT INTO tool_lists (program_id, created_by)
      SELECT p.id, u.id
      FROM programs p, users u
      WHERE p.program_number = 'GTF_4711_OP10'
        AND u.username = 'programmer1'
      RETURNING id
    )
    INSERT INTO tool_list_items (
      tool_list_id, tool_number, description, tool_type,
      manufacturer, order_number, tool_holder, tool_life_info, notes, sequence
    ) VALUES
    ((SELECT id FROM tl_insert), 'T01', 'Kugelfräser D6 R3 für Inconel', 'Kugelfräser', 'Sandvik', 'R216.24-06030-AC28P', 'HSK-A63 Spannzange ER20', 'Standzeit: max. 3 Schaufeln', '5-Achs Schruppen, Trochoidal-Strategie', 1),
    ((SELECT id FROM tl_insert), 'T02', 'Kugelfräser D8 R4 für Inconel', 'Kugelfräser', 'Sandvik', 'R216.24-08040-AC28P', 'HSK-A63 Spannzange ER20', 'Standzeit: max. 3 Schaufeln', 'Grobbearbeitung Schaufelrücken', 2),
    ((SELECT id FROM tl_insert), 'T03', 'Torusfräser D10 R2 Hartmetall', 'Torusfräser', 'Kennametal', 'B051A10002AKPCB', 'HSK-A63 Spannzange ER25', 'Standzeit: max. 5 Schaufeln', 'Vorschlichten Schaufelkontur', 3),
    ((SELECT id FROM tl_insert), 'T04', 'Fasenfräser 90° D12', 'Fasen-/Entgratfräser', 'Gühring', '716 12.0', 'HSK-A63 Spannzange ER32', 'Standardwerkzeug', 'Kanten brechen 0.2-0.5mm', 4);
  `);

  // ==========================================================================
  // INSPECTION PLANS
  // ==========================================================================
  
  pgm.sql(`
    WITH ip_insert AS (
      INSERT INTO inspection_plans (operation_id, notes, created_by, updated_by)
      SELECT 
        o.id,
        'Kritische Luftfahrt-Toleranzen nach EN 9100. Messprotokoll für jedes Teil erforderlich.',
        u.id,
        u.id
      FROM operations o, users u
      WHERE o.op_number = 'OP20'
        AND o.part_id = (SELECT id FROM parts WHERE part_number = 'A320-001-0815')
        AND u.username = 'admin'
      RETURNING id
    )
    INSERT INTO inspection_plan_items (
      inspection_plan_id, sequence_number, measurement_description,
      tolerance, min_value, max_value, nominal_value, mean_value,
      measuring_tool, instruction
    ) VALUES
    ((SELECT id FROM ip_insert), 1, 'Gesamtlänge', '±0.1mm', 449.90, 450.10, 450.00, 450.00, 'Messschieber 0-500mm Auflösung 0.01mm', 'Messung auf Messplatte, Temperatur 20°C±2°C'),
    ((SELECT id FROM ip_insert), 2, 'Gesamtbreite', '±0.1mm', 179.90, 180.10, 180.00, 180.00, 'Messschieber 0-300mm', 'An 3 Stellen messen, Mittelwert bilden'),
    ((SELECT id FROM ip_insert), 3, 'Dicke nach Bearbeitung', 'ISO 2768-m (±0.15)', 24.85, 25.15, 25.00, 25.00, 'Bügelmessschraube 0-25mm', 'An 5 Positionen messen laut Zeichnung'),
    ((SELECT id FROM ip_insert), 4, 'Bohrung Ø12 H7 (Referenzbohrung)', 'H7', 12.000, 12.018, 12.009, 12.009, 'Innenmessschraube Ø10-12mm', 'Grenzlehrdorn verwenden zur Vorkontrolle'),
    ((SELECT id FROM ip_insert), 5, 'Parallelität Oberseite zu Unterseite', '0.05mm', NULL, 0.05, NULL, NULL, 'Messuhr auf Messplatte', 'Werkstück auf 3 Punkten auflegen, Messuhr über gesamte Fläche'),
    ((SELECT id FROM ip_insert), 6, 'Kontur-Profil kritischer Bereich A', '±0.08mm', -0.08, 0.08, 0.00, 0.00, 'Formmessgerät oder 3D-Koordinatenmessgerät', 'Nur bei Erstmuster und alle 50 Teile'),
    ((SELECT id FROM ip_insert), 7, 'Oberflächenrauheit Ra Funktionsflächen', 'Ra ≤ 1.6µm', NULL, 1.6, NULL, NULL, 'Oberflächenmessgerät Mahr Perthometer', 'An 3 Messpunkten, Tastschnittverfahren'),
    ((SELECT id FROM ip_insert), 8, 'Grat an Außenkanten', 'Grat max. 0.1mm', NULL, 0.1, NULL, NULL, 'Sichtprüfung + Fühlerlehre', 'Alle Kanten entgratet? Scharfe Kanten verboten!');
  `);

  pgm.sql(`
    WITH ip_insert AS (
      INSERT INTO inspection_plans (operation_id, notes, created_by, updated_by)
      SELECT 
        o.id,
        '100% Prüfung jeder Schaufel. Triebwerksbauteil - höchste Qualitätsanforderungen. Bei Abweichung: Sofort Produktionsleiter informieren!',
        u.id,
        u.id
      FROM operations o, users u
      WHERE o.op_number = 'OP20'
        AND o.part_id = (SELECT id FROM parts WHERE part_number = 'GTF-2023-4711')
        AND u.username = 'admin'
      RETURNING id
    )
    INSERT INTO inspection_plan_items (
      inspection_plan_id, sequence_number, measurement_description,
      tolerance, min_value, max_value, nominal_value, mean_value,
      measuring_tool, instruction
    ) VALUES
    ((SELECT id FROM ip_insert), 1, 'Schaufellänge gesamt', '±0.05mm', 119.95, 120.05, 120.00, 120.00, 'Digitale Messschieber 0-150mm Mitutoyo', 'Messung im klimatisierten Messraum 20°C'),
    ((SELECT id FROM ip_insert), 2, 'Schaufelbreite max. Punkt', '±0.03mm', 34.97, 35.03, 35.00, 35.00, '3D-Koordinatenmessgerät Zeiss', 'Mit Messprogramm PROG_GTF_4711_OP20'),
    ((SELECT id FROM ip_insert), 3, 'Schaufeldicke Vorderkante', '±0.02mm', 7.98, 8.02, 8.00, 8.00, '3D-Koordinatenmessgerät Zeiss', 'An 5 definierten Schnitten messen'),
    ((SELECT id FROM ip_insert), 4, 'Profiltreue Schaufelrücken', '±0.05mm', -0.05, 0.05, 0.00, 0.00, '3D-Scan + Soll-Ist-Vergleich', 'Scanbericht erstellen, Farbkarte Abweichung'),
    ((SELECT id FROM ip_insert), 5, 'Profiltreue Schaufelinnenseite', '±0.05mm', -0.05, 0.05, 0.00, 0.00, '3D-Scan + Soll-Ist-Vergleich', 'Scanbericht erstellen, kritische Bereiche markieren'),
    ((SELECT id FROM ip_insert), 6, 'Oberflächenrauheit Ra Schaufelrücken', 'Ra ≤ 0.8µm', NULL, 0.8, NULL, NULL, 'Oberflächenmessgerät Mahr', 'Messung in Strömungsrichtung, 3 Messpunkte'),
    ((SELECT id FROM ip_insert), 7, 'Oberflächenrauheit Ra Schaufelinnenseite', 'Ra ≤ 0.8µm', NULL, 0.8, NULL, NULL, 'Oberflächenmessgerät Mahr', 'Messung in Strömungsrichtung, 3 Messpunkte'),
    ((SELECT id FROM ip_insert), 8, 'Kühlkanal-Öffnungen Ø', 'Ø2.0 ±0.05mm', 1.95, 2.05, 2.00, 2.00, 'Messmikroskop', 'Alle 6 Öffnungen vermessen'),
    ((SELECT id FROM ip_insert), 9, 'Rissfreiheit (Eindringprüfung)', 'Keine Risse zulässig', NULL, NULL, NULL, NULL, 'Farbeindringprüfung nach DIN EN ISO 3452', 'ZfP-Prüfer Level 2 erforderlich, Prüfbericht'),
    ((SELECT id FROM ip_insert), 10, 'Oberflächenfehler Sichtprüfung', 'Keine Kratzer >0.1mm tief', NULL, NULL, NULL, NULL, 'Visuelle Prüfung bei 2x Vergrößerung', 'Lupe, gute Beleuchtung, 100% der Oberfläche');
  `);

  // ==========================================================================
  // TOOLS (Master Data)
  // ==========================================================================
  pgm.sql(`
    INSERT INTO tools (
      tool_number, tool_name, tool_type, diameter, length, flutes,
      material, coating, manufacturer, order_number,
      cutting_speed, feed_per_tooth, max_rpm, cost,
      stock_quantity, min_stock, notes, is_active
    ) VALUES
    ('WKZ-001', 'Planfräser APKT D63 Z4', 'Planfräser', 63.000, 50.00, 4, 'Hartmetall', 'TiAlN', 'ISCAR', 'F90LN D063-05-31.75-R-N15', 250.00, 0.1500, 3000, 285.50, 2, 1, 'Standard Planfräser für Aluminium', true),
    ('WKZ-002', 'Schaftfräser VHM D16 Z3', 'Schaftfräser', 16.000, 100.00, 3, 'VHM', 'AlTiN', 'Garant', '202460 16', 180.00, 0.0800, 15000, 42.80, 5, 2, 'Universal-Schaftfräser', true),
    ('WKZ-003', 'Schaftfräser VHM D12 Z4', 'Schaftfräser', 12.000, 90.00, 4, 'VHM', 'TiAlN', 'Walter', 'MC326-12.0', 200.00, 0.0600, 18000, 38.90, 4, 2, 'Konturbearbeitung Aluminium', true),
    ('WKZ-010', 'Kugelfräser D6 R3 Inconel', 'Kugelfräser', 6.000, 60.00, 2, 'VHM', 'AlCrN', 'Sandvik', 'R216.24-06030-AC28P', 35.00, 0.0200, 8000, 156.00, 3, 2, 'Spezial für Inconel 718, Standzeit 3 Teile', true),
    ('WKZ-011', 'Kugelfräser D8 R4 Inconel', 'Kugelfräser', 8.000, 70.00, 2, 'VHM', 'AlCrN', 'Sandvik', 'R216.24-08040-AC28P', 40.00, 0.0250, 7000, 178.50, 2, 1, 'Spezial für Inconel 718, Standzeit 3 Teile', true),
    ('WKZ-012', 'Torusfräser D10 R2 HM', 'Torusfräser', 10.000, 75.00, 4, 'Hartmetall', 'TiAlN', 'Kennametal', 'B051A10002AKPCB', 45.00, 0.0300, 8500, 142.30, 2, 1, 'Vorschlichten Inconel', true),
    ('WKZ-020', 'Fasenfräser 90° D12', 'Entgratfräser', 12.000, 80.00, 4, 'HSS-E', 'TiN', 'Gühring', '716 12.0', 80.00, 0.0500, 5000, 28.90, 8, 3, 'Standard Entgratung', true),
    ('WKZ-030', 'Bohrer VHM D4.8 DIN 338', 'Bohrer', 4.800, 90.00, 2, 'VHM', 'TiAlN', 'Gühring', '5512 4.8', 50.00, 0.0400, 8000, 18.50, 12, 5, 'Nietlöcher Aluminium', true),
    ('WKZ-031', 'Bohrer VHM D8.0 DIN 338', 'Bohrer', 8.000, 120.00, 2, 'VHM', 'TiAlN', 'Gühring', '5512 8.0', 60.00, 0.0500, 6000, 24.80, 8, 4, 'Durchgangsbohrungen', true),
    ('WKZ-040', 'Reibahle D50 H7', 'Reibahle', 50.000, 200.00, 6, 'HSS-E', 'TiN', 'Emuge', 'Z253050.0086', 25.00, 0.2000, 400, 187.60, 1, 1, 'Fahrwerksbuchse Innenbohrung', true),
    ('WKZ-050', 'Gewindebohrer M6 DIN 371', 'Gewindebohrer', 6.000, 80.00, 3, 'HSS-E', 'TiN', 'Emuge', 'C0301060.0050', 8.00, 1.0000, 800, 12.40, 15, 5, 'Maschinengewindebohrer Durchgangsloch', true)
    ON CONFLICT (tool_number) DO NOTHING;
  `);

  // ==========================================================================
  // COMMENTS / AUDIT EXAMPLES
  // ==========================================================================
  pgm.sql(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, reason, ip_address)
    SELECT 
      u.id,
      'program',
      p.id,
      'RELEASE',
      'Programm nach erfolgreicher Testbearbeitung freigegeben. Zykluszeit bestätigt.',
      '192.168.1.100'::inet
    FROM users u, programs p
    WHERE u.username = 'reviewer1' 
      AND p.program_number = 'A320_0815_OP10';
  `);

  pgm.sql(`
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, reason, ip_address)
    SELECT 
      u.id,
      'program',
      p.id,
      'UPDATE',
      'Vorschuboptimierung nach Rücksprache mit Maschinenbediener',
      '192.168.1.105'::inet
    FROM users u, programs p
    WHERE u.username = 'programmer1' 
      AND p.program_number = 'A320_0815_OP20';
  `);
};

exports.down = async (pgm) => {
  pgm.sql(`DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE username IN ('programmer1', 'reviewer1', 'operator1', 'helper1'));`);
  pgm.sql(`DELETE FROM inspection_plan_items WHERE inspection_plan_id IN (SELECT id FROM inspection_plans WHERE operation_id IN (SELECT id FROM operations WHERE part_id IN (SELECT id FROM parts WHERE part_number LIKE 'A320-%' OR part_number LIKE 'GTF-%' OR part_number LIKE 'LG-%' OR part_number LIKE 'A350-%')));`);
  pgm.sql(`DELETE FROM inspection_plans WHERE operation_id IN (SELECT id FROM operations WHERE part_id IN (SELECT id FROM parts WHERE part_number LIKE 'A320-%' OR part_number LIKE 'GTF-%' OR part_number LIKE 'LG-%' OR part_number LIKE 'A350-%'));`);
  pgm.sql(`DELETE FROM tool_list_items WHERE tool_list_id IN (SELECT id FROM tool_lists WHERE program_id IN (SELECT id FROM programs WHERE program_number LIKE 'A320_%' OR program_number LIKE 'GTF_%' OR program_number LIKE 'LG_%' OR program_number LIKE 'A350_%'));`);
  pgm.sql(`DELETE FROM tool_lists WHERE program_id IN (SELECT id FROM programs WHERE program_number LIKE 'A320_%' OR program_number LIKE 'GTF_%' OR program_number LIKE 'LG_%' OR program_number LIKE 'A350_%');`);
  pgm.sql(`DELETE FROM setup_sheet_photos WHERE setup_sheet_id IN (SELECT id FROM setup_sheets WHERE operation_id IN (SELECT id FROM operations WHERE part_id IN (SELECT id FROM parts WHERE part_number LIKE 'A320-%' OR part_number LIKE 'GTF-%' OR part_number LIKE 'LG-%' OR part_number LIKE 'A350-%')));`);
  pgm.sql(`DELETE FROM setup_sheets WHERE operation_id IN (SELECT id FROM operations WHERE part_id IN (SELECT id FROM parts WHERE part_number LIKE 'A320-%' OR part_number LIKE 'GTF-%' OR part_number LIKE 'LG-%' OR part_number LIKE 'A350-%'));`);
  pgm.sql(`DELETE FROM program_revisions WHERE program_id IN (SELECT id FROM programs WHERE program_number LIKE 'A320_%' OR program_number LIKE 'GTF_%' OR program_number LIKE 'LG_%' OR program_number LIKE 'A350_%');`);
  pgm.sql(`DELETE FROM programs WHERE program_number LIKE 'A320_%' OR program_number LIKE 'GTF_%' OR program_number LIKE 'LG_%' OR program_number LIKE 'A350_%';`);
  pgm.sql(`DELETE FROM operations WHERE part_id IN (SELECT id FROM parts WHERE part_number LIKE 'A320-%' OR part_number LIKE 'GTF-%' OR part_number LIKE 'LG-%' OR part_number LIKE 'A350-%');`);
  pgm.sql(`DELETE FROM parts WHERE part_number LIKE 'A320-%' OR part_number LIKE 'GTF-%' OR part_number LIKE 'LG-%' OR part_number LIKE 'A350-%';`);
  pgm.sql(`DELETE FROM tools WHERE tool_number LIKE 'WKZ-%';`);
  pgm.sql(`DELETE FROM machines WHERE name LIKE 'DMG-%' OR name LIKE 'HAAS-%' OR name LIKE 'INDEX-%' OR name LIKE 'MAZAK-%' OR name LIKE 'HERMLE-%';`);
  pgm.sql(`DELETE FROM customers WHERE customer_number LIKE 'CUST-10%';`);
  pgm.sql(`DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE username IN ('programmer1', 'reviewer1', 'operator1', 'helper1'));`);
  pgm.sql(`DELETE FROM users WHERE username IN ('programmer1', 'reviewer1', 'operator1', 'helper1');`);
};
