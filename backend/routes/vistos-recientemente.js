const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../config/logger');

// Helper para formatear la ruta de la imagen para el cliente
const formatImagePath = (dbPath) => {
    if (!dbPath) return null;
    // Asume que la ruta guardada en la BD es correcta y accesible desde el frontend
    return dbPath;
};

// GET /api/vistos-recientemente/productos
// Recibe una lista de IDs de productos como query param (ej: ?ids=1,2,3) y devuelve sus detalles.
router.get('/productos', async (req, res) => {
    const { ids } = req.query;

    if (!ids) {
        // Si no se envían IDs, no hay nada que devolver.
        return res.json([]);
    }

    // Los IDs vienen como un string separado por comas, lo convertimos a un array.
    const idList = ids.split(',');

    try {
        // Limpia los IDs para asegurarse de que son números y evitar inyección SQL
        const productIds = idList.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

        if (productIds.length === 0) {
            return res.json([]);
        }

        const query = `
            SELECT 
                p.id, 
                p.nombre, 
                p.precio, 
                p.imagen_3_4 as imagen_principal, 
                c.nombre as categoria_nombre,
                COALESCE(SUM(pt.stock), 0) as stock_total
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN producto_tallas pt ON p.id = pt.producto_id
            WHERE p.id IN (?) AND p.activo = 1
            GROUP BY p.id, p.nombre, p.precio, p.imagen_3_4, c.nombre;
        `;

        const [productos] = await db.query(query, [productIds]);

        const formattedProducts = productos.map(p => ({
            ...p,
            imagen_principal: formatImagePath(p.imagen_principal)
        }));

        res.json(formattedProducts);
    } catch (error) {
        logger.error('Error al obtener productos vistos recientemente:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

module.exports = router;
