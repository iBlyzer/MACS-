const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../config/logger');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const auth = require('../middleware/authMiddleware');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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

// Helper para obtener etiquetas legibles para los campos de imagen
const getImageLabel = (fieldName) => {
    const labels = {
        'imagen_3_4': 'Principal',
        'imagen_frontal': 'Frontal',
        'imagen_lateral': 'Lateral',
        'imagen_trasera': 'Trasera',
        'imagen_superior': 'Superior',
        'imagen_inferior': 'Inferior'
    };
    return labels[fieldName] || 'Vista';
};

// Configuración de Multer para la subida de archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).fields(
    imageFields.map(field => ({ name: field, maxCount: 1 }))
);

// Middleware para procesar y subir imágenes a Cloudinary
const processAndUploadImages = async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return next();
    }

    req.cloudinary_image_paths = {};

    try {
        const uploadPromises = [];
        for (const field in req.files) {
            for (const file of req.files[field]) {
                const promise = new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'productos',
                            public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
                            resource_type: 'image'
                        },
                        (error, result) => {
                            if (error) {
                                logger.error('Error al subir imagen a Cloudinary:', error);
                                return reject(error);
                            }
                            req.cloudinary_image_paths[field] = result.secure_url;
                            resolve();
                        }
                    );
                    uploadStream.end(file.buffer);
                });
                uploadPromises.push(promise);
            }
        }
        await Promise.all(uploadPromises);
        next();
    } catch (error) {
        logger.error('Error procesando o subiendo imágenes a Cloudinary:', error);
        next(error);
    }
};

// Helper para extraer el public_id de una URL de Cloudinary
const getPublicIdFromUrl = (url) => {
    try {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        const public_id = `productos/${path.parse(filename).name}`;
        return public_id;
    } catch (error) {
        logger.error(`No se pudo extraer el public_id de la URL: ${url}`, error);
        return null;
    }
};

// GET /api/productos/admin - Obtener todos los productos para el panel de administración
router.get('/admin', auth, async (req, res) => {
    try {
        const { nombre, referencia, marca, categoria_id, subcategoria_id, stock, activo } = req.query;
        const columns = [
            'p.id', 'p.nombre', 'p.marca', 'p.precio', 'p.descripcion', 'p.numero_referencia',
            'p.categoria_id', 'p.subcategoria_id', 'p.activo', 'p.destacado', 'p.tiene_tallas',
            'p.fecha_creacion', 'c.nombre as categoria_nombre', 's.nombre as subcategoria_nombre',
            'COALESCE(SUM(pt.stock), 0) as stock_total',
            ...imageFields.map(f => `p.${f}`)
        ].join(', ');

        let query = `SELECT ${columns} FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id LEFT JOIN subcategorias s ON p.subcategoria_id = s.id LEFT JOIN producto_tallas pt ON p.id = pt.producto_id`;
        
        const params = [];
        let conditions = [];
        let havingConditions = [];

        if (nombre) { conditions.push('p.nombre LIKE ?'); params.push(`%${nombre}%`); }
        if (referencia) { conditions.push('p.numero_referencia LIKE ?'); params.push(`%${referencia}%`); }
        if (marca) { conditions.push('p.marca LIKE ?'); params.push(`%${marca}%`); }
        if (categoria_id) { conditions.push('p.categoria_id = ?'); params.push(categoria_id); }
        if (subcategoria_id) { conditions.push('p.subcategoria_id = ?'); params.push(subcategoria_id); }
        if (activo) { conditions.push('p.activo = ?'); params.push(activo === 'true'); }
        if (stock) { havingConditions.push(stock === 'in' ? 'stock_total > 0' : 'stock_total = 0'); }

        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' GROUP BY p.id';
        if (havingConditions.length > 0) query += ' HAVING ' + havingConditions.join(' AND ');
        query += ' ORDER BY p.marca ASC, c.nombre ASC, s.nombre ASC, p.numero_referencia ASC';

        const [rows] = await db.query(query, params);

        res.json(rows);
    } catch (error) {
        logger.error('Error al obtener todos los productos para admin:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/productos/destacados - Obtener productos destacados para el frontend
router.get('/destacados', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, p.nombre, p.precio, p.imagen_3_4 as imagen_principal, c.nombre as categoria_nombre,
                COALESCE(SUM(pt.stock), 0) as stock_total
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN producto_tallas pt ON p.id = pt.producto_id
            WHERE p.destacado = 1 AND p.activo = 1
            GROUP BY p.id
            ORDER BY p.fecha_creacion DESC
            LIMIT 12;
        `;
        const [productos] = await db.query(query);

        res.json(productos);
    } catch (error) {
        logger.error('Error al obtener productos destacados:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/productos/categoria/:nombreCategoria - Obtener productos por nombre de categoría y opcionalmente subcategoría
router.get('/categoria/:nombreCategoria', async (req, res) => {
    try {
        const { nombreCategoria } = req.params;
        const { subcategoria: nombreSubcategoria } = req.query;

        let query = `
            SELECT 
                p.id, p.nombre, p.numero_referencia, p.precio, p.imagen_3_4 as imagen_principal, 
                c.nombre as categoria_nombre,
                s.nombre as subcategoria_nombre,
                COALESCE(SUM(pt.stock), 0) as stock_total
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN subcategorias s ON p.subcategoria_id = s.id
            LEFT JOIN producto_tallas pt ON p.id = pt.producto_id
        `;

        const conditions = ['p.activo = 1', 'c.nombre = ?'];
        const params = [nombreCategoria];

        if (nombreSubcategoria) {
            conditions.push('s.nombre = ?');
            params.push(nombreSubcategoria);
        }

        query += ' WHERE ' + conditions.join(' AND ');
        query += ` GROUP BY p.id, p.nombre, p.numero_referencia, p.precio, p.imagen_3_4, c.nombre, s.nombre ORDER BY CAST(SUBSTRING(p.numero_referencia, 2) AS UNSIGNED) ASC;`;

        const [productos] = await db.query(query, params);

        if (productos.length === 0) {
            return res.json([]);
        }
        
        res.json(productos);
    } catch (error) {
        logger.error(`Error al obtener productos para la categoría ${req.params.nombreCategoria}:`, error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/productos/recomendados - Obtener productos recomendados
router.get('/recomendados', async (req, res) => {
    try {
        const { categoriaId, excludeId } = req.query;
        if (!categoriaId || !excludeId) {
            return res.status(400).json({ message: 'Faltan parámetros para obtener recomendaciones.' });
        }

        const query = `
            SELECT 
                p.id, p.nombre, p.precio, p.imagen_3_4 as imagen_principal
            FROM productos p
            WHERE p.categoria_id = ? AND p.id != ? AND p.activo = 1
            ORDER BY RAND()
            LIMIT 4;
        `;

        const [productos] = await db.query(query, [categoriaId, excludeId]);
        res.json(productos);
    } catch (error) {
        logger.error('Error al obtener productos recomendados:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/productos/details-by-ids - Obtener detalles de múltiples productos por sus IDs
router.get('/details-by-ids', async (req, res) => {
    try {
        const { ids } = req.query;
        if (!ids) {
            return res.status(400).json({ message: 'No se proporcionaron IDs de productos.' });
        }

        const productIds = ids.split(',').map(id => parseInt(id.trim(), 10));
        if (productIds.some(isNaN)) {
            return res.status(400).json({ message: 'La lista de IDs contiene valores no válidos.' });
        }

        if (productIds.length === 0) {
            return res.json([]);
        }

        const query = `
            SELECT 
                p.id, p.nombre, p.precio, p.imagen_3_4 as imagen_principal, 
                c.nombre as categoria_nombre,
                s.nombre as subcategoria_nombre,
                COALESCE(SUM(pt.stock), 0) as stock_total
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN subcategorias s ON p.subcategoria_id = s.id
            LEFT JOIN producto_tallas pt ON p.id = pt.producto_id
            WHERE p.id IN (?)
            GROUP BY p.id
        `;

        const [productos] = await db.query(query, [productIds]);

        const [tallas] = await db.query('SELECT producto_id, talla, stock FROM producto_tallas WHERE producto_id IN (?)', [productIds]);

        const tallasMap = tallas.reduce((acc, talla) => {
            if (!acc[talla.producto_id]) {
                acc[talla.producto_id] = [];
            }
            acc[talla.producto_id].push(talla);
            return acc;
        }, {});

        const detailedProducts = productos.map(p => ({
            ...p,
            tallas: tallasMap[p.id] || []
        }));

        res.json(detailedProducts);
    } catch (error) {
        logger.error('Error al obtener detalles de productos por IDs:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// GET /api/productos/:id - Obtener un producto por su ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT p.*, c.id as categoria_id, c.nombre as categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.id = ?
        `;
        const [productRows] = await db.query(query, [id]);
        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        const producto = productRows[0];

        const [tallasRows] = await db.query('SELECT talla, stock FROM producto_tallas WHERE producto_id = ?', [id]);
        producto.tallas = tallasRows;

        producto.imagenes = [];
        imageFields.forEach(field => {
            if (producto[field]) {
                producto.imagenes.push({
                    id: field,
                    ruta_imagen: producto[field],
                    label: getImageLabel(field)
                });
            }
        });

        res.json(producto);
    } catch (error) {
        logger.error(`Error al obtener el producto ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST /api/productos/create - Crear un nuevo producto
router.post('/create', [auth, upload, processAndUploadImages], async (req, res) => {
    const { numero_referencia, nombre, marca, precio, descripcion, categoria_id, subcategoria_id, activo, destacado, tiene_tallas, tallas } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();
        if (numero_referencia) {
            const [exists] = await connection.query('SELECT id FROM productos WHERE numero_referencia = ? AND categoria_id = ?', [numero_referencia, categoria_id]);
            if (exists.length > 0) {
                await connection.rollback();
                return res.status(409).json({ message: `La referencia "${numero_referencia}" ya está en uso.` });
            }
        }

        const imagePaths = req.cloudinary_image_paths || {};
        const productoData = {
            nombre, marca, precio, descripcion, numero_referencia, categoria_id,
            subcategoria_id: subcategoria_id || null, activo: activo === 'true',
            destacado: destacado === 'true', tiene_tallas: tiene_tallas === 'true',
            ...imagePaths
        };

        const [result] = await connection.query('INSERT INTO productos SET ?', productoData);
        const productoId = result.insertId;

        if (productoData.tiene_tallas && tallas) {
            const tallasArray = JSON.parse(tallas);
            if (Array.isArray(tallasArray) && tallasArray.length > 0) {
                const tallasValues = tallasArray.map(t => [productoId, t.talla, t.stock]);
                await connection.query('INSERT INTO producto_tallas (producto_id, talla, stock) VALUES ?', [tallasValues]);
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Producto creado con éxito', id: productoId });
    } catch (error) {
        await connection.rollback();
        logger.error('Error al crear el producto:', error);
        res.status(500).json({ message: `Error de base de datos: ${error.message}` });
    } finally {
        connection.release();
    }
});

// PUT /api/productos/update/:id - Actualizar un producto existente
router.put('/update/:id', [auth, upload, processAndUploadImages], async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // --- 1. Lógica para eliminar imágenes de Cloudinary --- 
        const imageFieldsToDelete = imageFields.filter(field => req.body[`remove_${field}`] === 'true');
        if (imageFieldsToDelete.length > 0) {
            const [currentProductRows] = await connection.query('SELECT ?? FROM productos WHERE id = ?', [imageFieldsToDelete, id]);
            if (currentProductRows.length > 0) {
                const currentProduct = currentProductRows[0];
                for (const field of imageFieldsToDelete) {
                    const imageUrl = currentProduct[field];
                    if (imageUrl) {
                        const publicId = getPublicIdFromUrl(imageUrl);
                        if (publicId) {
                            await cloudinary.uploader.destroy(publicId);
                            logger.info(`Imagen eliminada de Cloudinary: ${publicId}`);
                        }
                    }
                }
            }
            const nullUpdates = imageFieldsToDelete.map(field => `${field} = NULL`).join(', ');
            await connection.query(`UPDATE productos SET ${nullUpdates} WHERE id = ?`, [id]);
        }

        // --- 2. Actualizar datos del producto --- 
        const { nombre, marca, precio, descripcion, numero_referencia, categoria_id, subcategoria_id, activo, destacado, tiene_tallas, tallas } = req.body;
        
        const productData = {
            nombre,
            marca,
            precio,
            descripcion,
            numero_referencia,
            categoria_id,
            subcategoria_id,
            activo: activo === 'true' || activo === true,
            destacado: destacado === 'true' || destacado === true,
            tiene_tallas: tiene_tallas === 'true' || tiene_tallas === true,
            ...req.cloudinary_image_paths
        };

        Object.keys(productData).forEach(key => productData[key] === undefined && delete productData[key]);

        if (Object.keys(productData).length > 0) {
            await connection.query('UPDATE productos SET ? WHERE id = ?', [productData, id]);
        }

        // --- 3. Manejar tallas y stock --- 
        if (productData.tiene_tallas) {
            await connection.query('DELETE FROM producto_tallas WHERE producto_id = ?', [id]);
            if (tallas && typeof tallas === 'string') {
                try {
                    const tallasArray = JSON.parse(tallas);
                    if (Array.isArray(tallasArray) && tallasArray.length > 0) {
                        const tallasValues = tallasArray.map(t => [id, t.talla, t.stock]);
                        await connection.query('INSERT INTO producto_tallas (producto_id, talla, stock) VALUES ?', [tallasValues]);
                    }
                } catch (jsonError) {
                    logger.error('Error al parsear JSON de tallas:', jsonError);
                }
            }
        } else {
            await connection.query('DELETE FROM producto_tallas WHERE producto_id = ?', [id]);
        }

        await connection.commit();
        res.status(200).json({ message: 'Producto actualizado con éxito' });

    } catch (error) {
        await connection.rollback();
        logger.error(`Error al actualizar el producto ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el producto.' });
    } finally {
        if (connection) connection.release();
    }
});

// PUT /api/productos/:id/toggle-status - Activar/Desactivar un producto
router.put('/:id/toggle-status', auth, async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [rows] = await connection.query('SELECT numero_referencia FROM productos WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const { numero_referencia } = rows[0];
        let nueva_referencia = numero_referencia;

        if (activo === false) {
            if (!numero_referencia.startsWith('OFF-')) {
                nueva_referencia = `OFF-${numero_referencia}`;
            }
        } else {
            if (numero_referencia.startsWith('OFF-')) {
                const refOriginal = numero_referencia.substring(4);
                const [exists] = await connection.query('SELECT id FROM productos WHERE numero_referencia = ? AND id != ?', [refOriginal, id]);
                if (exists.length > 0) {
                    await connection.rollback();
                    return res.status(409).json({ message: `No se puede reactivar con la referencia original '${refOriginal}' porque ya está en uso.` });
                }
                nueva_referencia = refOriginal;
            }
        }

        await connection.query('UPDATE productos SET activo = ?, numero_referencia = ? WHERE id = ?', [activo, nueva_referencia, id]);
        await connection.commit();
        res.status(200).json({ message: 'Estado del producto actualizado', nueva_referencia });
    } catch (error) {
        await connection.rollback();
        logger.error(`Error al cambiar estado del producto ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        connection.release();
    }
});

// DELETE /api/productos/delete/:id - Eliminar un producto
router.delete('/delete/:id', auth, async (req, res) => {
    const { id } = req.params;
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [productRows] = await connection.query(`SELECT ${imageFields.join(', ')} FROM productos WHERE id = ?`, [id]);
        if (productRows.length > 0) {
            const product = productRows[0];
            for (const field of imageFields) {
                if (product[field]) {
                    const publicId = getPublicIdFromUrl(product[field]);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
                        logger.info(`Imagen eliminada de Cloudinary: ${publicId}`);
                    }
                }
            }
        }

        await connection.query('DELETE FROM producto_tallas WHERE producto_id = ?', [id]);
        const [deleteResult] = await connection.query('DELETE FROM productos WHERE id = ?', [id]);

        if (deleteResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'El producto no fue encontrado para eliminar.' });
        }

        await connection.commit();
        res.status(200).json({ message: 'Producto y sus imágenes han sido eliminados correctamente' });
    } catch (error) {
        if (connection) await connection.rollback();
        logger.error(`Error al eliminar el producto ${id}:`, error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el producto.' });
    } finally {
        if(connection) connection.release();
    }
});

router.get('/detalles-para-stock', auth, async (req, res) => {
    console.log('--- [DEBUG] RUTA /detalles-para-stock INVOCADA ---');
    const { referencia, categoriaId } = req.query;
    console.log(`--- [DEBUG] Parámetros recibidos: Referencia=${referencia}, CategoriaID=${categoriaId}`);

    if (!referencia || !categoriaId) {
        console.log('--- [DEBUG] ERROR: Parámetros incompletos.');
        return res.status(400).json({ message: 'Referencia y categoría son requeridas.' });
    }

    try {
        const query = `
            SELECT 
                p.id, 
                p.subcategoria_id, 
                p.tiene_tallas,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('talla', pt.talla, 'stock', pt.stock)) 
                 FROM producto_tallas pt 
                 WHERE pt.producto_id = p.id) as tallas
            FROM productos p
            WHERE p.numero_referencia = ? AND p.categoria_id = ?;
        `;
        
        console.log('--- [DEBUG] Ejecutando consulta SQL...');
        const [results] = await db.query(query, [referencia, categoriaId]);
        console.log(`--- [DEBUG] Consulta SQL finalizada. Resultados: ${results.length}`);

        if (results.length === 0) {
            console.log('--- [DEBUG] Producto no encontrado en la base de datos.');
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const producto = results[0];
        console.log('--- [DEBUG] Producto encontrado. Enviando datos:', JSON.stringify(producto, null, 2));
        res.json(producto);

    } catch (error) {
        console.error('--- [DEBUG] ¡ERROR CRÍTICO EN LA RUTA!:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// NUEVA RUTA DE VERIFICACIÓN PARA EVITAR PROBLEMAS DE CACHÉ
router.get('/verify-product-details', auth, async (req, res) => {
    console.log('✅✅✅ --- RUTA /verify-product-details INVOCADA --- ✅✅✅');
    const { referencia, categoriaId } = req.query;
    console.log(`✅✅✅ Parámetros: Referencia=${referencia}, CategoriaID=${categoriaId}`);

    try {
        const query = `
            SELECT 
                p.id, p.subcategoria_id, p.tiene_tallas,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('talla', pt.talla, 'stock', pt.stock)) 
                 FROM producto_tallas pt WHERE pt.producto_id = p.id) as tallas
            FROM productos p
            WHERE p.numero_referencia = ? AND p.categoria_id = ?;
        `;
        
        console.log('✅✅✅ Ejecutando consulta...');
        const [results] = await db.query(query, [referencia, categoriaId]);
        console.log(`✅✅✅ Consulta finalizada. Resultados: ${results.length}`);

        if (results.length === 0) {
            console.log('❌❌❌ Producto no encontrado en BD.');
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const producto = results[0];
        console.log('✅✅✅ Producto encontrado. Enviando:', JSON.stringify(producto, null, 2));
        res.json(producto);

    } catch (error) {
        console.error('❌❌❌ ¡ERROR CRÍTICO EN LA NUEVA RUTA!:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
