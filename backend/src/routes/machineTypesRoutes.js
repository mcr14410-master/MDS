/**
 * Machine Types Routes
 *
 * API routes for machine type management (mit Custom-Field-Definitions)
 */

const express = require('express');
const router = express.Router();
const machineTypesController = require('../controllers/machineTypesController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/', machineTypesController.getAllTypes);
router.get('/:id', machineTypesController.getTypeById);
router.post('/', machineTypesController.createType);
router.put('/:id', machineTypesController.updateType);
router.delete('/:id', machineTypesController.deleteType);

module.exports = router;
