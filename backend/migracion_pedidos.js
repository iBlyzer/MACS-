const db = require('./config/db');

async function migratePedidos() {
    let connection;
    try {
        connection = await db.getConnection();
        console.log('✅ Conexión a la base de datos establecida para la migración de pedidos.');

        // Crear tabla de pedidos
        console.log("\n- Intentando crear la tabla 'pedidos'...");
        try {
            const createPedidosTableQuery = `
                CREATE TABLE pedidos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    numero_orden VARCHAR(255) NOT NULL UNIQUE,
                    fecha DATE NOT NULL,
                    cliente_nombre VARCHAR(255) NOT NULL,
                    cliente_id VARCHAR(50),
                    cliente_telefono VARCHAR(50),
                    cliente_direccion TEXT,
                    vendedor VARCHAR(255),
                    subtotal DECIMAL(10, 2) NOT NULL,
                    iva DECIMAL(10, 2) NOT NULL,
                    total DECIMAL(10, 2) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;
            await connection.query(createPedidosTableQuery);
            console.log("  ✔️ Tabla 'pedidos' creada.");
        } catch (e) {
            if (e.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log("  ⚠️ La tabla 'pedidos' ya existe. Se omite.");
            } else { throw e; }
        }

        // Crear tabla de productos del pedido
        console.log("\n- Intentando crear la tabla 'pedido_productos'...");
        try {
            const createPedidoProductosTableQuery = `
                CREATE TABLE pedido_productos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    pedido_id INT NOT NULL,
                    referencia VARCHAR(255),
                    nombre VARCHAR(255) NOT NULL,
                    cantidad INT NOT NULL,
                    valor_unitario DECIMAL(10, 2) NOT NULL,
                    valor_total DECIMAL(10, 2) NOT NULL,
                    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
                );
            `;
            await connection.query(createPedidoProductosTableQuery);
            console.log("  ✔️ Tabla 'pedido_productos' creada.");
        } catch (e) {
            if (e.code === 'ER_TABLE_EXISTS_ERROR') {
                console.log("  ⚠️ La tabla 'pedido_productos' ya existe. Se omite.");
            } else { throw e; }
        }

        console.log('\n\n🎉 ¡Migración de pedidos completada con éxito! 🎉');

    } catch (error) {
        console.error('\n\n❌ ¡ERROR DURANTE LA MIGRACIÓN DE PEDIDOS! ❌');
        console.error('Ocurrió un error:', error.message);
    } finally {
        if (connection) connection.release();
        db.end();
        console.log('\n🔌 Conexión a la base de datos cerrada.');
    }
}

migratePedidos();
