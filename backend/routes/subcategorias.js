const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

// GET /api/subs - Obtener subcategorías.
// Si se provee categoriaId en la query, filtra por esa categoría. Si no, devuelve todas.
router.get('/', auth, async (req, res) => {
  const { categoriaId } = req.query;
  try {
    let query = 'SELECT * FROM subcategorias';
    const params = [];

    if (categoriaId) {
      query += ' WHERE categoria_id = ?';
      params.push(categoriaId);
    }
    
    query += ' ORDER BY nombre';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener subcategorías:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
