

-- Eliminar tablas si existen para asegurar un estado limpio
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS subcategorias;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS categorias;

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
    numero_referencia VARCHAR(255) DEFAULT NULL,
    categoria_id INT,
    subcategoria_id INT,
    imagen_icono VARCHAR(500) NULL,
    imagen_frontal VARCHAR(500) NULL,
    imagen_trasera VARCHAR(500) NULL,
    imagen_lateral_derecha VARCHAR(500) NULL,
    imagen_lateral_izquierda VARCHAR(500) NULL,
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

-- Tabla de Usuarios para el Panel de Administración
CREATE TABLE `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `nombre_completo` VARCHAR(100),
  `rol` VARCHAR(50) DEFAULT 'admin',
  `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

