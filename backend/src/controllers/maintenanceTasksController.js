const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ============================================================
// MAINTENANCE TASKS - Konkrete Wartungsaufgaben
// ============================================================

/**
 * Get all maintenance tasks with filtering
 * GET /api/maintenance/tasks?status=pending&assigned_to=5&machine_id=1&task_type=standalone
 */
exports.getAllTasks = async (req, res) => {
  try {
    const { 
      status, 
      assigned_to, 
      machine_id, 
      maintenance_plan_id,
      due_date_from,
      due_date_to,
      skill_level,
      is_shift_critical,
      task_type
    } = req.query;

    let query = `
      SELECT 
        mt.*,
        -- Für plan_based Tasks: Daten aus Plan übernehmen
        COALESCE(mt.title, mp.title) AS task_title,
        COALESCE(mt.description, mp.description) AS task_description,
        COALESCE(mt.priority, mp.priority, 'normal') AS task_priority,
        COALESCE(mt.estimated_duration_minutes, mp.estimated_duration_minutes) AS task_duration,
        COALESCE(mt.location, m.location) AS task_location,
        -- Plan-Daten (nullable für standalone)
        mp.title AS plan_title,
        mp.description AS plan_description,
        mp.required_skill_level,
        mp.is_shift_critical,
        mp.shift_deadline_time,
        mp.interval_type,
        mp.interval_value,
        mp.interval_hours,
        -- Maschinen-Daten (nullable für standalone)
        m.id AS machine_id,
        m.name AS machine_name,
        m.machine_category,
        m.location AS machine_location,
        -- Wartungstyp (nullable für standalone)
        mtype.name AS maintenance_type,
        mtype.icon AS maintenance_type_icon,
        mtype.color AS maintenance_type_color,
        -- User-Daten
        u_assigned.username AS assigned_to_username,
        u_assigned.first_name AS assigned_to_first_name,
        u_assigned.last_name AS assigned_to_last_name,
        u_completed.username AS completed_by_username,
        u_created.username AS created_by_username,
        u_created.first_name AS created_by_first_name,
        -- Checklist counts (nur für plan_based)
        COALESCE((SELECT COUNT(*) FROM maintenance_checklist_items WHERE maintenance_plan_id = mp.id), 0) AS total_checklist_items,
        COALESCE((SELECT COUNT(*) FROM maintenance_checklist_completions mcc 
         WHERE mcc.maintenance_task_id = mt.id AND mcc.completed = true), 0) AS completed_checklist_items
      FROM maintenance_tasks mt
      LEFT JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      LEFT JOIN machines m ON mt.machine_id = m.id
      LEFT JOIN maintenance_types mtype ON mp.maintenance_type_id = mtype.id
      LEFT JOIN users u_assigned ON mt.assigned_to = u_assigned.id
      LEFT JOIN users u_completed ON mt.completed_by = u_completed.id
      LEFT JOIN users u_created ON mt.created_by = u_created.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (task_type) {
      query += ` AND mt.task_type = $${paramCount}`;
      params.push(task_type);
      paramCount++;
    }

    if (status) {
      query += ` AND mt.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (assigned_to) {
      query += ` AND mt.assigned_to = $${paramCount}`;
      params.push(assigned_to);
      paramCount++;
    }

    if (machine_id) {
      query += ` AND mt.machine_id = $${paramCount}`;
      params.push(machine_id);
      paramCount++;
    }

    if (maintenance_plan_id) {
      query += ` AND mt.maintenance_plan_id = $${paramCount}`;
      params.push(maintenance_plan_id);
      paramCount++;
    }

    if (due_date_from) {
      query += ` AND mt.due_date >= $${paramCount}`;
      params.push(due_date_from);
      paramCount++;
    }

    if (due_date_to) {
      query += ` AND mt.due_date <= $${paramCount}`;
      params.push(due_date_to);
      paramCount++;
    }

    if (skill_level) {
      query += ` AND mp.required_skill_level = $${paramCount}`;
      params.push(skill_level);
      paramCount++;
    }

    if (is_shift_critical !== undefined) {
      query += ` AND mp.is_shift_critical = $${paramCount}`;
      params.push(is_shift_critical === 'true');
      paramCount++;
    }

    query += ` ORDER BY
      CASE mt.status 
        WHEN 'pending' THEN 0 
        WHEN 'assigned' THEN 1 
        WHEN 'in_progress' THEN 2
        WHEN 'escalated' THEN 3
        ELSE 4 
      END,
      mt.due_date ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Wartungsaufgaben:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Wartungsaufgaben',
      message: error.message
    });
  }
};

/**
 * Get tasks for current user (Helfer/Bediener Ansicht)
 * GET /api/maintenance/tasks/my
 */
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, date } = req.query;

    // Hole Skill-Level des Users
    const userResult = await pool.query(
      'SELECT skill_level FROM users WHERE id = $1',
      [userId]
    );
    const userSkillLevel = userResult.rows[0]?.skill_level || 'helper';

    // Skill-Level Hierarchie: specialist > technician > operator > helper
    const skillHierarchy = {
      'helper': ['helper'],
      'operator': ['helper', 'operator'],
      'technician': ['helper', 'operator', 'technician'],
      'specialist': ['helper', 'operator', 'technician', 'specialist']
    };
    const qualifiedFor = skillHierarchy[userSkillLevel] || ['helper'];

    let query = `
      SELECT 
        mt.*,
        mp.title AS plan_title,
        mp.description AS plan_description,
        mp.required_skill_level,
        mp.estimated_duration_minutes,
        mp.is_shift_critical,
        mp.shift_deadline_time,
        mp.priority,
        mp.instructions,
        mp.safety_notes,
        mp.interval_type,
        mp.interval_value,
        mp.interval_hours,
        m.name AS machine_name,
        m.location AS machine_location,
        mtype.name AS maintenance_type,
        mtype.icon AS maintenance_type_icon,
        mtype.color AS maintenance_type_color,
        (SELECT COUNT(*) FROM maintenance_checklist_items WHERE maintenance_plan_id = mp.id) AS total_checklist_items,
        (SELECT COUNT(*) FROM maintenance_checklist_completions mcc 
         WHERE mcc.maintenance_task_id = mt.id AND mcc.completed = true) AS completed_checklist_items,
        CASE WHEN mt.assigned_to = $1 THEN true ELSE false END AS directly_assigned
      FROM maintenance_tasks mt
      LEFT JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      LEFT JOIN machines m ON mt.machine_id = m.id
      LEFT JOIN maintenance_types mtype ON mp.maintenance_type_id = mtype.id
      WHERE (
        mt.assigned_to = $1 
        OR (
          mt.assigned_to IS NULL 
          AND mt.status = 'pending'
          AND COALESCE(mp.required_skill_level, 'helper') = ANY($2::varchar[])
        )
      )
    `;
    const params = [userId, qualifiedFor];
    let paramCount = 3;

    if (status) {
      query += ` AND mt.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    } else {
      // Standardmäßig: offene Tasks ODER heute abgeschlossene
      query += ` AND (
        mt.status IN ('pending', 'assigned', 'in_progress')
        OR (mt.status = 'completed' AND DATE(mt.completed_at) = CURRENT_DATE AND mt.assigned_to = $1)
      )`;
    }

    if (date) {
      // Zeige Tasks die BIS zum gewählten Datum fällig sind (inkl. überfällige)
      query += ` AND (mt.due_date IS NULL OR DATE(mt.due_date) <= $${paramCount} OR (mt.status = 'completed' AND DATE(mt.completed_at) = CURRENT_DATE))`;
      params.push(date);
      paramCount++;
    }

    query += ` ORDER BY 
      CASE COALESCE(mp.priority, mt.priority, 'normal')
        WHEN 'critical' THEN 0 
        WHEN 'high' THEN 1 
        WHEN 'normal' THEN 2 
        ELSE 3 
      END,
      mt.due_date ASC`;

    const result = await pool.query(query, params);

    // Zusammenfassung - gleiche Logik wie Liste
    const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE mt.status = 'completed' AND DATE(mt.completed_at) = CURRENT_DATE AND mt.assigned_to = $1) AS completed_today,
        COUNT(*) FILTER (WHERE mt.status IN ('pending', 'assigned', 'in_progress') AND (
          mt.assigned_to = $1 OR (mt.assigned_to IS NULL AND mt.status = 'pending' AND COALESCE(mp.required_skill_level, 'helper') = ANY($2::varchar[]))
        )) AS open_tasks,
        SUM(CASE WHEN mt.status IN ('pending', 'assigned', 'in_progress') AND (
          mt.assigned_to = $1 OR (mt.assigned_to IS NULL AND mt.status = 'pending' AND COALESCE(mp.required_skill_level, 'helper') = ANY($2::varchar[]))
        )
            THEN COALESCE(mp.estimated_duration_minutes, mt.estimated_duration_minutes, 0) ELSE 0 END) AS estimated_minutes_remaining
      FROM maintenance_tasks mt
      LEFT JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
    `;
    const summaryResult = await pool.query(summaryQuery, [userId, qualifiedFor]);

    res.json({
      success: true,
      count: result.rows.length,
      summary: {
        completed_today: parseInt(summaryResult.rows[0].completed_today) || 0,
        open_tasks: parseInt(summaryResult.rows[0].open_tasks) || 0,
        estimated_minutes_remaining: parseInt(summaryResult.rows[0].estimated_minutes_remaining) || 0
      },
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden meiner Aufgaben:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden meiner Aufgaben',
      message: error.message
    });
  }
};

/**
 * Get single task by ID with full details
 * GET /api/maintenance/tasks/:id
 */
exports.getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    // Task mit Details
    const taskQuery = `
      SELECT 
        mt.*,
        mp.id AS plan_id,
        mp.title AS plan_title,
        mp.description AS plan_description,
        mp.required_skill_level,
        mp.estimated_duration_minutes,
        mp.is_shift_critical,
        mp.shift_deadline_time,
        mp.priority,
        mp.instructions,
        mp.safety_notes,
        mp.required_tools,
        mp.required_parts,
        mp.reference_image AS plan_reference_image,
        m.id AS machine_id,
        m.name AS machine_name,
        m.machine_category,
        m.location AS machine_location,
        m.current_operating_hours,
        mtype.name AS maintenance_type,
        mtype.icon AS maintenance_type_icon,
        mtype.color AS maintenance_type_color,
        u_assigned.username AS assigned_to_username,
        u_assigned.first_name AS assigned_to_first_name,
        u_completed.username AS completed_by_username
      FROM maintenance_tasks mt
      JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      JOIN machines m ON mt.machine_id = m.id
      JOIN maintenance_types mtype ON mp.maintenance_type_id = mtype.id
      LEFT JOIN users u_assigned ON mt.assigned_to = u_assigned.id
      LEFT JOIN users u_completed ON mt.completed_by = u_completed.id
      WHERE mt.id = $1
    `;

    const taskResult = await pool.query(taskQuery, [id]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsaufgabe nicht gefunden'
      });
    }

    const task = taskResult.rows[0];

    // Checklist Items mit Completion-Status
    const checklistQuery = `
      SELECT 
        mci.*,
        mcc.id AS completion_id,
        mcc.completed,
        mcc.measurement_value,
        mcc.photo_path,
        mcc.notes AS completion_notes,
        mcc.completed_by,
        mcc.completed_at,
        u.username AS completed_by_username
      FROM maintenance_checklist_items mci
      LEFT JOIN maintenance_checklist_completions mcc 
        ON mci.id = mcc.checklist_item_id AND mcc.maintenance_task_id = $1
      LEFT JOIN users u ON mcc.completed_by = u.id
      WHERE mci.maintenance_plan_id = $2
      ORDER BY mci.sequence ASC
    `;
    const checklistResult = await pool.query(checklistQuery, [id, task.plan_id]);

    // Fotos laden
    const photosQuery = `
      SELECT * FROM maintenance_photos 
      WHERE maintenance_task_id = $1 
      ORDER BY created_at ASC
    `;
    const photosResult = await pool.query(photosQuery, [id]);

    // Eskalationen laden
    const escalationsQuery = `
      SELECT 
        me.*,
        u_from.username AS escalated_from_username,
        u_to.username AS escalated_to_username,
        u_resolved.username AS resolved_by_username
      FROM maintenance_escalations me
      LEFT JOIN users u_from ON me.escalated_from_user_id = u_from.id
      LEFT JOIN users u_to ON me.escalated_to_user_id = u_to.id
      LEFT JOIN users u_resolved ON me.resolved_by = u_resolved.id
      WHERE me.maintenance_task_id = $1
      ORDER BY me.created_at DESC
    `;
    const escalationsResult = await pool.query(escalationsQuery, [id]);

    res.json({
      success: true,
      data: {
        ...task,
        checklist_items: checklistResult.rows,
        photos: photosResult.rows,
        escalations: escalationsResult.rows
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Wartungsaufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Wartungsaufgabe',
      message: error.message
    });
  }
};

/**
 * Create maintenance task (from plan or manual)
 * POST /api/maintenance/tasks
 */
exports.createTask = async (req, res) => {
  try {
    const {
      maintenance_plan_id,
      machine_id,
      due_date,
      assigned_to,
      notes
    } = req.body;

    if (!maintenance_plan_id) {
      return res.status(400).json({
        success: false,
        error: 'Wartungsplan ist erforderlich'
      });
    }

    // Plan laden für machine_id falls nicht angegeben
    const planQuery = 'SELECT machine_id FROM maintenance_plans WHERE id = $1';
    const planResult = await pool.query(planQuery, [maintenance_plan_id]);

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsplan nicht gefunden'
      });
    }

    const effectiveMachineId = machine_id || planResult.rows[0].machine_id;

    const query = `
      INSERT INTO maintenance_tasks (
        maintenance_plan_id, machine_id, status, due_date, assigned_to, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      maintenance_plan_id,
      effectiveMachineId,
      assigned_to ? 'assigned' : 'pending',
      due_date || new Date(),
      assigned_to || null,
      notes || null
    ];

    const result = await pool.query(query, values);

    // Wenn zugewiesen, assigned_at setzen
    if (assigned_to) {
      await pool.query(
        'UPDATE maintenance_tasks SET assigned_at = CURRENT_TIMESTAMP WHERE id = $1',
        [result.rows[0].id]
      );
    }

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Wartungsaufgabe erstellt'
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Wartungsaufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Wartungsaufgabe',
      message: error.message
    });
  }
};

/**
 * Assign task to user
 * PUT /api/maintenance/tasks/:id/assign
 */
exports.assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'Benutzer-ID ist erforderlich'
      });
    }

    // Prüfen ob User existiert und Skill-Level passt
    const userQuery = `
      SELECT u.id, u.maintenance_skill_level, mp.required_skill_level
      FROM users u, maintenance_tasks mt
      JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      WHERE u.id = $1 AND mt.id = $2
    `;
    const userResult = await pool.query(userQuery, [user_id, id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Benutzer oder Aufgabe nicht gefunden'
      });
    }

    // Skill-Level Mapping
    const skillLevelMap = { 'helper': 1, 'operator': 2, 'technician': 3, 'specialist': 3 };
    const userSkill = userResult.rows[0].maintenance_skill_level || 1;
    const requiredSkill = skillLevelMap[userResult.rows[0].required_skill_level] || 1;

    if (userSkill < requiredSkill) {
      return res.status(400).json({
        success: false,
        error: 'Benutzer hat nicht das erforderliche Skill-Level für diese Aufgabe',
        details: {
          user_skill: userSkill,
          required_skill: requiredSkill
        }
      });
    }

    const query = `
      UPDATE maintenance_tasks SET
        assigned_to = $1,
        assigned_at = CURRENT_TIMESTAMP,
        status = 'assigned',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [user_id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Wartungsaufgabe nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Aufgabe zugewiesen'
    });
  } catch (error) {
    console.error('Fehler beim Zuweisen der Aufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Zuweisen der Aufgabe',
      message: error.message
    });
  }
};

/**
 * Start working on task
 * PUT /api/maintenance/tasks/:id/start
 */
exports.startTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Hole Task mit Plan-Infos und User Skill-Level
    const checkQuery = `
      SELECT 
        mt.*,
        mp.required_skill_level,
        mp.title AS plan_title,
        u.skill_level AS user_skill_level
      FROM maintenance_tasks mt
      JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      CROSS JOIN users u
      WHERE mt.id = $1 AND u.id = $2
    `;
    const checkResult = await pool.query(checkQuery, [id, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden'
      });
    }

    const task = checkResult.rows[0];

    // Skill-Level prüfen
    const skillHierarchy = {
      'helper': 1,
      'operator': 2,
      'technician': 3,
      'specialist': 4
    };
    const requiredLevel = skillHierarchy[task.required_skill_level] || 2;
    const userLevel = skillHierarchy[task.user_skill_level] || 1;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: `Diese Aufgabe erfordert mindestens Skill-Level "${task.required_skill_level}". Ihr Level: "${task.user_skill_level}"`,
        required_skill_level: task.required_skill_level,
        user_skill_level: task.user_skill_level
      });
    }

    // Prüfen ob Task schon von jemand anderem gestartet wurde
    if (task.status === 'in_progress' && task.assigned_to && task.assigned_to !== userId) {
      return res.status(409).json({
        success: false,
        error: 'Diese Aufgabe wird bereits von einem anderen Mitarbeiter bearbeitet'
      });
    }

    const query = `
      UPDATE maintenance_tasks SET
        status = 'in_progress',
        started_at = CURRENT_TIMESTAMP,
        assigned_to = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status IN ('pending', 'assigned')
      RETURNING *
    `;

    const result = await pool.query(query, [userId, id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aufgabe kann nicht gestartet werden (falscher Status)'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Aufgabe gestartet'
    });
  } catch (error) {
    console.error('Fehler beim Starten der Aufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Starten der Aufgabe',
      message: error.message
    });
  }
};

/**
 * Complete a checklist item
 * PUT /api/maintenance/tasks/:id/checklist/:itemId
 */
exports.completeChecklistItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user.id;
    const {
      completed = true,
      answer,
      measurement_value,
      photo_path,
      notes
    } = req.body;

    // Prüfen ob Checklist-Item zum Task gehört
    const checkQuery = `
      SELECT mci.*, mt.id AS task_id, mt.status AS task_status
      FROM maintenance_checklist_items mci
      JOIN maintenance_tasks mt ON mt.maintenance_plan_id = mci.maintenance_plan_id
      WHERE mci.id = $1 AND mt.id = $2
    `;
    const checkResult = await pool.query(checkQuery, [itemId, id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Checklist-Item oder Task nicht gefunden'
      });
    }

    const item = checkResult.rows[0];

    // Ja/Nein Antwort validieren
    if (item.decision_type === 'yes_no' && item.expected_answer !== null && answer !== undefined) {
      const isCorrect = answer === item.expected_answer;
      
      if (!isCorrect) {
        // Falsche Antwort - je nach on_failure_action handeln
        if (item.on_failure_action === 'stop') {
          return res.status(400).json({
            success: false,
            error: `Falsche Antwort (${answer ? 'Ja' : 'Nein'}) - Erwartet: ${item.expected_answer ? 'Ja' : 'Nein'}. Aufgabe gestoppt.`,
            action_required: 'stop',
            details: { answer, expected: item.expected_answer }
          });
        }
        if (item.on_failure_action === 'escalate') {
          // Item trotzdem speichern, aber Eskalation triggern
          // Speichere erst, dann gib Eskalations-Info zurück
          await pool.query(`
            INSERT INTO maintenance_checklist_completions (
              maintenance_task_id, checklist_item_id, completed, 
              notes, completed_by, completed_at
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (maintenance_task_id, checklist_item_id) 
            DO UPDATE SET completed = $3, notes = COALESCE($4, maintenance_checklist_completions.notes),
              completed_by = $5, completed_at = CURRENT_TIMESTAMP
          `, [id, itemId, true, notes || `Antwort: ${answer ? 'Ja' : 'Nein'} (Erwartet: ${item.expected_answer ? 'Ja' : 'Nein'})`, userId]);
          
          return res.status(400).json({
            success: false,
            error: `Falsche Antwort (${answer ? 'Ja' : 'Nein'}) - Erwartet: ${item.expected_answer ? 'Ja' : 'Nein'}. Eskalation erforderlich.`,
            action_required: 'escalate',
            details: { answer, expected: item.expected_answer, item_title: item.title }
          });
        }
      }
    }

    // Messwert validieren wenn erforderlich
    if (item.requires_measurement && measurement_value !== undefined) {
      if (item.min_value !== null && measurement_value < item.min_value) {
        // Wert außerhalb Toleranz - je nach on_failure_action handeln
        if (item.on_failure_action === 'stop') {
          return res.status(400).json({
            success: false,
            error: 'Messwert unter Minimum - Aufgabe gestoppt',
            action_required: 'stop',
            details: { value: measurement_value, min: item.min_value }
          });
        }
        if (item.on_failure_action === 'escalate') {
          await pool.query(`
            INSERT INTO maintenance_checklist_completions (
              maintenance_task_id, checklist_item_id, completed, 
              measurement_value, notes, completed_by, completed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (maintenance_task_id, checklist_item_id) 
            DO UPDATE SET completed = $3, measurement_value = $4, notes = COALESCE($5, maintenance_checklist_completions.notes),
              completed_by = $6, completed_at = CURRENT_TIMESTAMP
          `, [id, itemId, true, measurement_value, notes || `Messwert ${measurement_value} unter Minimum ${item.min_value}`, userId]);
          
          return res.status(400).json({
            success: false,
            error: `Messwert ${measurement_value} unter Minimum ${item.min_value}. Eskalation erforderlich.`,
            action_required: 'escalate',
            details: { value: measurement_value, min: item.min_value, item_title: item.title }
          });
        }
      }
      if (item.max_value !== null && measurement_value > item.max_value) {
        if (item.on_failure_action === 'stop') {
          return res.status(400).json({
            success: false,
            error: 'Messwert über Maximum - Aufgabe gestoppt',
            action_required: 'stop',
            details: { value: measurement_value, max: item.max_value }
          });
        }
        if (item.on_failure_action === 'escalate') {
          await pool.query(`
            INSERT INTO maintenance_checklist_completions (
              maintenance_task_id, checklist_item_id, completed, 
              measurement_value, notes, completed_by, completed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT (maintenance_task_id, checklist_item_id) 
            DO UPDATE SET completed = $3, measurement_value = $4, notes = COALESCE($5, maintenance_checklist_completions.notes),
              completed_by = $6, completed_at = CURRENT_TIMESTAMP
          `, [id, itemId, true, measurement_value, notes || `Messwert ${measurement_value} über Maximum ${item.max_value}`, userId]);
          
          return res.status(400).json({
            success: false,
            error: `Messwert ${measurement_value} über Maximum ${item.max_value}. Eskalation erforderlich.`,
            action_required: 'escalate',
            details: { value: measurement_value, max: item.max_value, item_title: item.title }
          });
        }
      }
    }

    // Upsert completion
    const upsertQuery = `
      INSERT INTO maintenance_checklist_completions (
        maintenance_task_id, checklist_item_id, completed, 
        measurement_value, photo_path, notes, completed_by, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (maintenance_task_id, checklist_item_id) 
      DO UPDATE SET
        completed = $3,
        measurement_value = COALESCE($4, maintenance_checklist_completions.measurement_value),
        photo_path = COALESCE($5, maintenance_checklist_completions.photo_path),
        notes = COALESCE($6, maintenance_checklist_completions.notes),
        completed_by = $7,
        completed_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    // Erst Unique Constraint erstellen falls nicht vorhanden
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS maintenance_checklist_completions_unique 
      ON maintenance_checklist_completions (maintenance_task_id, checklist_item_id)
    `).catch(() => {}); // Ignoriere Fehler wenn Index existiert

    const result = await pool.query(upsertQuery, [
      id,
      itemId,
      completed,
      measurement_value || null,
      photo_path || null,
      notes || null,
      userId
    ]);

    // Prüfen ob alle Items erledigt sind
    const progressQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE mcc.completed = true) AS completed
      FROM maintenance_checklist_items mci
      LEFT JOIN maintenance_checklist_completions mcc 
        ON mci.id = mcc.checklist_item_id AND mcc.maintenance_task_id = $1
      WHERE mci.maintenance_plan_id = (SELECT maintenance_plan_id FROM maintenance_tasks WHERE id = $1)
    `;
    const progressResult = await pool.query(progressQuery, [id]);
    const progress = progressResult.rows[0];

    res.json({
      success: true,
      data: result.rows[0],
      progress: {
        total: parseInt(progress.total),
        completed: parseInt(progress.completed),
        percentage: Math.round((parseInt(progress.completed) / parseInt(progress.total)) * 100)
      },
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
 * Upload photo for checklist item
 * POST /api/maintenance/tasks/:taskId/checklist/:itemId/photo
 */
exports.uploadChecklistPhoto = async (req, res) => {
  try {
    const { taskId, itemId } = req.params;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Keine Datei hochgeladen'
      });
    }

    // Prüfen ob Task und Item existieren
    const checkQuery = `
      SELECT mci.*, mt.id AS task_id, mt.status AS task_status
      FROM maintenance_checklist_items mci
      JOIN maintenance_tasks mt ON mt.maintenance_plan_id = mci.maintenance_plan_id
      WHERE mci.id = $1 AND mt.id = $2
    `;
    const checkResult = await pool.query(checkQuery, [itemId, taskId]);

    if (checkResult.rows.length === 0) {
      // Datei löschen wenn Task/Item nicht gefunden
      const fs = require('fs');
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'Checklist-Item oder Task nicht gefunden'
      });
    }

    // Relativer Pfad für die Datenbank
    const photoPath = `/uploads/maintenance/${req.file.filename}`;

    // Upsert in maintenance_checklist_completions
    const upsertQuery = `
      INSERT INTO maintenance_checklist_completions (
        maintenance_task_id, checklist_item_id, photo_path, completed_by, completed_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (maintenance_task_id, checklist_item_id) 
      DO UPDATE SET
        photo_path = $3,
        completed_by = $4,
        completed_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(upsertQuery, [taskId, itemId, photoPath, userId]);

    res.json({
      success: true,
      data: {
        photo_path: photoPath,
        filename: req.file.filename,
        size: req.file.size,
        completion: result.rows[0]
      },
      message: 'Foto erfolgreich hochgeladen'
    });
  } catch (error) {
    console.error('Fehler beim Hochladen des Fotos:', error);
    // Versuche Datei zu löschen bei Fehler
    if (req.file) {
      const fs = require('fs');
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen des Fotos',
      message: error.message
    });
  }
};

/**
 * Complete task
 * PUT /api/maintenance/tasks/:id/complete
 */
exports.completeTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      notes,
      issues_found,
      parts_used,
      actual_duration_minutes
    } = req.body;

    await client.query('BEGIN');

    // Prüfen ob alle kritischen Checklist-Items erledigt sind
    const criticalCheckQuery = `
      SELECT mci.id, mci.title, mci.is_critical, mcc.completed
      FROM maintenance_checklist_items mci
      LEFT JOIN maintenance_checklist_completions mcc 
        ON mci.id = mcc.checklist_item_id AND mcc.maintenance_task_id = $1
      WHERE mci.maintenance_plan_id = (SELECT maintenance_plan_id FROM maintenance_tasks WHERE id = $1)
        AND mci.is_critical = true
        AND (mcc.completed IS NULL OR mcc.completed = false)
    `;
    const criticalResult = await client.query(criticalCheckQuery, [id]);

    if (criticalResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Nicht alle kritischen Checklist-Items sind erledigt',
        missing_items: criticalResult.rows.map(r => r.title)
      });
    }

    // Task abschließen
    const updateQuery = `
      UPDATE maintenance_tasks SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        completed_by = $1,
        notes = COALESCE($2, notes),
        issues_found = $3,
        parts_used = $4,
        actual_duration_minutes = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND status IN ('in_progress', 'assigned', 'pending')
      RETURNING *
    `;

    const taskResult = await client.query(updateQuery, [
      userId,
      notes,
      issues_found || null,
      parts_used || null,
      actual_duration_minutes || null,
      id
    ]);

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Aufgabe kann nicht abgeschlossen werden'
      });
    }

    const task = taskResult.rows[0];

    // Wartungsplan aktualisieren (nächste Fälligkeit berechnen)
    const planQuery = `
      SELECT mp.*, m.current_operating_hours
      FROM maintenance_plans mp
      JOIN machines m ON mp.machine_id = m.id
      WHERE mp.id = $1
    `;
    const planResult = await client.query(planQuery, [task.maintenance_plan_id]);
    const plan = planResult.rows[0];

    let nextDueAt = null;
    let nextDueHours = null;

    // Zeitbasiertes Intervall
    if (plan.interval_type && plan.interval_value) {
      const now = new Date();
      switch (plan.interval_type) {
        case 'hours':
          nextDueAt = new Date(now.getTime() + plan.interval_value * 60 * 60 * 1000);
          break;
        case 'days':
          nextDueAt = new Date(now.getTime() + plan.interval_value * 24 * 60 * 60 * 1000);
          break;
        case 'weeks':
          nextDueAt = new Date(now.getTime() + plan.interval_value * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'months':
          nextDueAt = new Date(now);
          nextDueAt.setMonth(nextDueAt.getMonth() + plan.interval_value);
          break;
        case 'years':
          nextDueAt = new Date(now);
          nextDueAt.setFullYear(nextDueAt.getFullYear() + plan.interval_value);
          break;
      }
    }

    // Betriebsstunden-basiertes Intervall
    if (plan.interval_hours) {
      const intervalHours = parseFloat(plan.interval_hours);
      const currentHours = parseFloat(plan.current_operating_hours) || 0;
      nextDueHours = currentHours + intervalHours;
    }

    // Plan aktualisieren
    // Für betriebsstundenbasierte Pläne: next_due_at auf NULL setzen
    // Für zeitbasierte Pläne: next_due_hours auf NULL setzen
    const updateNextDueAt = plan.interval_hours ? null : nextDueAt;
    const updateNextDueHours = plan.interval_hours ? nextDueHours : null;
    
    await client.query(`
      UPDATE maintenance_plans SET
        last_completed_at = CURRENT_TIMESTAMP,
        last_completed_hours = $1,
        next_due_at = $2,
        next_due_hours = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [
      plan.current_operating_hours,
      updateNextDueAt,
      updateNextDueHours,
      task.maintenance_plan_id
    ]);

    // Maschine last_maintenance aktualisieren
    await client.query(`
      UPDATE machines SET
        last_maintenance = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [task.machine_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      data: taskResult.rows[0],
      next_maintenance: {
        next_due_at: nextDueAt,
        next_due_hours: nextDueHours
      },
      message: 'Wartungsaufgabe abgeschlossen'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Abschließen der Aufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abschließen der Aufgabe',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Cancel task
 * PUT /api/maintenance/tasks/:id/cancel
 */
exports.cancelTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const query = `
      UPDATE maintenance_tasks SET
        status = 'cancelled',
        notes = COALESCE(notes || E'\\n', '') || 'Abbruch: ' || $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND status NOT IN ('completed', 'cancelled')
      RETURNING *
    `;

    const result = await pool.query(query, [reason || 'Keine Begründung', id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aufgabe kann nicht abgebrochen werden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Aufgabe abgebrochen'
    });
  } catch (error) {
    console.error('Fehler beim Abbrechen der Aufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abbrechen der Aufgabe',
      message: error.message
    });
  }
};

/**
 * Get today's tasks for all users (Meister-Übersicht)
 * GET /api/maintenance/tasks/today
 */
exports.getTodaysTasks = async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id AS user_id,
        u.username,
        u.first_name,
        u.last_name,
        u.maintenance_skill_level,
        COUNT(*) FILTER (WHERE mt.status = 'completed' AND DATE(mt.completed_at) = CURRENT_DATE) AS completed_today,
        COUNT(*) FILTER (WHERE mt.status IN ('pending', 'assigned', 'in_progress')) AS open_tasks,
        COUNT(*) FILTER (WHERE mt.status = 'escalated') AS escalated_tasks,
        json_agg(
          json_build_object(
            'task_id', mt.id,
            'plan_title', mp.title,
            'machine_name', m.name,
            'status', mt.status,
            'priority', mp.priority,
            'is_shift_critical', mp.is_shift_critical,
            'due_date', mt.due_date
          ) ORDER BY mt.due_date
        ) FILTER (WHERE mt.id IS NOT NULL) AS tasks
      FROM users u
      LEFT JOIN maintenance_tasks mt ON mt.assigned_to = u.id 
        AND DATE(mt.due_date) = CURRENT_DATE
      LEFT JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      LEFT JOIN machines m ON mt.machine_id = m.id
      WHERE u.is_active = true 
        AND u.maintenance_skill_level IS NOT NULL
      GROUP BY u.id
      ORDER BY u.first_name, u.last_name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      date: new Date().toISOString().split('T')[0],
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Tagesübersicht:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Tagesübersicht',
      message: error.message
    });
  }
};

/**
 * Generate tasks from due plans (wird z.B. täglich aufgerufen)
 * POST /api/maintenance/tasks/generate
 */
exports.generateTasksFromDuePlans = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Alle fälligen Pläne ohne offene Tasks finden
    // WICHTIG: Prüfe auch ob next_due_at NACH last_completed_at liegt
    // (sonst werden Tasks für bereits erledigte Fälligkeiten neu erstellt)
    const duePlansQuery = `
      SELECT mp.*
      FROM maintenance_plans mp
      WHERE mp.is_active = true
        AND (
          -- Zeitbasiert: fällig wenn next_due_at in der Vergangenheit oder morgen
          -- UND entweder noch nie erledigt ODER next_due_at liegt nach letztem Abschluss
          (mp.next_due_at IS NOT NULL 
           AND mp.next_due_at <= NOW() + INTERVAL '1 day'
           AND (mp.last_completed_at IS NULL OR mp.next_due_at > mp.last_completed_at))
          OR 
          -- Betriebsstundenbasiert: fällig wenn Stunden erreicht
          (mp.interval_hours IS NOT NULL 
           AND mp.next_due_hours IS NOT NULL
           AND EXISTS (
            SELECT 1 FROM machines m 
            WHERE m.id = mp.machine_id 
            AND m.current_operating_hours >= mp.next_due_hours - 50
          ))
        )
        AND NOT EXISTS (
          SELECT 1 FROM maintenance_tasks mt
          WHERE mt.maintenance_plan_id = mp.id
          AND mt.status IN ('pending', 'assigned', 'in_progress')
        )
    `;

    const duePlansResult = await client.query(duePlansQuery);
    const createdTasks = [];

    for (const plan of duePlansResult.rows) {
      const insertQuery = `
        INSERT INTO maintenance_tasks (
          maintenance_plan_id, machine_id, status, due_date
        ) VALUES ($1, $2, 'pending', $3)
        RETURNING *
      `;

      const taskResult = await client.query(insertQuery, [
        plan.id,
        plan.machine_id,
        plan.next_due_at || new Date()
      ]);

      createdTasks.push(taskResult.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      created_count: createdTasks.length,
      data: createdTasks,
      message: `${createdTasks.length} neue Wartungsaufgaben erstellt`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Generieren der Aufgaben:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Generieren der Aufgaben',
      message: error.message
    });
  } finally {
    client.release();
  }
};

// ============================================================
// STANDALONE TASKS - Allgemeine Aufgaben ohne Wartungsplan
// ============================================================

/**
 * Create a standalone task (not linked to a maintenance plan)
 * POST /api/maintenance/tasks/standalone
 */
exports.createStandaloneTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      location,
      priority = 'normal',
      due_date,
      assigned_to,
      estimated_duration_minutes,
      machine_id,
      recurrence_pattern = 'none'
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Titel ist erforderlich'
      });
    }

    const insertQuery = `
      INSERT INTO maintenance_tasks (
        task_type, title, description, location, priority,
        due_date, assigned_to, estimated_duration_minutes,
        machine_id, recurrence_pattern, created_by, status, created_at
      ) VALUES (
        'standalone', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      title,
      description || null,
      location || null,
      priority,
      due_date || null,
      assigned_to || null,
      estimated_duration_minutes || null,
      machine_id || null,
      recurrence_pattern,
      userId
    ]);

    // Wenn zugewiesen, Status auf 'assigned' setzen
    if (assigned_to) {
      await pool.query(
        `UPDATE maintenance_tasks SET status = 'assigned', assigned_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [result.rows[0].id]
      );
      result.rows[0].status = 'assigned';
    }

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Aufgabe erstellt'
    });
  } catch (error) {
    console.error('Fehler beim Erstellen der Aufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Aufgabe',
      message: error.message
    });
  }
};

/**
 * Update a standalone task
 * PUT /api/maintenance/tasks/standalone/:id
 */
exports.updateStandaloneTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      priority,
      due_date,
      assigned_to,
      estimated_duration_minutes,
      machine_id,
      recurrence_pattern,
      status
    } = req.body;

    // Prüfen ob Task existiert und standalone ist
    const checkResult = await pool.query(
      'SELECT * FROM maintenance_tasks WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden'
      });
    }

    const task = checkResult.rows[0];

    // Nur standalone Tasks können so bearbeitet werden
    if (task.task_type !== 'standalone') {
      return res.status(400).json({
        success: false,
        error: 'Nur eigenständige Aufgaben können bearbeitet werden'
      });
    }

    const updateQuery = `
      UPDATE maintenance_tasks SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        location = COALESCE($3, location),
        priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date),
        assigned_to = $6,
        estimated_duration_minutes = COALESCE($7, estimated_duration_minutes),
        machine_id = $8,
        recurrence_pattern = COALESCE($9, recurrence_pattern),
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      title,
      description,
      location,
      priority,
      due_date,
      assigned_to,
      estimated_duration_minutes,
      machine_id,
      recurrence_pattern,
      status,
      id
    ]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Aufgabe aktualisiert'
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Aufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Aufgabe',
      message: error.message
    });
  }
};

/**
 * Complete a standalone task
 * PUT /api/maintenance/tasks/standalone/:id/complete
 */
exports.completeStandaloneTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { notes } = req.body;

    const checkResult = await pool.query(
      'SELECT * FROM maintenance_tasks WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden'
      });
    }

    const updateQuery = `
      UPDATE maintenance_tasks SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        completed_by = $1,
        notes = COALESCE($2, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [userId, notes, id]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Aufgabe abgeschlossen'
    });
  } catch (error) {
    console.error('Fehler beim Abschließen der Aufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abschließen der Aufgabe',
      message: error.message
    });
  }
};

/**
 * Delete a standalone task
 * DELETE /api/maintenance/tasks/standalone/:id
 */
exports.deleteStandaloneTask = async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query(
      'SELECT * FROM maintenance_tasks WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden'
      });
    }

    if (checkResult.rows[0].task_type !== 'standalone') {
      return res.status(400).json({
        success: false,
        error: 'Nur eigenständige Aufgaben können gelöscht werden'
      });
    }

    await pool.query('DELETE FROM maintenance_tasks WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Aufgabe gelöscht'
    });
  } catch (error) {
    console.error('Fehler beim Löschen der Aufgabe:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Aufgabe',
      message: error.message
    });
  }
};

/**
 * Get task details with checklist results
 * GET /api/maintenance/tasks/:id/details
 */
exports.getTaskDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Task mit Plan und Maschinen-Info
    const taskQuery = `
      SELECT 
        mt.*,
        mp.title AS plan_title,
        mp.description AS plan_description,
        mp.estimated_duration_minutes,
        m.name AS machine_name,
        m.location AS machine_location,
        m.machine_type,
        COALESCE(NULLIF(CONCAT(u_completed.first_name, ' ', u_completed.last_name), ' '), u_completed.username) AS completed_by_name,
        u_completed.username AS completed_by_username,
        COALESCE(NULLIF(CONCAT(u_assigned.first_name, ' ', u_assigned.last_name), ' '), u_assigned.username) AS assigned_to_name,
        u_assigned.username AS assigned_to_username
      FROM maintenance_tasks mt
      LEFT JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      LEFT JOIN machines m ON mt.machine_id = m.id
      LEFT JOIN users u_completed ON mt.completed_by = u_completed.id
      LEFT JOIN users u_assigned ON mt.assigned_to = u_assigned.id
      WHERE mt.id = $1
    `;
    const taskResult = await pool.query(taskQuery, [id]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden'
      });
    }

    const task = taskResult.rows[0];

    // Checklist-Items mit Completion-Daten
    const checklistQuery = `
      SELECT 
        mci.id,
        mci.title,
        mci.description,
        mci.requires_photo,
        mci.requires_measurement,
        mci.measurement_unit,
        mci.min_value,
        mci.max_value,
        mci.is_critical,
        mci.sequence,
        mcc.completed,
        mcc.measurement_value,
        mcc.notes AS completion_notes,
        mcc.photo_path,
        mcc.completed_at,
        COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.username) AS completed_by_name
      FROM maintenance_checklist_items mci
      LEFT JOIN maintenance_checklist_completions mcc 
        ON mci.id = mcc.checklist_item_id AND mcc.maintenance_task_id = $1
      LEFT JOIN users u ON mcc.completed_by = u.id
      WHERE mci.maintenance_plan_id = $2
      ORDER BY mci.sequence, mci.id
    `;
    const checklistResult = await pool.query(checklistQuery, [id, task.maintenance_plan_id]);

    res.json({
      success: true,
      data: {
        ...task,
        checklist_results: checklistResult.rows
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Task-Details:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Task-Details',
      message: error.message
    });
  }
};

// ============================================================
// DASHBOARD STATS
// ============================================================

/**
 * Get dashboard statistics for maintenance widget
 * GET /api/maintenance/dashboard/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE mt.status IN ('pending', 'assigned', 'in_progress') 
          AND mt.due_date < CURRENT_DATE) AS overdue_count,
        COUNT(*) FILTER (WHERE mt.status IN ('pending', 'assigned', 'in_progress') 
          AND DATE(mt.due_date) = CURRENT_DATE) AS due_today_count,
        COUNT(*) FILTER (WHERE mt.status = 'in_progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE mt.status = 'completed' 
          AND DATE(mt.completed_at) = CURRENT_DATE) AS completed_today_count,
        COUNT(*) FILTER (WHERE mt.status IN ('pending', 'assigned', 'in_progress')) AS total_open_count
      FROM maintenance_tasks mt
    `;
    
    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        overdue_count: parseInt(stats.overdue_count) || 0,
        due_today_count: parseInt(stats.due_today_count) || 0,
        in_progress_count: parseInt(stats.in_progress_count) || 0,
        completed_today_count: parseInt(stats.completed_today_count) || 0,
        total_open_count: parseInt(stats.total_open_count) || 0
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Dashboard-Statistiken:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Dashboard-Statistiken',
      message: error.message
    });
  }
};

// ============================================================
// MACHINE MAINTENANCE STATS
// ============================================================

/**
 * Get maintenance statistics for a specific machine
 * GET /api/maintenance/machines/:id/stats
 */
exports.getMachineMaintenanceStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Maschinen-Daten
    const machineQuery = `
      SELECT id, name, location, machine_type, control_type, 
             current_operating_hours, is_active
      FROM machines
      WHERE id = $1
    `;
    const machineResult = await pool.query(machineQuery, [id]);

    if (machineResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Maschine nicht gefunden'
      });
    }

    const machine = machineResult.rows[0];

    // Statistiken
    const statsQuery = `
      SELECT 
        COUNT(*) AS total_plans,
        COUNT(*) FILTER (WHERE 
          (mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW())
          OR (mp.next_due_hours IS NOT NULL AND $2::numeric >= mp.next_due_hours)
        ) AS overdue_count,
        COUNT(*) FILTER (WHERE 
          mp.next_due_at IS NOT NULL 
          AND DATE(mp.next_due_at) = CURRENT_DATE 
          AND mp.next_due_at >= NOW()
        ) AS due_today_count,
        COUNT(*) FILTER (WHERE 
          mp.next_due_at IS NOT NULL 
          AND DATE(mp.next_due_at) > CURRENT_DATE 
          AND mp.next_due_at < NOW() + INTERVAL '7 days'
        ) AS due_week_count
      FROM maintenance_plans mp
      WHERE mp.machine_id = $1 AND mp.is_active = true
    `;
    const statsResult = await pool.query(statsQuery, [id, machine.current_operating_hours || 0]);

    // Abgeschlossene Tasks (letzte 30 Tage)
    const completedStatsQuery = `
      SELECT 
        COUNT(*) AS completed_30_days,
        COALESCE(SUM(mt.actual_duration_minutes), 0) AS total_duration_30_days
      FROM maintenance_tasks mt
      WHERE mt.machine_id = $1
        AND mt.status = 'completed'
        AND mt.completed_at >= NOW() - INTERVAL '30 days'
    `;
    const completedStatsResult = await pool.query(completedStatsQuery, [id]);

    // Letzte Wartungen (max 10)
    const recentTasksQuery = `
      SELECT 
        mt.id, mt.status, mt.completed_at, mt.actual_duration_minutes,
        mp.title AS plan_title,
        COALESCE(NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' '), u.username) AS completed_by_name
      FROM maintenance_tasks mt
      LEFT JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      LEFT JOIN users u ON mt.completed_by = u.id
      WHERE mt.machine_id = $1
      ORDER BY COALESCE(mt.completed_at, mt.created_at) DESC
      LIMIT 10
    `;
    const recentTasksResult = await pool.query(recentTasksQuery, [id]);

    // Anstehende Wartungspläne
    const upcomingPlansQuery = `
      SELECT 
        mp.id, mp.title, mp.next_due_at, mp.next_due_hours,
        mp.interval_type, mp.interval_value, mp.interval_hours,
        mp.is_shift_critical
      FROM maintenance_plans mp
      WHERE mp.machine_id = $1 
        AND mp.is_active = true
      ORDER BY 
        CASE 
          WHEN mp.next_due_at IS NOT NULL THEN mp.next_due_at 
          ELSE NOW() + INTERVAL '100 years' 
        END ASC
      LIMIT 10
    `;
    const upcomingPlansResult = await pool.query(upcomingPlansQuery, [id]);

    const planStats = statsResult.rows[0];
    const completedStats = completedStatsResult.rows[0];

    res.json({
      success: true,
      data: {
        machine,
        stats: {
          total_plans: parseInt(planStats.total_plans) || 0,
          overdue_count: parseInt(planStats.overdue_count) || 0,
          due_today_count: parseInt(planStats.due_today_count) || 0,
          due_week_count: parseInt(planStats.due_week_count) || 0,
          completed_30_days: parseInt(completedStats.completed_30_days) || 0,
          total_duration_30_days: parseInt(completedStats.total_duration_30_days) || 0
        },
        recent_tasks: recentTasksResult.rows,
        upcoming_plans: upcomingPlansResult.rows
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Maschinen-Wartungsstatistik:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Maschinen-Wartungsstatistik',
      message: error.message
    });
  }
};
