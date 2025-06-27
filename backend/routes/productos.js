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
  if (!filename || typeof filename !== 'string') return null;
  // Extraer solo el nombre del archivo, sin importar si viene con ruta
  const baseFilename = filename.split('/').pop().split('\\').pop();
  if (!baseFilename) return null;
  return `/uploads/${baseFilename}`;
};

// Configuración de Multer para la subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Define los nombres de los campos de imagen que se esperan del formulario
const imageFields = [
    'imagen_3_4',
    'imagen_frontal',
    'imagen_lateral',
    'imagen_trasera',
    'imagen_superior',
    'imagen_inferior'
];

// Middleware para manejar la subida de las imágenes del producto, ahora usando la lista de campos
const upload = multer({ storage: storage }).fields(
    imageFields.map(field => ({ name: field, maxCount: 1 }))
);

// GET /api/productos - Obtener todos los productos con filtros avanzados
router.get('/', async (req, res) => {
  try {
    const { categoria, categoriaId, marca, subcategoria, limit } = req.query;

    let query = `
      SELECT 
        p.id, p.nombre, p.marca, p.precio, p.descripcion, p.numero_referencia, 
        p.categoria_id, p.subcategoria_id, p.stock, p.activo, p.destacado, 
        p.fecha_creacion, c.nombre as categoria_nombre, s.nombre as subcategoria_nombre,
        ${imageFields.map(f => `p.${f}`).join(', ')}
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN subcategorias s ON p.subcategoria_id = s.id
    `;
    
    const conditions = ['p.activo = TRUE'];
    const params = [];

    if (categoria) {
      conditions.push('LOWER(c.nombre) = ?');
      params.push(categoria.toLowerCase());
    }
    if (categoriaId) {
      conditions.push('p.categoria_id = ?');
      params.push(categoriaId);
    }
    if (marca) {
      conditions.push('p.marca = ?');
      params.push(marca);
    }
    if (subcategoria) {
      conditions.push('LOWER(s.nombre) = ?');
      params.push(subcategoria.toLowerCase());
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.fecha_creacion DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit, 10));
    }

    const [rows] = await db.query(query, params);

    const formattedRows = rows.map(product => {
      const formattedProduct = { ...product };
      imageFields.forEach(field => {
        if (product[field]) {
          formattedProduct[field] = formatImagePath(product[field]);
        }
      });
      return formattedProduct;
    });

    res.json(formattedRows);
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

    const columns = [
      'p.id', 'p.nombre', 'p.marca', 'p.precio', 'p.descripcion', 'p.numero_referencia',
      'p.categoria_id', 'p.subcategoria_id', 'p.stock', 'p.activo', 'p.destacado',
      'p.fecha_creacion', 'c.nombre as categoria_nombre', 's.nombre as subcategoria_nombre',
      ...imageFields.map(f => `p.${f}`)
    ].join(', ');

    let query = `SELECT ${columns} FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id LEFT JOIN subcategorias s ON p.subcategoria_id = s.id`;
    
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

    const formattedRows = rows.map(product => {
      const formattedProduct = { ...product };
      imageFields.forEach(field => {
        if (product[field]) {
          formattedProduct[field] = formatImagePath(product[field]);
        }
      });
      return formattedProduct;
    });

    res.json(formattedRows);
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
      LIMIT ?`;

    const [rows] = await db.query(query, [categoria, parseInt(limit, 10)]);
    res.json(rows);
  } catch (error) {
    console.error(`Error al obtener top stock para ${categoria}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/destacados - Obtener todos los productos marcados como destacados
router.get('/destacados', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, p.nombre, p.marca, p.precio, p.stock,
        c.nombre as categoria_nombre,
        p.imagen_3_4 as imagen_principal
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = TRUE
      ORDER BY p.stock DESC
      LIMIT 10
    `;
    const [rows] = await db.query(query);

    const formattedRows = rows.map(product => ({
      ...product,
      imagen_principal: product.imagen_principal ? formatImagePath(product.imagen_principal) : 'https://via.placeholder.com/300x300.png?text=Sin+Imagen'
    }));

    res.json(formattedRows);
  } catch (error) {
    logger.error('Error al obtener productos destacados:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/categoria/:nombre - Obtener productos por nombre de categoría
router.get('/categoria/:nombre', async (req, res) => {
  try {
    const { nombre } = req.params;
    let query;
    const params = [];
    
    // Lógica condicional para los sliders específicos
    if (nombre.toLowerCase() === 'macs') {
      query = `
        SELECT p.id, p.nombre, p.marca, p.precio, p.stock, c.nombre as categoria_nombre, p.imagen_3_4 as imagen_principal
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        WHERE p.marca = ? AND LOWER(c.nombre) NOT IN (?, ?) AND p.activo = TRUE
        ORDER BY p.fecha_creacion DESC
        LIMIT 10`;
      params.push('MACS', 'sombreros', 'importada');
    } else if (nombre.toLowerCase() === 'importada') {
      query = `
        SELECT p.id, p.nombre, p.marca, p.precio, p.stock, c.nombre as categoria_nombre, p.imagen_3_4 as imagen_principal
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        WHERE p.marca = ? AND LOWER(c.nombre) NOT IN (?, ?) AND p.activo = TRUE
        ORDER BY p.fecha_creacion DESC
        LIMIT 10`;
      params.push('IMPORTADA', 'sombreros', 'macs');
    } else {
      // Comportamiento por defecto para otras categorías
      query = `
        SELECT p.id, p.nombre, p.marca, p.precio, p.stock, c.nombre as categoria_nombre, p.imagen_3_4 as imagen_principal
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        WHERE LOWER(c.nombre) = ? AND p.activo = TRUE
        ORDER BY p.fecha_creacion DESC`;
      params.push(nombre.toLowerCase());
    }

    const [rows] = await db.query(query, params);

    const formattedRows = rows.map(product => ({
      ...product,
      imagen_principal: product.imagen_principal ? formatImagePath(product.imagen_principal) : 'https://via.placeholder.com/300x300.png?text=Sin+Imagen'
    }));

    res.json(formattedRows);
  } catch (error) {
    logger.error('Error al obtener productos para la categoría ' + nombre, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET productos recomendados
router.get('/recomendados', async (req, res) => {
  const { categoriaId, excludeId, limit = 10 } = req.query;

  // Convertir IDs a números y validarlos
  const numCategoriaId = parseInt(categoriaId, 10);
  const numExcludeId = parseInt(excludeId, 10);
  const numLimit = parseInt(limit, 10);

  if (isNaN(numCategoriaId) || isNaN(numExcludeId)) {
    return res.status(400).json({ message: 'ID de categoría o producto inválido.' });
  }

  try {
    // Seleccionamos todos los campos necesarios y filtramos por activos
    const query = `
      SELECT p.id, p.nombre, p.marca, p.precio, p.activo, ${imageFields.map(f => `p.${f}`).join(', ')}
      FROM productos p
      WHERE p.categoria_id = ? AND p.id != ? AND p.activo = TRUE
      ORDER BY RAND()
      LIMIT ?`;
    
    const params = [numCategoriaId, numExcludeId, numLimit];

    const [rows] = await db.query(query, params);

    // Formatear las rutas de imagen para la URL
    const formattedRows = rows.map(product => {
      const formattedProduct = { ...product };
      imageFields.forEach(field => {
        if (product[field]) {
          formattedProduct[field] = formatImagePath(product[field]);
        }
      });
      return formattedProduct;
    });

    res.json(formattedRows);
  } catch (error) {
    logger.error(`Error al obtener productos recomendados para categoría ${categoriaId}:`, error);
    res.status(500).json({ message: 'Error interno del servidor al obtener recomendaciones.' });
  }
});

// POST /api/productos/create - Crear un nuevo producto
router.post('/create', [auth, upload], async (req, res) => {
  const { 
    nombre, marca, precio, descripcion, numero_referencia, 
    categoria_id, subcategoria_id, stock, activo, destacado 
  } = req.body;

  if (!nombre || !precio || !categoria_id) {
    return res.status(400).json({ message: 'Los campos nombre, precio y categoría son obligatorios.' });
  }

  try {
    const precioNum = parseFloat(precio);
    const stockNum = parseInt(stock, 10);
    const categoriaIdNum = parseInt(categoria_id, 10);
    const subcategoriaIdNum = parseInt(subcategoria_id, 10);

    if (!isNaN(subcategoriaIdNum)) {
      const [subcatRows] = await db.query('SELECT categoria_id FROM subcategorias WHERE id = ?', [subcategoriaIdNum]);
      if (subcatRows.length === 0 || subcatRows[0].categoria_id !== categoriaIdNum) {
        return res.status(400).json({ message: 'La subcategoría no pertenece a la categoría.' });
      }
    }

    const images = {};
    imageFields.forEach(field => {
      images[field] = req.files[field] ? formatImagePath(req.files[field][0].filename) : null;
    });

    const [result] = await db.query(
      `INSERT INTO productos (nombre, marca, precio, descripcion, numero_referencia, categoria_id, subcategoria_id, stock, activo, destacado, 
        ${imageFields.join(', ')}) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${imageFields.map(() => '?').join(', ')})`, 
      [
        nombre, marca, precioNum, descripcion, numero_referencia, 
        categoriaIdNum, isNaN(subcategoriaIdNum) ? null : subcategoriaIdNum, 
        isNaN(stockNum) ? 0 : stockNum, activo === 'true' || activo === true, destacado === 'true' || destacado === true,
        ...imageFields.map(field => images[field])
      ]
    );

    const [productoRows] = await db.query('SELECT * FROM productos WHERE id = ?', [result.insertId]);
    res.status(201).json(productoRows[0]);
  } catch (error) {
    console.error('Error al crear el producto:', error);
    res.status(500).json({ message: `Error de base de datos: ${error.message}` });
  }
});

// PUT /api/productos/update/:id - Actualizar un producto
router.put('/update/:id', [auth, upload], async (req, res) => {
  const { id } = req.params;
  const { 
    nombre, marca, precio, descripcion, numero_referencia, 
    categoria_id, subcategoria_id, stock, activo, destacado 
  } = req.body;

  if (!nombre || !precio || !categoria_id) {
    return res.status(400).json({ message: 'Los campos nombre, precio y categoría son obligatorios.' });
  }

  try {
    const [currentProductRows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (currentProductRows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    const currentProduct = currentProductRows[0];

    const images = {};
    imageFields.forEach(field => {
      const wasRemoved = req.body[`remove_${field}`] === 'true';
      // Si la imagen fue eliminada desde el frontend
      if (wasRemoved && currentProduct[field]) {
        const oldPath = path.join(__dirname, '..', 'uploads', path.basename(currentProduct[field]));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        images[field] = null;
      // Si se sube una nueva imagen
      } else if (req.files[field]) {
        if (currentProduct[field]) {
          const oldPath = path.join(__dirname, '..', 'uploads', path.basename(currentProduct[field]));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        images[field] = formatImagePath(req.files[field][0].filename);
      // Si no hay cambios, mantener la imagen actual
      } else {
        images[field] = currentProduct[field];
      }
    });

    const precioNum = parseFloat(precio);
    const stockNum = parseInt(stock, 10);
    const categoriaIdNum = parseInt(categoria_id, 10);
    const subcategoriaIdNum = parseInt(subcategoria_id, 10);

    if (!isNaN(subcategoriaIdNum)) {
      const [subcatRows] = await db.query('SELECT categoria_id FROM subcategorias WHERE id = ?', [subcategoriaIdNum]);
      if (subcatRows.length === 0 || subcatRows[0].categoria_id !== categoriaIdNum) {
        return res.status(400).json({ message: 'La subcategoría no pertenece a la categoría.' });
      }
    }

    const updateQuery = `UPDATE productos SET 
        nombre = ?, marca = ?, precio = ?, descripcion = ?, numero_referencia = ?, categoria_id = ?, 
        subcategoria_id = ?, stock = ?, activo = ?, destacado = ?, 
        ${imageFields.map(f => `${f} = ?`).join(', ')}
      WHERE id = ?`;
      
    const params = [
      nombre, marca, precioNum, descripcion, numero_referencia, categoriaIdNum,
      isNaN(subcategoriaIdNum) ? null : subcategoriaIdNum,
      isNaN(stockNum) ? currentProduct.stock : stockNum,
      activo === 'true' || activo === true, destacado === 'true' || destacado === true,
      ...imageFields.map(field => images[field]),
      id
    ];

    await db.query(updateQuery, params);

    const [productoRows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    res.json(productoRows[0]);

  } catch (error) {
    console.error(`Error al actualizar el producto ${id}:`, error);
    res.status(500).json({ message: `Error de base de datos: ${error.message}` });
  }
});

// DELETE /api/productos/delete/:id - Eliminar un producto
router.delete('/delete/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(`SELECT ${imageFields.join(', ')} FROM productos WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    const product = rows[0];

    imageFields.forEach(field => {
      if (product[field]) {
        const fullPath = path.join(__dirname, '..', 'uploads', path.basename(product[field]));
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    });

    await db.query('DELETE FROM productos WHERE id = ?', [id]);
    res.status(200).json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(`Error al eliminar el producto ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PATCH /api/productos/status/:id - Cambiar estado de un producto
router.patch('/status/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({ message: 'El campo "activo" es obligatorio y debe ser un booleano.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE productos SET activo = ? WHERE id = ?',
      [activo, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.status(200).json({ message: 'Estado del producto actualizado correctamente.' });
  } catch (error) {
    console.error(`Error al cambiar el estado del producto ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/:id - Obtener un producto específico con sus imágenes y tallas
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ message: 'ID de producto inválido.' });
  }

  try {
    // 1. Obtener los detalles principales del producto
    const productoQuery = `
      SELECT p.*, c.nombre as categoria_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.id = ?`;
    const [productoRows] = await db.query(productoQuery, [id]);

    if (productoRows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    const producto = productoRows[0];

    // 2. Transformar las columnas de imágenes de la tabla productos en un array 'Imagenes'
    const imagenes = [];
    imageFields.forEach(field => {
      // Excluir 'imagen_3_4' de la galería
      if (field !== 'imagen_3_4' && producto[field]) {
        imagenes.push({
          id_imagen: null, // No tenemos un ID de imagen individual en esta estructura
          ruta_imagen: formatImagePath(producto[field])
        });
      }
    });

    // 3. Asignar la talla única 'OS' ya que el concepto de tallas no existe en el sistema.
    const tallas = [{ id_talla: 0, talla: 'OS' }];

    // 4. Construir el objeto de producto completo para la respuesta
    const productoCompleto = {
      ...producto,
      Imagenes: imagenes, // Usar el array de imágenes transformado
      Tallas: tallas
    };

    // Limpiar los campos de imagen individuales del nivel superior del objeto para evitar redundancia
    imageFields.forEach(field => {
      delete productoCompleto[field];
    });

    res.json(productoCompleto);

  } catch (error) {
    console.error(`Error al obtener el producto ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/admin/:id - Obtener un producto específico para el panel de admin
router.get('/admin/:id', auth, async (req, res) => {
  const { id } = req.params;
  if (isNaN(parseInt(id, 10))) {
    return res.status(400).json({ message: 'ID de producto inválido.' });
  }

  try {
    const query = 'SELECT * FROM productos WHERE id = ?';
    const [rows] = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    const product = rows[0];
    
    const formattedProduct = { ...product };
    imageFields.forEach(field => {
      if (product[field]) {
        formattedProduct[field] = formatImagePath(product[field]);
      }
    });

    res.json(formattedProduct);

  } catch (error) {
    console.error(`Error al obtener el producto ${id} para admin:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;
