require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const db = require('../../config/db');

const log = (message, color = '\x1b[0m') => console.log(`${color}${message}\x1b[0m`);

async function checkImageData() {
  log('--- Iniciando diagnóstico de datos de imágenes ---', '\x1b[36m');
  let connection;
  try {
    connection = await db.getConnection();
    log('✔ Conexión a la base de datos establecida.');

    const imageColumns = [
      'imagen_3_4',
      'imagen_frontal',
      'imagen_lateral',
      'imagen_trasera',
      'imagen_superior',
      'imagen_inferior'
    ];

    const query = `SELECT id, nombre, ${imageColumns.join(', ')} FROM productos LIMIT 5`;
    log(`Ejecutando consulta: ${query}`, '\x1b[33m');

    const [rows] = await connection.query(query);

    if (rows.length === 0) {
      log('No se encontraron productos para analizar.', '\x1b[33m');
      return;
    }

    log('\n--- Datos de productos encontrados ---', '\x1b[36m');
    rows.forEach((product, index) => {
      log(`\n[Producto ${index + 1}] ID: ${product.id}, Nombre: ${product.nombre}`, '\x1b[37m');
      let hasIssue = false;
      imageColumns.forEach(col => {
        const value = product[col];
        if (value) {
          log(`  - Columna '${col}': ${value}`);
          if (!value.startsWith('http')) {
            hasIssue = true;
            log(`    ^ [PROBLEMA POTENCIAL] Esta ruta no es una URL completa de Cloudinary.`, '\x1b[31m');
          }
        } else {
          log(`  - Columna '${col}': NULL`);
        }
      });
      if (!hasIssue) {
        log('  ✔ Este producto parece tener URLs correctas.', '\x1b[32m');
      }
    });

    log('\n--- Diagnóstico completado ---', '\x1b[36m');

  } catch (error) {
    log(`\n--- ERROR DURANTE EL DIAGNÓSTICO ---`, '\x1b[31m');
    console.error(error);
  } finally {
    if (connection) {
      await connection.release();
      log('\n✔ Conexión a la base de datos liberada.');
    }
    await db.end();
    log('✔ Pool de conexiones cerrado.');
  }
}

checkImageData();
