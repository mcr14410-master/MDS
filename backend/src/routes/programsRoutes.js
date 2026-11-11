const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');
const { upload, cmmUpload, handleMulterError } = require('../middleware/uploadMiddleware');
const programsController = require('../controllers/programsController');
const cmmProgramsController = require('../controllers/cmmProgramsController');

// Messprogramm-Upload: drei Bereiche mit eigenem Filter (Messprogramm, Excel-Vorlage, Kalibrierprogramm)
const cmmFields = cmmUpload.fields([
  { name: 'files' },
  { name: 'template_files' },
  { name: 'calibration_files' },
]);

// Alle Routes benötigen Authentication
router.use(authenticateToken);

// POST /api/programs - Programm hochladen
router.post('/',
  requirePermission('program.create'), // vor multer: ohne Recht keine Datei ablegen
  upload.single('file'), 
  handleMulterError,
  programsController.createProgram
);

// POST /api/programs/cmm - Messprogramm (KMG) mit Dateigruppe anlegen
router.post('/cmm',
  requirePermission('program.create'),
  cmmFields,
  handleMulterError,
  cmmProgramsController.createCmmProgram
);

// GET /api/programs - Liste aller Programme (mit Filter: ?operation_id=1, ?kind=cmm;
// mit ?page= zusätzlich search, status, sort_by, sort_order, page_size)
router.get('/', programsController.getPrograms);

// GET /api/programs/suggest-number?operation_id=&kind=nc|cmm - Nummernvorschlag (VOR /:id!)
router.get('/suggest-number', programsController.suggestNumber);

// GET /api/programs/stats?kind=nc|cmm - Anzahl je Status (VOR /:id!)
router.get('/stats', programsController.getProgramStats);

// POST /api/programs/:id/cmm-revisions - Messprogramm: neue Version (geänderte Dateien, Rest wird übernommen)
router.post('/:id/cmm-revisions',
  requirePermission('program.upload'),
  cmmFields,
  handleMulterError,
  cmmProgramsController.createCmmRevision
);

// Messprogramm-Dateien (VOR /:id!): Liste, ZIP, einzeln anzeigen/herunterladen
router.get('/:id/files', cmmProgramsController.getCmmFiles);
router.get('/:id/files/zip', cmmProgramsController.downloadCmmZip);
router.get('/:id/files/:fileId/view', cmmProgramsController.viewCmmFile);
router.get('/:id/files/:fileId/download', cmmProgramsController.downloadCmmFile);

// POST /api/programs/:id/revisions - Neue Revision hochladen (VOR GET!)
router.post('/:id/revisions',
  requirePermission('program.upload'),
  upload.single('file'),
  handleMulterError,
  programsController.uploadNewRevision
);

// POST /api/programs/:id/rollback?to=1.0.1 - Auf alte Version zurückrollen
router.post('/:id/rollback', requirePermission('program.update'), programsController.rollbackToRevision);

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
router.put('/:id', requirePermission('program.update'), programsController.updateProgram);

// DELETE /api/programs/:id - Programm löschen
router.delete('/:id', requirePermission('program.delete'), programsController.deleteProgram);

module.exports = router;
