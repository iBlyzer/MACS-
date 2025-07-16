require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// --- Configuración Inicial ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares Esenciales ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Middleware de Seguridad: Content Security Policy (CSP) ---
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https:; " + // Permite 'self', data: y cualquier https
    "font-src 'self' https://cdnjs.cloudflare.com; " +
    "connect-src 'self' http://localhost:3000; " +
    "frame-src 'self' https://www.google.com;"
  );
  next();
});

// Middleware de depuración para registrar todas las solicitudes entrantes
app.use((req, res, next) => {
  console.log(`[Request Logger] Method: ${req.method}, URL: ${req.originalUrl}`);
  next();
});

// --- Rutas de la API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/subcategorias', require('./routes/subcategorias'));
app.use('/api/slider', require('./routes/slider'));
app.use('/api/slider-manager', require('./routes/slider-manager'));
app.use('/api/new-slider', require('./routes/new-slider'));
app.use('/api/vistos-recientemente', require('./routes/vistos-recientemente'));

// Ruta conflictiva eliminada. La lógica correcta está en routes/slider.js

// --- Servir archivos estáticos del Backend ---
// Carpetas para archivos generados o subidos (ej. imágenes de productos).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// --- Servir archivos estáticos del Frontend ---
// Sirve la aplicación de frontend (HTML, CSS, JS).
// --- Servir archivos estáticos del Frontend ---
// Sirve la aplicación de frontend (CSS, JS, imágenes) desde la raíz.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- Rutas Específicas para Páginas HTML ---
// Ruta para el panel de administración
app.get('/admin/panel-admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin', 'panel-admin.html'));
});

// Ruta para la página de login del administrador
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'admin', 'login.html'));
});

// --- Manejador para rutas API no encontradas ---
// Captura las solicitudes a /api/* que no coincidieron con una ruta anterior.
app.use('/api/*', (req, res, next) => {
    res.status(404).json({ message: `La ruta API '${req.method} ${req.originalUrl}' no fue encontrada en el servidor.` });
});



// --- Manejador de Errores Global ---
app.use((err, req, res, next) => {
  console.error('--- ¡ERROR CAPTURADO POR EL MANEJADOR GLOBAL! ---');
  console.error('Ruta:', req.method, req.originalUrl);
  console.error('Error Completo:', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      message: `Error al procesar los archivos: ${err.message}`,
      code: err.code
    });
  }

  if (err.sqlState) {
    return res.status(500).json({ 
      message: 'Error en la operación de la base de datos.',
      code: err.code,
      sqlMessage: err.sqlMessage
    });
  }

  return res.status(500).json({ 
    message: `Ha ocurrido un error inesperado: ${err.message || 'Error desconocido'}`,
    error: err.stack
  });
});

// --- Iniciar el Servidor ---
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo a toda máquina en el puerto ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('--- ¡ERROR CRÍTICO NO CAPTURADO! ---', err);
  server.close(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('--- ¡PROMESA RECHAZADA NO MANEJADA! ---', reason);
});
