const pool = require('../config/database');

const obtenerExpedientes = async () => {
    const consulta = `
        SELECT
            id_asunto,
            codigo,
            titulo_asunto,
            numero_expediente,
            carpeta_fiscal,
            denuncia_policial,
            contraparte,
            organo,
            estado,
            urgencia,
            proximo_hito,
            fecha_hito,
            documentos_completos,
            observaciones,
            id_cliente,
            nombre_cliente,
            id_materia,
            materia,
            responsable_id,
            responsable
        FROM mc_abogados.vw_expedientes_web
        ORDER BY id_asunto DESC;
    `;

    const resultado = await pool.query(consulta);
    return resultado.rows;
};

const obtenerExpedientePorId = async (idExpediente) => {
    const consulta = `
        SELECT
            a.id_asunto,
            a.codigo,
            a.titulo_asunto,
            a.numero_expediente,
            a.carpeta_fiscal,
            a.denuncia_policial,
            a.contraparte,
            a.organo,
            a.estado,
            a.urgencia,
            a.proximo_hito,
            a.fecha_hito,
            a.documentos_completos,
            a.observaciones,
            c.id_cliente,
            c.codigo AS codigo_cliente,
            c.nombre_cliente,
            c.contacto_principal,
            c.telefono AS cliente_telefono,
            c.correo AS cliente_correo,
            c.tipo_documento_identidad,
            c.numero_documento,
            c.representante_legal,
            c.direccion AS cliente_direccion,
            m.id_materia,
            m.nombre AS materia,
            p.id_persona AS responsable_id,
            p.nombre_completo AS responsable,
            p.correo AS responsable_correo,
            p.telefono AS responsable_telefono,
            ap.numero_colegiatura,
            ap.colegio_abogados,
            ap.especialidad_descripcion
        FROM mc_abogados.asuntos a
        INNER JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id
        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = a.materia_id
        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = a.responsable_id
        LEFT JOIN mc_abogados.abogados_perfil ap
            ON ap.persona_id = p.id_persona
        WHERE a.id_asunto = $1
        LIMIT 1;
    `;

    const resultado = await pool.query(consulta, [idExpediente]);
    return resultado.rows[0] || null;
};

const obtenerDocumentosPorExpediente = async (idExpediente) => {
    const consulta = `
        SELECT
            d.id_documento,
            d.codigo,
            d.nombre_documento,
            d.tipo,
            d.version,
            d.fecha,
            d.revision_abogado,
            d.estado,
            d.ubicacion_enlace,
            d.confidencialidad,
            d.observaciones,
            p.id_persona AS responsable_id,
            p.nombre_completo AS responsable
        FROM mc_abogados.documentos d
        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = d.responsable_id
        WHERE d.asunto_id = $1
        ORDER BY d.fecha DESC NULLS LAST, d.id_documento DESC;
    `;

    const resultado = await pool.query(consulta, [idExpediente]);
    return resultado.rows;
};

const obtenerTareasPorExpediente = async (idExpediente) => {
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
            p.id_persona AS responsable_id,
            p.nombre_completo AS responsable
        FROM mc_abogados.tareas t
        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = t.responsable_id
        WHERE t.asunto_id = $1
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

    const resultado = await pool.query(consulta, [idExpediente]);
    return resultado.rows;
};

const obtenerDetalleCompletoExpediente = async (idExpediente) => {
    const [expediente, documentos, tareas] = await Promise.all([
        obtenerExpedientePorId(idExpediente),
        obtenerDocumentosPorExpediente(idExpediente),
        obtenerTareasPorExpediente(idExpediente)
    ]);

    if (!expediente) {
        return null;
    }

    return {
        expediente,
        documentos,
        tareas
    };
};

module.exports = {
    obtenerExpedientes,
    obtenerExpedientePorId,
    obtenerDocumentosPorExpediente,
    obtenerTareasPorExpediente,
    obtenerDetalleCompletoExpediente
};