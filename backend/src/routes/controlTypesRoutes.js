/**
 * Control Types Routes
 *
 * API routes for CNC control type management
 */

const express = require('express');
const router = express.Router();
const controlTypesController = require('../controllers/controlTypesController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', controlTypesController.getAllTypes);
router.get('/:id', controlTypesController.getTypeById);
router.post('/', controlTypesController.createType);
router.put('/:id', controlTypesController.updateType);
router.delete('/:id', controlTypesController.deleteType);

module.exports = router;
