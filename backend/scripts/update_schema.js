// backend/scripts/update_schema.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../config/db');

const addColumnIfNotExists = async (connection, tableName, columnName, columnDefinition) => {
  try {
    console.log(`Verificando si la columna "${columnName}" existe en la tabla "${tableName}"...`);
    const [rows] = await connection.query(
      `SHOW COLUMNS FROM ${tableName} LIKE ?`,
      [columnName]
    );

    if (rows.length === 0) {
      console.log(`La columna "${columnName}" no existe. Agregándola...`);
      await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
      console.log(`Columna "${columnName}" agregada correctamente.`);
    } else {
      console.log(`La columna "${columnName}" ya existe.`);
    }
  } catch (error) {
    // Rethrow the error to be caught by the main try-catch block
    throw new Error(`Error al procesar la columna "${columnName}": ${error.message}`);
  }
};


const updateSchema = async () => {
  console.log('Iniciando la actualización del esquema de la base de datos...');
  let connection;
  try {
    connection = await db.getConnection();
    console.log('Conexión a la base de datos establecida.');

    const tableName = 'productos';
    const columnsToAdd = [
      { name: 'imagen_icono', definition: 'VARCHAR(500) NULL' },
      { name: 'imagen_frontal', definition: 'VARCHAR(500) NULL' },
      { name: 'imagen_trasera', definition: 'VARCHAR(500) NULL' },
      { name: 'imagen_lateral_derecha', definition: 'VARCHAR(500) NULL' },
      { name: 'imagen_lateral_izquierda', definition: 'VARCHAR(500) NULL' }
    ];

    for (const col of columnsToAdd) {
      await addColumnIfNotExists(connection, tableName, col.name, col.definition);
    }

    console.log('¡Verificación del esquema completada!');

  } catch (error) {
    console.error('Error durante la actualización del esquema:', error);
  } finally {
    if (connection) {
      connection.release();
      console.log('Conexión liberada.');
    }
    await db.end();
    console.log('Piscina de conexiones cerrada.');
  }
};

updateSchema();
