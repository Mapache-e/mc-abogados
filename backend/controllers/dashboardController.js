const {
    obtenerResumenDashboard,
    obtenerDistribucionExpedientes,
    obtenerProximasAudiencias
} = require('../services/dashboardService');

const obtenerDashboardAdministrador = async (req, res) => {
    try {
        const [
            resumen,
            distribucion,
            audiencias
        ] = await Promise.all([
            obtenerResumenDashboard(),
            obtenerDistribucionExpedientes(),
            obtenerProximasAudiencias()
        ]);

        return res.status(200).json({
            resumen: {
                expedientesActivos: Number(resumen.expedientes_activos),
                clientesActivos: Number(resumen.clientes_activos),
                audienciasProximas: Number(resumen.audiencias_proximas),
                tareasPendientes: Number(resumen.tareas_pendientes)
            },

            distribucionExpedientes: distribucion.map(item => ({
                tipo: item.tipo,
                cantidad: Number(item.cantidad)
            })),

            proximasAudiencias: audiencias.map(audiencia => ({
                id: audiencia.id_audiencia,
                titulo: audiencia.titulo,
                dia: obtenerDia(audiencia.fecha),
                mes: obtenerMes(audiencia.fecha),
                hora: formatearHora(audiencia.hora_inicio),
                ubicacion: audiencia.ubicacion
            }))
        });
    } catch (error) {
        console.error('Error al obtener dashboard:', error);

        return res.status(500).json({
            mensaje: 'Error al obtener la informacion del dashboard'
        });
    }
};

function obtenerDia(fecha) {
    return new Date(`${fecha}T00:00:00`).getDate();
}

function obtenerMes(fecha) {
    return new Date(`${fecha}T00:00:00`)
        .toLocaleDateString('es-PE', {
            month: 'short'
        })
        .replace('.', '')
        .toUpperCase();
}

function formatearHora(hora) {
    if (!hora) {
        return 'Hora pendiente';
    }

    return hora.substring(0, 5);
}

module.exports = {
    obtenerDashboardAdministrador
};