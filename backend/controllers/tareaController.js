const {
    obtenerTareas,
    obtenerTareaPorId,
    actualizarEstadoTarea,
    obtenerResponsables,
    obtenerExpedientesParaTareas
} = require('../services/tareaService');

const listarTareas = async (req, res) => {
    try {
        const tareas = await obtenerTareas();

        res.json({
            tareas: tareas.map(tarea => ({
                id: tarea.id_tarea,
                codigo: tarea.codigo,
                titulo: tarea.tarea,
                prioridad: tarea.prioridad,
                fechaAsignacion: tarea.fecha_asignacion,
                fechaLimite: tarea.fecha_limite,
                estado: tarea.estado,
                requiereRevisionAbogado: tarea.requiere_revision_abogado,
                segundoControl: tarea.segundo_control,
                evidencia: tarea.evidencia,
                fechaCierre: tarea.fecha_cierre,
                observaciones: tarea.observaciones,

                expediente: {
                    id: tarea.id_asunto,
                    codigo: tarea.codigo_expediente,
                    numero: tarea.numero_expediente,
                    titulo: tarea.titulo_asunto,
                    estado: tarea.estado_expediente
                },

                cliente: {
                    id: tarea.id_cliente,
                    nombre: tarea.nombre_cliente
                },

                responsable: {
                    id: tarea.responsable_id,
                    nombre: tarea.responsable,
                    correo: tarea.responsable_correo,
                    fotoUrl: tarea.responsable_foto
                }
            }))
        });
    } catch (error) {
        console.error('Error al listar tareas:', error);

        res.status(500).json({
            mensaje: 'No se pudieron obtener las tareas.'
        });
    }
};

const obtenerDetalleTarea = async (req, res) => {
    try {
        const idTarea = Number(req.params.id);

        if (!Number.isInteger(idTarea) || idTarea <= 0) {
            return res.status(400).json({
                mensaje: 'El identificador de la tarea no es valido.'
            });
        }

        const tarea = await obtenerTareaPorId(idTarea);

        if (!tarea) {
            return res.status(404).json({
                mensaje: 'Tarea no encontrada.'
            });
        }

        res.json({
            tarea: {
                id: tarea.id_tarea,
                codigo: tarea.codigo,
                titulo: tarea.tarea,
                prioridad: tarea.prioridad,
                fechaAsignacion: tarea.fecha_asignacion,
                fechaLimite: tarea.fecha_limite,
                estado: tarea.estado,
                requiereRevisionAbogado: tarea.requiere_revision_abogado,
                segundoControl: tarea.segundo_control,
                evidencia: tarea.evidencia,
                fechaCierre: tarea.fecha_cierre,
                observaciones: tarea.observaciones,

                expediente: {
                    id: tarea.id_asunto,
                    codigo: tarea.codigo_expediente,
                    numero: tarea.numero_expediente,
                    titulo: tarea.titulo_asunto,
                    estado: tarea.estado_expediente,
                    proximoHito: tarea.proximo_hito,
                    fechaHito: tarea.fecha_hito
                },

                cliente: {
                    id: tarea.id_cliente,
                    nombre: tarea.nombre_cliente,
                    telefono: tarea.cliente_telefono,
                    correo: tarea.cliente_correo
                },

                responsable: {
                    id: tarea.responsable_id,
                    nombre: tarea.responsable,
                    correo: tarea.responsable_correo,
                    telefono: tarea.responsable_telefono,
                    fotoUrl: tarea.responsable_foto
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener tarea:', error);

        res.status(500).json({
            mensaje: 'No se pudo obtener la tarea.'
        });
    }
};

const cambiarEstadoTarea = async (req, res) => {
    try {
        const idTarea = Number(req.params.id);
        const { estado } = req.body;

        if (!Number.isInteger(idTarea) || idTarea <= 0) {
            return res.status(400).json({
                mensaje: 'El identificador de la tarea no es valido.'
            });
        }

        const estadosPermitidos = [
            'Pendiente',
            'En curso',
            'Completada',
            'Bloqueada',
            'Cancelada'
        ];

        if (!estadosPermitidos.includes(estado)) {
            return res.status(400).json({
                mensaje: 'El estado indicado no es valido.'
            });
        }

        const tarea = await actualizarEstadoTarea(
            idTarea,
            estado
        );

        if (!tarea) {
            return res.status(404).json({
                mensaje: 'Tarea no encontrada.'
            });
        }

        res.json({
            mensaje: 'Estado actualizado correctamente.',
            tarea: {
                id: tarea.id_tarea,
                codigo: tarea.codigo,
                titulo: tarea.tarea,
                estado: tarea.estado,
                fechaCierre: tarea.fecha_cierre
            }
        });
    } catch (error) {
        console.error('Error al cambiar estado:', error);

        res.status(500).json({
            mensaje: 'No se pudo actualizar el estado de la tarea.'
        });
    }
};

const obtenerCatalogosTareas = async (req, res) => {
    try {
        const [
            responsables,
            expedientes
        ] = await Promise.all([
            obtenerResponsables(),
            obtenerExpedientesParaTareas()
        ]);

        res.json({
            responsables: responsables.map(persona => ({
                id: persona.id_persona,
                nombre: persona.nombre_completo,
                rol: persona.rol,
                correo: persona.correo,
                fotoUrl: persona.foto_url
            })),

            expedientes: expedientes.map(expediente => ({
                id: expediente.id_asunto,
                codigo: expediente.codigo,
                numero: expediente.numero_expediente,
                titulo: expediente.titulo_asunto,
                estado: expediente.estado,
                cliente: expediente.nombre_cliente
            }))
        });
    } catch (error) {
        console.error('Error al obtener catalogos:', error);

        res.status(500).json({
            mensaje: 'No se pudieron obtener los datos necesarios.'
        });
    }
};

module.exports = {
    listarTareas,
    obtenerDetalleTarea,
    cambiarEstadoTarea,
    obtenerCatalogosTareas
};