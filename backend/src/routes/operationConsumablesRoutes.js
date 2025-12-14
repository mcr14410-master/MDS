/**
 * Operation Consumables Routes
 * API-Endpunkte für Verbrauchsmaterial-Zuordnungen zu Operationen
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/operationConsumablesController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Alle Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/operation-consumables - Liste (mit ?operation_id=xxx)
router.get('/', requirePermission('part.read'), controller.getByOperation);

// GET /api/operation-consumables/available - Verfügbare Materialien
router.get('/available', requirePermission('part.read'), controller.getAvailable);

// POST /api/operation-consumables - Material zuordnen
router.post('/', requirePermission('part.create'), controller.add);

// PUT /api/operation-consumables/:id - Zuordnung aktualisieren
router.put('/:id', requirePermission('part.update'), controller.update);

// DELETE /api/operation-consumables/:id - Zuordnung entfernen
router.delete('/:id', requirePermission('part.delete'), controller.remove);

module.exports = router;
