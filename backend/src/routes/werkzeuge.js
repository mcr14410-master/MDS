const express = require('express');
const router = express.Router();
const werkzeugController = require('../controllers/werkzeugController');

router.get('/', werkzeugController.getAllWerkzeuge);
router.get('/:id', werkzeugController.getWerkzeugById);
router.post('/', werkzeugController.createWerkzeug);
router.put('/:id', werkzeugController.updateWerkzeug);
router.delete('/:id', werkzeugController.deleteWerkzeug);

module.exports = router;
