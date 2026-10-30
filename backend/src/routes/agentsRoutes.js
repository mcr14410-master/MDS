/**
 * MDS-Agenten verwalten – /api/agents (JWT)
 * Lesen für alle Angemeldeten, Ändern mit agent.manage
 */

const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Nur ganze Zahlen als ID, sonst 404 statt Datenbankfehler
router.param('id', (req, res, next, id) => (/^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Agent nicht gefunden' })));

router.get('/modules', agentsController.getModules);
router.get('/', agentsController.getAgents);
router.get('/:id', agentsController.getAgentById);
router.post('/', requirePermission('agent.manage'), agentsController.createAgent);
router.put('/:id', requirePermission('agent.manage'), agentsController.updateAgent);
router.post('/:id/regenerate-key', requirePermission('agent.manage'), agentsController.regenerateKey);

module.exports = router;
