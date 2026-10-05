const pool = require('../config/database');

const obtenerTareas = async () => {
    const consulta = `
        SELECT
            t.id_tarea,
            t.codigo,
            t.tarea,
            t.prioridad,
            t.fecha_asignacion,
            t.fecha_limite,
            t.estado,
            t.requiere_revision_abogado,
            t.segundo_control,
            t.evidencia,
            t.fecha_cierre,
            t.observaciones,

            a.id_asunto,
            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto,
            a.estado AS estado_expediente,

            c.id_cliente,
            c.nombre_cliente,

            p.id_persona AS responsable_id,
            p.nombre_completo AS responsable,
            p.correo AS responsable_correo,
            p.foto_url AS responsable_foto

        FROM mc_abogados.tareas t

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = t.asunto_id

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = t.responsable_id

        ORDER BY
            CASE
                WHEN t.estado = 'En curso' THEN 1
                WHEN t.estado = 'Pendiente' THEN 2
                WHEN t.estado = 'Bloqueada' THEN 3
                WHEN t.estado = 'Completada' THEN 4
                WHEN t.estado = 'Cancelada' THEN 5
                ELSE 6
            END,
            t.fecha_limite ASC NULLS LAST,
            t.id_tarea DESC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerTareaPorId = async (idTarea) => {
    const consulta = `
        SELECT
            t.id_tarea,
            t.codigo,
            t.tarea,
            t.prioridad,
            t.fecha_asignacion,
            t.fecha_limite,
            t.estado,
            t.requiere_revision_abogado,
            t.segundo_control,
            t.evidencia,
            t.fecha_cierre,
            t.observaciones,

            a.id_asunto,
            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto,
            a.estado AS estado_expediente,
            a.proximo_hito,
            a.fecha_hito,

            c.id_cliente,
            c.nombre_cliente,
            c.telefono AS cliente_telefono,
            c.correo AS cliente_correo,

            p.id_persona AS responsable_id,
            p.nombre_completo AS responsable,
            p.correo AS responsable_correo,
            p.telefono AS responsable_telefono,
            p.foto_url AS responsable_foto

        FROM mc_abogados.tareas t

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = t.asunto_id

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = t.responsable_id

        WHERE t.id_tarea = $1
        LIMIT 1;
    `;

    const resultado = await pool.query(consulta, [idTarea]);

    return resultado.rows[0] || null;
};

const actualizarEstadoTarea = async (idTarea, estado) => {
    const consulta = `
        UPDATE mc_abogados.tareas
        SET
            estado = $1,
            fecha_cierre = CASE
                WHEN $1 = 'Completada' THEN CURRENT_DATE
                ELSE NULL
            END,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_tarea = $2
        RETURNING
            id_tarea,
            codigo,
            tarea,
            estado,
            fecha_cierre;
    `;

    const resultado = await pool.query(
        consulta,
        [estado, idTarea]
    );

    return resultado.rows[0] || null;
};

const obtenerResponsables = async () => {
    const consulta = `
        SELECT
            id_persona,
            nombre_completo,
            rol,
            correo,
            foto_url
        FROM mc_abogados.personas
        WHERE activo = TRUE
          AND rol IN ('Administrador', 'Abogado', 'Practicante')
        ORDER BY nombre_completo ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerExpedientesParaTareas = async () => {
    const consulta = `
        SELECT
            a.id_asunto,
            a.codigo,
            a.numero_expediente,
            a.titulo_asunto,
            a.estado,
            c.nombre_cliente
        FROM mc_abogados.asuntos a

        INNER JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        WHERE a.estado NOT IN ('Cerrado', 'Archivado')

        ORDER BY a.codigo ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

module.exports = {
    obtenerTareas,
    obtenerTareaPorId,
    actualizarEstadoTarea,
    obtenerResponsables,
    obtenerExpedientesParaTareas
};