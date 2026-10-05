const pool = require('../config/database');

const obtenerClientes = async () => {
    const consulta = `
        SELECT
            c.id_cliente,
            c.codigo,
            c.nombre_cliente,
            c.tipo_documento_identidad,
            c.numero_documento,
            c.contacto_principal,
            c.representante_legal,
            c.telefono,
            c.correo,
            c.direccion,
            c.foto_url,
            c.consentimiento_contacto,
            c.observaciones,
            c.creado_en,
            c.actualizado_en,
            COUNT(a.id_asunto) FILTER (
                WHERE a.estado NOT IN ('Cerrado', 'Archivado')
            ) AS expedientes_activos,
            COUNT(a.id_asunto) AS total_expedientes
        FROM mc_abogados.clientes c
        LEFT JOIN mc_abogados.asuntos a
            ON a.cliente_id = c.id_cliente
        GROUP BY
            c.id_cliente,
            c.codigo,
            c.nombre_cliente,
            c.tipo_documento_identidad,
            c.numero_documento,
            c.contacto_principal,
            c.representante_legal,
            c.telefono,
            c.correo,
            c.direccion,
            c.foto_url,
            c.consentimiento_contacto,
            c.observaciones,
            c.creado_en,
            c.actualizado_en
        ORDER BY c.id_cliente DESC;
    `;

    const resultado = await pool.query(consulta);
    return resultado.rows;
};

const obtenerClientePorId = async (idCliente) => {
    const consulta = `
        SELECT
            c.id_cliente,
            c.codigo,
            c.nombre_cliente,
            c.tipo_documento_identidad,
            c.numero_documento,
            c.contacto_principal,
            c.representante_legal,
            c.telefono,
            c.correo,
            c.direccion,
            c.foto_url,
            c.consentimiento_contacto,
            c.observaciones,
            c.creado_en,
            c.actualizado_en
        FROM mc_abogados.clientes c
        WHERE c.id_cliente = $1
        LIMIT 1;
    `;

    const resultado = await pool.query(consulta, [idCliente]);
    return resultado.rows[0] || null;
};

const obtenerExpedientesCliente = async (idCliente) => {
    const consulta = `
        SELECT
            a.id_asunto,
            a.codigo,
            a.titulo_asunto,
            a.numero_expediente,
            a.carpeta_fiscal,
            a.denuncia_policial,
            a.estado,
            a.urgencia,
            a.proximo_hito,
            a.fecha_hito,
            m.nombre AS materia,
            p.nombre_completo AS responsable
        FROM mc_abogados.asuntos a
        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = a.materia_id
        LEFT JOIN mc_abogados.personas p
            ON p.id_persona = a.responsable_id
        WHERE a.cliente_id = $1
        ORDER BY a.id_asunto DESC;
    `;

    const resultado = await pool.query(consulta, [idCliente]);
    return resultado.rows;
};

const crearCliente = async (datos) => {
    const {
        codigo,
        nombreCliente,
        tipoDocumentoIdentidad,
        numeroDocumento,
        contactoPrincipal,
        representanteLegal,
        telefono,
        correo,
        direccion,
        fotoUrl,
        consentimientoContacto,
        observaciones
    } = datos;

    const consulta = `
        INSERT INTO mc_abogados.clientes (
            codigo,
            nombre_cliente,
            tipo_documento_identidad,
            numero_documento,
            contacto_principal,
            representante_legal,
            telefono,
            correo,
            direccion,
            foto_url,
            consentimiento_contacto,
            observaciones
        )
        VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12
        )
        RETURNING *;
    `;

    const valores = [
        codigo,
        nombreCliente,
        tipoDocumentoIdentidad || null,
        numeroDocumento || null,
        contactoPrincipal || null,
        representanteLegal || null,
        telefono || null,
        correo || null,
        direccion || null,
        fotoUrl || null,
        consentimientoContacto || null,
        observaciones || null
    ];

    const resultado = await pool.query(consulta, valores);
    return resultado.rows[0];
};

const actualizarCliente = async (idCliente, datos) => {
    const {
        nombreCliente,
        tipoDocumentoIdentidad,
        numeroDocumento,
        contactoPrincipal,
        representanteLegal,
        telefono,
        correo,
        direccion,
        fotoUrl,
        consentimientoContacto,
        observaciones
    } = datos;

    const consulta = `
        UPDATE mc_abogados.clientes
        SET
            nombre_cliente = $1,
            tipo_documento_identidad = $2,
            numero_documento = $3,
            contacto_principal = $4,
            representante_legal = $5,
            telefono = $6,
            correo = $7,
            direccion = $8,
            foto_url = $9,
            consentimiento_contacto = $10,
            observaciones = $11,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_cliente = $12
        RETURNING *;
    `;

    const valores = [
        nombreCliente,
        tipoDocumentoIdentidad || null,
        numeroDocumento || null,
        contactoPrincipal || null,
        representanteLegal || null,
        telefono || null,
        correo || null,
        direccion || null,
        fotoUrl || null,
        consentimientoContacto || null,
        observaciones || null,
        idCliente
    ];

    const resultado = await pool.query(consulta, valores);
    return resultado.rows[0] || null;
};

module.exports = {
    obtenerClientes,
    obtenerClientePorId,
    obtenerExpedientesCliente,
    crearCliente,
    actualizarCliente
};