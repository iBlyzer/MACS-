const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Obtener el token del header
    const token = req.header('x-auth-token');

    // Verificar si no hay token
    if (!token) {
        return res.status(401).json({ message: 'No hay token, autorización denegada.' });
    }

    // Verificar el token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt_super_secreto');
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'El token no es válido.' });
    }
};
