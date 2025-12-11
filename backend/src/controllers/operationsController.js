const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Get all operations with optional filtering
 * GET /api/operations?part_id=1
 */
exports.getAllOperations = async (req, res) => {
  try {
    const { part_id } = req.query;
    
    let query = `
      SELECT 
        o.*,
        p.part_number,
        p.part_name,
        m.name as machine_name,
        ot.name as operation_type_name,
        ot.icon as operation_type_icon,
        ot.color as operation_type_color
      FROM operations o
      LEFT JOIN parts p ON o.part_id = p.id
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN operation_types ot ON o.operation_type_id = ot.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (part_id) {
      query += ` AND o.part_id = $${paramCount}`;
      params.push(part_id);
      paramCount++;
    }

    query += ` ORDER BY o.part_id, o.sequence, o.op_number`;

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching operations:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Arbeitsgänge',
      error: error.message
    });
  }
};

/**
 * Get single operation by ID
 * GET /api/operations/:id
 */
exports.getOperationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        o.*,
        p.part_number,
        p.part_name,
        m.name as machine_name,
        ot.name as operation_type_name,
        ot.icon as operation_type_icon,
        ot.color as operation_type_color,
        ot.default_features as operation_type_default_features
      FROM operations o
      LEFT JOIN parts p ON o.part_id = p.id
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN operation_types ot ON o.operation_type_id = ot.id
      WHERE o.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitsgang nicht gefunden'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching operation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Arbeitsgangs',
      error: error.message
    });
  }
};

/**
 * Create new operation
 * POST /api/operations
 */
exports.createOperation = async (req, res) => {
  try {
    const {
      part_id,
      op_number,
      op_name,
      machine_id,
      setup_time_minutes,
      cycle_time_seconds,
      description,
      notes,
      sequence,
      operation_type_id,
      enabled_features
    } = req.body;

    // Validation
    if (!part_id || !op_number || !op_name) {
      return res.status(400).json({
        success: false,
        message: 'part_id, op_number und op_name sind Pflichtfelder'
      });
    }

    // Check if part exists
    const partCheck = await pool.query(
      'SELECT id FROM parts WHERE id = $1 AND status != $2',
      [part_id, 'deleted']
    );
    
    if (partCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bauteil nicht gefunden'
      });
    }

    // Check if op_number already exists for this part
    const opCheck = await pool.query(
      'SELECT id FROM operations WHERE part_id = $1 AND op_number = $2',
      [part_id, op_number]
    );
    
    if (opCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `OP-Nummer ${op_number} existiert bereits für dieses Bauteil`
      });
    }

    // If no sequence provided, get the next sequence number
    let finalSequence = sequence;
    if (finalSequence === undefined || finalSequence === null) {
      const seqResult = await pool.query(
        'SELECT COALESCE(MAX(sequence), 0) + 10 as next_seq FROM operations WHERE part_id = $1',
        [part_id]
      );
      finalSequence = seqResult.rows[0].next_seq;
    }

    // Wenn operation_type_id angegeben, aber keine enabled_features, hole die Default-Features
    let finalEnabledFeatures = enabled_features;
    if (operation_type_id && !enabled_features) {
      const typeResult = await pool.query(
        'SELECT default_features FROM operation_types WHERE id = $1',
        [operation_type_id]
      );
      if (typeResult.rows.length > 0) {
        finalEnabledFeatures = typeResult.rows[0].default_features;
      }
    }

    const query = `
      INSERT INTO operations (
        part_id, op_number, op_name, machine_id,
        setup_time_minutes, cycle_time_seconds,
        description, notes, sequence, created_by,
        operation_type_id, enabled_features
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      part_id,
      op_number,
      op_name,
      machine_id || null,
      setup_time_minutes || null,
      cycle_time_seconds || null,
      description || null,
      notes || null,
      finalSequence,
      req.user?.id || null,
      operation_type_id || null,
      finalEnabledFeatures ? JSON.stringify(finalEnabledFeatures) : '["programs", "tools", "setup_sheet", "inspection"]'
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Arbeitsgang erfolgreich erstellt',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating operation:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Diese OP-Nummer existiert bereits für dieses Bauteil'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Arbeitsgangs',
      error: error.message
    });
  }
};

/**
 * Update operation
 * PUT /api/operations/:id
 */
exports.updateOperation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      op_number,
      op_name,
      machine_id,
      setup_time_minutes,
      cycle_time_seconds,
      description,
      notes,
      sequence,
      operation_type_id,
      enabled_features
    } = req.body;

    // Check if operation exists
    const existingOp = await pool.query(
      'SELECT * FROM operations WHERE id = $1',
      [id]
    );
    
    if (existingOp.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitsgang nicht gefunden'
      });
    }

    // If op_number is being changed, check for duplicates
    if (op_number && op_number !== existingOp.rows[0].op_number) {
      const opCheck = await pool.query(
        'SELECT id FROM operations WHERE part_id = $1 AND op_number = $2 AND id != $3',
        [existingOp.rows[0].part_id, op_number, id]
      );
      
      if (opCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `OP-Nummer ${op_number} existiert bereits für dieses Bauteil`
        });
      }
    }

    const query = `
      UPDATE operations SET
        op_number = COALESCE($1, op_number),
        op_name = COALESCE($2, op_name),
        machine_id = $3,
        setup_time_minutes = $4,
        cycle_time_seconds = $5,
        description = $6,
        notes = $7,
        sequence = COALESCE($8, sequence),
        operation_type_id = $9,
        enabled_features = COALESCE($10, enabled_features),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      op_number || null,
      op_name || null,
      machine_id !== undefined ? machine_id : existingOp.rows[0].machine_id,
      setup_time_minutes !== undefined ? setup_time_minutes : existingOp.rows[0].setup_time_minutes,
      cycle_time_seconds !== undefined ? cycle_time_seconds : existingOp.rows[0].cycle_time_seconds,
      description !== undefined ? description : existingOp.rows[0].description,
      notes !== undefined ? notes : existingOp.rows[0].notes,
      sequence || null,
      operation_type_id !== undefined ? operation_type_id : existingOp.rows[0].operation_type_id,
      enabled_features ? JSON.stringify(enabled_features) : null,
      id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Arbeitsgang erfolgreich aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating operation:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Diese OP-Nummer existiert bereits für dieses Bauteil'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Arbeitsgangs',
      error: error.message
    });
  }
};

/**
 * Delete operation
 * DELETE /api/operations/:id
 */
exports.deleteOperation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if operation exists
    const existingOp = await pool.query(
      'SELECT * FROM operations WHERE id = $1',
      [id]
    );
    
    if (existingOp.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Arbeitsgang nicht gefunden'
      });
    }

    // Hard delete (CASCADE will handle related records)
    await pool.query('DELETE FROM operations WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Arbeitsgang erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('Error deleting operation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Arbeitsgangs',
      error: error.message
    });
  }
};

/**
 * Get operations for a specific part
 * GET /api/parts/:partId/operations
 */
exports.getOperationsByPart = async (req, res) => {
  try {
    const { partId } = req.params;
    
    const query = `
      SELECT 
        o.*,
        m.name as machine_name
      FROM operations o
      LEFT JOIN machines m ON o.machine_id = m.id
      WHERE o.part_id = $1
      ORDER BY o.sequence, o.op_number
    `;
    
    const result = await pool.query(query, [partId]);
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching operations by part:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Arbeitsgänge',
      error: error.message
    });
  }
};
