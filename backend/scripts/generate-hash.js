const bcrypt = require('bcryptjs');

const password = '123456';
const saltRounds = 10;

console.log('Generating new compatible hash for password: "123456"...');

bcrypt.genSalt(saltRounds, function(err, salt) {
    if (err) {
        return console.error('Error generating salt:', err);
    }
    bcrypt.hash(password, salt, function(err, hash) {
        if (err) {
            return console.error('Error generating hash:', err);
        }
        console.log('\n--- COPIA Y PEGA ESTE HASH ---');
        console.log(hash);
        console.log('----------------------------');
    });
});
