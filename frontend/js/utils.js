// =================================================================================================
// UTILIDADES GLOBALES
// =================================================================================================
// Este archivo contiene funciones de utilidad que se pueden usar en todo el sitio web.
// =================================================================================================

/**
 * Construye la URL completa de Cloudinary para una imagen o PDF.
 * Si la ruta ya es una URL completa, la devuelve directamente.
 * Si es una ruta local (ej. 'uploads/productos/imagen.jpg'), extrae solo el nombre del archivo
 * y lo usa para construir la URL de Cloudinary.
 * @param {string} path - La ruta de la imagen o PDF.
 * @returns {string} La URL completa de Cloudinary o un placeholder si la ruta no es válida.
 */
function getImageUrl(imagePath) {
    const cloudinaryBaseUrl = 'https://res.cloudinary.com/dj6prfjm9/image/upload/';

    if (!imagePath || typeof imagePath !== 'string') {
        // Retorna una imagen por defecto si no hay ruta o no es válida
        return 'https://via.placeholder.com/300x300.png?text=Sin+Imagen';
    }

    // Si ya es una URL completa (de Cloudinary u otra), la devuelve tal cual.
    if (imagePath.startsWith('http')) {
        return imagePath;
    }

    // Extrae solo el nombre del archivo con su extensión de la ruta completa
    const filename = imagePath.substring(imagePath.lastIndexOf('/') + 1);
    
    // Construye la URL de Cloudinary
    return `${cloudinaryBaseUrl}${filename}`;
}

/**
 * Formatea un número como moneda colombiana (COP).
 * @param {number} value - El valor numérico a formatear.
 * @returns {string} El valor formateado como una cadena de texto (ej. "$ 1.200").
 */
function formatCurrency(value) {
    if (isNaN(value)) {
        return "$ 0";
    }
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}
