const {
    obtenerMovimientoPorId,
    obtenerRecibos,
    obtenerReciboPorId,
    crearRecibo
} = require('../services/reciboService');

const convertirNumero = valor => {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;
};

const obtenerMovimiento = async (req, res) => {
    try {
        const idMovimiento = Number(req.params.id);

        if (
            !Number.isInteger(idMovimiento) ||
            idMovimiento <= 0
        ) {
            return res.status(400).json({
                mensaje: 'El movimiento indicado no es valido.'
            });
        }

        const movimiento =
            await obtenerMovimientoPorId(idMovimiento);

        if (!movimiento) {
            return res.status(404).json({
                mensaje: 'Movimiento economico no encontrado.'
            });
        }

        res.json({
            movimiento: {
                id: movimiento.id_movimiento,
                fecha: movimiento.fecha,
                servicio: movimiento.servicio,
                canal: movimiento.canal,

                montoAcordado: convertirNumero(
                    movimiento.monto_acordado
                ),

                montoCobrado: convertirNumero(
                    movimiento.monto_cobrado
                ),

                pendiente: convertirNumero(
                    movimiento.pendiente
                ),

                costoDirecto: convertirNumero(
                    movimiento.costo_directo
                ),

                margenBruto: convertirNumero(
                    movimiento.margen_bruto
                ),

                estadoCobro: movimiento.estado_cobro,
                observaciones: movimiento.observaciones,

                expediente: {
                    id: movimiento.asunto_id,
                    codigo: movimiento.codigo_expediente,
                    numero: movimiento.numero_expediente,
                    titulo: movimiento.titulo_asunto
                },

                cliente: {
                    id: movimiento.id_cliente,
                    nombre: movimiento.nombre_cliente,
                    numeroDocumento: movimiento.numero_documento,
                    correo: movimiento.correo,
                    telefono: movimiento.telefono
                }
            }
        });
    } catch (error) {
        console.error(
            'Error al obtener movimiento:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo obtener el movimiento economico.'
        });
    }
};

const listarRecibos = async (req, res) => {
    try {
        const recibos = await obtenerRecibos();

        res.json({
            recibos: recibos.map(recibo => ({
                id: recibo.id_recibo,
                numero: recibo.numero_recibo,
                movimientoId: recibo.movimiento_id,
                fechaEmision: recibo.fecha_emision,
                concepto: recibo.concepto,
                monto: convertirNumero(recibo.monto),
                metodoPago: recibo.metodo_pago,
                observaciones: recibo.observaciones,
                pdfUrl: recibo.pdf_url,

                cliente: {
                    id: recibo.cliente_id,
                    nombre: recibo.nombre_cliente,
                    numeroDocumento:
                        recibo.numero_documento,
                    correo: recibo.correo,
                    telefono: recibo.telefono
                },

                expediente: {
                    id: recibo.asunto_id,
                    codigo: recibo.codigo_expediente,
                    numero: recibo.numero_expediente,
                    titulo: recibo.titulo_asunto
                }
            }))
        });
    } catch (error) {
        console.error(
            'Error al listar recibos:',
            error
        );

        res.status(500).json({
            mensaje: 'No se pudieron obtener los recibos.'
        });
    }
};

const obtenerDetalleRecibo = async (req, res) => {
    try {
        const idRecibo = Number(req.params.id);

        if (
            !Number.isInteger(idRecibo) ||
            idRecibo <= 0
        ) {
            return res.status(400).json({
                mensaje: 'El recibo indicado no es valido.'
            });
        }

        const recibo =
            await obtenerReciboPorId(idRecibo);

        if (!recibo) {
            return res.status(404).json({
                mensaje: 'Recibo no encontrado.'
            });
        }

        res.json({
            recibo: {
                id: recibo.id_recibo,
                numero: recibo.numero_recibo,
                movimientoId: recibo.movimiento_id,
                fechaEmision: recibo.fecha_emision,
                concepto: recibo.concepto,
                monto: convertirNumero(recibo.monto),
                metodoPago: recibo.metodo_pago,
                observaciones: recibo.observaciones,
                pdfUrl: recibo.pdf_url,
                creadoEn: recibo.creado_en,

                cliente: {
                    id: recibo.cliente_id,
                    codigo: recibo.codigo_cliente,
                    nombre: recibo.nombre_cliente,
                    tipoDocumento:
                        recibo.tipo_documento_identidad,
                    numeroDocumento:
                        recibo.numero_documento,
                    correo: recibo.cliente_correo,
                    telefono: recibo.cliente_telefono,
                    direccion: recibo.cliente_direccion
                },

                expediente: {
                    id: recibo.asunto_id,
                    codigo: recibo.codigo_expediente,
                    numero: recibo.numero_expediente,
                    titulo: recibo.titulo_asunto
                },

                movimiento: {
                    servicio: recibo.servicio,

                    montoAcordado: convertirNumero(
                        recibo.monto_acordado
                    ),

                    montoCobrado: convertirNumero(
                        recibo.monto_cobrado
                    ),

                    pendiente: convertirNumero(
                        recibo.pendiente
                    ),

                    estadoCobro:
                        recibo.estado_cobro
                }
            }
        });
    } catch (error) {
        console.error(
            'Error al obtener recibo:',
            error
        );

        res.status(500).json({
            mensaje: 'No se pudo obtener el recibo.'
        });
    }
};

const registrarRecibo = async (req, res) => {
    try {
        const {
            movimientoId,
            fechaEmision,
            concepto,
            monto,
            metodoPago,
            observaciones
        } = req.body;

        if (
            !movimientoId ||
            !fechaEmision ||
            !concepto ||
            !monto ||
            !metodoPago
        ) {
            return res.status(400).json({
                mensaje:
                    'Movimiento, fecha, concepto, monto y metodo de pago son obligatorios.'
            });
        }

        const recibo = await crearRecibo({
            movimientoId,
            fechaEmision,
            concepto,
            monto,
            metodoPago,
            observaciones
        });

        res.status(201).json({
            mensaje: 'Recibo registrado correctamente.',
            recibo: {
                id: recibo.id_recibo,
                numero: recibo.numero_recibo,
                fechaEmision: recibo.fecha_emision,
                monto: convertirNumero(recibo.monto)
            }
        });
    } catch (error) {
        console.error(
            'Error al registrar recibo:',
            error
        );

        if (
            [
                'MOVIMIENTO_NO_ENCONTRADO',
                'MONTO_INVALIDO',
                'MONTO_SUPERA_PENDIENTE'
            ].includes(error.codigo)
        ) {
            return res.status(400).json({
                mensaje: error.message
            });
        }

        res.status(500).json({
            mensaje: 'No se pudo registrar el recibo.'
        });
    }
};

module.exports = {
    obtenerMovimiento,
    listarRecibos,
    obtenerDetalleRecibo,
    registrarRecibo
};