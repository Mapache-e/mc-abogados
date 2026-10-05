const {
    obtenerPracticantes,
    obtenerDetalleCompletoPracticante,
    obtenerMaterias,
    crearPracticante,
    actualizarPracticante
} = require('../services/practicanteService');

const listarPracticantes = async (req, res) => {
    try {
        const practicantes =
            await obtenerPracticantes();

        res.json({
            practicantes:
                practicantes.map(item => ({
                    id:
                        item.id_persona,

                    nombre:
                        item.nombre_completo,

                    correo:
                        item.correo,

                    telefono:
                        item.telefono,

                    numeroDocumento:
                        item.numero_documento,

                    direccion:
                        item.direccion,

                    fotoUrl:
                        item.foto_url,

                    activo:
                        item.activo,

                    materia: {
                        id:
                            item.materia_id,

                        nombre:
                            item.materia
                    },

                    expedientes: {
                        activos:
                            Number(
                                item.expedientes_activos || 0
                            ),

                        totales:
                            Number(
                                item.expedientes_totales || 0
                            )
                    },

                    tareas: {
                        pendientes:
                            Number(
                                item.tareas_pendientes || 0
                            ),

                        enCurso:
                            Number(
                                item.tareas_en_curso || 0
                            )
                    }
                }))
        });
    } catch (error) {
        console.error(
            'Error al listar practicantes:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudieron obtener los practicantes.'
        });
    }
};

const obtenerDetallePracticante = async (req, res) => {
    try {
        const idPracticante =
            Number(req.params.id);

        if (
            !Number.isInteger(idPracticante) ||
            idPracticante <= 0
        ) {
            return res.status(400).json({
                mensaje:
                    'El practicante indicado no es valido.'
            });
        }

        const detalle =
            await obtenerDetalleCompletoPracticante(
                idPracticante
            );

        if (!detalle) {
            return res.status(404).json({
                mensaje:
                    'Practicante no encontrado.'
            });
        }

        const {
            practicante,
            expedientes,
            tareas,
            disponibilidad
        } = detalle;

        res.json({
            practicante: {
                id:
                    practicante.id_persona,

                nombre:
                    practicante.nombre_completo,

                correo:
                    practicante.correo,

                telefono:
                    practicante.telefono,

                numeroDocumento:
                    practicante.numero_documento,

                direccion:
                    practicante.direccion,

                fotoUrl:
                    practicante.foto_url,

                activo:
                    practicante.activo,

                materia: {
                    id:
                        practicante.materia_id,

                    nombre:
                        practicante.materia
                },

                expedientes:
                    expedientes.map(item => ({
                        id:
                            item.id_asunto,

                        codigo:
                            item.codigo,

                        numero:
                            item.numero_expediente,

                        titulo:
                            item.titulo_asunto,

                        estado:
                            item.estado,

                        urgencia:
                            item.urgencia,

                        materia:
                            item.materia,

                        proximoHito:
                            item.proximo_hito,

                        fechaHito:
                            item.fecha_hito,

                        cliente: {
                            id:
                                item.id_cliente,

                            nombre:
                                item.nombre_cliente
                        }
                    })),

                tareas:
                    tareas.map(item => ({
                        id:
                            item.id_tarea,

                        codigo:
                            item.codigo,

                        titulo:
                            item.tarea,

                        prioridad:
                            item.prioridad,

                        fechaAsignacion:
                            item.fecha_asignacion,

                        fechaLimite:
                            item.fecha_limite,

                        estado:
                            item.estado,

                        requiereRevisionAbogado:
                            item.requiere_revision_abogado,

                        expediente: {
                            id:
                                item.id_asunto,

                            codigo:
                                item.codigo_expediente,

                            numero:
                                item.numero_expediente,

                            titulo:
                                item.titulo_asunto
                        },

                        cliente: {
                            id:
                                item.id_cliente,

                            nombre:
                                item.nombre_cliente
                        }
                    })),

                disponibilidad:
                    disponibilidad.map(item => ({
                        id:
                            item.id_disponibilidad,

                        fecha:
                            item.fecha,

                        horaInicio:
                            item.hora_inicio,

                        horaFin:
                            item.hora_fin,

                        disponible:
                            item.disponible,

                        motivo:
                            item.motivo
                    }))
            }
        });
    } catch (error) {
        console.error(
            'Error al obtener practicante:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo obtener el practicante.'
        });
    }
};

const obtenerCatalogosPracticantes = async (req, res) => {
    try {
        const materias =
            await obtenerMaterias();

        res.json({
            materias:
                materias.map(item => ({
                    id:
                        item.id_materia,

                    nombre:
                        item.nombre
                }))
        });
    } catch (error) {
        console.error(
            'Error al obtener catalogos:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudieron obtener los catalogos.'
        });
    }
};

const registrarPracticante = async (req, res) => {
    try {
        const {
            nombre,
            correo
        } = req.body;

        if (!nombre || !correo) {
            return res.status(400).json({
                mensaje:
                    'Nombre y correo son obligatorios.'
            });
        }

        const practicante =
            await crearPracticante(
                req.body
            );

        res.status(201).json({
            mensaje:
                'Practicante registrado correctamente.',

            practicante: {
                id:
                    practicante.id_persona
            }
        });
    } catch (error) {
        console.error(
            'Error al crear practicante:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo registrar el practicante.'
        });
    }
};

const editarPracticante = async (req, res) => {
    try {
        const id =
            Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje:
                    'El practicante indicado no es valido.'
            });
        }

        const {
            nombre,
            correo
        } = req.body;

        if (!nombre || !correo) {
            return res.status(400).json({
                mensaje:
                    'Nombre y correo son obligatorios.'
            });
        }

        const practicante =
            await actualizarPracticante(
                id,
                req.body
            );

        if (!practicante) {
            return res.status(404).json({
                mensaje:
                    'Practicante no encontrado.'
            });
        }

        res.json({
            mensaje:
                'Practicante actualizado correctamente.',

            practicante: {
                id:
                    practicante.id_persona
            }
        });
    } catch (error) {
        console.error(
            'Error al actualizar practicante:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo actualizar el practicante.'
        });
    }
};

module.exports = {
    listarPracticantes,
    obtenerDetallePracticante,
    obtenerCatalogosPracticantes,
    registrarPracticante,
    editarPracticante
};