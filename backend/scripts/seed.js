require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const dbConfig = require('../config/db');

async function seedDatabase() {
    let connection;
    try {
        console.log('Conectando a la base de datos...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            multipleStatements: true
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_DATABASE}`);
        await connection.query(`USE ${process.env.DB_DATABASE}`);
        console.log('Conectado a la base de datos y seleccionada:', process.env.DB_DATABASE);

        console.log('Creando tablas desde schema.sql...');
        const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
        const schemaSql = await fs.readFile(schemaPath, 'utf-8');
        
        // Dividir el script en sentencias individuales
        const statements = schemaSql.split(/;\s*$/m);
        for (const statement of statements) {
            if (statement.trim().length > 0) {
                await connection.query(statement);
            }
        }
        console.log('Tablas creadas correctamente.');

        // Insert categories with specific IDs
        const categoriesSql = `
            INSERT INTO categorias (id, nombre, descripcion, activa) VALUES
            (1, 'Gorras', 'Gorras urbanas de alta calidad', TRUE),
            (2, 'Sombreros', 'Sombreros para toda ocasión', TRUE);
        `;
        await connection.query(categoriesSql);
        console.log('Categorías insertadas correctamente.');

        // Insert subcategories
        const subcategoriesSql = `
            INSERT INTO subcategorias (nombre, categoria_id, descripcion) VALUES 
            ('macs', 1, 'Línea original Macs'),
            ('importadas', 1, 'Gorras importadas'),
            ('QS', 2, 'Sombreros QS'),
            ('alone', 2, 'Sombreros Alone'),
            ('safari', 2, 'Sombreros tipo Safari');
        `;
        await connection.query(subcategoriesSql);
        console.log('Subcategorías insertadas correctamente.');

        // Insert admin user
        const userSql = `
            INSERT INTO usuarios (username, password, nombre_completo, rol) VALUES
            ('admin', '$2b$10$MflaGLzACVz1OUhZN2bc/O5wSYVmTHEAf0.AkzoyghNf8xPbjXV3S', 'Administrador Principal', 'admin');
        `;
        await connection.query(userSql);
        console.log('Usuario administrador insertado correctamente. (usuario: admin, contraseña: admin123)');

        console.log('\n¡La base de datos ha sido poblada con los datos iniciales!');

    } catch (error) {
        console.error('\nError al poblar la base de datos:', error);
        console.error('Asegúrate de que el servidor de MySQL está corriendo y que las credenciales en el archivo .env son correctas.');
    } finally {
        if (connection) {
            await connection.end();
            console.log('Conexión a la base de datos cerrada.');
        }
    }
}

seedDatabase();
