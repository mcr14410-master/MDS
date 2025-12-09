/**
 * Consumables Routes
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/consumablesController');
const documentsController = require('../controllers/consumableDocumentsController');
const locationsController = require('../controllers/consumableLocationsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Reorder list (before :id routes)
// GET    /api/consumables/reorder-list    - Get items needing reorder
router.get('/reorder-list', locationsController.getReorderList);

// Reset status from order (before :id routes)
// POST   /api/consumables/reset-status-from-order/:orderId
router.post('/reset-status-from-order/:orderId', locationsController.resetStatusFromOrder);

// Storage location queries (before :id routes)
// GET    /api/consumables/by-storage-location/:locationId - Get consumables at a storage location
router.get('/by-storage-location/:locationId', locationsController.getByStorageLocation);

// GET    /api/consumables/by-compartment/:compartmentId - Get consumables in a compartment
router.get('/by-compartment/:compartmentId', locationsController.getByCompartment);

// GET    /api/consumables              - Get all consumables
router.get('/', controller.getAllConsumables);

// GET    /api/consumables/:id          - Get consumable by ID
router.get('/:id', controller.getConsumableById);

// POST   /api/consumables              - Create new consumable
router.post('/', controller.createConsumable);

// PUT    /api/consumables/:id          - Update consumable
router.put('/:id', controller.updateConsumable);

// DELETE /api/consumables/:id          - Soft delete consumable
router.delete('/:id', controller.deleteConsumable);

// Status update
// PATCH  /api/consumables/:id/status   - Update stock status (ok/low/reorder)
router.patch('/:id/status', locationsController.updateStatus);

// Location routes
// GET    /api/consumables/:id/locations           - Get all locations
router.get('/:id/locations', locationsController.getLocations);

// POST   /api/consumables/:id/locations           - Add location
router.post('/:id/locations', locationsController.addLocation);

// PUT    /api/consumables/:id/locations/:locId    - Update location
router.put('/:id/locations/:locId', locationsController.updateLocation);

// DELETE /api/consumables/:id/locations/:locId    - Remove location
router.delete('/:id/locations/:locId', locationsController.removeLocation);

// Document routes nested under consumables
// GET    /api/consumables/:consumableId/documents     - Get all documents
router.get('/:consumableId/documents', documentsController.getDocuments);

// POST   /api/consumables/:consumableId/documents     - Upload document
router.post('/:consumableId/documents', upload.single('file'), documentsController.uploadDocument);

module.exports = router;
