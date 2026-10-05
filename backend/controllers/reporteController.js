const {
    obtenerPanelReportes
} = require('../services/reporteService');

const convertirNumero = valor => {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;
};

const obtenerPanel = async (req, res) => {
    try {
        const datos = await obtenerPanelReportes();

        res.json({
            resumen: {
                totalMovimientos: Number(
                    datos.resumen.total_movimientos || 0
                ),

                totalAcordado: convertirNumero(
                    datos.resumen.total_acordado
                ),

                totalCobrado: convertirNumero(
                    datos.resumen.total_cobrado
                ),

                totalPendiente: convertirNumero(
                    datos.resumen.total_pendiente
                ),

                totalCostos: convertirNumero(
                    datos.resumen.total_costos
                ),

                margenBruto: convertirNumero(
                    datos.resumen.margen_bruto
                )
            },

            ingresosMensuales: datos.ingresosMensuales.map(item => ({
                mes: item.mes,
                acordado: convertirNumero(item.acordado),
                cobrado: convertirNumero(item.cobrado),
                costos: convertirNumero(item.costos),
                margen: convertirNumero(item.margen)
            })),

            servicios: datos.servicios.map(item => ({
                servicio: item.servicio,
                movimientos: Number(item.movimientos || 0),
                acordado: convertirNumero(item.acordado),
                cobrado: convertirNumero(item.cobrado),
                pendiente: convertirNumero(item.pendiente)
            })),

            pagosPendientes: datos.pagosPendientes.map(item => ({
                id: item.id_movimiento,
                fecha: item.fecha,
                servicio: item.servicio,

                montoAcordado: convertirNumero(
                    item.monto_acordado
                ),

                montoCobrado: convertirNumero(
                    item.monto_cobrado
                ),

                pendiente: convertirNumero(
                    item.pendiente
                ),

                estadoCobro: item.estado_cobro,

                expediente: {
                    id: item.id_asunto,
                    codigo: item.codigo_expediente,
                    numero: item.numero_expediente
                },

                cliente: {
                    id: item.id_cliente,
                    nombre: item.nombre_cliente
                }
            })),

            expedientesPorEstado: datos.expedientesPorEstado.map(item => ({
                estado: item.estado,
                cantidad: Number(item.cantidad || 0)
            })),

            expedientesPorMateria: datos.expedientesPorMateria.map(item => ({
                materia: item.materia,
                cantidad: Number(item.cantidad || 0)
            })),

            movimientos: datos.movimientos.map(item => ({
                id: item.id_movimiento,
                fecha: item.fecha,
                servicio: item.servicio,
                canal: item.canal,

                montoAcordado: convertirNumero(
                    item.monto_acordado
                ),

                montoCobrado: convertirNumero(
                    item.monto_cobrado
                ),

                pendiente: convertirNumero(
                    item.pendiente
                ),

                costoDirecto: convertirNumero(
                    item.costo_directo
                ),

                margenBruto: convertirNumero(
                    item.margen_bruto
                ),

                estadoCobro: item.estado_cobro,
                observaciones: item.observaciones,

                expediente: {
                    id: item.id_asunto,
                    codigo: item.codigo_expediente,
                    numero: item.numero_expediente,
                    titulo: item.titulo_asunto
                },

                cliente: {
                    id: item.id_cliente,
                    nombre: item.nombre_cliente
                }
            }))
        });
    } catch (error) {
        console.error('Error al obtener reportes:', error);

        res.status(500).json({
            mensaje: 'No se pudo obtener la información de reportes y costos.'
        });
    }
};

module.exports = {
    obtenerPanel
};