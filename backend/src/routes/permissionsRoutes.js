const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolesController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get all permissions (for dropdowns, etc.)
router.get('/', requirePermission('user.read'), rolesController.getAllPermissions);

module.exports = router;
