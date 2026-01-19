/**
 * Vacations Controller
 * 
 * Manages absence entries with:
 * - Automatic day calculation (excluding weekends and holidays)
 * - Concurrent absence checks per role
 * - Partial day support (time entries)
 */

const pool = require('../config/db');

// ============================================
// HELPER FUNCTIONS
// ============================================

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
 * Check for concurrent absences
 * Uses vacation_role_limits table for dynamic role-based limits
 * 
 * @param {number} userId 
 * @param {string} startDate 
 * @param {string} endDate 
 * @param {number} excludeId - Exclude this vacation ID (for updates)
 * @returns {Promise<{allowed: boolean, message: string, concurrent: Array}>}
 */
async function checkConcurrentAbsences(userId, startDate, endDate, excludeId = null) {
  // Get user's role
  const userResult = await pool.query(
    `SELECT u.id, ur.role_id, r.name as role_name 
     FROM users u 
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id 
     WHERE u.id = $1`,
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    return { allowed: false, message: 'Benutzer nicht gefunden', concurrent: [] };
  }
  
  const roleId = userResult.rows[0].role_id;
  const roleName = userResult.rows[0].role_name;
  
  // Check if this role has a limit configured
  const limitResult = await pool.query(
    'SELECT max_concurrent FROM vacation_role_limits WHERE role_id = $1',
    [roleId]
  );
  
  // If role doesn't have restrictions configured, allow
  if (limitResult.rows.length === 0) {
    return { allowed: true, message: 'Keine Einschränkung für diese Rolle', concurrent: [] };
  }
  
  const maxConcurrent = limitResult.rows[0].max_concurrent;
  
  // Find overlapping absences for same role
  let query = `
    SELECT 
      v.id, v.start_date, v.end_date,
      u.id as user_id, COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
      vt.name as type_name
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
  const params = [roleId, startDate, endDate, userId];
  
  if (excludeId) {
    params.push(excludeId);
    query += ` AND v.id != $${params.length}`;
  }
  
  const overlapResult = await pool.query(query, params);
  
  const concurrent = overlapResult.rows;
  const allowed = concurrent.length < maxConcurrent;
  
  return {
    allowed,
    message: allowed 
      ? `${concurrent.length} von max. ${maxConcurrent} ${roleName} bereits abwesend`
      : `Maximum erreicht: ${maxConcurrent} ${roleName} dürfen gleichzeitig abwesend sein`,
    concurrent,
    maxConcurrent,
    currentCount: concurrent.length
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
        u.username, COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        ur.role_id,
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
    
    const result = await pool.query(
      `SELECT 
        v.*,
        u.username, COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        ur.role_id,
        r.name as role_name,
        vt.name as type_name, vt.color as type_color
      FROM vacations v
      JOIN users u ON u.id = v.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
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
    
    const result = await pool.query(
      `INSERT INTO vacations (
        user_id, type_id, start_date, end_date, 
        start_time, end_time, calculated_days, calculated_hours,
        note, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'approved', $10)
      RETURNING *`,
      [
        user_id, type_id, start_date, end_date,
        start_time || null, end_time || null, 
        calculatedDays, calculatedHours,
        note, req.user?.id || null
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

module.exports = {
  getVacations,
  getVacationsCalendar,
  getVacation,
  createVacation,
  updateVacation,
  deleteVacation,
  checkOverlap,
  // Export helpers for testing
  calculateWorkingDays,
  checkConcurrentAbsences
};
