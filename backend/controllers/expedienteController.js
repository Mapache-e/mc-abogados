const {
    obtenerExpedientes,
    obtenerDetalleCompletoExpediente
} = require('../services/expedienteService');

const listarExpedientes = async (req, res) => {
    try {
        const expedientes = await obtenerExpedientes();

        const datos = expedientes.map(expediente => ({
            id: expediente.id_asunto,
            codigo: expediente.codigo,
            titulo: expediente.titulo_asunto,
            numeroExpediente: expediente.numero_expediente,
            carpetaFiscal: expediente.carpeta_fiscal,
            denunciaPolicial: expediente.denuncia_policial,
            contraparte: expediente.contraparte,
            organo: expediente.organo,
            estado: expediente.estado,
            urgencia: expediente.urgencia,
            proximoHito: expediente.proximo_hito,
            fechaHito: expediente.fecha_hito,
            documentosCompletos: expediente.documentos_completos,
            observaciones: expediente.observaciones,
            cliente: {
                id: expediente.id_cliente,
                nombre: expediente.nombre_cliente
            },
            materia: {
                id: expediente.id_materia,
                nombre: expediente.materia
            },
            responsable: {
                id: expediente.responsable_id,
                nombre: expediente.responsable
            }
        }));

        return res.status(200).json({
            total: datos.length,
            expedientes: datos
        });
    } catch (error) {
        console.error('Error al listar expedientes:', error);

        return res.status(500).json({
            mensaje: 'Error al obtener los expedientes'
        });
    }
};

const obtenerDetalleExpediente = async (req, res) => {
    try {
        const idExpediente = Number(req.params.id);

        if (!Number.isInteger(idExpediente) || idExpediente <= 0) {
            return res.status(400).json({
                mensaje: 'El identificador del expediente no es valido'
            });
        }

        const detalle = await obtenerDetalleCompletoExpediente(idExpediente);

        if (!detalle) {
            return res.status(404).json({
                mensaje: 'Expediente no encontrado'
            });
        }

        const { expediente, documentos, tareas } = detalle;

        const documentosFormateados = documentos.map(documento => ({
            id: documento.id_documento,
            codigo: documento.codigo,
            nombre: documento.nombre_documento,
            tipo: documento.tipo,
            version: documento.version,
            fecha: documento.fecha,
            revisionAbogado: documento.revision_abogado,
            estado: documento.estado,
            enlace: documento.ubicacion_enlace,
            confidencialidad: documento.confidencialidad,
            observaciones: documento.observaciones,
            responsable: documento.responsable_id ? {
                id: documento.responsable_id,
                nombre: documento.responsable
            } : null
        }));

        const tareasFormateadas = tareas.map(tarea => ({
            id: tarea.id_tarea,
            codigo: tarea.codigo,
            tarea: tarea.tarea,
            prioridad: tarea.prioridad,
            fechaAsignacion: tarea.fecha_asignacion,
            fechaLimite: tarea.fecha_limite,
            estado: tarea.estado,
            requiereRevisionAbogado: tarea.requiere_revision_abogado,
            segundoControl: tarea.segundo_control,
            evidencia: tarea.evidencia,
            fechaCierre: tarea.fecha_cierre,
            observaciones: tarea.observaciones,
            responsable: tarea.responsable_id ? {
                id: tarea.responsable_id,
                nombre: tarea.responsable
            } : null
        }));

        return res.status(200).json({
            expediente: {
                id: expediente.id_asunto,
                codigo: expediente.codigo,
                titulo: expediente.titulo_asunto,
                numeroExpediente: expediente.numero_expediente,
                carpetaFiscal: expediente.carpeta_fiscal,
                denunciaPolicial: expediente.denuncia_policial,
                contraparte: expediente.contraparte,
                organo: expediente.organo,
                estado: expediente.estado,
                urgencia: expediente.urgencia,
                proximoHito: expediente.proximo_hito,
                fechaHito: expediente.fecha_hito,
                documentosCompletos: expediente.documentos_completos,
                observaciones: expediente.observaciones,
                materia: {
                    id: expediente.id_materia,
                    nombre: expediente.materia
                },
                cliente: {
                    id: expediente.id_cliente,
                    codigo: expediente.codigo_cliente,
                    nombre: expediente.nombre_cliente,
                    contactoPrincipal: expediente.contacto_principal,
                    telefono: expediente.cliente_telefono,
                    correo: expediente.cliente_correo,
                    tipoDocumento: expediente.tipo_documento_identidad,
                    numeroDocumento: expediente.numero_documento,
                    representanteLegal: expediente.representante_legal,
                    direccion: expediente.cliente_direccion
                },
                responsable: expediente.responsable_id ? {
                    id: expediente.responsable_id,
                    nombre: expediente.responsable,
                    correo: expediente.responsable_correo,
                    telefono: expediente.responsable_telefono,
                    numeroColegiatura: expediente.numero_colegiatura,
                    colegioAbogados: expediente.colegio_abogados,
                    especialidad: expediente.especialidad_descripcion
                } : null,
                documentos: documentosFormateados,
                tareas: tareasFormateadas
            }
        });
    } catch (error) {
        console.error('Error al obtener detalle del expediente:', error);

        return res.status(500).json({
            mensaje: 'Error al obtener la informacion del expediente'
        });
    }
};

module.exports = {
    listarExpedientes,
    obtenerDetalleExpediente
};