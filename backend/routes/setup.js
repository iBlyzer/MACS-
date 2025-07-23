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

// Ruta para configurar la tabla de tareas
router.get('/setup-tareas', async (req, res) => {
    const dbName = process.env.DB_NAME || 'macs_productos';

    const columnExists = async (tableName, columnName) => {
        const [columns] = await pool.query(`
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = ? AND table_name = ? AND column_name = ?
        `, [dbName, tableName, columnName]);
        return columns.length > 0;
    };

    try {
        let messages = [];

        // Verificar y añadir 'pedido_id'
        if (!await columnExists('tareas', 'pedido_id')) {
            await pool.query('ALTER TABLE tareas ADD COLUMN pedido_id INT NULL AFTER pedido_producto_id;');
            messages.push('Columna "pedido_id" añadida.');
        } else {
            messages.push('Columna "pedido_id" ya existe.');
        }

        // Verificar y añadir 'fecha_creacion'
        if (!await columnExists('tareas', 'fecha_creacion')) {
            await pool.query('ALTER TABLE tareas ADD COLUMN fecha_creacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER descripcion;');
            messages.push('Columna "fecha_creacion" añadida.');
        } else {
            messages.push('Columna "fecha_creacion" ya existe.');
        }

        res.status(200).json({ message: 'Configuración de la tabla de tareas completada.', details: messages });

    } catch (error) {
        console.error('Error al configurar la tabla de tareas:', error);
        res.status(500).json({ message: 'Error en el servidor al configurar la tabla.', error: error.message });
    }
});

module.exports = router;
