const {
    obtenerPersonasEquipo,
    obtenerDisponibilidad,
    obtenerDisponibilidadPorId,
    crearDisponibilidad,
    actualizarDisponibilidad,
    eliminarDisponibilidad
} = require('../services/disponibilidadService');

const listarEquipo = async (req, res) => {
    try {
        const personas =
            await obtenerPersonasEquipo();

        res.json({
            personas: personas.map(item => ({
                id: item.id_persona,
                nombre: item.nombre_completo,
                rol: item.rol,
                correo: item.correo,
                telefono: item.telefono,
                fotoUrl: item.foto_url,
                activo: item.activo,
                materia: item.materia
            }))
        });
    } catch (error) {
        console.error(
            'Error al obtener equipo:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo obtener el equipo.'
        });
    }
};

const listarDisponibilidad = async (req, res) => {
    try {
        const registros =
            await obtenerDisponibilidad();

        res.json({
            disponibilidad:
                registros.map(item => ({
                    id: item.id_disponibilidad,
                    fecha: item.fecha,
                    horaInicio: item.hora_inicio,
                    horaFin: item.hora_fin,
                    disponible: item.disponible,
                    motivo: item.motivo,

                    persona: {
                        id: item.persona_id,
                        nombre:
                            item.nombre_completo,
                        rol:
                            item.rol,
                        correo:
                            item.correo,
                        telefono:
                            item.telefono,
                        fotoUrl:
                            item.foto_url,
                        materia:
                            item.materia
                    }
                }))
        });
    } catch (error) {
        console.error(
            'Error al obtener disponibilidad:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo obtener la disponibilidad.'
        });
    }
};

const registrarDisponibilidad = async (req, res) => {
    try {
        const {
            personaId,
            fecha,
            horaInicio,
            horaFin,
            disponible,
            motivo
        } = req.body;

        if (
            !personaId ||
            !fecha ||
            !horaInicio ||
            !horaFin
        ) {
            return res.status(400).json({
                mensaje:
                    'Persona, fecha y horario son obligatorios.'
            });
        }

        if (horaInicio >= horaFin) {
            return res.status(400).json({
                mensaje:
                    'La hora de inicio debe ser menor que la hora de fin.'
            });
        }

        const registro =
            await crearDisponibilidad({
                personaId,
                fecha,
                horaInicio,
                horaFin,
                disponible:
                    disponible !== false,
                motivo
            });

        res.status(201).json({
            mensaje:
                'Disponibilidad registrada correctamente.',

            disponibilidad: {
                id:
                    registro.id_disponibilidad
            }
        });
    } catch (error) {
        console.error(
            'Error al registrar disponibilidad:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo registrar la disponibilidad.'
        });
    }
};

const editarDisponibilidad = async (req, res) => {
    try {
        const idDisponibilidad =
            Number(req.params.id);

        if (
            !Number.isInteger(idDisponibilidad) ||
            idDisponibilidad <= 0
        ) {
            return res.status(400).json({
                mensaje:
                    'El bloque indicado no es valido.'
            });
        }

        const existente =
            await obtenerDisponibilidadPorId(
                idDisponibilidad
            );

        if (!existente) {
            return res.status(404).json({
                mensaje:
                    'Bloque de disponibilidad no encontrado.'
            });
        }

        const {
            personaId,
            fecha,
            horaInicio,
            horaFin,
            disponible,
            motivo
        } = req.body;

        if (
            !personaId ||
            !fecha ||
            !horaInicio ||
            !horaFin
        ) {
            return res.status(400).json({
                mensaje:
                    'Persona, fecha y horario son obligatorios.'
            });
        }

        if (horaInicio >= horaFin) {
            return res.status(400).json({
                mensaje:
                    'La hora de inicio debe ser menor que la hora de fin.'
            });
        }

        const actualizado =
            await actualizarDisponibilidad(
                idDisponibilidad,
                {
                    personaId,
                    fecha,
                    horaInicio,
                    horaFin,
                    disponible:
                        disponible !== false,
                    motivo
                }
            );

        res.json({
            mensaje:
                'Disponibilidad actualizada correctamente.',

            disponibilidad: {
                id:
                    actualizado.id_disponibilidad
            }
        });
    } catch (error) {
        console.error(
            'Error al actualizar disponibilidad:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo actualizar la disponibilidad.'
        });
    }
};

const borrarDisponibilidad = async (req, res) => {
    try {
        const idDisponibilidad =
            Number(req.params.id);

        if (
            !Number.isInteger(idDisponibilidad) ||
            idDisponibilidad <= 0
        ) {
            return res.status(400).json({
                mensaje:
                    'El bloque indicado no es valido.'
            });
        }

        const eliminado =
            await eliminarDisponibilidad(
                idDisponibilidad
            );

        if (!eliminado) {
            return res.status(404).json({
                mensaje:
                    'Bloque de disponibilidad no encontrado.'
            });
        }

        res.json({
            mensaje:
                'Disponibilidad eliminada correctamente.'
        });
    } catch (error) {
        console.error(
            'Error al eliminar disponibilidad:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo eliminar la disponibilidad.'
        });
    }
};

module.exports = {
    listarEquipo,
    listarDisponibilidad,
    registrarDisponibilidad,
    editarDisponibilidad,
    borrarDisponibilidad
};