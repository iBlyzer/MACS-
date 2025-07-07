require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const db = require('../../config/db');

const log = (message, color = '\x1b[0m') => console.log(`${color}${message}\x1b[0m`);

async function runMigration() {
  log('--- Iniciando migración para renombrar columnas de imágenes ---', '\x1b[36m');
  let connection;
  try {
    connection = await db.getConnection();
    log('✔ Conexión a la base de datos establecida.');

    const tableName = 'productos';
    const columnsToRename = [
      { from: 'imagen_3_4.png', to: 'imagen_3_4' },
      { from: 'imagen_frontal.png', to: 'imagen_frontal' },
      { from: 'imagen_lateral.png', to: 'imagen_lateral' },
      { from: 'imagen_trasera.png', to: 'imagen_trasera' },
      { from: 'imagen_superior.png', to: 'imagen_superior' },
      { from: 'imagen_inferior.png', to: 'imagen_inferior' }
    ];

    for (const { from, to } of columnsToRename) {
      try {
        const [checkFrom] = await connection.query(
          `SHOW COLUMNS FROM \`${tableName}\` LIKE ?`,
          [from]
        );
        const [checkTo] = await connection.query(
          `SHOW COLUMNS FROM \`${tableName}\` LIKE ?`,
          [to]
        );

        if (checkFrom.length > 0 && checkTo.length === 0) {
          const alterQuery = `ALTER TABLE \`${tableName}\` RENAME COLUMN \`${from}\` TO \`${to}\`;`;
          log(`Ejecutando: ${alterQuery}`, '\x1b[33m');
          await connection.query(alterQuery);
          log(`✔ Columna '${from}' renombrada a '${to}'.`, '\x1b[32m');
        } else if (checkTo.length > 0) {
          log(`- La columna '${to}' ya existe. Saltando...`, '\x1b[37m');
        } else {
          log(`- La columna '${from}' no fue encontrada. Saltando...`, '\x1b[37m');
        }
      } catch (error) {
        if (error.code === 'ER_BAD_FIELD_ERROR') {
          log(`- La columna '${from}' no fue encontrada. Saltando...`, '\x1b[37m');
        } else {
          throw error;
        }
      }
    }

    log('--- Migración completada exitosamente ---', '\x1b[36m');
  } catch (error) {
    log(`\n--- ERROR DURANTE LA MIGRACIÓN ---`, '\x1b[31m');
    console.error(error);
    log('La migración falló. Revisa el error anterior.', '\x1b[31m');
  } finally {
    if (connection) {
      await connection.release();
      log('✔ Conexión a la base de datos liberada.');
    }
    await db.end();
    log('✔ Pool de conexiones cerrado.');
  }
}

runMigration();
