require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// --- Configuración Inicial ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares Esenciales ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de depuración para registrar todas las solicitudes entrantes
app.use((req, res, next) => {
  console.log(`[Request Logger] Method: ${req.method}, URL: ${req.originalUrl}`);
  next();
});

// --- Rutas de la API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/subs', require('./routes/subcategorias'));
app.use('/api/slider', require('./routes/slider'));
app.use('/api/slider-manager', require('./routes/slider-manager'));
app.use('/api/new-slider', require('./routes/new-slider'));

// Ruta conflictiva eliminada. La lógica correcta está en routes/slider.js

// --- Servir archivos estáticos --- 
// Servir la carpeta frontend primero para asegurar que CSS, JS e imágenes se carguen siempre.
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));



// --- Manejador para rutas API no encontradas ---
// Captura todas las solicitudes a /api/* que no coincidieron con una ruta.
// --- Manejador para SPA (Single Page Application) ---
// Para cualquier otra ruta que no sea de la API, sirve el index.html principal.
// Esto permite que el enrutamiento del lado del cliente en el frontend funcione.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// --- Manejador para rutas API no encontradas ---
// Captura todas las solicitudes a /api/* que no coincidieron con una ruta.
app.use('/api', (req, res, next) => {
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
