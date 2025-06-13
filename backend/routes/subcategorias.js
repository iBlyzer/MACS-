const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

// GET /api/subcategorias/:id - Obtener subcategorías de una categoría
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM subcategorias WHERE categoria_id = ? ORDER BY nombre', [id]);
    res.json(rows);
  } catch (error) {
    console.error(`Error al obtener subcategorías para la categoría ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


module.exports = router;
