const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');
const programsController = require('../controllers/programsController');

// Alle Routes benötigen Authentication
router.use(authenticateToken);

// POST /api/programs - Programm hochladen
router.post('/', 
  upload.single('file'), 
  handleMulterError,
  programsController.createProgram
);

// GET /api/programs - Liste aller Programme (mit Filter: ?operation_id=1)
router.get('/', programsController.getPrograms);

// POST /api/programs/:id/revisions - Neue Revision hochladen (VOR GET!)
router.post('/:id/revisions',
  upload.single('file'),
  handleMulterError,
  programsController.uploadNewRevision
);

// POST /api/programs/:id/rollback?to=1.0.1 - Auf alte Version zurückrollen
router.post('/:id/rollback', programsController.rollbackToRevision);

// GET /api/programs/:id/revisions - Versions-Historie (VOR /:id!)
router.get('/:id/revisions', programsController.getProgramRevisions);

// GET /api/programs/:id/compare?from=1.0.0&to=1.0.1 - Versionen vergleichen (versions-basiert, benutzerfreundlich)
router.get('/:id/compare', programsController.compareRevisionsByVersion);

// GET /api/programs/:id/revisions/:revisionId/compare/:compareToRevisionId - Zwei Versionen vergleichen (ID-basiert)
router.get('/:id/revisions/:revisionId/compare/:compareToRevisionId', programsController.compareRevisions);

// GET /api/programs/:id/download - Programm herunterladen (VOR /:id!)
router.get('/:id/download', programsController.downloadProgram);

// GET /api/programs/:id - Einzelnes Programm mit allen Revisionen
router.get('/:id', programsController.getProgramById);

// PUT /api/programs/:id - Metadaten ändern
router.put('/:id', programsController.updateProgram);

// DELETE /api/programs/:id - Programm löschen
router.delete('/:id', programsController.deleteProgram);

module.exports = router;
