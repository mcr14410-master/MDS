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
// MAINTENANCE ESCALATIONS - Problem-Eskalation
// ============================================================

/**
 * Get all escalations with filtering
 * GET /api/maintenance/escalations?status=open&escalated_to=5
 */
exports.getAllEscalations = async (req, res) => {
  try {
    const { status, escalated_to, escalation_level, machine_id } = req.query;

    let query = `
      SELECT 
        me.*,
        mt.id AS task_id,
        mp.title AS plan_title,
        m.id AS machine_id,
        m.name AS machine_name,
        m.location AS machine_location,
        mci.title AS checklist_item_title,
        u_from.username AS escalated_from_username,
        u_from.first_name AS escalated_from_first_name,
        u_to.username AS escalated_to_username,
        u_to.first_name AS escalated_to_first_name,
        u_resolved.username AS resolved_by_username
      FROM maintenance_escalations me
      JOIN maintenance_tasks mt ON me.maintenance_task_id = mt.id
      JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      JOIN machines m ON mt.machine_id = m.id
      LEFT JOIN maintenance_checklist_items mci ON me.checklist_item_id = mci.id
      LEFT JOIN users u_from ON me.escalated_from_user_id = u_from.id
      LEFT JOIN users u_to ON me.escalated_to_user_id = u_to.id
      LEFT JOIN users u_resolved ON me.resolved_by = u_resolved.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND me.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (escalated_to) {
      query += ` AND me.escalated_to_user_id = $${paramCount}`;
      params.push(escalated_to);
      paramCount++;
    }

    if (escalation_level) {
      query += ` AND me.escalation_level = $${paramCount}`;
      params.push(escalation_level);
      paramCount++;
    }

    if (machine_id) {
      query += ` AND m.id = $${paramCount}`;
      params.push(machine_id);
      paramCount++;
    }

    query += ` ORDER BY 
      CASE me.status 
        WHEN 'open' THEN 0 
        WHEN 'acknowledged' THEN 1 
        ELSE 2 
      END,
      me.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Eskalationen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Eskalationen',
      message: error.message
    });
  }
};

/**
 * Get my escalations (as recipient)
 * GET /api/maintenance/escalations/my
 */
exports.getMyEscalations = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        me.*,
        mt.id AS task_id,
        mp.title AS plan_title,
        mp.priority,
        m.name AS machine_name,
        m.location AS machine_location,
        mci.title AS checklist_item_title,
        u_from.username AS escalated_from_username,
        u_from.first_name AS escalated_from_first_name
      FROM maintenance_escalations me
      JOIN maintenance_tasks mt ON me.maintenance_task_id = mt.id
      JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      JOIN machines m ON mt.machine_id = m.id
      LEFT JOIN maintenance_checklist_items mci ON me.checklist_item_id = mci.id
      LEFT JOIN users u_from ON me.escalated_from_user_id = u_from.id
      WHERE me.escalated_to_user_id = $1
        AND me.status IN ('open', 'acknowledged')
      ORDER BY me.created_at DESC
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden meiner Eskalationen:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden meiner Eskalationen',
      message: error.message
    });
  }
};

/**
 * Get single escalation by ID
 * GET /api/maintenance/escalations/:id
 */
exports.getEscalationById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        me.*,
        mt.id AS task_id,
        mt.status AS task_status,
        mp.id AS plan_id,
        mp.title AS plan_title,
        mp.instructions,
        mp.safety_notes,
        m.id AS machine_id,
        m.name AS machine_name,
        m.location AS machine_location,
        mci.id AS checklist_item_id,
        mci.title AS checklist_item_title,
        mci.description AS checklist_item_description,
        u_from.username AS escalated_from_username,
        u_from.first_name AS escalated_from_first_name,
        u_from.last_name AS escalated_from_last_name,
        u_to.username AS escalated_to_username,
        u_to.first_name AS escalated_to_first_name,
        u_resolved.username AS resolved_by_username
      FROM maintenance_escalations me
      JOIN maintenance_tasks mt ON me.maintenance_task_id = mt.id
      JOIN maintenance_plans mp ON mt.maintenance_plan_id = mp.id
      JOIN machines m ON mt.machine_id = m.id
      LEFT JOIN maintenance_checklist_items mci ON me.checklist_item_id = mci.id
      LEFT JOIN users u_from ON me.escalated_from_user_id = u_from.id
      LEFT JOIN users u_to ON me.escalated_to_user_id = u_to.id
      LEFT JOIN users u_resolved ON me.resolved_by = u_resolved.id
      WHERE me.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Eskalation nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Fehler beim Laden der Eskalation:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Eskalation',
      message: error.message
    });
  }
};

/**
 * Create escalation (Problem melden)
 * POST /api/maintenance/escalations
 */
exports.createEscalation = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const {
      maintenance_task_id,
      checklist_item_id,
      reason,
      photo_path,
      escalation_level = 1
    } = req.body;

    if (!maintenance_task_id || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Task-ID und Begründung sind erforderlich'
      });
    }

    await client.query('BEGIN');

    // Passenden Empfänger finden basierend auf Skill-Level
    // Skill-Hierarchie: helper=1, operator=2, technician=3, specialist=4
    // Level 1 → Bediener/Techniker, Level 2 → Techniker/Spezialist, Level 3 → Spezialist
    const skillMapping = {
      1: ['operator', 'technician', 'specialist'],  // Level 1 → mindestens Bediener
      2: ['technician', 'specialist'],               // Level 2 → mindestens Techniker
      3: ['specialist']                              // Level 3 → Spezialist
    };
    const targetSkills = skillMapping[escalation_level] || skillMapping[1];
    
    const recipientQuery = `
      SELECT u.id, u.username, u.skill_level
      FROM users u
      WHERE u.is_active = true 
        AND u.is_available = true
        AND u.skill_level = ANY($1)
      ORDER BY 
        CASE u.skill_level 
          WHEN 'operator' THEN 1
          WHEN 'technician' THEN 2
          WHEN 'specialist' THEN 3
          ELSE 4
        END ASC
      LIMIT 1
    `;
    const recipientResult = await client.query(recipientQuery, [targetSkills]);
    
    const escalatedToUserId = recipientResult.rows.length > 0 
      ? recipientResult.rows[0].id 
      : null;

    // Eskalation erstellen
    const insertQuery = `
      INSERT INTO maintenance_escalations (
        maintenance_task_id, checklist_item_id, escalated_from_user_id,
        escalated_to_user_id, escalation_level, reason, photo_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
      RETURNING *
    `;

    const escalationResult = await client.query(insertQuery, [
      maintenance_task_id,
      checklist_item_id || null,
      userId,
      escalatedToUserId,
      escalation_level,
      reason,
      photo_path || null
    ]);

    // Task-Status auf 'escalated' setzen
    await client.query(`
      UPDATE maintenance_tasks SET
        status = 'escalated',
        escalated_to = $1,
        escalated_at = CURRENT_TIMESTAMP,
        escalation_reason = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [escalatedToUserId, reason, maintenance_task_id]);

    await client.query('COMMIT');

    // Vollständige Eskalation laden für Response
    const fullEscalation = await pool.query(`
      SELECT 
        me.*,
        u_to.username AS escalated_to_username,
        u_to.first_name AS escalated_to_first_name
      FROM maintenance_escalations me
      LEFT JOIN users u_to ON me.escalated_to_user_id = u_to.id
      WHERE me.id = $1
    `, [escalationResult.rows[0].id]);

    res.status(201).json({
      success: true,
      data: fullEscalation.rows[0],
      message: escalatedToUserId 
        ? 'Problem eskaliert' 
        : 'Problem gemeldet (kein Empfänger gefunden)'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Erstellen der Eskalation:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Eskalation',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Acknowledge escalation (Zur Kenntnis genommen)
 * PUT /api/maintenance/escalations/:id/acknowledge
 */
exports.acknowledgeEscalation = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE maintenance_escalations SET
        status = 'acknowledged'
      WHERE id = $1 AND status = 'open'
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Eskalation nicht gefunden oder bereits bearbeitet'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Eskalation zur Kenntnis genommen'
    });
  } catch (error) {
    console.error('Fehler beim Bestätigen der Eskalation:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Bestätigen der Eskalation',
      message: error.message
    });
  }
};

/**
 * Resolve escalation (Problem gelöst)
 * PUT /api/maintenance/escalations/:id/resolve
 */
exports.resolveEscalation = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: 'Lösungsbeschreibung ist erforderlich'
      });
    }

    await client.query('BEGIN');

    // Eskalation lösen
    const updateQuery = `
      UPDATE maintenance_escalations SET
        status = 'resolved',
        resolution = $1,
        resolved_by = $2,
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status IN ('open', 'acknowledged')
      RETURNING *
    `;

    const result = await client.query(updateQuery, [resolution, userId, id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Eskalation nicht gefunden oder bereits gelöst'
      });
    }

    const escalation = result.rows[0];

    // Prüfen ob alle Eskalationen für den Task gelöst sind
    const openEscalationsQuery = `
      SELECT COUNT(*) AS count FROM maintenance_escalations
      WHERE maintenance_task_id = $1 AND status IN ('open', 'acknowledged')
    `;
    const openResult = await client.query(openEscalationsQuery, [escalation.maintenance_task_id]);

    // Wenn keine offenen Eskalationen mehr, Task-Status zurücksetzen
    if (parseInt(openResult.rows[0].count) === 0) {
      await client.query(`
        UPDATE maintenance_tasks SET
          status = 'in_progress',
          escalated_to = NULL,
          escalation_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'escalated'
      `, [escalation.maintenance_task_id]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Eskalation gelöst'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Lösen der Eskalation:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Lösen der Eskalation',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Close escalation (Abschließen ohne Lösung / Nicht mehr relevant)
 * PUT /api/maintenance/escalations/:id/close
 */
exports.closeEscalation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { resolution } = req.body;

    const query = `
      UPDATE maintenance_escalations SET
        status = 'closed',
        resolution = $1,
        resolved_by = $2,
        resolved_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND status IN ('open', 'acknowledged')
      RETURNING *
    `;

    const result = await pool.query(query, [
      resolution || 'Geschlossen ohne Lösung',
      userId,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Eskalation nicht gefunden oder bereits geschlossen'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Eskalation geschlossen'
    });
  } catch (error) {
    console.error('Fehler beim Schließen der Eskalation:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Schließen der Eskalation',
      message: error.message
    });
  }
};

/**
 * Re-escalate to higher level
 * PUT /api/maintenance/escalations/:id/re-escalate
 */
exports.reEscalate = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    // Aktuelle Eskalation laden
    const currentQuery = 'SELECT * FROM maintenance_escalations WHERE id = $1';
    const currentResult = await client.query(currentQuery, [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Eskalation nicht gefunden'
      });
    }

    const current = currentResult.rows[0];
    const newLevel = Math.min(current.escalation_level + 1, 3);

    if (newLevel === current.escalation_level) {
      return res.status(400).json({
        success: false,
        error: 'Höchste Eskalationsstufe bereits erreicht'
      });
    }

    await client.query('BEGIN');

    // Alte Eskalation schließen
    await client.query(`
      UPDATE maintenance_escalations SET
        status = 'closed',
        resolution = 'Weiter eskaliert zu Level ' || $1
      WHERE id = $2
    `, [newLevel, id]);

    // Neuen Empfänger finden
    const targetSkillLevel = newLevel + 1;
    const recipientQuery = `
      SELECT u.id 
      FROM users u
      WHERE u.is_active = true 
        AND u.maintenance_skill_level >= $1
      ORDER BY u.maintenance_skill_level ASC
      LIMIT 1
    `;
    const recipientResult = await client.query(recipientQuery, [Math.min(targetSkillLevel, 3)]);
    const escalatedToUserId = recipientResult.rows.length > 0 ? recipientResult.rows[0].id : null;

    // Neue Eskalation erstellen
    const insertQuery = `
      INSERT INTO maintenance_escalations (
        maintenance_task_id, checklist_item_id, escalated_from_user_id,
        escalated_to_user_id, escalation_level, reason, photo_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
      RETURNING *
    `;

    const newEscalation = await client.query(insertQuery, [
      current.maintenance_task_id,
      current.checklist_item_id,
      userId,
      escalatedToUserId,
      newLevel,
      reason || current.reason + ' (weiter eskaliert)',
      current.photo_path
    ]);

    // Task aktualisieren
    await client.query(`
      UPDATE maintenance_tasks SET
        escalated_to = $1,
        escalation_reason = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [escalatedToUserId, reason || current.reason, current.maintenance_task_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      data: newEscalation.rows[0],
      message: `Eskaliert zu Level ${newLevel}`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Weiter-Eskalieren:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Weiter-Eskalieren',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get escalation statistics
 * GET /api/maintenance/escalations/stats
 */
exports.getEscalationStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Übersicht nach Status
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) AS count
      FROM maintenance_escalations
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY status
    `;
    const statusResult = await pool.query(statusQuery);

    // Nach Eskalationslevel
    const levelQuery = `
      SELECT 
        escalation_level,
        COUNT(*) AS count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/3600)::numeric(10,1) AS avg_resolution_hours
      FROM maintenance_escalations
      WHERE created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY escalation_level
      ORDER BY escalation_level
    `;
    const levelResult = await pool.query(levelQuery);

    // Top Maschinen mit Eskalationen
    const machineQuery = `
      SELECT 
        m.id,
        m.name,
        COUNT(*) AS escalation_count
      FROM maintenance_escalations me
      JOIN maintenance_tasks mt ON me.maintenance_task_id = mt.id
      JOIN machines m ON mt.machine_id = m.id
      WHERE me.created_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY m.id, m.name
      ORDER BY escalation_count DESC
      LIMIT 5
    `;
    const machineResult = await pool.query(machineQuery);

    // Durchschnittliche Lösungszeit
    const avgTimeQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600)::numeric(10,1) AS avg_hours
      FROM maintenance_escalations
      WHERE resolved_at IS NOT NULL
        AND created_at >= NOW() - INTERVAL '${parseInt(days)} days'
    `;
    const avgTimeResult = await pool.query(avgTimeQuery);

    res.json({
      success: true,
      data: {
        period_days: parseInt(days),
        by_status: statusResult.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
        by_level: levelResult.rows,
        top_machines: machineResult.rows,
        avg_resolution_hours: parseFloat(avgTimeResult.rows[0].avg_hours) || 0
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Eskalations-Statistik:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Eskalations-Statistik',
      message: error.message
    });
  }
};
