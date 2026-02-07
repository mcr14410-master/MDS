/**
 * Terminal Controller
 * 
 * Endpoints für Terminal-Geräte (authentifiziert per API-Key).
 * - User-Liste für lokalen Cache
 * - Stempeln per User-ID (Offline-Sync)
 * - Terminal-Registrierung
 */

const pool = require('../config/db');
const crypto = require('crypto');
const { updateDailySummary, autoCloseOpenDays } = require('./timeEntriesController');
const { calculateMonthBalance } = require('./timeBalancesController');

// Hilfsfunktion: Datum als YYYY-MM-DD in Europe/Berlin
function toLocalDateStr(date) {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}

// ============================================
// User-Liste für Terminal-Cache
// ============================================

/**
 * GET /api/terminal/users
 * Gibt alle User mit Zeiterfassung zurück (für lokalen Cache).
 * Enthält rfid_chip_id und pin_code.
 */
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.rfid_chip_id,
        u.pin_code,
        u.time_tracking_enabled,
        u.is_active,
        tm.name as time_model_name
      FROM users u
      LEFT JOIN time_models tm ON u.time_model_id = tm.id
      WHERE u.is_active = TRUE AND u.time_tracking_enabled = TRUE
      ORDER BY u.last_name, u.first_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Terminal getUsers Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Stempeln per User-ID (für Offline-Sync)
// ============================================

/**
 * POST /api/terminal/stamp
 * Akzeptiert direkte user_id + timestamp (für Offline-Queue Sync).
 * Unterschied zu /entries/stamp-terminal: Kein RFID/PIN Lookup nötig.
 */
const stamp = async (req, res) => {
  try {
    const { user_id, entry_type, timestamp } = req.body;
    const terminalId = req.terminal.id;

    // Validierung
    if (!user_id || !entry_type) {
      return res.status(400).json({ error: 'user_id und entry_type erforderlich' });
    }

    const validTypes = ['clock_in', 'clock_out', 'break_start', 'break_end'];
    if (!validTypes.includes(entry_type)) {
      return res.status(400).json({ error: 'Ungültiger Buchungstyp' });
    }

    // User prüfen
    const userCheck = await pool.query(
      'SELECT id, first_name, last_name, time_tracking_enabled FROM users WHERE id = $1 AND is_active = TRUE',
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    if (!userCheck.rows[0].time_tracking_enabled) {
      return res.status(400).json({ error: 'Zeiterfassung nicht aktiviert' });
    }

    // Zeitstempel: Vom Terminal übermittelt oder jetzt
    const entryTimestamp = timestamp ? new Date(timestamp) : new Date();

    // Auto-Abschluss offener Vortage bei clock_in
    const warnings = [];
    if (entry_type === 'clock_in') {
      const autoCloseResult = await autoCloseOpenDays(user_id, entryTimestamp);
      if (autoCloseResult.length > 0) {
        warnings.push(...autoCloseResult);
      }
    }

    // Duplikat-Check: Gleiche Buchung (User + Typ + Timestamp ±2 Min) verhindern
    const duplicateCheck = await pool.query(`
      SELECT id FROM time_entries
      WHERE user_id = $1 AND entry_type = $2 
        AND ABS(EXTRACT(EPOCH FROM (timestamp - $3::timestamptz))) < 120
    `, [user_id, entry_type, entryTimestamp]);

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Duplikat',
        message: 'Diese Stempelung existiert bereits',
        existing_id: duplicateCheck.rows[0].id
      });
    }

    // Buchung einfügen
    const result = await pool.query(`
      INSERT INTO time_entries (user_id, entry_type, timestamp, source, terminal_id)
      VALUES ($1, $2, $3, 'terminal', $4)
      RETURNING *
    `, [user_id, entry_type, entryTimestamp, terminalId]);

    // Tagesübersicht aktualisieren
    await updateDailySummary(user_id, entryTimestamp);

    const user = userCheck.rows[0];
    const response = {
      ...result.rows[0],
      user_name: `${user.first_name} ${user.last_name}`,
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Terminal stamp Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Batch-Sync (mehrere Stempelungen auf einmal)
// ============================================

/**
 * POST /api/terminal/stamp-batch
 * Synchronisiert mehrere Offline-Stempelungen auf einmal.
 */
const stampBatch = async (req, res) => {
  try {
    const { stamps } = req.body;
    const terminalId = req.terminal.id;

    if (!Array.isArray(stamps) || stamps.length === 0) {
      return res.status(400).json({ error: 'stamps Array erforderlich' });
    }

    if (stamps.length > 100) {
      return res.status(400).json({ error: 'Maximal 100 Stempelungen pro Batch' });
    }

    const results = [];
    const validTypes = ['clock_in', 'clock_out', 'break_start', 'break_end'];

    for (const s of stamps) {
      try {
        if (!s.user_id || !s.entry_type || !validTypes.includes(s.entry_type)) {
          results.push({ local_id: s.local_id, success: false, error: 'Ungültige Daten' });
          continue;
        }

        const entryTimestamp = s.timestamp ? new Date(s.timestamp) : new Date();

        // Duplikat-Check
        const dup = await pool.query(`
          SELECT id FROM time_entries
          WHERE user_id = $1 AND entry_type = $2 
            AND ABS(EXTRACT(EPOCH FROM (timestamp - $3::timestamptz))) < 120
        `, [s.user_id, s.entry_type, entryTimestamp]);

        if (dup.rows.length > 0) {
          results.push({ 
            local_id: s.local_id, 
            success: true, 
            server_id: dup.rows[0].id, 
            duplicate: true 
          });
          continue;
        }

        const result = await pool.query(`
          INSERT INTO time_entries (user_id, entry_type, timestamp, source, terminal_id)
          VALUES ($1, $2, $3, 'terminal', $4)
          RETURNING id
        `, [s.user_id, s.entry_type, entryTimestamp, terminalId]);

        await updateDailySummary(s.user_id, entryTimestamp);

        results.push({ 
          local_id: s.local_id, 
          success: true, 
          server_id: result.rows[0].id 
        });

      } catch (err) {
        results.push({ 
          local_id: s.local_id, 
          success: false, 
          error: err.message 
        });
      }
    }

    const synced = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({ total: stamps.length, synced, failed, results });
  } catch (error) {
    console.error('Terminal stampBatch Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Terminal registrieren (Admin-Funktion)
// ============================================

/**
 * POST /api/terminal/register
 * Erstellt ein neues Terminal und generiert API-Key.
 * Nur mit JWT-Auth + time_tracking.settings Berechtigung.
 */
const register = async (req, res) => {
  try {
    const { name, location, terminal_type } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name erforderlich' });
    }

    // API-Key generieren (32 Bytes = 64 Hex-Zeichen)
    const apiKey = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(`
      INSERT INTO time_terminals (name, location, terminal_type, api_key, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, name, location, terminal_type, api_key, is_active, created_at
    `, [name, location || null, terminal_type || 'time_clock', apiKey]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Terminal register Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

/**
 * GET /api/terminal/list
 * Alle registrierten Terminals (Admin).
 */
const list = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, location, terminal_type, is_active, 
             last_heartbeat, last_sync, created_at
      FROM time_terminals 
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Terminal list Fehler:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

/**
 * GET /api/terminal/info
 * Terminal ruft eigene Infos ab (per API-Key).
 */
const getInfo = async (req, res) => {
  try {
    res.json({
      terminal: req.terminal,
      server_time: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

module.exports = {
  getUsers,
  stamp,
  stampBatch,
  register,
  list,
  getInfo,
};
