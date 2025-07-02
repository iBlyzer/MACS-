document.addEventListener('DOMContentLoaded', () => {
    const detalleContainer = document.getElementById('detalle-producto-container');
    const relatedContainer = document.getElementById('related-products-container');
    const API_URL = 'http://localhost:3000/api/productos';

    let allProducts = [];

    const getProductId = () => {
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get('id'), 10);
    };

    const fetchProductDetails = async () => {
        const productId = getProductId();
        if (isNaN(productId)) {
            detalleContainer.innerHTML = '<p>Producto no encontrado. Por favor, vuelve a la lista de productos.</p>';
            return;
        }

        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('No se pudo conectar a la API.');
            allProducts = await response.json();

            const product = allProducts.find(p => p.id === productId);

            if (product) {
                renderProductDetails(product);
                renderRelatedProducts(productId);
            } else {
                detalleContainer.innerHTML = '<p>Producto no encontrado.</p>';
            }
        } catch (error) {
            console.error('Error al obtener el producto:', error);
            detalleContainer.innerHTML = '<p>Hubo un error al cargar el producto. Inténtalo de nuevo más tarde.</p>';
        }
    };

    const renderProductDetails = (product) => {
        detalleContainer.innerHTML = ''; // Limpiar el mensaje de "Cargando..."

        const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.precio);
        const imagenUrl = product.imagen_principal ? `http://localhost:3000${product.imagen_principal}` : '/assets/logo.png';

        // Asumimos 4 imágenes para la galería, usando la principal como placeholder
        const galleryImages = Array(4).fill(imagenUrl);

        const detailsHTML = `
            <div class="detalle-images-grid">
                ${galleryImages.map(img => `<div class="gallery-item"><img src="${img}" alt="Vista del producto"></div>`).join('')}
            </div>
            <div class="detalle-info">
                <p class="product-brand">${product.marca || 'Macs Legacy'}</p>
                <h1>${product.nombre}</h1>
                <p class="ref">REF: ${product.referencia || 'N/A'}</p>
                <p class="price">${precioFormateado}</p>
                
                <div class="sizes-section">
                    <p class="section-title">TALLAS</p>
                    <div class="size-grid" id="product-sizes">
                        ${(product.tallas && product.tallas.length > 0) 
                            ? product.tallas.map(t => `<div class="size-box">${t}</div>`).join('') 
                            : '<div class="size-box">Talla Única</div>'}
                    </div>
                </div>

                <div class="product-links">
                    <a href="#">Tabla de tallas +</a>
                    <a href="#">Guía de silueta +</a>
                    <a href="#">Cuida tu gorra +</a>
                </div>

                <div class="extra-option">
                    <input type="checkbox" id="extra-curvador">
                    <label for="extra-curvador">
                        ¿Te gustaría añadir nuestro curveador de visera Curveador OS Negro? <strong>$ 68.990</strong> ?
                    </label>
                </div>

                <div class="payment-info">
                    <p>Paga con <strong>Addi</strong> en hasta 6 cuotas. <a href="#">Pide un cupo</a></p>
                </div>

                <button class="add-to-cart-btn">AGREGAR AL CARRITO</button>
            </div>
        `;
        detalleContainer.innerHTML = detailsHTML;
    };

    const renderRelatedProducts = (currentProductId) => {
        relatedContainer.innerHTML = '';
        const related = allProducts.filter(p => p.id !== currentProductId).sort(() => 0.5 - Math.random()).slice(0, 4);

        const fragment = document.createDocumentFragment();
        related.forEach(product => {
            const productElement = createProductElement(product);
            fragment.appendChild(productElement);
        });
        relatedContainer.appendChild(fragment);
    };

    function createProductElement(product) {
        const divProducto = document.createElement("div");
        divProducto.className = "producto";
        const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.precio);
        const imagenUrl = product.imagen_principal ? `http://localhost:3000${product.imagen_principal}` : '/assets/logo.png';

        divProducto.innerHTML = `
            <a href="producto-detalle.html?id=${product.id}">
                <img src="${imagenUrl}" alt="${product.nombre}" onerror="this.onerror=null;this.src='/assets/logo.png';">
                <div class="overlay-text">Ver Producto</div>
            </a>
            <p class="marca">${product.marca || 'Macs'}</p>
            <h3><a href="producto-detalle.html?id=${product.id}">${product.nombre}</a></h3>
            <p class="precio">${precioFormateado}</p>
        `;
        return divProducto;
    }

    fetchProductDetails();
});
