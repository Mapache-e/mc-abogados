const express = require('express');
const router = express.Router();

const {
    listarPracticantes,
    obtenerDetallePracticante,
    obtenerCatalogosPracticantes,
    registrarPracticante,
    editarPracticante
} = require('../controllers/practicanteController');

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
    obtenerCatalogosPracticantes
);

router.get(
    '/',
    permitirRoles(
        'Administrador',
        'Abogado',
        'Practicante'
    ),
    listarPracticantes
);

router.post(
    '/',
    permitirRoles('Administrador'),
    registrarPracticante
);

router.get(
    '/:id',
    permitirRoles(
        'Administrador',
        'Abogado',
        'Practicante'
    ),
    obtenerDetallePracticante
);

router.put(
    '/:id',
    permitirRoles('Administrador'),
    editarPracticante
);

module.exports = router;