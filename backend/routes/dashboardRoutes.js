const express = require('express');
const { obtenerDashboardAdministrador } = require('../controllers/dashboardController');
const { verificarToken, permitirRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get(
    '/admin',
    verificarToken,
    permitirRoles('Administrador'),
    obtenerDashboardAdministrador
);

module.exports = router;