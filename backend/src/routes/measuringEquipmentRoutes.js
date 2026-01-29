/**
 * Measuring Equipment Routes
 * 
 * Manages measuring equipment, types, and checkouts
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/measuringEquipmentController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// TYPES
// ============================================================================
router.get('/types', controller.getAllTypes);
router.get('/types/:id', controller.getTypeById);
router.post('/types', controller.createType);
router.put('/types/:id', controller.updateType);
router.delete('/types/:id', controller.deleteType);

// ============================================================================
// CHECKOUTS (must be before /:id routes)
// ============================================================================
router.get('/checkouts/active', controller.getActiveCheckouts);

// ============================================================================
// EQUIPMENT
// ============================================================================
router.get('/stats', controller.getEquipmentStats);
router.get('/next-number', controller.getNextInventoryNumber);
router.get('/', controller.getAllEquipment);
router.get('/:id', controller.getEquipmentById);
router.post('/', controller.createEquipment);
router.put('/:id', controller.updateEquipment);
router.delete('/:id', controller.deleteEquipment);
router.patch('/:id/status', controller.updateEquipmentStatus);

// ============================================================================
// EQUIPMENT CHECKOUTS
// ============================================================================
router.get('/:id/checkouts', controller.getEquipmentCheckouts);
router.get('/:id/availability', controller.checkAvailability);
router.post('/:id/checkout', controller.checkoutEquipment);
router.post('/:id/return', controller.returnEquipment);

// ============================================================================
// LABEL GENERATOR
// ============================================================================
router.get('/:id/label', controller.generateLabel);

module.exports = router;
