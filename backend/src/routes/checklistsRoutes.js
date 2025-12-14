/**
 * Checklists Routes
 * API-Endpunkte für Checklisten
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/checklistsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Alle Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/checklists - Liste (mit ?operation_id=xxx Filter)
router.get('/', requirePermission('part.read'), controller.getAll);

// GET /api/checklists/:id - Einzelne Checkliste
router.get('/:id', requirePermission('part.read'), controller.getById);

// POST /api/checklists - Neue Checkliste erstellen
router.post('/', requirePermission('part.create'), controller.create);

// PUT /api/checklists/:id - Checkliste aktualisieren
router.put('/:id', requirePermission('part.update'), controller.update);

// DELETE /api/checklists/:id - Checkliste löschen
router.delete('/:id', requirePermission('part.delete'), controller.delete);

module.exports = router;
