const pool = require('../config/database');

const buscarUsuarioPorCorreo = async (correo) => {
    const consulta = `
        SELECT
            u.id_usuario,
            u.persona_id,
            p.nombre_completo,
            p.correo,
            u.rol,
            u.password_hash,
            u.activo,
            u.intentos_fallidos,
            u.bloqueado_hasta
        FROM mc_abogados.usuarios u
        INNER JOIN mc_abogados.personas p
            ON p.id_persona = u.persona_id
        WHERE LOWER(p.correo) = LOWER($1)
        LIMIT 1;
    `;

    const resultado = await pool.query(consulta, [correo]);

    return resultado.rows[0] || null;
};

module.exports = {
    buscarUsuarioPorCorreo
};