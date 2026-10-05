const express = require('express');
const router = express.Router();

const {
    obtenerConfiguracion,
    guardarConfiguracion,
    registrarMateria,
    editarMateria,
    borrarMateria,
    obtenerMiPerfil,
    guardarMiPerfil
} = require('../controllers/configuracionController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/',
    permitirRoles('Administrador'),
    obtenerConfiguracion
);

router.put(
    '/',
    permitirRoles('Administrador'),
    guardarConfiguracion
);

router.post(
    '/materias',
    permitirRoles('Administrador'),
    registrarMateria
);

router.put(
    '/materias/:id',
    permitirRoles('Administrador'),
    editarMateria
);

router.delete(
    '/materias/:id',
    permitirRoles('Administrador'),
    borrarMateria
);

router.get(
    '/perfil',
    permitirRoles('Administrador'),
    obtenerMiPerfil
);

router.put(
    '/perfil',
    permitirRoles('Administrador'),
    guardarMiPerfil
);

module.exports = router;