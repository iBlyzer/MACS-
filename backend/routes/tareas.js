const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET para obtener todas las tareas con filtros
router.get('/', async (req, res) => {
    try {
        const { area, estado, numero_orden, fecha_inicio, fecha_fin } = req.query;

        let query = `
            SELECT 
                pp.id, 
                p.numero_orden, 
                p.cliente_nombre, 
                pp.nombre as producto_nombre, 
                pp.cantidad, 
                p.fecha as fecha_creacion, 
                pp.estado_tarea
            FROM pedido_productos pp
            JOIN pedidos p ON pp.pedido_id = p.id
            WHERE 1=1
        `;
        
        const params = [];

        if (area) {
            query += ' AND pp.area_asignada = ?';
            params.push(area);
        }

        if (estado) {
            query += ' AND pp.estado_tarea = ?';
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

        query += ' ORDER BY p.fecha DESC, pp.id DESC';

        const [tareas] = await pool.query(query, params);
        res.json(tareas);

    } catch (error) {
        console.error('Error al obtener las tareas:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener las tareas.', error: error.message });
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
            'UPDATE pedido_productos SET estado_tarea = ? WHERE id = ?',
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
