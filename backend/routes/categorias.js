const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Importar la piscina de conexiones compartida
const auth = require('../middleware/authMiddleware');

// GET /api/categorias - Obtener todas las categorías
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
