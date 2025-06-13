# 🧢 Macs Legacy Web Site - Sistema de Gestión de Productos

## 📋 Descripción del Proyecto

Este es el sitio web de **Macs**, una marca colombiana de gorras urbanas. Actualmente es un sitio estático que muestra productos de manera básica. Este README explica cómo implementar un **Sistema de Gestión de Productos** completo.

## 🎯 Estado Actual del Proyecto

### Características Existentes:
- ✅ Sitio web estático con HTML, CSS y JavaScript
- ✅ Diseño responsive y moderno
- ✅ Slider de productos funcional
- ✅ Navegación multinivel
- ✅ Carga progresiva de productos simulados

### Limitaciones Actuales:
- ❌ No hay backend para gestionar productos
- ❌ Productos hardcodeados en JavaScript
- ❌ Sin base de datos
- ❌ Sin panel de administración
- ❌ Sin funcionalidad CRUD (Crear, Leer, Actualizar, Eliminar)

## 🚀 Implementación del Sistema de Gestión de Productos

### Fase 1: Configuración del Backend

#### 1.1 Tecnologías Recomendadas

**✅ RECOMENDADO: Node.js + Express + MySQL**
```bash
# Crear carpeta del backend
mkdir backend
cd backend

# Inicializar proyecto Node.js
npm init -y

# Instalar dependencias
npm install express mysql2 cors dotenv multer bcryptjs jsonwebtoken
npm install -D nodemon
```

**Alternativa: Python + Flask + SQLite** (Para desarrollo local)
```bash
# Crear entorno virtual
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install flask flask-sqlalchemy flask-cors pillow mysql-connector-python
```

**🚫 NO Recomendado para este proyecto: MongoDB**
- Complejidad innecesaria para un catálogo simple
- Hosting más costoso
- Curva de aprendizaje mayor

#### 1.2 Estructura de Carpetas Propuesta
```
Macs-legacy-Web-Site/
├── frontend/
│   ├── index.html
│   ├── productos-macs.html
│   ├── admin/
│   │   └── panel-admin.html
│   ├── css/
│   └── js/
├── backend/
│   ├── server.js (o app.py)
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   └── config/
└── database/
    └── productos.db
```

### Fase 2: Modelo de Datos

#### 2.1 Esquema de Base de Datos MySQL
```sql
-- Crear base de datos
CREATE DATABASE macs_productos;
USE macs_productos;

-- Tabla de categorías
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de subcategorías
CREATE TABLE subcategorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    categoria_id INT,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Tabla principal de productos
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    marca VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    descripcion TEXT,
    categoria_id INT,
    subcategoria_id INT,
    imagen_principal VARCHAR(500),
    stock INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    destacado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id),
    INDEX idx_categoria (categoria_id),
    INDEX idx_subcategoria (subcategoria_id),
    INDEX idx_activo (activo)
);

-- Tabla de imágenes adicionales
CREATE TABLE producto_imagenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT,
    url_imagen VARCHAR(500),
    orden INT DEFAULT 0,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

-- Insertar datos iniciales
INSERT INTO categorias (nombre, descripcion) VALUES 
('gorras', 'Gorras urbanas y deportivas'),
('sombreros', 'Sombreros de diferentes estilos');

INSERT INTO subcategorias (nombre, categoria_id, descripcion) VALUES 
('macs', 1, 'Línea original Macs'),
('importadas', 1, 'Gorras importadas'),
('qs', 2, 'Sombreros QS'),
('alone', 2, 'Sombreros Alone'),
('safari', 2, 'Sombreros tipo Safari');
```

#### 2.2 API Endpoints Necesarios
```
GET    /api/productos              # Obtener todos los productos
GET    /api/productos/:id          # Obtener producto específico
POST   /api/productos              # Crear nuevo producto
PUT    /api/productos/:id          # Actualizar producto
DELETE /api/productos/:id          # Eliminar producto
POST   /api/productos/:id/imagen   # Subir imagen de producto
GET    /api/categorias             # Obtener categorías disponibles
```

### Fase 3: Panel de Administración

#### 3.1 Crear Interfaz de Admin
```html
<!-- admin/panel-admin.html -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Panel de Administración - Macs</title>
    <link rel="stylesheet" href="../css/admin.css">
</head>
<body>
    <div class="admin-container">
        <aside class="sidebar">
            <h2>Admin Panel</h2>
            <nav>
                <ul>
                    <li><a href="#productos">Gestionar Productos</a></li>
                    <li><a href="#categorias">Categorías</a></li>
                    <li><a href="#inventario">Inventario</a></li>
                    <li><a href="#reportes">Reportes</a></li>
                </ul>
            </nav>
        </aside>
        
        <main class="content">
            <section id="productos">
                <div class="header-section">
                    <h1>Gestión de Productos</h1>
                    <button id="btn-nuevo-producto" class="btn-primary">
                        + Nuevo Producto
                    </button>
                </div>
                
                <div class="filtros">
                    <input type="text" id="buscar" placeholder="Buscar productos...">
                    <select id="filtro-categoria">
                        <option value="">Todas las categorías</option>
                        <option value="gorras">Gorras</option>
                        <option value="sombreros">Sombreros</option>
                    </select>
                </div>
                
                <div id="tabla-productos">
                    <!-- Tabla de productos se cargará aquí -->
                </div>
            </section>
        </main>
    </div>
    
    <!-- Modal para crear/editar productos -->
    <div id="modal-producto" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2 id="modal-titulo">Nuevo Producto</h2>
            <form id="form-producto">
                <div class="form-group">
                    <label>Nombre del Producto:</label>
                    <input type="text" id="nombre" required>
                </div>
                
                <div class="form-group">
                    <label>Marca:</label>
                    <input type="text" id="marca" required>
                </div>
                
                <div class="form-group">
                    <label>Precio:</label>
                    <input type="number" id="precio" required>
                </div>
                
                <div class="form-group">
                    <label>Categoría:</label>
                    <select id="categoria" required>
                        <option value="gorras">Gorras</option>
                        <option value="sombreros">Sombreros</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Subcategoría:</label>
                    <select id="subcategoria" required>
                        <option value="macs">Macs</option>
                        <option value="importadas">Importadas</option>
                        <option value="qs">QS</option>
                        <option value="alone">Alone</option>
                        <option value="safari">Safari</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Descripción:</label>
                    <textarea id="descripcion" rows="3"></textarea>
                </div>
                
                <div class="form-group">
                    <label>Imagen Principal:</label>
                    <input type="file" id="imagen" accept="image/*">
                </div>
                
                <div class="form-group">
                    <label>Stock:</label>
                    <input type="number" id="stock" min="0">
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-primary">Guardar</button>
                    <button type="button" class="btn-secondary" onclick="cerrarModal()">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    </div>
    
    <script src="../js/admin.js"></script>
</body>
</html>
```

#### 3.2 JavaScript para el Panel de Admin
```javascript
// js/admin.js
class AdminProductos {
    constructor() {
        this.productos = [];
        this.productoEditando = null;
        this.init();
    }
    
    async init() {
        await this.cargarProductos();
        this.configurarEventos();
        this.renderizarTabla();
    }
    
    async cargarProductos() {
        try {
            const response = await fetch('/api/productos');
            this.productos = await response.json();
        } catch (error) {
            console.error('Error cargando productos:', error);
            this.productos = [];
        }
    }
    
    configurarEventos() {
        // Botón nuevo producto
        document.getElementById('btn-nuevo-producto')
            .addEventListener('click', () => this.abrirModal());
        
        // Form submit
        document.getElementById('form-producto')
            .addEventListener('submit', (e) => this.guardarProducto(e));
        
        // Búsqueda en tiempo real
        document.getElementById('buscar')
            .addEventListener('input', (e) => this.filtrarProductos(e.target.value));
        
        // Filtro por categoría
        document.getElementById('filtro-categoria')
            .addEventListener('change', (e) => this.filtrarPorCategoria(e.target.value));
    }
    
    abrirModal(producto = null) {
        this.productoEditando = producto;
        const modal = document.getElementById('modal-producto');
        const titulo = document.getElementById('modal-titulo');
        
        if (producto) {
            titulo.textContent = 'Editar Producto';
            this.llenarFormulario(producto);
        } else {
            titulo.textContent = 'Nuevo Producto';
            document.getElementById('form-producto').reset();
        }
        
        modal.style.display = 'block';
    }
    
    async guardarProducto(e) {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('nombre', document.getElementById('nombre').value);
        formData.append('marca', document.getElementById('marca').value);
        formData.append('precio', document.getElementById('precio').value);
        formData.append('categoria', document.getElementById('categoria').value);
        formData.append('subcategoria', document.getElementById('subcategoria').value);
        formData.append('descripcion', document.getElementById('descripcion').value);
        formData.append('stock', document.getElementById('stock').value);
        
        const imagenFile = document.getElementById('imagen').files[0];
        if (imagenFile) {
            formData.append('imagen', imagenFile);
        }
        
        try {
            const url = this.productoEditando 
                ? `/api/productos/${this.productoEditando.id}`
                : '/api/productos';
            
            const method = this.productoEditando ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });
            
            if (response.ok) {
                await this.cargarProductos();
                this.renderizarTabla();
                this.cerrarModal();
                this.mostrarMensaje('Producto guardado exitosamente', 'success');
            } else {
                throw new Error('Error al guardar producto');
            }
        } catch (error) {
            this.mostrarMensaje('Error al guardar producto', 'error');
        }
    }
    
    async eliminarProducto(id) {
        if (confirm('¿Estás seguro de eliminar este producto?')) {
            try {
                const response = await fetch(`/api/productos/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    await this.cargarProductos();
                    this.renderizarTabla();
                    this.mostrarMensaje('Producto eliminado', 'success');
                }
            } catch (error) {
                this.mostrarMensaje('Error al eliminar producto', 'error');
            }
        }
    }
    
    renderizarTabla() {
        const container = document.getElementById('tabla-productos');
        
        const html = `
            <table class="tabla-admin">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Nombre</th>
                        <th>Marca</th>
                        <th>Precio</th>
                        <th>Categoría</th>
                        <th>Stock</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.productos.map(producto => `
                        <tr>
                            <td>
                                <img src="${producto.imagen_principal}" 
                                     alt="${producto.nombre}" 
                                     class="imagen-tabla">
                            </td>
                            <td>${producto.nombre}</td>
                            <td>${producto.marca}</td>
                            <td>$${producto.precio.toLocaleString()}</td>
                            <td>${producto.categoria} - ${producto.subcategoria}</td>
                            <td>${producto.stock}</td>
                            <td>
                                <button onclick="admin.abrirModal('${producto.id}')" 
                                        class="btn-editar">
                                    Editar
                                </button>
                                <button onclick="admin.eliminarProducto('${producto.id}')" 
                                        class="btn-eliminar">
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    }
    
    mostrarMensaje(mensaje, tipo) {
        const div = document.createElement('div');
        div.className = `mensaje ${tipo}`;
        div.textContent = mensaje;
        document.body.appendChild(div);
        
        setTimeout(() => {
            div.remove();
        }, 3000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new AdminProductos();
});
```

### Fase 4: Integración con el Frontend

#### 4.1 Actualizar productos-macs.html
```javascript
// Reemplazar el array estático de productos por llamada a API
async function cargarProductosDesdeAPI() {
    try {
        const response = await fetch('/api/productos?categoria=gorras&subcategoria=macs');
        const productos = await response.json();
        return productos;
    } catch (error) {
        console.error('Error cargando productos:', error);
        return [];
    }
}
```

#### 4.2 Actualizar la página principal
```javascript
// En scripts.js, agregar función para cargar productos destacados
async function cargarProductosDestacados() {
    try {
        const response = await fetch('/api/productos?destacados=true&limit=3');
        const productos = await response.json();
        
        const grid = document.querySelector('.productos-grid');
        grid.innerHTML = productos.map(producto => `
            <div class="producto">
                <img src="${producto.imagen_principal}" alt="${producto.nombre}" />
                <p class="marca">${producto.marca}</p>
                <h3>${producto.nombre}</h3>
                <p class="precio">$${producto.precio.toLocaleString()}</p>
                <button onclick="agregarAlCarrito('${producto.id}')">
                    Agregar al carrito
                </button>
                <div class="overlay-text">Ver Producto</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error cargando productos destacados:', error);
    }
}
```

### Fase 5: Backend Ejemplo (Node.js + Express + MySQL)

#### 5.1 Servidor Principal con MySQL
```javascript
// backend/server.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Configuración de MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'macs_productos',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Función auxiliar para ejecutar queries
async function executeQuery(query, params = []) {
    try {
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        throw error;
    }
}

// ========== RUTAS API ==========

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const { categoria, subcategoria, destacados, limit } = req.query;
        
        let query = `
            SELECT p.*, c.nombre as categoria_nombre, s.nombre as subcategoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN subcategorias s ON p.subcategoria_id = s.id
            WHERE p.activo = true
        `;
        const params = [];
        
        // Filtros opcionales
        if (categoria) {
            query += ` AND c.nombre = ?`;
            params.push(categoria);
        }
        
        if (subcategoria) {
            query += ` AND s.nombre = ?`;
            params.push(subcategoria);
        }
        
        if (destacados === 'true') {
            query += ` AND p.destacado = true`;
        }
        
        query += ` ORDER BY p.fecha_creacion DESC`;
        
        if (limit) {
            query += ` LIMIT ?`;
            params.push(parseInt(limit));
        }
        
        const productos = await executeQuery(query, params);
        res.json(productos);
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener producto específico
app.get('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT p.*, c.nombre as categoria_nombre, s.nombre as subcategoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN subcategorias s ON p.subcategoria_id = s.id
            WHERE p.id = ?
        `;
        
        const productos = await executeQuery(query, [id]);
        
        if (productos.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Obtener imágenes adicionales
        const imagenesQuery = `
            SELECT url_imagen FROM producto_imagenes 
            WHERE producto_id = ? ORDER BY orden
        `;
        const imagenes = await executeQuery(imagenesQuery, [id]);
        
        const producto = productos[0];
        producto.imagenes_adicionales = imagenes.map(img => img.url_imagen);
        
        res.json(producto);
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json({ error: error.message });
    }
});

// Crear nuevo producto
app.post('/api/productos', upload.single('imagen'), async (req, res) => {
    try {
        const { nombre, marca, precio, descripcion, categoria_id, subcategoria_id, stock, destacado } = req.body;
        
        let imagen_principal = null;
        if (req.file) {
            imagen_principal = `/uploads/${req.file.filename}`;
        }
        
        const query = `
            INSERT INTO productos (nombre, marca, precio, descripcion, categoria_id, subcategoria_id, imagen_principal, stock, destacado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            nombre,
            marca,
            parseFloat(precio),
            descripcion || null,
            parseInt(categoria_id),
            parseInt(subcategoria_id),
            imagen_principal,
            parseInt(stock) || 0,
            destacado === 'true' ? 1 : 0
        ];
        
        const result = await executeQuery(query, params);
        
        // Obtener el producto creado
        const nuevoProducto = await executeQuery('SELECT * FROM productos WHERE id = ?', [result.insertId]);
        
        res.status(201).json(nuevoProducto[0]);
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(400).json({ error: error.message });
    }
});

// Actualizar producto
app.put('/api/productos/:id', upload.single('imagen'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, marca, precio, descripcion, categoria_id, subcategoria_id, stock, destacado } = req.body;
        
        let updateFields = [];
        let params = [];
        
        if (nombre) {
            updateFields.push('nombre = ?');
            params.push(nombre);
        }
        if (marca) {
            updateFields.push('marca = ?');
            params.push(marca);
        }
        if (precio) {
            updateFields.push('precio = ?');
            params.push(parseFloat(precio));
        }
        if (descripcion !== undefined) {
            updateFields.push('descripcion = ?');
            params.push(descripcion);
        }
        if (categoria_id) {
            updateFields.push('categoria_id = ?');
            params.push(parseInt(categoria_id));
        }
        if (subcategoria_id) {
            updateFields.push('subcategoria_id = ?');
            params.push(parseInt(subcategoria_id));
        }
        if (stock !== undefined) {
            updateFields.push('stock = ?');
            params.push(parseInt(stock));
        }
        if (destacado !== undefined) {
            updateFields.push('destacado = ?');
            params.push(destacado === 'true' ? 1 : 0);
        }
        if (req.file) {
            updateFields.push('imagen_principal = ?');
            params.push(`/uploads/${req.file.filename}`);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }
        
        updateFields.push('fecha_actualizacion = CURRENT_TIMESTAMP');
        params.push(id);
        
        const query = `UPDATE productos SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await executeQuery(query, params);
        
        // Obtener el producto actualizado
        const productoActualizado = await executeQuery('SELECT * FROM productos WHERE id = ?', [id]);
        
        res.json(productoActualizado[0]);
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(400).json({ error: error.message });
    }
});

// Eliminar producto
app.delete('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Eliminar imágenes adicionales primero
        await executeQuery('DELETE FROM producto_imagenes WHERE producto_id = ?', [id]);
        
        // Eliminar producto
        await executeQuery('DELETE FROM productos WHERE id = ?', [id]);
        
        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(400).json({ error: error.message });
    }
});

// Obtener categorías
app.get('/api/categorias', async (req, res) => {
    try {
        const categorias = await executeQuery('SELECT * FROM categorias WHERE activa = true');
        res.json(categorias);
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener subcategorías por categoría
app.get('/api/subcategorias/:categoriaId', async (req, res) => {
    try {
        const { categoriaId } = req.params;
        const subcategorias = await executeQuery(
            'SELECT * FROM subcategorias WHERE categoria_id = ? AND activa = true',
            [categoriaId]
        );
        res.json(subcategorias);
    } catch (error) {
        console.error('Error obteniendo subcategorías:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📁 Archivos estáticos en: ${path.join(__dirname, 'uploads')}`);
});

// Manejo de errores de conexión
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando conexiones de base de datos...');
    await pool.end();
    process.exit(0);
});
```

### Fase 6: Despliegue y Configuración

#### 6.1 Scripts de Package.json
```json
{
    "scripts": {
        "start": "node server.js",
        "dev": "nodemon server.js",
        "build": "echo 'Build process'",
        "install-deps": "npm install"
    }
}
```

#### 6.2 Variables de Entorno (.env)
```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Configuración de MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=macs_productos

# Configuración de archivos
UPLOAD_PATH=uploads/
MAX_FILE_SIZE=5MB

# Seguridad (para futuras implementaciones)
JWT_SECRET=tu_clave_secreta_muy_segura_aqui
```

#### 6.3 Ventajas de MySQL vs MongoDB para Macs

##### ✅ **Por qué MySQL es MEJOR para este proyecto:**

**🏆 Simplicidad de Desarrollo:**
- Estructura de datos predecible (productos, categorías, precios)
- Queries más fáciles de entender y depurar
- Herramientas gráficas familiares (phpMyAdmin, MySQL Workbench)

**💰 Costo y Hosting:**
- Disponible en cualquier hosting compartido ($3-10/mes)
- No requiere VPS especializados
- Soporte nativo en la mayoría de proveedores

**🔧 Mantenimiento:**
- Backups automáticos simples
- Replicación estándar
- Documentación extensa en español

**⚡ Performance para E-commerce:**
- Transacciones ACID críticas para inventario
- Joins eficientes para productos + categorías
- Índices optimizados para búsquedas

**👥 Equipo y Conocimiento:**
- SQL es más conocido por desarrolladores junior
- Curva de aprendizaje menor
- Debugging más sencillo

##### ❌ **Por qué MongoDB sería excesivo:**

**🔧 Complejidad Innecesaria:**
- NoSQL para datos relacionales simples
- Agregaciones complejas para reportes básicos
- Esquemas flexibles no necesarios

**💸 Costos Mayores:**
- Hosting especializado más caro
- Require VPS o servicios como MongoDB Atlas
- Más recursos de servidor

**📚 Curva de Aprendizaje:**
- Conceptos NoSQL adicionales
- Sintaxis específica de MongoDB
- Menos desarrolladores con experiencia

### 📋 Checklist de Implementación

#### Backend Setup:
- [ ] Instalar Node.js y MongoDB
- [ ] Crear proyecto backend con Express
- [ ] Configurar base de datos
- [ ] Implementar modelos de datos
- [ ] Crear rutas API
- [ ] Configurar subida de archivos
- [ ] Implementar autenticación (opcional)

#### Frontend Integration:
- [ ] Crear panel de administración
- [ ] Actualizar páginas existentes para usar API
- [ ] Implementar funciones CRUD
- [ ] Agregar validación de formularios
- [ ] Mejorar manejo de errores

#### Testing:
- [ ] Probar todas las operaciones CRUD
- [ ] Verificar subida de imágenes
- [ ] Testear responsividad del panel admin
- [ ] Validar filtros y búsquedas

#### Deployment:
- [ ] Configurar servidor de producción
- [ ] Optimizar imágenes
- [ ] Implementar backup de base de datos
- [ ] Configurar SSL/HTTPS

## 📞 Soporte y Contacto

Para dudas sobre la implementación:
- 📧 Email: soporte@macs.com
- 📱 WhatsApp: +57 300 123 4567
- 🌐 Web: www.macs.com.co

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo LICENSE para más detalles.

---

**¡Listo para llevar Macs al siguiente nivel! 🚀**