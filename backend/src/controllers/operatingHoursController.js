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
// OPERATING HOURS - Betriebsstunden erfassen
// ============================================================

/**
 * Get operating hours log for a machine
 * GET /api/maintenance/operating-hours/:machineId
 */
exports.getOperatingHoursLog = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { from, to, limit = 50 } = req.query;

    let query = `
      SELECT 
        ohl.*,
        u.username,
        u.first_name,
        u.last_name
      FROM operating_hours_log ohl
      LEFT JOIN users u ON ohl.recorded_by = u.id
      WHERE ohl.machine_id = $1
    `;
    const params = [machineId];
    let paramCount = 2;

    if (from) {
      query += ` AND ohl.recorded_at >= $${paramCount}`;
      params.push(from);
      paramCount++;
    }

    if (to) {
      query += ` AND ohl.recorded_at <= $${paramCount}`;
      params.push(to);
      paramCount++;
    }

    query += ` ORDER BY ohl.recorded_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    // Aktuelle Stunden der Maschine
    const machineQuery = `
      SELECT name, current_operating_hours, operating_hours_updated_at
      FROM machines WHERE id = $1
    `;
    const machineResult = await pool.query(machineQuery, [machineId]);

    res.json({
      success: true,
      count: result.rows.length,
      machine: machineResult.rows[0] || null,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Betriebsstunden:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Betriebsstunden',
      message: error.message
    });
  }
};

/**
 * Record operating hours for a machine
 * POST /api/maintenance/operating-hours/:machineId
 */
exports.recordOperatingHours = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { machineId } = req.params;
    const userId = req.user.id;
    const { recorded_hours, notes, source = 'manual' } = req.body;

    if (recorded_hours === undefined || recorded_hours === null) {
      return res.status(400).json({
        success: false,
        error: 'Betriebsstunden sind erforderlich'
      });
    }

    await client.query('BEGIN');

    // Aktuelle Stunden der Maschine holen
    const machineQuery = 'SELECT current_operating_hours FROM machines WHERE id = $1';
    const machineResult = await client.query(machineQuery, [machineId]);

    if (machineResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Maschine nicht gefunden'
      });
    }

    const previousHours = machineResult.rows[0].current_operating_hours || 0;
    const hoursDelta = recorded_hours - previousHours;

    // Validierung: Stunden sollten nicht kleiner werden (außer Reset)
    if (hoursDelta < -10 && source === 'manual') {
      // Warnung bei großem Rückgang, aber erlauben (könnte Zähler-Reset sein)
      console.warn(`Betriebsstunden-Rückgang bei Maschine ${machineId}: ${previousHours} -> ${recorded_hours}`);
    }

    // Log-Eintrag erstellen
    const logQuery = `
      INSERT INTO operating_hours_log (
        machine_id, recorded_hours, previous_hours, hours_delta, 
        recorded_by, source, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const logResult = await client.query(logQuery, [
      machineId,
      recorded_hours,
      previousHours,
      hoursDelta,
      userId,
      source,
      notes || null
    ]);

    // Maschine aktualisieren (beide Felder: current_operating_hours für Wartung, operating_hours für Stammdaten)
    const updateQuery = `
      UPDATE machines SET
        current_operating_hours = $1,
        operating_hours = $2,
        operating_hours_updated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING name, current_operating_hours, operating_hours, operating_hours_updated_at
    `;
    const updateResult = await client.query(updateQuery, [
      recorded_hours, 
      Math.round(recorded_hours),  // Integer für operating_hours
      machineId
    ]);

    // Prüfen ob Betriebsstunden-basierte Wartungen fällig werden
    const duePlansQuery = `
      SELECT mp.id, mp.title, mp.next_due_hours
      FROM maintenance_plans mp
      WHERE mp.machine_id = $1 
        AND mp.is_active = true
        AND mp.interval_hours IS NOT NULL
        AND mp.next_due_hours <= $2
    `;
    const duePlansResult = await client.query(duePlansQuery, [machineId, recorded_hours]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        log_entry: logResult.rows[0],
        machine: updateResult.rows[0],
        hours_delta: hoursDelta
      },
      due_maintenance_plans: duePlansResult.rows,
      message: duePlansResult.rows.length > 0 
        ? `Betriebsstunden erfasst. ${duePlansResult.rows.length} Wartung(en) jetzt fällig!`
        : 'Betriebsstunden erfasst'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Erfassen der Betriebsstunden:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erfassen der Betriebsstunden',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get operating hours summary for all machines
 * GET /api/maintenance/operating-hours
 */
exports.getAllMachinesOperatingHours = async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id,
        m.name,
        m.machine_type,
        m.machine_category,
        m.location,
        m.current_operating_hours,
        m.operating_hours_updated_at,
        (SELECT recorded_hours FROM operating_hours_log 
         WHERE machine_id = m.id ORDER BY recorded_at DESC LIMIT 1) AS last_recorded_hours,
        (SELECT recorded_at FROM operating_hours_log 
         WHERE machine_id = m.id ORDER BY recorded_at DESC LIMIT 1) AS last_recorded_at,
        (SELECT COUNT(*) FROM maintenance_plans mp 
         WHERE mp.machine_id = m.id AND mp.is_active AND mp.interval_hours IS NOT NULL
         AND mp.next_due_hours <= m.current_operating_hours) AS due_hours_plans
      FROM machines m
      WHERE m.is_active = true
      ORDER BY m.name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Betriebsstunden-Übersicht:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Betriebsstunden-Übersicht',
      message: error.message
    });
  }
};

/**
 * Get operating hours statistics for a machine
 * GET /api/maintenance/operating-hours/:machineId/stats
 */
exports.getOperatingHoursStats = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { days = 30 } = req.query;

    // Täglicher Durchschnitt
    const avgQuery = `
      SELECT 
        AVG(hours_delta) AS avg_daily_hours,
        SUM(hours_delta) AS total_hours_period,
        COUNT(*) AS record_count,
        MIN(recorded_at) AS first_record,
        MAX(recorded_at) AS last_record
      FROM operating_hours_log
      WHERE machine_id = $1 
        AND recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
        AND hours_delta > 0
    `;
    const avgResult = await pool.query(avgQuery, [machineId]);

    // Trend der letzten Tage
    const trendQuery = `
      SELECT 
        DATE(recorded_at) AS date,
        MAX(recorded_hours) - MIN(recorded_hours) AS daily_hours,
        MAX(recorded_hours) AS end_hours
      FROM operating_hours_log
      WHERE machine_id = $1 
        AND recorded_at >= NOW() - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(recorded_at)
      ORDER BY date DESC
    `;
    const trendResult = await pool.query(trendQuery, [machineId]);

    // Nächste fällige Betriebsstunden-Wartung
    const nextMaintenanceQuery = `
      SELECT mp.id, mp.title, mp.next_due_hours, mp.interval_hours,
        m.current_operating_hours,
        mp.next_due_hours - m.current_operating_hours AS hours_remaining
      FROM maintenance_plans mp
      JOIN machines m ON mp.machine_id = m.id
      WHERE mp.machine_id = $1 
        AND mp.is_active = true
        AND mp.interval_hours IS NOT NULL
      ORDER BY mp.next_due_hours ASC
      LIMIT 5
    `;
    const nextMaintenanceResult = await pool.query(nextMaintenanceQuery, [machineId]);

    const stats = avgResult.rows[0];
    const avgDailyHours = parseFloat(stats.avg_daily_hours) || 0;

    // Prognose: Wann ist nächste Wartung fällig
    const predictions = nextMaintenanceResult.rows.map(plan => {
      const hoursRemaining = parseFloat(plan.hours_remaining) || 0;
      const daysUntilDue = avgDailyHours > 0 ? Math.ceil(hoursRemaining / avgDailyHours) : null;
      return {
        ...plan,
        estimated_days_until_due: daysUntilDue,
        estimated_date: daysUntilDue ? new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000) : null
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          avg_daily_hours: avgDailyHours.toFixed(1),
          total_hours_period: parseFloat(stats.total_hours_period) || 0,
          record_count: parseInt(stats.record_count) || 0,
          period_days: parseInt(days)
        },
        trend: trendResult.rows,
        upcoming_maintenance: predictions
      }
    });
  } catch (error) {
    console.error('Fehler beim Laden der Betriebsstunden-Statistik:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Betriebsstunden-Statistik',
      message: error.message
    });
  }
};

/**
 * Get operating hours history across all machines
 * GET /api/maintenance/operating-hours/history
 */
exports.getOperatingHoursHistory = async (req, res) => {
  try {
    const { machine_id, limit = 50 } = req.query;

    let query = `
      SELECT 
        ohl.id,
        ohl.machine_id,
        m.name AS machine_name,
        m.location AS machine_location,
        ohl.previous_hours,
        ohl.recorded_hours AS new_hours,
        ohl.notes,
        ohl.recorded_at,
        ohl.recorded_by,
        u.username,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) AS recorded_by_name
      FROM operating_hours_log ohl
      JOIN machines m ON ohl.machine_id = m.id
      LEFT JOIN users u ON ohl.recorded_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (machine_id) {
      query += ` AND ohl.machine_id = $${paramCount}`;
      params.push(machine_id);
      paramCount++;
    }

    query += ` ORDER BY ohl.recorded_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Fehler beim Laden der Betriebsstunden-Historie:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Betriebsstunden-Historie',
      message: error.message
    });
  }
};
