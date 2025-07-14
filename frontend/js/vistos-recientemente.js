document.addEventListener('DOMContentLoaded', () => {
    const vistosRecientementeContainer = document.getElementById('vistos-recientemente-container');
    const productosVistosSection = document.getElementById('productos-vistos-section');

    const obtenerProductosVistos = () => {
        const vistos = localStorage.getItem('productosVistos');
        return vistos ? JSON.parse(vistos) : [];
    };

    const mostrarProductosVistos = async () => {
        const productosVistosIds = obtenerProductosVistos();

        if (productosVistosIds.length === 0) {
            productosVistosSection.style.display = 'none';
            return;
        }

        try {
            // Asumimos que todos los productos están disponibles en una variable global `todosLosProductos`
            // o que podemos obtenerlos de alguna forma. `productos.js` debería encargarse de esto.
            const response = await fetch(`${API_BASE_URL}/api/productos`);
            if (!response.ok) {
                throw new Error('Error al cargar los productos');
            }
            const todosLosProductos = await response.json();

            const productosParaMostrar = todosLosProductos.filter(p => productosVistosIds.includes(p.id.toString()));

            if (productosParaMostrar.length > 0) {
                vistosRecientementeContainer.innerHTML = ''; // Limpiar contenedor
                productosParaMostrar.forEach(producto => {
                    if (typeof createProductLinkElement === 'function') {
                        const productoCard = createProductLinkElement(producto);
                        vistosRecientementeContainer.appendChild(productoCard);
                    } else {
                        console.error('La función createProductLinkElement no está disponible.');
                    }
                });
                productosVistosSection.style.display = 'block';
            } else {
                productosVistosSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error al mostrar productos vistos:', error);
            productosVistosSection.style.display = 'none';
        }
    };

    mostrarProductosVistos();
});

// Función para añadir un producto a la lista de vistos recientemente
// Esta función deberá ser llamada desde la página de detalle de cada producto.
const agregarProductoVisto = (productoId) => {
    if (!productoId) return;
    let vistos = localStorage.getItem('productosVistos');
    vistos = vistos ? JSON.parse(vistos) : [];

    // Eliminar si ya existe para añadirlo al principio (más reciente)
    const index = vistos.indexOf(productoId.toString());
    if (index > -1) {
        vistos.splice(index, 1);
    }

    // Añadir al principio de la lista
    vistos.unshift(productoId.toString());

    // Limitar el número de productos mostrados (e.g., a 5)
    const maxVistos = 5;
    if (vistos.length > maxVistos) {
        vistos = vistos.slice(0, maxVistos);
    }

    localStorage.setItem('productosVistos', JSON.stringify(vistos));
};
