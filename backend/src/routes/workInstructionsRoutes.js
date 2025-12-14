/**
 * Work Instructions Routes
 * API-Endpunkte für Arbeitsanweisungen
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/workInstructionsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Alle Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/work-instructions - Liste (mit ?operation_id=xxx Filter)
router.get('/', requirePermission('part.read'), controller.getAll);

// GET /api/work-instructions/:id - Einzelne Anweisung
router.get('/:id', requirePermission('part.read'), controller.getById);

// POST /api/work-instructions - Neue Anweisung erstellen
router.post('/', requirePermission('part.create'), controller.create);

// PUT /api/work-instructions/:id - Anweisung aktualisieren
router.put('/:id', requirePermission('part.update'), controller.update);

// DELETE /api/work-instructions/:id - Anweisung löschen
router.delete('/:id', requirePermission('part.delete'), controller.delete);

module.exports = router;
