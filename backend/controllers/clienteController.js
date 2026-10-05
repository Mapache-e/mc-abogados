const {
    obtenerClientes,
    obtenerClientePorId,
    obtenerExpedientesCliente,
    crearCliente,
    actualizarCliente
} = require('../services/clienteService');

const listarClientes = async (req, res) => {
    try {
        const clientes = await obtenerClientes();

        const respuesta = clientes.map(cliente => ({
            id: cliente.id_cliente,
            codigo: cliente.codigo,
            nombre: cliente.nombre_cliente,
            tipoDocumento: cliente.tipo_documento_identidad,
            numeroDocumento: cliente.numero_documento,
            contactoPrincipal: cliente.contacto_principal,
            representanteLegal: cliente.representante_legal,
            telefono: cliente.telefono,
            correo: cliente.correo,
            direccion: cliente.direccion,
            fotoUrl: cliente.foto_url,
            consentimientoContacto: cliente.consentimiento_contacto,
            observaciones: cliente.observaciones,
            expedientesActivos: Number(cliente.expedientes_activos || 0),
            totalExpedientes: Number(cliente.total_expedientes || 0)
        }));

        res.json({ clientes: respuesta });
    } catch (error) {
        console.error('Error al listar clientes:', error);
        res.status(500).json({
            mensaje: 'No se pudieron obtener los clientes.'
        });
    }
};

const obtenerDetalleCliente = async (req, res) => {
    try {
        const idCliente = Number(req.params.id);

        if (!Number.isInteger(idCliente) || idCliente <= 0) {
            return res.status(400).json({
                mensaje: 'El identificador del cliente no es valido.'
            });
        }

        const cliente = await obtenerClientePorId(idCliente);

        if (!cliente) {
            return res.status(404).json({
                mensaje: 'Cliente no encontrado.'
            });
        }

        const expedientes = await obtenerExpedientesCliente(idCliente);

        res.json({
            cliente: {
                id: cliente.id_cliente,
                codigo: cliente.codigo,
                nombre: cliente.nombre_cliente,
                tipoDocumento: cliente.tipo_documento_identidad,
                numeroDocumento: cliente.numero_documento,
                contactoPrincipal: cliente.contacto_principal,
                representanteLegal: cliente.representante_legal,
                telefono: cliente.telefono,
                correo: cliente.correo,
                direccion: cliente.direccion,
                fotoUrl: cliente.foto_url,
                consentimientoContacto: cliente.consentimiento_contacto,
                observaciones: cliente.observaciones,
                creadoEn: cliente.creado_en,
                actualizadoEn: cliente.actualizado_en,
                expedientes: expedientes.map(expediente => ({
                    id: expediente.id_asunto,
                    codigo: expediente.codigo,
                    titulo: expediente.titulo_asunto,
                    numeroExpediente: expediente.numero_expediente,
                    carpetaFiscal: expediente.carpeta_fiscal,
                    denunciaPolicial: expediente.denuncia_policial,
                    estado: expediente.estado,
                    urgencia: expediente.urgencia,
                    proximoHito: expediente.proximo_hito,
                    fechaHito: expediente.fecha_hito,
                    materia: expediente.materia,
                    responsable: expediente.responsable
                }))
            }
        });
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({
            mensaje: 'No se pudo obtener el cliente.'
        });
    }
};

const registrarCliente = async (req, res) => {
    try {
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
        } = req.body;

        if (!codigo || !nombreCliente) {
            return res.status(400).json({
                mensaje: 'El codigo y el nombre del cliente son obligatorios.'
            });
        }

        const cliente = await crearCliente({
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
        });

        res.status(201).json({
            mensaje: 'Cliente registrado correctamente.',
            cliente
        });
    } catch (error) {
        console.error('Error al registrar cliente:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                mensaje: 'Ya existe un cliente con ese codigo o numero de documento.'
            });
        }

        res.status(500).json({
            mensaje: 'No se pudo registrar el cliente.'
        });
    }
};

const editarCliente = async (req, res) => {
    try {
        const idCliente = Number(req.params.id);

        if (!Number.isInteger(idCliente) || idCliente <= 0) {
            return res.status(400).json({
                mensaje: 'El identificador del cliente no es valido.'
            });
        }

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
        } = req.body;

        if (!nombreCliente) {
            return res.status(400).json({
                mensaje: 'El nombre del cliente es obligatorio.'
            });
        }

        const cliente = await actualizarCliente(idCliente, {
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
        });

        if (!cliente) {
            return res.status(404).json({
                mensaje: 'Cliente no encontrado.'
            });
        }

        res.json({
            mensaje: 'Cliente actualizado correctamente.',
            cliente
        });
    } catch (error) {
        console.error('Error al actualizar cliente:', error);

        if (error.code === '23505') {
            return res.status(409).json({
                mensaje: 'Ya existe otro cliente con ese numero de documento.'
            });
        }

        res.status(500).json({
            mensaje: 'No se pudo actualizar el cliente.'
        });
    }
};

module.exports = {
    listarClientes,
    obtenerDetalleCliente,
    registrarCliente,
    editarCliente
};