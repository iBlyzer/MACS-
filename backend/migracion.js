const db = require('./config/db');

async function migrateDatabase() {
    let connection;
    try {
        connection = await db.getConnection();
        console.log('✅ Conexión a la base de datos establecida.');

        console.log("\n- Intentando añadir la columna 'tiene_tallas'...");
        try {
            await connection.query('ALTER TABLE productos ADD COLUMN tiene_tallas BOOLEAN NOT NULL DEFAULT FALSE;');
            console.log('  ✔️ Columna "tiene_tallas" añadida.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('  ⚠️ La columna "tiene_tallas" ya existe. Se omite.');
            } else { throw e; }
        }

        console.log("\n- Intentando crear la tabla 'producto_tallas'...");
        try {
            const createTableQuery = `
                CREATE TABLE producto_tallas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    producto_id INT NOT NULL,
                    talla VARCHAR(50) NOT NULL,
                    stock INT NOT NULL DEFAULT 0,
                    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
                );
            `;
            await connection.query(createTableQuery);
            console.log('  ✔️ Tabla "producto_tallas" creada.');
        } catch (e) {
            if (e.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log('  ⚠️ La tabla "producto_tallas" ya existe. Se omite.');
            } else { throw e; }
        }

        const [columns] = await connection.query(`SHOW COLUMNS FROM productos LIKE 'stock';`);
        if (columns.length > 0) {
            console.log("\n- Migrando stock existente a la nueva tabla...");
            const migrateStockQuery = `INSERT INTO producto_tallas (producto_id, talla, stock) SELECT id, 'Única', stock FROM productos WHERE stock IS NOT NULL;`;
            await connection.query(migrateStockQuery);
            console.log('  ✔️ Stock existente migrado.');

            console.log("\n- Eliminando la antigua columna 'stock'...");
            await connection.query('ALTER TABLE productos DROP COLUMN stock;');
            console.log('  ✔️ Columna "stock" eliminada.');
        } else {
            console.log("\n- La columna 'stock' no existe, no se requiere migración.");
        }

        console.log('\n\n🎉 ¡Migración de la base de datos completada con éxito! 🎉');

    } catch (error) {
        console.error('\n\n❌ ¡ERROR DURANTE LA MIGRACIÓN! ❌');
        console.error('Ocurrió un error:', error.message);
    } finally {
        if (connection) connection.release();
        db.end();
        console.log('\n🔌 Conexión a la base de datos cerrada.');
    }
}

migrateDatabase();
