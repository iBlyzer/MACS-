const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST para crear una nueva modificación de stock
router.post('/modificaciones', async (req, res) => {
    const { 
        responsable_modificacion, 
        autorizado_por, 
        ref_producto, 
        categoria, 
        subcategoria, 
        cantidad_cambio, 
        tipo_cambio, 
        stock_change_order_id, 
        descripcion_cambio 
    } = req.body;

        if (!ref_producto || !cantidad_cambio || !tipo_cambio) {
        return res.status(400).json({ message: 'Referencia, cantidad y tipo de cambio son requeridos.' });
    }

    // Validar que el ID de movimiento sea único si se proporciona
    if (stock_change_order_id) {
        try {
            const [existing] = await pool.query('SELECT 1 FROM modificaciones_stock WHERE stock_change_order_id = ? LIMIT 1', [stock_change_order_id]);
            if (existing.length > 0) {
                return res.status(409).json({ message: `El ID de Movimiento '${stock_change_order_id}' ya existe. Por favor, utilice un ID único.` });
            }
        } catch (error) {
            console.error('Error al validar el ID de movimiento:', error);
            return res.status(500).json({ message: 'Error interno del servidor al validar el ID.' });
        }
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Insertar el registro de la modificación de stock
        const insertModificationQuery = `
            INSERT INTO modificaciones_stock (responsable_modificacion, autorizado_por, ref_producto, categoria, subcategoria, cantidad_cambio, tipo_cambio, stock_change_order_id, descripcion_cambio)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.query(insertModificationQuery, [responsable_modificacion, autorizado_por, ref_producto, categoria, subcategoria, cantidad_cambio, tipo_cambio, stock_change_order_id, descripcion_cambio]);

        // 2. Actualizar el stock del producto en la tabla de productos
        const stockChange = tipo_cambio === 'Aumento' ? parseInt(cantidad_cambio, 10) : -parseInt(cantidad_cambio, 10);
        
        const updateStockQuery = `
            UPDATE productos 
            SET stock_total = stock_total + ? 
            WHERE numero_referencia = ?
        `;
        const [updateResult] = await connection.query(updateStockQuery, [stockChange, ref_producto]);

        if (updateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: `Producto con referencia '${ref_producto}' no encontrado.` });
        }

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
router.get('/modificaciones', async (req, res) => {
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

        const [rows] = await pool.query(query, params);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener el historial de modificaciones:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener el historial.', error: error.message });
    }
});

module.exports = router;
