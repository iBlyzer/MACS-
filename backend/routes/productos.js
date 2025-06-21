console.log('--- [DEBUG] productos.js router loaded at', new Date().toLocaleTimeString());
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Importar la piscina de conexiones compartida
const logger = require('../config/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import fs para operaciones de archivo

// --- Ruta de depuración para obtener todas las categorías ---
router.get('/get-all-categories-for-debugging', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT nombre FROM categorias ORDER BY nombre');
    const categorias = rows.map(row => row.nombre);
    logger.info('Enviando lista de categorías para depuración:', categorias);
    res.json(categorias);
  } catch (error) {
    logger.error('Error al obtener categorías de depuración:', error);
    res.status(500).send('Error en el servidor');
  }
});

const auth = require('../middleware/authMiddleware');

// Helper function to format image paths consistently for URLs
const formatImagePath = (filename) => {
  if (!filename) return null;
  // Use path.basename to be safe, then create a URL-friendly path with forward slashes
  const imagePath = path.join('uploads', path.basename(filename)).replace(/\\/g, '/');
  return `/${imagePath}`;
};

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
    const { categoria, categoriaId } = req.query;
    // Modificamos la consulta para que siempre traiga todos los campos de producto
    let query = 'SELECT p.id, p.nombre, p.marca, p.precio, p.descripcion, p.numero_referencia, p.categoria_id, p.subcategoria_id, p.stock, p.activo, p.destacado, p.fecha_creacion, p.imagen_frontal, p.imagen_icono, p.imagen_trasera, p.imagen_lateral_derecha, p.imagen_lateral_izquierda, c.nombre as categoria_nombre FROM productos p JOIN categorias c ON p.categoria_id = c.id WHERE p.activo = TRUE';
    const params = [];

    if (categoria) {
      logger.info(`Buscando productos por categoría: ${categoria}`);
      query += ' AND LOWER(c.nombre) LIKE ?';
      params.push(`%${categoria.toLowerCase().replace(/s$/, '')}%`);
    } else if (categoriaId) {
      logger.info(`Buscando productos por ID de categoría: ${categoriaId}`);
      query += ' AND p.categoria_id = ?';
      params.push(categoriaId);
    }

    query += ' ORDER BY p.fecha_creacion DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/get-all - Obtener todos los productos para el panel de administración (Ruta protegida)
router.get('/get-all', auth, async (req, res) => {
  console.log('Request received for /api/productos/get-all with query:', req.query);
  try {
    const { search, categoria, subcategoriaId } = req.query;
    let query = 'SELECT p.*, c.nombre as categoria_nombre, s.nombre as subcategoria_nombre FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id LEFT JOIN subcategorias s ON p.subcategoria_id = s.id';
    const params = [];
    let conditions = [];

    if (search) {
      conditions.push('p.nombre LIKE ?');
      params.push(`%${search}%`);
    }
    if (categoria) {
      conditions.push('p.categoria_id = ?');
      params.push(categoria);
    }
    if (subcategoriaId) {
      conditions.push('p.subcategoria_id = ?');
      params.push(subcategoriaId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.fecha_creacion DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener todos los productos para admin:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/top-stock - Obtener productos con más stock por categoría
router.get('/top-stock', async (req, res) => {
  console.log('--- [DEBUG] Request received for /api/productos/top-stock');
  const { categoria, limit = 3 } = req.query;

  if (!categoria) {
    return res.status(400).json({ message: 'El parámetro categoría es obligatorio.' });
  }

  try {
    const query = `
      SELECT p.*
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE c.nombre = ? AND p.activo = TRUE
      ORDER BY p.stock DESC
      LIMIT ?
    `;
    const [rows] = await db.query(query, [categoria, parseInt(limit, 10)]);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos con más stock:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/recomendados - Obtener productos recomendados
router.get('/recomendados', async (req, res) => {
  console.log('--- [DEBUG] Request received for /api/productos/recomendados');
  const { categoriaId, excludeId, limit = 4 } = req.query;

  if (!categoriaId || !excludeId) {
    return res.status(400).json({ message: 'Los parámetros categoriaId y excludeId son obligatorios.' });
  }

  try {
    const query = `
      SELECT *
      FROM productos
      WHERE categoria_id = ? AND id != ? AND activo = TRUE
      ORDER BY RAND()
      LIMIT ?
    `;
    const [rows] = await db.query(query, [parseInt(categoriaId, 10), parseInt(excludeId, 10), parseInt(limit, 10)]);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos recomendados:', error);
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

  const getPath = (fieldName) => (req.files && req.files[fieldName]) ? formatImagePath(req.files[fieldName][0].filename) : null;

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
            const newPath = formatImagePath(req.files[fieldName][0].filename);
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

// PATCH /api/productos/:id/toggle-active - Cambiar el estado activo de un producto (Ruta protegida)
router.patch('/:id/toggle-active', auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Invertir el estado 'activo' directamente en la base de datos
    await db.query('UPDATE productos SET activo = NOT activo WHERE id = ?', [id]);
    
    // Obtener el producto actualizado para devolverlo
    const [rows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado después de la actualización.' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Error al cambiar el estado del producto ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/productos/:id - Eliminar un producto (Ruta protegida)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Primero, obtener las rutas de las imágenes para poder eliminarlas
    const [rows] = await db.query('SELECT imagen_frontal, imagen_icono, imagen_trasera, imagen_lateral_derecha, imagen_lateral_izquierda FROM productos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    const product = rows[0];

    // Eliminar imágenes del sistema de archivos
    Object.values(product).forEach(imgPath => {
      if (imgPath) {
        // La ruta guardada es relativa al servidor (ej: /uploads/...), necesitamos la ruta del sistema de archivos
        const fullPath = path.join(__dirname, '..', imgPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    });

    // Ahora, eliminar el producto de la base de datos
    const [result] = await db.query('DELETE FROM productos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      // Esto no debería ocurrir si la consulta anterior encontró el producto, pero es una buena práctica
      return res.status(404).json({ message: 'Producto no encontrado para eliminar' });
    }

    res.status(200).json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(`Error al eliminar el producto ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// GET /api/productos/:id - Obtener un producto específico
router.get('/:id', async (req, res, next) => {
  // Si el ID no es un número, podría ser otra sub-ruta como 'debug-categorias'.
  if (isNaN(parseInt(req.params.id, 10))) {
    return next(); // Pasa a la siguiente ruta que coincida.
  }

  console.log(`Request received for /api/productos/:id with ID: ${req.params.id}`);
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

module.exports = router;
