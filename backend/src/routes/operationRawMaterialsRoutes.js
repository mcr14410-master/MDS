/**
 * Operation Raw Materials Routes
 * API-Endpunkte für Rohmaterial-Daten von Operationen
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/operationRawMaterialsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Alle Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/operation-raw-materials/:operationId - Rohmaterial-Daten laden
router.get('/:operationId', requirePermission('part.read'), controller.get);

// PUT /api/operation-raw-materials/:operationId - Rohmaterial-Daten aktualisieren
router.put('/:operationId', requirePermission('part.update'), controller.update);

module.exports = router;
