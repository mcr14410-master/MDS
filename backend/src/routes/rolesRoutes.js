const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolesController');
const { authenticateToken, requirePermission, requireRole } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Read routes (require user.read permission)
router.get('/', requirePermission('user.read'), rolesController.getAll);
router.get('/matrix', requirePermission('user.read'), rolesController.getPermissionMatrix);
router.get('/:id', requirePermission('user.read'), rolesController.getById);

// Write routes (require admin role for role management)
router.post('/', requireRole('admin'), rolesController.create);
router.put('/:id', requireRole('admin'), rolesController.update);
router.delete('/:id', requireRole('admin'), rolesController.remove);

module.exports = router;
