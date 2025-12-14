/**
 * Operation Measuring Equipment Routes
 * API-Endpunkte für Messmittel-Zuordnungen zu Operationen
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/operationMeasuringEquipmentController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Alle Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/operation-measuring-equipment - Liste (mit ?operation_id=xxx)
router.get('/', requirePermission('part.read'), controller.getByOperation);

// GET /api/operation-measuring-equipment/available - Verfügbare Messmittel
router.get('/available', requirePermission('part.read'), controller.getAvailable);

// POST /api/operation-measuring-equipment - Messmittel zuordnen
router.post('/', requirePermission('part.create'), controller.add);

// PUT /api/operation-measuring-equipment/:id - Zuordnung aktualisieren
router.put('/:id', requirePermission('part.update'), controller.update);

// DELETE /api/operation-measuring-equipment/:id - Zuordnung entfernen
router.delete('/:id', requirePermission('part.delete'), controller.remove);

module.exports = router;
