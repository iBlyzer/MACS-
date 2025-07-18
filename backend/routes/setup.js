const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Ruta para crear la tabla de modificaciones de stock
router.get('/create-stock-table', async (req, res) => {
    try {
        const createTableQuery = `
        CREATE TABLE IF NOT EXISTS modificaciones_stock (
            id INT AUTO_INCREMENT PRIMARY KEY,
            responsable_modificacion VARCHAR(255) NOT NULL,
            autorizado_por VARCHAR(255) NOT NULL,
            ref_producto VARCHAR(255) NOT NULL,
            categoria VARCHAR(255),
            subcategoria VARCHAR(255),
            cantidad_cambio INT NOT NULL,
            tipo_cambio ENUM('Aumento', 'Disminución') NOT NULL,
            fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            stock_change_order_id VARCHAR(255) UNIQUE,
            descripcion_cambio TEXT
        );
        `;
        await pool.query(createTableQuery);
        res.status(200).send('Tabla \"modificaciones_stock\" creada exitosamente o ya existente.');
    } catch (error) {
        console.error('Error al crear la tabla de modificaciones de stock:', error);
        res.status(500).json({ message: 'Error en el servidor al crear la tabla.', error: error.message });
    }
});

module.exports = router;
