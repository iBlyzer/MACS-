// backend/scripts/create_tallas_table.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');

const createTallasTable = async () => {
  console.log('Iniciando la creación de la tabla `producto_tallas`...');
  let connection;
  try {
    connection = await db.getConnection();
    console.log('Conexión a la base de datos establecida.');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS producto_tallas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        producto_id INT NOT NULL,
        talla VARCHAR(50) NOT NULL,
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
      );
    `;

    console.log('Ejecutando la consulta para crear la tabla...');
    await connection.query(createTableQuery);
    console.log('¡Tabla `producto_tallas` creada o ya existente!');

  } catch (error) {
    console.error('Error durante la creación de la tabla:', error);
  } finally {
    if (connection) {
      connection.release();
      console.log('Conexión liberada.');
    }
    await db.end();
    console.log('Piscina de conexiones cerrada.');
  }
};

createTallasTable();
