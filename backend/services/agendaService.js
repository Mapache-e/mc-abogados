const pool = require('../config/database');

const obtenerAudiencias = async () => {
    const consulta = `
        SELECT
            au.id_audiencia,
            au.codigo,
            au.titulo,
            au.tipo,
            au.fecha,
            au.hora_inicio,
            au.hora_fin,
            au.modalidad,
            au.ubicacion,
            au.enlace_virtual,
            au.juzgado_sala,
            au.estado,
            au.grabacion_url,
            au.notas,
            a.id_asunto,
            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto,
            c.id_cliente,
            c.nombre_cliente,
            p.id_persona AS responsable_id,
            p.nombre_completo AS responsable
        FROM mc_abogados.audiencias au
        INNER JOIN mc_abogados.asuntos a
            ON a.id_asunto = au.asunto_id
        INNER JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id
        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = au.responsable_id
        ORDER BY au.fecha ASC, au.hora_inicio ASC;
    `;

    const resultado = await pool.query(consulta);
    return resultado.rows;
};

const obtenerAudienciaPorId = async (idAudiencia) => {
    const consulta = `
        SELECT
            au.id_audiencia,
            au.codigo,
            au.titulo,
            au.tipo,
            au.fecha,
            au.hora_inicio,
            au.hora_fin,
            au.modalidad,
            au.ubicacion,
            au.enlace_virtual,
            au.juzgado_sala,
            au.estado,
            au.grabacion_url,
            au.notas,
            au.asunto_id,
            au.responsable_id,
            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto,
            a.carpeta_fiscal,
            a.denuncia_policial,
            c.id_cliente,
            c.nombre_cliente,
            c.telefono AS cliente_telefono,
            c.correo AS cliente_correo,
            p.nombre_completo AS responsable,
            p.correo AS responsable_correo,
            p.telefono AS responsable_telefono
        FROM mc_abogados.audiencias au
        INNER JOIN mc_abogados.asuntos a
            ON a.id_asunto = au.asunto_id
        INNER JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id
        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = au.responsable_id
        WHERE au.id_audiencia = $1
        LIMIT 1;
    `;

    const resultado = await pool.query(consulta, [idAudiencia]);

    return resultado.rows[0] || null;
};

const obtenerParticipantesAudiencia = async (idAudiencia) => {
    const consulta = `
        SELECT
            ap.id_participante,
            ap.persona_id,
            ap.nombre_participante,
            ap.tipo_participante,
            p.nombre_completo AS persona
        FROM mc_abogados.audiencia_participantes ap
        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = ap.persona_id
        WHERE ap.audiencia_id = $1
        ORDER BY ap.id_participante ASC;
    `;

    const resultado = await pool.query(consulta, [idAudiencia]);

    return resultado.rows;
};

const obtenerDocumentosAudiencia = async (idAudiencia) => {
    const consulta = `
        SELECT
            ad.id_audiencia_documento,
            ad.documento_id,
            d.codigo,
            d.nombre_documento,
            d.tipo,
            d.fecha,
            d.estado,
            d.ubicacion_enlace
        FROM mc_abogados.audiencia_documentos ad
        INNER JOIN mc_abogados.documentos d
            ON d.id_documento = ad.documento_id
        WHERE ad.audiencia_id = $1
        ORDER BY d.fecha DESC NULLS LAST;
    `;

    const resultado = await pool.query(consulta, [idAudiencia]);

    return resultado.rows;
};

const obtenerDisponibilidadEquipo = async () => {
    const consulta = `
        SELECT
            de.id_disponibilidad,
            de.persona_id,
            de.fecha,
            de.hora_inicio,
            de.hora_fin,
            de.disponible,
            de.motivo,
            p.nombre_completo,
            p.rol,
            p.foto_url
        FROM mc_abogados.disponibilidad_equipo de
        INNER JOIN mc_abogados.personas p
            ON p.id_persona = de.persona_id
        WHERE p.activo = TRUE
        ORDER BY de.fecha ASC, de.hora_inicio ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerDetalleCompletoAudiencia = async (idAudiencia) => {
    const [audiencia, participantes, documentos] = await Promise.all([
        obtenerAudienciaPorId(idAudiencia),
        obtenerParticipantesAudiencia(idAudiencia),
        obtenerDocumentosAudiencia(idAudiencia)
    ]);

    if (!audiencia) {
        return null;
    }

    return {
        audiencia,
        participantes,
        documentos
    };
};

module.exports = {
    obtenerAudiencias,
    obtenerAudienciaPorId,
    obtenerParticipantesAudiencia,
    obtenerDocumentosAudiencia,
    obtenerDisponibilidadEquipo,
    obtenerDetalleCompletoAudiencia
};