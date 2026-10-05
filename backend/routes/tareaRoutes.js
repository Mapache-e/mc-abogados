const express = require('express');
const router = express.Router();

const {
    listarTareas,
    obtenerDetalleTarea,
    cambiarEstadoTarea,
    obtenerCatalogosTareas
} = require('../controllers/tareaController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    listarTareas
);

router.get(
    '/catalogos',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    obtenerCatalogosTareas
);

router.get(
    '/:id',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    obtenerDetalleTarea
);

router.patch(
    '/:id/estado',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    cambiarEstadoTarea
);

module.exports = router;