const pool = require('../config/database');

const obtenerResumenDashboard = async () => {
    const consulta = `
        SELECT
            (
                SELECT COUNT(*)
                FROM mc_abogados.asuntos
                WHERE estado NOT IN ('Cerrado', 'Archivado')
            ) AS expedientes_activos,

            (
                SELECT COUNT(*)
                FROM mc_abogados.clientes
            ) AS clientes_activos,

            (
                SELECT COUNT(*)
                FROM mc_abogados.audiencias
                WHERE fecha >= CURRENT_DATE
                AND estado = 'Programada'
            ) AS audiencias_proximas,

            (
                SELECT COUNT(*)
                FROM mc_abogados.tareas
                WHERE estado NOT IN ('Completada', 'Cancelada')
            ) AS tareas_pendientes;
    `;

    const resultado = await pool.query(consulta);
    return resultado.rows[0];
};

const obtenerDistribucionExpedientes = async () => {
    const consulta = `
        SELECT
            COALESCE(m.nombre, 'Sin clasificar') AS tipo,
            COUNT(*) AS cantidad
        FROM mc_abogados.asuntos a
        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = a.materia_id
        WHERE a.estado NOT IN ('Cerrado', 'Archivado')
        GROUP BY m.id_materia, m.nombre
        ORDER BY cantidad DESC
        LIMIT 6;
    `;

    const resultado = await pool.query(consulta);
    return resultado.rows;
};

const obtenerProximasAudiencias = async () => {
    const consulta = `
        SELECT
            au.id_audiencia,
            au.titulo,
            au.fecha,
            au.hora_inicio,
            COALESCE(
                au.ubicacion,
                au.juzgado_sala,
                au.enlace_virtual,
                'Ubicacion pendiente'
            ) AS ubicacion
        FROM mc_abogados.audiencias au
        WHERE au.fecha >= CURRENT_DATE
        AND au.estado = 'Programada'
        ORDER BY au.fecha ASC, au.hora_inicio ASC
        LIMIT 4;
    `;

    const resultado = await pool.query(consulta);
    return resultado.rows;
};

module.exports = {
    obtenerResumenDashboard,
    obtenerDistribucionExpedientes,
    obtenerProximasAudiencias
};