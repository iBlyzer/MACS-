const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    console.log(`[Auth Middleware] Checking auth for: ${req.originalUrl}`);
    const authHeader = req.header('Authorization');
    console.log(`[Auth Middleware] Header: ${authHeader}`);

    // Verificar si no hay header o no tiene el formato correcto 'Bearer token'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[Auth Middleware] Denied: No token or invalid format.');
        return res.status(401).json({ message: 'No hay token o el formato es inválido, autorización denegada.' });
    }

    // Extraer el token (quitando 'Bearer ')
    const token = authHeader.split(' ')[1];
    console.log(`[Auth Middleware] Token: ${token}`);

    // Verificar el token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt_super_secreto');
        req.user = decoded.user;
        console.log('[Auth Middleware] Success: Token verified.');
        next();
    } catch (err) {
        console.log(`[Auth Middleware] Denied: Token invalid. Error: ${err.message}`);
        res.status(401).json({ message: 'El token no es válido.' });
    }
};
