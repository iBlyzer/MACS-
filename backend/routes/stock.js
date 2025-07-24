const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

console.log('--- [STOCK.JS] Archivo de rutas de stock cargado ---');

// GET /api/stock/lookup - Busca un producto y sus tallas
router.get('/lookup', auth, async (req, res) => {
    console.log('✅✅✅ --- RUTA /api/stock/lookup INVOCADA --- ✅✅✅');
    const { referencia, categoriaId, subcategoriaId } = req.query;
    console.log(`✅ Parámetros Recibidos: Ref=${referencia}, CatID=${categoriaId}, SubcatID=${subcategoriaId}`);

    if (!referencia || !categoriaId || !subcategoriaId) {
        console.log('❌ Error: Faltan parámetros requeridos.');
        return res.status(400).json({ message: 'Referencia, categoría y subcategoría son requeridas.' });
    }

    try {
        const query = `
            SELECT 
                p.id, 
                p.subcategoria_id, 
                p.tiene_tallas,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('talla', pt.talla, 'stock', pt.stock)) 
                 FROM producto_tallas pt WHERE pt.producto_id = p.id) as tallas
            FROM productos p
            WHERE p.numero_referencia = ? AND p.categoria_id = ? AND p.subcategoria_id = ?;
        `;
        
        console.log('✅ Ejecutando consulta SQL...');
        const [results] = await db.query(query, [referencia, categoriaId, subcategoriaId]);
        console.log(`✅ Consulta finalizada. Resultados: ${results.length}`);

        if (results.length === 0) {
            console.log('❌ Producto no encontrado en la base de datos.');
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const producto = results[0];
        console.log('✅ Producto encontrado. Enviando datos:', JSON.stringify(producto, null, 2));
        res.json(producto);

    } catch (error) {
        console.error('❌ ¡ERROR CRÍTICO EN LA RUTA /lookup!:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// POST para crear una nueva modificación de stock
router.post('/modificaciones', auth, async (req, res) => {
    const { 
        responsable_modificacion, 
        autorizado_por, 
        ref_producto, 
        categoria, 
        subcategoria, 
        cantidad_cambio, 
        tipo_cambio, 
        stock_change_order_id, 
        descripcion_cambio,
        talla // Se espera la talla desde el frontend
    } = req.body;

    if (!ref_producto || !cantidad_cambio || !tipo_cambio) {
        return res.status(400).json({ message: 'Referencia, cantidad y tipo de cambio son requeridos.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [productoRows] = await connection.query('SELECT id, tiene_tallas FROM productos WHERE numero_referencia = ?', [ref_producto]);
        if (productoRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `Producto con referencia '${ref_producto}' no encontrado.` });
        }
        const producto = productoRows[0];

        let tallaParaActualizar = talla;
        if (!producto.tiene_tallas) {
            tallaParaActualizar = 'OS'; // Talla única para productos sin tallas
        } else if (!talla) {
            await connection.rollback();
            return res.status(400).json({ message: 'Se requiere una talla para este producto.' });
        }

        // 1. Insertar el registro de la modificación de stock
        const insertModificationQuery = `
            INSERT INTO modificaciones_stock (responsable_modificacion, autorizado_por, ref_producto, categoria, subcategoria, cantidad_cambio, tipo_cambio, talla, stock_change_order_id, descripcion_cambio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(insertModificationQuery, [responsable_modificacion, autorizado_por, ref_producto, categoria, subcategoria, cantidad_cambio, tipo_cambio, tallaParaActualizar, stock_change_order_id, descripcion_cambio]);

        // 2. Actualizar el stock en la tabla 'producto_tallas'
        const stockChange = tipo_cambio === 'Aumento' ? parseInt(cantidad_cambio, 10) : -parseInt(cantidad_cambio, 10);

        const updateStockQuery = `
            INSERT INTO producto_tallas (producto_id, talla, stock)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE stock = stock + ?;
        `;
        
        await connection.query(updateStockQuery, [producto.id, tallaParaActualizar, stockChange, stockChange]);

        await connection.commit();
        res.status(201).json({ message: 'Modificación de stock registrada y stock de producto actualizado exitosamente' });

    } catch (error) {
        await connection.rollback();
        console.error('Error en la transacción de modificación de stock:', error);
        res.status(500).json({ message: 'Error interno del servidor al procesar la modificación.' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// GET para obtener el historial de modificaciones de stock con filtros
router.get('/modificaciones', auth, async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, ref_producto, responsable, orden_id } = req.query;

        let query = 'SELECT * FROM modificaciones_stock WHERE 1=1';
        const params = [];

        if (fecha_inicio) {
            query += ' AND DATE(fecha_modificacion) >= ?';
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            query += ' AND DATE(fecha_modificacion) <= ?';
            params.push(fecha_fin);
        }
        if (ref_producto) {
            query += ' AND ref_producto LIKE ?';
            params.push(`%${ref_producto}%`);
        }
        if (responsable) {
            query += ' AND responsable_modificacion LIKE ?';
            params.push(`%${responsable}%`);
        }
        if (orden_id) {
            query += ' AND stock_change_order_id LIKE ?';
            params.push(`%${orden_id}%`);
        }

        query += ' ORDER BY fecha_modificacion DESC, id DESC';

        const [rows] = await db.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener el historial de modificaciones:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener el historial.', error: error.message });
    }
});

module.exports = router;
