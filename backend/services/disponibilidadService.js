const pool = require('../config/database');

const obtenerPersonasEquipo = async () => {
    const consulta = `
        SELECT
            p.id_persona,
            p.nombre_completo,
            p.rol,
            p.correo,
            p.telefono,
            p.foto_url,
            p.activo,
            m.nombre AS materia
        FROM mc_abogados.personas p
        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = p.materia_id
        WHERE p.rol IN ('Abogado', 'Practicante')
        ORDER BY
            p.activo DESC,
            p.rol ASC,
            p.nombre_completo ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerDisponibilidad = async () => {
    const consulta = `
        SELECT
            d.id_disponibilidad,
            d.persona_id,
            d.fecha,
            d.hora_inicio,
            d.hora_fin,
            d.disponible,
            d.motivo,

            p.nombre_completo,
            p.rol,
            p.correo,
            p.telefono,
            p.foto_url,

            m.nombre AS materia

        FROM mc_abogados.disponibilidad_equipo d

        INNER JOIN mc_abogados.personas p
            ON p.id_persona = d.persona_id

        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = p.materia_id

        ORDER BY
            d.fecha ASC,
            d.hora_inicio ASC,
            p.nombre_completo ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerDisponibilidadPorId = async idDisponibilidad => {
    const consulta = `
        SELECT
            d.id_disponibilidad,
            d.persona_id,
            d.fecha,
            d.hora_inicio,
            d.hora_fin,
            d.disponible,
            d.motivo,

            p.nombre_completo,
            p.rol

        FROM mc_abogados.disponibilidad_equipo d

        INNER JOIN mc_abogados.personas p
            ON p.id_persona = d.persona_id

        WHERE d.id_disponibilidad = $1

        LIMIT 1;
    `;

    const resultado = await pool.query(
        consulta,
        [idDisponibilidad]
    );

    return resultado.rows[0] || null;
};

const crearDisponibilidad = async datos => {
    const {
        personaId,
        fecha,
        horaInicio,
        horaFin,
        disponible,
        motivo
    } = datos;

    const consulta = `
        INSERT INTO mc_abogados.disponibilidad_equipo (
            persona_id,
            fecha,
            hora_inicio,
            hora_fin,
            disponible,
            motivo
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;

    const resultado = await pool.query(
        consulta,
        [
            personaId,
            fecha,
            horaInicio,
            horaFin,
            disponible,
            motivo || null
        ]
    );

    return resultado.rows[0];
};

const actualizarDisponibilidad = async (
    idDisponibilidad,
    datos
) => {
    const {
        personaId,
        fecha,
        horaInicio,
        horaFin,
        disponible,
        motivo
    } = datos;

    const consulta = `
        UPDATE mc_abogados.disponibilidad_equipo
        SET
            persona_id = $1,
            fecha = $2,
            hora_inicio = $3,
            hora_fin = $4,
            disponible = $5,
            motivo = $6
        WHERE id_disponibilidad = $7
        RETURNING *;
    `;

    const resultado = await pool.query(
        consulta,
        [
            personaId,
            fecha,
            horaInicio,
            horaFin,
            disponible,
            motivo || null,
            idDisponibilidad
        ]
    );

    return resultado.rows[0] || null;
};

const eliminarDisponibilidad = async idDisponibilidad => {
    const resultado = await pool.query(
        `
            DELETE FROM mc_abogados.disponibilidad_equipo
            WHERE id_disponibilidad = $1
            RETURNING id_disponibilidad;
        `,
        [idDisponibilidad]
    );

    return resultado.rows[0] || null;
};

module.exports = {
    obtenerPersonasEquipo,
    obtenerDisponibilidad,
    obtenerDisponibilidadPorId,
    crearDisponibilidad,
    actualizarDisponibilidad,
    eliminarDisponibilidad
};