const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Importar la piscina de conexiones compartida
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import fs para operaciones de archivo
const auth = require('../middleware/authMiddleware');

// Configuración de Multer para la subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    // Crear el directorio si no existe
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Crear un nombre de archivo único para evitar colisiones
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Middleware para manejar la subida de las 5 imágenes del producto
const upload = multer({ storage: storage }).fields([
    { name: 'imagen_frontal', maxCount: 1 },
    { name: 'imagen_icono', maxCount: 1 },
    { name: 'imagen_trasera', maxCount: 1 },
    { name: 'imagen_lateral_derecha', maxCount: 1 },
    { name: 'imagen_lateral_izquierda', maxCount: 1 }
]);

// GET /api/productos - Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM productos WHERE activo = TRUE ORDER BY fecha_creacion DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/:id - Obtener un producto específico
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [productoRows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);

    if (productoRows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    res.json(productoRows[0]);
  } catch (error) {
    console.error(`Error al obtener el producto ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/productos - Crear un nuevo producto (Ruta protegida)
router.post('/', [auth, upload], async (req, res) => {
  const { 
    nombre, 
    marca, 
    precio, 
    descripcion, 
    numero_referencia, 
    categoria_id, 
    subcategoria_id, 
    stock,
    activo,
    destacado
  } = req.body;

  if (!nombre || !marca || !precio || isNaN(parseFloat(precio)) || !categoria_id) {
    return res.status(400).json({ message: 'Los campos nombre, marca, precio y categoría son obligatorios, y el precio debe ser un número válido.' });
  }

  const getPath = (fieldName) => (req.files && req.files[fieldName]) ? `/uploads/${req.files[fieldName][0].filename}` : null;

  const imagen_frontal = getPath('imagen_frontal');
  const imagen_icono = getPath('imagen_icono');
  const imagen_trasera = getPath('imagen_trasera');
  const imagen_lateral_derecha = getPath('imagen_lateral_derecha');
  const imagen_lateral_izquierda = getPath('imagen_lateral_izquierda');

  try {
    const precioNum = parseFloat(precio);
    const stockNum = parseInt(stock, 10);
    const categoriaIdNum = parseInt(categoria_id, 10);
    const subcategoriaIdNum = parseInt(subcategoria_id, 10);

    // Validación de consistencia entre categoría y subcategoría
    if (!isNaN(subcategoriaIdNum)) {
      const [subcatRows] = await db.query('SELECT categoria_id FROM subcategorias WHERE id = ?', [subcategoriaIdNum]);
      if (subcatRows.length === 0 || subcatRows[0].categoria_id !== categoriaIdNum) {
        return res.status(400).json({ message: 'La subcategoría seleccionada no pertenece a la categoría indicada.' });
      }
    }

    const [result] = await db.query(
      `INSERT INTO productos (nombre, marca, precio, descripcion, numero_referencia, categoria_id, subcategoria_id, stock, 
        imagen_frontal, imagen_icono, imagen_trasera, imagen_lateral_derecha, imagen_lateral_izquierda, activo, destacado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, 
        marca, 
        precioNum, 
        descripcion, 
        numero_referencia, 
        categoriaIdNum, 
        isNaN(subcategoriaIdNum) ? null : subcategoriaIdNum, 
        isNaN(stockNum) ? 0 : stockNum, 
        imagen_frontal,
        imagen_icono,
        imagen_trasera,
        imagen_lateral_derecha,
        imagen_lateral_izquierda,
        (activo === 'true') ? 1 : 0,
        (destacado === 'true') ? 1 : 0
      ]
    );

    const nuevoProductoId = result.insertId;
    const [productoRows] = await db.query('SELECT * FROM productos WHERE id = ?', [nuevoProductoId]);

    res.status(201).json(productoRows[0]);
  } catch (error) {
    console.error('Error al crear el producto:', error);
    res.status(500).json({ message: `Error de base de datos: ${error.message}` });
  }
});

// PUT /api/productos/:id - Actualizar un producto existente (Ruta protegida)
router.put('/:id', [auth, upload], async (req, res) => {
  const { id } = req.params;
  const { 
    nombre, 
    marca, 
    precio, 
    descripcion, 
    numero_referencia, 
    categoria_id, 
    subcategoria_id, 
    stock, 
    activo, 
    destacado
  } = req.body;

  if (!nombre || !marca || !precio || !categoria_id) {
    return res.status(400).json({ message: 'Los campos nombre, marca, precio y categoría son obligatorios.' });
  }

  try {
    const [currentProductRows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (currentProductRows.length === 0) {
        return res.status(404).json({ message: 'Producto no encontrado para actualizar.' });
    }
    const currentImages = currentProductRows[0];

    const getPath = (fieldName) => {
        if (req.files && req.files[fieldName]) {
            const newPath = `/uploads/${req.files[fieldName][0].filename}`;
            if (currentImages[fieldName]) {
                const oldPath = path.join(__dirname, '..', currentImages[fieldName]);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            return newPath;
        }
        return currentImages[fieldName];
    };

    const imagen_frontal = getPath('imagen_frontal');
    const imagen_icono = getPath('imagen_icono');
    const imagen_trasera = getPath('imagen_trasera');
    const imagen_lateral_derecha = getPath('imagen_lateral_derecha');
    const imagen_lateral_izquierda = getPath('imagen_lateral_izquierda');

    const precioNum = parseFloat(precio);
    const stockNum = parseInt(stock, 10);
    const categoriaIdNum = parseInt(categoria_id, 10);
    const subcategoriaIdNum = parseInt(subcategoria_id, 10);
    const activoBool = activo === 'true' || activo === true;
    const destacadoBool = destacado === 'true' || destacado === true;

    // Validación de consistencia entre categoría y subcategoría
    if (!isNaN(subcategoriaIdNum)) {
      const [subcatRows] = await db.query('SELECT categoria_id FROM subcategorias WHERE id = ?', [subcategoriaIdNum]);
      if (subcatRows.length === 0 || subcatRows[0].categoria_id !== categoriaIdNum) {
        return res.status(400).json({ message: 'La subcategoría seleccionada no pertenece a la categoría indicada.' });
      }
    }

    await db.query(
      `UPDATE productos SET 
        nombre = ?, marca = ?, precio = ?, descripcion = ?, numero_referencia = ?, categoria_id = ?, 
        subcategoria_id = ?, stock = ?, activo = ?, destacado = ?, 
        imagen_frontal = ?, imagen_icono = ?, imagen_trasera = ?, imagen_lateral_derecha = ?, imagen_lateral_izquierda = ?
      WHERE id = ?`,
      [
        nombre, 
        marca, 
        precioNum, 
        descripcion, 
        numero_referencia, 
        categoriaIdNum,
        isNaN(subcategoriaIdNum) ? null : subcategoriaIdNum,
        isNaN(stockNum) ? currentImages.stock : stockNum,
        activoBool ? 1 : 0,
        destacadoBool ? 1 : 0,
        imagen_frontal, 
        imagen_icono,
        imagen_trasera,
        imagen_lateral_derecha,
        imagen_lateral_izquierda,
        id
      ]
    );

    const [productoRows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    res.json(productoRows[0]);

  } catch (error) {
    console.error(`Error al actualizar el producto ${id}:`, error);
    res.status(500).json({ message: `Error de base de datos: ${error.message}` });
  }
});

// DELETE /api/productos/:id - Eliminar un producto (Ruta protegida)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT imagen_frontal, imagen_icono, imagen_trasera, imagen_lateral_derecha, imagen_lateral_izquierda FROM productos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    const product = rows[0];

    // Eliminar imágenes del sistema de archivos
    Object.values(product).forEach(imgPath => {
      if (imgPath) {
        const fullPath = path.join(__dirname, '..', imgPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    });

    const [result] = await db.query('DELETE FROM productos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.status(200).json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(`Error al eliminar el producto ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
