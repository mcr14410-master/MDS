/**
 * Zerobot Routes
 * 
 * API endpoints for Zerobot position calculator
 */

const express = require('express');
const router = express.Router();
const zerobotController = require('../controllers/zerobotController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// Configuration Routes
// ============================================

// Get all config (grouped by type)
router.get('/config', zerobotController.getAllConfig);

// Get global parameters only
router.get('/config/global', zerobotController.getGlobalConfig);

// Get jaw heights
router.get('/config/jaws', zerobotController.getJawConfig);

// Get machine-specific parameters
router.get('/config/machines', zerobotController.getMachineConfig);

// Update a config parameter (admin only)
router.put('/config/:id', requirePermission('admin'), zerobotController.updateConfig);

// ============================================
// Machine Management Routes
// ============================================

// Get list of available machines
router.get('/machines', zerobotController.getMachineList);

// Add a new machine (admin only)
router.post('/machines', requirePermission('admin'), zerobotController.addMachine);

// Delete a machine (admin only)
router.delete('/machines/:name', requirePermission('admin'), zerobotController.deleteMachine);

// ============================================
// Jaw Management Routes
// ============================================

// Add a new jaw type (admin only)
router.post('/jaws', requirePermission('admin'), zerobotController.addJaw);

// Delete a jaw type (admin only)
router.delete('/jaws/:id', requirePermission('admin'), zerobotController.deleteJaw);

// ============================================
// Calculation Route
// ============================================

// Calculate positions
router.post('/calculate', zerobotController.calculate);

module.exports = router;
