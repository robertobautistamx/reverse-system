const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM data_normalizada ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener los datos normalizados',
      error: error.message
    });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM data_normalizada ORDER BY created_at DESC LIMIT 1'
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No hay registros aún' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener el ultimo registro normalizado',
      error: error.message
    });
  }
});

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
              AVG(dist_norm) AS dist_norm,
              AVG(vel_norm) AS vel_norm,
              AVG(luz_norm) AS luz_norm
            FROM data_normalizada
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
          AVG(dist_norm) AS dist_norm,
          AVG(vel_norm) AS vel_norm,
          AVG(luz_norm) AS luz_norm
        FROM data_normalizada
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
            AVG(dist_norm) AS dist_norm,
            AVG(vel_norm) AS vel_norm,
            AVG(luz_norm) AS luz_norm
          FROM data_normalizada
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
      message: 'Error al obtener la serie normalizada',
      error: error.message
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM data_normalizada WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      message: 'Error al obtener el registro normalizado',
      error: error.message
    });
  }
});

module.exports = router;
