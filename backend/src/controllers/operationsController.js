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
 * Bei Varianten: op_number und op_name werden in der ganzen Gruppe synchronisiert
 */
exports.updateOperation = async (req, res) => {
  const client = await pool.connect();
  
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

    await client.query('BEGIN');

    // Check if operation exists
    const existingOp = await client.query(
      'SELECT * FROM operations WHERE id = $1',
      [id]
    );
    
    if (existingOp.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Arbeitsgang nicht gefunden'
      });
    }

    const currentOp = existingOp.rows[0];

    // If op_number is being changed, check for duplicates (außerhalb der Varianten-Gruppe)
    if (op_number && op_number !== currentOp.op_number) {
      let opCheckQuery = 'SELECT id FROM operations WHERE part_id = $1 AND op_number = $2 AND id != $3';
      let opCheckParams = [currentOp.part_id, op_number, id];
      
      // Bei Varianten: Andere Varianten der gleichen Gruppe ignorieren
      if (currentOp.variant_group_id) {
        opCheckQuery += ' AND (variant_group_id IS NULL OR variant_group_id != $4)';
        opCheckParams.push(currentOp.variant_group_id);
      }
      
      const opCheck = await client.query(opCheckQuery, opCheckParams);
      
      if (opCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: `OP-Nummer ${op_number} existiert bereits für dieses Bauteil`
        });
      }
    }

    // Diese Operation aktualisieren
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
      machine_id !== undefined ? machine_id : currentOp.machine_id,
      setup_time_minutes !== undefined ? setup_time_minutes : currentOp.setup_time_minutes,
      cycle_time_seconds !== undefined ? cycle_time_seconds : currentOp.cycle_time_seconds,
      description !== undefined ? description : currentOp.description,
      notes !== undefined ? notes : currentOp.notes,
      sequence || null,
      operation_type_id !== undefined ? operation_type_id : currentOp.operation_type_id,
      enabled_features ? JSON.stringify(enabled_features) : null,
      id
    ];

    const result = await client.query(query, values);

    // Bei Varianten: op_number und op_name in der ganzen Gruppe synchronisieren
    if (currentOp.variant_group_id) {
      const newOpNumber = op_number || currentOp.op_number;
      const newOpName = op_name || currentOp.op_name;
      
      // Nur wenn sich op_number oder op_name geändert haben
      if (newOpNumber !== currentOp.op_number || newOpName !== currentOp.op_name) {
        await client.query(
          `UPDATE operations 
           SET op_number = $1, op_name = $2, updated_at = CURRENT_TIMESTAMP
           WHERE variant_group_id = $3 AND id != $4`,
          [newOpNumber, newOpName, currentOp.variant_group_id, id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Arbeitsgang erfolgreich aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
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
  } finally {
    client.release();
  }
};

/**
 * Delete operation
 * DELETE /api/operations/:id
 */
exports.deleteOperation = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Check if operation exists
    const existingOp = await client.query(
      'SELECT * FROM operations WHERE id = $1',
      [id]
    );
    
    if (existingOp.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Arbeitsgang nicht gefunden'
      });
    }

    const operation = existingOp.rows[0];

    // Wenn primäre Variante gelöscht wird: andere Variante zur Primären machen
    if (operation.is_variant_primary && operation.variant_group_id) {
      // Gibt es andere Varianten in der Gruppe?
      const otherVariants = await client.query(
        `SELECT id FROM operations 
         WHERE variant_group_id = $1 AND id != $2 
         ORDER BY created_at ASC 
         LIMIT 1`,
        [operation.variant_group_id, id]
      );

      if (otherVariants.rows.length > 0) {
        // Erste andere Variante zur neuen Primären machen
        await client.query(
          'UPDATE operations SET is_variant_primary = true WHERE id = $1',
          [otherVariants.rows[0].id]
        );
      }
    }

    // Hard delete (CASCADE will handle related records)
    await client.query('DELETE FROM operations WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Arbeitsgang erfolgreich gelöscht'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting operation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Arbeitsgangs',
      error: error.message
    });
  } finally {
    client.release();
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
        m.name as machine_name,
        ot.name as operation_type_name,
        ot.icon as operation_type_icon,
        ot.color as operation_type_color,
        (
          SELECT COUNT(*) 
          FROM operations o2 
          WHERE o2.variant_group_id = o.variant_group_id 
          AND o2.variant_group_id IS NOT NULL
        ) as variant_count
      FROM operations o
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN operation_types ot ON o.operation_type_id = ot.id
      WHERE o.part_id = $1
      ORDER BY o.sequence, o.op_number, o.is_variant_primary DESC
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

/**
 * Create a variant of an existing operation
 * POST /api/operations/:id/create-variant
 */
exports.createVariant = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { 
      machine_id, 
      setup_time_minutes, 
      cycle_time_seconds,
      copy_programs = false,
      copy_tools = false,
      copy_setup_sheets = false,
      copy_inspection_plans = false
    } = req.body;

    if (!machine_id) {
      return res.status(400).json({
        success: false,
        message: 'machine_id ist erforderlich'
      });
    }

    await client.query('BEGIN');

    // Original-Operation laden
    const originalResult = await client.query(
      'SELECT * FROM operations WHERE id = $1',
      [id]
    );

    if (originalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Original-Operation nicht gefunden'
      });
    }

    const original = originalResult.rows[0];

    // Prüfen ob bereits eine Variante mit dieser Maschine existiert
    if (original.variant_group_id) {
      const existingVariant = await client.query(
        'SELECT id FROM operations WHERE variant_group_id = $1 AND machine_id = $2',
        [original.variant_group_id, machine_id]
      );
      
      if (existingVariant.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Eine Variante für diese Maschine existiert bereits'
        });
      }
    }

    // variant_group_id: Bestehende nutzen oder neue erstellen
    let variantGroupId = original.variant_group_id;
    
    if (!variantGroupId) {
      // Erste Variante: UUID generieren und Original updaten
      const uuidResult = await client.query('SELECT gen_random_uuid() as uuid');
      variantGroupId = uuidResult.rows[0].uuid;
      
      await client.query(
        'UPDATE operations SET variant_group_id = $1, is_variant_primary = true WHERE id = $2',
        [variantGroupId, id]
      );
    }

    // Neue Variante erstellen
    const newOpResult = await client.query(`
      INSERT INTO operations (
        part_id, op_number, op_name, machine_id,
        setup_time_minutes, cycle_time_seconds,
        description, notes, sequence,
        operation_type_id, enabled_features,
        variant_group_id, is_variant_primary,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14)
      RETURNING *
    `, [
      original.part_id,
      original.op_number,
      original.op_name,
      machine_id,
      setup_time_minutes ?? original.setup_time_minutes,
      cycle_time_seconds ?? original.cycle_time_seconds,
      original.description,
      original.notes,
      original.sequence,
      original.operation_type_id,
      JSON.stringify(original.enabled_features),
      variantGroupId,
      false, // is_variant_primary = false für Varianten
      req.user?.id || null
    ]);

    const newOperation = newOpResult.rows[0];

    // Optional: Unterbereiche kopieren
    if (copy_programs) {
      await client.query(`
        INSERT INTO programs (operation_id, name, file_path, version, machine_id, status, description, created_by)
        SELECT $1, name, file_path, version, $2, status, description, $3
        FROM programs WHERE operation_id = $4
      `, [newOperation.id, machine_id, req.user?.id, id]);
    }

    if (copy_tools) {
      // Tool Lists kopieren
      const toolListsResult = await client.query(
        'SELECT * FROM tool_lists WHERE operation_id = $1',
        [id]
      );
      
      for (const toolList of toolListsResult.rows) {
        const newListResult = await client.query(`
          INSERT INTO tool_lists (operation_id, name, version, status, notes, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [newOperation.id, toolList.name, toolList.version, toolList.status, toolList.notes, req.user?.id]);
        
        // Tool List Items kopieren
        await client.query(`
          INSERT INTO tool_list_items (tool_list_id, position, tool_number, tool_name, description, cutting_data, notes)
          SELECT $1, position, tool_number, tool_name, description, cutting_data, notes
          FROM tool_list_items WHERE tool_list_id = $2
        `, [newListResult.rows[0].id, toolList.id]);
      }
    }

    if (copy_setup_sheets) {
      await client.query(`
        INSERT INTO setup_sheets (operation_id, title, content, version, status, created_by)
        SELECT $1, title, content, version, status, $2
        FROM setup_sheets WHERE operation_id = $3
      `, [newOperation.id, req.user?.id, id]);
    }

    if (copy_inspection_plans) {
      // Inspection Plans kopieren
      const plansResult = await client.query(
        'SELECT * FROM inspection_plans WHERE operation_id = $1',
        [id]
      );
      
      for (const plan of plansResult.rows) {
        const newPlanResult = await client.query(`
          INSERT INTO inspection_plans (operation_id, name, version, status, notes, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [newOperation.id, plan.name, plan.version, plan.status, plan.notes, req.user?.id]);
        
        // Inspection Items kopieren
        await client.query(`
          INSERT INTO inspection_items (inspection_plan_id, sequence, characteristic, nominal_value, tolerance_min, tolerance_max, unit, measuring_method, frequency, notes)
          SELECT $1, sequence, characteristic, nominal_value, tolerance_min, tolerance_max, unit, measuring_method, frequency, notes
          FROM inspection_items WHERE inspection_plan_id = $2
        `, [newPlanResult.rows[0].id, plan.id]);
      }
    }

    await client.query('COMMIT');

    // Maschinen-Name laden für Response
    const machineResult = await pool.query(
      'SELECT name FROM machines WHERE id = $1',
      [machine_id]
    );

    res.status(201).json({
      success: true,
      message: 'Variante erfolgreich erstellt',
      data: {
        ...newOperation,
        machine_name: machineResult.rows[0]?.name || null
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating variant:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Variante',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get all variants for an operation
 * GET /api/operations/:id/variants
 */
exports.getVariants = async (req, res) => {
  try {
    const { id } = req.params;

    // Erst variant_group_id der Operation holen
    const opResult = await pool.query(
      'SELECT variant_group_id FROM operations WHERE id = $1',
      [id]
    );

    if (opResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Operation nicht gefunden'
      });
    }

    const variantGroupId = opResult.rows[0].variant_group_id;

    if (!variantGroupId) {
      return res.json({
        success: true,
        count: 1,
        data: [] // Keine Varianten, nur die Operation selbst
      });
    }

    // Alle Varianten der Gruppe laden
    const result = await pool.query(`
      SELECT 
        o.*,
        m.name as machine_name,
        ot.name as operation_type_name
      FROM operations o
      LEFT JOIN machines m ON o.machine_id = m.id
      LEFT JOIN operation_types ot ON o.operation_type_id = ot.id
      WHERE o.variant_group_id = $1
      ORDER BY o.is_variant_primary DESC, o.machine_id
    `, [variantGroupId]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching variants:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Varianten',
      error: error.message
    });
  }
};

/**
 * Set an operation variant as primary
 * PUT /api/operations/:id/set-primary
 */
exports.setPrimary = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Operation und variant_group_id laden
    const opResult = await client.query(
      'SELECT variant_group_id FROM operations WHERE id = $1',
      [id]
    );

    if (opResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Operation nicht gefunden'
      });
    }

    const variantGroupId = opResult.rows[0].variant_group_id;

    if (!variantGroupId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Diese Operation hat keine Varianten-Gruppe'
      });
    }

    // Alle Varianten in der Gruppe auf is_variant_primary = false setzen
    await client.query(
      'UPDATE operations SET is_variant_primary = false WHERE variant_group_id = $1',
      [variantGroupId]
    );

    // Diese Operation als primär setzen
    await client.query(
      'UPDATE operations SET is_variant_primary = true WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Primäre Variante erfolgreich gesetzt'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting primary variant:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Setzen der primären Variante',
      error: error.message
    });
  } finally {
    client.release();
  }
};
