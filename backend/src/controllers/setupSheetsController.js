/**
 * Setup Sheets Controller
 * 
 * CRUD Operations für Einrichteblätter (Setup Sheets)
 */

const db = require('../config/db');

/**
 * GET /api/setup-sheets
 * Liste aller Setup Sheets (mit Filter-Optionen)
 */
exports.getSetupSheets = async (req, res) => {
  try {
    const { operation_id, machine_id, status } = req.query;

    let query = `
      SELECT 
        ss.*,
        o.op_name,
        o.op_number,
        p.part_number,
        p.part_name,
		m.name as machine_name,
		m.serial_number as machine_number,
		prog.program_number,
		prog.program_name,
		rev.version_string as program_version,
		rev.filename as program_filename,
		u_created.username as created_by_name,
        u_updated.username as updated_by_name,
        (SELECT COUNT(*) FROM setup_sheet_photos WHERE setup_sheet_id = ss.id) as photo_count
		FROM setup_sheets ss
		JOIN operations o ON ss.operation_id = o.id
		JOIN parts p ON o.part_id = p.id
		JOIN machines m ON ss.machine_id = m.id
		LEFT JOIN programs prog ON ss.program_id = prog.id
		LEFT JOIN program_revisions rev ON prog.current_revision_id = rev.id
		LEFT JOIN users u_created ON ss.created_by = u_created.id
		LEFT JOIN users u_updated ON ss.updated_by = u_updated.id
		WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (operation_id) {
      query += ` AND ss.operation_id = $${paramCount++}`;
      params.push(operation_id);
    }

    if (machine_id) {
      query += ` AND ss.machine_id = $${paramCount++}`;
      params.push(machine_id);
    }

    if (status) {
      query += ` AND ss.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY ss.updated_at DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching setup sheets:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Einrichteblätter',
      error: error.message
    });
  }
};

/**
 * GET /api/setup-sheets/:id
 * Einzelnes Setup Sheet mit allen Details + Fotos
 */
exports.getSetupSheetById = async (req, res) => {
  try {
    const { id } = req.params;

    // Setup Sheet laden
    const sheetQuery = `
      SELECT 
        ss.*,
        o.op_name,
        o.op_number,
        o.sequence as operation_sequence,
		p.part_number,
		p.part_name,
		c.name as customer_name,
		c.customer_number,
		m.name as machine_name,
		m.serial_number as machine_number,
		m.control_type as machine_control_type,
		prog.program_number,
		prog.program_name,
		rev.version_string as program_version,
		rev.filename as program_filename,
		u_created.username as created_by_name,
        u_updated.username as updated_by_name
		FROM setup_sheets ss
		JOIN operations o ON ss.operation_id = o.id
		JOIN parts p ON o.part_id = p.id
		LEFT JOIN customers c ON p.customer_id = c.id
		JOIN machines m ON ss.machine_id = m.id
		LEFT JOIN programs prog ON ss.program_id = prog.id
		LEFT JOIN program_revisions rev ON prog.current_revision_id = rev.id
		LEFT JOIN users u_created ON ss.created_by = u_created.id
		LEFT JOIN users u_updated ON ss.updated_by = u_updated.id
		WHERE ss.id = $1
    `;

    const sheetResult = await db.query(sheetQuery, [id]);

    if (sheetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Einrichteblatt nicht gefunden'
      });
    }

    // Fotos laden
    const photosQuery = `
      SELECT 
        p.*,
        u.username as uploaded_by_name
      FROM setup_sheet_photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.setup_sheet_id = $1
      ORDER BY p.sort_order, p.uploaded_at
    `;

    const photosResult = await db.query(photosQuery, [id]);

    // Zugeordnete Spannmittel laden (aus setup_sheet_clamping_devices)
    const clampingQuery = `
      SELECT * FROM setup_sheet_clamping_devices_view
      WHERE setup_sheet_id = $1
      ORDER BY sort_order, id
    `;
    const clampingResult = await db.query(clampingQuery, [id]);

    // Zugeordnete Vorrichtungen laden (aus setup_sheet_fixtures)
    const fixturesQuery = `
      SELECT * FROM setup_sheet_fixtures_view
      WHERE setup_sheet_id = $1
      ORDER BY sort_order, id
    `;
    const fixturesResult = await db.query(fixturesQuery, [id]);

    // Zusätzlich: Vorrichtungen die via Operation zugeordnet sind (Schmankerl)
    const operationFixturesQuery = `
      SELECT 
        f.id,
        f.fixture_number,
        f.name as fixture_name,
        f.status,
        ft.name as type_name,
        ft.icon as type_icon
      FROM fixtures f
      LEFT JOIN fixture_types ft ON ft.id = f.type_id
      WHERE f.operation_id = $1
        AND f.deleted_at IS NULL
    `;
    const operationFixturesResult = await db.query(operationFixturesQuery, [sheetResult.rows[0].operation_id]);

    res.json({
      success: true,
      data: {
        ...sheetResult.rows[0],
        photos: photosResult.rows,
        clamping_devices: clampingResult.rows,
        fixtures: fixturesResult.rows,
        operation_fixtures: operationFixturesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching setup sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Einrichteblatts',
      error: error.message
    });
  }
};

/**
 * POST /api/setup-sheets
 * Neues Setup Sheet erstellen
 */
exports.createSetupSheet = async (req, res) => {
  try {
    const {
      operation_id,
      machine_id,
      program_id,
      fixture_description,
      clamping_description,
      control_type,
      preset_number,
      wcs_number,
      wcs_x,
      wcs_y,
      wcs_z,
      reference_point,
      raw_material_dimensions,
      material_specification,
      setup_instructions,
      special_notes,
      status = 'draft'
    } = req.body;

    // Validation
    if (!operation_id || !machine_id) {
      return res.status(400).json({
        success: false,
        message: 'Operation und Maschine sind Pflichtfelder'
      });
    }

    // Check if operation exists
    const operationCheck = await db.query(
      'SELECT id FROM operations WHERE id = $1',
      [operation_id]
    );

    if (operationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Operation nicht gefunden'
      });
    }

    // Check if machine exists
    const machineCheck = await db.query(
      'SELECT id FROM machines WHERE id = $1',
      [machine_id]
    );

    if (machineCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Maschine nicht gefunden'
      });
    }

    // Insert Setup Sheet
    const insertQuery = `
      INSERT INTO setup_sheets (
        operation_id, machine_id, program_id,
        fixture_description, clamping_description,
        control_type, preset_number, wcs_number,
        wcs_x, wcs_y, wcs_z, reference_point,
        raw_material_dimensions, material_specification,
        setup_instructions, special_notes,
        status, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18
      )
      RETURNING *
    `;

    const values = [
      operation_id,
      machine_id,
      program_id || null,
      fixture_description || null,
      clamping_description || null,
      control_type || null,
      preset_number || null,
      wcs_number || null,
      wcs_x || null,
      wcs_y || null,
      wcs_z || null,
      reference_point || null,
      raw_material_dimensions || null,
      material_specification || null,
      setup_instructions || null,
      special_notes || null,
      status,
      req.user.id
    ];

    const result = await db.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Einrichteblatt erfolgreich erstellt',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating setup sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Einrichteblatts',
      error: error.message
    });
  }
};

/**
 * PUT /api/setup-sheets/:id
 * Setup Sheet aktualisieren
 */
exports.updateSetupSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      machine_id,
      program_id,
      fixture_description,
      clamping_description,
      control_type,
      preset_number,
      wcs_number,
      wcs_x,
      wcs_y,
      wcs_z,
      reference_point,
      raw_material_dimensions,
      material_specification,
      setup_instructions,
      special_notes,
      status
    } = req.body;

    // Check if exists
    const existsCheck = await db.query(
      'SELECT id FROM setup_sheets WHERE id = $1',
      [id]
    );

    if (existsCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Einrichteblatt nicht gefunden'
      });
    }

    // Update Setup Sheet
    const updateQuery = `
      UPDATE setup_sheets SET
        machine_id = COALESCE($1, machine_id),
        program_id = COALESCE($2, program_id),
        fixture_description = COALESCE($3, fixture_description),
        clamping_description = COALESCE($4, clamping_description),
        control_type = COALESCE($5, control_type),
        preset_number = COALESCE($6, preset_number),
        wcs_number = COALESCE($7, wcs_number),
        wcs_x = COALESCE($8, wcs_x),
        wcs_y = COALESCE($9, wcs_y),
        wcs_z = COALESCE($10, wcs_z),
        reference_point = COALESCE($11, reference_point),
        raw_material_dimensions = COALESCE($12, raw_material_dimensions),
        material_specification = COALESCE($13, material_specification),
        setup_instructions = COALESCE($14, setup_instructions),
        special_notes = COALESCE($15, special_notes),
        status = COALESCE($16, status),
        updated_by = $17,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *
    `;

    const values = [
      machine_id,
      program_id,
      fixture_description,
      clamping_description,
      control_type,
      preset_number,
      wcs_number,
      wcs_x,
      wcs_y,
      wcs_z,
      reference_point,
      raw_material_dimensions,
      material_specification,
      setup_instructions,
      special_notes,
      status,
      req.user.id,
      id
    ];

    const result = await db.query(updateQuery, values);

    res.json({
      success: true,
      message: 'Einrichteblatt erfolgreich aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating setup sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Einrichteblatts',
      error: error.message
    });
  }
};

/**
 * DELETE /api/setup-sheets/:id
 * Setup Sheet löschen
 */
exports.deleteSetupSheet = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exists
    const existsCheck = await db.query(
      'SELECT id FROM setup_sheets WHERE id = $1',
      [id]
    );

    if (existsCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Einrichteblatt nicht gefunden'
      });
    }

    // Delete (CASCADE löscht auch Fotos)
    await db.query('DELETE FROM setup_sheets WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Einrichteblatt erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting setup sheet:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Einrichteblatts',
      error: error.message
    });
  }
};

/**
 * POST /api/setup-sheets/:id/photos
 * Foto zu Setup Sheet hinzufügen
 */
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, photo_type = 'general', sort_order = 0 } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Keine Datei hochgeladen'
      });
    }

    // Check if setup sheet exists
    const sheetCheck = await db.query(
      'SELECT id FROM setup_sheets WHERE id = $1',
      [id]
    );

    if (sheetCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Einrichteblatt nicht gefunden'
      });
    }

    // Insert photo record
    const insertQuery = `
      INSERT INTO setup_sheet_photos (
        setup_sheet_id, file_path, file_name, file_size,
        mime_type, caption, photo_type, sort_order, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      id,
      req.file.path,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      caption || null,
      photo_type,
      sort_order,
      req.user.id
    ];

    const result = await db.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Foto erfolgreich hochgeladen',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hochladen des Fotos',
      error: error.message
    });
  }
};

/**
 * DELETE /api/setup-sheets/:id/photos/:photoId
 * Foto löschen
 */
exports.deletePhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const fs = require('fs').promises;

    // Get photo info
    const photoQuery = await db.query(
      'SELECT * FROM setup_sheet_photos WHERE id = $1 AND setup_sheet_id = $2',
      [photoId, id]
    );

    if (photoQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Foto nicht gefunden'
      });
    }

    const photo = photoQuery.rows[0];

    // Delete file from filesystem
    try {
      await fs.unlink(photo.file_path);
    } catch (err) {
      console.error('Error deleting file:', err);
      // Continue anyway - file might already be deleted
    }

    // Delete from database
    await db.query('DELETE FROM setup_sheet_photos WHERE id = $1', [photoId]);

    res.json({
      success: true,
      message: 'Foto erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Fotos',
      error: error.message
    });
  }
};

/**
 * PUT /api/setup-sheets/:id/photos/:photoId
 * Foto-Metadaten aktualisieren
 */
exports.updatePhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;
    const { caption, photo_type, sort_order } = req.body;

    // Check if photo exists
    const photoCheck = await db.query(
      'SELECT id FROM setup_sheet_photos WHERE id = $1 AND setup_sheet_id = $2',
      [photoId, id]
    );

    if (photoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Foto nicht gefunden'
      });
    }

    // Update photo metadata
    const updateQuery = `
      UPDATE setup_sheet_photos SET
        caption = COALESCE($1, caption),
        photo_type = COALESCE($2, photo_type),
        sort_order = COALESCE($3, sort_order)
      WHERE id = $4
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      caption,
      photo_type,
      sort_order,
      photoId
    ]);

    res.json({
      success: true,
      message: 'Foto erfolgreich aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating photo:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Fotos',
      error: error.message
    });
  }
};

// ============================================================================
// SPANNMITTEL ZUORDNUNGEN
// ============================================================================

/**
 * POST /api/setup-sheets/:id/clamping-devices
 * Spannmittel zum Setup Sheet hinzufügen
 */
exports.addClampingDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const { clamping_device_id, quantity = 1, notes } = req.body;

    if (!clamping_device_id) {
      return res.status(400).json({
        success: false,
        message: 'clamping_device_id ist erforderlich'
      });
    }

    // Prüfen ob Setup Sheet existiert
    const sheetCheck = await db.query('SELECT id FROM setup_sheets WHERE id = $1', [id]);
    if (sheetCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setup Sheet nicht gefunden'
      });
    }

    // Prüfen ob Spannmittel existiert
    const deviceCheck = await db.query(
      'SELECT id FROM clamping_devices WHERE id = $1 AND deleted_at IS NULL',
      [clamping_device_id]
    );
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Spannmittel nicht gefunden'
      });
    }

    // Höchste sort_order ermitteln
    const maxOrderResult = await db.query(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM setup_sheet_clamping_devices WHERE setup_sheet_id = $1',
      [id]
    );
    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    // Einfügen (oder update bei Duplikat)
    const result = await db.query(`
      INSERT INTO setup_sheet_clamping_devices 
        (setup_sheet_id, clamping_device_id, quantity, notes, sort_order, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (setup_sheet_id, clamping_device_id) 
      DO UPDATE SET quantity = setup_sheet_clamping_devices.quantity + EXCLUDED.quantity
      RETURNING *
    `, [id, clamping_device_id, quantity, notes, nextOrder, req.user.id]);

    // Vollständige Daten laden
    const fullData = await db.query(
      'SELECT * FROM setup_sheet_clamping_devices_view WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Spannmittel hinzugefügt',
      data: fullData.rows[0]
    });
  } catch (error) {
    console.error('Error adding clamping device:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen des Spannmittels',
      error: error.message
    });
  }
};

/**
 * PUT /api/setup-sheets/:id/clamping-devices/:itemId
 * Spannmittel-Zuordnung aktualisieren
 */
exports.updateClampingDevice = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { quantity, notes, sort_order } = req.body;

    const result = await db.query(`
      UPDATE setup_sheet_clamping_devices SET
        quantity = COALESCE($1, quantity),
        notes = COALESCE($2, notes),
        sort_order = COALESCE($3, sort_order)
      WHERE id = $4 AND setup_sheet_id = $5
      RETURNING *
    `, [quantity, notes, sort_order, itemId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zuordnung nicht gefunden'
      });
    }

    const fullData = await db.query(
      'SELECT * FROM setup_sheet_clamping_devices_view WHERE id = $1',
      [itemId]
    );

    res.json({
      success: true,
      message: 'Aktualisiert',
      data: fullData.rows[0]
    });
  } catch (error) {
    console.error('Error updating clamping device:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren',
      error: error.message
    });
  }
};

/**
 * DELETE /api/setup-sheets/:id/clamping-devices/:itemId
 * Spannmittel-Zuordnung entfernen
 */
exports.removeClampingDevice = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    const result = await db.query(
      'DELETE FROM setup_sheet_clamping_devices WHERE id = $1 AND setup_sheet_id = $2 RETURNING *',
      [itemId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zuordnung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Spannmittel entfernt'
    });
  } catch (error) {
    console.error('Error removing clamping device:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen',
      error: error.message
    });
  }
};

// ============================================================================
// VORRICHTUNGEN ZUORDNUNGEN
// ============================================================================

/**
 * POST /api/setup-sheets/:id/fixtures
 * Vorrichtung zum Setup Sheet hinzufügen
 */
exports.addFixture = async (req, res) => {
  try {
    const { id } = req.params;
    const { fixture_id, quantity = 1, notes } = req.body;

    if (!fixture_id) {
      return res.status(400).json({
        success: false,
        message: 'fixture_id ist erforderlich'
      });
    }

    // Prüfen ob Setup Sheet existiert
    const sheetCheck = await db.query('SELECT id FROM setup_sheets WHERE id = $1', [id]);
    if (sheetCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setup Sheet nicht gefunden'
      });
    }

    // Prüfen ob Vorrichtung existiert
    const fixtureCheck = await db.query(
      'SELECT id FROM fixtures WHERE id = $1 AND deleted_at IS NULL',
      [fixture_id]
    );
    if (fixtureCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtung nicht gefunden'
      });
    }

    // Höchste sort_order ermitteln
    const maxOrderResult = await db.query(
      'SELECT COALESCE(MAX(sort_order), 0) as max_order FROM setup_sheet_fixtures WHERE setup_sheet_id = $1',
      [id]
    );
    const nextOrder = maxOrderResult.rows[0].max_order + 1;

    // Einfügen (oder update bei Duplikat)
    const result = await db.query(`
      INSERT INTO setup_sheet_fixtures 
        (setup_sheet_id, fixture_id, quantity, notes, sort_order, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (setup_sheet_id, fixture_id) 
      DO UPDATE SET quantity = setup_sheet_fixtures.quantity + EXCLUDED.quantity
      RETURNING *
    `, [id, fixture_id, quantity, notes, nextOrder, req.user.id]);

    // Vollständige Daten laden
    const fullData = await db.query(
      'SELECT * FROM setup_sheet_fixtures_view WHERE id = $1',
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: 'Vorrichtung hinzugefügt',
      data: fullData.rows[0]
    });
  } catch (error) {
    console.error('Error adding fixture:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Hinzufügen der Vorrichtung',
      error: error.message
    });
  }
};

/**
 * PUT /api/setup-sheets/:id/fixtures/:itemId
 * Vorrichtung-Zuordnung aktualisieren
 */
exports.updateFixture = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { quantity, notes, sort_order } = req.body;

    const result = await db.query(`
      UPDATE setup_sheet_fixtures SET
        quantity = COALESCE($1, quantity),
        notes = COALESCE($2, notes),
        sort_order = COALESCE($3, sort_order)
      WHERE id = $4 AND setup_sheet_id = $5
      RETURNING *
    `, [quantity, notes, sort_order, itemId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zuordnung nicht gefunden'
      });
    }

    const fullData = await db.query(
      'SELECT * FROM setup_sheet_fixtures_view WHERE id = $1',
      [itemId]
    );

    res.json({
      success: true,
      message: 'Aktualisiert',
      data: fullData.rows[0]
    });
  } catch (error) {
    console.error('Error updating fixture:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren',
      error: error.message
    });
  }
};

/**
 * DELETE /api/setup-sheets/:id/fixtures/:itemId
 * Vorrichtung-Zuordnung entfernen
 */
exports.removeFixture = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    const result = await db.query(
      'DELETE FROM setup_sheet_fixtures WHERE id = $1 AND setup_sheet_id = $2 RETURNING *',
      [itemId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zuordnung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Vorrichtung entfernt'
    });
  } catch (error) {
    console.error('Error removing fixture:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen',
      error: error.message
    });
  }
};

