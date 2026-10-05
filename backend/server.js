const express = require('express');
const path = require('path');
const pool = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const expedienteRoutes = require('./routes/expedienteRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const abogadoRoutes = require('./routes/abogadoRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const tareaRoutes = require('./routes/tareaRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const reciboRoutes = require('./routes/reciboRoutes');
const practicanteRoutes = require('./routes/practicanteRoutes');
const configuracionRoutes = require('./routes/configuracionRoutes');
const disponibilidadRoutes = require('./routes/disponibilidadRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas de autenticacion
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expedientes', expedienteRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/abogados', abogadoRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/tareas', tareaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/recibos', reciboRoutes);
app.use('/api/practicantes', practicanteRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/disponibilidad', disponibilidadRoutes);


// Estado del servidor y PostgreSQL
app.get('/api/health', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT NOW() AS fecha_actual');

        res.status(200).json({
            mensaje: 'Servidor M&C Abogados funcionando correctamente',
            baseDeDatos: 'PostgreSQL conectado',
            fecha: resultado.rows[0].fecha_actual
        });
    } catch (error) {
        console.error('Error al conectar con PostgreSQL:', error.message);

        res.status(500).json({
            mensaje: 'Error al conectar con PostgreSQL'
        });
    }
});

// Login principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor M&C Abogados ejecutandose en http://localhost:${PORT}`);
});