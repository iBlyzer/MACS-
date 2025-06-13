require('dotenv').config();
const mysql = require('mysql2/promise');

// Crear y exportar la piscina de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '22deabrildel2014',
  database: process.env.DB_NAME || 'macs_productos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
