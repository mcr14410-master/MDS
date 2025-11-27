/**
 * Reports Routes
 * 
 * PDF-Export für Audits und Reports
 */

const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// CALIBRATION REPORTS
// ============================================================================

/**
 * @route   GET /api/reports/calibration-overview
 * @desc    PDF mit allen Messmitteln und Kalibrierungsstatus
 * @access  Private - requires storage.view permission
 */
router.get(
  '/calibration-overview',
  requirePermission('storage.view'),
  reportsController.getCalibrationOverview
);

/**
 * @route   GET /api/reports/calibration-due
 * @desc    PDF nur mit fälligen/überfälligen Messmitteln
 * @access  Private - requires storage.view permission
 */
router.get(
  '/calibration-due',
  requirePermission('storage.view'),
  reportsController.getCalibrationDueReport
);

/**
 * @route   GET /api/reports/equipment/:id/history
 * @desc    PDF für einzelnes Messmittel mit Kalibrierungshistorie
 * @access  Private - requires storage.view permission
 */
router.get(
  '/equipment/:id/history',
  requirePermission('storage.view'),
  reportsController.getEquipmentHistoryReport
);

module.exports = router;
