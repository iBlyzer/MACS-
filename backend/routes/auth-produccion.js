const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// POST /api/auth-produccion/login
router.post('/login', async (req, res) => {
    const { nombre_usuario, password } = req.body;

    if (!nombre_usuario || !password) {
        return res.status(400).json({ message: 'El nombre de usuario y la contraseña son requeridos.' });
    }

    try {
        // Buscar al usuario en la base de datos
        // Consulta explícita para evitar problemas con acentos y seleccionar solo lo necesario
        const [results] = await pool.query(
            'SELECT id, nombre_usuario, password_hash, area AS area FROM usuarios_produccion WHERE nombre_usuario = ?',
            [nombre_usuario]
        );
        const usuario = results[0];

        if (!usuario) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Comparar la contraseña proporcionada con el hash almacenado
        const isMatch = await bcrypt.compare(password, usuario.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Crear el payload para el token
        const payload = {
            id: usuario.id,
            nombre_usuario: usuario.nombre_usuario,
            area: usuario.area,
            tipo: 'produccion' // Identificador para este tipo de token
        };

        // Firmar el token y enviarlo
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            token: token,
            area: usuario.area
        });

    } catch (error) {
        console.error('Error en el login de producción:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
