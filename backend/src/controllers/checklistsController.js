/**
 * Checklists Controller
 * CRUD Operations für Checklisten
 */

const db = require('../config/db');

/**
 * GET /api/checklists
 * Liste aller Checklisten (mit Filter)
 */
exports.getAll = async (req, res) => {
  try {
    const { operation_id, status } = req.query;

    let query = `
      SELECT 
        c.*,
        o.op_name,
        o.op_number,
        p.part_number,
        u_created.username as created_by_name,
        u_updated.username as updated_by_name
      FROM checklists c
      JOIN operations o ON c.operation_id = o.id
      JOIN parts p ON o.part_id = p.id
      LEFT JOIN users u_created ON c.created_by = u_created.id
      LEFT JOIN users u_updated ON c.updated_by = u_updated.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (operation_id) {
      query += ` AND c.operation_id = $${paramCount++}`;
      params.push(operation_id);
    }

    if (status) {
      query += ` AND c.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY c.updated_at DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Checklisten',
      error: error.message
    });
  }
};

/**
 * GET /api/checklists/:id
 * Einzelne Checkliste
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        c.*,
        o.op_name,
        o.op_number,
        p.part_number,
        p.part_name,
        u_created.username as created_by_name,
        u_updated.username as updated_by_name
      FROM checklists c
      JOIN operations o ON c.operation_id = o.id
      JOIN parts p ON o.part_id = p.id
      LEFT JOIN users u_created ON c.created_by = u_created.id
      LEFT JOIN users u_updated ON c.updated_by = u_updated.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checkliste nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Checkliste',
      error: error.message
    });
  }
};

/**
 * POST /api/checklists
 * Neue Checkliste erstellen
 */
exports.create = async (req, res) => {
  try {
    const { operation_id, title, description, items, status } = req.body;
    const userId = req.user?.id;

    if (!operation_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'operation_id und title sind erforderlich'
      });
    }

    const result = await db.query(`
      INSERT INTO checklists (operation_id, title, description, items, status, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING *
    `, [
      operation_id,
      title,
      description || '',
      JSON.stringify(items || []),
      status || 'draft',
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Checkliste erstellt',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Checkliste',
      error: error.message
    });
  }
};

/**
 * PUT /api/checklists/:id
 * Checkliste aktualisieren
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, items, status } = req.body;
    const userId = req.user?.id;

    // Prüfen ob existiert
    const existing = await db.query('SELECT * FROM checklists WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checkliste nicht gefunden'
      });
    }

    const result = await db.query(`
      UPDATE checklists SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        items = COALESCE($3, items),
        status = COALESCE($4, status),
        updated_by = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      title,
      description,
      items ? JSON.stringify(items) : null,
      status,
      userId,
      id
    ]);

    res.json({
      success: true,
      message: 'Checkliste aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Checkliste',
      error: error.message
    });
  }
};

/**
 * DELETE /api/checklists/:id
 * Checkliste löschen
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM checklists WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Checkliste nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Checkliste gelöscht'
    });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Checkliste',
      error: error.message
    });
  }
};
