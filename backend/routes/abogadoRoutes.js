const express = require('express');
const router = express.Router();

const {
    listarAbogados,
    obtenerDetalleAbogado,
    obtenerCatalogosAbogados,
    registrarAbogado,
    editarAbogado
} = require('../controllers/abogadoController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/catalogos',
    permitirRoles(
        'Administrador',
        'Abogado',
        'Practicante'
    ),
    obtenerCatalogosAbogados
);

router.get(
    '/',
    permitirRoles(
        'Administrador',
        'Abogado',
        'Practicante'
    ),
    listarAbogados
);

router.post(
    '/',
    permitirRoles('Administrador'),
    registrarAbogado
);

router.get(
    '/:id',
    permitirRoles(
        'Administrador',
        'Abogado',
        'Practicante'
    ),
    obtenerDetalleAbogado
);

router.put(
    '/:id',
    permitirRoles('Administrador'),
    editarAbogado
);

module.exports = router;