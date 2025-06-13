require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// --- Configuración Inicial ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares Esenciales ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Redirección a la página de login ---
app.get('/', (req, res) => {
  res.redirect('/admin/login.html');
});

// Servir toda la carpeta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Rutas de la API ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/categorias', require('./routes/categorias'));
app.use('/api/subs', require('./routes/subcategorias'));

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
