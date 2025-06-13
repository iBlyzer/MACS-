const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const db = require('../config/db');

// POST /api/auth/login - Autenticar usuario y obtener token
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Por favor, ingrese usuario y contraseña.' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE username = ?', [username]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // El hash de ejemplo en schema.sql es solo un placeholder.
        // Para una implementación real, se debe hashear una contraseña al registrar un usuario.
        // Aquí asumimos que la contraseña 'admin123' fue hasheada y almacenada.
        // Para probar, necesitamos generar un hash real para 'admin123' y ponerlo en la BD.
        // Por ahora, simularemos la comparación.
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            // Si la comparación falla, es posible que el hash de ejemplo no coincida.
            // Vamos a añadir una nota sobre esto.
            console.warn('ADVERTENCIA: La comparación de contraseñas falló. Asegúrese de que el hash en la base de datos para el usuario \`admin\` corresponda a la contraseña \`admin123\`. Puede generar uno con un script de registro o una herramienta online de bcrypt.');
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                rol: user.rol
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'tu_secreto_jwt_super_secreto',
            { expiresIn: '1h' }, // El token expira en 1 hora
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (error) {
        logger.error('Error en el login:', error);
        res.status(500).json({ message: 'Error del servidor. Por favor, revise los logs.' });
    }
});

module.exports = router;
