/**
 * Bereitstellungen – /api/deployments (JWT)
 * Lesen für alle Angemeldeten, Ändern mit program.deploy
 */

const express = require('express');
const router = express.Router();
const deploymentsController = require('../controllers/deploymentsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Nur ganze Zahlen als ID, sonst 404 statt Datenbankfehler
router.param('id', (req, res, next, id) => (/^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Bereitstellung nicht gefunden' })));
router.param('programId', (req, res, next, id) => (/^\d+$/.test(id) ? next() : res.status(404).json({ error: 'Programm nicht gefunden' })));

router.get('/', deploymentsController.getDeployments);
router.get('/:id', deploymentsController.getDeploymentById);
router.post('/', requirePermission('program.deploy'), deploymentsController.createDeployment);
router.post('/:id/programs/:programId/update', requirePermission('program.deploy'), deploymentsController.updateDeploymentProgram);
router.post('/:id/close', requirePermission('program.deploy'), deploymentsController.closeDeployment);
router.post('/:id/discard-local', requirePermission('program.deploy'), deploymentsController.discardLocal);

module.exports = router;
