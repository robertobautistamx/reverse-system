const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const dataRoutes = require('./routes/data.routes');
const normalizedRoutes = require('./routes/normalized.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app  = express();
const PORT = process.env.PORT || 3006;

// Middlewares
app.use(cors());
app.use(express.json());

// rutas
app.get('/', (req, res) => {
  res.json({
    message: 'API REST de sensores funcionando correctamente',
    endpoints: {
      'GET  /api/data':          'Todos los registros',
      'GET  /api/data/latest':   'Ultimo registro',
      'GET  /api/data/:id':      'Registro por ID',
      'POST /api/data':          'Guardar nuevo registro',
      'GET  /api/normalized':        'Todos los registros normalizados',
      'GET  /api/normalized/latest': 'Ultimo registro normalizado',
      'GET  /api/normalized/:id':    'Registro normalizado por ID',
      'GET  /api/normalized/series': 'Serie agregada normalizada (intervalMinutes, hours)',
      'GET  /api/dashboard/latest':  'Ultimo registro raw + normalizado'
    }
  });
});

app.use('/api/data', dataRoutes);
app.use('/api/normalized', normalizedRoutes);
app.use('/api/dashboard', dashboardRoutes);

//servidorr
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});