const express = require('express');
const router = express.Router();

const {
    listarEquipo,
    listarDisponibilidad,
    registrarDisponibilidad,
    editarDisponibilidad,
    borrarDisponibilidad
} = require('../controllers/disponibilidadController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/equipo',
    permitirRoles('Administrador'),
    listarEquipo
);

router.get(
    '/',
    permitirRoles('Administrador'),
    listarDisponibilidad
);

router.post(
    '/',
    permitirRoles('Administrador'),
    registrarDisponibilidad
);

router.put(
    '/:id',
    permitirRoles('Administrador'),
    editarDisponibilidad
);

router.delete(
    '/:id',
    permitirRoles('Administrador'),
    borrarDisponibilidad
);

module.exports = router;