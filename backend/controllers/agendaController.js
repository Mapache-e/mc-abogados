const {
    obtenerAudiencias,
    obtenerDisponibilidadEquipo,
    obtenerDetalleCompletoAudiencia
} = require('../services/agendaService');

const listarAudiencias = async (req, res) => {
    try {
        const audiencias = await obtenerAudiencias();

        res.json({
            audiencias: audiencias.map(audiencia => ({
                id: audiencia.id_audiencia,
                codigo: audiencia.codigo,
                titulo: audiencia.titulo,
                tipo: audiencia.tipo,
                fecha: audiencia.fecha,
                horaInicio: audiencia.hora_inicio,
                horaFin: audiencia.hora_fin,
                modalidad: audiencia.modalidad,
                ubicacion: audiencia.ubicacion,
                enlaceVirtual: audiencia.enlace_virtual,
                juzgadoSala: audiencia.juzgado_sala,
                estado: audiencia.estado,
                grabacionUrl: audiencia.grabacion_url,
                notas: audiencia.notas,
                expediente: {
                    id: audiencia.id_asunto,
                    codigo: audiencia.codigo_expediente,
                    numero: audiencia.numero_expediente,
                    titulo: audiencia.titulo_asunto
                },
                cliente: {
                    id: audiencia.id_cliente,
                    nombre: audiencia.nombre_cliente
                },
                responsable: {
                    id: audiencia.responsable_id,
                    nombre: audiencia.responsable
                }
            }))
        });
    } catch (error) {
        console.error('Error al listar audiencias:', error);

        res.status(500).json({
            mensaje: 'No se pudieron obtener las audiencias.'
        });
    }
};

const obtenerDetalleAudiencia = async (req, res) => {
    try {
        const idAudiencia = Number(req.params.id);

        if (!Number.isInteger(idAudiencia) || idAudiencia <= 0) {
            return res.status(400).json({
                mensaje: 'El identificador de la audiencia no es valido.'
            });
        }

        const detalle = await obtenerDetalleCompletoAudiencia(idAudiencia);

        if (!detalle) {
            return res.status(404).json({
                mensaje: 'Audiencia no encontrada.'
            });
        }

        const {
            audiencia,
            participantes,
            documentos
        } = detalle;

        res.json({
            audiencia: {
                id: audiencia.id_audiencia,
                codigo: audiencia.codigo,
                titulo: audiencia.titulo,
                tipo: audiencia.tipo,
                fecha: audiencia.fecha,
                horaInicio: audiencia.hora_inicio,
                horaFin: audiencia.hora_fin,
                modalidad: audiencia.modalidad,
                ubicacion: audiencia.ubicacion,
                enlaceVirtual: audiencia.enlace_virtual,
                juzgadoSala: audiencia.juzgado_sala,
                estado: audiencia.estado,
                grabacionUrl: audiencia.grabacion_url,
                notas: audiencia.notas,

                expediente: {
                    id: audiencia.asunto_id,
                    codigo: audiencia.codigo_expediente,
                    numero: audiencia.numero_expediente,
                    titulo: audiencia.titulo_asunto,
                    carpetaFiscal: audiencia.carpeta_fiscal,
                    denunciaPolicial: audiencia.denuncia_policial
                },

                cliente: {
                    id: audiencia.id_cliente,
                    nombre: audiencia.nombre_cliente,
                    telefono: audiencia.cliente_telefono,
                    correo: audiencia.cliente_correo
                },

                responsable: {
                    id: audiencia.responsable_id,
                    nombre: audiencia.responsable,
                    correo: audiencia.responsable_correo,
                    telefono: audiencia.responsable_telefono
                },

                participantes: participantes.map(item => ({
                    id: item.id_participante,
                    personaId: item.persona_id,
                    nombre: item.persona || item.nombre_participante,
                    tipo: item.tipo_participante
                })),

                documentos: documentos.map(documento => ({
                    id: documento.documento_id,
                    codigo: documento.codigo,
                    nombre: documento.nombre_documento,
                    tipo: documento.tipo,
                    fecha: documento.fecha,
                    estado: documento.estado,
                    enlace: documento.ubicacion_enlace
                }))
            }
        });
    } catch (error) {
        console.error('Error al obtener audiencia:', error);

        res.status(500).json({
            mensaje: 'No se pudo obtener la audiencia.'
        });
    }
};

const listarDisponibilidadEquipo = async (req, res) => {
    try {
        const disponibilidad = await obtenerDisponibilidadEquipo();

        res.json({
            disponibilidad: disponibilidad.map(item => ({
                id: item.id_disponibilidad,
                personaId: item.persona_id,
                persona: item.nombre_completo,
                rol: item.rol,
                fotoUrl: item.foto_url,
                fecha: item.fecha,
                horaInicio: item.hora_inicio,
                horaFin: item.hora_fin,
                disponible: item.disponible,
                motivo: item.motivo
            }))
        });
    } catch (error) {
        console.error('Error al obtener disponibilidad:', error);

        res.status(500).json({
            mensaje: 'No se pudo obtener la disponibilidad del equipo.'
        });
    }
};

module.exports = {
    listarAudiencias,
    obtenerDetalleAudiencia,
    listarDisponibilidadEquipo
};