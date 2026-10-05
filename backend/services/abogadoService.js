const pool = require('../config/database');

const obtenerAbogados = async () => {
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

            ap.numero_colegiatura,
            ap.colegio_abogados,
            ap.especialidad_descripcion,
            ap.biografia,

            COUNT(DISTINCT a.id_asunto)
                FILTER (
                    WHERE a.estado NOT IN ('Cerrado', 'Archivado')
                ) AS expedientes_activos,

            COUNT(DISTINCT a.id_asunto) AS expedientes_totales

        FROM mc_abogados.personas p

        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = p.materia_id

        LEFT JOIN mc_abogados.abogados_perfil ap
            ON ap.persona_id = p.id_persona

        LEFT JOIN mc_abogados.asuntos a
            ON a.responsable_id = p.id_persona

        WHERE p.rol = 'Abogado'

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
            m.nombre,
            ap.numero_colegiatura,
            ap.colegio_abogados,
            ap.especialidad_descripcion,
            ap.biografia

        ORDER BY
            p.activo DESC,
            p.nombre_completo ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerAbogadoPorId = async idAbogado => {
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

            ap.numero_colegiatura,
            ap.colegio_abogados,
            ap.especialidad_descripcion,
            ap.biografia

        FROM mc_abogados.personas p

        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = p.materia_id

        LEFT JOIN mc_abogados.abogados_perfil ap
            ON ap.persona_id = p.id_persona

        WHERE p.id_persona = $1
          AND p.rol = 'Abogado'

        LIMIT 1;
    `;

    const resultado = await pool.query(
        consulta,
        [idAbogado]
    );

    return resultado.rows[0] || null;
};

const obtenerExpedientesAbogado = async idAbogado => {
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
        [idAbogado]
    );

    return resultado.rows;
};

const obtenerDisponibilidadAbogado = async idAbogado => {
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
        [idAbogado]
    );

    return resultado.rows;
};

const obtenerAudienciasAbogado = async idAbogado => {
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
            au.estado,

            a.id_asunto,
            a.codigo AS codigo_expediente,
            a.numero_expediente,

            c.id_cliente,
            c.nombre_cliente

        FROM mc_abogados.audiencias au

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = au.asunto_id

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        WHERE au.responsable_id = $1

        ORDER BY
            au.fecha ASC,
            au.hora_inicio ASC;
    `;

    const resultado = await pool.query(
        consulta,
        [idAbogado]
    );

    return resultado.rows;
};

const obtenerDetalleCompletoAbogado = async idAbogado => {
    const [
        abogado,
        expedientes,
        disponibilidad,
        audiencias
    ] = await Promise.all([
        obtenerAbogadoPorId(idAbogado),
        obtenerExpedientesAbogado(idAbogado),
        obtenerDisponibilidadAbogado(idAbogado),
        obtenerAudienciasAbogado(idAbogado)
    ]);

    if (!abogado) {
        return null;
    }

    return {
        abogado,
        expedientes,
        disponibilidad,
        audiencias
    };
};

const obtenerMaterias = async () => {
    const resultado = await pool.query(`
        SELECT
            id_materia,
            nombre
        FROM mc_abogados.materias
        ORDER BY nombre ASC;
    `);

    return resultado.rows;
};

const crearAbogado = async datos => {
    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        const {
            nombre,
            correo,
            telefono,
            numeroDocumento,
            direccion,
            fotoUrl,
            materiaId,
            activo,
            numeroColegiatura,
            colegioAbogados,
            especialidad,
            biografia
        } = datos;

        const personaResultado = await cliente.query(
            `
                INSERT INTO mc_abogados.personas (
                    nombre_completo,
                    rol,
                    materia_id,
                    correo,
                    telefono,
                    activo,
                    numero_documento,
                    direccion,
                    foto_url
                )
                VALUES (
                    $1,
                    'Abogado',
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8
                )
                RETURNING id_persona;
            `,
            [
                nombre,
                materiaId || null,
                correo,
                telefono || null,
                activo !== false,
                numeroDocumento || null,
                direccion || null,
                fotoUrl || null
            ]
        );

        const idPersona =
            personaResultado.rows[0].id_persona;

        await cliente.query(
            `
                INSERT INTO mc_abogados.abogados_perfil (
                    persona_id,
                    numero_colegiatura,
                    colegio_abogados,
                    especialidad_descripcion,
                    biografia
                )
                VALUES ($1, $2, $3, $4, $5);
            `,
            [
                idPersona,
                numeroColegiatura || null,
                colegioAbogados || null,
                especialidad || null,
                biografia || null
            ]
        );

        await cliente.query('COMMIT');

        return obtenerAbogadoPorId(idPersona);
    } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
    } finally {
        cliente.release();
    }
};

const actualizarAbogado = async (
    idAbogado,
    datos
) => {
    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        const {
            nombre,
            correo,
            telefono,
            numeroDocumento,
            direccion,
            fotoUrl,
            materiaId,
            activo,
            numeroColegiatura,
            colegioAbogados,
            especialidad,
            biografia
        } = datos;

        const personaResultado =
            await cliente.query(
                `
                    UPDATE mc_abogados.personas
                    SET
                        nombre_completo = $1,
                        materia_id = $2,
                        correo = $3,
                        telefono = $4,
                        activo = $5,
                        numero_documento = $6,
                        direccion = $7,
                        foto_url = $8,
                        actualizado_en = CURRENT_TIMESTAMP
                    WHERE id_persona = $9
                      AND rol = 'Abogado'
                    RETURNING id_persona;
                `,
                [
                    nombre,
                    materiaId || null,
                    correo,
                    telefono || null,
                    activo !== false,
                    numeroDocumento || null,
                    direccion || null,
                    fotoUrl || null,
                    idAbogado
                ]
            );

        if (personaResultado.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return null;
        }

        await cliente.query(
            `
                INSERT INTO mc_abogados.abogados_perfil (
                    persona_id,
                    numero_colegiatura,
                    colegio_abogados,
                    especialidad_descripcion,
                    biografia
                )
                VALUES ($1, $2, $3, $4, $5)

                ON CONFLICT (persona_id)

                DO UPDATE SET
                    numero_colegiatura =
                        EXCLUDED.numero_colegiatura,

                    colegio_abogados =
                        EXCLUDED.colegio_abogados,

                    especialidad_descripcion =
                        EXCLUDED.especialidad_descripcion,

                    biografia =
                        EXCLUDED.biografia,

                    actualizado_en =
                        CURRENT_TIMESTAMP;
            `,
            [
                idAbogado,
                numeroColegiatura || null,
                colegioAbogados || null,
                especialidad || null,
                biografia || null
            ]
        );

        await cliente.query('COMMIT');

        return obtenerAbogadoPorId(idAbogado);
    } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
    } finally {
        cliente.release();
    }
};

module.exports = {
    obtenerAbogados,
    obtenerAbogadoPorId,
    obtenerExpedientesAbogado,
    obtenerDisponibilidadAbogado,
    obtenerAudienciasAbogado,
    obtenerDetalleCompletoAbogado,
    obtenerMaterias,
    crearAbogado,
    actualizarAbogado
};