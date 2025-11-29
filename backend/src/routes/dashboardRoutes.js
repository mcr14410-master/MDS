const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get overall dashboard statistics
 * @access  Private
 */
router.get(
  '/stats',
  authenticateToken,
  dashboardController.getDashboardStats
);

/**
 * @route   GET /api/dashboard/low-stock
 * @desc    Get low stock items for dashboard widget
 * @query   limit - Number of items to return (default: 10)
 * @access  Private - requires tools.view permission
 */
router.get(
  '/low-stock',
  authenticateToken,
  requirePermission('tools.view'),
  dashboardController.getLowStockItems
);

/**
 * @route   GET /api/dashboard/low-stock-summary
 * @desc    Get low stock summary (counts by status)
 * @access  Private - requires tools.view permission
 */
router.get(
  '/low-stock-summary',
  authenticateToken,
  requirePermission('tools.view'),
  dashboardController.getLowStockSummary
);

/**
 * @route   GET /api/dashboard/recent-movements
 * @desc    Get recent stock movements
 * @query   limit - Number of movements to return (default: 5)
 * @access  Private - requires tools.view permission
 */
router.get(
  '/recent-movements',
  authenticateToken,
  requirePermission('tools.view'),
  dashboardController.getRecentMovements
);

/**
 * @route   GET /api/dashboard/calibration-alerts
 * @desc    Get calibration alerts for measuring equipment
 * @query   limit - Number of alerts to return (default: 10)
 * @access  Private - requires storage.view permission
 */
router.get(
  '/calibration-alerts',
  authenticateToken,
  requirePermission('storage.view'),
  dashboardController.getCalibrationAlerts
);

module.exports = router;
