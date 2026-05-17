const express = require('express');
const router  = express.Router();
const pool    = require('../db');

//Todos los registros (mas reciente primero)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM data ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener los datos',
      error: error.message
    });
  }
});

//ultimo registro guardado
router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM data ORDER BY created_at DESC LIMIT 1'
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay registros aún' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener el último registro',
      error: error.message
    });
  }
});

// Aggregated raw series for charts
// Query params: intervalMinutes (default 1), hours (default 24), mode=all, maxPoints
router.get('/series', async (req, res) => {
  try {
    const intervalMinutes = Math.max(parseInt(req.query.intervalMinutes, 10) || 1, 1);
    const hours = Math.max(parseInt(req.query.hours, 10) || 24, 0);
    const intervalSeconds = intervalMinutes * 60;
    const mode = String(req.query.mode || 'range').toLowerCase();
    const maxPoints = Math.max(parseInt(req.query.maxPoints, 10) || 2000, 1);

    if (mode === 'all' || hours === 0) {
      const [allRows] = await pool.query(
        `
          SELECT *
          FROM (
            SELECT
              FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / ?) * ?) AS bucket,
              AVG(distancia_cm) AS distancia_cm,
              AVG(velocidad_cms) AS velocidad_cms,
              AVG(luz) AS luz
            FROM data
            GROUP BY bucket
            ORDER BY bucket DESC
            LIMIT ?
          ) AS recent
          ORDER BY bucket ASC
        `,
        [intervalSeconds, intervalSeconds, maxPoints]
      );

      return res.json(allRows);
    }

    const [rows] = await pool.query(
      `
        SELECT
          FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / ?) * ?) AS bucket,
          AVG(distancia_cm) AS distancia_cm,
          AVG(velocidad_cms) AS velocidad_cms,
          AVG(luz) AS luz
        FROM data
        WHERE created_at >= NOW() - INTERVAL ? HOUR
        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      [intervalSeconds, intervalSeconds, hours]
    );

    if (rows.length > 0) {
      return res.json(rows);
    }

    const fallbackPoints = Math.max(Math.floor((hours * 60) / intervalMinutes), 1);
    const [fallbackRows] = await pool.query(
      `
        SELECT *
        FROM (
          SELECT
            FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / ?) * ?) AS bucket,
            AVG(distancia_cm) AS distancia_cm,
            AVG(velocidad_cms) AS velocidad_cms,
            AVG(luz) AS luz
          FROM data
          GROUP BY bucket
          ORDER BY bucket DESC
          LIMIT ?
        ) AS recent
        ORDER BY bucket ASC
      `,
      [intervalSeconds, intervalSeconds, fallbackPoints]
    );

    return res.json(fallbackRows);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener la serie raw',
      error: error.message
    });
  }
});

// GET /api/data/:id --> Registro por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM data WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener el registro',
      error: error.message
    });
  }
});

// POST /api/data =  Guardar lectura del sensor
//
// Body esperado (JSON):
// {
//   "distancia_cm":  45.20,
//   "velocidad_cms": 3.10,
//   "luz":           512,
//   "semaforo":      "VERDE",     // "VERDE" | "AMARILLO" | "ROJO"
//   "alarma":        "OFF",       // "ON" | "OFF"
//   "led_activo":    0            // 0=VERDE 1=AMARILLO 2=ROJO -1=sin objeto
// }

router.post('/', async (req, res) => {
  try {
    const { distancia_cm, velocidad_cms, luz, semaforo, alarma, led_activo } = req.body;

    if (
      distancia_cm===undefined ||
      velocidad_cms===undefined ||
      luz===undefined ||
      semaforo===undefined ||
      alarma===undefined ||
      led_activo===undefined
    ) {
      return res.status(400).json({
        message: 'Campos obligatorios: distancia_cm, velocidad_cms, luz, semaforo, alarma, led_activo'
      });
    }

    const sql = `
      INSERT INTO data (distancia_cm, velocidad_cms, luz, semaforo, alarma, led_activo)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.execute(sql, [
      distancia_cm,
      velocidad_cms,
      luz,
      semaforo,
      alarma,
      led_activo
    ]);

    res.status(201).json({
      message: 'Datos guardados correctamente',
      id: result.insertId,
      data: { distancia_cm, velocidad_cms, luz, semaforo, alarma, led_activo }
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error al guardar los datos',
      error: error.message
    });
  }
});

module.exports = router;