const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET para obtener todas las tareas con filtros
router.get('/', async (req, res) => {
    try {
        const { area, estado, numero_orden, fecha_inicio, fecha_fin } = req.query;

        let query = `
            SELECT
                t.id,
                p.numero_orden,
                p.cliente_nombre,
                p.total,
                t.area,
                p.fecha as fecha_creacion
            FROM tareas t
            JOIN pedido_productos pp ON t.pedido_producto_id = pp.id
            JOIN pedidos p ON pp.pedido_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (area) {
            query += ' AND t.area = ?';
            params.push(area);
        } else {
             query += " AND t.area IN ('Bordado', 'Parche', 'Textil')";
        }

        if (estado) {
            query += ' AND t.estado = ?';
            params.push(estado);
        }

        if (numero_orden) {
            query += ' AND p.numero_orden LIKE ?';
            params.push(`%${numero_orden}%`);
        }

        if (fecha_inicio) {
            query += ' AND DATE(p.fecha) >= ?';
            params.push(fecha_inicio);
        }

        if (fecha_fin) {
            query += ' AND DATE(p.fecha) <= ?';
            params.push(fecha_fin);
        }

        query += ' ORDER BY p.fecha DESC, t.id DESC';

        const [tareas] = await pool.query(query, params);
        res.json(tareas);

    } catch (error) {
        console.error('Error al obtener las tareas:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener las tareas.', error: error.message });
    }
});

// GET para obtener los detalles de una tarea específica
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT
                t.id,
                p.numero_orden,
                p.cliente_nombre,
                pp.nombre as producto_nombre,
                pp.referencia as producto_referencia,
                pp.cantidad,
                t.descripcion,
                t.estado,
                t.area,
                p.fecha as fecha_creacion,
                prod.imagen_frontal as imagen_url
            FROM tareas t
            JOIN pedido_productos pp ON t.pedido_producto_id = pp.id
            JOIN pedidos p ON pp.pedido_id = p.id
            LEFT JOIN productos prod ON pp.referencia = prod.numero_referencia
            WHERE t.id = ?
        `;
        const [tareas] = await pool.query(query, [id]);

        if (tareas.length === 0) {
            return res.status(404).json({ message: 'Tarea no encontrada.' });
        }

        res.json(tareas[0]);

    } catch (error) {
        console.error(`Error al obtener la tarea ${id}:`, error);
        res.status(500).json({ message: 'Error en el servidor al obtener la tarea.', error: error.message });
    }
});

// PUT para actualizar el estado de una tarea
router.put('/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
        return res.status(400).json({ message: 'El nuevo estado es requerido.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE tareas SET estado = ? WHERE id = ?',
            [estado, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tarea no encontrada.' });
        }

        res.json({ message: 'Estado de la tarea actualizado exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar el estado de la tarea:', error);
        res.status(500).json({ message: 'Error en el servidor al actualizar el estado.', error: error.message });
    }
});

module.exports = router;
