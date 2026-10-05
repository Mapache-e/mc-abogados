const express = require('express');
const router = express.Router();

const {
    obtenerPanel
} = require('../controllers/reporteController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/panel',
    permitirRoles('Administrador'),
    obtenerPanel
);

module.exports = router;