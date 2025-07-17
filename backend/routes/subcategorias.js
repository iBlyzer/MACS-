const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

// GET /api/subcategorias/categoria/:categoriaId - Obtener subcategorías por ID de categoría.
router.get('/categoria/:categoriaId', auth, async (req, res) => {
  const { categoriaId } = req.params;
  if (!categoriaId) {
    return res.status(400).json({ message: 'El ID de la categoría es obligatorio.' });
  }
  try {
    const query = 'SELECT * FROM subcategorias WHERE categoria_id = ? ORDER BY nombre';
    const [rows] = await db.query(query, [categoriaId]);
    res.json(rows);
  } catch (error) {
    console.error(`Error al obtener subcategorías para la categoría ${categoriaId}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/subcategorias - Obtener todas las subcategorías
router.get('/', auth, async (req, res) => {
  try {
    const query = 'SELECT * FROM subcategorias ORDER BY nombre';
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener todas las subcategorías:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/subcategorias - Crear una nueva subcategoría
router.post('/', auth, async (req, res) => {
  const { nombre, categoria_id, descripcion = '' } = req.body;

  if (!nombre || !categoria_id) {
    return res.status(400).json({ message: 'El nombre y el ID de la categoría son obligatorios.' });
  }

  try {
    const query = 'INSERT INTO subcategorias (nombre, categoria_id, descripcion) VALUES (?, ?, ?)';
    const [result] = await db.query(query, [nombre, categoria_id, descripcion]);
    res.status(201).json({ id: result.insertId, nombre, categoria_id, descripcion });
  } catch (error) {
    console.error('Error al crear la subcategoría:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
