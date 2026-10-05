const pool = require('../config/database');

const obtenerMovimientoPorId = async (idMovimiento) => {
    const consulta = `
        SELECT
            ce.id_movimiento,
            ce.fecha,
            ce.asunto_id,
            ce.servicio,
            ce.canal,
            ce.monto_acordado,
            ce.monto_cobrado,
            ce.pendiente,
            ce.costo_directo,
            ce.margen_bruto,
            ce.estado_cobro,
            ce.observaciones,

            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto,

            c.id_cliente,
            c.nombre_cliente,
            c.numero_documento,
            c.correo,
            c.telefono

        FROM mc_abogados.control_economico ce

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = ce.asunto_id

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        WHERE ce.id_movimiento = $1
        LIMIT 1;
    `;

    const resultado = await pool.query(
        consulta,
        [idMovimiento]
    );

    return resultado.rows[0] || null;
};

const obtenerRecibos = async () => {
    const consulta = `
        SELECT
            r.id_recibo,
            r.numero_recibo,
            r.movimiento_id,
            r.cliente_id,
            r.asunto_id,
            r.fecha_emision,
            r.concepto,
            r.monto,
            r.metodo_pago,
            r.observaciones,
            r.pdf_url,
            r.creado_en,

            c.nombre_cliente,
            c.numero_documento,
            c.correo,
            c.telefono,

            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto

        FROM mc_abogados.recibos r

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = r.cliente_id

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = r.asunto_id

        ORDER BY r.fecha_emision DESC, r.id_recibo DESC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerReciboPorId = async (idRecibo) => {
    const consulta = `
        SELECT
            r.id_recibo,
            r.numero_recibo,
            r.movimiento_id,
            r.cliente_id,
            r.asunto_id,
            r.fecha_emision,
            r.concepto,
            r.monto,
            r.metodo_pago,
            r.observaciones,
            r.pdf_url,
            r.creado_en,
            r.actualizado_en,

            c.codigo AS codigo_cliente,
            c.nombre_cliente,
            c.tipo_documento_identidad,
            c.numero_documento,
            c.correo AS cliente_correo,
            c.telefono AS cliente_telefono,
            c.direccion AS cliente_direccion,

            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto,

            ce.servicio,
            ce.monto_acordado,
            ce.monto_cobrado,
            ce.pendiente,
            ce.estado_cobro

        FROM mc_abogados.recibos r

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = r.cliente_id

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = r.asunto_id

        LEFT JOIN mc_abogados.control_economico ce
            ON ce.id_movimiento = r.movimiento_id

        WHERE r.id_recibo = $1
        LIMIT 1;
    `;

    const resultado = await pool.query(
        consulta,
        [idRecibo]
    );

    return resultado.rows[0] || null;
};

const generarNumeroRecibo = async (cliente = pool) => {
    const consulta = `
        SELECT
            COALESCE(MAX(id_recibo), 0) + 1 AS siguiente
        FROM mc_abogados.recibos;
    `;

    const resultado = await cliente.query(consulta);

    const numero = Number(resultado.rows[0].siguiente || 1);

    return `REC-${String(numero).padStart(6, '0')}`;
};

const crearRecibo = async datos => {
    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        const {
            movimientoId,
            fechaEmision,
            concepto,
            monto,
            metodoPago,
            observaciones
        } = datos;

        const movimientoResultado = await cliente.query(
            `
                SELECT
                    ce.id_movimiento,
                    ce.asunto_id,
                    ce.monto_acordado,
                    ce.monto_cobrado,
                    ce.pendiente,
                    a.cliente_id
                FROM mc_abogados.control_economico ce
                LEFT JOIN mc_abogados.asuntos a
                    ON a.id_asunto = ce.asunto_id
                WHERE ce.id_movimiento = $1
                FOR UPDATE;
            `,
            [movimientoId]
        );

        if (movimientoResultado.rows.length === 0) {
            const error = new Error(
                'El movimiento economico no existe.'
            );

            error.codigo = 'MOVIMIENTO_NO_ENCONTRADO';

            throw error;
        }

        const movimiento = movimientoResultado.rows[0];

        const montoRecibo = Number(monto);
        const pendienteActual = Number(
            movimiento.pendiente || 0
        );

        if (
            !Number.isFinite(montoRecibo) ||
            montoRecibo <= 0
        ) {
            const error = new Error(
                'El monto del recibo debe ser mayor a cero.'
            );

            error.codigo = 'MONTO_INVALIDO';

            throw error;
        }

        if (
            pendienteActual > 0 &&
            montoRecibo > pendienteActual
        ) {
            const error = new Error(
                'El monto no puede superar el saldo pendiente.'
            );

            error.codigo = 'MONTO_SUPERA_PENDIENTE';

            throw error;
        }

        const numeroRecibo =
            await generarNumeroRecibo(cliente);

        const reciboResultado = await cliente.query(
            `
                INSERT INTO mc_abogados.recibos (
                    numero_recibo,
                    movimiento_id,
                    cliente_id,
                    asunto_id,
                    fecha_emision,
                    concepto,
                    monto,
                    metodo_pago,
                    observaciones
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9
                )
                RETURNING *;
            `,
            [
                numeroRecibo,
                movimientoId,
                movimiento.cliente_id || null,
                movimiento.asunto_id || null,
                fechaEmision,
                concepto,
                montoRecibo,
                metodoPago,
                observaciones || null
            ]
        );

        await cliente.query(
            `
                UPDATE mc_abogados.control_economico
                SET monto_cobrado =
                    COALESCE(monto_cobrado, 0) + $1
                WHERE id_movimiento = $2;
            `,
            [
                montoRecibo,
                movimientoId
            ]
        );

        await cliente.query('COMMIT');

        return reciboResultado.rows[0];
    } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
    } finally {
        cliente.release();
    }
};

module.exports = {
    obtenerMovimientoPorId,
    obtenerRecibos,
    obtenerReciboPorId,
    crearRecibo
};