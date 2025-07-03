const bcrypt = require('bcryptjs');
const db = require('../config/db');

const username = 'macscaps.admin';
const password = 'McC@ps!2025#xZ9p';

async function createOrUpdateAdmin() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [rows] = await db.query('SELECT id FROM usuarios WHERE username = ?', [username]);

    if (rows.length > 0) {
      // Usuario existe, actualizar contraseña
      await db.query(
        'UPDATE usuarios SET password = ? WHERE username = ?',
        [hashedPassword, username]
      );
      console.log(`\x1b[32m✔ Contraseña del usuario '${username}' actualizada correctamente.\x1b[0m`);
    } else {
      // Usuario no existe, crear nuevo usuario
      await db.query(
        'INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, 'Administrador', 'admin']
      );
      console.log(`\x1b[32m✔ Usuario '${username}' creado correctamente.\x1b[0m`);
    }
    console.log('Proceso completado. Ya puedes iniciar sesión.');

  } catch (error) {
    console.error('\x1b[31m✖ Error al crear o actualizar el usuario:\x1b[0m', error);
  } finally {
    db.end();
  }
}

createOrUpdateAdmin();
