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

// Update a config parameter
router.put('/config/:id', requirePermission('zerobot.manage'), zerobotController.updateConfig);

// ============================================
// Machine Management Routes
// ============================================

// Get list of available machines
router.get('/machines', zerobotController.getMachineList);

// Add a new machine
router.post('/machines', requirePermission('zerobot.manage'), zerobotController.addMachine);

// Delete a machine
router.delete('/machines/:name', requirePermission('zerobot.manage'), zerobotController.deleteMachine);

// ============================================
// Jaw Management Routes
// ============================================

// Add a new jaw type
router.post('/jaws', requirePermission('zerobot.manage'), zerobotController.addJaw);

// Delete a jaw type
router.delete('/jaws/:id', requirePermission('zerobot.manage'), zerobotController.deleteJaw);

// ============================================
// Calculation Route
// ============================================

// Calculate positions
router.post('/calculate', zerobotController.calculate);

module.exports = router;
