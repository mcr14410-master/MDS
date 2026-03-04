/**
 * Vacation Reports Controller
 * 
 * PDF-Export für Urlaubsplanung
 * 
 * Routes:
 * - GET /api/vacations/export/my-year?year=2026     - Persönlicher Jahresexport
 * - GET /api/vacations/export/all?year=2026         - Personalbüro Gesamtübersicht
 */

const pool = require('../config/db');
const PDFDocument = require('pdfkit');

// ============================================================================
// HELPERS
// ============================================================================

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('de-DE');
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('de-DE');
};

const getStatusText = (status) => {
  const labels = {
    pending: 'Ausstehend',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt'
  };
  return labels[status] || status;
};

// PDF Styling Helper
const setupPDF = (doc, title, subtitle = null) => {
  // Header
  doc.fontSize(18).font('Helvetica-Bold').text(title, 50, 50);
  let y = 75;
  if (subtitle) {
    doc.fontSize(12).font('Helvetica').text(subtitle, 50, y);
    y += 20;
  }
  doc.fontSize(10).font('Helvetica').text(`Erstellt am: ${formatDateTime(new Date())}`, 50, y);
  y += 15;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  return y + 15;
};

const addFooter = (doc, pageNum) => {
  // Save current position
  const savedY = doc.y;
  // Write footer at fixed position
  doc.fontSize(8).font('Helvetica');
  doc.text(`Seite ${pageNum} - MDS Manufacturing Data System`, 50, 760, { 
    align: 'center', 
    width: 495
  });
  // Reset cursor to prevent auto page break
  doc.y = savedY;
};

// ============================================================================
// PERSONAL YEAR EXPORT
// ============================================================================

/**
 * GET /api/vacations/export/my-year?year=2026
 * PDF mit persönlichem Urlaubsüberblick für ein Jahr
 */
exports.exportMyYear = async (req, res) => {
  try {
    const userId = req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Fetch user info
    const userResult = await pool.query(`
      SELECT 
        u.id, u.username, 
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        u.first_name, u.last_name,
        COALESCE(
          (SELECT json_agg(r.name)
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = u.id),
          '[]'::json
        ) as roles
      FROM users u
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    const user = userResult.rows[0];

    // Fetch balance
    const balanceResult = await pool.query(`
      SELECT 
        ve.total_days,
        ve.carried_over,
        (ve.total_days + COALESCE(ve.carried_over, 0)) as available_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = $1 
             AND v.status = 'approved' AND v.end_date < CURRENT_DATE
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $2),
          0
        ) as taken_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = $1 
             AND v.status = 'approved' AND v.end_date >= CURRENT_DATE
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $2),
          0
        ) as approved_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = $1 
             AND v.status = 'pending'
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $2),
          0
        ) as pending_days
      FROM vacation_entitlements ve
      WHERE ve.user_id = $1 AND ve.year = $2
    `, [userId, year]);

    const balance = balanceResult.rows[0] || {
      total_days: 0,
      carried_over: 0,
      available_days: 0,
      taken_days: 0,
      approved_days: 0,
      pending_days: 0
    };
    balance.used_days = parseFloat(balance.taken_days) + parseFloat(balance.approved_days) + parseFloat(balance.pending_days);
    balance.remaining_days = balance.available_days - balance.used_days;

    // Fetch all vacations (approved + pending)
    const vacationsResult = await pool.query(`
      SELECT 
        v.*,
        vt.name as type_name,
        vt.color as type_color,
        vt.affects_balance,
        creator.first_name || ' ' || creator.last_name as created_by_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users creator ON creator.id = v.created_by
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.user_id = $1 
        AND EXTRACT(YEAR FROM v.start_date) = $2
        AND v.status IN ('approved', 'pending')
      ORDER BY v.start_date
    `, [userId, year]);

    // Fetch rejected requests separately
    const rejectedResult = await pool.query(`
      SELECT 
        v.*,
        vt.name as type_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.user_id = $1 
        AND EXTRACT(YEAR FROM v.start_date) = $2
        AND v.status = 'rejected'
      ORDER BY v.start_date
    `, [userId, year]);

    // Split by affects_balance
    const balanceEntries = vacationsResult.rows.filter(v => v.affects_balance);
    const otherEntries = vacationsResult.rows.filter(v => !v.affects_balance);

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    const filename = `Urlaubsuebersicht_${user.display_name.replace(/\s+/g, '_')}_${year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    doc.pipe(res);

    let y = setupPDF(doc, `Urlaubsübersicht ${year}`, user.display_name);
    let pageNum = 1;

    // Roles
    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (roles.length > 0) {
      doc.fontSize(10).font('Helvetica').text(`Rollen: ${roles.join(', ')}`, 50, y);
      y += 20;
    }

    // ========== BALANCE BOX ==========
    doc.rect(50, y, 495, 85).stroke();
    doc.fontSize(12).font('Helvetica-Bold').text('Urlaubskonto', 60, y + 10);
    
    doc.fontSize(10).font('Helvetica');
    const col1 = 60, col2 = 180, col3 = 300, col4 = 420;
    
    doc.text('Anspruch:', col1, y + 30);
    doc.font('Helvetica-Bold').text(`${balance.total_days} Tage`, col1, y + 45);
    
    doc.font('Helvetica').text('Übertrag:', col2, y + 30);
    doc.font('Helvetica-Bold').text(`${balance.carried_over || 0} Tage`, col2, y + 45);

    doc.font('Helvetica').text('Genommen:', col1, y + 60);
    doc.font('Helvetica-Bold').text(`${balance.taken_days} Tage`, col1, y + 75);

    doc.font('Helvetica').text('Genehmigt:', col2, y + 60);
    doc.fillColor('#16a34a').font('Helvetica-Bold').text(`${balance.approved_days} Tage`, col2, y + 75);
    doc.fillColor('#000000');

    doc.font('Helvetica').text('Beantragt:', col3, y + 60);
    doc.fillColor('#d97706').font('Helvetica-Bold').text(`${balance.pending_days} Tage`, col3, y + 75);
    doc.fillColor('#000000');
    
    doc.font('Helvetica').text('Rest:', col4, y + 60);
    const restColor = balance.remaining_days < 0 ? '#dc2626' : balance.remaining_days < 5 ? '#d97706' : '#16a34a';
    doc.fillColor(restColor).font('Helvetica-Bold').text(`${balance.remaining_days} Tage`, col4, y + 75);
    doc.fillColor('#000000');
    
    y += 100;

    // ========== TABLE HELPERS ==========
    const drawHeader = (yPos, headerColor = '#f3f4f6') => {
      doc.rect(50, yPos, 495, 18).fill(headerColor);
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Zeitraum', 55, yPos + 5);
      doc.text('Art', 175, yPos + 5);
      doc.text('Tage', 290, yPos + 5);
      doc.text('Status', 340, yPos + 5);
      doc.text('Genehmigt von', 430, yPos + 5);
      return yPos + 22;
    };

    const drawRows = (entries, yStart, headerColor) => {
      let yy = yStart;
      doc.font('Helvetica').fontSize(9);
      let total = 0;

      for (const v of entries) {
        if (yy > 720) {
          addFooter(doc, pageNum);
          doc.addPage();
          pageNum++;
          yy = 50;
          yy = drawHeader(yy, headerColor);
          doc.font('Helvetica').fontSize(9);
        }

        const dateRange = v.start_date === v.end_date 
          ? formatDate(v.start_date)
          : `${formatDate(v.start_date)} – ${formatDate(v.end_date)}`;

        doc.fillColor('#000000');
        doc.text(dateRange, 55, yy, { width: 115 });
        doc.text(v.type_name, 175, yy, { width: 110 });
        doc.text(`${v.calculated_days}`, 290, yy, { width: 45 });

        const statusColor = v.status === 'approved' ? '#16a34a' : v.status === 'pending' ? '#d97706' : '#dc2626';
        doc.fillColor(statusColor).text(getStatusText(v.status), 340, yy, { width: 85 });
        doc.fillColor('#000000');

        doc.text(v.approved_by_name || '–', 430, yy, { width: 110 });
        
        total += parseFloat(v.calculated_days || 0);
        yy += 18;
      }

      // Total
      doc.fillColor('#000000');
      doc.moveTo(50, yy).lineTo(545, yy).stroke();
      yy += 5;
      doc.font('Helvetica-Bold');
      doc.text('Gesamt:', 55, yy);
      doc.text(`${total} Tage`, 290, yy);
      return yy + 25;
    };

    // ========== VOM URLAUBSKONTO ==========
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Vom Urlaubskonto', 50, y);
    y += 20;

    if (balanceEntries.length === 0) {
      doc.fontSize(10).font('Helvetica').text('Keine Einträge.', 50, y);
      y += 25;
    } else {
      y = drawHeader(y);
      y = drawRows(balanceEntries, y, '#f3f4f6');
    }

    // ========== OHNE URLAUBSABZUG ==========
    if (otherEntries.length > 0) {
      if (y > 650) {
        addFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        y = 50;
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Ohne Urlaubsabzug', 50, y);
      y += 20;

      y = drawHeader(y, '#e0f2fe');
      y = drawRows(otherEntries, y, '#e0f2fe');
    }

    // ========== ABGELEHNTE ANTRÄGE ==========
    if (rejectedResult.rows.length > 0) {
      if (y > 650) {
        addFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        y = 50;
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('Abgelehnte Anträge', 50, y);
      y += 20;

      doc.rect(50, y, 495, 18).fill('#fef3c7');
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Zeitraum', 55, y + 5);
      doc.text('Art', 175, y + 5);
      doc.text('Tage', 290, y + 5);
      doc.text('Grund', 340, y + 5);
      y += 22;

      doc.font('Helvetica').fontSize(9);
      for (const r of rejectedResult.rows) {
        const dateRange = r.start_date === r.end_date 
          ? formatDate(r.start_date)
          : `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`;

        doc.fillColor('#000000');
        doc.text(dateRange, 55, y, { width: 115 });
        doc.text(r.type_name, 175, y, { width: 110 });
        doc.text(`${r.calculated_days}`, 290, y, { width: 45 });
        doc.text(r.rejection_reason || '–', 340, y, { width: 200 });
        y += 18;
      }
    }

    // Footer
    addFooter(doc, pageNum);
    doc.end();

  } catch (error) {
    console.error('Export my year error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Exports' });
  }
};

// ============================================================================
// ALL EMPLOYEES EXPORT (PERSONNEL OFFICE)
// ============================================================================

/**
 * GET /api/vacations/export/all?year=2026
 * PDF mit Gesamtübersicht aller Mitarbeiter für Personalbüro
 */
exports.exportAll = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Fetch all balances
    const balancesResult = await pool.query(`
      SELECT 
        u.id as user_id,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        u.first_name, u.last_name,
        ve.total_days,
        ve.carried_over,
        (ve.total_days + COALESCE(ve.carried_over, 0)) as available_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = u.id 
             AND v.status = 'approved' AND v.end_date < CURRENT_DATE
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $1),
          0
        ) as taken_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = u.id 
             AND v.status = 'approved' AND v.end_date >= CURRENT_DATE
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $1),
          0
        ) as approved_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = u.id 
             AND v.status = 'pending'
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $1),
          0
        ) as pending_days,
        (ve.total_days + COALESCE(ve.carried_over, 0) - COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = u.id 
             AND v.status IN ('approved', 'pending')
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $1),
          0
        )) as remaining_days,
        COALESCE(
          (SELECT json_agg(r.name ORDER BY r.name)
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = u.id),
          '[]'::json
        ) as roles
      FROM users u
      JOIN vacation_entitlements ve ON ve.user_id = u.id AND ve.year = $1
      WHERE u.is_active = true
        AND u.vacation_tracking_enabled = true
      ORDER BY u.last_name, u.first_name
    `, [year]);

    // Summary stats
    const totalEmployees = balancesResult.rows.length;
    const totalDays = balancesResult.rows.reduce((sum, b) => sum + parseFloat(b.available_days || 0), 0);
    const totalTaken = balancesResult.rows.reduce((sum, b) => sum + parseFloat(b.taken_days || 0), 0);
    const totalApproved = balancesResult.rows.reduce((sum, b) => sum + parseFloat(b.approved_days || 0), 0);
    const totalPending = balancesResult.rows.reduce((sum, b) => sum + parseFloat(b.pending_days || 0), 0);
    const totalUsed = totalTaken + totalApproved + totalPending;
    const totalRemaining = balancesResult.rows.reduce((sum, b) => sum + parseFloat(b.remaining_days || 0), 0);

    // Fetch all vacations for detail view (approved + pending)
    const vacationsResult = await pool.query(`
      SELECT 
        v.user_id,
        v.start_date,
        v.end_date,
        v.calculated_days,
        v.status,
        v.note,
        v.approved_at,
        vt.name as type_name,
        vt.affects_balance,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.status IN ('approved', 'pending')
        AND EXTRACT(YEAR FROM v.start_date) = $1
      ORDER BY v.start_date
    `, [year]);

    // Group vacations by user
    const vacationsByUser = {};
    for (const v of vacationsResult.rows) {
      if (!vacationsByUser[v.user_id]) {
        vacationsByUser[v.user_id] = [];
      }
      vacationsByUser[v.user_id].push(v);
    }

    // Pending requests count
    const pendingResult = await pool.query(`
      SELECT user_id, COUNT(*) as count
      FROM vacations
      WHERE status = 'pending' AND EXTRACT(YEAR FROM start_date) = $1
      GROUP BY user_id
    `, [year]);
    const pendingByUser = {};
    for (const p of pendingResult.rows) {
      pendingByUser[p.user_id] = parseInt(p.count);
    }

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    
    const filename = `Urlaubsuebersicht_Gesamt_${year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(`Urlaubsübersicht ${year} - Alle Mitarbeiter`, 40, 30);
    doc.fontSize(10).font('Helvetica').text(`Erstellt am: ${formatDateTime(new Date())}`, 40, 55);
    doc.moveTo(40, 70).lineTo(800, 70).stroke();

    let y = 85;
    let pageNum = 1;

    // Summary Box
    doc.rect(40, y, 760, 45).stroke();
    doc.fontSize(11).font('Helvetica-Bold').text('Zusammenfassung', 50, y + 8);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Mitarbeiter: ${totalEmployees}`, 50, y + 25);
    doc.text(`Verfügbar: ${totalDays}`, 200, y + 25);
    doc.text(`Genommen: ${totalTaken}`, 340, y + 25);
    doc.text(`Genehmigt: ${totalApproved}`, 460, y + 25);
    doc.text(`Beantragt: ${totalPending}`, 570, y + 25);
    doc.text(`Rest: ${totalRemaining}`, 680, y + 25);
    y += 60;

    // Table Header
    const drawTableHeader = (yPos) => {
      doc.rect(40, yPos, 760, 20).fill('#f3f4f6');
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Mitarbeiter', 45, yPos + 6);
      doc.text('Rollen', 195, yPos + 6);
      doc.text('Anspruch', 370, yPos + 6);
      doc.text('Übertrag', 430, yPos + 6);
      doc.text('Verfügbar', 490, yPos + 6);
      doc.text('Genomm.', 555, yPos + 6);
      doc.text('Genehm.', 615, yPos + 6);
      doc.text('Beantr.', 675, yPos + 6);
      doc.text('Rest', 735, yPos + 6);
      return yPos + 25;
    };

    y = drawTableHeader(y);

    // Footer helper for landscape
    const addLandscapeFooter = (d, pNum) => {
      const savedY = d.y;
      d.fontSize(8).font('Helvetica');
      d.text(`Seite ${pNum} - MDS Manufacturing Data System`, 40, 540, { 
        align: 'center', 
        width: 760
      });
      d.y = savedY;
    };

    // Table Rows
    doc.font('Helvetica').fontSize(9);
    for (const b of balancesResult.rows) {
      if (y > 520) {
        addLandscapeFooter(doc, pageNum);
        doc.addPage({ layout: 'landscape' });
        pageNum++;
        y = 40;
        y = drawTableHeader(y);
        doc.font('Helvetica').fontSize(9);
      }

      const roles = Array.isArray(b.roles) ? b.roles.join(', ') : '';

      // Row background for low remaining
      if (b.remaining_days < 0) {
        doc.rect(40, y - 2, 760, 18).fill('#fee2e2');
        doc.fillColor('#000000');
      } else if (b.remaining_days < 5) {
        doc.rect(40, y - 2, 760, 18).fill('#fef9c3');
        doc.fillColor('#000000');
      }

      doc.text(b.display_name, 45, y, { width: 145 });
      doc.text(roles, 195, y, { width: 170 });
      doc.text(`${b.total_days}`, 370, y, { width: 55 });
      doc.text(`${b.carried_over || 0}`, 430, y, { width: 55 });
      doc.text(`${b.available_days}`, 490, y, { width: 55 });
      doc.text(`${b.taken_days}`, 555, y, { width: 55 });
      doc.fillColor('#16a34a').text(`${b.approved_days}`, 615, y, { width: 55 });
      doc.fillColor('#d97706').text(`${b.pending_days}`, 675, y, { width: 55 });
      
      const restColor = b.remaining_days < 0 ? '#dc2626' : b.remaining_days < 5 ? '#d97706' : '#16a34a';
      doc.fillColor(restColor).text(`${b.remaining_days}`, 735, y, { width: 55 });
      doc.fillColor('#000000');

      y += 20;
    }

    // Totals row
    doc.moveTo(40, y).lineTo(800, y).stroke();
    y += 5;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('GESAMT', 45, y);
    doc.text(`${totalDays}`, 490, y);
    doc.text(`${totalTaken}`, 555, y);
    doc.text(`${totalApproved}`, 615, y);
    doc.text(`${totalPending}`, 675, y);
    doc.text(`${totalRemaining}`, 735, y);

    // Footer for overview page
    addLandscapeFooter(doc, pageNum);

    // ========== INDIVIDUAL USER PAGES (Portrait) ==========
    for (const b of balancesResult.rows) {
      doc.addPage({ size: 'A4', layout: 'portrait', margin: 50 });
      pageNum++;
      
      // Header
      doc.fontSize(16).font('Helvetica-Bold').text(`Urlaubsübersicht ${year}`, 50, 50);
      doc.fontSize(14).font('Helvetica').text(b.display_name, 50, 75);
      
      const roles = Array.isArray(b.roles) ? b.roles : [];
      if (roles.length > 0) {
        doc.fontSize(10).text(`Rollen: ${roles.join(', ')}`, 50, 95);
      }
      
      doc.moveTo(50, 115).lineTo(545, 115).stroke();
      y = 130;

      // Balance Box
      doc.rect(50, y, 495, 75).stroke();
      doc.fontSize(11).font('Helvetica-Bold').text('Urlaubskonto', 60, y + 8);
      
      doc.fontSize(10).font('Helvetica');
      const col1 = 60, col2 = 170, col3 = 280, col4 = 400;
      
      doc.text('Anspruch:', col1, y + 28);
      doc.font('Helvetica-Bold').text(`${b.total_days} Tage`, col1, y + 42);
      
      doc.font('Helvetica').text('Übertrag:', col2, y + 28);
      doc.font('Helvetica-Bold').text(`${b.carried_over || 0} Tage`, col2, y + 42);

      doc.font('Helvetica').text('Genommen:', col1, y + 55);
      doc.font('Helvetica-Bold').text(`${b.taken_days}`, col1, y + 67);

      doc.font('Helvetica').text('Genehmigt:', col2, y + 55);
      doc.fillColor('#16a34a').font('Helvetica-Bold').text(`${b.approved_days}`, col2, y + 67);
      doc.fillColor('#000000');

      doc.font('Helvetica').text('Beantragt:', col3, y + 55);
      doc.fillColor('#d97706').font('Helvetica-Bold').text(`${b.pending_days}`, col3, y + 67);
      doc.fillColor('#000000');
      
      doc.font('Helvetica').text('Rest:', col4, y + 55);
      const restColor = b.remaining_days < 0 ? '#dc2626' : b.remaining_days < 5 ? '#d97706' : '#16a34a';
      doc.fillColor(restColor).font('Helvetica-Bold').text(`${b.remaining_days} Tage`, col4, y + 67);
      doc.fillColor('#000000');
      
      y += 90;

      // Split vacations
      const userVacations = vacationsByUser[b.user_id] || [];
      const balanceEntries = userVacations.filter(v => v.affects_balance);
      const otherEntries = userVacations.filter(v => !v.affects_balance);

      // Table drawing helpers
      const drawSectionHeader = (yPos, headerColor = '#f3f4f6') => {
        doc.rect(50, yPos, 495, 18).fill(headerColor);
        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
        doc.text('Zeitraum', 55, yPos + 5);
        doc.text('Art', 180, yPos + 5);
        doc.text('Tage', 300, yPos + 5);
        doc.text('Status', 355, yPos + 5);
        doc.text('Genehmigt von', 440, yPos + 5);
        return yPos + 22;
      };

      const drawSectionRows = (entries, yStart, headerColor) => {
        let yy = yStart;
        doc.font('Helvetica').fontSize(9);
        let totalDays = 0;

        for (const v of entries) {
          if (yy > 720) {
            addFooter(doc, pageNum);
            doc.addPage({ size: 'A4', layout: 'portrait', margin: 50 });
            pageNum++;
            yy = 50;
            yy = drawSectionHeader(yy, headerColor);
            doc.font('Helvetica').fontSize(9);
          }

          const dateRange = v.start_date === v.end_date 
            ? formatDate(v.start_date)
            : `${formatDate(v.start_date)} – ${formatDate(v.end_date)}`;

          doc.fillColor('#000000');
          doc.text(dateRange, 55, yy, { width: 120 });
          doc.text(v.type_name, 180, yy, { width: 115 });
          doc.text(`${v.calculated_days}`, 300, yy, { width: 50 });

          const statusColor = v.status === 'approved' ? '#16a34a' : v.status === 'pending' ? '#d97706' : '#dc2626';
          doc.fillColor(statusColor).text(getStatusText(v.status), 355, yy, { width: 80 });
          doc.fillColor('#000000');

          doc.text(v.approved_by_name || '–', 440, yy, { width: 100 });
          
          totalDays += parseFloat(v.calculated_days || 0);
          yy += 16;
        }

        // Total
        doc.fillColor('#000000');
        doc.moveTo(50, yy).lineTo(545, yy).stroke();
        yy += 4;
        doc.font('Helvetica-Bold');
        doc.text('Gesamt:', 55, yy);
        doc.text(`${totalDays} Tage`, 300, yy);
        return yy + 20;
      };

      // Vom Urlaubskonto
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('Vom Urlaubskonto', 50, y);
      y += 18;

      if (balanceEntries.length === 0) {
        doc.fontSize(10).font('Helvetica').text('Keine Einträge.', 50, y);
        y += 25;
      } else {
        y = drawSectionHeader(y);
        y = drawSectionRows(balanceEntries, y, '#f3f4f6');
      }

      // Ohne Urlaubsabzug
      if (otherEntries.length > 0) {
        if (y > 650) {
          addFooter(doc, pageNum);
          doc.addPage({ size: 'A4', layout: 'portrait', margin: 50 });
          pageNum++;
          y = 50;
        }

        y += 5;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('Ohne Urlaubsabzug', 50, y);
        y += 18;

        y = drawSectionHeader(y, '#e0f2fe');
        y = drawSectionRows(otherEntries, y, '#e0f2fe');
      }

      // Footer
      addFooter(doc, pageNum);
    }

    doc.end();

  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Exports' });
  }
};

// ============================================================================
// SINGLE USER EXPORT (ADMIN)
// ============================================================================

/**
 * GET /api/vacations/export/user/:userId?year=2026
 * PDF mit Urlaubsüberblick eines bestimmten Mitarbeiters (für Admin/Verwalter)
 */
exports.exportUserYear = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const year = parseInt(req.query.year) || new Date().getFullYear();

    // Fetch user info
    const userResult = await pool.query(`
      SELECT 
        u.id, u.username, 
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        u.first_name, u.last_name,
        COALESCE(
          (SELECT json_agg(r.name)
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = u.id),
          '[]'::json
        ) as roles
      FROM users u
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    const user = userResult.rows[0];

    // Fetch balance (nur affects_balance Typen)
    const balanceResult = await pool.query(`
      SELECT 
        ve.total_days,
        ve.carried_over,
        ve.adjustment,
        (ve.total_days + COALESCE(ve.carried_over, 0) + COALESCE(ve.adjustment, 0)) as available_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = $1 
             AND v.status = 'approved' AND v.end_date < CURRENT_DATE
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $2),
          0
        ) as taken_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = $1 
             AND v.status = 'approved' AND v.end_date >= CURRENT_DATE
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $2),
          0
        ) as approved_days,
        COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = $1 
             AND v.status = 'pending'
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $2),
          0
        ) as pending_days
      FROM vacation_entitlements ve
      WHERE ve.user_id = $1 AND ve.year = $2
    `, [userId, year]);

    const balance = balanceResult.rows[0] || {
      total_days: 0, carried_over: 0, adjustment: 0, available_days: 0,
      taken_days: 0, approved_days: 0, pending_days: 0
    };
    balance.used_days = parseFloat(balance.taken_days) + parseFloat(balance.approved_days) + parseFloat(balance.pending_days);
    balance.remaining_days = balance.available_days - balance.used_days;

    // Fetch all vacations for user/year
    const vacationsResult = await pool.query(`
      SELECT 
        v.*,
        vt.name as type_name,
        vt.color as type_color,
        vt.affects_balance,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.user_id = $1 
        AND EXTRACT(YEAR FROM v.start_date) = $2
        AND v.status IN ('approved', 'pending')
      ORDER BY v.start_date
    `, [userId, year]);

    // Split by affects_balance
    const allVacations = vacationsResult.rows;
    const balanceEntries = allVacations.filter(v => v.affects_balance);
    const otherEntries = allVacations.filter(v => !v.affects_balance);

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    const filename = `Urlaubsuebersicht_${user.display_name.replace(/\s+/g, '_')}_${year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    doc.pipe(res);

    let y = setupPDF(doc, `Urlaubsübersicht ${year}`, user.display_name);
    let pageNum = 1;

    // Roles
    const roles = Array.isArray(user.roles) ? user.roles : [];
    if (roles.length > 0) {
      doc.fontSize(10).font('Helvetica').text(`Rollen: ${roles.join(', ')}`, 50, y);
      y += 20;
    }

    // ========== BALANCE BOX ==========
    const hasAdjustment = balance.adjustment && parseFloat(balance.adjustment) !== 0;
    const boxHeight = hasAdjustment ? 95 : 85;
    doc.rect(50, y, 495, boxHeight).stroke();
    doc.fontSize(12).font('Helvetica-Bold').text('Urlaubskonto', 60, y + 10);
    
    doc.fontSize(10).font('Helvetica');
    const col1 = 60, col2 = 180, col3 = 300, col4 = 420;
    
    doc.text('Anspruch:', col1, y + 30);
    doc.font('Helvetica-Bold').text(`${balance.total_days} Tage`, col1, y + 45);
    
    doc.font('Helvetica').text('Übertrag:', col2, y + 30);
    doc.font('Helvetica-Bold').text(`${balance.carried_over || 0} Tage`, col2, y + 45);

    if (hasAdjustment) {
      doc.font('Helvetica').text('Korrektur:', col3, y + 30);
      doc.font('Helvetica-Bold').text(`${balance.adjustment} Tage`, col3, y + 45);
    }

    doc.font('Helvetica').text('Verfügbar:', col4, y + 30);
    doc.font('Helvetica-Bold').text(`${balance.available_days} Tage`, col4, y + 45);

    const row2Y = y + (hasAdjustment ? 65 : 60);

    doc.font('Helvetica').text('Genommen:', col1, row2Y);
    doc.font('Helvetica-Bold').text(`${balance.taken_days} Tage`, col1, row2Y + 15);

    doc.font('Helvetica').text('Genehmigt:', col2, row2Y);
    doc.fillColor('#16a34a').font('Helvetica-Bold').text(`${balance.approved_days} Tage`, col2, row2Y + 15);
    doc.fillColor('#000000');

    doc.font('Helvetica').text('Beantragt:', col3, row2Y);
    doc.fillColor('#d97706').font('Helvetica-Bold').text(`${balance.pending_days} Tage`, col3, row2Y + 15);
    doc.fillColor('#000000');
    
    doc.font('Helvetica').text('Rest:', col4, row2Y);
    const restColor = balance.remaining_days < 0 ? '#dc2626' : balance.remaining_days < 5 ? '#d97706' : '#16a34a';
    doc.fillColor(restColor).font('Helvetica-Bold').text(`${balance.remaining_days} Tage`, col4, row2Y + 15);
    doc.fillColor('#000000');
    
    y += boxHeight + 15;

    // ========== TABLE HELPER ==========
    const drawHeader = (yPos, headerColor = '#f3f4f6') => {
      doc.rect(50, yPos, 495, 18).fill(headerColor);
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Zeitraum', 55, yPos + 5);
      doc.text('Art', 175, yPos + 5);
      doc.text('Tage', 290, yPos + 5);
      doc.text('Status', 340, yPos + 5);
      doc.text('Genehmigt von', 430, yPos + 5);
      return yPos + 22;
    };

    const drawRows = (rows, yStart, headerColor) => {
      let yy = yStart;
      doc.font('Helvetica').fontSize(9);
      for (const v of rows) {
        if (yy > 720) {
          addFooter(doc, pageNum);
          doc.addPage();
          pageNum++;
          yy = 50;
          yy = drawHeader(yy, headerColor);
          doc.font('Helvetica').fontSize(9);
        }

        const dateRange = v.start_date === v.end_date 
          ? formatDate(v.start_date)
          : `${formatDate(v.start_date)} – ${formatDate(v.end_date)}`;

        doc.fillColor('#000000');
        doc.text(dateRange, 55, yy, { width: 115 });
        doc.text(v.type_name, 175, yy, { width: 110 });
        doc.text(`${v.calculated_days}`, 290, yy, { width: 45 });
        
        const statusColor = v.status === 'approved' ? '#16a34a' : v.status === 'pending' ? '#d97706' : '#dc2626';
        doc.fillColor(statusColor).text(getStatusText(v.status), 340, yy, { width: 85 });
        doc.fillColor('#000000');
        
        doc.text(v.approved_by_name || '–', 430, yy, { width: 110 });
        
        yy += 18;
      }
      return yy;
    };

    const drawSection = (title, entries, headerColor = '#f3f4f6') => {
      if (y > 650) {
        addFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        y = 50;
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text(title, 50, y);
      y += 20;

      if (entries.length === 0) {
        doc.fontSize(10).font('Helvetica').text('Keine Einträge.', 50, y);
        y += 25;
        return;
      }

      y = drawHeader(y, headerColor);
      y = drawRows(entries, y, headerColor);

      doc.fillColor('#000000');
      doc.moveTo(50, y).lineTo(545, y).stroke();
      y += 5;
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Gesamt:', 55, y);
      const total = entries.reduce((sum, v) => sum + parseFloat(v.calculated_days || 0), 0);
      doc.text(`${total} Tage`, 290, y);
      y += 25;
    };

    // ========== SECTIONS ==========
    drawSection('Vom Urlaubskonto', balanceEntries, '#f3f4f6');
    if (otherEntries.length > 0) {
      drawSection('Ohne Urlaubsabzug', otherEntries, '#e0f2fe');
    }

    // Footer
    addFooter(doc, pageNum);
    doc.end();

  } catch (error) {
    console.error('Export user year error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Exports' });
  }
};
