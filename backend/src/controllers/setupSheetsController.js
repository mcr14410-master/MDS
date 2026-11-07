/**
 * Setup Sheets Controller
 * 
 * CRUD Operations für Einrichteblätter (Setup Sheets)
 */

const db = require('../config/db');
const fs = require('fs').promises;
const path = require('path');
const {
  withSheetChange, photoFileReferenced, SheetLockedError, VersionNotFoundError, restoreVersion,
} = require('../services/setupSheetVersions');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads/setup-sheets');

// Felder, die PUT ändern darf. Fehlt ein Feld im Body, bleibt es; null oder '' leert es.
const UPDATABLE_FIELDS = [
  'program_id', 'fixture_description', 'clamping_description', 'control_type',
  'preset_number', 'wcs_number', 'wcs_x', 'wcs_y', 'wcs_z', 'reference_point',
  'raw_material_dimensions', 'material_specification', 'setup_instructions', 'special_notes',
];

const notFound = (message = 'Einrichteblatt nicht gefunden') => ({ status: 404, body: { success: false, message } });

/**
 * Schreibende Aktion am Blatt (Spec Einrichteblatt-Freigabe 2): läuft in withSheetChange, also mit
 * Sperre und Rückfall auf Entwurf. handler(req, client) liefert { status, body, afterCommit? }.
 * onFail räumt auf, wenn nichts gespeichert wurde (z. B. hochgeladene Datei).
 */
function sheetChange(handler, { label, onFail } = {}) {
  return async (req, res) => {
    let result;
    try {
      result = await withSheetChange(req.params.id, req.user?.id ?? null, (client) => handler(req, client));
    } catch (error) {
      if (onFail) await onFail(req).catch(() => {});
      if (error instanceof SheetLockedError) {
        return res.status(409).json({ success: false, message: error.message });
      }
      console.error(`Error ${label}:`, error);
      return res.status(500).json({ success: false, message: `Fehler: ${label}`, error: error.message });
    }
    if (result === null) result = notFound();
    if (result.status >= 400 && onFail) await onFail(req).catch(() => {});
    if (result.afterCommit) await result.afterCommit().catch(err => console.error(`Nacharbeit ${label}:`, err));
    return res.status(result.status).json(result.body);
  };
}

const removeUploadedPhoto = async (req) => {
  if (req.file) await fs.unlink(path.join(UPLOAD_ROOT, String(req.params.id), req.file.filename));
};

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
		ws.name as workflow_state,
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
		JOIN machines m ON m.id = COALESCE(o.machine_id, ss.machine_id)
		JOIN workflow_states ws ON ws.id = ss.workflow_state_id
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
      query += ` AND COALESCE(o.machine_id, ss.machine_id) = $${paramCount++}`;
      params.push(machine_id);
    }

    if (status) {
      query += ` AND ws.name = $${paramCount++}`;
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
		ws.name as workflow_state,
		ct.name as machine_control_type,
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
		JOIN machines m ON m.id = COALESCE(o.machine_id, ss.machine_id)
		LEFT JOIN control_types ct ON ct.id = m.control_type_id
		JOIN workflow_states ws ON ws.id = ss.workflow_state_id
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
      program_id,
      fixture_description,
      clamping_description,
      preset_number,
      wcs_number,
      wcs_x,
      wcs_y,
      wcs_z,
      reference_point,
      raw_material_dimensions,
      material_specification,
      setup_instructions,
      special_notes
    } = req.body;

    // Validation
    if (!operation_id) {
      return res.status(400).json({
        success: false,
        message: 'Operation ist ein Pflichtfeld'
      });
    }

    // Maschine und Steuerungstyp kommen aus dem Arbeitsgang (auch bei Varianten eigene Zeile)
    const operationCheck = await db.query(
      `SELECT o.machine_id, ct.name AS control_type
         FROM operations o
         LEFT JOIN machines m ON m.id = o.machine_id
         LEFT JOIN control_types ct ON ct.id = m.control_type_id
        WHERE o.id = $1`,
      [operation_id]
    );

    if (operationCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Operation nicht gefunden'
      });
    }

    const { machine_id, control_type } = operationCheck.rows[0];

    if (!machine_id) {
      return res.status(400).json({
        success: false,
        message: 'Am Arbeitsgang ist keine Maschine eingetragen. Bitte dort zuerst die Maschine auswählen.'
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
        workflow_state_id, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        (SELECT id FROM workflow_states WHERE name = 'draft'), $17, $17
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
exports.updateSetupSheet = sheetChange(async (req, client) => {
  const sets = [];
  const values = [];
  for (const field of UPDATABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      values.push(req.body[field] === '' ? null : req.body[field]);
      sets.push(`${field} = $${values.length}`);
    }
  }
  values.push(req.user.id);
  sets.push(`updated_by = $${values.length}`);
  values.push(req.params.id);

  // Maschine folgt dem Arbeitsgang, ein machine_id im Body zählt nicht
  const result = await client.query(
    `UPDATE setup_sheets SET ${sets.join(', ')},
       machine_id = COALESCE((SELECT o.machine_id FROM operations o WHERE o.id = operation_id), machine_id),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
  return { status: 200, body: { success: true, message: 'Einrichteblatt erfolgreich aktualisiert', data: result.rows[0] } };
}, { label: 'beim Aktualisieren des Einrichteblatts' });

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

    // Ein Blatt mit Stand lässt sich nur noch archivieren (Spec 2 „Löschen“)
    const versions = await db.query('SELECT 1 FROM setup_sheet_versions WHERE setup_sheet_id = $1 LIMIT 1', [id]);
    if (versions.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Das Einrichteblatt war schon freigegeben und lässt sich nur noch archivieren'
      });
    }

    // Delete (CASCADE löscht auch Fotos)
    await db.query('DELETE FROM setup_sheets WHERE id = $1', [id]);

    // Foto-Verzeichnis vom Filesystem entfernen (falls vorhanden)
    const sheetDir = path.join(__dirname, '../../uploads/setup-sheets', String(id));
    await fs.rm(sheetDir, { recursive: true, force: true }).catch(err => {
      console.error('Error removing setup sheet photo directory:', err);
    });

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
const uploadPhotoInSheet = sheetChange(async (req, client) => {
  const { id } = req.params;
  const { caption, photo_type = 'general', sort_order = 0 } = req.body;
  // Relativer Pfad, den servePhoto unter backend/ auflöst
  const relativePath = `uploads/setup-sheets/${id}/${req.file.filename}`;
  const result = await client.query(
    `INSERT INTO setup_sheet_photos (
       setup_sheet_id, file_path, file_name, file_size,
       mime_type, caption, photo_type, sort_order, uploaded_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [id, relativePath, req.file.originalname, req.file.size, req.file.mimetype,
      caption || null, photo_type, sort_order, req.user.id]
  );
  return { status: 201, body: { success: true, message: 'Foto erfolgreich hochgeladen', data: result.rows[0] } };
}, { label: 'beim Hochladen des Fotos', onFail: removeUploadedPhoto });

exports.uploadPhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Keine Datei hochgeladen' });
  }
  return uploadPhotoInSheet(req, res);
};

/**
 * DELETE /api/setup-sheets/:id/photos/:photoId
 * Foto löschen
 */
exports.deletePhoto = sheetChange(async (req, client) => {
  const { id, photoId } = req.params;
  const deleted = await client.query(
    'DELETE FROM setup_sheet_photos WHERE id = $1 AND setup_sheet_id = $2 RETURNING file_path',
    [photoId, id]
  );
  if (deleted.rows.length === 0) return notFound('Foto nicht gefunden');

  // Datei bleibt, solange ein Stand sie nennt (Zurückgehen braucht sie)
  const filePath = deleted.rows[0].file_path;
  const keep = await photoFileReferenced(client, id, filePath);
  return {
    status: 200,
    body: { success: true, message: 'Foto erfolgreich gelöscht' },
    afterCommit: keep ? null : () => fs.unlink(path.join(__dirname, '../..', filePath)),
  };
}, { label: 'beim Löschen des Fotos' });

/**
 * Interne Helper-Funktion: Foto ausliefern (DRY für view + download)
 */
/**
 * Fotodatei ausliefern (DRY für Fotos des Blatts und Fotos aus Ständen), mit Path-Traversal-Schutz
 * photo: { file_path, file_name, mime_type }
 */
async function sendPhotoFile(res, photo, disposition) {
  const absPath = path.resolve(__dirname, '../..', photo.file_path);
  const uploadsRoot = path.resolve(__dirname, '../../uploads');
  if (!absPath.startsWith(uploadsRoot + path.sep)) {
    return res.status(403).json({ success: false, message: 'Ungültiger Pfad' });
  }
  try {
    await fs.access(absPath);
  } catch {
    return res.status(404).json({ success: false, message: 'Datei nicht auf Server gefunden' });
  }
  res.setHeader('Content-Type', photo.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(photo.file_name)}"`);
  return res.sendFile(absPath);
}

async function servePhoto(req, res, disposition) {
  const { id, photoId } = req.params;
  try {
    const result = await db.query(
      'SELECT file_path, file_name, mime_type FROM setup_sheet_photos WHERE id = $1 AND setup_sheet_id = $2',
      [photoId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Foto nicht gefunden' });
    }
    return await sendPhotoFile(res, result.rows[0], disposition);
  } catch (error) {
    console.error('Error serving photo:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Ausliefern des Fotos' });
  }
}

/**
 * GET /api/setup-sheets/:id/photos/:photoId/view
 * Foto inline anzeigen (für AuthImage-Komponente)
 */
exports.viewPhoto = (req, res) => servePhoto(req, res, 'inline');

/**
 * GET /api/setup-sheets/:id/photos/:photoId/download
 * Foto als Download ausliefern
 */
exports.downloadPhoto = (req, res) => servePhoto(req, res, 'attachment');

/**
 * PUT /api/setup-sheets/:id/photos/:photoId
 * Foto-Metadaten aktualisieren
 */
exports.updatePhoto = sheetChange(async (req, client) => {
  const { id, photoId } = req.params;
  const { caption, photo_type, sort_order } = req.body;
  const result = await client.query(
    `UPDATE setup_sheet_photos SET
       caption = COALESCE($1, caption),
       photo_type = COALESCE($2, photo_type),
       sort_order = COALESCE($3, sort_order)
     WHERE id = $4 AND setup_sheet_id = $5
     RETURNING *`,
    [caption, photo_type, sort_order, photoId, id]
  );
  if (result.rows.length === 0) return notFound('Foto nicht gefunden');
  return { status: 200, body: { success: true, message: 'Foto erfolgreich aktualisiert', data: result.rows[0] } };
}, { label: 'beim Aktualisieren des Fotos' });

// ============================================================================
// SPANNMITTEL ZUORDNUNGEN
// ============================================================================

/**
 * POST /api/setup-sheets/:id/clamping-devices
 * Spannmittel zum Setup Sheet hinzufügen
 */
exports.addClampingDevice = async (req, res) => {
  if (!req.body.clamping_device_id) {
    return res.status(400).json({ success: false, message: 'clamping_device_id ist erforderlich' });
  }
  return addClampingDeviceInSheet(req, res);
};

const addClampingDeviceInSheet = sheetChange(async (req, client) => {
  const { id } = req.params;
  const { clamping_device_id, quantity = 1, notes } = req.body;
  const exists = await client.query('SELECT id FROM clamping_devices WHERE id = $1 AND deleted_at IS NULL', [clamping_device_id]);
  if (exists.rows.length === 0) return notFound('Spannmittel nicht gefunden');

  const maxOrder = await client.query(
    'SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM setup_sheet_clamping_devices WHERE setup_sheet_id = $1', [id]);
  // Einfügen (oder Menge erhöhen bei Duplikat)
  const result = await client.query(
    `INSERT INTO setup_sheet_clamping_devices (setup_sheet_id, clamping_device_id, quantity, notes, sort_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (setup_sheet_id, clamping_device_id)
     DO UPDATE SET quantity = setup_sheet_clamping_devices.quantity + EXCLUDED.quantity
     RETURNING id`,
    [id, clamping_device_id, quantity, notes, maxOrder.rows[0].max_order + 1, req.user.id]
  );
  const fullData = await client.query('SELECT * FROM setup_sheet_clamping_devices_view WHERE id = $1', [result.rows[0].id]);
  return { status: 201, body: { success: true, message: 'Spannmittel hinzugefügt', data: fullData.rows[0] } };
}, { label: 'beim Hinzufügen des Spannmittels' });

/**
 * PUT /api/setup-sheets/:id/clamping-devices/:itemId
 * Spannmittel-Zuordnung aktualisieren
 */
exports.updateClampingDevice = sheetChange(async (req, client) => {
  const { id, itemId } = req.params;
  const { quantity, notes, sort_order } = req.body;
  const result = await client.query(
    `UPDATE setup_sheet_clamping_devices SET
       quantity = COALESCE($1, quantity),
       notes = COALESCE($2, notes),
       sort_order = COALESCE($3, sort_order)
     WHERE id = $4 AND setup_sheet_id = $5
     RETURNING id`,
    [quantity, notes, sort_order, itemId, id]
  );
  if (result.rows.length === 0) return notFound('Zuordnung nicht gefunden');
  const fullData = await client.query('SELECT * FROM setup_sheet_clamping_devices_view WHERE id = $1', [itemId]);
  return { status: 200, body: { success: true, message: 'Aktualisiert', data: fullData.rows[0] } };
}, { label: 'beim Aktualisieren des Spannmittels' });

/**
 * DELETE /api/setup-sheets/:id/clamping-devices/:itemId
 * Spannmittel-Zuordnung entfernen
 */
exports.removeClampingDevice = sheetChange(async (req, client) => {
  const { id, itemId } = req.params;
  const result = await client.query(
    'DELETE FROM setup_sheet_clamping_devices WHERE id = $1 AND setup_sheet_id = $2 RETURNING id', [itemId, id]);
  if (result.rows.length === 0) return notFound('Zuordnung nicht gefunden');
  return { status: 200, body: { success: true, message: 'Spannmittel entfernt' } };
}, { label: 'beim Entfernen des Spannmittels' });

// ============================================================================
// VORRICHTUNGEN ZUORDNUNGEN
// ============================================================================

/**
 * POST /api/setup-sheets/:id/fixtures
 * Vorrichtung zum Setup Sheet hinzufügen
 */
exports.addFixture = async (req, res) => {
  if (!req.body.fixture_id) {
    return res.status(400).json({ success: false, message: 'fixture_id ist erforderlich' });
  }
  return addFixtureInSheet(req, res);
};

const addFixtureInSheet = sheetChange(async (req, client) => {
  const { id } = req.params;
  const { fixture_id, quantity = 1, notes } = req.body;
  const exists = await client.query('SELECT id FROM fixtures WHERE id = $1 AND deleted_at IS NULL', [fixture_id]);
  if (exists.rows.length === 0) return notFound('Vorrichtung nicht gefunden');

  const maxOrder = await client.query(
    'SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM setup_sheet_fixtures WHERE setup_sheet_id = $1', [id]);
  // Einfügen (oder Menge erhöhen bei Duplikat)
  const result = await client.query(
    `INSERT INTO setup_sheet_fixtures (setup_sheet_id, fixture_id, quantity, notes, sort_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (setup_sheet_id, fixture_id)
     DO UPDATE SET quantity = setup_sheet_fixtures.quantity + EXCLUDED.quantity
     RETURNING id`,
    [id, fixture_id, quantity, notes, maxOrder.rows[0].max_order + 1, req.user.id]
  );
  const fullData = await client.query('SELECT * FROM setup_sheet_fixtures_view WHERE id = $1', [result.rows[0].id]);
  return { status: 201, body: { success: true, message: 'Vorrichtung hinzugefügt', data: fullData.rows[0] } };
}, { label: 'beim Hinzufügen der Vorrichtung' });

/**
 * PUT /api/setup-sheets/:id/fixtures/:itemId
 * Vorrichtung-Zuordnung aktualisieren
 */
exports.updateFixture = sheetChange(async (req, client) => {
  const { id, itemId } = req.params;
  const { quantity, notes, sort_order } = req.body;
  const result = await client.query(
    `UPDATE setup_sheet_fixtures SET
       quantity = COALESCE($1, quantity),
       notes = COALESCE($2, notes),
       sort_order = COALESCE($3, sort_order)
     WHERE id = $4 AND setup_sheet_id = $5
     RETURNING id`,
    [quantity, notes, sort_order, itemId, id]
  );
  if (result.rows.length === 0) return notFound('Zuordnung nicht gefunden');
  const fullData = await client.query('SELECT * FROM setup_sheet_fixtures_view WHERE id = $1', [itemId]);
  return { status: 200, body: { success: true, message: 'Aktualisiert', data: fullData.rows[0] } };
}, { label: 'beim Aktualisieren der Vorrichtung' });

/**
 * DELETE /api/setup-sheets/:id/fixtures/:itemId
 * Vorrichtung-Zuordnung entfernen
 */
exports.removeFixture = sheetChange(async (req, client) => {
  const { id, itemId } = req.params;
  const result = await client.query(
    'DELETE FROM setup_sheet_fixtures WHERE id = $1 AND setup_sheet_id = $2 RETURNING id', [itemId, id]);
  if (result.rows.length === 0) return notFound('Zuordnung nicht gefunden');
  return { status: 200, body: { success: true, message: 'Vorrichtung entfernt' } };
}, { label: 'beim Entfernen der Vorrichtung' });

// ============================================================================
// STÄNDE (Spec Einrichteblatt-Freigabe 2)
// ============================================================================

/**
 * GET /api/setup-sheets/:id/versions
 * Alle Stände eines Blatts, neueste zuerst
 */
exports.getVersions = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT v.id, v.version_number, v.kind, v.created_at, v.created_by,
              COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.username) AS created_by_name,
              v.id = s.released_version_id AS is_released,
              jsonb_array_length(v.snapshot->'photos') AS photo_count
         FROM setup_sheet_versions v
         JOIN setup_sheets s ON s.id = v.setup_sheet_id
         LEFT JOIN users u ON u.id = v.created_by
        WHERE v.setup_sheet_id = $1
        ORDER BY v.id DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching setup sheet versions:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Stände', error: error.message });
  }
};

/**
 * GET /api/setup-sheets/:id/versions/:versionId
 * Ein Stand mit Inhalt; Namen von Programm, Spannmitteln und Vorrichtungen zum Anzeigen
 */
exports.getVersion = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT v.*, COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.username) AS created_by_name,
              v.id = s.released_version_id AS is_released
         FROM setup_sheet_versions v
         JOIN setup_sheets s ON s.id = v.setup_sheet_id
         LEFT JOIN users u ON u.id = v.created_by
        WHERE v.id = $1 AND v.setup_sheet_id = $2`,
      [req.params.versionId, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Stand nicht gefunden' });
    const version = rows[0];
    const snap = version.snapshot;
    const ids = (list, key) => (list || []).map(x => x[key]).filter(x => x != null);
    const [program, devices, fixtures] = await Promise.all([
      snap.fields.program_id
        ? db.query('SELECT program_number, program_name FROM programs WHERE id = $1', [snap.fields.program_id])
        : { rows: [] },
      db.query('SELECT id, inventory_number, name FROM clamping_devices WHERE id = ANY($1::int[])',
        [ids(snap.clamping_devices, 'clamping_device_id')]),
      db.query('SELECT id, fixture_number, name FROM fixtures WHERE id = ANY($1::int[])',
        [ids(snap.fixtures, 'fixture_id')]),
    ]);
    version.names = {
      program: program.rows[0] || null,
      clamping_devices: Object.fromEntries(devices.rows.map(d => [d.id, d])),
      fixtures: Object.fromEntries(fixtures.rows.map(f => [f.id, f])),
    };
    res.json({ success: true, data: version });
  } catch (error) {
    console.error('Error fetching setup sheet version:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden des Stands', error: error.message });
  }
};

/**
 * GET /api/setup-sheets/:id/versions/:versionId/photos/:index/view
 * Foto aus einem Stand (auch wenn es im Blatt inzwischen gelöscht ist)
 */
exports.viewVersionPhoto = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT snapshot->\'photos\'->($3::int) AS photo FROM setup_sheet_versions WHERE id = $1 AND setup_sheet_id = $2',
      [req.params.versionId, req.params.id, Number.parseInt(req.params.index, 10) || 0]
    );
    const photo = rows[0]?.photo;
    if (!photo) return res.status(404).json({ success: false, message: 'Foto nicht gefunden' });
    return await sendPhotoFile(res, photo, 'inline');
  } catch (error) {
    console.error('Error serving version photo:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Ausliefern des Fotos' });
  }
};

/**
 * POST /api/setup-sheets/:id/versions/:versionId/restore
 * Blatt auf diesen Stand zurücksetzen (Recht program.release)
 */
exports.restoreVersion = async (req, res) => {
  try {
    const result = await restoreVersion(req.params.id, req.params.versionId, req.user.id);
    if (result === null) return res.status(404).json({ success: false, message: 'Einrichteblatt nicht gefunden' });
    res.json({ success: true, message: 'Stand wiederhergestellt', data: result });
  } catch (error) {
    if (error instanceof SheetLockedError || error instanceof VersionNotFoundError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Error restoring setup sheet version:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Zurückgehen', error: error.message });
  }
};
