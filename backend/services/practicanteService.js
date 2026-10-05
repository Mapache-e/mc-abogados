const pool = require('../config/database');

const obtenerPracticantes = async () => {
    const consulta = `
        SELECT
            p.id_persona,
            p.nombre_completo,
            p.correo,
            p.telefono,
            p.numero_documento,
            p.direccion,
            p.foto_url,
            p.activo,
            p.materia_id,
            m.nombre AS materia,

            COUNT(DISTINCT a.id_asunto)
                FILTER (
                    WHERE a.estado NOT IN ('Cerrado', 'Archivado')
                ) AS expedientes_activos,

            COUNT(DISTINCT a.id_asunto) AS expedientes_totales,

            COUNT(DISTINCT t.id_tarea)
                FILTER (
                    WHERE t.estado = 'Pendiente'
                ) AS tareas_pendientes,

            COUNT(DISTINCT t.id_tarea)
                FILTER (
                    WHERE t.estado = 'En curso'
                ) AS tareas_en_curso

        FROM mc_abogados.personas p

        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = p.materia_id

        LEFT JOIN mc_abogados.asuntos a
            ON a.responsable_id = p.id_persona

        LEFT JOIN mc_abogados.tareas t
            ON t.responsable_id = p.id_persona

        WHERE p.rol = 'Practicante'

        GROUP BY
            p.id_persona,
            p.nombre_completo,
            p.correo,
            p.telefono,
            p.numero_documento,
            p.direccion,
            p.foto_url,
            p.activo,
            p.materia_id,
            m.nombre

        ORDER BY
            p.activo DESC,
            p.nombre_completo ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerPracticantePorId = async idPracticante => {
    const consulta = `
        SELECT
            p.id_persona,
            p.nombre_completo,
            p.correo,
            p.telefono,
            p.numero_documento,
            p.direccion,
            p.foto_url,
            p.activo,
            p.materia_id,
            m.nombre AS materia

        FROM mc_abogados.personas p

        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = p.materia_id

        WHERE p.id_persona = $1
          AND p.rol = 'Practicante'

        LIMIT 1;
    `;

    const resultado = await pool.query(
        consulta,
        [idPracticante]
    );

    return resultado.rows[0] || null;
};

const obtenerExpedientesPracticante = async idPracticante => {
    const consulta = `
        SELECT
            a.id_asunto,
            a.codigo,
            a.numero_expediente,
            a.titulo_asunto,
            a.estado,
            a.urgencia,
            a.proximo_hito,
            a.fecha_hito,

            m.nombre AS materia,

            c.id_cliente,
            c.nombre_cliente

        FROM mc_abogados.asuntos a

        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = a.materia_id

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        WHERE a.responsable_id = $1

        ORDER BY
            a.fecha_hito ASC NULLS LAST,
            a.id_asunto DESC;
    `;

    const resultado = await pool.query(
        consulta,
        [idPracticante]
    );

    return resultado.rows;
};

const obtenerTareasPracticante = async idPracticante => {
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

            a.id_asunto,
            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto,

            c.id_cliente,
            c.nombre_cliente

        FROM mc_abogados.tareas t

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = t.asunto_id

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        WHERE t.responsable_id = $1

        ORDER BY
            CASE
                WHEN t.estado = 'En curso' THEN 1
                WHEN t.estado = 'Pendiente' THEN 2
                WHEN t.estado = 'Bloqueada' THEN 3
                WHEN t.estado = 'Completada' THEN 4
                ELSE 5
            END,
            t.fecha_limite ASC NULLS LAST;
    `;

    const resultado = await pool.query(
        consulta,
        [idPracticante]
    );

    return resultado.rows;
};

const obtenerDisponibilidadPracticante = async idPracticante => {
    const consulta = `
        SELECT
            id_disponibilidad,
            fecha,
            hora_inicio,
            hora_fin,
            disponible,
            motivo

        FROM mc_abogados.disponibilidad_equipo

        WHERE persona_id = $1

        ORDER BY
            fecha ASC,
            hora_inicio ASC;
    `;

    const resultado = await pool.query(
        consulta,
        [idPracticante]
    );

    return resultado.rows;
};

const obtenerDetalleCompletoPracticante = async idPracticante => {
    const [
        practicante,
        expedientes,
        tareas,
        disponibilidad
    ] = await Promise.all([
        obtenerPracticantePorId(idPracticante),
        obtenerExpedientesPracticante(idPracticante),
        obtenerTareasPracticante(idPracticante),
        obtenerDisponibilidadPracticante(idPracticante)
    ]);

    if (!practicante) {
        return null;
    }

    return {
        practicante,
        expedientes,
        tareas,
        disponibilidad
    };
};

module.exports = {
    obtenerPracticantes,
    obtenerPracticantePorId,
    obtenerExpedientesPracticante,
    obtenerTareasPracticante,
    obtenerDisponibilidadPracticante,
    obtenerDetalleCompletoPracticante
};