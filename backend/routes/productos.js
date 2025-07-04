console.log('--- [DEBUG] productos.js router loaded at', new Date().toLocaleTimeString());
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Importar la piscina de conexiones compartida
const logger = require('../config/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Import fs para operaciones de archivo
const sharp = require('sharp');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Helper para subir un buffer a Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: 'productos', // Opcional: para organizar en una carpeta en Cloudinary
        format: 'webp' // Asegurarnos de que se guarde como WebP
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

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
// Helper function to get human-readable labels for image fields
const getImageLabel = (fieldName) => {
  const labels = {
    'imagen_3_4': 'Principal',
    'imagen_frontal': 'Frontal',
    'imagen_lateral': 'Lateral',
    'imagen_trasera': 'Trasera',
    'imagen_superior': 'Superior',
    'imagen_inferior': 'Inferior'
  };
  return labels[fieldName] || 'Vista'; // Default label
};

// La función formatImagePath ya no es necesaria, porque Cloudinary nos da la URL completa.
// La dejamos por si se usa en alguna otra parte, pero debería ser eliminada eventualmente.
const formatImagePath = (url) => {
  // Si ya es una URL completa de Cloudinary, la devolvemos tal cual.
  if (url && url.startsWith('http')) {
    return url;
  }
  if (!url || typeof url !== 'string') return null;
  const baseFilename = url.split('/').pop().split('\\').pop();
  if (!baseFilename) return null;
  return `/uploads/${baseFilename}`;
};

// Configuración de Multer para la subida de archivos en memoria
const storage = multer.memoryStorage();

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

// Middleware para procesar y subir imágenes a Cloudinary
const processAndUploadImages = async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return next();
  }

  try {
    // Un objeto para guardar las URLs seguras de Cloudinary
    req.cloudinary_urls = {}; 

    const uploadPromises = [];

    for (const field in req.files) {
      for (const file of req.files[field]) {
        const processingPromise = sharp(file.buffer)
          .webp({ quality: 80 })
          .toBuffer()
          .then(buffer => uploadToCloudinary(buffer))
          .then(result => {
            // Guardamos la URL segura en nuestro objeto
            if (!req.cloudinary_urls[field]) {
              req.cloudinary_urls[field] = [];
            }
            req.cloudinary_urls[field].push(result.secure_url);
          });
        
        uploadPromises.push(processingPromise);
      }
    }

    await Promise.all(uploadPromises);
    next();
  } catch (error) {
    logger.error('Error processing and uploading images:', error);
    next(error);
  }
};

// GET /api/productos - Obtener todos los productos con filtros avanzados
router.get('/', async (req, res) => {
  try {
    const { categoria, categoriaId, marca, subcategoria, limit } = req.query;

    let query = `
      SELECT 
        p.id, p.nombre, p.marca, p.precio, p.descripcion, p.numero_referencia, 
        p.categoria_id, p.subcategoria_id, p.activo, p.destacado, p.tiene_tallas,

        p.fecha_creacion, c.nombre as categoria_nombre, s.nombre as subcategoria_nombre,
        pt.talla, pt.stock AS stock_talla,
        ${imageFields.map(f => `p.${f}`).join(', ')}
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN subcategorias s ON p.subcategoria_id = s.id
      LEFT JOIN producto_tallas pt ON p.id = pt.producto_id
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

    query += ' ORDER BY p.id, p.fecha_creacion DESC';

    const [rows] = await db.query(query, params);

    const productsMap = new Map();

    rows.forEach(row => {
        let product = productsMap.get(row.id);

        if (!product) {
            product = { ...row };
            delete product.talla;
            delete product.stock_talla;
            product.tallas = [];

            imageFields.forEach(field => {
                if (product[field]) {
                    product[field] = formatImagePath(product[field]);
                }
            });
            
            productsMap.set(row.id, product);
        }

        if (row.talla) {
            product.tallas.push({ talla: row.talla, stock: row.stock_talla });
        }
    });
    
    productsMap.forEach(product => {
        // El stock se calcula siempre a partir de la suma de las tallas disponibles.
        // Si un producto no tiene entradas en producto_tallas, su stock será 0.
        product.stock = product.tallas.reduce((acc, t) => acc + (t.stock || 0), 0);
    });

    let finalProducts = Array.from(productsMap.values());

    if (limit) {
        finalProducts = finalProducts.slice(0, parseInt(limit, 10));
    }

    res.json(finalProducts);

  } catch (error) {
    logger.error('Error al obtener productos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/get-all - Obtener todos los productos para el panel de administración (Ruta protegida)
router.get('/get-all', auth, async (req, res) => {
  console.log('Request received for /api/productos/get-all with query:', req.query);
  try {
    const { nombre, categoria_id, subcategoria_id } = req.query;

    const columns = [
      'p.id', 'p.nombre', 'p.marca', 'p.precio', 'p.descripcion', 'p.numero_referencia',
      'p.categoria_id', 'p.subcategoria_id', 'COALESCE((SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id), 0) as stock', 'p.activo', 'p.destacado', 'p.tiene_tallas',
      'p.fecha_creacion', 'c.nombre as categoria_nombre', 's.nombre as subcategoria_nombre',
      ...imageFields.map(f => `p.${f}`)
    ].join(', ');

    let query = `SELECT ${columns} FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id LEFT JOIN subcategorias s ON p.subcategoria_id = s.id`;
    
    const params = [];
    let conditions = [];

    if (nombre) {
      conditions.push('p.nombre LIKE ?');
      params.push(`%${nombre}%`);
    }
    // Check for non-empty string values before adding to query
    if (categoria_id && categoria_id !== '') {
      conditions.push('p.categoria_id = ?');
      params.push(categoria_id);
    }
    if (subcategoria_id && subcategoria_id !== '') {
      conditions.push('p.subcategoria_id = ?');
      params.push(subcategoria_id);
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

// GET /api/productos/destacados - Obtener productos destacados para el slider principal
router.get('/destacados', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, p.nombre, p.marca, p.precio,
        COALESCE(SUM(pt.stock), 0) as stock,
        c.nombre as categoria_nombre,
        p.imagen_3_4 as imagen_principal
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN producto_tallas pt ON p.id = pt.producto_id
      WHERE p.activo = TRUE AND p.destacado = TRUE
      GROUP BY p.id, p.nombre, p.marca, p.precio, c.nombre, p.imagen_3_4
      ORDER BY stock DESC
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

// GET /api/productos/recomendados - Obtener productos recomendados por categoría
router.get('/recomendados', async (req, res) => {
  try {
    const { categoriaId, excludeId, limit = 8 } = req.query;

    if (!categoriaId || !excludeId) {
      return res.status(400).json({ message: 'Los parámetros categoriaId y excludeId son obligatorios.' });
    }

    const query = `
      SELECT 
        p.id, p.nombre, p.marca, p.precio,
        (SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id) as stock,
        c.nombre as categoria_nombre,
        p.imagen_3_4 as imagen_principal
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = TRUE 
        AND p.categoria_id = ? 
        AND p.id != ?
      GROUP BY p.id
      HAVING stock > 0
      ORDER BY RAND()
      LIMIT ?
    `;
    
    const params = [
      parseInt(categoriaId, 10),
      parseInt(excludeId, 10),
      parseInt(limit, 10)
    ];

    const [rows] = await db.query(query, params);

    const formattedRows = rows.map(product => ({
      ...product,
      imagen_principal: product.imagen_principal ? formatImagePath(product.imagen_principal) : 'https://via.placeholder.com/300x300.png?text=Sin+Imagen'
    }));

    res.json(formattedRows);
  } catch (error) {
    logger.error('Error al obtener productos recomendados:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/productos/:id - Obtener un producto por su ID con todos sus detalles
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Obtener datos principales del producto
    const [productRows] = await db.query(`SELECT * FROM productos WHERE id = ?`, [id]);
    if (productRows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    const producto = productRows[0];

    // 2. Obtener tallas asociadas
    const [tallasRows] = await db.query('SELECT talla, stock FROM producto_tallas WHERE producto_id = ?', [id]);
    producto.tallas = tallasRows;

    // 3. Construir el array de imágenes a partir de las columnas del producto
    producto.imagenes = [];
    imageFields.forEach(field => {
      if (producto[field]) {
        // Crear un objeto de imagen para el frontend
        producto.imagenes.push({
          id: field, // Usamos el nombre del campo como ID único
          ruta_imagen: formatImagePath(producto[field]),
          label: getImageLabel(field) // Añadir la etiqueta legible
        });
      }
    });
    
    // También formatear las rutas de las imágenes en el objeto principal por si se usan directamente
    imageFields.forEach(field => {
        if (producto[field]) {
            producto[field] = formatImagePath(producto[field]);
        }
    });

    res.json(producto);

  } catch (error) {
    console.error(`Error al obtener el producto ${req.params.id}:`, error);
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
      SELECT p.*, (SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id) as stock
      FROM productos p
      JOIN categorias c ON p.categoria_id = c.id
      WHERE c.nombre = ? AND p.activo = TRUE
      ORDER BY stock DESC
      LIMIT ?`;

    const [rows] = await db.query(query, [categoria, parseInt(limit, 10)]);
    res.json(rows);
  } catch (error) {
    console.error(`Error al obtener top stock para ${categoria}:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


router.get('/categoria/:nombre', async (req, res) => {
  const { nombre } = req.params;
  try {
    let query = '';
    let params = [];

    if (nombre.toLowerCase() === 'macs') {
      query = `
        SELECT p.id, p.nombre, p.marca, p.precio, p.tiene_tallas, (SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id) as stock, c.nombre as categoria_nombre, p.imagen_3_4 as imagen_principal
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        WHERE p.marca = ? AND LOWER(c.nombre) NOT IN (?, ?) AND p.activo = TRUE
        ORDER BY p.fecha_creacion DESC
        LIMIT 10`;
      params.push('MACS', 'sombreros', 'importada');
    } else if (nombre.toLowerCase() === 'importada') {
      query = `
        SELECT p.id, p.nombre, p.marca, p.precio, p.tiene_tallas, (SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id) as stock, c.nombre as categoria_nombre, p.imagen_3_4 as imagen_principal
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        WHERE p.marca = ? AND LOWER(c.nombre) NOT IN (?, ?) AND p.activo = TRUE
        ORDER BY p.fecha_creacion DESC
        LIMIT 10`;
      params.push('IMPORTADA', 'sombreros', 'macs');
    } else {
      query = `
        SELECT p.id, p.nombre, p.marca, p.precio, p.tiene_tallas, (SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id) as stock, c.nombre as categoria_nombre, p.imagen_3_4 as imagen_principal
        FROM productos p
        JOIN categorias c ON p.categoria_id = c.id
        JOIN subcategorias s ON p.subcategoria_id = s.id
        WHERE LOWER(s.nombre) = ? AND p.activo = TRUE
        ORDER BY p.fecha_creacion DESC
        LIMIT 10`;
      params.push(nombre.toLowerCase());
    }

    const [rows] = await db.query(query, params);

    const productIdsConTallas = rows.filter(p => p.tiene_tallas).map(p => p.id);

    if (productIdsConTallas.length > 0) {
      const [tallasRows] = await db.query(
        `SELECT producto_id, talla, stock FROM producto_tallas WHERE producto_id IN (?) AND stock > 0 ORDER BY id`,
        [productIdsConTallas]
      );

      const tallasMap = tallasRows.reduce((acc, talla) => {
        if (!acc[talla.producto_id]) acc[talla.producto_id] = [];
        acc[talla.producto_id].push(talla);
        return acc;
      }, {});

      rows.forEach(product => {
        if (product.tiene_tallas) {
          product.tallas = tallasMap[product.id] || [];
        }
      });
    }

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
      SELECT p.id, p.nombre, p.marca, p.precio, (SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id) as stock, p.activo, ${imageFields.map(f => `p.${f}`).join(', ')}
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
router.post('/create', [auth, upload, processAndUploadImages], async (req, res) => {
  const { 
    nombre, marca, precio, descripcion, numero_referencia, 
    categoria_id, subcategoria_id, activo, destacado, tiene_tallas, tallas, stock
  } = req.body;

  if (!nombre || !precio || !categoria_id) {
    return res.status(400).json({ message: 'Los campos nombre, precio y categoría son obligatorios.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const precioNum = parseFloat(precio);
    const categoriaIdNum = parseInt(categoria_id, 10);
    const subcategoriaIdNum = subcategoria_id ? parseInt(subcategoria_id, 10) : null;

    if (subcategoriaIdNum) {
      const [subcatRows] = await connection.query('SELECT categoria_id FROM subcategorias WHERE id = ?', [subcategoriaIdNum]);
      if (subcatRows.length === 0 || subcatRows[0].categoria_id !== categoriaIdNum) {
        await connection.rollback();
        return res.status(400).json({ message: 'La subcategoría no pertenece a la categoría seleccionada.' });
      }
    }

    const images = {};
    imageFields.forEach(field => {
      // Usamos las URLs de Cloudinary que guardamos en el middleware
      images[field] = req.cloudinary_urls && req.cloudinary_urls[field] ? req.cloudinary_urls[field][0] : null;
    });
    
    const productoActivo = activo === 'true';
    const productoDestacado = destacado === 'true';
    const productoTieneTallas = tiene_tallas === 'true';

    const productoResult = await connection.query(
      `INSERT INTO productos (nombre, marca, precio, descripcion, numero_referencia, categoria_id, subcategoria_id, activo, destacado, tiene_tallas, ${imageFields.join(', ')}) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${imageFields.map(() => '?').join(', ')})`, 
      [
        nombre, marca, precioNum, descripcion, numero_referencia, 
        categoriaIdNum, subcategoriaIdNum, 
        productoActivo, 
        productoDestacado,
        productoTieneTallas,
        ...imageFields.map(field => images[field])
      ]
    );
    const productoId = productoResult[0].insertId;

    if (productoTieneTallas) {
      if (!tallas) {
        await connection.rollback();
        return res.status(400).json({ message: 'El campo tallas es obligatorio cuando se especifican tallas.' });
      }
      try {
        const tallasParsed = JSON.parse(tallas);
        if (!Array.isArray(tallasParsed) || tallasParsed.length === 0) {
          await connection.rollback();
          return res.status(400).json({ message: 'Debe especificar al menos una talla.' });
        }
        const tallasValues = tallasParsed.map(t => {
          const stockNum = parseInt(t.stock, 10);
          if (isNaN(stockNum) || !t.talla) {
            throw new Error('Formato de talla o stock inválido.');
          }
          return [productoId, t.talla, stockNum];
        });
        await connection.query('INSERT INTO producto_tallas (producto_id, talla, stock) VALUES ?', [tallasValues]);
      } catch (e) {
        await connection.rollback();
        console.error('Error al procesar tallas:', e);
        return res.status(400).json({ message: e.message || 'El formato de tallas es inválido.' });
      }
    } else {
      const stockNum = parseInt(stock, 10);
      if (stock === undefined || isNaN(stockNum)) {
        await connection.rollback();
        return res.status(400).json({ message: 'El campo de stock general es obligatorio y debe ser un número.' });
      }
      await connection.query('INSERT INTO producto_tallas (producto_id, talla, stock) VALUES (?, ?, ?)', [productoId, 'Única', stockNum]);
    }

    await connection.commit();

    const [productoRows] = await db.query('SELECT * FROM productos WHERE id = ?', [productoId]);
    res.status(201).json(productoRows[0]);

  } catch (error) {
    await connection.rollback();
    console.error('Error al crear el producto:', error);
    res.status(500).json({ message: `Error de base de datos: ${error.message}` });
  } finally {
    connection.release();
  }
});

// PUT /api/productos/update/:id - Actualizar un producto
router.put('/update/:id', [auth, upload, processAndUploadImages], async (req, res) => {
  const { id } = req.params;
  const { 
    nombre, marca, precio, descripcion, numero_referencia, 
    categoria_id, subcategoria_id, activo, destacado, tiene_tallas, tallas, stock
  } = req.body;

  if (!nombre || !precio || !categoria_id) {
    return res.status(400).json({ message: 'Los campos nombre, precio y categoría son obligatorios.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [currentProductRows] = await connection.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (currentProductRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    const currentProduct = currentProductRows[0];

    const precioNum = parseFloat(precio);
    const categoriaIdNum = parseInt(categoria_id, 10);
    const subcategoriaIdNum = subcategoria_id ? parseInt(subcategoria_id, 10) : null;

    if (subcategoriaIdNum) {
      const [subcatRows] = await connection.query('SELECT categoria_id FROM subcategorias WHERE id = ?', [subcategoriaIdNum]);
      if (subcatRows.length === 0 || subcatRows[0].categoria_id !== categoriaIdNum) {
        await connection.rollback();
        return res.status(400).json({ message: 'La subcategoría no pertenece a la categoría.' });
      }
    }

    const images = {};
    imageFields.forEach(field => {
            // La URL de la nueva imagen viene de Cloudinary
      const newImageUrl = req.cloudinary_urls && req.cloudinary_urls[field] ? req.cloudinary_urls[field][0] : null;
      const wasRemoved = req.body[`remove_${field}`] === 'true';

            if (wasRemoved) {
        // Opcional: podrías querer borrar la imagen de Cloudinary también
        // Por ahora, solo la quitamos de la base de datos
        images[field] = null;
      } else if (newImageUrl) {
        // Si se subió una nueva imagen, usamos su URL
        images[field] = newImageUrl;
        // Opcional: Borrar la imagen antigua de Cloudinary
      } else {
        images[field] = currentProduct[field];
      }
    });

    const productoActivo = activo === 'true';
    const productoDestacado = destacado === 'true';
    const productoTieneTallas = tiene_tallas === 'true';

    const updateQuery = `
      UPDATE productos SET 
        nombre = ?, marca = ?, precio = ?, descripcion = ?, numero_referencia = ?, 
        categoria_id = ?, subcategoria_id = ?, activo = ?, destacado = ?, tiene_tallas = ?, 
        ${imageFields.map(f => `${f} = ?`).join(', ')} 
      WHERE id = ?`;

    const params = [
      nombre, marca, precioNum, descripcion, numero_referencia, 
      categoriaIdNum, subcategoriaIdNum, 
      productoActivo, productoDestacado, productoTieneTallas,
      ...imageFields.map(field => images[field]),
      id
    ];

    await connection.query(updateQuery, params);

    await connection.query('DELETE FROM producto_tallas WHERE producto_id = ?', [id]);
    
    if (productoTieneTallas) {
      if (!tallas) {
        await connection.rollback();
        return res.status(400).json({ message: 'El campo tallas es obligatorio cuando se especifican tallas.' });
      }
      try {
        const tallasParsed = JSON.parse(tallas);
        if (!Array.isArray(tallasParsed) || tallasParsed.length === 0) {
          await connection.rollback();
          return res.status(400).json({ message: 'Debe especificar al menos una talla.' });
        }
        const tallasValues = tallasParsed.map(t => [id, t.talla, parseInt(t.stock, 10)]);
        await connection.query('INSERT INTO producto_tallas (producto_id, talla, stock) VALUES ?', [tallasValues]);
      } catch (e) {
        await connection.rollback();
        return res.status(400).json({ message: 'El formato de tallas es inválido.' });
      }
    } else {
      const stockNum = parseInt(stock, 10);
      if (stock === undefined || isNaN(stockNum)) {
        await connection.rollback();
        return res.status(400).json({ message: 'El campo de stock general es obligatorio y debe ser un número.' });
      }
      await connection.query('INSERT INTO producto_tallas (producto_id, talla, stock) VALUES (?, ?, ?)', [id, 'Única', stockNum]);
    }

    await connection.commit();

    const [productoRows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    res.status(200).json(productoRows[0]);

  } catch (error) {
    await connection.rollback();
    console.error(`Error al actualizar el producto ${id}:`, error);
    res.status(500).json({ message: `Error de base de datos: ${error.message}` });
  } finally {
    connection.release();
  }
});

// DELETE /api/productos/delete/:id - Eliminar un producto
router.delete('/delete/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    // Aunque la BD podría borrar en cascada, es buena práctica eliminar primero las imágenes.
    const [rows] = await db.query(`SELECT ${imageFields.join(', ')} FROM productos WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    const product = rows[0];

        // Ya no necesitamos borrar archivos locales, pero podríamos querer
    // borrar las imágenes de Cloudinary aquí para limpiar la cuenta.
    // Por ahora, lo dejamos así para simplicidad.

    // La FK en 'producto_tallas' con ON DELETE CASCADE se encargará de limpiar las tallas.
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

    // 2. Obtener las tallas y el stock del producto
    const tallasQuery = 'SELECT id, talla, stock FROM producto_tallas WHERE producto_id = ? ORDER BY talla';
    const [tallas] = await db.query(tallasQuery, [id]);

    // 3. Formatear las imágenes para que el frontend pueda identificarlas por su 'id' de campo
    const imagenes = [];
    imageFields.forEach(field => {
      if (producto[field]) {
        imagenes.push({
          id: field, // Usar el nombre del campo como ID
          ruta_imagen: formatImagePath(producto[field])
        });
      }
    });

    // 4. Construir el objeto de producto completo para la respuesta
    const productoCompleto = {
      ...producto,
      Imagenes: imagenes,
      Tallas: tallas // Usar las tallas obtenidas de la base de datos
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


// GET /api/productos/random - Obtener productos aleatorios para el slider de recomendaciones
router.get('/random', async (req, res) => {
  const { limit = 10, exclude = '0' } = req.query;

  try {
    const query = `
      SELECT p.id, p.nombre, p.marca, p.precio, (SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id) as stock, p.imagen_3_4
      FROM productos p
      WHERE p.id != ? AND p.activo = TRUE AND (SELECT SUM(pt.stock) FROM producto_tallas pt WHERE pt.producto_id = p.id) > 0
      ORDER BY RAND()
      LIMIT ?;
    `;
    
    const params = [
        parseInt(exclude, 10) || 0,
        parseInt(limit, 10)
    ];

    const [rows] = await db.query(query, params);

    const formattedRows = rows.map(product => ({
      ...product,
      imagen_3_4: product.imagen_3_4 ? formatImagePath(product.imagen_3_4) : null
    }));

    res.json(formattedRows);

  } catch (error) {
    logger.error(`Error al obtener productos aleatorios:`, error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para obtener imágenes de múltiples productos por ID, usado en la cesta
router.post('/get-images', async (req, res) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Se requiere un array de IDs de productos.' });
  }

  try {
    const query = `
      SELECT id, imagen_3_4
      FROM productos
      WHERE id IN (?)
    `;
    const [rows] = await db.query(query, [ids]);

    const imagesMap = rows.reduce((acc, row) => {
      acc[row.id] = row.imagen_3_4 ? formatImagePath(row.imagen_3_4) : null;
      return acc;
    }, {});

    res.json(imagesMap);
  } catch (error) {
    logger.error('Error al obtener imágenes de productos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/productos/:id/toggle-status - Cambiar el estado de activo/inactivo de un producto
router.put('/:id/toggle-status', auth, async (req, res) => {
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

    res.json({ message: `Producto ${activo ? 'activado' : 'desactivado'} correctamente.` });
  } catch (error) {
    logger.error(`Error al cambiar el estado del producto ${id}:`, error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});


// POST /api/productos/details-by-ids - Obtener detalles de múltiples productos por sus IDs
router.post('/details-by-ids', async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Se requiere un array de IDs de productos.' });
    }

    // Filtrar y validar que los IDs son números para prevenir inyección SQL
    const validIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    if (validIds.length === 0) {
        return res.status(400).json({ message: 'No se proporcionaron IDs válidos.' });
    }

    try {
        const query = `
            SELECT 
                p.*,
                pt.talla, 
                pt.stock AS stock_talla
            FROM productos p
            LEFT JOIN producto_tallas pt ON p.id = pt.producto_id
            WHERE p.id IN (?)
        `;
        const [rows] = await db.query(query, [validIds]);

        const productsMap = new Map();

        rows.forEach(row => {
            if (!productsMap.has(row.id)) {
                // Formatear las rutas de las imágenes al agregar el producto por primera vez
                const productWithFormattedImages = { ...row, tallas: [] };
                imageFields.forEach(field => {
                    if (row[field]) {
                        productWithFormattedImages[field] = formatImagePath(row[field]);
                    }
                });
                productsMap.set(row.id, productWithFormattedImages);
            }
            
            const product = productsMap.get(row.id);
            if (row.talla) {
                product.tallas.push({ talla: row.talla, stock: row.stock_talla });
            }
        });

        res.json(Array.from(productsMap.values()));

    } catch (error) {
        logger.error('Error al obtener detalles de productos por IDs:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
