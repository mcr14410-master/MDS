/**
 * Clamping Devices Routes
 * 
 * Manages clamping devices and types
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/clampingDevicesController');
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
// CLAMPING DEVICES
// ============================================================================
router.get('/stats', controller.getStats);
router.get('/next-number', controller.generateInventoryNumber);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
