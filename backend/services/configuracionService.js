const pool = require('../config/database');

const obtenerConfiguracionSistema = async () => {
    const consulta = `
        SELECT
            id_configuracion,
            clave,
            valor,
            descripcion,
            actualizado_en
        FROM mc_abogados.configuracion_sistema
        ORDER BY id_configuracion ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const actualizarConfiguracionSistema = async configuraciones => {
    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        for (const item of configuraciones) {
            await cliente.query(
                `
                    INSERT INTO mc_abogados.configuracion_sistema (
                        clave,
                        valor,
                        descripcion
                    )
                    VALUES ($1, $2, $3)
                    ON CONFLICT (clave)
                    DO UPDATE SET
                        valor = EXCLUDED.valor,
                        descripcion = COALESCE(
                            EXCLUDED.descripcion,
                            mc_abogados.configuracion_sistema.descripcion
                        ),
                        actualizado_en = CURRENT_TIMESTAMP;
                `,
                [
                    item.clave,
                    item.valor,
                    item.descripcion || null
                ]
            );
        }

        await cliente.query('COMMIT');

        return obtenerConfiguracionSistema();
    } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
    } finally {
        cliente.release();
    }
};

const obtenerMaterias = async () => {
    const consulta = `
        SELECT
            id_materia,
            nombre
        FROM mc_abogados.materias
        ORDER BY nombre ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const crearMateria = async nombre => {
    const consulta = `
        INSERT INTO mc_abogados.materias (
            nombre
        )
        VALUES ($1)
        RETURNING
            id_materia,
            nombre;
    `;

    const resultado = await pool.query(
        consulta,
        [nombre]
    );

    return resultado.rows[0];
};

const actualizarMateria = async (idMateria, nombre) => {
    const consulta = `
        UPDATE mc_abogados.materias
        SET nombre = $1
        WHERE id_materia = $2
        RETURNING
            id_materia,
            nombre;
    `;

    const resultado = await pool.query(
        consulta,
        [
            nombre,
            idMateria
        ]
    );

    return resultado.rows[0] || null;
};

const eliminarMateria = async idMateria => {
    const usoPersonas = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM mc_abogados.personas
            WHERE materia_id = $1;
        `,
        [idMateria]
    );

    const usoAsuntos = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM mc_abogados.asuntos
            WHERE materia_id = $1;
        `,
        [idMateria]
    );

    const personas = Number(
        usoPersonas.rows[0].total || 0
    );

    const asuntos = Number(
        usoAsuntos.rows[0].total || 0
    );

    if (personas > 0 || asuntos > 0) {
        const error = new Error(
            'No se puede eliminar una materia que esta siendo utilizada.'
        );

        error.codigo = 'MATERIA_EN_USO';

        throw error;
    }

    const resultado = await pool.query(
        `
            DELETE FROM mc_abogados.materias
            WHERE id_materia = $1
            RETURNING id_materia;
        `,
        [idMateria]
    );

    return resultado.rows[0] || null;
};

const obtenerPerfilAdministrador = async idPersona => {
    const consulta = `
        SELECT
            id_persona,
            nombre_completo,
            rol,
            materia_id,
            correo,
            telefono,
            numero_documento,
            direccion,
            foto_url,
            activo
        FROM mc_abogados.personas
        WHERE id_persona = $1
        LIMIT 1;
    `;

    const resultado = await pool.query(
        consulta,
        [idPersona]
    );

    return resultado.rows[0] || null;
};

const actualizarPerfilAdministrador = async (
    idPersona,
    datos
) => {
    const {
        nombre,
        correo,
        telefono,
        numeroDocumento,
        direccion,
        fotoUrl
    } = datos;

    const consulta = `
        UPDATE mc_abogados.personas
        SET
            nombre_completo = $1,
            correo = $2,
            telefono = $3,
            numero_documento = $4,
            direccion = $5,
            foto_url = $6,
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id_persona = $7
        RETURNING
            id_persona,
            nombre_completo,
            rol,
            correo,
            telefono,
            numero_documento,
            direccion,
            foto_url,
            activo;
    `;

    const resultado = await pool.query(
        consulta,
        [
            nombre,
            correo,
            telefono || null,
            numeroDocumento || null,
            direccion || null,
            fotoUrl || null,
            idPersona
        ]
    );

    return resultado.rows[0] || null;
};

module.exports = {
    obtenerConfiguracionSistema,
    actualizarConfiguracionSistema,
    obtenerMaterias,
    crearMateria,
    actualizarMateria,
    eliminarMateria,
    obtenerPerfilAdministrador,
    actualizarPerfilAdministrador
};