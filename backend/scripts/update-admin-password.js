const bcrypt = require('bcryptjs');
const db = require('../config/db');

const passwordToHash = 'admin123';
const usernameToUpdate = 'admin';

async function updateAdminPassword() {
  try {
    // Generar el hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordToHash, salt);

    // Actualizar la contraseña en la base de datos
    const [result] = await db.query(
      'UPDATE usuarios SET password = ? WHERE username = ?',
      [hashedPassword, usernameToUpdate]
    );

    if (result.affectedRows > 0) {
      console.log(`\x1b[32m✔ Contraseña del usuario '${usernameToUpdate}' actualizada correctamente en la base de datos.\x1b[0m`);
      console.log('Ya puedes iniciar sesión con las nuevas credenciales.');
    } else {
      console.log(`\x1b[33m⚠ No se encontró al usuario '${usernameToUpdate}'. No se realizó ninguna actualización.\x1b[0m`);
    }

  } catch (error) {
    console.error('\x1b[31m✖ Error al actualizar la contraseña:\x1b[0m', error);
  } finally {
    // Cerrar la conexión a la base de datos
    db.end();
  }
}

updateAdminPassword();
