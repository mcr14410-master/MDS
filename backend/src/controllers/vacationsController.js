/**
 * Vacations Controller
 * 
 * Manages absence entries with:
 * - Automatic day calculation (excluding weekends and holidays)
 * - Concurrent absence checks per role
 * - Partial day support (time entries)
 * - Approval workflow for requests
 */

const pool = require('../config/db');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user has a specific permission
 * @param {number} userId 
 * @param {string} permission 
 * @returns {Promise<boolean>}
 */
async function userHasPermission(userId, permission) {
  const result = await pool.query(`
    SELECT p.name
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = $1 AND p.name = $2
  `, [userId, permission]);
  return result.rows.length > 0;
}

/**
 * Calculate working days between two dates (excluding weekends and holidays)
 * @param {string} startDate 
 * @param {string} endDate 
 * @param {string} region 
 * @returns {Promise<number>}
 */
async function calculateWorkingDays(startDate, endDate, region = 'BY') {
  // Ensure holidays exist for the years in range
  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();
  
  // Get holidays in range
  const holidaysResult = await pool.query(
    `SELECT date FROM holidays WHERE date >= $1 AND date <= $2 AND region = $3`,
    [startDate, endDate, region]
  );
  
  const holidays = new Set(holidaysResult.rows.map(h => h.date.toISOString().split('T')[0]));
  
  let workingDays = 0;
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    
    // Skip weekends (0 = Sunday, 6 = Saturday) and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      workingDays++;
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

/**
 * Calculate hours between two times
 * @param {string} startTime HH:MM
 * @param {string} endTime HH:MM
 * @returns {number}
 */
function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return null;
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return (endMinutes - startMinutes) / 60;
}

/**
 * Check for concurrent absences based on role limits
 * Uses vacation_role_limits table for dynamic role-based limits
 * Now checks ALL roles of a user
 * 
 * @param {number} userId 
 * @param {string} startDate 
 * @param {string} endDate 
 * @param {number} excludeId - Exclude this vacation ID (for updates)
 * @returns {Promise<{allowed: boolean, message: string, concurrent: Array, warnings: Array}>}
 */
async function checkConcurrentAbsences(userId, startDate, endDate, excludeId = null) {
  // Get ALL user's roles
  const userResult = await pool.query(
    `SELECT u.id, ur.role_id, r.name as role_name 
     FROM users u 
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id 
     WHERE u.id = $1`,
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    return { allowed: false, message: 'Benutzer nicht gefunden', concurrent: [], warnings: [] };
  }
  
  // Get all role IDs for this user
  const userRoles = userResult.rows.filter(r => r.role_id != null);
  
  if (userRoles.length === 0) {
    return { allowed: true, message: 'Benutzer hat keine Rolle zugewiesen', concurrent: [], warnings: [] };
  }
  
  // Get limits for all roles
  const roleIds = userRoles.map(r => r.role_id);
  const limitResult = await pool.query(
    `SELECT vrl.role_id, vrl.max_concurrent, r.name as role_name
     FROM vacation_role_limits vrl
     JOIN roles r ON r.id = vrl.role_id
     WHERE vrl.role_id = ANY($1)`,
    [roleIds]
  );
  
  // If no roles have restrictions configured, allow
  if (limitResult.rows.length === 0) {
    return { allowed: true, message: 'Keine Einschränkung für diese Rollen', concurrent: [], warnings: [] };
  }
  
  const warnings = [];
  let allConcurrent = [];
  let overallAllowed = true;
  
  // Check each role that has a limit
  for (const limit of limitResult.rows) {
    const { role_id, max_concurrent, role_name } = limit;
    
    // Find overlapping absences for this role
    let query = `
      SELECT DISTINCT
        v.id, v.start_date, v.end_date,
        u.id as user_id, COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        vt.name as type_name,
        $5::text as role_name
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN vacation_types vt ON vt.id = v.type_id
      WHERE ur.role_id = $1
        AND v.status IN ('approved', 'pending')
        AND v.start_date <= $3
        AND v.end_date >= $2
        AND v.user_id != $4
    `;
    const params = [role_id, startDate, endDate, userId, role_name];
    
    if (excludeId) {
      params.push(excludeId);
      query += ` AND v.id != $${params.length}`;
    }
    
    const overlapResult = await pool.query(query, params);
    const concurrent = overlapResult.rows;
    const allowed = concurrent.length < max_concurrent;
    
    if (!allowed) {
      overallAllowed = false;
    }
    
    // Add warning for this role
    warnings.push({
      role_id,
      role_name,
      max_concurrent,
      current_count: concurrent.length,
      allowed,
      message: allowed 
        ? `${concurrent.length} von max. ${max_concurrent} ${role_name} bereits abwesend`
        : `Maximum erreicht: ${max_concurrent} ${role_name} dürfen gleichzeitig abwesend sein`
    });
    
    // Collect all concurrent absences (avoid duplicates)
    concurrent.forEach(c => {
      if (!allConcurrent.find(ac => ac.id === c.id)) {
        allConcurrent.push(c);
      }
    });
  }
  
  // Build overall message
  const exceededRoles = warnings.filter(w => !w.allowed);
  let message;
  if (exceededRoles.length === 0) {
    message = warnings.map(w => w.message).join('; ');
  } else {
    message = exceededRoles.map(w => w.message).join('; ');
  }
  
  return {
    allowed: overallAllowed,
    message,
    concurrent: allConcurrent,
    warnings,
    maxConcurrent: warnings.length > 0 ? Math.min(...warnings.map(w => w.max_concurrent)) : null,
    currentCount: allConcurrent.length
  };
}

// ============================================
// CONTROLLER METHODS
// ============================================

/**
 * Get all vacations (with filters)
 * GET /api/vacations?year=2025&user_id=1&status=approved
 */
const getVacations = async (req, res) => {
  try {
    const { year, user_id, status, type_id, start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        v.*,
        u.username, 
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        COALESCE(
          (SELECT json_agg(json_build_object('role_id', r.id, 'role_name', r.name))
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = v.user_id),
          '[]'::json
        ) as roles,
        vt.name as type_name, vt.color as type_color,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users creator ON creator.id = v.created_by
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE 1=1
    `;
    const params = [];
    
    if (year) {
      params.push(year);
      query += ` AND EXTRACT(YEAR FROM v.start_date) = $${params.length}`;
    }
    
    if (user_id) {
      params.push(user_id);
      query += ` AND v.user_id = $${params.length}`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND v.status = $${params.length}`;
    }
    
    if (type_id) {
      params.push(type_id);
      query += ` AND v.type_id = $${params.length}`;
    }
    
    if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND v.start_date <= $${params.length} AND v.end_date >= $${params.length - 1}`;
    }
    
    query += ' ORDER BY v.start_date DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vacations:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Abwesenheiten' });
  }
};

/**
 * Get vacations for calendar view (month/year)
 * GET /api/vacations/calendar?month=1&year=2025
 */
const getVacationsCalendar = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    let startDate, endDate;
    
    if (month) {
      // Month view
      startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    } else {
      // Year view
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }
    
    // Get vacations with all roles as JSON array (no duplicates)
    const result = await pool.query(
      `SELECT 
        v.*,
        u.username, 
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        COALESCE(
          (SELECT json_agg(json_build_object('role_id', r.id, 'role_name', r.name))
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = v.user_id),
          '[]'::json
        ) as roles,
        vt.name as type_name, vt.color as type_color
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN vacation_types vt ON vt.id = v.type_id
      WHERE v.status IN ('approved', 'pending')
        AND v.start_date <= $2
        AND v.end_date >= $1
      ORDER BY COALESCE(u.first_name || ' ' || u.last_name, u.username), v.start_date`,
      [startDate, endDate]
    );
    
    // Also get holidays for the period
    const holidaysResult = await pool.query(
      `SELECT * FROM holidays WHERE date >= $1 AND date <= $2 ORDER BY date`,
      [startDate, endDate]
    );
    
    res.json({
      vacations: result.rows,
      holidays: holidaysResult.rows,
      period: { startDate, endDate, month, year }
    });
  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Kalenders' });
  }
};

/**
 * Get single vacation
 * GET /api/vacations/:id
 */
const getVacation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT 
        v.*,
        u.username, COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        r.name as role_name,
        vt.name as type_name, vt.color as type_color,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users creator ON creator.id = v.created_by
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching vacation:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Abwesenheit' });
  }
};

/**
 * Create vacation
 * POST /api/vacations
 */
const createVacation = async (req, res) => {
  try {
    const { 
      user_id, 
      type_id, 
      start_date, 
      end_date, 
      start_time, 
      end_time,
      note,
      skip_overlap_check = false
    } = req.body;
    
    // Validation
    if (!user_id || !type_id || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'user_id, type_id, start_date und end_date sind erforderlich' 
      });
    }
    
    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ error: 'Enddatum muss >= Startdatum sein' });
    }
    
    // Check permissions
    const canManage = await userHasPermission(req.user.id, 'vacations.manage');
    const isOwnRequest = parseInt(user_id) === req.user.id;
    
    // If creating for someone else, must have manage permission
    if (!isOwnRequest && !canManage) {
      return res.status(403).json({ 
        error: 'Keine Berechtigung, Abwesenheiten für andere Mitarbeiter anzulegen' 
      });
    }
    
    // Check for concurrent absences (warning only, don't block)
    let concurrentWarning = null;
    if (!skip_overlap_check) {
      const concurrentCheck = await checkConcurrentAbsences(user_id, start_date, end_date);
      if (!concurrentCheck.allowed) {
        concurrentWarning = {
          message: concurrentCheck.message,
          concurrent: concurrentCheck.concurrent,
          maxConcurrent: concurrentCheck.maxConcurrent
        };
      }
    }
    
    // Calculate working days
    const calculatedDays = await calculateWorkingDays(start_date, end_date);
    const calculatedHours = calculateHours(start_time, end_time);
    
    // Determine status:
    // - Users with vacations.manage can create approved entries directly
    // - Others create pending requests (canManage already checked above)
    const status = canManage ? 'approved' : 'pending';
    
    const result = await pool.query(
      `INSERT INTO vacations (
        user_id, type_id, start_date, end_date, 
        start_time, end_time, calculated_days, calculated_hours,
        note, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        user_id, type_id, start_date, end_date,
        start_time || null, end_time || null, 
        calculatedDays, calculatedHours,
        note, status, req.user?.id || null
      ]
    );
    
    // Fetch full vacation data
    const fullResult = await pool.query(
      `SELECT 
        v.*,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        vt.name as type_name, vt.color as type_color
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN vacation_types vt ON vt.id = v.type_id
      WHERE v.id = $1`,
      [result.rows[0].id]
    );
    
    const response = {
      ...fullResult.rows[0],
      ...(concurrentWarning && { warning: concurrentWarning })
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating vacation:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Abwesenheit' });
  }
};

/**
 * Update vacation
 * PUT /api/vacations/:id
 */
const updateVacation = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      user_id, 
      type_id, 
      start_date, 
      end_date, 
      start_time, 
      end_time,
      note,
      status,
      skip_overlap_check = false
    } = req.body;
    
    // Get current vacation
    const current = await pool.query('SELECT * FROM vacations WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    
    const currentVacation = current.rows[0];
    const newStartDate = start_date || currentVacation.start_date;
    const newEndDate = end_date || currentVacation.end_date;
    const newUserId = user_id || currentVacation.user_id;
    
    // Check overlaps if dates changed (warning only, don't block)
    let concurrentWarning = null;
    if (!skip_overlap_check && (start_date || end_date)) {
      const concurrentCheck = await checkConcurrentAbsences(
        newUserId, newStartDate, newEndDate, id
      );
      if (!concurrentCheck.allowed) {
        concurrentWarning = {
          message: concurrentCheck.message,
          concurrent: concurrentCheck.concurrent
        };
      }
    }
    
    // Recalculate days if dates changed
    let calculatedDays = currentVacation.calculated_days;
    let calculatedHours = currentVacation.calculated_hours;
    
    if (start_date || end_date) {
      calculatedDays = await calculateWorkingDays(newStartDate, newEndDate);
    }
    
    if (start_time !== undefined || end_time !== undefined) {
      calculatedHours = calculateHours(
        start_time ?? currentVacation.start_time,
        end_time ?? currentVacation.end_time
      );
    }
    
    const result = await pool.query(
      `UPDATE vacations SET
        user_id = COALESCE($1, user_id),
        type_id = COALESCE($2, type_id),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        start_time = $5,
        end_time = $6,
        calculated_days = $7,
        calculated_hours = $8,
        note = COALESCE($9, note),
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [
        user_id, type_id, start_date, end_date,
        start_time, end_time,
        calculatedDays, calculatedHours,
        note, status, id
      ]
    );
    
    const response = {
      ...result.rows[0],
      ...(concurrentWarning && { warning: concurrentWarning })
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating vacation:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Abwesenheit' });
  }
};

/**
 * Delete vacation
 * DELETE /api/vacations/:id
 */
const deleteVacation = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM vacations WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    
    res.json({ message: 'Abwesenheit gelöscht', vacation: result.rows[0] });
  } catch (error) {
    console.error('Error deleting vacation:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Abwesenheit' });
  }
};

/**
 * Check overlap before creating (dry run)
 * POST /api/vacations/check-overlap
 */
const checkOverlap = async (req, res) => {
  try {
    const { user_id, start_date, end_date, exclude_id } = req.body;
    
    if (!user_id || !start_date || !end_date) {
      return res.status(400).json({ error: 'user_id, start_date und end_date erforderlich' });
    }
    
    const result = await checkConcurrentAbsences(user_id, start_date, end_date, exclude_id);
    const workingDays = await calculateWorkingDays(start_date, end_date);
    
    res.json({
      ...result,
      calculatedDays: workingDays
    });
  } catch (error) {
    console.error('Error checking overlap:', error);
    res.status(500).json({ error: 'Fehler beim Prüfen der Überschneidung' });
  }
};

// ============================================
// APPROVAL WORKFLOW
// ============================================

/**
 * Approve a vacation request
 * POST /api/vacations/:id/approve
 */
const approveVacation = async (req, res) => {
  try {
    const { id } = req.params;
    const approverId = req.user.id;
    
    // Check if vacation exists and is pending
    const checkResult = await pool.query(
      'SELECT * FROM vacations WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    
    const vacation = checkResult.rows[0];
    
    if (vacation.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Nur ausstehende Anträge können genehmigt werden',
        currentStatus: vacation.status
      });
    }
    
    // Update status
    const result = await pool.query(
      `UPDATE vacations 
       SET status = 'approved', approved_by = $1, approved_at = NOW(), rejection_reason = NULL
       WHERE id = $2
       RETURNING *`,
      [approverId, id]
    );
    
    // Fetch full data
    const fullResult = await pool.query(
      `SELECT 
        v.*,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        vt.name as type_name, vt.color as type_color,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.id = $1`,
      [id]
    );
    
    res.json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error approving vacation:', error);
    res.status(500).json({ error: 'Fehler beim Genehmigen der Abwesenheit' });
  }
};

/**
 * Request vacation for self (always creates pending request)
 * POST /api/vacations/request
 * This is for users to request their own vacation - always creates pending status
 */
const requestVacation = async (req, res) => {
  try {
    const { 
      type_id, 
      start_date, 
      end_date, 
      start_time, 
      end_time,
      note
    } = req.body;
    
    const user_id = req.user.id; // Always for self
    
    // Validation
    if (!type_id || !start_date || !end_date) {
      return res.status(400).json({ 
        error: 'type_id, start_date und end_date sind erforderlich' 
      });
    }
    
    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ error: 'Enddatum muss >= Startdatum sein' });
    }
    
    // Check vacation type exists and is active
    const typeResult = await pool.query(
      'SELECT * FROM vacation_types WHERE id = $1 AND is_active = true',
      [type_id]
    );
    
    if (typeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Ungültiger Abwesenheitstyp' });
    }
    
    // Calculate working days
    const calculatedDays = await calculateWorkingDays(start_date, end_date);
    const calculatedHours = calculateHours(start_time, end_time);
    
    // Always create as pending - this is a request, not direct entry
    const status = 'pending';
    
    const result = await pool.query(
      `INSERT INTO vacations (
        user_id, type_id, start_date, end_date, 
        start_time, end_time, calculated_days, calculated_hours,
        note, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        user_id, type_id, start_date, end_date,
        start_time || null, end_time || null, 
        calculatedDays, calculatedHours,
        note, status, req.user.id
      ]
    );
    
    // Fetch full vacation data
    const fullResult = await pool.query(
      `SELECT 
        v.*,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        vt.name as type_name, vt.color as type_color
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN vacation_types vt ON vt.id = v.type_id
      WHERE v.id = $1`,
      [result.rows[0].id]
    );
    
    res.status(201).json({
      ...fullResult.rows[0],
      message: 'Urlaubsantrag wurde eingereicht'
    });
  } catch (error) {
    console.error('Request vacation error:', error);
    res.status(500).json({ error: 'Fehler beim Einreichen des Antrags' });
  }
};

/**
 * Reject a vacation request
 * POST /api/vacations/:id/reject
 */
const rejectVacation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const approverId = req.user.id;
    
    // Check if vacation exists and is pending
    const checkResult = await pool.query(
      'SELECT * FROM vacations WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    
    const vacation = checkResult.rows[0];
    
    if (vacation.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Nur ausstehende Anträge können abgelehnt werden',
        currentStatus: vacation.status
      });
    }
    
    // Update status
    const result = await pool.query(
      `UPDATE vacations 
       SET status = 'rejected', approved_by = $1, approved_at = NOW(), rejection_reason = $2
       WHERE id = $3
       RETURNING *`,
      [approverId, reason || null, id]
    );
    
    // Fetch full data
    const fullResult = await pool.query(
      `SELECT 
        v.*,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        vt.name as type_name, vt.color as type_color,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.id = $1`,
      [id]
    );
    
    res.json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error rejecting vacation:', error);
    res.status(500).json({ error: 'Fehler beim Ablehnen der Abwesenheit' });
  }
};

/**
 * Get pending requests (for approvers)
 * GET /api/vacations/pending
 */
const getPendingRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        v.*,
        u.username,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        COALESCE(
          (SELECT json_agg(json_build_object('role_id', r.id, 'role_name', r.name))
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = v.user_id),
          '[]'::json
        ) as user_roles,
        vt.name as type_name, vt.color as type_color,
        creator.first_name || ' ' || creator.last_name as created_by_name
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users creator ON creator.id = v.created_by
      WHERE v.status = 'pending'
      ORDER BY v.created_at ASC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Fehler beim Laden der ausstehenden Anträge' });
  }
};

/**
 * Get my requests (for current user)
 * GET /api/vacations/my-requests?year=2026
 */
const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const result = await pool.query(
      `SELECT 
        v.*,
        vt.name as type_name, vt.color as type_color,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.user_id = $1 
        AND EXTRACT(YEAR FROM v.start_date) = $2
        AND v.status IN ('pending', 'rejected')
      ORDER BY v.created_at DESC`,
      [userId, year]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching my requests:', error);
    res.status(500).json({ error: 'Fehler beim Laden meiner Anträge' });
  }
};

/**
 * Resubmit a rejected request (creates new pending entry)
 * POST /api/vacations/:id/resubmit
 */
const resubmitVacation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { start_date, end_date, note } = req.body;
    
    // Check if vacation exists and is rejected
    const checkResult = await pool.query(
      'SELECT * FROM vacations WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheit nicht gefunden' });
    }
    
    const vacation = checkResult.rows[0];
    
    // Verify ownership
    if (vacation.user_id !== userId) {
      return res.status(403).json({ error: 'Nicht berechtigt' });
    }
    
    if (vacation.status !== 'rejected') {
      return res.status(400).json({ 
        error: 'Nur abgelehnte Anträge können erneut eingereicht werden',
        currentStatus: vacation.status
      });
    }
    
    // Calculate working days for new dates
    const newStartDate = start_date || vacation.start_date;
    const newEndDate = end_date || vacation.end_date;
    const calculatedDays = await calculateWorkingDays(newStartDate, newEndDate);
    
    // Update the vacation
    const result = await pool.query(
      `UPDATE vacations 
       SET status = 'pending', 
           start_date = $1,
           end_date = $2,
           calculated_days = $3,
           note = $4,
           rejection_reason = NULL,
           approved_by = NULL,
           approved_at = NULL,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [newStartDate, newEndDate, calculatedDays, note || vacation.note, id]
    );
    
    // Fetch full data
    const fullResult = await pool.query(
      `SELECT 
        v.*,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        vt.name as type_name, vt.color as type_color
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      JOIN vacation_types vt ON vt.id = v.type_id
      WHERE v.id = $1`,
      [id]
    );
    
    res.json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error resubmitting vacation:', error);
    res.status(500).json({ error: 'Fehler beim erneuten Einreichen' });
  }
};

module.exports = {
  getVacations,
  getVacationsCalendar,
  getVacation,
  createVacation,
  updateVacation,
  deleteVacation,
  checkOverlap,
  // Approval workflow
  approveVacation,
  rejectVacation,
  getPendingRequests,
  getMyRequests,
  resubmitVacation,
  requestVacation,
  // Export helpers for testing
  calculateWorkingDays,
  checkConcurrentAbsences
};
