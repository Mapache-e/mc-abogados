const express = require('express');
const router = express.Router();

const {
    listarAudiencias,
    obtenerDetalleAudiencia,
    listarDisponibilidadEquipo
} = require('../controllers/agendaController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/audiencias',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    listarAudiencias
);

router.get(
    '/audiencias/:id',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    obtenerDetalleAudiencia
);

router.get(
    '/disponibilidad',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    listarDisponibilidadEquipo
);

module.exports = router;