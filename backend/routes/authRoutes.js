const express = require('express');
const { login } = require('../controllers/authController');
const { verificarToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/login', login);

router.get('/me', verificarToken, (req, res) => {
    res.status(200).json({
        mensaje: 'Sesion valida',
        usuario: req.usuario
    });
});

module.exports = router;