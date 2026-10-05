const express = require('express');
const router = express.Router();

const {
    obtenerMovimiento,
    listarRecibos,
    obtenerDetalleRecibo,
    registrarRecibo
} = require('../controllers/reciboController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/',
    permitirRoles('Administrador'),
    listarRecibos
);

router.get(
    '/movimientos/:id',
    permitirRoles('Administrador'),
    obtenerMovimiento
);

router.get(
    '/:id',
    permitirRoles('Administrador'),
    obtenerDetalleRecibo
);

router.post(
    '/',
    permitirRoles('Administrador'),
    registrarRecibo
);

module.exports = router;