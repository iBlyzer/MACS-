const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Obtener el token del header de autorización
    const authHeader = req.header('Authorization');

    // Verificar si no hay header o no tiene el formato correcto 'Bearer token'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No hay token o el formato es inválido, autorización denegada.' });
    }

    // Extraer el token (quitando 'Bearer ')
    const token = authHeader.split(' ')[1];

    // Verificar el token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt_super_secreto');
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'El token no es válido.' });
    }
};
