const {
    obtenerConfiguracionSistema,
    actualizarConfiguracionSistema,
    obtenerMaterias,
    crearMateria,
    actualizarMateria,
    eliminarMateria,
    obtenerPerfilAdministrador,
    actualizarPerfilAdministrador
} = require('../services/configuracionService');

const obtenerConfiguracion = async (req, res) => {
    try {
        const [
            configuraciones,
            materias
        ] = await Promise.all([
            obtenerConfiguracionSistema(),
            obtenerMaterias()
        ]);

        const configuracion = {};

        configuraciones.forEach(item => {
            configuracion[item.clave] =
                item.valor;
        });

        res.json({
            configuracion,

            materias: materias.map(item => ({
                id: item.id_materia,
                nombre: item.nombre
            }))
        });
    } catch (error) {
        console.error(
            'Error al obtener configuracion:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo obtener la configuracion.'
        });
    }
};

const guardarConfiguracion = async (req, res) => {
    try {
        const {
            nombreEstudio,
            correoEstudio,
            telefonoEstudio,
            direccionEstudio,
            moneda
        } = req.body;

        if (!nombreEstudio) {
            return res.status(400).json({
                mensaje:
                    'El nombre del estudio es obligatorio.'
            });
        }

        const configuraciones = [
            {
                clave: 'nombre_estudio',
                valor: nombreEstudio
            },
            {
                clave: 'correo_estudio',
                valor: correoEstudio || ''
            },
            {
                clave: 'telefono_estudio',
                valor: telefonoEstudio || ''
            },
            {
                clave: 'direccion_estudio',
                valor: direccionEstudio || ''
            },
            {
                clave: 'moneda',
                valor: moneda || 'PEN'
            }
        ];

        await actualizarConfiguracionSistema(
            configuraciones
        );

        res.json({
            mensaje:
                'Configuracion actualizada correctamente.'
        });
    } catch (error) {
        console.error(
            'Error al guardar configuracion:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo guardar la configuracion.'
        });
    }
};

const registrarMateria = async (req, res) => {
    try {
        const nombre =
            String(req.body.nombre || '').trim();

        if (!nombre) {
            return res.status(400).json({
                mensaje:
                    'El nombre de la materia es obligatorio.'
            });
        }

        const materia =
            await crearMateria(nombre);

        res.status(201).json({
            mensaje:
                'Materia registrada correctamente.',

            materia: {
                id: materia.id_materia,
                nombre: materia.nombre
            }
        });
    } catch (error) {
        console.error(
            'Error al crear materia:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo registrar la materia.'
        });
    }
};

const editarMateria = async (req, res) => {
    try {
        const idMateria =
            Number(req.params.id);

        const nombre =
            String(req.body.nombre || '').trim();

        if (
            !Number.isInteger(idMateria) ||
            idMateria <= 0
        ) {
            return res.status(400).json({
                mensaje:
                    'La materia indicada no es valida.'
            });
        }

        if (!nombre) {
            return res.status(400).json({
                mensaje:
                    'El nombre es obligatorio.'
            });
        }

        const materia =
            await actualizarMateria(
                idMateria,
                nombre
            );

        if (!materia) {
            return res.status(404).json({
                mensaje:
                    'Materia no encontrada.'
            });
        }

        res.json({
            mensaje:
                'Materia actualizada correctamente.',

            materia: {
                id: materia.id_materia,
                nombre: materia.nombre
            }
        });
    } catch (error) {
        console.error(
            'Error al editar materia:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo actualizar la materia.'
        });
    }
};

const borrarMateria = async (req, res) => {
    try {
        const idMateria =
            Number(req.params.id);

        if (
            !Number.isInteger(idMateria) ||
            idMateria <= 0
        ) {
            return res.status(400).json({
                mensaje:
                    'La materia indicada no es valida.'
            });
        }

        const materia =
            await eliminarMateria(idMateria);

        if (!materia) {
            return res.status(404).json({
                mensaje:
                    'Materia no encontrada.'
            });
        }

        res.json({
            mensaje:
                'Materia eliminada correctamente.'
        });
    } catch (error) {
        console.error(
            'Error al eliminar materia:',
            error
        );

        if (
            error.codigo ===
            'MATERIA_EN_USO'
        ) {
            return res.status(409).json({
                mensaje: error.message
            });
        }

        res.status(500).json({
            mensaje:
                'No se pudo eliminar la materia.'
        });
    }
};

const obtenerMiPerfil = async (req, res) => {
    try {
        const idPersona =
            req.usuario.id ||
            req.usuario.idPersona ||
            req.usuario.id_persona;

        const perfil =
            await obtenerPerfilAdministrador(
                idPersona
            );

        if (!perfil) {
            return res.status(404).json({
                mensaje:
                    'Usuario no encontrado.'
            });
        }

        res.json({
            perfil: {
                id: perfil.id_persona,
                nombre: perfil.nombre_completo,
                rol: perfil.rol,
                correo: perfil.correo,
                telefono: perfil.telefono,
                numeroDocumento:
                    perfil.numero_documento,
                direccion:
                    perfil.direccion,
                fotoUrl:
                    perfil.foto_url,
                activo:
                    perfil.activo
            }
        });
    } catch (error) {
        console.error(
            'Error al obtener perfil:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo obtener el perfil.'
        });
    }
};

const guardarMiPerfil = async (req, res) => {
    try {
        const idPersona =
            req.usuario.id ||
            req.usuario.idPersona ||
            req.usuario.id_persona;

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

        const perfil =
            await actualizarPerfilAdministrador(
                idPersona,
                req.body
            );

        if (!perfil) {
            return res.status(404).json({
                mensaje:
                    'Usuario no encontrado.'
            });
        }

        res.json({
            mensaje:
                'Perfil actualizado correctamente.',

            perfil: {
                id: perfil.id_persona,
                nombre:
                    perfil.nombre_completo,
                rol:
                    perfil.rol,
                correo:
                    perfil.correo,
                telefono:
                    perfil.telefono,
                numeroDocumento:
                    perfil.numero_documento,
                direccion:
                    perfil.direccion,
                fotoUrl:
                    perfil.foto_url
            }
        });
    } catch (error) {
        console.error(
            'Error al actualizar perfil:',
            error
        );

        res.status(500).json({
            mensaje:
                'No se pudo actualizar el perfil.'
        });
    }
};

module.exports = {
    obtenerConfiguracion,
    guardarConfiguracion,
    registrarMateria,
    editarMateria,
    borrarMateria,
    obtenerMiPerfil,
    guardarMiPerfil
};