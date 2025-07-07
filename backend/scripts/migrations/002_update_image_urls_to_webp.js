require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const db = require('../../config/db');

const log = (message, color = '\x1b[0m') => console.log(`${color}${message}\x1b[0m`);

async function updateImageUrls() {
  log('--- Iniciando actualización de URLs de imágenes a .webp ---', '\x1b[36m');
  let connection;
  try {
    connection = await db.getConnection();
    log('✔ Conexión a la base de datos establecida.');

    const tableName = 'productos';
    const imageColumns = [
      'imagen_3_4',
      'imagen_frontal',
      'imagen_lateral',
      'imagen_trasera',
      'imagen_superior',
      'imagen_inferior'
    ];

    let updatedCount = 0;

    for (const column of imageColumns) {
      const updateQuery = `
        UPDATE \`${tableName}\`
        SET \`${column}\` = REPLACE(\`${column}\`, '.png', '.webp')
        WHERE \`${column}\` LIKE '%.png';
      `;

      log(`Ejecutando actualización para la columna '${column}'...`, '\x1b[33m');
      const [result] = await connection.query(updateQuery);

      if (result.affectedRows > 0) {
        log(`✔ Se actualizaron ${result.affectedRows} filas en la columna '${column}'.`, '\x1b[32m');
        updatedCount += result.affectedRows;
      }
       else {
        log(`- No se encontraron filas para actualizar en la columna '${column}'.`, '\x1b[37m');
      }
    }

    if (updatedCount > 0) {
        log(`\n--- Actualización completada. Total de filas afectadas: ${updatedCount} ---`, '\x1b[36m');
    } else {
        log(`\n--- No se realizaron cambios. Las URLs ya parecen estar correctas. ---`, '\x1b[36m');
    }

  } catch (error) {
    log(`\n--- ERROR DURANTE LA ACTUALIZACIÓN ---`, '\x1b[31m');
    console.error(error);
    log('La actualización de datos falló. Revisa el error anterior.', '\x1b[31m');
  } finally {
    if (connection) {
      await connection.release();
      log('\n✔ Conexión a la base de datos liberada.');
    }
    await db.end();
    log('✔ Pool de conexiones cerrado.');
  }
}

updateImageUrls();
