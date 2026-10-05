const express = require('express');
const router = express.Router();

const {
    listarClientes,
    obtenerDetalleCliente,
    registrarCliente,
    editarCliente
} = require('../controllers/clienteController');

const {
    verificarToken,
    permitirRoles
} = require('../middlewares/authMiddleware');

router.use(verificarToken);

router.get(
    '/',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    listarClientes
);

router.get(
    '/:id',
    permitirRoles('Administrador', 'Abogado', 'Practicante'),
    obtenerDetalleCliente
);

router.post(
    '/',
    permitirRoles('Administrador'),
    registrarCliente
);

router.put(
    '/:id',
    permitirRoles('Administrador'),
    editarCliente
);

module.exports = router;