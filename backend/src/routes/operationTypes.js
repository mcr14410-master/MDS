// backend/src/routes/operationTypes.js
/**
 * Routes für Operation Types (Arbeitsgang-Typen)
 */

const express = require('express');
const router = express.Router();
const operationTypesController = require('../controllers/operationTypesController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Alle Routes erfordern Authentifizierung
router.use(authenticateToken);

// Feature-Definitionen abrufen (für UI)
router.get('/features', operationTypesController.getFeatureDefinitions);

// Alle Operation Types abrufen
router.get('/', operationTypesController.getAllTypes);

// Einzelnen Operation Type abrufen
router.get('/:id', operationTypesController.getTypeById);

// Neuen Operation Type erstellen (Admin)
router.post('/', operationTypesController.createType);

// Operation Type aktualisieren (Admin)
router.put('/:id', operationTypesController.updateType);

// Operation Type löschen (Admin)
router.delete('/:id', operationTypesController.deleteType);

module.exports = router;
