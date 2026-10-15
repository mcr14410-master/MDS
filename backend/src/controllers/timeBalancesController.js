const pool = require('../config/db');
const { pipePdf, abortPdfResponse } = require('../utils/pdfResponse');
const { toDateStr } = require('../utils/workingDays');

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
// Zeitkonto eines Benutzers abrufen
// ============================================
const getByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year } = req.query;
    
    // Berechtigungsprüfung
    const canManage = await userHasPermission(req.user.id, 'time_tracking.manage');
    if (parseInt(userId) !== req.user.id && !canManage) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    const targetYear = year || new Date().getFullYear();

    const result = await pool.query(`
      SELECT * FROM time_balances
      WHERE user_id = $1 AND year = $2
      ORDER BY month ASC
    `, [userId, targetYear]);

    // Aktuelles Gesamtsaldo berechnen
    const totalBalance = await calculateCurrentBalance(userId);

    res.json({
      monthly: result.rows,
      current_balance_minutes: totalBalance
    });
  } catch (error) {
    console.error('Fehler beim Abrufen des Zeitkontos:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Alle Zeitkonten abrufen (Übersicht für Verwaltung)
// ============================================
const getAll = async (req, res) => {
  try {
    const { year, month } = req.query;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    const result = await pool.query(`
      SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as name,
        u.time_tracking_enabled,
        tb.balance_minutes,
        tb.target_minutes,
        tb.worked_minutes,
        tb.overtime_minutes,
        tb.adjustment_minutes,
        tb.payout_minutes,
        tb.carryover_minutes,
        tm.name as time_model_name
      FROM users u
      LEFT JOIN time_balances tb ON u.id = tb.user_id AND tb.year = $1 AND tb.month = $2
      LEFT JOIN time_models tm ON u.time_model_id = tm.id
      WHERE u.time_tracking_enabled = TRUE AND u.is_active = TRUE
      ORDER BY u.last_name, u.first_name
    `, [targetYear, targetMonth]);

    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der Zeitkonten:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Monatssaldo berechnen und speichern
// ============================================
const calculateMonth = async (req, res) => {
  try {
    const { userId, year, month } = req.body;

    const balance = await calculateMonthBalance(userId, year, month);
    
    res.json(balance);
  } catch (error) {
    console.error('Fehler beim Berechnen des Monatssaldos:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Manuelle Anpassung (Korrektur)
// ============================================
const createAdjustment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month, adjustment_minutes, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Begründung erforderlich' });
    }

    // Sicherstellen dass Eintrag existiert
    await ensureBalanceEntry(userId, year, month);

    // Einzelnen Eintrag in adjustments Tabelle erstellen
    const adjResult = await pool.query(`
      INSERT INTO time_balance_adjustments (user_id, year, month, minutes, reason, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, year, month, adjustment_minutes, reason, req.user?.id || null]);

    // Summe in time_balances synchronisieren
    await syncAdjustmentMinutes(userId, year, month);

    // Folgemonate kaskadierend neu berechnen
    const nextMonth = month === 12 ? 1 : parseInt(month) + 1;
    const nextYear = month === 12 ? parseInt(year) + 1 : parseInt(year);
    await recalculateFromMonth(userId, nextYear, nextMonth);

    res.json(adjResult.rows[0]);
  } catch (error) {
    console.error('Fehler beim Erstellen der Anpassung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Anpassung löschen
// ============================================
const deleteAdjustment = async (req, res) => {
  try {
    const { adjustmentId } = req.params;

    // Eintrag laden (für user_id/year/month)
    const adj = await pool.query(
      'SELECT * FROM time_balance_adjustments WHERE id = $1',
      [adjustmentId]
    );

    if (adj.rows.length === 0) {
      return res.status(404).json({ error: 'Anpassung nicht gefunden' });
    }

    const { user_id, year, month } = adj.rows[0];

    // Löschen
    await pool.query('DELETE FROM time_balance_adjustments WHERE id = $1', [adjustmentId]);

    // Summe in time_balances synchronisieren
    await syncAdjustmentMinutes(user_id, year, month);

    // Folgemonate kaskadierend neu berechnen
    const nextMonth = month === 12 ? 1 : parseInt(month) + 1;
    const nextYear = month === 12 ? parseInt(year) + 1 : parseInt(year);
    await recalculateFromMonth(user_id, nextYear, nextMonth);

    res.json({ message: 'Anpassung gelöscht', deleted: adj.rows[0] });
  } catch (error) {
    console.error('Fehler beim Löschen der Anpassung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Anpassungen eines Monats abrufen
// ============================================
const getAdjustments = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    const result = await pool.query(`
      SELECT a.*,
             COALESCE(u.first_name || ' ' || u.last_name, u.username) as created_by_name
      FROM time_balance_adjustments a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.user_id = $1 AND a.year = $2 AND a.month = $3
      ORDER BY a.created_at ASC
    `, [userId, year, month]);

    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Laden der Anpassungen:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

/**
 * Synchronize adjustment_minutes in time_balances from adjustments table
 */
async function syncAdjustmentMinutes(userId, year, month) {
  const sumResult = await pool.query(`
    SELECT COALESCE(SUM(minutes), 0) as total
    FROM time_balance_adjustments
    WHERE user_id = $1 AND year = $2 AND month = $3
  `, [userId, year, month]);

  const total = parseInt(sumResult.rows[0].total);

  await pool.query(`
    UPDATE time_balances SET
      adjustment_minutes = $1,
      balance_minutes = carryover_minutes + overtime_minutes + $1 - payout_minutes,
      updated_at = NOW()
    WHERE user_id = $2 AND year = $3 AND month = $4
  `, [total, userId, year, month]);
}

// ============================================
// Auszahlung erfassen
// ============================================
const createPayout = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month, payout_minutes, payout_date } = req.body;

    if (!payout_minutes || payout_minutes <= 0) {
      return res.status(400).json({ error: 'Auszahlungsbetrag muss positiv sein' });
    }

    // Sicherstellen dass Eintrag existiert
    await ensureBalanceEntry(userId, year, month);

    const result = await pool.query(`
      UPDATE time_balances SET
        payout_minutes = payout_minutes + $1,
        payout_date = $2,
        balance_minutes = balance_minutes - $1,
        updated_at = NOW()
      WHERE user_id = $3 AND year = $4 AND month = $5
      RETURNING *
    `, [payout_minutes, payout_date || new Date(), userId, year, month]);

    // Folgemonate kaskadierend neu berechnen
    const nextMonth = month === 12 ? 1 : parseInt(month) + 1;
    const nextYear = month === 12 ? parseInt(year) + 1 : parseInt(year);
    await recalculateFromMonth(userId, nextYear, nextMonth);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Erfassen der Auszahlung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Tagesübersichten eines Benutzers (für Monatsansicht)
// ============================================
const getDailySummaries = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month, from, to } = req.query;
    
    // Berechtigungsprüfung
    const canManage = await userHasPermission(req.user.id, 'time_tracking.manage');
    if (parseInt(userId) !== req.user.id && !canManage) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    let query = `
      SELECT ds.*, 
             vt.name as vacation_type,
             h.name as holiday_name,
             h.is_half_day
      FROM time_daily_summary ds
      LEFT JOIN vacations v ON ds.vacation_id = v.id
      LEFT JOIN vacation_types vt ON v.type_id = vt.id
      LEFT JOIN holidays h ON ds.holiday_id = h.id
      WHERE ds.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;

    if (year && month) {
      query += ` AND EXTRACT(YEAR FROM ds.date) = $${paramIndex++} AND EXTRACT(MONTH FROM ds.date) = $${paramIndex++}`;
      params.push(year, month);
    } else if (from && to) {
      query += ` AND ds.date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(from, to);
    }

    query += ' ORDER BY ds.date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der Tagesübersichten:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Wochenübersicht
// ============================================
const getWeekSummary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date } = req.query; // Beliebiger Tag der Woche
    
    // Berechtigungsprüfung
    const canManage = await userHasPermission(req.user.id, 'time_tracking.manage');
    if (parseInt(userId) !== req.user.id && !canManage) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }

    // Montag und Sonntag der Woche berechnen
    const d = new Date(date || new Date());
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const mondayStr = toLocalDateStr(monday);
    const sundayStr = toLocalDateStr(sunday);

    const result = await pool.query(`
      SELECT ds.*, 
             vt.name as vacation_type,
             h.name as holiday_name
      FROM time_daily_summary ds
      LEFT JOIN vacations v ON ds.vacation_id = v.id
      LEFT JOIN vacation_types vt ON v.type_id = vt.id
      LEFT JOIN holidays h ON ds.holiday_id = h.id
      WHERE ds.user_id = $1 AND ds.date BETWEEN $2 AND $3
      ORDER BY ds.date ASC
    `, [userId, mondayStr, sundayStr]);

    // Summen berechnen (nur abgeschlossene Tage)
    const todayStr = toLocalDateStr(new Date());
    const totals = result.rows.reduce((acc, row) => {
      const isIncompleteToday = toLocalDateStr(new Date(row.date)) === todayStr && row.status !== 'complete';
      if (!isIncompleteToday) {
        acc.target_minutes += row.target_minutes || 0;
        acc.worked_minutes += row.worked_minutes || 0;
        acc.break_minutes += row.break_minutes || 0;
        acc.overtime_minutes += row.overtime_minutes || 0;
      }
      return acc;
    }, { target_minutes: 0, worked_minutes: 0, break_minutes: 0, overtime_minutes: 0 });

    res.json({
      week_start: mondayStr,
      week_end: sundayStr,
      days: result.rows,
      totals
    });
  } catch (error) {
    console.error('Fehler beim Abrufen der Wochenübersicht:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Hilfsfunktionen
// ============================================

async function calculateCurrentBalance(userId) {
  // Anfangssaldo des Users
  const userResult = await pool.query(
    'SELECT time_balance_carryover FROM users WHERE id = $1',
    [userId]
  );
  const carryover = userResult.rows[0]?.time_balance_carryover || 0;

  // Alle Monatssalden summieren
  const balanceResult = await pool.query(`
    SELECT 
      COALESCE(SUM(overtime_minutes), 0) as total_overtime,
      COALESCE(SUM(adjustment_minutes), 0) as total_adjustments,
      COALESCE(SUM(payout_minutes), 0) as total_payouts
    FROM time_balances
    WHERE user_id = $1
  `, [userId]);

  const totals = balanceResult.rows[0];
  return carryover + 
         parseInt(totals.total_overtime) + 
         parseInt(totals.total_adjustments) - 
         parseInt(totals.total_payouts);
}

async function calculateMonthBalance(userId, year, month) {
  // Tagesübersichten des Monats summieren (nur abgeschlossene Tage)
  const summaryResult = await pool.query(`
    SELECT 
      COALESCE(SUM(target_minutes), 0) as target_minutes,
      COALESCE(SUM(worked_minutes), 0) as worked_minutes,
      COALESCE(SUM(overtime_minutes), 0) as overtime_minutes
    FROM time_daily_summary
    WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
      AND (date != CURRENT_DATE OR status = 'complete')
  `, [userId, year, month]);

  const summary = summaryResult.rows[0];

  // Übertrag vom Vormonat
  let carryover = 0;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  
  const prevBalance = await pool.query(`
    SELECT balance_minutes FROM time_balances
    WHERE user_id = $1 AND year = $2 AND month = $3
  `, [userId, prevYear, prevMonth]);

  if (prevBalance.rows.length > 0) {
    carryover = prevBalance.rows[0].balance_minutes;
  } else {
    // Anfangssaldo des Users wenn kein Vormonat
    const userResult = await pool.query(
      'SELECT time_balance_carryover FROM users WHERE id = $1',
      [userId]
    );
    carryover = userResult.rows[0]?.time_balance_carryover || 0;
  }

  // Upsert
  const result = await pool.query(`
    INSERT INTO time_balances (
      user_id, year, month, 
      target_minutes, worked_minutes, overtime_minutes,
      carryover_minutes, balance_minutes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (user_id, year, month) DO UPDATE SET
      target_minutes = EXCLUDED.target_minutes,
      worked_minutes = EXCLUDED.worked_minutes,
      overtime_minutes = EXCLUDED.overtime_minutes,
      carryover_minutes = EXCLUDED.carryover_minutes,
      balance_minutes = EXCLUDED.carryover_minutes + EXCLUDED.overtime_minutes + 
                        time_balances.adjustment_minutes - time_balances.payout_minutes,
      updated_at = NOW()
    RETURNING *
  `, [
    userId, year, month,
    summary.target_minutes, summary.worked_minutes, summary.overtime_minutes,
    carryover, carryover + parseInt(summary.overtime_minutes)
  ]);

  return result.rows[0];
}

/**
 * Recalculate all month balances from a given month forward to current month.
 * Used after adjustments/payouts to cascade carryover changes.
 */
async function recalculateFromMonth(userId, year, month) {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  let y = year;
  let m = month;

  while (y < nowYear || (y === nowYear && m <= nowMonth)) {
    await calculateMonthBalance(userId, y, m);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
}

async function ensureBalanceEntry(userId, year, month) {
  const exists = await pool.query(
    'SELECT id FROM time_balances WHERE user_id = $1 AND year = $2 AND month = $3',
    [userId, year, month]
  );

  if (exists.rows.length === 0) {
    await calculateMonthBalance(userId, year, month);
  }
}

// ============================================
// Alle Salden aller User neu berechnen
// ============================================
const recalculateAll = async (req, res) => {
  try {
    // Alle aktiven User mit Zeiterfassung
    const users = await pool.query(
      'SELECT id, first_name, last_name FROM users WHERE time_tracking_enabled = TRUE AND is_active = TRUE'
    );

    const results = [];

    for (const user of users.rows) {
      // Frühesten Monat mit Eintrag finden
      const earliest = await pool.query(
        'SELECT year, month FROM time_balances WHERE user_id = $1 ORDER BY year ASC, month ASC LIMIT 1',
        [user.id]
      );

      if (earliest.rows.length > 0) {
        const { year, month } = earliest.rows[0];
        await recalculateFromMonth(user.id, year, month);
        results.push({ user_id: user.id, name: `${user.first_name} ${user.last_name}`, from: `${year}-${String(month).padStart(2, '0')}` });
      }
    }

    res.json({ message: `${results.length} Benutzer neu berechnet`, results });
  } catch (error) {
    console.error('Fehler bei Gesamt-Neuberechnung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Export-Funktionen
// ============================================

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                     'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function formatMinsExport(mins) {
  if (mins === null || mins === undefined) return '';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  const sign = mins < 0 ? '-' : '';
  return `${sign}${h}:${m.toString().padStart(2, '0')}`;
}

// ============================================
// Zeitnachweis (Payroll): Stichtag = Ende des gewählten Monats, im laufenden Monat heute
// ============================================

function monthEndStr(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function formatStichtag(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}.${m}.`;
}

/**
 * Urlaubskonto zum Stichtag: Monatsende, höchstens heute (Europe/Berlin) – sonst zählt im
 * laufenden Monat künftiger genehmigter Urlaub schon als genommen.
 * Genommen = genehmigter Urlaub bis zum Stichtag (Urlaub über den Stichtag anteilig),
 * Rest = Verfügbar − genommen. Danach genehmigter / beantragter Urlaub nur als Info.
 */
async function getPayrollVacation(userId, year, month) {
  // Lazy require: vacationsController lädt seinerseits diesen Controller
  const { calculateWorkingDaysByYear } = require('./vacationsController');
  const monthEnd = monthEndStr(year, month);
  const today = toDateStr(new Date());
  const stichtag = today < monthEnd ? today : monthEnd;

  const entitlementResult = await pool.query(`
    SELECT total_days, carried_over, adjustment, available_days
    FROM vacation_balances WHERE user_id = $1 AND year = $2 LIMIT 1
  `, [userId, year]);
  const entitlement = entitlementResult.rows[0] || {
    total_days: 0, carried_over: 0, adjustment: 0, available_days: 0
  };

  const vacationsResult = await pool.query(`
    SELECT v.start_date::text AS start_date, v.end_date::text AS end_date, v.status,
           COALESCE((v.days_by_year->>($2::int)::text)::numeric, 0) AS share
    FROM vacations v
    JOIN vacation_types vt ON vt.id = v.type_id
    WHERE v.user_id = $1 AND v.status IN ('approved', 'pending') AND vt.affects_balance = true
      AND v.start_date <= make_date($2::int, 12, 31) AND v.end_date >= make_date($2::int, 1, 1)
  `, [userId, year]);

  let taken = 0;
  let plannedAfter = 0;
  let pending = 0;
  for (const v of vacationsResult.rows) {
    const share = parseFloat(v.share);
    if (v.status === 'pending') { pending += share; continue; }
    if (v.end_date <= stichtag) {
      taken += share;
    } else if (v.start_date > stichtag) {
      plannedAfter += share;
    } else {
      // läuft über den Stichtag: Anteil bis Stichtag (innerhalb des Jahres)
      const from = v.start_date < `${year}-01-01` ? `${year}-01-01` : v.start_date;
      const byYear = await calculateWorkingDaysByYear(userId, from, stichtag);
      const part = Math.min(share, byYear[year] || 0);
      taken += part;
      plannedAfter += share - part;
    }
  }

  const available = parseFloat(entitlement.available_days || 0);
  return {
    stichtag: formatStichtag(stichtag),
    total_days: parseFloat(entitlement.total_days || 0),
    carried_over: parseFloat(entitlement.carried_over || 0),
    adjustment: parseFloat(entitlement.adjustment || 0),
    available_days: available,
    taken_days: taken,
    planned_after_days: plannedAfter,
    pending_days: pending,
    remaining_days: available - taken
  };
}

/**
 * Zeitkonto des Monats inkl. Korrektur und Auszahlung aus time_balances
 * (Saldo neu = Saldo Vormonat + Überstunden des Monats + Korrektur − Auszahlung)
 */
async function getPayrollTimeAccount(user, year, month) {
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }

  const prevBalanceResult = await pool.query(`
    SELECT balance_minutes FROM time_balances
    WHERE user_id = $1 AND year = $2 AND month = $3
  `, [user.id, prevYear, prevMonth]);
  const saldoVormonat = prevBalanceResult.rows.length > 0
    ? prevBalanceResult.rows[0].balance_minutes
    : (user.time_balance_carryover || 0);

  const monthSumResult = await pool.query(`
    SELECT COALESCE(SUM(worked_minutes), 0) as total_worked,
           COALESCE(SUM(target_minutes), 0) as total_target,
           COALESCE(SUM(overtime_minutes), 0) as total_overtime
    FROM time_daily_summary
    WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
  `, [user.id, year, month]);
  const monthSum = monthSumResult.rows[0];

  const monthBalanceResult = await pool.query(`
    SELECT adjustment_minutes, payout_minutes FROM time_balances
    WHERE user_id = $1 AND year = $2 AND month = $3
  `, [user.id, year, month]);
  const adjustment = parseInt(monthBalanceResult.rows[0]?.adjustment_minutes || 0);
  const payout = parseInt(monthBalanceResult.rows[0]?.payout_minutes || 0);

  const monthOvertime = parseInt(monthSum.total_overtime || 0);
  return {
    target: parseInt(monthSum.total_target),
    worked: parseInt(monthSum.total_worked),
    saldoVormonat,
    monthOvertime,
    adjustment,
    payout,
    saldoNeu: saldoVormonat + monthOvertime + adjustment - payout
  };
}

/**
 * Kästen „Urlaubskonto“ und „Zeitkonto“ im Zeitnachweis
 * @returns {number} Höhe der Kästen
 */
function drawPayrollBoxes(doc, boxTop, vacation, account, monthName) {
  const boxHeight = 140;
  const boxWidth = 250;
  const valueOpts = { width: 100, align: 'right' };
  const line = (label, value, x, y, color) => {
    doc.text(label, x, y);
    if (color) doc.fillColor(color);
    doc.text(value, x + 130, y, valueOpts);
    doc.fillColor('black');
  };
  const days = (n) => `${Number(n).toFixed(2).replace(/\.?0+$/, '')} Tage`;

  // Urlaubskonto (links) – Stand Monatsende
  doc.save();
  doc.roundedRect(40, boxTop, boxWidth, boxHeight, 5).stroke('#d1d5db');
  doc.restore();
  doc.fontSize(10).font('Helvetica-Bold').text(`Urlaubskonto (Stand ${vacation.stichtag})`, 50, boxTop + 8);
  doc.font('Helvetica').fontSize(9);
  let y = boxTop + 25;
  line('Jahresanspruch:', days(vacation.total_days), 50, y); y += 13;
  line('Übertrag Vorjahr:', days(vacation.carried_over), 50, y); y += 13;
  if (vacation.adjustment !== 0) { line('Korrektur:', days(vacation.adjustment), 50, y); y += 13; }
  line(`Genommen bis ${vacation.stichtag}:`, days(vacation.taken_days), 50, y); y += 13;
  doc.font('Helvetica-Bold');
  line(`Resturlaub ${vacation.stichtag}:`, days(vacation.remaining_days), 50, y,
    vacation.remaining_days >= 0 ? '#16a34a' : '#dc2626');
  doc.font('Helvetica'); y += 17;
  doc.fontSize(8).fillColor('#6b7280');
  line('Genehmigt, nach Stichtag:', days(vacation.planned_after_days), 50, y, '#6b7280'); y += 11;
  doc.fillColor('#6b7280');
  line('Beantragt:', days(vacation.pending_days), 50, y, '#6b7280');
  doc.fontSize(9);

  // Zeitkonto (rechts)
  doc.save();
  doc.roundedRect(305, boxTop, boxWidth, boxHeight, 5).stroke('#d1d5db');
  doc.restore();
  doc.fontSize(10).font('Helvetica-Bold').text('Zeitkonto', 315, boxTop + 8);
  doc.font('Helvetica').fontSize(9);
  const sign = (m) => (m >= 0 ? '#16a34a' : '#dc2626');
  y = boxTop + 25;
  line(`Soll ${monthName}:`, formatMinsExport(account.target), 315, y); y += 13;
  line(`Ist ${monthName}:`, formatMinsExport(account.worked), 315, y); y += 13;
  line('Saldo Vormonat:', formatMinsExport(account.saldoVormonat), 315, y, sign(account.saldoVormonat)); y += 13;
  line(`+/- ${monthName}:`, formatMinsExport(account.monthOvertime), 315, y, sign(account.monthOvertime)); y += 13;
  if (account.adjustment !== 0) { line('Korrektur:', formatMinsExport(account.adjustment), 315, y, sign(account.adjustment)); y += 13; }
  if (account.payout !== 0) { line('Auszahlung:', formatMinsExport(-account.payout), 315, y, '#dc2626'); y += 13; }
  doc.moveTo(315, y + 3).lineTo(545, y + 3).stroke(); y += 10;
  doc.font('Helvetica-Bold');
  line('Saldo neu:', formatMinsExport(account.saldoNeu), 315, y, sign(account.saldoNeu));
  doc.font('Helvetica');

  return boxHeight;
}

/**
 * Gemeinsame Daten-Abfrage für alle Export-Formate
 */
async function getExportData(userId, targetYear, targetMonth) {
  const userResult = await pool.query(
    `SELECT first_name, last_name, username FROM users WHERE id = $1`,
    [userId]
  );
  if (userResult.rows.length === 0) return null;

  const user = userResult.rows[0];
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

  const result = await pool.query(`
    SELECT 
      ds.date,
      ds.target_minutes,
      ds.worked_minutes,
      ds.break_minutes,
      ds.overtime_minutes,
      ds.status,
      ds.first_clock_in,
      ds.last_clock_out,
      vt.name as vacation_type,
      h.name as holiday_name
    FROM time_daily_summary ds
    LEFT JOIN vacations v ON ds.vacation_id = v.id
    LEFT JOIN vacation_types vt ON v.type_id = vt.id
    LEFT JOIN holidays h ON ds.holiday_id = h.id
    WHERE ds.user_id = $1 
      AND EXTRACT(YEAR FROM ds.date) = $2 
      AND EXTRACT(MONTH FROM ds.date) = $3
    ORDER BY ds.date ASC
  `, [userId, targetYear, targetMonth]);

  return { userName, rows: result.rows };
}

function formatRowForExport(row) {
  const date = new Date(row.date);
  const weekday = WEEKDAYS[date.getDay()];
  const dateStr = date.toLocaleDateString('de-DE');
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const clockIn = row.first_clock_in 
    ? new Date(row.first_clock_in).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
    : '';
  const clockOut = row.last_clock_out
    ? new Date(row.last_clock_out).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
    : '';

  let status = row.status || '';
  if (row.vacation_type) status = row.vacation_type;
  if (row.holiday_name) status = `Feiertag: ${row.holiday_name}`;

  return { dateStr, weekday, clockIn, clockOut, status, isWeekend };
}

/**
 * Berechtigungsprüfung für Export
 */
async function checkExportPermission(req, userId) {
  const canManage = await userHasPermission(req.user.id, 'time_tracking.manage');
  if (parseInt(userId) !== req.user.id && !canManage) {
    return false;
  }
  return true;
}

/**
 * Export Monatsdaten als CSV
 * GET /api/time-tracking/export/csv/:userId
 */
async function exportCSV(req, res) {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    if (!(await checkExportPermission(req, userId))) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const data = await getExportData(userId, targetYear, targetMonth);
    if (!data) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    const { userName, rows } = data;

    let csv = `Stundennachweis ${MONTH_NAMES[targetMonth - 1]} ${targetYear}\n`;
    csv += `Mitarbeiter: ${userName}\n\n`;
    csv += `Datum;Wochentag;Kommen;Gehen;Pause;Arbeitszeit;Soll;Differenz;Status\n`;

    let totalWorked = 0;
    let totalTarget = 0;

    rows.forEach(row => {
      const r = formatRowForExport(row);
      csv += `${r.dateStr};${r.weekday};${r.clockIn};${r.clockOut};${formatMinsExport(row.break_minutes)};${formatMinsExport(row.worked_minutes)};${formatMinsExport(row.target_minutes)};${formatMinsExport(row.overtime_minutes)};${r.status}\n`;
      totalWorked += row.worked_minutes || 0;
      totalTarget += row.target_minutes || 0;
    });

    csv += `\nSumme;;;; ;${formatMinsExport(totalWorked)};${formatMinsExport(totalTarget)};${formatMinsExport(totalWorked - totalTarget)};\n`;

    const filename = `Stundennachweis_${userName.replace(/\s+/g, '_')}_${targetYear}-${String(targetMonth).padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);

  } catch (error) {
    console.error('Fehler beim CSV-Export:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

/**
 * Export Monatsdaten als PDF
 * GET /api/time-tracking/export/pdf/:userId
 */
async function exportPDF(req, res) {
  try {
    const PDFDocument = require('pdfkit');
    const { userId } = req.params;
    const { year, month } = req.query;

    if (!(await checkExportPermission(req, userId))) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const data = await getExportData(userId, targetYear, targetMonth);
    if (!data) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    const { userName, rows } = data;

    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: `Stundennachweis ${MONTH_NAMES[targetMonth - 1]} ${targetYear}`,
        Author: 'MDS Zeiterfassung'
      }
    });

    const filename = `Stundennachweis_${userName.replace(/\s+/g, '_')}_${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    pipePdf(doc, res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold')
       .text('Stundennachweis', { align: 'center' });
    doc.fontSize(14).font('Helvetica')
       .text(`${MONTH_NAMES[targetMonth - 1]} ${targetYear}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
       .text(`Mitarbeiter: ${userName}`, { align: 'left' });
    doc.moveDown();

    // Tabellen-Header
    const colWidths = [60, 35, 45, 45, 40, 55, 50, 50, 75];
    const headers = ['Datum', 'Tag', 'Kommen', 'Gehen', 'Pause', 'Arbeitszeit', 'Soll', 'Diff.', 'Status'];
    const tableTop = doc.y;
    
    // Header-Hintergrund
    doc.save();
    doc.rect(40, tableTop - 2, 515, 14).fill('#e5e7eb');
    doc.restore();

    doc.fontSize(9).font('Helvetica-Bold').fillColor('black');
    let x = 40;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    // Datenzeilen
    let y = tableTop + 18;
    let totalWorked = 0;
    let totalTarget = 0;

    const drawRow = (rowData, yPos) => {
      x = 40;
      doc.font('Helvetica').fontSize(8).fillColor('black');
      rowData.forEach((cell, i) => {
        doc.text(String(cell), x, yPos, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });
    };

    rows.forEach(row => {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }

      const r = formatRowForExport(row);

      const rowData = [
        r.dateStr, r.weekday, r.clockIn || '-', r.clockOut || '-',
        formatMinsExport(row.break_minutes) || '-',
        formatMinsExport(row.worked_minutes) || '-',
        formatMinsExport(row.target_minutes) || '-',
        formatMinsExport(row.overtime_minutes) || '-',
        r.status
      ];

      // Wochenende: Hintergrund ZUERST zeichnen
      if (r.isWeekend) {
        doc.save();
        doc.rect(40, y - 2, 515, 12).fill('#f3f4f6');
        doc.restore();
      }

      drawRow(rowData, y);

      totalWorked += row.worked_minutes || 0;
      totalTarget += row.target_minutes || 0;
      y += 13;
    });

    // Summenzeile
    y += 5;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#000000').stroke();
    y += 8;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
    doc.text('Summe:', 40, y);
    doc.text(formatMinsExport(totalWorked), 260, y);
    doc.text(formatMinsExport(totalTarget), 315, y);
    const diff = totalWorked - totalTarget;
    doc.fillColor(diff >= 0 ? '#16a34a' : '#dc2626');
    doc.text(formatMinsExport(diff), 365, y);

    // Footer
    doc.fillColor('#6b7280').fontSize(7).font('Helvetica')
       .text(
         `Erstellt am ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} | MDS Zeiterfassung`, 
         40, 780, { align: 'right', width: 515 }
       );

    doc.end();

  } catch (error) {
    console.error('Fehler beim PDF-Export:', error);
    if (abortPdfResponse(res)) return;
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

/**
 * Export Monatsdaten als Excel
 * GET /api/time-tracking/export/excel/:userId
 */
async function exportExcel(req, res) {
  try {
    const ExcelJS = require('exceljs');
    const { userId } = req.params;
    const { year, month } = req.query;

    if (!(await checkExportPermission(req, userId))) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const data = await getExportData(userId, targetYear, targetMonth);
    if (!data) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    const { userName, rows } = data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MDS Zeiterfassung';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(`${MONTH_NAMES[targetMonth - 1]} ${targetYear}`);

    // Titel
    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Stundennachweis ${MONTH_NAMES[targetMonth - 1]} ${targetYear}`;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:I2');
    const nameCell = sheet.getCell('A2');
    nameCell.value = `Mitarbeiter: ${userName}`;
    nameCell.font = { size: 12 };

    // Leerzeile
    sheet.getRow(3).values = [];

    // Spaltenbreiten
    sheet.columns = [
      { key: 'date', width: 14 },
      { key: 'weekday', width: 6 },
      { key: 'clockIn', width: 10 },
      { key: 'clockOut', width: 10 },
      { key: 'break', width: 10 },
      { key: 'worked', width: 12 },
      { key: 'target', width: 10 },
      { key: 'diff', width: 10 },
      { key: 'status', width: 18 }
    ];

    // Header-Zeile
    const headerRow = sheet.getRow(4);
    headerRow.values = ['Datum', 'Tag', 'Kommen', 'Gehen', 'Pause', 'Arbeitszeit', 'Soll', 'Differenz', 'Status'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.eachCell(cell => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    // Datenzeilen
    let totalWorked = 0;
    let totalTarget = 0;
    let rowIndex = 5;

    rows.forEach(row => {
      const r = formatRowForExport(row);
      const excelRow = sheet.getRow(rowIndex);
      
      excelRow.values = [
        r.dateStr,
        r.weekday,
        r.clockIn || '-',
        r.clockOut || '-',
        formatMinsExport(row.break_minutes) || '-',
        formatMinsExport(row.worked_minutes) || '-',
        formatMinsExport(row.target_minutes) || '-',
        formatMinsExport(row.overtime_minutes) || '-',
        r.status
      ];

      // Wochenende grau hinterlegen
      if (r.isWeekend) {
        excelRow.eachCell({ includeEmpty: true }, cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        });
      }

      // Differenz einfärben
      const diffCell = excelRow.getCell(8);
      if (row.overtime_minutes && row.overtime_minutes < 0) {
        diffCell.font = { color: { argb: 'FFDC2626' } };
      } else if (row.overtime_minutes && row.overtime_minutes > 0) {
        diffCell.font = { color: { argb: 'FF16A34A' } };
      }

      // Zentrierung für Zeit-Spalten
      [3, 4, 5, 6, 7, 8].forEach(col => {
        excelRow.getCell(col).alignment = { horizontal: 'center' };
      });

      totalWorked += row.worked_minutes || 0;
      totalTarget += row.target_minutes || 0;
      rowIndex++;
    });

    // Summenzeile
    rowIndex++;
    const sumRow = sheet.getRow(rowIndex);
    sumRow.values = ['Summe', '', '', '', '', formatMinsExport(totalWorked), formatMinsExport(totalTarget), formatMinsExport(totalWorked - totalTarget), ''];
    sumRow.font = { bold: true };
    sumRow.getCell(1).border = { top: { style: 'double' } };
    [6, 7, 8].forEach(col => {
      sumRow.getCell(col).border = { top: { style: 'double' } };
      sumRow.getCell(col).alignment = { horizontal: 'center' };
    });

    const diffSumCell = sumRow.getCell(8);
    const diff = totalWorked - totalTarget;
    diffSumCell.font = { bold: true, color: { argb: diff >= 0 ? 'FF16A34A' : 'FFDC2626' } };

    // Response
    const filename = `Stundennachweis_${userName.replace(/\s+/g, '_')}_${targetYear}-${String(targetMonth).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Fehler beim Excel-Export:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

/**
 * Export kombinierter Zeitnachweis als PDF
 * GET /api/time-tracking/export/payroll/:userId
 * 
 * Enthält:
 * - Urlaubskonto (Anspruch, Übertrag, Genommen, Genehmigt, Beantragt, Rest)
 * - Zeitkonto (Saldo alt, +/- Monat, Saldo neu)
 * - Tagesübersicht mit Kommen, Gehen, Soll, Ist, Pause, +/-
 */
async function exportPayrollPDF(req, res) {
  try {
    const PDFDocument = require('pdfkit');
    const { userId } = req.params;
    const { year, month } = req.query;

    if (!(await checkExportPermission(req, userId))) {
      return res.status(403).json({ error: 'Keine Berechtigung' });
    }
    
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    // 1. Mitarbeiter-Info
    const userResult = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.username, u.time_balance_carryover,
             tm.name as time_model_name
      FROM users u
      LEFT JOIN time_models tm ON u.time_model_id = tm.id
      WHERE u.id = $1
    `, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    
    const user = userResult.rows[0];
    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

    // 2.–4. Urlaubskonto zum Monatsende (laufender Monat: heute), Zeitkonto inkl. Korrektur/Auszahlung
    const vacation = await getPayrollVacation(userId, targetYear, targetMonth);
    const account = await getPayrollTimeAccount({ ...user, id: userId }, targetYear, targetMonth);
    const { saldoVormonat, monthOvertime } = account;
    const monthSum = { total_target: account.target, total_worked: account.worked };

    // 5. Tagesbuchungen
    const dailyResult = await pool.query(`
      SELECT 
        ds.date,
        ds.target_minutes,
        ds.worked_minutes,
        ds.break_minutes,
        ds.overtime_minutes,
        ds.status,
        ds.first_clock_in,
        ds.last_clock_out,
        vt.name as vacation_type,
        h.name as holiday_name
      FROM time_daily_summary ds
      LEFT JOIN vacations v ON ds.vacation_id = v.id
      LEFT JOIN vacation_types vt ON v.type_id = vt.id
      LEFT JOIN holidays h ON ds.holiday_id = h.id
      WHERE ds.user_id = $1 
        AND EXTRACT(YEAR FROM ds.date) = $2 
        AND EXTRACT(MONTH FROM ds.date) = $3
      ORDER BY ds.date ASC
    `, [userId, targetYear, targetMonth]);

    // PDF erstellen
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: `Zeitnachweis ${MONTH_NAMES[targetMonth - 1]} ${targetYear} - ${userName}`,
        Author: 'MDS Personalverwaltung'
      }
    });

    const filename = `Zeitnachweis_${userName.replace(/\s+/g, '_')}_${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    pipePdf(doc, res);

    // === KOPFBEREICH ===
    doc.fontSize(16).font('Helvetica-Bold')
       .text('Zeitnachweis', 40, 40);
    doc.fontSize(12).font('Helvetica')
       .text(`${MONTH_NAMES[targetMonth - 1]} ${targetYear}`, 40, 60);
    
    doc.fontSize(10);
    doc.text(`Mitarbeiter: ${userName}`, 40, 85);
    if (user.time_model_name) {
      doc.text(`Zeitmodell: ${user.time_model_name}`, 40, 100);
    }
    
    // Erstellt am (rechts)
    doc.fontSize(8).fillColor('#6b7280')
       .text(`Erstellt: ${new Date().toLocaleDateString('de-DE')}`, 400, 40);
    doc.fillColor('black');

    // === ZWEI BOXEN NEBENEINANDER ===
    const boxTop = 125;
    const boxHeight = drawPayrollBoxes(doc, boxTop, vacation, account, MONTH_NAMES[targetMonth - 1]);

    // === TAGESÜBERSICHT TABELLE ===
    let tableTop = boxTop + boxHeight + 20;
    
    doc.fontSize(10).font('Helvetica-Bold')
       .text('Tagesübersicht', 40, tableTop);
    tableTop += 18;
    
    // Tabellen-Header
    const colWidths = [65, 28, 44, 44, 40, 40, 48, 48, 48, 110];
    const headers = ['Datum', 'Tag', 'Kommen', 'Gehen', 'Pause', 'Abwes.', 'Soll', 'Ist', '+/-', 'Bemerkung'];
    
    // Header-Hintergrund
    doc.save();
    doc.rect(40, tableTop - 2, 515, 14).fill('#e5e7eb');
    doc.restore();

    doc.fontSize(8).font('Helvetica-Bold').fillColor('black');
    let x = 40;
    headers.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
      x += colWidths[i];
    });

    // Datenzeilen
    let y = tableTop + 16;
    let runningBalance = saldoVormonat;

    dailyResult.rows.forEach(row => {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }

      const date = new Date(row.date);
      const weekday = WEEKDAYS[date.getDay()];
      const dateStr = date.toLocaleDateString('de-DE');
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const clockIn = row.first_clock_in 
        ? new Date(row.first_clock_in).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
        : '-';
      const clockOut = row.last_clock_out
        ? new Date(row.last_clock_out).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
        : '-';

      // Abwesenheit berechnen: Zeit zwischen Kommen/Gehen minus Arbeit minus Pause
      let absentMinutes = 0;
      if (row.first_clock_in && row.last_clock_out) {
        const inTime = new Date(row.first_clock_in);
        const outTime = new Date(row.last_clock_out);
        const grossMinutes = Math.round((outTime - inTime) / 60000);
        absentMinutes = grossMinutes - (row.worked_minutes || 0) - (row.break_minutes || 0);
        // Rundungstoleranz: ±1min durch separate Rundungen ignorieren
        if (absentMinutes <= 1) absentMinutes = 0;
      }

      let bemerkung = '';
      if (row.vacation_type) bemerkung = row.vacation_type;
      if (row.holiday_name) bemerkung = 'Feiertag';
      else if (row.status === 'holiday') bemerkung = 'Feiertag';

      runningBalance += (row.overtime_minutes || 0);

      // Wochenende: Hintergrund
      if (isWeekend) {
        doc.save();
        doc.rect(40, y - 2, 515, 11).fill('#f3f4f6');
        doc.restore();
      }

      x = 40;
      doc.font('Helvetica').fontSize(7).fillColor('black');
      
      const rowData = [
        dateStr, weekday, clockIn, clockOut,
        formatMinsExport(row.break_minutes) || '-',
        absentMinutes > 0 ? formatMinsExport(absentMinutes) : '-',
        formatMinsExport(row.target_minutes) || '-',
        formatMinsExport(row.worked_minutes) || '-'
      ];
      
      rowData.forEach((cell, i) => {
        doc.text(String(cell), x, y, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });
      
      // +/- farbig
      const diff = row.overtime_minutes || 0;
      doc.fillColor(diff >= 0 ? '#16a34a' : '#dc2626');
      doc.text(formatMinsExport(diff) || '-', x, y, { width: colWidths[8], align: 'left' });
      x += colWidths[8];
      
      // Bemerkung
      doc.fillColor('#6b7280');
      doc.text(bemerkung, x, y, { width: colWidths[9], align: 'left' });
      doc.fillColor('black');

      y += 11;
    });

    // Summenzeile
    y += 5;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#000000').stroke();
    y += 6;
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Summe Monat:', 40, y);
    // Positionen passend zu colWidths: 65+28+44+44+40+40=261, dann Soll bei 301, Ist bei 349, +/- bei 397
    doc.text(formatMinsExport(parseInt(monthSum.total_target)), 301, y, { width: 48, align: 'left' });
    doc.text(formatMinsExport(parseInt(monthSum.total_worked)), 349, y, { width: 48, align: 'left' });
    doc.fillColor(monthOvertime >= 0 ? '#16a34a' : '#dc2626');
    doc.text(formatMinsExport(monthOvertime), 397, y, { width: 48, align: 'left' });
    doc.fillColor('black');

    // Footer
    doc.fillColor('#6b7280').fontSize(7).font('Helvetica')
       .text(
         `MDS Manufacturing Data System | Erstellt am ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`, 
         40, 780, { align: 'center', width: 515 }
       );

    doc.end();

  } catch (error) {
    console.error('Fehler beim Zeitnachweis-Export:', error);
    if (abortPdfResponse(res)) return;
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

/**
 * Export Zeitnachweis für ALLE Mitarbeiter mit aktivem Zeitkonto
 * GET /api/time-tracking/export/payroll-all
 * 
 * Erstellt ein PDF mit einer Seite pro Mitarbeiter
 */
async function exportPayrollAllPDF(req, res) {
  try {
    const PDFDocument = require('pdfkit');
    const { year, month } = req.query;
    
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    // Alle Mitarbeiter mit aktivem Zeitkonto
    const usersResult = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.username, u.time_balance_carryover,
             tm.name as time_model_name
      FROM users u
      LEFT JOIN time_models tm ON u.time_model_id = tm.id
      WHERE u.time_tracking_enabled = true AND u.is_active = true
      ORDER BY u.last_name, u.first_name
    `);

    if (usersResult.rows.length === 0) {
      return res.status(404).json({ error: 'Keine Mitarbeiter mit aktivem Zeitkonto gefunden' });
    }

    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: `Zeitnachweise ${MONTH_NAMES[targetMonth - 1]} ${targetYear}`,
        Author: 'MDS Personalverwaltung'
      }
    });

    const filename = `Zeitnachweise_${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    pipePdf(doc, res);

    for (let i = 0; i < usersResult.rows.length; i++) {
      const user = usersResult.rows[i];
      const userId = user.id;
      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

      if (i > 0) doc.addPage();

      // Urlaubskonto zum Monatsende, Zeitkonto inkl. Korrektur/Auszahlung
      const vacation = await getPayrollVacation(userId, targetYear, targetMonth);
      const account = await getPayrollTimeAccount(user, targetYear, targetMonth);
      const { monthOvertime } = account;
      const monthSum = { total_target: account.target, total_worked: account.worked };

      // Tagesbuchungen
      const dailyResult = await pool.query(`
        SELECT ds.date, ds.target_minutes, ds.worked_minutes, ds.break_minutes,
               ds.overtime_minutes, ds.status, ds.first_clock_in, ds.last_clock_out,
               vt.name as vacation_type, h.name as holiday_name
        FROM time_daily_summary ds
        LEFT JOIN vacations v ON ds.vacation_id = v.id
        LEFT JOIN vacation_types vt ON v.type_id = vt.id
        LEFT JOIN holidays h ON ds.holiday_id = h.id
        WHERE ds.user_id = $1 AND EXTRACT(YEAR FROM ds.date) = $2 AND EXTRACT(MONTH FROM ds.date) = $3
        ORDER BY ds.date ASC
      `, [userId, targetYear, targetMonth]);

      // === SEITE RENDERN ===
      // Kopf
      doc.fontSize(16).font('Helvetica-Bold').text('Zeitnachweis', 40, 40);
      doc.fontSize(12).font('Helvetica').text(`${MONTH_NAMES[targetMonth - 1]} ${targetYear}`, 40, 60);
      doc.fontSize(10).text(`Mitarbeiter: ${userName}`, 40, 85);
      if (user.time_model_name) doc.text(`Zeitmodell: ${user.time_model_name}`, 40, 100);
      doc.fontSize(8).fillColor('#6b7280').text(`Seite ${i + 1} von ${usersResult.rows.length}`, 450, 40);
      doc.fillColor('black');

      // Boxen
      const boxTop = 125;
      const boxHeight = drawPayrollBoxes(doc, boxTop, vacation, account, MONTH_NAMES[targetMonth - 1]);

      // Tabelle
      let tableTop = boxTop + boxHeight + 20;
      doc.fontSize(10).font('Helvetica-Bold').text('Tagesübersicht', 40, tableTop);
      tableTop += 18;

      const colWidths = [65, 28, 44, 44, 40, 40, 48, 48, 48, 110];
      const headers = ['Datum', 'Tag', 'Kommen', 'Gehen', 'Pause', 'Abwes.', 'Soll', 'Ist', '+/-', 'Bemerkung'];
      
      doc.save(); doc.rect(40, tableTop - 2, 515, 14).fill('#e5e7eb'); doc.restore();
      doc.fontSize(8).font('Helvetica-Bold').fillColor('black');
      let x = 40;
      headers.forEach((header, idx) => { doc.text(header, x, tableTop, { width: colWidths[idx], align: 'left' }); x += colWidths[idx]; });

      let y = tableTop + 16;
      dailyResult.rows.forEach(row => {
        if (y > 760) { doc.addPage(); y = 40; }
        const date = new Date(row.date);
        const weekday = WEEKDAYS[date.getDay()];
        const dateStr = date.toLocaleDateString('de-DE');
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const clockIn = row.first_clock_in ? new Date(row.first_clock_in).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) : '-';
        const clockOut = row.last_clock_out ? new Date(row.last_clock_out).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }) : '-';
        let bemerkung = row.vacation_type || (row.holiday_name ? 'Feiertag' : (row.status === 'holiday' ? 'Feiertag' : ''));

        // Abwesenheit berechnen
        let absentMinutes = 0;
        if (row.first_clock_in && row.last_clock_out) {
          const inTime = new Date(row.first_clock_in);
          const outTime = new Date(row.last_clock_out);
          const grossMinutes = Math.round((outTime - inTime) / 60000);
          absentMinutes = grossMinutes - (row.worked_minutes || 0) - (row.break_minutes || 0);
          // Rundungstoleranz: ±1min durch separate Rundungen ignorieren
          if (absentMinutes <= 1) absentMinutes = 0;
        }

        if (isWeekend) { doc.save(); doc.rect(40, y - 2, 515, 11).fill('#f3f4f6'); doc.restore(); }
        
        x = 40;
        doc.font('Helvetica').fontSize(7).fillColor('black');
        [dateStr, weekday, clockIn, clockOut, formatMinsExport(row.break_minutes) || '-', absentMinutes > 0 ? formatMinsExport(absentMinutes) : '-', formatMinsExport(row.target_minutes) || '-', formatMinsExport(row.worked_minutes) || '-'].forEach((cell, idx) => {
          doc.text(String(cell), x, y, { width: colWidths[idx], align: 'left' }); x += colWidths[idx];
        });
        const diff = row.overtime_minutes || 0;
        doc.fillColor(diff >= 0 ? '#16a34a' : '#dc2626').text(formatMinsExport(diff) || '-', x, y, { width: colWidths[8], align: 'left' }); x += colWidths[8];
        doc.fillColor('#6b7280').text(bemerkung, x, y, { width: colWidths[9], align: 'left' }); doc.fillColor('black');
        y += 11;
      });

      // Summe
      y += 5; doc.moveTo(40, y).lineTo(555, y).stroke(); y += 6;
      doc.font('Helvetica-Bold').fontSize(8).text('Summe:', 40, y);
      doc.text(formatMinsExport(parseInt(monthSum.total_target)), 301, y);
      doc.text(formatMinsExport(parseInt(monthSum.total_worked)), 349, y);
      doc.fillColor(monthOvertime >= 0 ? '#16a34a' : '#dc2626').text(formatMinsExport(monthOvertime), 397, y);
      doc.fillColor('black');

      // Footer
      doc.fillColor('#6b7280').fontSize(7).font('Helvetica')
         .text(`MDS Manufacturing Data System`, 40, 780, { align: 'center', width: 515 });
    }

    doc.end();

  } catch (error) {
    console.error('Fehler beim Sammel-Zeitnachweis-Export:', error);
    if (abortPdfResponse(res)) return;
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

module.exports = {
  getByUser,
  getAll,
  calculateMonth,
  createAdjustment,
  deleteAdjustment,
  getAdjustments,
  createPayout,
  getDailySummaries,
  getWeekSummary,
  calculateMonthBalance,
  recalculateFromMonth,
  recalculateAll,
  exportCSV,
  exportPDF,
  exportExcel,
  exportPayrollPDF,
  exportPayrollAllPDF,
  calculateCurrentBalance,
  getPayrollVacation, // für tests/integration
};
