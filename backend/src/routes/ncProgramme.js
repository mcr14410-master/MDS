const express = require('express');
const router = express.Router();
const ncProgrammController = require('../controllers/ncProgrammController');

router.get('/', ncProgrammController.getAllNcProgramme);
router.get('/:id', ncProgrammController.getNcProgrammById);
router.post('/', ncProgrammController.createNcProgramm);
router.put('/:id', ncProgrammController.updateNcProgramm);
router.delete('/:id', ncProgrammController.deleteNcProgramm);

module.exports = router;
