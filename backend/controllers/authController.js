const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { buscarUsuarioPorCorreo } = require('../services/authService');

const login = async (req, res) => {
    try {
        const { correo, password, rol } = req.body;

        if (!correo || !password || !rol) {
    return res.status(400).json({
        mensaje: 'Correo, contrasena y rol son obligatorios'
    });
}

const rolesPermitidos = [
    'Administrador',
    'Abogado',
    'Practicante'
];

if (!rolesPermitidos.includes(rol)) {
    return res.status(400).json({
        mensaje: 'Rol de acceso no valido'
    });
}
        const usuario = await buscarUsuarioPorCorreo(correo);

        if (usuario.rol !== rol) {
    return res.status(403).json({
        mensaje: 'El rol seleccionado no corresponde a esta cuenta'
    });
}

        if (!usuario.activo) {
            return res.status(403).json({
                mensaje: 'La cuenta se encuentra desactivada'
            });
        }

        if (
            usuario.bloqueado_hasta &&
            new Date(usuario.bloqueado_hasta) > new Date()
        ) {
            return res.status(403).json({
                mensaje: 'La cuenta se encuentra temporalmente bloqueada'
            });
        }

        const passwordCorrecto = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!passwordCorrecto) {
            return res.status(401).json({
                mensaje: 'Credenciales incorrectas'
            });
        }

        const token = jwt.sign(
    {
        id: usuario.id_usuario,
        personaId: usuario.persona_id,
        rol: usuario.rol
    },
    process.env.JWT_SECRET,
    {
        expiresIn: '8h'
    }
);

return res.status(200).json({
    mensaje: 'Inicio de sesion correcto',
    token,
    usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.rol
    }
});

    } catch (error) {
        console.error('Error durante el login:', error);

        return res.status(500).json({
            mensaje: 'Error interno del servidor'
        });
    }
};

module.exports = {
    login
};