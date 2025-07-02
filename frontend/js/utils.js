// =================================================================================================
// UTILIDADES GLOBALES
// =================================================================================================
// Este archivo contiene funciones de utilidad que se pueden usar en todo el sitio web.
// =================================================================================================

/**
 * Construye la URL completa para una imagen de producto.
 * Asume que las imágenes se sirven desde el backend en el puerto 3001.
 * @param {string} imagePath - La ruta relativa de la imagen (ej. 'uploads/imagen.jpg').
 * @returns {string} La URL completa de la imagen.
 */
function getImageUrl(imagePath) {
    if (!imagePath) {
        return 'img/default-product.png'; // Retorna una imagen por defecto si no hay ruta
    }
    // Evita duplicar el slash si la ruta ya lo incluye
    if (imagePath.startsWith('/')) {
        return `http://localhost:3000${imagePath}`;
    }
    return `http://localhost:3000/${imagePath}`;
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
