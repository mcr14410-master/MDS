const express = require('express');
const router = express.Router();
const bauteilController = require('../controllers/bauteilController');

router.get('/', bauteilController.getAllBauteile);
router.get('/search', bauteilController.searchBauteile);
router.get('/:id', bauteilController.getBauteilById);
router.get('/:id/complete', bauteilController.getBauteilComplete);
router.post('/', bauteilController.createBauteil);
router.put('/:id', bauteilController.updateBauteil);
router.delete('/:id', bauteilController.deleteBauteil);

module.exports = router;
