/**
 * Measuring Equipment Routes
 * 
 * Manages measuring equipment and types
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

module.exports = router;
