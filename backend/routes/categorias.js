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

// POST /api/categorias - Crear una nueva categoría
router.post('/', auth, async (req, res) => {
  const { nombre, descripcion = '' } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: 'El nombre de la categoría es obligatorio.' });
  }

  try {
    const query = 'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)';
    const [result] = await db.query(query, [nombre, descripcion]);
    res.status(201).json({ id: result.insertId, nombre, descripcion });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Ya existe una categoría con ese nombre.' });
    }
    console.error('Error al crear la categoría:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
