const pool = require('../config/db');

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

    const result = await pool.query(`
      UPDATE time_balances SET
        adjustment_minutes = adjustment_minutes + $1,
        adjustment_reason = CASE 
          WHEN adjustment_reason IS NULL THEN $2
          ELSE adjustment_reason || E'\n' || $2
        END,
        balance_minutes = balance_minutes + $1,
        updated_at = NOW()
      WHERE user_id = $3 AND year = $4 AND month = $5
      RETURNING *
    `, [adjustment_minutes, `${toLocalDateStr(new Date())}: ${reason} (${adjustment_minutes > 0 ? '+' : ''}${adjustment_minutes} Min)`, userId, year, month]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Erstellen der Anpassung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

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

    // Summen berechnen
    const totals = result.rows.reduce((acc, row) => {
      acc.target_minutes += row.target_minutes || 0;
      acc.worked_minutes += row.worked_minutes || 0;
      acc.break_minutes += row.break_minutes || 0;
      acc.overtime_minutes += row.overtime_minutes || 0;
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
  // Tagesübersichten des Monats summieren
  const summaryResult = await pool.query(`
    SELECT 
      COALESCE(SUM(target_minutes), 0) as target_minutes,
      COALESCE(SUM(worked_minutes), 0) as worked_minutes,
      COALESCE(SUM(overtime_minutes), 0) as overtime_minutes
    FROM time_daily_summary
    WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
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
      balance_minutes = time_balances.carryover_minutes + EXCLUDED.overtime_minutes + 
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
    ? new Date(row.first_clock_in).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '';
  const clockOut = row.last_clock_out
    ? new Date(row.last_clock_out).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
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
    doc.pipe(res);

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
 * Export kombinierter Lohnnachweis als PDF
 * GET /api/time-tracking/export/payroll/:userId
 * 
 * Enthält:
 * - Urlaubskonto (Anspruch, Übertrag, Gesamt, Genommen, Rest)
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

    // 2. Urlaubskonto für das Jahr
    const vacationResult = await pool.query(`
      SELECT 
        total_days,
        carried_over,
        adjustment,
        available_days,
        used_days,
        remaining_days
      FROM vacation_balances 
      WHERE user_id = $1 AND year = $2
      LIMIT 1
    `, [userId, targetYear]);
    
    const vacation = vacationResult.rows[0] || {
      total_days: 0, carried_over: 0, adjustment: 0,
      available_days: 0, used_days: 0, remaining_days: 0
    };

    // 3. Zeitkonto - Saldo Vormonat berechnen
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = targetYear - 1;
    }
    
    // Summe aller Überstunden bis Ende Vormonat
    const prevBalanceResult = await pool.query(`
      SELECT COALESCE(SUM(overtime_minutes), 0) as total_overtime
      FROM time_daily_summary
      WHERE user_id = $1 
        AND date < make_date($2, $3, 1)
    `, [userId, targetYear, targetMonth]);
    
    const carryover = user.time_balance_carryover || 0;
    const prevOvertimeSum = parseInt(prevBalanceResult.rows[0]?.total_overtime || 0);
    const saldoVormonat = carryover + prevOvertimeSum;

    // 4. Aktueller Monat Summe
    const monthSumResult = await pool.query(`
      SELECT 
        COALESCE(SUM(worked_minutes), 0) as total_worked,
        COALESCE(SUM(target_minutes), 0) as total_target,
        COALESCE(SUM(overtime_minutes), 0) as total_overtime
      FROM time_daily_summary
      WHERE user_id = $1 
        AND EXTRACT(YEAR FROM date) = $2 
        AND EXTRACT(MONTH FROM date) = $3
    `, [userId, targetYear, targetMonth]);
    
    const monthSum = monthSumResult.rows[0];
    const monthOvertime = parseInt(monthSum.total_overtime || 0);
    const saldoNeu = saldoVormonat + monthOvertime;

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
        Title: `Lohnnachweis ${MONTH_NAMES[targetMonth - 1]} ${targetYear} - ${userName}`,
        Author: 'MDS Personalverwaltung'
      }
    });

    const filename = `Lohnnachweis_${userName.replace(/\s+/g, '_')}_${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // === KOPFBEREICH ===
    doc.fontSize(16).font('Helvetica-Bold')
       .text('Lohnnachweis', 40, 40);
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
    const boxHeight = 110;
    const boxWidth = 250;
    
    // Box 1: Urlaubskonto (links)
    doc.save();
    doc.roundedRect(40, boxTop, boxWidth, boxHeight, 5).stroke('#d1d5db');
    doc.restore();
    
    doc.fontSize(10).font('Helvetica-Bold')
       .text('Urlaubskonto', 50, boxTop + 8);
    doc.font('Helvetica').fontSize(9);
    
    let yBox = boxTop + 25;
    doc.text(`Jahresanspruch:`, 50, yBox);
    doc.text(`${vacation.total_days} Tage`, 180, yBox, { width: 100, align: 'right' });
    yBox += 13;
    doc.text(`Übertrag Vorjahr:`, 50, yBox);
    doc.text(`${vacation.carried_over} Tage`, 180, yBox, { width: 100, align: 'right' });
    yBox += 13;
    doc.text(`Gesamt verfügbar:`, 50, yBox);
    doc.font('Helvetica-Bold').text(`${vacation.available_days} Tage`, 180, yBox, { width: 100, align: 'right' });
    doc.font('Helvetica');
    yBox += 13;
    doc.text(`Genommen/Geplant:`, 50, yBox);
    doc.text(`${vacation.used_days} Tage`, 180, yBox, { width: 100, align: 'right' });
    yBox += 13;
    doc.text(`Resturlaub:`, 50, yBox);
    doc.font('Helvetica-Bold').fillColor(vacation.remaining_days >= 0 ? '#16a34a' : '#dc2626');
    doc.text(`${vacation.remaining_days} Tage`, 180, yBox, { width: 100, align: 'right' });
    doc.fillColor('black').font('Helvetica');

    // Box 2: Zeitkonto (rechts)
    doc.save();
    doc.roundedRect(305, boxTop, boxWidth, boxHeight, 5).stroke('#d1d5db');
    doc.restore();
    
    doc.fontSize(10).font('Helvetica-Bold')
       .text('Zeitkonto', 315, boxTop + 8);
    doc.font('Helvetica').fontSize(9);
    
    yBox = boxTop + 25;
    doc.text(`Soll ${MONTH_NAMES[targetMonth - 1]}:`, 315, yBox);
    doc.text(formatMinsExport(parseInt(monthSum.total_target)), 445, yBox, { width: 100, align: 'right' });
    yBox += 13;
    doc.text(`Ist ${MONTH_NAMES[targetMonth - 1]}:`, 315, yBox);
    doc.text(formatMinsExport(parseInt(monthSum.total_worked)), 445, yBox, { width: 100, align: 'right' });
    yBox += 13;
    doc.text(`Saldo Vormonat:`, 315, yBox);
    doc.fillColor(saldoVormonat >= 0 ? '#16a34a' : '#dc2626');
    doc.text(formatMinsExport(saldoVormonat), 445, yBox, { width: 100, align: 'right' });
    doc.fillColor('black');
    yBox += 13;
    doc.text(`+/- ${MONTH_NAMES[targetMonth - 1]}:`, 315, yBox);
    doc.fillColor(monthOvertime >= 0 ? '#16a34a' : '#dc2626');
    doc.text(formatMinsExport(monthOvertime), 445, yBox, { width: 100, align: 'right' });
    doc.fillColor('black');
    yBox += 13;
    doc.moveTo(315, yBox + 3).lineTo(545, yBox + 3).stroke();
    yBox += 10;
    doc.font('Helvetica-Bold').text(`Saldo neu:`, 315, yBox);
    doc.fillColor(saldoNeu >= 0 ? '#16a34a' : '#dc2626');
    doc.text(formatMinsExport(saldoNeu), 445, yBox, { width: 100, align: 'right' });
    doc.fillColor('black').font('Helvetica');

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
        ? new Date(row.first_clock_in).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : '-';
      const clockOut = row.last_clock_out
        ? new Date(row.last_clock_out).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : '-';

      // Abwesenheit berechnen: Zeit zwischen Kommen/Gehen minus Arbeit minus Pause
      let absentMinutes = 0;
      if (row.first_clock_in && row.last_clock_out) {
        const inTime = new Date(row.first_clock_in);
        const outTime = new Date(row.last_clock_out);
        const grossMinutes = Math.round((outTime - inTime) / 60000);
        absentMinutes = grossMinutes - (row.worked_minutes || 0) - (row.break_minutes || 0);
        if (absentMinutes < 0) absentMinutes = 0;
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
    console.error('Fehler beim Lohnnachweis-Export:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

/**
 * Export Lohnnachweis für ALLE Mitarbeiter mit aktivem Zeitkonto
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
        Title: `Lohnnachweise ${MONTH_NAMES[targetMonth - 1]} ${targetYear}`,
        Author: 'MDS Personalverwaltung'
      }
    });

    const filename = `Lohnnachweise_${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    for (let i = 0; i < usersResult.rows.length; i++) {
      const user = usersResult.rows[i];
      const userId = user.id;
      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;

      if (i > 0) doc.addPage();

      // Urlaubskonto
      const vacationResult = await pool.query(`
        SELECT total_days, carried_over, adjustment, available_days, used_days, remaining_days
        FROM vacation_balances WHERE user_id = $1 AND year = $2 LIMIT 1
      `, [userId, targetYear]);
      
      const vacation = vacationResult.rows[0] || {
        total_days: 0, carried_over: 0, adjustment: 0,
        available_days: 0, used_days: 0, remaining_days: 0
      };

      // Zeitkonto Vormonat
      let prevMonth = targetMonth - 1;
      let prevYear = targetYear;
      if (prevMonth === 0) { prevMonth = 12; prevYear = targetYear - 1; }
      
      const prevBalanceResult = await pool.query(`
        SELECT COALESCE(SUM(overtime_minutes), 0) as total_overtime
        FROM time_daily_summary WHERE user_id = $1 AND date < make_date($2, $3, 1)
      `, [userId, targetYear, targetMonth]);
      
      const carryover = user.time_balance_carryover || 0;
      const prevOvertimeSum = parseInt(prevBalanceResult.rows[0]?.total_overtime || 0);
      const saldoVormonat = carryover + prevOvertimeSum;

      // Monatssumme
      const monthSumResult = await pool.query(`
        SELECT COALESCE(SUM(worked_minutes), 0) as total_worked,
               COALESCE(SUM(target_minutes), 0) as total_target,
               COALESCE(SUM(overtime_minutes), 0) as total_overtime
        FROM time_daily_summary
        WHERE user_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
      `, [userId, targetYear, targetMonth]);
      
      const monthSum = monthSumResult.rows[0];
      const monthOvertime = parseInt(monthSum.total_overtime || 0);
      const saldoNeu = saldoVormonat + monthOvertime;

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
      doc.fontSize(16).font('Helvetica-Bold').text('Lohnnachweis', 40, 40);
      doc.fontSize(12).font('Helvetica').text(`${MONTH_NAMES[targetMonth - 1]} ${targetYear}`, 40, 60);
      doc.fontSize(10).text(`Mitarbeiter: ${userName}`, 40, 85);
      if (user.time_model_name) doc.text(`Zeitmodell: ${user.time_model_name}`, 40, 100);
      doc.fontSize(8).fillColor('#6b7280').text(`Seite ${i + 1} von ${usersResult.rows.length}`, 450, 40);
      doc.fillColor('black');

      // Boxen
      const boxTop = 125;
      const boxHeight = 110;
      const boxWidth = 250;
      
      // Urlaubskonto Box
      doc.roundedRect(40, boxTop, boxWidth, boxHeight, 5).stroke('#d1d5db');
      doc.fontSize(10).font('Helvetica-Bold').text('Urlaubskonto', 50, boxTop + 8);
      doc.font('Helvetica').fontSize(9);
      let yBox = boxTop + 25;
      doc.text(`Jahresanspruch:`, 50, yBox); doc.text(`${vacation.total_days} Tage`, 180, yBox, { width: 100, align: 'right' }); yBox += 13;
      doc.text(`Übertrag Vorjahr:`, 50, yBox); doc.text(`${vacation.carried_over} Tage`, 180, yBox, { width: 100, align: 'right' }); yBox += 13;
      doc.text(`Gesamt verfügbar:`, 50, yBox); doc.font('Helvetica-Bold').text(`${vacation.available_days} Tage`, 180, yBox, { width: 100, align: 'right' }); doc.font('Helvetica'); yBox += 13;
      doc.text(`Genommen/Geplant:`, 50, yBox); doc.text(`${vacation.used_days} Tage`, 180, yBox, { width: 100, align: 'right' }); yBox += 13;
      doc.text(`Resturlaub:`, 50, yBox); doc.font('Helvetica-Bold').fillColor(vacation.remaining_days >= 0 ? '#16a34a' : '#dc2626');
      doc.text(`${vacation.remaining_days} Tage`, 180, yBox, { width: 100, align: 'right' }); doc.fillColor('black').font('Helvetica');

      // Zeitkonto Box
      doc.roundedRect(305, boxTop, boxWidth, boxHeight, 5).stroke('#d1d5db');
      doc.fontSize(10).font('Helvetica-Bold').text('Zeitkonto', 315, boxTop + 8);
      doc.font('Helvetica').fontSize(9);
      yBox = boxTop + 25;
      doc.text(`Soll ${MONTH_NAMES[targetMonth - 1]}:`, 315, yBox);
      doc.text(formatMinsExport(parseInt(monthSum.total_target)), 445, yBox, { width: 100, align: 'right' }); yBox += 13;
      doc.text(`Ist ${MONTH_NAMES[targetMonth - 1]}:`, 315, yBox);
      doc.text(formatMinsExport(parseInt(monthSum.total_worked)), 445, yBox, { width: 100, align: 'right' }); yBox += 13;
      doc.text(`Saldo Vormonat:`, 315, yBox); doc.fillColor(saldoVormonat >= 0 ? '#16a34a' : '#dc2626');
      doc.text(formatMinsExport(saldoVormonat), 445, yBox, { width: 100, align: 'right' }); doc.fillColor('black'); yBox += 13;
      doc.text(`+/- ${MONTH_NAMES[targetMonth - 1]}:`, 315, yBox); doc.fillColor(monthOvertime >= 0 ? '#16a34a' : '#dc2626');
      doc.text(formatMinsExport(monthOvertime), 445, yBox, { width: 100, align: 'right' }); doc.fillColor('black'); yBox += 13;
      doc.moveTo(315, yBox + 3).lineTo(545, yBox + 3).stroke(); yBox += 10;
      doc.font('Helvetica-Bold').text(`Saldo neu:`, 315, yBox); doc.fillColor(saldoNeu >= 0 ? '#16a34a' : '#dc2626');
      doc.text(formatMinsExport(saldoNeu), 445, yBox, { width: 100, align: 'right' }); doc.fillColor('black').font('Helvetica');

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
        const clockIn = row.first_clock_in ? new Date(row.first_clock_in).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-';
        const clockOut = row.last_clock_out ? new Date(row.last_clock_out).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '-';
        let bemerkung = row.vacation_type || (row.holiday_name ? 'Feiertag' : (row.status === 'holiday' ? 'Feiertag' : ''));

        // Abwesenheit berechnen
        let absentMinutes = 0;
        if (row.first_clock_in && row.last_clock_out) {
          const inTime = new Date(row.first_clock_in);
          const outTime = new Date(row.last_clock_out);
          const grossMinutes = Math.round((outTime - inTime) / 60000);
          absentMinutes = grossMinutes - (row.worked_minutes || 0) - (row.break_minutes || 0);
          if (absentMinutes < 0) absentMinutes = 0;
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
    console.error('Fehler beim Sammel-Lohnnachweis-Export:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
}

module.exports = {
  getByUser,
  getAll,
  calculateMonth,
  createAdjustment,
  createPayout,
  getDailySummaries,
  getWeekSummary,
  calculateMonthBalance,
  exportCSV,
  exportPDF,
  exportExcel,
  exportPayrollPDF,
  exportPayrollAllPDF
};
