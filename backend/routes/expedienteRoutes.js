const express = require('express');
const router = express.Router();

const {
    listarExpedientes,
    obtenerDetalleExpediente
} = require('../controllers/expedienteController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    listarExpedientes
);

router.get(
    '/:id',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    obtenerDetalleExpediente
);

module.exports = router;