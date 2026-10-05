const {
    obtenerAbogados,
    obtenerDetalleCompletoAbogado,
    obtenerMaterias,
    crearAbogado,
    actualizarAbogado
} = require('../services/abogadoService');

const mapearAbogadoLista = item => ({
    id: item.id_persona,
    nombre: item.nombre_completo,
    correo: item.correo,
    telefono: item.telefono,
    numeroDocumento: item.numero_documento,
    direccion: item.direccion,
    fotoUrl: item.foto_url,
    activo: item.activo,

    materia: {
        id: item.materia_id,
        nombre: item.materia
    },

    numeroColegiatura:
        item.numero_colegiatura,

    colegioAbogados:
        item.colegio_abogados,

    especialidad:
        item.especialidad_descripcion,

    biografia:
        item.biografia,

    expedientes: {
        activos:
            Number(item.expedientes_activos || 0),

        totales:
            Number(item.expedientes_totales || 0)
    }
});

const listarAbogados = async (req, res) => {
    try {
        const abogados =
            await obtenerAbogados();

        res.json({
            abogados:
                abogados.map(mapearAbogadoLista)
        });
    } catch (error) {
        console.error(
            'Error al listar abogados:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudieron obtener los abogados.'
        });
    }
};

const obtenerDetalleAbogado = async (req, res) => {
    try {
        const id =
            Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje:
                    'El abogado indicado no es valido.'
            });
        }

        const detalle =
            await obtenerDetalleCompletoAbogado(id);

        if (!detalle) {
            return res.status(404).json({
                mensaje:
                    'Abogado no encontrado.'
            });
        }

        const {
            abogado,
            expedientes,
            disponibilidad,
            audiencias
        } = detalle;

        res.json({
            abogado: {
                id:
                    abogado.id_persona,

                nombre:
                    abogado.nombre_completo,

                correo:
                    abogado.correo,

                telefono:
                    abogado.telefono,

                numeroDocumento:
                    abogado.numero_documento,

                direccion:
                    abogado.direccion,

                fotoUrl:
                    abogado.foto_url,

                activo:
                    abogado.activo,

                materia: {
                    id:
                        abogado.materia_id,

                    nombre:
                        abogado.materia
                },

                numeroColegiatura:
                    abogado.numero_colegiatura,

                colegioAbogados:
                    abogado.colegio_abogados,

                especialidad:
                    abogado.especialidad_descripcion,

                biografia:
                    abogado.biografia,

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
                    })),

                audiencias:
                    audiencias.map(item => ({
                        id:
                            item.id_audiencia,

                        codigo:
                            item.codigo,

                        titulo:
                            item.titulo,

                        tipo:
                            item.tipo,

                        fecha:
                            item.fecha,

                        horaInicio:
                            item.hora_inicio,

                        horaFin:
                            item.hora_fin,

                        modalidad:
                            item.modalidad,

                        ubicacion:
                            item.ubicacion,

                        estado:
                            item.estado,

                        expediente: {
                            id:
                                item.id_asunto,

                            codigo:
                                item.codigo_expediente,

                            numero:
                                item.numero_expediente
                        },

                        cliente: {
                            id:
                                item.id_cliente,

                            nombre:
                                item.nombre_cliente
                        }
                    }))
            }
        });
    } catch (error) {
        console.error(
            'Error al obtener abogado:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo obtener el abogado.'
        });
    }
};

const obtenerCatalogosAbogados = async (req, res) => {
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

const registrarAbogado = async (req, res) => {
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

        const abogado =
            await crearAbogado(req.body);

        res.status(201).json({
            mensaje:
                'Abogado registrado correctamente.',

            abogado: {
                id:
                    abogado.id_persona
            }
        });
    } catch (error) {
        console.error(
            'Error al registrar abogado:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo registrar el abogado.'
        });
    }
};

const editarAbogado = async (req, res) => {
    try {
        const id =
            Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje:
                    'El abogado indicado no es valido.'
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

        const abogado =
            await actualizarAbogado(
                id,
                req.body
            );

        if (!abogado) {
            return res.status(404).json({
                mensaje:
                    'Abogado no encontrado.'
            });
        }

        res.json({
            mensaje:
                'Abogado actualizado correctamente.',

            abogado: {
                id:
                    abogado.id_persona
            }
        });
    } catch (error) {
        console.error(
            'Error al actualizar abogado:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo actualizar el abogado.'
        });
    }
};

module.exports = {
    listarAbogados,
    obtenerDetalleAbogado,
    obtenerCatalogosAbogados,
    registrarAbogado,
    editarAbogado
};