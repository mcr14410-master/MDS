const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const userTimeModelsController = require('../controllers/userTimeModelsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Profile routes (any authenticated user)
router.put('/profile', usersController.updateProfile);

// Admin routes (require user permissions)
router.get('/', requirePermission('user.read'), usersController.getAll);
router.get('/:id', requirePermission('user.read'), usersController.getById);
router.get('/:id/activity', requirePermission('user.read'), usersController.getActivity);
router.post('/', requirePermission('user.create'), usersController.create);
router.put('/:id', requirePermission('user.update'), usersController.update);
router.delete('/:id', requirePermission('user.delete'), usersController.remove);
router.post('/:id/reset-password', requirePermission('user.update'), usersController.resetPassword);
router.patch('/:id/toggle-active', requirePermission('user.update'), usersController.toggleActive);

// RFID Chips routes
router.get('/:id/rfid-chips', requirePermission('user.read'), usersController.getRfidChips);
router.post('/:id/rfid-chips', requirePermission('user.update'), usersController.addRfidChip);
router.put('/:id/rfid-chips/:chipId', requirePermission('user.update'), usersController.updateRfidChip);
router.delete('/:id/rfid-chips/:chipId', requirePermission('user.update'), usersController.deleteRfidChip);

// Zeitmodell-Verlauf
router.get('/:id/time-models', requirePermission('user.read'), userTimeModelsController.getHistory);
router.post('/:id/time-models/preview', requirePermission('user.update'), userTimeModelsController.preview);
router.post('/:id/time-models', requirePermission('user.update'), userTimeModelsController.create);
router.put('/:id/time-models/:entryId', requirePermission('user.update'), userTimeModelsController.update);
router.delete('/:id/time-models/:entryId', requirePermission('user.update'), userTimeModelsController.remove);

module.exports = router;
