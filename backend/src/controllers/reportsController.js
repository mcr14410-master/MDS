/**
 * Reports Controller
 * 
 * PDF-Export für Audits und Reports
 * 
 * Routes:
 * - GET /api/reports/calibration-overview     - Kalibrierungs-Übersicht (alle Messmittel)
 * - GET /api/reports/calibration-due          - Fälligkeitsbericht
 * - GET /api/reports/equipment/:id/history    - Einzelbericht mit Historie
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
    ok: 'OK',
    due_soon: 'Fällig (≤30 Tage)',
    overdue: 'Überfällig',
    locked: 'Gesperrt',
    in_calibration: 'In Kalibrierung',
    repair: 'In Reparatur',
    retired: 'Ausgemustert'
  };
  return labels[status] || status;
};

const getResultText = (result) => {
  const labels = {
    passed: 'Bestanden',
    failed: 'Nicht bestanden',
    adjusted: 'Justiert',
    limited: 'Eingeschränkt'
  };
  return labels[result] || result;
};

// PDF Styling Helper
const setupPDF = (doc, title) => {
  // Header
  doc.fontSize(18).font('Helvetica-Bold').text(title, 50, 50);
  doc.fontSize(10).font('Helvetica').text(`Erstellt am: ${formatDateTime(new Date())}`, 50, 75);
  doc.moveTo(50, 95).lineTo(545, 95).stroke();
  return 110; // Starting Y position after header
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
// CALIBRATION OVERVIEW REPORT
// ============================================================================

/**
 * GET /api/reports/calibration-overview
 * PDF mit allen Messmitteln und Kalibrierungsstatus
 */
exports.getCalibrationOverview = async (req, res) => {
  try {
    // Fetch all equipment
    const result = await pool.query(`
      SELECT me.*
      FROM measuring_equipment_with_status me
      ORDER BY 
        CASE me.calibration_status 
          WHEN 'overdue' THEN 1 
          WHEN 'due_soon' THEN 2 
          ELSE 3 
        END,
        me.inventory_number
    `);

    // Summary stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE calibration_status = 'ok') as ok_count,
        COUNT(*) FILTER (WHERE calibration_status = 'due_soon') as due_soon_count,
        COUNT(*) FILTER (WHERE calibration_status = 'overdue') as overdue_count,
        COUNT(*) FILTER (WHERE calibration_status = 'locked') as locked_count
      FROM measuring_equipment_with_status
    `);
    const stats = statsResult.rows[0];

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Kalibrierungsuebersicht_${formatDate(new Date()).replace(/\./g, '-')}.pdf`);
    
    doc.pipe(res);

    let y = setupPDF(doc, 'Kalibrierungs-Übersicht');
    let pageNum = 1;

    // Summary Box
    doc.rect(50, y, 495, 60).stroke();
    doc.fontSize(11).font('Helvetica-Bold').text('Zusammenfassung', 60, y + 10);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Gesamt: ${stats.total}`, 60, y + 28);
    doc.text(`OK: ${stats.ok_count}`, 150, y + 28);
    doc.text(`Fällig: ${stats.due_soon_count}`, 240, y + 28);
    doc.text(`Überfällig: ${stats.overdue_count}`, 330, y + 28);
    doc.text(`Gesperrt: ${stats.locked_count}`, 420, y + 28);
    y += 75;

    // Table Header
    const drawTableHeader = (yPos) => {
      doc.rect(50, yPos, 495, 20).fill('#f3f4f6');
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Inventar-Nr.', 55, yPos + 6);
      doc.text('Bezeichnung', 130, yPos + 6);
      doc.text('Typ', 280, yPos + 6);
      doc.text('Status', 360, yPos + 6);
      doc.text('Nächste Kal.', 430, yPos + 6);
      doc.text('Tage', 510, yPos + 6);
      return yPos + 25;
    };

    y = drawTableHeader(y);

    // Table Rows
    doc.font('Helvetica').fontSize(8);
    for (const eq of result.rows) {
      if (y > 730) {
        addFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        y = setupPDF(doc, 'Kalibrierungs-Übersicht (Fortsetzung)');
        y = drawTableHeader(y);
        doc.font('Helvetica').fontSize(8);
      }

      // Row background for overdue
      if (eq.calibration_status === 'overdue') {
        doc.rect(50, y - 3, 495, 18).fill('#fef2f2');
        doc.fillColor('#000000');
      } else if (eq.calibration_status === 'due_soon') {
        doc.rect(50, y - 3, 495, 18).fill('#fefce8');
        doc.fillColor('#000000');
      }

      doc.text(eq.inventory_number, 55, y, { width: 70 });
      doc.text(eq.name?.substring(0, 25) || '-', 130, y, { width: 145 });
      doc.text(eq.type_name?.substring(0, 15) || '-', 280, y, { width: 75 });
      doc.text(getStatusText(eq.calibration_status), 360, y, { width: 65 });
      doc.text(formatDate(eq.next_calibration_date), 430, y, { width: 70 });
      
      const daysText = eq.days_until_calibration !== null 
        ? (eq.days_until_calibration < 0 ? `${Math.abs(eq.days_until_calibration)} über` : eq.days_until_calibration.toString())
        : '-';
      doc.text(daysText, 510, y, { width: 30 });

      y += 18;
    }

    addFooter(doc, pageNum);
    doc.end();

  } catch (error) {
    console.error('Error generating calibration overview:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Reports',
      error: error.message
    });
  }
};

// ============================================================================
// CALIBRATION DUE REPORT
// ============================================================================

/**
 * GET /api/reports/calibration-due
 * PDF nur mit fälligen/überfälligen Messmitteln
 */
exports.getCalibrationDueReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        me.*,
        c.id as checkout_id,
        u.username as checked_out_by_name,
        sl.name as location_name,
        sc.name as compartment_name
      FROM measuring_equipment_with_status me
      LEFT JOIN storage_items si ON si.measuring_equipment_id = me.id 
        AND si.deleted_at IS NULL AND si.is_active = true
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sl.id = sc.location_id
      LEFT JOIN measuring_equipment_checkouts c ON me.id = c.equipment_id AND c.returned_at IS NULL
      LEFT JOIN users u ON c.checked_out_by = u.id
      WHERE me.calibration_status IN ('overdue', 'due_soon')
      ORDER BY 
        CASE me.calibration_status WHEN 'overdue' THEN 1 ELSE 2 END,
        me.days_until_calibration ASC
    `);

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Keine fälligen Kalibrierungen vorhanden'
      });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Kalibrierung_Faellig_${formatDate(new Date()).replace(/\./g, '-')}.pdf`);
    
    doc.pipe(res);

    let y = setupPDF(doc, 'Fälligkeitsbericht - Kalibrierung');
    let pageNum = 1;

    // Count summary
    const overdueCount = result.rows.filter(e => e.calibration_status === 'overdue').length;
    const dueSoonCount = result.rows.filter(e => e.calibration_status === 'due_soon').length;

    doc.fontSize(11).font('Helvetica');
    doc.fillColor('#dc2626').text(`Überfällig: ${overdueCount}`, 50, y);
    doc.fillColor('#ca8a04').text(`Bald fällig (≤30 Tage): ${dueSoonCount}`, 200, y);
    doc.fillColor('#000000');
    y += 25;

    // Table
    for (const eq of result.rows) {
      if (y > 700) {
        addFooter(doc, pageNum);
        doc.addPage();
        pageNum++;
        y = setupPDF(doc, 'Fälligkeitsbericht (Fortsetzung)');
      }

      // Card-style entry
      const cardColor = eq.calibration_status === 'overdue' ? '#fef2f2' : '#fefce8';
      const borderColor = eq.calibration_status === 'overdue' ? '#dc2626' : '#ca8a04';
      
      doc.rect(50, y, 495, 55).fillAndStroke(cardColor, borderColor);
      
      doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
      doc.text(eq.inventory_number, 60, y + 8);
      doc.font('Helvetica').text(eq.name, 150, y + 8, { width: 250 });
      
      // Status badge
      doc.fontSize(9);
      const statusX = 450;
      if (eq.calibration_status === 'overdue') {
        doc.fillColor('#dc2626').text(`${Math.abs(eq.days_until_calibration)} Tage überfällig`, statusX, y + 8);
      } else {
        doc.fillColor('#ca8a04').text(`in ${eq.days_until_calibration} Tagen`, statusX, y + 8);
      }
      
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica');
      doc.text(`Typ: ${eq.type_name || '-'}`, 60, y + 25);
      doc.text(`Nächste Kalibrierung: ${formatDate(eq.next_calibration_date)}`, 200, y + 25);
      const storageDisplay = eq.location_name 
        ? (eq.compartment_name ? `${eq.location_name} / ${eq.compartment_name}` : eq.location_name)
        : '-';
      doc.text(`Lagerort: ${storageDisplay}`, 60, y + 38);
      
      if (eq.checkout_id) {
        doc.fillColor('#ca8a04').text(`Entnommen: ${eq.checked_out_by_name}`, 300, y + 38);
      }
      
      doc.fillColor('#000000');
      y += 65;
    }

    addFooter(doc, pageNum);
    doc.end();

  } catch (error) {
    console.error('Error generating due report:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Reports',
      error: error.message
    });
  }
};

// ============================================================================
// EQUIPMENT HISTORY REPORT
// ============================================================================

/**
 * GET /api/reports/equipment/:id/history
 * PDF für einzelnes Messmittel mit kompletter Kalibrierungshistorie
 */
exports.getEquipmentHistoryReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Get equipment details with storage location
    const eqResult = await pool.query(`
      SELECT 
        me.*,
        sl.name as location_name,
        sc.name as compartment_name
      FROM measuring_equipment_with_status me
      LEFT JOIN storage_items si ON si.measuring_equipment_id = me.id 
        AND si.deleted_at IS NULL AND si.is_active = true
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE me.id = $1
    `, [id]);

    if (eqResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Messmittel nicht gefunden'
      });
    }

    const eq = eqResult.rows[0];

    // Get calibration history
    const calResult = await pool.query(`
      SELECT 
        c.*,
        u.username as performed_by_name,
        cu.username as created_by_name
      FROM calibrations c
      LEFT JOIN users u ON c.performed_by = u.id
      LEFT JOIN users cu ON c.created_by = cu.id
      WHERE c.equipment_id = $1
      ORDER BY c.calibration_date DESC
    `, [id]);

    // Get checkout history
    const checkoutResult = await pool.query(`
      SELECT 
        c.*,
        u1.username as checked_out_by_name,
        u2.username as returned_by_name
      FROM measuring_equipment_checkouts c
      JOIN users u1 ON c.checked_out_by = u1.id
      LEFT JOIN users u2 ON c.returned_by = u2.id
      WHERE c.equipment_id = $1
      ORDER BY c.checked_out_at DESC
      LIMIT 20
    `, [id]);

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Messmittel_${eq.inventory_number}_${formatDate(new Date()).replace(/\./g, '-')}.pdf`);
    
    doc.pipe(res);

    let y = setupPDF(doc, `Messmittel-Datenblatt: ${eq.inventory_number}`);
    let pageNum = 1;

    // Equipment Info Box
    doc.rect(50, y, 495, 120).stroke();
    doc.fontSize(12).font('Helvetica-Bold').text(eq.name, 60, y + 10);
    doc.fontSize(10).font('Helvetica');
    
    const col1 = 60, col2 = 300;
    let infoY = y + 30;
    
    doc.text(`Typ: ${eq.type_name || '-'}`, col1, infoY);
    doc.text(`Status: ${getStatusText(eq.calibration_status)}`, col2, infoY);
    infoY += 15;
    
    doc.text(`Hersteller: ${eq.manufacturer || '-'}`, col1, infoY);
    doc.text(`Modell: ${eq.model || '-'}`, col2, infoY);
    infoY += 15;
    
    doc.text(`Seriennummer: ${eq.serial_number || '-'}`, col1, infoY);
    const storageDisplay = eq.location_name 
      ? (eq.compartment_name ? `${eq.location_name} / ${eq.compartment_name}` : eq.location_name)
      : '-';
    doc.text(`Lagerort: ${storageDisplay}`, col2, infoY);
    infoY += 15;
    
    const range = eq.measuring_range_min !== null && eq.measuring_range_max !== null
      ? `${eq.measuring_range_min} - ${eq.measuring_range_max} ${eq.unit || 'mm'}`
      : (eq.nominal_value ? `Ø${eq.nominal_value}` : '-');
    doc.text(`Messbereich: ${range}`, col1, infoY);
    doc.text(`Auflösung: ${eq.resolution || '-'} ${eq.unit || 'mm'}`, col2, infoY);
    infoY += 15;
    
    doc.text(`Kalibrierintervall: ${eq.calibration_interval_months} Monate`, col1, infoY);
    doc.text(`Nächste Kalibrierung: ${formatDate(eq.next_calibration_date)}`, col2, infoY);

    y += 135;

    // Calibration History
    doc.fontSize(12).font('Helvetica-Bold').text('Kalibrierungshistorie', 50, y);
    y += 20;

    if (calResult.rows.length === 0) {
      doc.fontSize(10).font('Helvetica').text('Keine Kalibrierungen vorhanden', 50, y);
      y += 20;
    } else {
      // Table header
      doc.rect(50, y, 495, 18).fill('#f3f4f6');
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Datum', 55, y + 5);
      doc.text('Gültig bis', 120, y + 5);
      doc.text('Ergebnis', 190, y + 5);
      doc.text('Abweichung', 270, y + 5);
      doc.text('Dienstleister', 340, y + 5);
      doc.text('Kosten', 450, y + 5);
      doc.text('Zert.-Nr.', 500, y + 5);
      y += 22;

      doc.font('Helvetica').fontSize(8);
      for (const cal of calResult.rows) {
        if (y > 720) {
          addFooter(doc, pageNum);
          doc.addPage();
          pageNum++;
          y = 50;
          doc.fontSize(12).font('Helvetica-Bold').text('Kalibrierungshistorie (Fortsetzung)', 50, y);
          y += 25;
          doc.font('Helvetica').fontSize(8);
        }

        // Row color based on result
        if (cal.result === 'failed') {
          doc.rect(50, y - 2, 495, 14).fill('#fef2f2');
        } else if (cal.result === 'adjusted') {
          doc.rect(50, y - 2, 495, 14).fill('#fefce8');
        }
        doc.fillColor('#000000');

        doc.text(formatDate(cal.calibration_date), 55, y);
        doc.text(formatDate(cal.valid_until), 120, y);
        doc.text(getResultText(cal.result), 190, y);
        doc.text(cal.deviation ? `${cal.deviation}` : '-', 270, y);
        doc.text(cal.provider?.substring(0, 18) || '-', 340, y);
        doc.text(cal.cost ? `${parseFloat(cal.cost).toFixed(2)} €` : '-', 450, y);
        doc.text(cal.certificate_number?.substring(0, 12) || '-', 500, y);
        y += 14;
      }
    }

    y += 15;

    // Checkout History (if any)
    if (checkoutResult.rows.length > 0 && y < 650) {
      doc.fontSize(12).font('Helvetica-Bold').text('Entnahme-Historie (letzte 20)', 50, y);
      y += 20;

      doc.rect(50, y, 495, 18).fill('#f3f4f6');
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('Entnommen', 55, y + 5);
      doc.text('Von', 130, y + 5);
      doc.text('Zweck', 220, y + 5);
      doc.text('Zurück', 380, y + 5);
      doc.text('Zustand', 450, y + 5);
      y += 22;

      doc.font('Helvetica').fontSize(8);
      for (const co of checkoutResult.rows.slice(0, 10)) {
        if (y > 750) break;
        
        doc.text(formatDate(co.checked_out_at), 55, y);
        doc.text(co.checked_out_by_name, 130, y);
        doc.text(co.purpose?.substring(0, 25) || '-', 220, y);
        doc.text(co.returned_at ? formatDate(co.returned_at) : 'Ausgeliehen', 380, y);
        doc.text(co.return_condition === 'ok' ? 'OK' : (co.return_condition || '-'), 450, y);
        y += 14;
      }
    }

    addFooter(doc, pageNum);
    doc.end();

  } catch (error) {
    console.error('Error generating equipment history report:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Reports',
      error: error.message
    });
  }
};
