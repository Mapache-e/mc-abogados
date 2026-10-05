const pool = require('../config/database');

const obtenerResumenEconomico = async () => {
    const consulta = `
        SELECT
            COUNT(*) AS total_movimientos,
            COALESCE(SUM(monto_acordado), 0) AS total_acordado,
            COALESCE(SUM(monto_cobrado), 0) AS total_cobrado,
            COALESCE(SUM(pendiente), 0) AS total_pendiente,
            COALESCE(SUM(costo_directo), 0) AS total_costos,
            COALESCE(SUM(margen_bruto), 0) AS margen_bruto
        FROM mc_abogados.control_economico;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows[0];
};

const obtenerMovimientosEconomicos = async () => {
    const consulta = `
        SELECT
            ce.id_movimiento,
            ce.fecha,
            ce.servicio,
            ce.canal,
            ce.monto_acordado,
            ce.monto_cobrado,
            ce.pendiente,
            ce.costo_directo,
            ce.margen_bruto,
            ce.estado_cobro,
            ce.observaciones,

            a.id_asunto,
            a.codigo AS codigo_expediente,
            a.numero_expediente,
            a.titulo_asunto,

            c.id_cliente,
            c.nombre_cliente

        FROM mc_abogados.control_economico ce

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = ce.asunto_id

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        ORDER BY ce.fecha DESC, ce.id_movimiento DESC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerIngresosMensuales = async () => {
    const consulta = `
        SELECT
            DATE_TRUNC('month', fecha)::date AS mes,
            COALESCE(SUM(monto_acordado), 0) AS acordado,
            COALESCE(SUM(monto_cobrado), 0) AS cobrado,
            COALESCE(SUM(costo_directo), 0) AS costos,
            COALESCE(SUM(margen_bruto), 0) AS margen
        FROM mc_abogados.control_economico
        WHERE fecha >= CURRENT_DATE - INTERVAL '11 months'
        GROUP BY DATE_TRUNC('month', fecha)
        ORDER BY mes ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerDistribucionServicios = async () => {
    const consulta = `
        SELECT
            COALESCE(NULLIF(TRIM(servicio), ''), 'Sin especificar') AS servicio,
            COUNT(*) AS movimientos,
            COALESCE(SUM(monto_acordado), 0) AS acordado,
            COALESCE(SUM(monto_cobrado), 0) AS cobrado,
            COALESCE(SUM(pendiente), 0) AS pendiente
        FROM mc_abogados.control_economico
        GROUP BY COALESCE(NULLIF(TRIM(servicio), ''), 'Sin especificar')
        ORDER BY cobrado DESC, servicio ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerPagosPendientes = async () => {
    const consulta = `
        SELECT
            ce.id_movimiento,
            ce.fecha,
            ce.servicio,
            ce.monto_acordado,
            ce.monto_cobrado,
            ce.pendiente,
            ce.estado_cobro,

            a.id_asunto,
            a.codigo AS codigo_expediente,
            a.numero_expediente,

            c.id_cliente,
            c.nombre_cliente

        FROM mc_abogados.control_economico ce

        LEFT JOIN mc_abogados.asuntos a
            ON a.id_asunto = ce.asunto_id

        LEFT JOIN mc_abogados.clientes c
            ON c.id_cliente = a.cliente_id

        WHERE COALESCE(ce.pendiente, 0) > 0

        ORDER BY ce.pendiente DESC, ce.fecha ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerReporteExpedientes = async () => {
    const consulta = `
        SELECT
            a.estado,
            COUNT(*) AS cantidad
        FROM mc_abogados.asuntos a
        GROUP BY a.estado
        ORDER BY cantidad DESC, a.estado ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerReporteMaterias = async () => {
    const consulta = `
        SELECT
            COALESCE(m.nombre, 'Sin materia') AS materia,
            COUNT(a.id_asunto) AS cantidad
        FROM mc_abogados.asuntos a
        LEFT JOIN mc_abogados.materias m
            ON m.id_materia = a.materia_id
        GROUP BY m.nombre
        ORDER BY cantidad DESC, materia ASC;
    `;

    const resultado = await pool.query(consulta);

    return resultado.rows;
};

const obtenerPanelReportes = async () => {
    const [
        resumen,
        movimientos,
        ingresosMensuales,
        servicios,
        pagosPendientes,
        expedientesPorEstado,
        expedientesPorMateria
    ] = await Promise.all([
        obtenerResumenEconomico(),
        obtenerMovimientosEconomicos(),
        obtenerIngresosMensuales(),
        obtenerDistribucionServicios(),
        obtenerPagosPendientes(),
        obtenerReporteExpedientes(),
        obtenerReporteMaterias()
    ]);

    return {
        resumen,
        movimientos,
        ingresosMensuales,
        servicios,
        pagosPendientes,
        expedientesPorEstado,
        expedientesPorMateria
    };
};

module.exports = {
    obtenerResumenEconomico,
    obtenerMovimientosEconomicos,
    obtenerIngresosMensuales,
    obtenerDistribucionServicios,
    obtenerPagosPendientes,
    obtenerReporteExpedientes,
    obtenerReporteMaterias,
    obtenerPanelReportes
};