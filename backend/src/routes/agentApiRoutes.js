/**
 * Agent-API – /api/agent (API-Schlüssel statt JWT)
 */

const express = require('express');
const router = express.Router();
const agentApiController = require('../controllers/agentApiController');
const { authenticateAgent } = require('../middleware/agentAuth');

router.use(authenticateAgent);

// Nur ganze Zahlen als ID, sonst 404 statt Datenbankfehler
router.param('fileId', (req, res, next, id) => (/^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Datei nicht gefunden' })));
router.param('id', (req, res, next, id) => (/^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Bereitstellung nicht gefunden' })));

router.get('/manifest', agentApiController.getManifest);
router.get('/files/:fileId', agentApiController.getFile);
router.post('/report', agentApiController.postReport);
router.post('/deployments/:id/close', agentApiController.closeDeployment);

module.exports = router;
