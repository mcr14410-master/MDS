const pool = require('../config/db');
const { calculateMonthBalance } = require('./timeBalancesController');

// Hilfsfunktion: Datum als YYYY-MM-DD in Europe/Berlin Zeitzone
function toLocalDateStr(date) {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}

// Hilfsfunktion: Berechtigung prüfen
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

// ============================================
// Buchungsreihenfolge validieren (State Machine)
// ============================================
const ENTRY_TYPE_LABELS = {
  clock_in: 'Kommen', clock_out: 'Gehen',
  break_start: 'Pause Start', break_end: 'Pause Ende'
};

const VALID_TRANSITIONS = {
  absent: ['clock_in'],
  present: ['clock_out', 'break_start'],
  break: ['break_end']
};

function validateEntrySequence(entries) {
  // entries: sorted by timestamp ASC, each { id, entry_type, timestamp }
  const warnings = [];
  let state = 'absent';

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const type = entry.entry_type;
    const ts = new Date(entry.timestamp);
    const timeStr = ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
    const validNext = VALID_TRANSITIONS[state];

    if (!validNext.includes(type)) {
      const expected = validNext.map(t => ENTRY_TYPE_LABELS[t]).join(' oder ');
      warnings.push({
        entryId: entry.id || null,
        time: timeStr,
        type: ENTRY_TYPE_LABELS[type],
        message: `${timeStr}: "${ENTRY_TYPE_LABELS[type]}" ungültig – erwartet: ${expected}`,
        severity: 'warning'
      });
    }

    // State weiterschalten (auch bei Fehler, um weitere zu prüfen)
    switch (type) {
      case 'clock_in': state = 'present'; break;
      case 'clock_out': state = 'absent'; break;
      case 'break_start': state = 'break'; break;
      case 'break_end': state = 'present'; break;
    }
  }

  const expectedNext = VALID_TRANSITIONS[state] || [];

  return {
    valid: warnings.length === 0,
    warnings,
    state,
    expectedNext,
    expectedNextLabels: expectedNext.map(t => ENTRY_TYPE_LABELS[t])
  };
}

// Hilfsfunktion: Tagesvalidierung abrufen
async function getDayValidation(userId, dateStr) {
  const entries = await pool.query(`
    SELECT id, entry_type, timestamp
    FROM time_entries
    WHERE user_id = $1 AND DATE(timestamp) = $2
    ORDER BY timestamp ASC
  `, [userId, dateStr]);
  return validateEntrySequence(entries.rows);
}

// ============================================
// Auto-Abschluss offener Tage
// ============================================
async function autoCloseOpenDays(userId, currentTimestamp) {
  const today = toLocalDateStr(currentTimestamp);
  const warnings = [];

  // Offene Tage finden: Tage mit clock_in aber ohne abschließendes clock_out (vor heute)
  const openDays = await pool.query(`
    SELECT DISTINCT DATE(timestamp) as day_date
    FROM time_entries
    WHERE user_id = $1 AND DATE(timestamp) < $2
    ORDER BY day_date DESC
    LIMIT 7
  `, [userId, today]);

  for (const row of openDays.rows) {
    const dayDate = row.day_date;
    const dayStr = typeof dayDate === 'string' ? dayDate : toLocalDateStr(dayDate);

    // Alle Einträge des Tages laden
    const dayEntries = await pool.query(`
      SELECT entry_type, timestamp
      FROM time_entries
      WHERE user_id = $1 AND DATE(timestamp) = $2
      ORDER BY timestamp ASC
    `, [userId, dayStr]);

    if (dayEntries.rows.length === 0) continue;

    // State Machine durchlaufen um zu prüfen ob der Tag offen ist
    let state = 'absent';
    for (const e of dayEntries.rows) {
      switch (e.entry_type) {
        case 'clock_in': state = 'present'; break;
        case 'clock_out': state = 'absent'; break;
        case 'break_start': state = 'break'; break;
        case 'break_end': state = 'present'; break;
      }
    }

    // Tag ist nicht abgeschlossen (noch present oder break)
    if (state !== 'absent') {
      // Auto clock_out: Soll-Arbeitszeit ab erstem clock_in berechnen
      const firstClockIn = dayEntries.rows.find(e => e.entry_type === 'clock_in');
      if (!firstClockIn) continue;

      // Zeitmodell holen
      const userModel = await pool.query(`
        SELECT tm.* FROM users u
        JOIN time_models tm ON u.time_model_id = tm.id
        WHERE u.id = $1
      `, [userId]);

      let targetMinutes = 510; // Fallback 8:30
      if (userModel.rows.length > 0) {
        const model = userModel.rows[0];
        const dayOfWeek = new Date(dayStr).getDay();
        const dayMap = {
          0: model.sunday_minutes, 1: model.monday_minutes,
          2: model.tuesday_minutes, 3: model.wednesday_minutes,
          4: model.thursday_minutes, 5: model.friday_minutes,
          6: model.saturday_minutes
        };
        targetMinutes = dayMap[dayOfWeek] || 510;
      }

      // Offene Pause zuerst schließen
      if (state === 'break') {
        const lastBreakStart = [...dayEntries.rows].reverse().find(e => e.entry_type === 'break_start');
        const breakEndTime = new Date(lastBreakStart.timestamp);
        breakEndTime.setMinutes(breakEndTime.getMinutes() + 30); // Standard 30min Pause

        await pool.query(`
          INSERT INTO time_entries (user_id, entry_type, timestamp, source, is_correction, correction_reason, corrected_by)
          VALUES ($1, 'break_end', $2, 'auto', TRUE, 'Automatisch abgeschlossen – Pause-Ende fehlte', NULL)
        `, [userId, breakEndTime]);
      }

      // Auto clock_out: first_clock_in + Soll-Arbeitszeit + Standardpause
      const autoClockOut = new Date(firstClockIn.timestamp);
      autoClockOut.setMinutes(autoClockOut.getMinutes() + targetMinutes + 30); // + 30min Pause

      // Nicht über 23:59 des Tages hinaus
      const dayEnd = new Date(dayStr + 'T23:59:00');
      const clockOutTime = autoClockOut <= dayEnd ? autoClockOut : dayEnd;

      await pool.query(`
        INSERT INTO time_entries (user_id, entry_type, timestamp, source, is_correction, correction_reason, corrected_by)
        VALUES ($1, 'clock_out', $2, 'auto', TRUE, 'Automatisch abgeschlossen – Gehen-Stempelung fehlte', NULL)
      `, [userId, clockOutTime]);

      // Tagesübersicht neu berechnen
      await updateDailySummary(userId, new Date(dayStr));

      // needs_review setzen
      await pool.query(`
        UPDATE time_daily_summary
        SET needs_review = TRUE, review_note = 'Automatisch abgeschlossen – bitte Arbeitszeit prüfen'
        WHERE user_id = $1 AND date = $2
      `, [userId, dayStr]);

      const clockOutStr = clockOutTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
      warnings.push({
        date: dayStr,
        message: `${dayStr}: Gehen-Stempelung fehlte – automatisch um ${clockOutStr} abgeschlossen. Bitte prüfen.`
      });
    }
  }

  return warnings;
}

// ============================================
// Stempeln (Clock In/Out, Break Start/End)
// ============================================
const stamp = async (req, res) => {
  try {
    const { entry_type, user_id, terminal_id, timestamp } = req.body;
    
    // User ID entweder aus Body (Terminal) oder aus Auth (Web)
    const targetUserId = user_id || req.user.id;
    
    // Prüfen ob User für Zeiterfassung aktiviert ist
    const userCheck = await pool.query(
      'SELECT time_tracking_enabled, first_name, last_name FROM users WHERE id = $1',
      [targetUserId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    
    if (!userCheck.rows[0].time_tracking_enabled) {
      return res.status(400).json({ error: 'Zeiterfassung für diesen Benutzer nicht aktiviert' });
    }

    // Validierung entry_type
    const validTypes = ['clock_in', 'clock_out', 'break_start', 'break_end'];
    if (!validTypes.includes(entry_type)) {
      return res.status(400).json({ error: 'Ungültiger Buchungstyp' });
    }

    // Zeitstempel: Entweder übergeben oder jetzt
    const entryTimestamp = timestamp ? new Date(timestamp) : new Date();
    
    // Source bestimmen
    const source = terminal_id ? 'terminal' : 'web';

    // ============================================
    // Auto-Abschluss: Offene Vortage prüfen
    // ============================================
    const warnings = [];
    if (entry_type === 'clock_in') {
      const autoCloseResult = await autoCloseOpenDays(targetUserId, entryTimestamp);
      if (autoCloseResult.length > 0) {
        warnings.push(...autoCloseResult);
      }
    }

    const result = await pool.query(`
      INSERT INTO time_entries (user_id, entry_type, timestamp, source, terminal_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [targetUserId, entry_type, entryTimestamp, source, terminal_id || null]);

    // Tagesübersicht aktualisieren
    await updateDailySummary(targetUserId, entryTimestamp);

    // Antwort mit Benutzerinfos für Terminal-Feedback
    const entry = result.rows[0];
    entry.user_name = `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`;
    
    // Aktuelle Tagesstatistik hinzufügen
    const dayStats = await getDayStats(targetUserId, entryTimestamp);
    entry.day_stats = dayStats;

    // Warnungen mitsenden
    if (warnings.length > 0) {
      entry.warnings = warnings;
    }

    res.status(201).json(entry);
  } catch (error) {
    console.error('Fehler beim Stempeln:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Stempelung per RFID/PIN (Terminal)
// ============================================
const stampByIdentifier = async (req, res) => {
  try {
    const { rfid_chip_id, pin_code, entry_type, terminal_id } = req.body;
    
    // Benutzer anhand RFID oder PIN finden
    let user;
    if (rfid_chip_id) {
      const result = await pool.query(
        `SELECT id, first_name, last_name, time_tracking_enabled FROM users 
         WHERE rfid_chip_id = $1 AND is_active = TRUE`,
        [rfid_chip_id]
      );
      user = result.rows[0];
    } else if (pin_code) {
      const result = await pool.query(
        `SELECT id, first_name, last_name, time_tracking_enabled FROM users 
         WHERE pin_code = $1 AND is_active = TRUE`,
        [pin_code]
      );
      user = result.rows[0];
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    
    if (!user.time_tracking_enabled) {
      return res.status(400).json({ error: 'Zeiterfassung nicht aktiviert' });
    }

    // Stempeln durchführen
    const timestamp = new Date();

    // Auto-Abschluss offener Vortage bei clock_in
    const warnings = [];
    if (entry_type === 'clock_in') {
      const autoCloseResult = await autoCloseOpenDays(user.id, timestamp);
      if (autoCloseResult.length > 0) {
        warnings.push(...autoCloseResult);
      }
    }

    const result = await pool.query(`
      INSERT INTO time_entries (user_id, entry_type, timestamp, source, terminal_id)
      VALUES ($1, $2, $3, 'terminal', $4)
      RETURNING *
    `, [user.id, entry_type, timestamp, terminal_id || null]);

    // Tagesübersicht aktualisieren
    await updateDailySummary(user.id, timestamp);

    // Tagesstatistik
    const dayStats = await getDayStats(user.id, timestamp);

    const response = {
      ...result.rows[0],
      user_name: `${user.first_name} ${user.last_name}`,
      user_id: user.id,
      day_stats: dayStats
    };

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Fehler beim Terminal-Stempeln:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Benutzer-Info per RFID/PIN abrufen (für Info-Screen)
// ============================================
const getUserInfoByIdentifier = async (req, res) => {
  try {
    const { rfid_chip_id, pin_code } = req.query;
    
    let user;
    if (rfid_chip_id) {
      const result = await pool.query(`
        SELECT u.id, u.first_name, u.last_name, u.time_tracking_enabled, tm.name as time_model_name,
               u.time_balance_carryover
        FROM users u
        LEFT JOIN time_models tm ON u.time_model_id = tm.id
        WHERE u.rfid_chip_id = $1 AND u.is_active = TRUE
      `, [rfid_chip_id]);
      user = result.rows[0];
    } else if (pin_code) {
      const result = await pool.query(`
        SELECT u.id, u.first_name, u.last_name, u.time_tracking_enabled, tm.name as time_model_name,
               u.time_balance_carryover
        FROM users u
        LEFT JOIN time_models tm ON u.time_model_id = tm.id
        WHERE u.pin_code = $1 AND u.is_active = TRUE
      `, [pin_code]);
      user = result.rows[0];
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    // Aktueller Status heute
    const todayStatus = await getCurrentStatus(user.id);
    
    // Tagesstatistik
    const dayStats = await getDayStats(user.id, new Date());
    
    // Wochenstatistik
    const weekStats = await getWeekStats(user.id, new Date());
    
    // Monatsstatistik
    const monthStats = await getMonthStats(user.id, new Date());
    
    // Aktuelles Zeitkonto-Saldo
    const balance = await getCurrentBalance(user.id);
    
    // Resturlaub (aus Urlaubsmodul)
    const vacation = await getVacationBalance(user.id);

    // Letzte Buchungen
    const recentEntries = await pool.query(`
      SELECT entry_type, timestamp, source
      FROM time_entries
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 5
    `, [user.id]);

    res.json({
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        time_model: user.time_model_name
      },
      status: todayStatus,
      today: dayStats,
      week: weekStats,
      month: monthStats,
      balance_minutes: balance,
      vacation_days_remaining: vacation,
      recent_entries: recentEntries.rows
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Benutzerinfo:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Buchungen eines Benutzers abrufen
// ============================================
const getByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, from, to } = req.query;
    
    // Berechtigungsprüfung: Eigene Daten oder manage-Berechtigung
    const canManage = await userHasPermission(req.user.id, 'time_tracking.manage');
    if (parseInt(userId) !== req.user.id && !canManage) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    let query = `
      SELECT te.*, u.first_name || ' ' || u.last_name as corrected_by_name
      FROM time_entries te
      LEFT JOIN users u ON te.corrected_by = u.id
      WHERE te.user_id = $1
    `;
    const params = [userId];

    if (date) {
      query += ` AND DATE(te.timestamp) = $2`;
      params.push(date);
    } else if (from && to) {
      query += ` AND DATE(te.timestamp) BETWEEN $2 AND $3`;
      params.push(from, to);
    }

    query += ` ORDER BY te.timestamp DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der Buchungen:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Selbst-Korrektur (Mitarbeiter trägt fehlende Buchung nach)
// ============================================
const createSelfCorrection = async (req, res) => {
  try {
    const { entry_type, timestamp, correction_reason } = req.body;
    const userId = req.user.id;

    // Validierung
    const validTypes = ['clock_in', 'clock_out', 'break_start', 'break_end'];
    if (!validTypes.includes(entry_type)) {
      return res.status(400).json({ error: 'Ungültiger Buchungstyp' });
    }

    if (!timestamp) {
      return res.status(400).json({ error: 'Zeitstempel erforderlich' });
    }

    if (!correction_reason || correction_reason.trim().length < 3) {
      return res.status(400).json({ error: 'Bitte einen Grund angeben (mind. 3 Zeichen)' });
    }

    // Nur heutiger und gestriger Tag erlaubt
    const entryDate = toLocalDateStr(new Date(timestamp));
    const today = toLocalDateStr(new Date());
    const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));

    if (entryDate !== today && entryDate !== yesterday) {
      return res.status(400).json({ error: 'Selbst-Korrekturen sind nur für heute und gestern möglich' });
    }

    // Buchung einfügen
    const result = await pool.query(`
      INSERT INTO time_entries (
        user_id, entry_type, timestamp, source,
        is_correction, correction_reason, corrected_by
      )
      VALUES ($1, $2, $3, 'self_correction', TRUE, $4, $5)
      RETURNING *
    `, [userId, entry_type, timestamp, correction_reason.trim(), userId]);

    // Tagesübersicht neu berechnen
    await updateDailySummary(userId, new Date(timestamp));

    // needs_review setzen
    await pool.query(`
      UPDATE time_daily_summary
      SET needs_review = TRUE,
          review_note = COALESCE(review_note || ' | ', '') || 'Selbst-Korrektur: ' || $3
      WHERE user_id = $1 AND date = $2
    `, [userId, entryDate, correction_reason.trim()]);

    // Aktualisierten Status zurückgeben
    const dayStats = await getDayStats(userId, new Date(timestamp));
    const validation = await getDayValidation(userId, entryDate);

    res.status(201).json({
      entry: result.rows[0],
      day_stats: dayStats,
      validation
    });
  } catch (error) {
    console.error('Fehler bei Selbst-Korrektur:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Korrektur erstellen
// ============================================
const createCorrection = async (req, res) => {
  try {
    const { user_id, entry_type, timestamp, correction_reason, original_entry_id } = req.body;
    
    if (!correction_reason) {
      return res.status(400).json({ error: 'Korrekturgrund erforderlich' });
    }

    const result = await pool.query(`
      INSERT INTO time_entries (
        user_id, entry_type, timestamp, source, 
        is_correction, correction_reason, corrected_by, original_entry_id
      )
      VALUES ($1, $2, $3, 'correction', TRUE, $4, $5, $6)
      RETURNING *
    `, [user_id, entry_type, timestamp, correction_reason, req.user.id, original_entry_id || null]);

    // Tagesübersicht neu berechnen
    await updateDailySummary(user_id, new Date(timestamp));

    // Validierung des Tages zurückgeben
    const dateStr = toLocalDateStr(new Date(timestamp));
    const validation = await getDayValidation(user_id, dateStr);

    res.status(201).json({ entry: result.rows[0], validation });
  } catch (error) {
    console.error('Fehler beim Erstellen der Korrektur:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Buchung bearbeiten (Typ und/oder Uhrzeit ändern)
// ============================================
const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { entry_type, timestamp, correction_reason } = req.body;

    const canManage = await userHasPermission(req.user.id, 'time_tracking.manage');
    if (!canManage) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    if (!correction_reason) {
      return res.status(400).json({ error: 'Korrekturgrund erforderlich' });
    }

    // Aktuelle Buchung laden
    const current = await pool.query('SELECT * FROM time_entries WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    const entry = current.rows[0];
    const newType = entry_type || entry.entry_type;
    const newTimestamp = timestamp ? new Date(timestamp) : new Date(entry.timestamp);

    // Typ validieren
    const validTypes = ['clock_in', 'clock_out', 'break_start', 'break_end'];
    if (!validTypes.includes(newType)) {
      return res.status(400).json({ error: 'Ungültiger Buchungstyp' });
    }

    const oldDate = toLocalDateStr(new Date(entry.timestamp));
    const newDate = toLocalDateStr(newTimestamp);

    // Buchung aktualisieren
    const result = await pool.query(`
      UPDATE time_entries
      SET entry_type = $1, timestamp = $2,
          is_correction = TRUE, correction_reason = $3, corrected_by = $4
      WHERE id = $5
      RETURNING *
    `, [newType, newTimestamp, correction_reason, req.user.id, id]);

    // Tagesübersicht neu berechnen
    await updateDailySummary(entry.user_id, newTimestamp);

    // Falls Datum gewechselt: auch alten Tag neu berechnen
    if (oldDate !== newDate) {
      await updateDailySummary(entry.user_id, new Date(entry.timestamp));
    }

    // Validierung des neuen Tages
    const validation = await getDayValidation(entry.user_id, newDate);

    res.json({ entry: result.rows[0], validation });
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Buchung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Buchung löschen (nur Korrekturen oder mit Berechtigung)
// ============================================
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Buchung abrufen
    const entry = await pool.query('SELECT * FROM time_entries WHERE id = $1', [id]);
    
    if (entry.rows.length === 0) {
      return res.status(404).json({ error: 'Buchung nicht gefunden' });
    }

    const entryData = entry.rows[0];

    // Löschen
    await pool.query('DELETE FROM time_entries WHERE id = $1', [id]);

    // Tagesübersicht neu berechnen
    await updateDailySummary(entryData.user_id, new Date(entryData.timestamp));

    res.json({ message: 'Buchung gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Buchung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Tag validieren (Reihenfolge prüfen)
// ============================================
const validateDay = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Datum erforderlich (?date=YYYY-MM-DD)' });
    }

    const canManage = await userHasPermission(req.user.id, 'time_tracking.manage');
    const isSelf = parseInt(userId) === req.user.id;
    if (!isSelf && !canManage) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const validation = await getDayValidation(userId, date);
    res.json(validation);
  } catch (error) {
    console.error('Fehler bei der Validierung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Tagesinfo bearbeiten (Notiz, Soll-Override)
// ============================================
const updateDayInfo = async (req, res) => {
  try {
    const { userId, date } = req.params;
    const { note, target_override_minutes, needs_review } = req.body;

    const canManage = await userHasPermission(req.user.id, 'time_tracking.manage');
    if (!canManage) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    // Sicherstellen dass daily_summary existiert
    await updateDailySummary(parseInt(userId), new Date(date));

    // Felder aktualisieren
    const updates = [];
    const params = [];
    let idx = 1;

    if (note !== undefined) {
      updates.push(`note = $${idx++}`);
      params.push(note || null); // leerer String → NULL
    }
    if (target_override_minutes !== undefined) {
      updates.push(`target_override_minutes = $${idx++}`);
      params.push(target_override_minutes); // null = zurück auf Zeitmodell
    }
    if (needs_review !== undefined) {
      updates.push(`needs_review = $${idx++}`);
      params.push(needs_review);
      if (!needs_review) {
        updates.push(`review_note = NULL`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Keine Änderungen' });
    }

    updates.push('updated_at = NOW()');
    params.push(parseInt(userId), date);

    await pool.query(`
      UPDATE time_daily_summary
      SET ${updates.join(', ')}
      WHERE user_id = $${idx++} AND date = $${idx}
    `, params);

    // Bei Soll-Änderung: Tagesübersicht + Monatssaldo neu berechnen
    if (target_override_minutes !== undefined) {
      await updateDailySummary(parseInt(userId), new Date(date));
    }

    const result = await pool.query(
      'SELECT * FROM time_daily_summary WHERE user_id = $1 AND date = $2',
      [parseInt(userId), date]
    );

    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Tagesinfo:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Aktuelle Anwesenheit aller Benutzer
// ============================================
const getCurrentPresence = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM time_current_status ORDER BY status, name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der Anwesenheit:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Fehlbuchungen abrufen
// ============================================
const getMissingEntries = async (req, res) => {
  try {
    const { from, to, user_id } = req.query;
    
    let query = 'SELECT * FROM time_missing_entries WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (from) {
      query += ` AND date >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND date <= $${paramIndex++}`;
      params.push(to);
    }
    if (user_id) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(user_id);
    }

    query += ' ORDER BY date DESC, name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der Fehlbuchungen:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Hilfsfunktionen
// ============================================

// Aktuellen Status eines Benutzers heute ermitteln
async function getCurrentStatus(userId) {
  const result = await pool.query(`
    SELECT entry_type, timestamp
    FROM time_entries
    WHERE user_id = $1 AND DATE(timestamp) = CURRENT_DATE
    ORDER BY timestamp DESC
    LIMIT 1
  `, [userId]);

  if (result.rows.length === 0) {
    return { status: 'absent', since: null };
  }

  const last = result.rows[0];
  let status;
  switch (last.entry_type) {
    case 'clock_in':
    case 'break_end':
      status = 'present';
      break;
    case 'break_start':
      status = 'break';
      break;
    default:
      status = 'absent';
  }

  return { status, since: last.timestamp, last_entry: last.entry_type };
}

// Tagesstatistik berechnen
async function getDayStats(userId, date) {
  const dateStr = toLocalDateStr(date);
  
  const entries = await pool.query(`
    SELECT entry_type, timestamp
    FROM time_entries
    WHERE user_id = $1 AND DATE(timestamp) = $2
    ORDER BY timestamp ASC
  `, [userId, dateStr]);

  let workMinutes = 0;
  let breakMinutes = 0;
  let clockInTime = null;
  let breakStartTime = null;
  let firstClockIn = null;
  let lastClockOut = null;

  for (const entry of entries.rows) {
    const ts = new Date(entry.timestamp);
    
    switch (entry.entry_type) {
      case 'clock_in':
        if (!firstClockIn) firstClockIn = ts;
        clockInTime = ts;
        break;
      case 'clock_out':
        if (clockInTime) {
          workMinutes += (ts - clockInTime) / 60000;
          clockInTime = null;
        }
        lastClockOut = ts;
        break;
      case 'break_start':
        breakStartTime = ts;
        break;
      case 'break_end':
        if (breakStartTime) {
          breakMinutes += (ts - breakStartTime) / 60000;
          breakStartTime = null;
        }
        break;
    }
  }

  // Falls noch eingestempelt, Zeit bis jetzt rechnen
  if (clockInTime) {
    workMinutes += (new Date() - clockInTime) / 60000;
  }

  return {
    worked_minutes: Math.round(workMinutes - breakMinutes),
    break_minutes: Math.round(breakMinutes),
    gross_minutes: Math.round(workMinutes),
    first_clock_in: firstClockIn,
    last_clock_out: lastClockOut
  };
}

// Wochenstatistik
async function getWeekStats(userId, date) {
  // Montag der aktuellen Woche berechnen
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(worked_minutes), 0) as worked_minutes,
      COALESCE(SUM(target_minutes), 0) as target_minutes,
      COALESCE(SUM(overtime_minutes), 0) as overtime_minutes
    FROM time_daily_summary
    WHERE user_id = $1 AND date BETWEEN $2 AND $3
  `, [userId, toLocalDateStr(monday), toLocalDateStr(sunday)]);

  return result.rows[0];
}

// Monatsstatistik
async function getMonthStats(userId, date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const result = await pool.query(`
    SELECT 
      COALESCE(SUM(worked_minutes), 0) as worked_minutes,
      COALESCE(SUM(target_minutes), 0) as target_minutes,
      COALESCE(SUM(overtime_minutes), 0) as overtime_minutes,
      COUNT(*) FILTER (WHERE status = 'complete') as complete_days,
      COUNT(*) FILTER (WHERE has_missing_entries = TRUE) as missing_days
    FROM time_daily_summary
    WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
  `, [userId, year, month]);

  return result.rows[0];
}

// Aktuelles Zeitkonto-Saldo
async function getCurrentBalance(userId) {
  // Letzten Monatssaldo holen
  const lastBalance = await pool.query(`
    SELECT balance_minutes FROM time_balances
    WHERE user_id = $1
    ORDER BY year DESC, month DESC
    LIMIT 1
  `, [userId]);

  // Anfangssaldo des Users
  const userCarryover = await pool.query(
    'SELECT time_balance_carryover FROM users WHERE id = $1',
    [userId]
  );

  const carryover = userCarryover.rows[0]?.time_balance_carryover || 0;
  const lastBalanceMinutes = lastBalance.rows[0]?.balance_minutes || carryover;

  // Plus aktuelle Überstunden diesen Monat
  const now = new Date();
  const monthStats = await getMonthStats(userId, now);

  return lastBalanceMinutes + (monthStats.overtime_minutes || 0);
}

// Resturlaub aus Urlaubsmodul
async function getVacationBalance(userId) {
  try {
    const result = await pool.query(`
      SELECT remaining_days FROM vacation_balances_view
      WHERE user_id = $1 AND year = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [userId]);
    return result.rows[0]?.remaining_days || null;
  } catch {
    return null; // View existiert evtl. nicht
  }
}

// Tagesübersicht aktualisieren
async function updateDailySummary(userId, date) {
  const dateStr = toLocalDateStr(date);
  const dayStats = await getDayStats(userId, date);
  
  // Soll-Stunden für den Tag ermitteln
  // Prüfen ob ein manueller Override gesetzt ist
  const existingOverride = await pool.query(
    'SELECT target_override_minutes FROM time_daily_summary WHERE user_id = $1 AND date = $2',
    [userId, dateStr]
  );
  const targetOverride = existingOverride.rows[0]?.target_override_minutes;

  // Zeitmodell immer laden (für Soll-Stunden und Pausen-Einstellungen)
  const userModel = await pool.query(`
    SELECT tm.* FROM users u
    JOIN time_models tm ON u.time_model_id = tm.id
    WHERE u.id = $1
  `, [userId]);

  const model = userModel.rows[0] || null;

  let targetMinutes = 0;
  if (targetOverride !== null && targetOverride !== undefined) {
    // Manueller Override hat Vorrang
    targetMinutes = targetOverride;
  } else if (model) {
    const dayOfWeek = new Date(date).getDay();
    const dayMap = {
      0: model.sunday_minutes,
      1: model.monday_minutes,
      2: model.tuesday_minutes,
      3: model.wednesday_minutes,
      4: model.thursday_minutes,
      5: model.friday_minutes,
      6: model.saturday_minutes
    };
    targetMinutes = dayMap[dayOfWeek] || 0;
  }

  // Fehlende Buchungen prüfen
  const entries = await pool.query(`
    SELECT entry_type FROM time_entries
    WHERE user_id = $1 AND DATE(timestamp) = $2
    ORDER BY timestamp
  `, [userId, dateStr]);

  const missingTypes = [];
  let hasClockIn = false;
  let hasClockOut = false;
  let breakStartCount = 0;
  let breakEndCount = 0;

  for (const e of entries.rows) {
    if (e.entry_type === 'clock_in') hasClockIn = true;
    if (e.entry_type === 'clock_out') hasClockOut = true;
    if (e.entry_type === 'break_start') breakStartCount++;
    if (e.entry_type === 'break_end') breakEndCount++;
  }

  // Nur vergangene Tage auf fehlende Buchungen prüfen
  const today = toLocalDateStr(new Date());
  if (dateStr < today) {
    if (hasClockIn && !hasClockOut) missingTypes.push('clock_out');
    if (breakStartCount > breakEndCount) missingTypes.push('break_end');
  }

  // Pausenwarnung (aus Zeitmodell)
  if (model) {
    const breakThreshold = model.break_threshold_minutes || 360;        // Default: 6h
    const minBreak = model.min_break_minutes || 30;                     // Default: 30 Min
    const breakTolerance = model.break_tolerance_minutes || 5;          // Default: 5 Min
    const breakBuffer = model.break_threshold_buffer_minutes || 30;     // Default: 30 Min
    
    // Pausenpflicht greift nur wenn BEIDE Bedingungen erfüllt:
    // 1. Brutto > Schwellwert (z.B. 6h)
    // 2. Brutto > Soll + Puffer (z.B. bei Freitag 6h Soll + 30 Min Puffer = 6:30h)
    const pausePflicht = dayStats.gross_minutes > breakThreshold && 
                         dayStats.gross_minutes > (targetMinutes + breakBuffer);
    
    if (pausePflicht && dayStats.break_minutes < (minBreak - breakTolerance)) {
      missingTypes.push('break_short');
    }
  }

  // Status bestimmen
  let status = 'incomplete';
  if (hasClockIn && hasClockOut && missingTypes.length === 0) {
    status = 'complete';
  }

  // Urlaub/Krank/Feiertag prüfen
  const vacation = await pool.query(`
    SELECT v.id, vt.name as type, vt.credits_target_hours
    FROM vacations v
    JOIN vacation_types vt ON v.type_id = vt.id
    WHERE v.user_id = $1 AND $2 BETWEEN v.start_date AND v.end_date AND v.status = 'approved'
  `, [userId, dateStr]);
  
  const holiday = await pool.query(`
    SELECT id FROM holidays WHERE date = $1
  `, [dateStr]);

  // Urlaubsgutschrift berechnen
  let vacationCredit = 0;
  if (vacation.rows.length > 0 && vacation.rows[0].credits_target_hours) {
    vacationCredit = targetMinutes;
  }

  if (vacation.rows.length > 0) {
    status = vacation.rows[0].type;
  } else if (holiday.rows.length > 0) {
    status = 'holiday';
  }

  // Vergangener Tag ohne Stempelungen und ohne Abwesenheit → absent
  if (dateStr < today && entries.rows.length === 0 && status === 'incomplete') {
    status = 'absent';
    missingTypes.push('no_entries');
  }

  // Finale Arbeitszeit: Urlaubsgutschrift + tatsächlich gearbeitet
  const finalWorkedMinutes = vacationCredit + dayStats.worked_minutes;

  // Upsert
  await pool.query(`
    INSERT INTO time_daily_summary (
      user_id, date, target_minutes, worked_minutes, break_minutes, overtime_minutes,
      status, first_clock_in, last_clock_out, has_missing_entries, missing_entry_types,
      vacation_id, holiday_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (user_id, date) DO UPDATE SET
      target_minutes = EXCLUDED.target_minutes,
      worked_minutes = EXCLUDED.worked_minutes,
      break_minutes = EXCLUDED.break_minutes,
      overtime_minutes = EXCLUDED.overtime_minutes,
      status = EXCLUDED.status,
      first_clock_in = EXCLUDED.first_clock_in,
      last_clock_out = EXCLUDED.last_clock_out,
      has_missing_entries = EXCLUDED.has_missing_entries,
      missing_entry_types = EXCLUDED.missing_entry_types,
      vacation_id = EXCLUDED.vacation_id,
      holiday_id = EXCLUDED.holiday_id,
      updated_at = NOW()
  `, [
    userId, dateStr, targetMinutes, finalWorkedMinutes, dayStats.break_minutes,
    finalWorkedMinutes - targetMinutes, status,
    dayStats.first_clock_in, dayStats.last_clock_out,
    missingTypes.length > 0, missingTypes.length > 0 ? missingTypes : null,
    vacation.rows[0]?.id || null, holiday.rows[0]?.id || null
  ]);

  // Monatssaldo automatisch aktualisieren
  const d = new Date(date);
  await calculateMonthBalance(userId, d.getFullYear(), d.getMonth() + 1);
}

// ============================================
// Tag komplett zurücksetzen (Summary + Entries)
// ============================================

const deleteDay = async (req, res) => {
  try {
    const { userId, date } = req.params;

    // Alle Stempelungen des Tages löschen
    const deleted = await pool.query(
      `DELETE FROM time_entries WHERE user_id = $1 AND DATE(timestamp AT TIME ZONE 'Europe/Berlin') = $2`,
      [userId, date]
    );

    // Summary löschen
    await pool.query(
      'DELETE FROM time_daily_summary WHERE user_id = $1 AND date = $2',
      [userId, date]
    );

    // Monatssaldo neu berechnen
    const d = new Date(date + 'T12:00:00');
    await calculateMonthBalance(parseInt(userId), d.getFullYear(), d.getMonth() + 1);

    res.json({ 
      message: 'Tag zurückgesetzt',
      deleted_entries: deleted.rowCount
    });
  } catch (error) {
    console.error('Fehler beim Zurücksetzen des Tages:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Abwesenheitseinträge generieren (Cron-Job)
// ============================================

/**
 * Erstellt time_daily_summary Einträge für Tage ohne Stempelung.
 * Berücksichtigt Feiertage (absence_credits_target Setting) und genehmigte
 * Urlaube/Krank (credits_target_hours pro Antragstyp).
 * 
 * @param {number} userId
 * @param {number} lookbackDays - Wie viele Tage zurückschauen (default 7)
 * @returns {object} { created, entries[] }
 */
async function generateAbsenceEntries(userId, lookbackDays = 7) {
  const results = { created: 0, entries: [] };

  // Zeitmodell des Users + Prüfung ob Zeiterfassung aktiv
  const userModel = await pool.query(`
    SELECT tm.*, u.time_tracking_enabled FROM users u
    JOIN time_models tm ON u.time_model_id = tm.id
    WHERE u.id = $1
  `, [userId]);

  if (userModel.rows.length === 0) return results;
  
  // Zeiterfassung deaktiviert → keine Einträge generieren
  if (!userModel.rows[0].time_tracking_enabled) return results;
  
  const model = userModel.rows[0];

  // Setting: Feiertage Soll-Stunden gutschreiben?
  const creditSetting = await pool.query(
    "SELECT value FROM time_settings WHERE key = 'absence_credits_target'"
  );
  const holidayCreditEnabled = creditSetting.rows[0]?.value === 'true';

  const today = new Date();

  for (let i = 1; i <= lookbackDays; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = toLocalDateStr(checkDate);

    // Eintrag existiert bereits → überspringen
    const existing = await pool.query(
      'SELECT id FROM time_daily_summary WHERE user_id = $1 AND date = $2',
      [userId, dateStr]
    );
    if (existing.rows.length > 0) continue;

    // Soll-Minuten für diesen Wochentag
    const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();
    const dayMap = {
      0: model.sunday_minutes,
      1: model.monday_minutes,
      2: model.tuesday_minutes,
      3: model.wednesday_minutes,
      4: model.thursday_minutes,
      5: model.friday_minutes,
      6: model.saturday_minutes
    };
    const targetMinutes = dayMap[dayOfWeek] || 0;

    // Wochenende mit Soll=0 → kein Eintrag nötig
    if (targetMinutes === 0) continue;

    // Feiertag prüfen
    const holiday = await pool.query(
      'SELECT id, name, is_half_day FROM holidays WHERE date = $1',
      [dateStr]
    );

    // Genehmigter Urlaub/Krank prüfen
    const vacation = await pool.query(`
      SELECT v.id, vt.name as type, vt.credits_target_hours
      FROM vacations v
      JOIN vacation_types vt ON v.type_id = vt.id
      WHERE v.user_id = $1 AND $2 BETWEEN v.start_date AND v.end_date AND v.status = 'approved'
    `, [userId, dateStr]);

    let status = 'absent';
    let workedMinutes = 0;
    let effectiveTarget = targetMinutes;
    let vacationId = null;
    let holidayId = null;
    let hasMissing = false;
    let missingTypes = null;

    if (holiday.rows.length > 0) {
      status = 'holiday';
      holidayId = holiday.rows[0].id;
      // Halber Feiertag → halbes Soll
      if (holiday.rows[0].is_half_day) {
        effectiveTarget = Math.round(targetMinutes / 2);
      }
      // Feiertage gutschreiben (globale Setting)
      if (holidayCreditEnabled) {
        workedMinutes = effectiveTarget;
      }
    } else if (vacation.rows.length > 0) {
      status = vacation.rows[0].type;
      vacationId = vacation.rows[0].id;
      // Gutschreibung pro Typ (credits_target_hours)
      if (vacation.rows[0].credits_target_hours) {
        workedMinutes = targetMinutes;
      }
    } else {
      // Arbeitstag ohne Stempelung und ohne Abwesenheit
      hasMissing = true;
      missingTypes = ['no_entries'];
    }

    // Eintrag erstellen
    await pool.query(`
      INSERT INTO time_daily_summary (
        user_id, date, target_minutes, worked_minutes, break_minutes, overtime_minutes,
        status, has_missing_entries, missing_entry_types, vacation_id, holiday_id
      ) VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, $10)
    `, [
      userId, dateStr, effectiveTarget, workedMinutes,
      workedMinutes - effectiveTarget,
      status, hasMissing, missingTypes,
      vacationId, holidayId
    ]);

    results.created++;
    results.entries.push({ date: dateStr, status, target: effectiveTarget, worked: workedMinutes });

    // Monatssaldo aktualisieren
    const d = new Date(dateStr + 'T12:00:00');
    await calculateMonthBalance(userId, d.getFullYear(), d.getMonth() + 1);
  }

  return results;
}

module.exports = {
  stamp,
  stampByIdentifier,
  getUserInfoByIdentifier,
  getByUser,
  createCorrection,
  createSelfCorrection,
  updateEntry,
  remove,
  validateDay,
  updateDayInfo,
  getCurrentPresence,
  getMissingEntries,
  updateDailySummary,
  autoCloseOpenDays,
  deleteDay,
  generateAbsenceEntries
};
