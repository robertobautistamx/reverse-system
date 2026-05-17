const express = require('express');
const router = express.Router();
const pool = require('../db');

// Latest raw + normalized record
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT
          d.id,
          d.distancia_cm,
          d.velocidad_cms,
          d.luz,
          d.semaforo,
          d.alarma,
          d.led_activo,
          d.created_at,
          n.dist_norm,
          n.vel_norm,
          n.luz_norm,
          n.semaforo AS semaforo_norm,
          n.alarma AS alarma_norm,
          n.led_activo AS led_activo_norm,
          n.created_at AS created_at_norm
        FROM data d
        LEFT JOIN data_normalizada n ON n.id = d.id
        ORDER BY d.created_at DESC
        LIMIT 1
      `
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay registros aún' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener el ultimo registro del dashboard',
      error: error.message
    });
  }
});

module.exports = router;
