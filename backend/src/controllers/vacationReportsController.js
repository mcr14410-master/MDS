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
             AND v.status = 'approved'
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $2),
          0
        ) as used_days
      FROM vacation_entitlements ve
      WHERE ve.user_id = $1 AND ve.year = $2
    `, [userId, year]);

    const balance = balanceResult.rows[0] || {
      total_days: 0,
      carried_over: 0,
      available_days: 0,
      used_days: 0
    };
    balance.remaining_days = balance.available_days - balance.used_days;

    // Fetch vacations
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
        AND v.status = 'approved'
      ORDER BY v.start_date
    `, [userId, year]);

    // Fetch pending/rejected requests
    const requestsResult = await pool.query(`
      SELECT 
        v.*,
        vt.name as type_name,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.user_id = $1 
        AND EXTRACT(YEAR FROM v.start_date) = $2
        AND v.status IN ('pending', 'rejected')
      ORDER BY v.start_date
    `, [userId, year]);

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
    doc.rect(50, y, 495, 70).stroke();
    doc.fontSize(12).font('Helvetica-Bold').text('Urlaubskonto', 60, y + 10);
    
    doc.fontSize(10).font('Helvetica');
    const col1 = 60, col2 = 180, col3 = 300, col4 = 420;
    
    doc.text('Anspruch:', col1, y + 30);
    doc.font('Helvetica-Bold').text(`${balance.total_days} Tage`, col1, y + 45);
    
    doc.font('Helvetica').text('Übertrag:', col2, y + 30);
    doc.font('Helvetica-Bold').text(`${balance.carried_over || 0} Tage`, col2, y + 45);
    
    doc.font('Helvetica').text('Genommen:', col3, y + 30);
    doc.font('Helvetica-Bold').text(`${balance.used_days} Tage`, col3, y + 45);
    
    doc.font('Helvetica').text('Rest:', col4, y + 30);
    const restColor = balance.remaining_days < 0 ? '#dc2626' : balance.remaining_days < 5 ? '#d97706' : '#16a34a';
    doc.fillColor(restColor).font('Helvetica-Bold').text(`${balance.remaining_days} Tage`, col4, y + 45);
    doc.fillColor('#000000');
    
    y += 85;

    // ========== APPROVED VACATIONS TABLE ==========
    doc.fontSize(12).font('Helvetica-Bold').text('Genehmigte Abwesenheiten', 50, y);
    y += 20;

    if (vacationsResult.rows.length === 0) {
      doc.fontSize(10).font('Helvetica').text('Keine genehmigten Abwesenheiten in diesem Jahr.', 50, y);
      y += 25;
    } else {
      // Table Header
      const drawVacationHeader = (yPos) => {
        doc.rect(50, yPos, 495, 18).fill('#f3f4f6');
        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
        doc.text('Zeitraum', 55, yPos + 5);
        doc.text('Art', 170, yPos + 5);
        doc.text('Tage', 280, yPos + 5);
        doc.text('Genehmigt am', 330, yPos + 5);
        doc.text('Genehmigt von', 430, yPos + 5);
        return yPos + 22;
      };

      y = drawVacationHeader(y);
      doc.font('Helvetica').fontSize(9);

      for (const v of vacationsResult.rows) {
        if (y > 720) {
          addFooter(doc, pageNum);
          doc.addPage();
          pageNum++;
          y = 50;
          y = drawVacationHeader(y);
          doc.font('Helvetica').fontSize(9);
        }

        const dateRange = v.start_date === v.end_date 
          ? formatDate(v.start_date)
          : `${formatDate(v.start_date)} - ${formatDate(v.end_date)}`;

        doc.text(dateRange, 55, y, { width: 110 });
        doc.text(v.type_name, 170, y, { width: 105 });
        doc.text(`${v.calculated_days}`, 280, y, { width: 45 });
        doc.text(formatDate(v.approved_at), 330, y, { width: 95 });
        doc.text(v.approved_by_name || '-', 430, y, { width: 110 });
        
        y += 18;
      }

      // Total
      doc.moveTo(50, y).lineTo(545, y).stroke();
      y += 5;
      doc.font('Helvetica-Bold').text('Gesamt:', 55, y);
      const totalDays = vacationsResult.rows.reduce((sum, v) => sum + parseFloat(v.calculated_days || 0), 0);
      doc.text(`${totalDays} Tage`, 280, y);
      y += 25;
    }

    // ========== PENDING/REJECTED REQUESTS ==========
    if (requestsResult.rows.length > 0) {
      if (y > 650) {
        addFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        y = 50;
      }

      doc.fontSize(12).font('Helvetica-Bold').text('Offene/Abgelehnte Anträge', 50, y);
      y += 20;

      // Table Header
      doc.rect(50, y, 495, 18).fill('#fef3c7');
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Zeitraum', 55, y + 5);
      doc.text('Art', 170, y + 5);
      doc.text('Tage', 280, y + 5);
      doc.text('Status', 330, y + 5);
      doc.text('Grund', 400, y + 5);
      y += 22;

      doc.font('Helvetica').fontSize(9);
      for (const r of requestsResult.rows) {
        const dateRange = r.start_date === r.end_date 
          ? formatDate(r.start_date)
          : `${formatDate(r.start_date)} - ${formatDate(r.end_date)}`;

        doc.text(dateRange, 55, y, { width: 110 });
        doc.text(r.type_name, 170, y, { width: 105 });
        doc.text(`${r.calculated_days}`, 280, y, { width: 45 });
        
        const statusColor = r.status === 'pending' ? '#d97706' : '#dc2626';
        doc.fillColor(statusColor).text(getStatusText(r.status), 330, y, { width: 65 });
        doc.fillColor('#000000');
        
        doc.text(r.rejection_reason || '-', 400, y, { width: 140 });
        
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
             AND v.status = 'approved'
             AND vt.affects_balance = true
             AND EXTRACT(YEAR FROM v.start_date) = $1),
          0
        ) as used_days,
        (ve.total_days + COALESCE(ve.carried_over, 0) - COALESCE(
          (SELECT SUM(v.calculated_days)
           FROM vacations v
           JOIN vacation_types vt ON vt.id = v.type_id
           WHERE v.user_id = u.id 
             AND v.status = 'approved'
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
    const totalUsed = balancesResult.rows.reduce((sum, b) => sum + parseFloat(b.used_days || 0), 0);
    const totalRemaining = balancesResult.rows.reduce((sum, b) => sum + parseFloat(b.remaining_days || 0), 0);

    // Fetch all vacations for detail view
    const vacationsResult = await pool.query(`
      SELECT 
        v.user_id,
        v.start_date,
        v.end_date,
        v.calculated_days,
        v.note,
        v.approved_at,
        vt.name as type_name,
        vt.affects_balance,
        approver.first_name || ' ' || approver.last_name as approved_by_name
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      LEFT JOIN users approver ON approver.id = v.approved_by
      WHERE v.status = 'approved'
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
    doc.text(`Gesamt verfügbar: ${totalDays} Tage`, 200, y + 25);
    doc.text(`Genommen: ${totalUsed} Tage`, 400, y + 25);
    doc.text(`Verbleibend: ${totalRemaining} Tage`, 580, y + 25);
    y += 60;

    // Table Header (ohne Abwesenheiten-Spalte)
    const drawTableHeader = (yPos) => {
      doc.rect(40, yPos, 660, 20).fill('#f3f4f6');
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Mitarbeiter', 45, yPos + 6);
      doc.text('Rollen', 200, yPos + 6);
      doc.text('Anspruch', 380, yPos + 6);
      doc.text('Übertrag', 450, yPos + 6);
      doc.text('Verfügbar', 520, yPos + 6);
      doc.text('Genommen', 590, yPos + 6);
      doc.text('Rest', 660, yPos + 6);
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
        doc.rect(40, y - 2, 660, 18).fill('#fee2e2');
        doc.fillColor('#000000');
      } else if (b.remaining_days < 5) {
        doc.rect(40, y - 2, 660, 18).fill('#fef9c3');
        doc.fillColor('#000000');
      }

      doc.text(b.display_name, 45, y, { width: 150 });
      doc.text(roles, 200, y, { width: 175 });
      doc.text(`${b.total_days}`, 380, y, { width: 65 });
      doc.text(`${b.carried_over || 0}`, 450, y, { width: 65 });
      doc.text(`${b.available_days}`, 520, y, { width: 65 });
      doc.text(`${b.used_days}`, 590, y, { width: 65 });
      
      const restColor = b.remaining_days < 0 ? '#dc2626' : b.remaining_days < 5 ? '#d97706' : '#16a34a';
      doc.fillColor(restColor).text(`${b.remaining_days}`, 660, y, { width: 55 });
      doc.fillColor('#000000');

      y += 20;
    }

    // Totals row
    doc.moveTo(40, y).lineTo(700, y).stroke();
    y += 5;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('GESAMT', 45, y);
    doc.text(`${totalDays}`, 520, y);
    doc.text(`${totalUsed}`, 590, y);
    doc.text(`${totalRemaining}`, 660, y);

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
      doc.rect(50, y, 495, 60).stroke();
      doc.fontSize(11).font('Helvetica-Bold').text('Urlaubskonto', 60, y + 8);
      
      doc.fontSize(10).font('Helvetica');
      const col1 = 60, col2 = 170, col3 = 280, col4 = 400;
      
      doc.text('Anspruch:', col1, y + 28);
      doc.font('Helvetica-Bold').text(`${b.total_days} Tage`, col1, y + 42);
      
      doc.font('Helvetica').text('Übertrag:', col2, y + 28);
      doc.font('Helvetica-Bold').text(`${b.carried_over || 0} Tage`, col2, y + 42);
      
      doc.font('Helvetica').text('Genommen:', col3, y + 28);
      doc.font('Helvetica-Bold').text(`${b.used_days} Tage`, col3, y + 42);
      
      doc.font('Helvetica').text('Rest:', col4, y + 28);
      const restColor = b.remaining_days < 0 ? '#dc2626' : b.remaining_days < 5 ? '#d97706' : '#16a34a';
      doc.fillColor(restColor).font('Helvetica-Bold').text(`${b.remaining_days} Tage`, col4, y + 42);
      doc.fillColor('#000000');
      
      y += 75;

      // Vacations Table
      const userVacations = vacationsByUser[b.user_id] || [];
      
      doc.fontSize(11).font('Helvetica-Bold').text('Genehmigte Abwesenheiten', 50, y);
      y += 18;

      if (userVacations.length === 0) {
        doc.fontSize(10).font('Helvetica').text('Keine genehmigten Abwesenheiten in diesem Jahr.', 50, y);
      } else {
        // Table Header
        doc.rect(50, y, 495, 18).fill('#f3f4f6');
        doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
        doc.text('Zeitraum', 55, y + 5);
        doc.text('Art', 180, y + 5);
        doc.text('Tage', 300, y + 5);
        doc.text('Genehmigt am', 360, y + 5);
        doc.text('Genehmigt von', 460, y + 5);
        y += 22;

        doc.font('Helvetica').fontSize(9);
        let totalVacDays = 0;

        for (const v of userVacations) {
          if (y > 750) {
            addFooter(doc, pageNum);
            doc.addPage({ size: 'A4', layout: 'portrait', margin: 50 });
            pageNum++;
            y = 50;
            
            // Re-draw header on new page
            doc.rect(50, y, 495, 18).fill('#f3f4f6');
            doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
            doc.text('Zeitraum', 55, y + 5);
            doc.text('Art', 180, y + 5);
            doc.text('Tage', 300, y + 5);
            doc.text('Genehmigt am', 360, y + 5);
            doc.text('Genehmigt von', 460, y + 5);
            y += 22;
            doc.font('Helvetica').fontSize(9);
          }

          const dateRange = v.start_date === v.end_date 
            ? formatDate(v.start_date)
            : `${formatDate(v.start_date)} - ${formatDate(v.end_date)}`;

          doc.text(dateRange, 55, y, { width: 120 });
          doc.text(v.type_name, 180, y, { width: 115 });
          doc.text(`${v.calculated_days}`, 300, y, { width: 55 });
          doc.text(formatDate(v.approved_at), 360, y, { width: 95 });
          doc.text(v.approved_by_name || '-', 460, y, { width: 85 });
          
          totalVacDays += parseFloat(v.calculated_days || 0);
          y += 16;
        }

        // Total
        doc.moveTo(50, y).lineTo(545, y).stroke();
        y += 4;
        doc.font('Helvetica-Bold');
        doc.text('Gesamt:', 55, y);
        doc.text(`${totalVacDays} Tage`, 300, y);
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
