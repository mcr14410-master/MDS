/**
 * Work Instructions Controller
 * CRUD Operations für Arbeitsanweisungen
 */

const db = require('../config/db');

/**
 * GET /api/work-instructions
 * Liste aller Arbeitsanweisungen (mit Filter)
 */
exports.getAll = async (req, res) => {
  try {
    const { operation_id, status } = req.query;

    let query = `
      SELECT 
        wi.*,
        o.op_name,
        o.op_number,
        p.part_number,
        u_created.username as created_by_name,
        u_updated.username as updated_by_name
      FROM work_instructions wi
      JOIN operations o ON wi.operation_id = o.id
      JOIN parts p ON o.part_id = p.id
      LEFT JOIN users u_created ON wi.created_by = u_created.id
      LEFT JOIN users u_updated ON wi.updated_by = u_updated.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (operation_id) {
      query += ` AND wi.operation_id = $${paramCount++}`;
      params.push(operation_id);
    }

    if (status) {
      query += ` AND wi.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY wi.updated_at DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching work instructions:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Arbeitsanweisungen',
      error: error.message
    });
  }
};

/**
 * GET /api/work-instructions/:id
 * Einzelne Arbeitsanweisung
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        wi.*,
        o.op_name,
        o.op_number,
        p.part_number,
        p.part_name,
        u_created.username as created_by_name,
        u_updated.username as updated_by_name
      FROM work_instructions wi
      JOIN operations o ON wi.operation_id = o.id
      JOIN parts p ON o.part_id = p.id
      LEFT JOIN users u_created ON wi.created_by = u_created.id
      LEFT JOIN users u_updated ON wi.updated_by = u_updated.id
      WHERE wi.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitsanweisung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching work instruction:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Arbeitsanweisung',
      error: error.message
    });
  }
};

/**
 * POST /api/work-instructions
 * Neue Arbeitsanweisung erstellen
 */
exports.create = async (req, res) => {
  try {
    const { operation_id, title, content, steps, status } = req.body;
    const userId = req.user?.id;

    if (!operation_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'operation_id und title sind erforderlich'
      });
    }

    const result = await db.query(`
      INSERT INTO work_instructions (operation_id, title, content, steps, status, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING *
    `, [
      operation_id,
      title,
      content || '',
      JSON.stringify(steps || []),
      status || 'draft',
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Arbeitsanweisung erstellt',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating work instruction:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Arbeitsanweisung',
      error: error.message
    });
  }
};

/**
 * PUT /api/work-instructions/:id
 * Arbeitsanweisung aktualisieren
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, steps, status } = req.body;
    const userId = req.user?.id;

    // Prüfen ob existiert
    const existing = await db.query('SELECT * FROM work_instructions WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitsanweisung nicht gefunden'
      });
    }

    const result = await db.query(`
      UPDATE work_instructions SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        steps = COALESCE($3, steps),
        status = COALESCE($4, status),
        updated_by = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      title,
      content,
      steps ? JSON.stringify(steps) : null,
      status,
      userId,
      id
    ]);

    res.json({
      success: true,
      message: 'Arbeitsanweisung aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating work instruction:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Arbeitsanweisung',
      error: error.message
    });
  }
};

/**
 * DELETE /api/work-instructions/:id
 * Arbeitsanweisung löschen
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM work_instructions WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitsanweisung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Arbeitsanweisung gelöscht'
    });
  } catch (error) {
    console.error('Error deleting work instruction:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Arbeitsanweisung',
      error: error.message
    });
  }
};
