const bcrypt = require('bcryptjs');

// La contraseña que quieres hashear
const password = 'admin123';

const saltRounds = 10;

bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) {
        console.error('Error generando el salt:', err);
        return;
    }
    
    bcrypt.hash(password, salt, (err, hash) => {
        if (err) {
            console.error('Error hasheando la contraseña:', err);
            return;
        }
        
        console.log('Contraseña original:', password);
        console.log('Hash generado (copia este valor en la base de datos):');
        console.log(hash);
    });
});
