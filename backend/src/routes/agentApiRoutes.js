/**
 * Agent-API – /api/agent (API-Schlüssel statt JWT)
 */

const express = require('express');
const router = express.Router();
const agentApiController = require('../controllers/agentApiController');
const { authenticateAgent } = require('../middleware/agentAuth');

router.use(authenticateAgent);

router.get('/manifest', agentApiController.getManifest);

module.exports = router;
