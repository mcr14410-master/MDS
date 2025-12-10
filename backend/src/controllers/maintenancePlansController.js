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
 * Helper: Convert empty strings to null for numeric fields
 */
const sanitizeNumericField = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  return value;
};

// ============================================================
// MAINTENANCE TYPES
// ============================================================

/**
 * Get all maintenance types
 * GET /api/maintenance/types
 */
exports.getMaintenanceTypes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM maintenance_types
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Wartungstypen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Wartungstypen',
      message: error.message
    });
  }
};

// ============================================================
// MAINTENANCE PLANS - CRUD
// ============================================================

/**
 * Get all maintenance plans with optional filtering
 * GET /api/maintenance/plans?machine_id=1&is_active=true&skill_level=helper
 */
exports.getAllPlans = async (req, res) => {
  try {
    const { machine_id, maintenance_type_id, is_active, skill_level, is_shift_critical, search } = req.query;

    let query = `
      SELECT 
        mp.*,
        m.name AS machine_name,
        m.machine_type,
        m.machine_category,
        m.location AS machine_location,
        m.current_operating_hours,
        mt.name AS maintenance_type_name,
        mt.icon AS maintenance_type_icon,
        mt.color AS maintenance_type_color,
        u.username AS created_by_username,
        (SELECT COUNT(*) FROM maintenance_checklist_items WHERE maintenance_plan_id = mp.id) AS checklist_count,
        (SELECT COUNT(*) FROM maintenance_tasks WHERE maintenance_plan_id = mp.id) AS task_count,
        (SELECT MAX(completed_at) FROM maintenance_tasks WHERE maintenance_plan_id = mp.id AND status = 'completed') AS last_completed_at,
        CASE 
          -- Zeitbasiert überfällig
          WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() THEN 'overdue'
          -- Betriebsstundenbasiert überfällig
          WHEN mp.next_due_hours IS NOT NULL AND m.current_operating_hours >= mp.next_due_hours THEN 'overdue'
          -- Zeitbasiert heute fällig
          WHEN mp.next_due_at IS NOT NULL AND DATE(mp.next_due_at) = CURRENT_DATE AND mp.next_due_at >= NOW() THEN 'due_today'
          -- Betriebsstundenbasiert bald fällig (innerhalb 50h)
          WHEN mp.next_due_hours IS NOT NULL AND (mp.next_due_hours - m.current_operating_hours) <= 50 THEN 'due_soon'
          -- Zeitbasiert bald fällig
          WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() + INTERVAL '7 days' THEN 'due_soon'
          ELSE 'ok'
        END AS status
      FROM maintenance_plans mp
      JOIN machines m ON mp.machine_id = m.id
      JOIN maintenance_types mt ON mp.maintenance_type_id = mt.id
      LEFT JOIN users u ON mp.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (machine_id) {
      query += ` AND mp.machine_id = $${paramCount}`;
      params.push(machine_id);
      paramCount++;
    }

    if (maintenance_type_id) {
      query += ` AND mp.maintenance_type_id = $${paramCount}`;
      params.push(maintenance_type_id);
      paramCount++;
    }

    if (is_active !== undefined && is_active !== '') {
      query += ` AND mp.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (skill_level) {
      query += ` AND mp.required_skill_level = $${paramCount}`;
      params.push(skill_level);
      paramCount++;
    }

    if (is_shift_critical !== undefined && is_shift_critical !== '') {
      query += ` AND mp.is_shift_critical = $${paramCount}`;
      params.push(is_shift_critical === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND (mp.title ILIKE $${paramCount} OR mp.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY 
      CASE 
        WHEN mp.next_due_at < NOW() THEN 0
        WHEN mp.next_due_at < NOW() + INTERVAL '1 day' THEN 1
        ELSE 2
      END,
      mp.next_due_at ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Wartungspläne:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Wartungspläne',
      message: error.message
    });
  }
};

/**
 * Get single maintenance plan by ID with checklist items
 * GET /api/maintenance/plans/:id
 */
exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    // Plan mit Details
    const planQuery = `
      SELECT 
        mp.*,
        m.name AS machine_name,
        m.machine_type,
        m.machine_category,
        m.location AS machine_location,
        m.current_operating_hours,
        m.requires_shift_checklist,
        mt.name AS maintenance_type_name,
        mt.icon AS maintenance_type_icon,
        mt.color AS maintenance_type_color,
        u.username AS created_by_username,
        CASE 
          -- Zeitbasiert überfällig
          WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() THEN 'overdue'
          -- Betriebsstundenbasiert überfällig
          WHEN mp.next_due_hours IS NOT NULL AND m.current_operating_hours >= mp.next_due_hours THEN 'overdue'
          -- Zeitbasiert heute fällig
          WHEN mp.next_due_at IS NOT NULL AND DATE(mp.next_due_at) = CURRENT_DATE AND mp.next_due_at >= NOW() THEN 'due_today'
          -- Betriebsstundenbasiert bald fällig (innerhalb 50h)
          WHEN mp.next_due_hours IS NOT NULL AND (mp.next_due_hours - m.current_operating_hours) <= 50 THEN 'due_soon'
          -- Zeitbasiert bald fällig
          WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() + INTERVAL '7 days' THEN 'due_soon'
          ELSE 'ok'
        END AS status
      FROM maintenance_plans mp
      JOIN machines m ON mp.machine_id = m.id
      JOIN maintenance_types mt ON mp.maintenance_type_id = mt.id
      LEFT JOIN users u ON mp.created_by = u.id
      WHERE mp.id = $1
    `;

    const planResult = await pool.query(planQuery, [id]);

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsplan nicht gefunden'
      });
    }

    // Checklist Items laden
    const checklistQuery = `
      SELECT 
        mci.*,
        (SELECT COUNT(*) FROM maintenance_instructions WHERE checklist_item_id = mci.id) AS instruction_count
      FROM maintenance_checklist_items mci
      WHERE mci.maintenance_plan_id = $1
      ORDER BY mci.sequence ASC
    `;
    const checklistResult = await pool.query(checklistQuery, [id]);

    // Letzte Tasks laden
    const tasksQuery = `
      SELECT 
        mt.id,
        mt.status,
        mt.due_date,
        mt.completed_at,
        mt.created_at,
        mt.actual_duration_minutes,
        mt.notes,
        mt.issues_found,
        COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.username) AS completed_by_name,
        u.username AS completed_by_username
      FROM maintenance_tasks mt
      LEFT JOIN users u ON mt.completed_by = u.id
      WHERE mt.maintenance_plan_id = $1
      ORDER BY mt.created_at DESC
      LIMIT 10
    `;
    const tasksResult = await pool.query(tasksQuery, [id]);

    // Verknüpfte Consumables laden
    const consumablesQuery = `
      SELECT 
        mpc.id AS link_id,
        mpc.quantity,
        mpc.notes AS link_notes,
        c.id,
        c.name,
        c.article_number,
        c.stock_status,
        c.base_unit,
        c.package_type,
        c.package_size,
        cc.name AS category_name,
        cc.color AS category_color
      FROM maintenance_plan_consumables mpc
      JOIN consumables c ON mpc.consumable_id = c.id AND c.is_deleted = false
      LEFT JOIN consumable_categories cc ON cc.id = c.category_id
      WHERE mpc.maintenance_plan_id = $1
      ORDER BY c.name
    `;
    const consumablesResult = await pool.query(consumablesQuery, [id]);

    res.json({
      success: true,
      data: {
        ...planResult.rows[0],
        checklist_items: checklistResult.rows,
        recent_tasks: tasksResult.rows,
        consumables: consumablesResult.rows
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden des Wartungsplans:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Wartungsplans',
      message: error.message
    });
  }
};

/**
 * Create new maintenance plan
 * POST /api/maintenance/plans
 */
exports.createPlan = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      machine_id,
      maintenance_type_id,
      title,
      description,
      interval_type,
      interval_value,
      interval_hours,
      next_due_at,
      next_due_hours,
      required_skill_level = 'operator',
      estimated_duration_minutes,
      priority = 'normal',
      is_active = true,
      is_shift_critical = false,
      shift_deadline_time,
      instructions,
      safety_notes,
      required_tools,
      required_parts,
      checklist_items = []
    } = req.body;

    // Validierung
    if (!machine_id || !maintenance_type_id || !title) {
      return res.status(400).json({
        success: false,
        error: 'Maschine, Wartungstyp und Titel sind erforderlich'
      });
    }

    if (!interval_type && !interval_hours) {
      return res.status(400).json({
        success: false,
        error: 'Entweder Zeitintervall oder Betriebsstunden-Intervall erforderlich'
      });
    }

    await client.query('BEGIN');

    // Plan erstellen
    const planQuery = `
      INSERT INTO maintenance_plans (
        machine_id, maintenance_type_id, title, description,
        interval_type, interval_value, interval_hours,
        next_due_at, next_due_hours,
        required_skill_level, estimated_duration_minutes, priority,
        is_active, is_shift_critical, shift_deadline_time,
        instructions, safety_notes, required_tools, required_parts,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const planValues = [
      machine_id,
      maintenance_type_id,
      title,
      description || null,
      interval_type || null,
      sanitizeNumericField(interval_value),
      sanitizeNumericField(interval_hours),
      next_due_at || new Date(),
      sanitizeNumericField(next_due_hours),
      required_skill_level,
      sanitizeNumericField(estimated_duration_minutes),
      priority,
      is_active,
      is_shift_critical,
      shift_deadline_time || null,
      instructions || null,
      safety_notes || null,
      required_tools || null,
      required_parts || null,
      req.user?.id || null
    ];

    const planResult = await client.query(planQuery, planValues);
    const plan = planResult.rows[0];

    // Checklist Items erstellen
    if (checklist_items.length > 0) {
      for (let i = 0; i < checklist_items.length; i++) {
        const item = checklist_items[i];
        await client.query(`
          INSERT INTO maintenance_checklist_items (
            maintenance_plan_id, title, description, sequence,
            requires_photo, requires_measurement, measurement_unit,
            min_value, max_value, is_critical,
            decision_type, on_failure_action, expected_answer
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          plan.id,
          item.title,
          item.description || null,
          item.sequence || i + 1,
          item.requires_photo || false,
          item.requires_measurement || false,
          item.measurement_unit || null,
          sanitizeNumericField(item.min_value),
          sanitizeNumericField(item.max_value),
          item.is_critical || false,
          item.decision_type || 'none',
          item.on_failure_action || 'continue',
          item.expected_answer
        ]);
      }
    }

    await client.query('COMMIT');

    // Plan mit allen Details zurückgeben
    const fullPlanResult = await pool.query(`
      SELECT 
        mp.*,
        m.name AS machine_name,
        mt.name AS maintenance_type_name
      FROM maintenance_plans mp
      JOIN machines m ON mp.machine_id = m.id
      JOIN maintenance_types mt ON mp.maintenance_type_id = mt.id
      WHERE mp.id = $1
    `, [plan.id]);

    res.status(201).json({
      success: true,
      data: fullPlanResult.rows[0],
      message: 'Wartungsplan erfolgreich erstellt'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Erstellen des Wartungsplans:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Wartungsplans',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Update maintenance plan
 * PUT /api/maintenance/plans/:id
 */
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      machine_id,
      maintenance_type_id,
      title,
      description,
      interval_type,
      interval_value,
      interval_hours,
      next_due_at,
      next_due_hours,
      required_skill_level,
      estimated_duration_minutes,
      priority,
      is_active,
      is_shift_critical,
      shift_deadline_time,
      instructions,
      safety_notes,
      required_tools,
      required_parts
    } = req.body;

    // Prüfen ob Plan existiert
    const checkResult = await pool.query('SELECT id FROM maintenance_plans WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsplan nicht gefunden'
      });
    }

    const query = `
      UPDATE maintenance_plans SET
        machine_id = COALESCE($1, machine_id),
        maintenance_type_id = COALESCE($2, maintenance_type_id),
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        interval_type = COALESCE($5, interval_type),
        interval_value = COALESCE($6, interval_value),
        interval_hours = COALESCE($7, interval_hours),
        next_due_at = COALESCE($8, next_due_at),
        next_due_hours = COALESCE($9, next_due_hours),
        required_skill_level = COALESCE($10, required_skill_level),
        estimated_duration_minutes = COALESCE($11, estimated_duration_minutes),
        priority = COALESCE($12, priority),
        is_active = COALESCE($13, is_active),
        is_shift_critical = COALESCE($14, is_shift_critical),
        shift_deadline_time = COALESCE($15, shift_deadline_time),
        instructions = COALESCE($16, instructions),
        safety_notes = COALESCE($17, safety_notes),
        required_tools = COALESCE($18, required_tools),
        required_parts = COALESCE($19, required_parts),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *
    `;

    const values = [
      machine_id || null,
      maintenance_type_id || null,
      title || null,
      description,
      interval_type,
      sanitizeNumericField(interval_value),
      sanitizeNumericField(interval_hours),
      next_due_at,
      sanitizeNumericField(next_due_hours),
      required_skill_level,
      sanitizeNumericField(estimated_duration_minutes),
      priority,
      is_active,
      is_shift_critical,
      shift_deadline_time,
      instructions,
      safety_notes,
      required_tools,
      required_parts,
      id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Wartungsplan erfolgreich aktualisiert'
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Wartungsplans:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Wartungsplans',
      message: error.message
    });
  }
};

/**
 * Delete maintenance plan (soft delete)
 * DELETE /api/maintenance/plans/:id
 */
exports.deletePlan = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    // Prüfen ob Plan existiert
    const checkResult = await pool.query('SELECT id, reference_image FROM maintenance_plans WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsplan nicht gefunden'
      });
    }

    let result;
    if (hard_delete === 'true') {
      // Sammle alle Foto-Pfade bevor wir löschen
      const photosToDelete = [];
      
      // Plan-Referenzbild
      if (checkResult.rows[0].reference_image) {
        photosToDelete.push(checkResult.rows[0].reference_image);
      }
      
      // Checklist-Item Referenzbilder
      const itemImagesResult = await pool.query(
        'SELECT reference_image FROM maintenance_checklist_items WHERE maintenance_plan_id = $1 AND reference_image IS NOT NULL',
        [id]
      );
      itemImagesResult.rows.forEach(row => photosToDelete.push(row.reference_image));
      
      // Task-Completion Fotos (hochgeladen während Ausführung)
      const completionPhotosResult = await pool.query(`
        SELECT mcc.photo_path 
        FROM maintenance_checklist_completions mcc
        JOIN maintenance_tasks mt ON mcc.maintenance_task_id = mt.id
        WHERE mt.maintenance_plan_id = $1 AND mcc.photo_path IS NOT NULL
      `, [id]);
      completionPhotosResult.rows.forEach(row => photosToDelete.push(row.photo_path));
      
      // Hard delete - auch Checklist Items werden durch CASCADE gelöscht
      result = await pool.query('DELETE FROM maintenance_plans WHERE id = $1 RETURNING *', [id]);
      
      // Fotos aus Filesystem löschen
      const uploadDir = path.join(__dirname, '../../uploads');
      photosToDelete.forEach(photoPath => {
        if (photoPath) {
          const fullPath = path.join(uploadDir, photoPath.replace('/uploads/', ''));
          try {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`Deleted photo: ${fullPath}`);
            }
          } catch (err) {
            console.error(`Failed to delete photo ${fullPath}:`, err.message);
          }
        }
      });
      
      console.log(`Deleted ${photosToDelete.length} photos for plan ${id}`);
    } else {
      // Soft delete
      result = await pool.query(
        'UPDATE maintenance_plans SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [id]
      );
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: hard_delete === 'true' ? 'Wartungsplan endgültig gelöscht' : 'Wartungsplan deaktiviert'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Wartungsplans:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Wartungsplans',
      message: error.message
    });
  }
};

// ============================================================
// CHECKLIST ITEMS
// ============================================================

/**
 * Get checklist items for a plan
 * GET /api/maintenance/plans/:id/checklist
 */
exports.getChecklistItems = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        mci.*,
        (SELECT COUNT(*) FROM maintenance_instructions WHERE checklist_item_id = mci.id) AS instruction_count
      FROM maintenance_checklist_items mci
      WHERE mci.maintenance_plan_id = $1
      ORDER BY mci.sequence ASC
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Checklist:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Checklist',
      message: error.message
    });
  }
};

/**
 * Add checklist item to plan
 * POST /api/maintenance/plans/:id/checklist
 */
exports.addChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      sequence,
      requires_photo = false,
      requires_measurement = false,
      measurement_unit,
      min_value,
      max_value,
      is_critical = false,
      decision_type = 'none',
      on_failure_action = 'continue',
      expected_answer
    } = req.body;

    // Sanitize boolean fields (empty string -> null)
    const sanitizeBoolean = (val) => {
      if (val === '' || val === undefined) return null;
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return null;
    };

    const sanitizedRequiresPhoto = sanitizeBoolean(requires_photo) || false;
    const sanitizedRequiresMeasurement = sanitizeBoolean(requires_measurement) || false;
    const sanitizedIsCritical = sanitizeBoolean(is_critical) || false;
    const sanitizedExpectedAnswer = sanitizeBoolean(expected_answer);

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Titel ist erforderlich'
      });
    }

    // Prüfen ob Plan existiert
    const planCheck = await pool.query('SELECT id FROM maintenance_plans WHERE id = $1', [id]);
    if (planCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsplan nicht gefunden'
      });
    }

    // Nächste Sequence ermitteln wenn nicht angegeben
    let itemSequence = sequence;
    if (!itemSequence) {
      const seqResult = await pool.query(
        'SELECT COALESCE(MAX(sequence), 0) + 1 AS next_seq FROM maintenance_checklist_items WHERE maintenance_plan_id = $1',
        [id]
      );
      itemSequence = seqResult.rows[0].next_seq;
    }

    const query = `
      INSERT INTO maintenance_checklist_items (
        maintenance_plan_id, title, description, sequence,
        requires_photo, requires_measurement, measurement_unit,
        min_value, max_value, is_critical,
        decision_type, on_failure_action, expected_answer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      id,
      title,
      description || null,
      itemSequence,
      sanitizedRequiresPhoto,
      sanitizedRequiresMeasurement,
      measurement_unit || null,
      sanitizeNumericField(min_value),
      sanitizeNumericField(max_value),
      sanitizedIsCritical,
      decision_type || 'none',
      on_failure_action || 'continue',
      sanitizedExpectedAnswer
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Checklist-Item hinzugefügt'
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Checklist-Items:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hinzufügen des Checklist-Items',
      message: error.message
    });
  }
};

/**
 * Update checklist item
 * PUT /api/maintenance/checklist/:itemId
 */
exports.updateChecklistItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const {
      title,
      description,
      sequence,
      requires_photo,
      requires_measurement,
      measurement_unit,
      min_value,
      max_value,
      is_critical,
      decision_type,
      on_failure_action,
      expected_answer
    } = req.body;

    // Helper function to sanitize boolean fields
    const sanitizeBoolean = (val) => {
      if (val === true || val === 'true') return true;
      if (val === false || val === 'false') return false;
      return null;
    };

    // Helper function to sanitize empty strings to null
    const sanitizeString = (val) => {
      if (val === '' || val === undefined) return null;
      return val;
    };

    const query = `
      UPDATE maintenance_checklist_items SET
        title = COALESCE($1, title),
        description = $2,
        sequence = $3,
        requires_photo = COALESCE($4, requires_photo),
        requires_measurement = COALESCE($5, requires_measurement),
        measurement_unit = $6,
        min_value = $7,
        max_value = $8,
        is_critical = COALESCE($9, is_critical),
        decision_type = COALESCE($10, decision_type),
        on_failure_action = COALESCE($11, on_failure_action),
        expected_answer = $12
      WHERE id = $13
      RETURNING *
    `;

    const values = [
      title || null,
      sanitizeString(description),
      sequence ? parseInt(sequence) : null,
      sanitizeBoolean(requires_photo),
      sanitizeBoolean(requires_measurement),
      sanitizeString(measurement_unit),
      sanitizeNumericField(min_value),
      sanitizeNumericField(max_value),
      sanitizeBoolean(is_critical),
      sanitizeString(decision_type),
      sanitizeString(on_failure_action),
      sanitizeBoolean(expected_answer),
      itemId
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Checklist-Item nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Checklist-Item aktualisiert'
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Checklist-Items:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Checklist-Items',
      message: error.message
    });
  }
};

/**
 * Delete checklist item
 * DELETE /api/maintenance/checklist/:itemId
 */
exports.deleteChecklistItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const result = await pool.query(
      'DELETE FROM maintenance_checklist_items WHERE id = $1 RETURNING *',
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Checklist-Item nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Checklist-Item gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Checklist-Items:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Checklist-Items',
      message: error.message
    });
  }
};

/**
 * Upload reference image for maintenance plan
 * POST /api/maintenance/plans/:id/reference-image
 */
exports.uploadPlanReferenceImage = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Keine Datei hochgeladen'
      });
    }

    // Altes Bild löschen falls vorhanden
    const oldImageResult = await pool.query(
      'SELECT reference_image FROM maintenance_plans WHERE id = $1',
      [id]
    );
    if (oldImageResult.rows.length > 0 && oldImageResult.rows[0].reference_image) {
      const oldPath = path.join(__dirname, '../../uploads', oldImageResult.rows[0].reference_image.replace('/uploads/', ''));
      try {
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (e) {
        console.error('Failed to delete old image:', e.message);
      }
    }

    const imagePath = `/uploads/maintenance/${req.file.filename}`;

    const result = await pool.query(
      'UPDATE maintenance_plans SET reference_image = $1 WHERE id = $2 RETURNING id, title, reference_image',
      [imagePath, id]
    );

    if (result.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'Wartungsplan nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: {
        reference_image: imagePath,
        filename: req.file.filename,
        plan: result.rows[0]
      },
      message: 'Referenzbild hochgeladen'
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Referenzbilds:', error);
    if (req.file) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen des Referenzbilds',
      message: error.message
    });
  }
};

/**
 * Delete reference image for maintenance plan
 * DELETE /api/maintenance/plans/:id/reference-image
 */
exports.deletePlanReferenceImage = async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const { id } = req.params;

    // Aktuelles Bild holen
    const result = await pool.query(
      'SELECT reference_image FROM maintenance_plans WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsplan nicht gefunden'
      });
    }

    const imagePath = result.rows[0].reference_image;

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        error: 'Kein Referenzbild vorhanden'
      });
    }

    // Datei löschen
    const fullPath = path.join(__dirname, '../../uploads', imagePath.replace('/uploads/', ''));
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {
      console.error('Failed to delete image file:', e.message);
    }

    // DB-Eintrag leeren
    await pool.query(
      'UPDATE maintenance_plans SET reference_image = NULL WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Referenzbild gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen des Referenzbilds:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Referenzbilds',
      message: error.message
    });
  }
};

/**
 * Upload reference image for checklist item
 * POST /api/maintenance/checklist/:itemId/reference-image
 */
exports.uploadChecklistItemReferenceImage = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Keine Datei hochgeladen'
      });
    }

    const imagePath = `/uploads/maintenance/${req.file.filename}`;

    const result = await pool.query(
      'UPDATE maintenance_checklist_items SET reference_image = $1 WHERE id = $2 RETURNING *',
      [imagePath, itemId]
    );

    if (result.rows.length === 0) {
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'Checklist-Item nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: {
        reference_image: imagePath,
        filename: req.file.filename,
        item: result.rows[0]
      },
      message: 'Referenzbild hochgeladen'
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Referenzbilds:', error);
    if (req.file) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen des Referenzbilds',
      message: error.message
    });
  }
};

/**
 * Reorder checklist items
 * PUT /api/maintenance/plans/:id/checklist/reorder
 */
exports.reorderChecklistItems = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { items } = req.body; // Array of { id, sequence }

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items Array erforderlich'
      });
    }

    await client.query('BEGIN');

    for (const item of items) {
      await client.query(
        'UPDATE maintenance_checklist_items SET sequence = $1 WHERE id = $2 AND maintenance_plan_id = $3',
        [item.sequence, item.id, id]
      );
    }

    await client.query('COMMIT');

    // Aktualisierte Liste zurückgeben
    const result = await pool.query(
      'SELECT * FROM maintenance_checklist_items WHERE maintenance_plan_id = $1 ORDER BY sequence ASC',
      [id]
    );

    res.json({
      success: true,
      data: result.rows,
      message: 'Reihenfolge aktualisiert'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Sortieren der Checklist:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Sortieren der Checklist',
      message: error.message
    });
  } finally {
    client.release();
  }
};

// ============================================================
// DASHBOARD & ÜBERSICHTEN
// ============================================================

/**
 * Get maintenance dashboard overview
 * GET /api/maintenance/dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    // Überfällige Wartungen (Zeit-basiert ODER Betriebsstunden-basiert)
    const overdueQuery = `
      SELECT COUNT(*) AS count FROM maintenance_plans mp
      LEFT JOIN machines m ON mp.machine_id = m.id
      WHERE mp.is_active = true 
        AND (
          (mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW())
          OR (mp.interval_hours IS NOT NULL AND mp.next_due_hours IS NOT NULL 
              AND m.current_operating_hours >= mp.next_due_hours)
        )
    `;
    const overdueResult = await pool.query(overdueQuery);

    // Heute fällig (Datum = heute UND nicht überfällig, d.h. Uhrzeit noch nicht erreicht)
    const dueTodayQuery = `
      SELECT COUNT(*) AS count FROM maintenance_plans 
      WHERE is_active = true 
        AND next_due_at IS NOT NULL
        AND DATE(next_due_at) = CURRENT_DATE
        AND next_due_at >= NOW()
    `;
    const dueTodayResult = await pool.query(dueTodayQuery);

    // Diese Woche fällig (morgen bis 7 Tage, nicht heute)
    const dueWeekQuery = `
      SELECT COUNT(*) AS count FROM maintenance_plans 
      WHERE is_active = true 
        AND next_due_at IS NOT NULL
        AND DATE(next_due_at) > CURRENT_DATE
        AND next_due_at < NOW() + INTERVAL '7 days'
    `;
    const dueWeekResult = await pool.query(dueWeekQuery);

    // OK (mehr als 7 Tage oder betriebsstunden-basiert mit genug Reserve)
    const okQuery = `
      SELECT COUNT(*) AS count FROM maintenance_plans mp
      LEFT JOIN machines m ON mp.machine_id = m.id
      WHERE mp.is_active = true 
        AND (
          (mp.next_due_at IS NOT NULL AND mp.next_due_at >= NOW() + INTERVAL '7 days')
          OR (mp.interval_hours IS NOT NULL AND mp.next_due_hours IS NOT NULL 
              AND m.current_operating_hours < mp.next_due_hours - 50)
        )
    `;
    const okResult = await pool.query(okQuery);

    // Offene Eskalationen
    const escalationsQuery = `
      SELECT COUNT(*) AS count FROM maintenance_escalations 
      WHERE status IN ('open', 'acknowledged')
    `;
    const escalationsResult = await pool.query(escalationsQuery);

    // Maschinen-Status Übersicht
    const machineStatusQuery = `
      SELECT 
        status,
        COUNT(*) AS count
      FROM machine_maintenance_status
      GROUP BY status
    `;
    const machineStatusResult = await pool.query(machineStatusQuery);

    // Nächste 5 fällige Wartungen (ohne heute bereits erledigte)
    const upcomingQuery = `
      SELECT 
        mp.id,
        mp.title,
        mp.next_due_at,
        mp.next_due_hours,
        mp.interval_hours,
        mp.required_skill_level,
        mp.estimated_duration_minutes,
        mp.priority,
        m.name AS machine_name,
        m.location AS machine_location,
        m.current_operating_hours,
        mt.name AS maintenance_type,
        mt.icon,
        mt.color
      FROM maintenance_plans mp
      JOIN machines m ON mp.machine_id = m.id
      JOIN maintenance_types mt ON mp.maintenance_type_id = mt.id
      WHERE mp.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM maintenance_tasks mt2
          WHERE mt2.maintenance_plan_id = mp.id
            AND mt2.status = 'completed'
            AND DATE(mt2.completed_at) = CURRENT_DATE
        )
      ORDER BY 
        CASE 
          WHEN mp.next_due_at IS NOT NULL THEN mp.next_due_at
          ELSE '2099-12-31'::timestamp
        END ASC,
        CASE
          WHEN mp.next_due_hours IS NOT NULL THEN mp.next_due_hours - m.current_operating_hours
          ELSE 999999
        END ASC
      LIMIT 5
    `;
    const upcomingResult = await pool.query(upcomingQuery);

    res.json({
      success: true,
      data: {
        summary: {
          overdue: parseInt(overdueResult.rows[0].count),
          due_today: parseInt(dueTodayResult.rows[0].count),
          due_week: parseInt(dueWeekResult.rows[0].count),
          ok: parseInt(okResult.rows[0].count),
          open_escalations: parseInt(escalationsResult.rows[0].count)
        },
        machine_status: machineStatusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, { critical: 0, warning: 0, ok: 0 }),
        upcoming: upcomingResult.rows
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden des Dashboards:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Dashboards',
      message: error.message
    });
  }
};

/**
 * Get machine maintenance status overview
 * GET /api/maintenance/machines
 */
exports.getMachineStatus = async (req, res) => {
  try {
    const { category, status } = req.query;

    let query = `SELECT * FROM machine_maintenance_status WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (category) {
      query += ` AND machine_category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY 
      CASE status 
        WHEN 'critical' THEN 0 
        WHEN 'warning' THEN 1 
        ELSE 2 
      END, name`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden des Maschinen-Status:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Maschinen-Status',
      message: error.message
    });
  }
};

/**
 * Get due maintenance overview (from view)
 * GET /api/maintenance/due
 */
exports.getDueOverview = async (req, res) => {
  try {
    const { machine_id, skill_level, time_status } = req.query;

    let query = `SELECT * FROM maintenance_due_overview WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (machine_id) {
      query += ` AND machine_id = $${paramCount}`;
      params.push(machine_id);
      paramCount++;
    }

    if (skill_level) {
      query += ` AND required_skill_level = $${paramCount}`;
      params.push(skill_level);
      paramCount++;
    }

    if (time_status) {
      query += ` AND time_status = $${paramCount}`;
      params.push(time_status);
      paramCount++;
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der fälligen Wartungen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der fälligen Wartungen',
      message: error.message
    });
  }
};

// ============================================================================
// MAINTENANCE PLAN CONSUMABLES
// ============================================================================

/**
 * Add consumable to maintenance plan
 * POST /api/maintenance/plans/:id/consumables
 */
exports.addConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const { consumable_id, quantity, notes } = req.body;
    const userId = req.user?.id;

    if (!consumable_id) {
      return res.status(400).json({
        success: false,
        error: 'consumable_id ist erforderlich'
      });
    }

    // Prüfen ob Plan existiert
    const planCheck = await pool.query('SELECT id FROM maintenance_plans WHERE id = $1', [id]);
    if (planCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsplan nicht gefunden'
      });
    }

    // Prüfen ob Consumable existiert
    const consumableCheck = await pool.query('SELECT id FROM consumables WHERE id = $1 AND is_deleted = false', [consumable_id]);
    if (consumableCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Verbrauchsmaterial nicht gefunden'
      });
    }

    // Prüfen ob bereits verknüpft
    const existingCheck = await pool.query(
      'SELECT id FROM maintenance_plan_consumables WHERE maintenance_plan_id = $1 AND consumable_id = $2',
      [id, consumable_id]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Dieses Verbrauchsmaterial ist bereits mit dem Wartungsplan verknüpft'
      });
    }

    // Verknüpfung erstellen
    const result = await pool.query(`
      INSERT INTO maintenance_plan_consumables (maintenance_plan_id, consumable_id, quantity, notes, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, consumable_id, quantity || null, notes || null, userId]);

    // Mit Details zurückgeben
    const detailResult = await pool.query(`
      SELECT 
        mpc.id AS link_id,
        mpc.quantity,
        mpc.notes AS link_notes,
        c.id,
        c.name,
        c.article_number,
        c.stock_status,
        c.base_unit,
        cc.name AS category_name,
        cc.color AS category_color
      FROM maintenance_plan_consumables mpc
      JOIN consumables c ON mpc.consumable_id = c.id
      LEFT JOIN consumable_categories cc ON cc.id = c.category_id
      WHERE mpc.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      data: detailResult.rows[0]
    });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Verbrauchsmaterials:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hinzufügen des Verbrauchsmaterials',
      message: error.message
    });
  }
};

/**
 * Update consumable link
 * PUT /api/maintenance/plans/:id/consumables/:linkId
 */
exports.updateConsumable = async (req, res) => {
  try {
    const { id, linkId } = req.params;
    const { quantity, notes } = req.body;

    const result = await pool.query(`
      UPDATE maintenance_plan_consumables 
      SET quantity = $1, notes = $2
      WHERE id = $3 AND maintenance_plan_id = $4
      RETURNING *
    `, [quantity || null, notes || null, linkId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Verknüpfung nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren',
      message: error.message
    });
  }
};

/**
 * Remove consumable from maintenance plan
 * DELETE /api/maintenance/plans/:id/consumables/:linkId
 */
exports.removeConsumable = async (req, res) => {
  try {
    const { id, linkId } = req.params;

    const result = await pool.query(
      'DELETE FROM maintenance_plan_consumables WHERE id = $1 AND maintenance_plan_id = $2 RETURNING id',
      [linkId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Verknüpfung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Verbrauchsmaterial entfernt'
    });
  } catch (error) {
    console.error('Fehler beim Entfernen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Entfernen',
      message: error.message
    });
  }
};
