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

// GET /api/programs/:id - Einzelnes Programm mit allen Revisionen
router.get('/:id', programsController.getProgramById);

// GET /api/programs/:id/download - Programm herunterladen
router.get('/:id/download', programsController.downloadProgram);

// PUT /api/programs/:id - Metadaten ändern
router.put('/:id', programsController.updateProgram);

// DELETE /api/programs/:id - Programm löschen
router.delete('/:id', programsController.deleteProgram);

module.exports = router;
