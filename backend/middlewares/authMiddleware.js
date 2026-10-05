const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                mensaje: 'Acceso denegado. Token no proporcionado'
            });
        }

        const token = authHeader.split(' ')[1];

        const usuarioDecodificado = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.usuario = usuarioDecodificado;

        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: 'Token invalido o expirado'
        });
    }
};


const permitirRoles = (...rolesPermitidos) => {
    return (req, res, next) => {

        if (!req.usuario) {
            return res.status(401).json({
                mensaje: 'Usuario no autenticado'
            });
        }

        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: 'No tiene permisos para realizar esta accion'
            });
        }

        next();
    };
};


module.exports = {
    verificarToken,
    permitirRoles
};