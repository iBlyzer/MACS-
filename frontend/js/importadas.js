document.addEventListener("DOMContentLoaded", () => {
    const productContainer = document.getElementById("productos-container");
    const seeMoreBtn = document.getElementById("ver-mas-btn");

    if (!productContainer || !seeMoreBtn) {
        console.error("Elementos necesarios (productos-container o ver-mas-btn) no se encontraron en el DOM.");
        return;
    }

    // Asegurarse de que la función para agregar al carrito esté disponible
    if (typeof agregarAlCarrito === 'undefined') {
        console.error("La función 'agregarAlCarrito' (de cart.js) no está disponible.");
        // Opcional: deshabilitar botones de compra si la función no existe
    }

    const API_URL = 'http://localhost:3001/api/productos?categoriaId=1';
    let allProducts = [];
    let productsLoaded = 0;
    const productsPerLoad = 8;
    let isLoading = false;

    async function initializeApp() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            const productsFromApi = await response.json();
            
            // ¡Clave! Filtrar productos por marca 'Importada' aquí
            allProducts = productsFromApi.filter(p => p.marca && p.marca.toLowerCase() === 'importada');
            
            console.log(`Respuesta API: ${productsFromApi.length} productos. Filtrados (marca 'Importada'): ${allProducts.length} productos.`);
            
            renderMoreProducts(); // Carga inicial de productos

        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            productContainer.innerHTML = '<p>Error al cargar los productos. Por favor, intente más tarde.</p>';
        }
    }

    function renderMoreProducts() {
        if (isLoading) return;
        isLoading = true;

        const fragment = document.createDocumentFragment();
        const end = Math.min(productsLoaded + productsPerLoad, allProducts.length);

        for (let i = productsLoaded; i < end; i++) {
            const product = allProducts[i];
            const productElement = createProductCard(product);
            fragment.appendChild(productElement);
        }

        productContainer.appendChild(fragment);
        productsLoaded = end;

        // Ocultar el botón "Ver más" si ya no hay productos que mostrar
        if (productsLoaded >= allProducts.length) {
            seeMoreBtn.style.display = "none";
        }
        isLoading = false;
    }

    function createProductCard(product) {
        const card = document.createElement("div");
        // Se usa la clase 'product-card' que ya tiene los estilos deseados
        card.className = "product-card"; 

        const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.precio);

        // Construir la URL completa de la imagen, priorizando 'imagen_icono'
        const imageUrl = product.imagen_icono || product.imagen_url;
        const imagenUrlCompleta = imageUrl
            ? `http://localhost:3001${imageUrl}` // Corregido: Se elimina la barra extra
            : 'http://localhost:3001/images/default-product.png';

        // Estructura HTML para el estilo de tarjeta
        card.innerHTML = `
            <a href="producto-detalle.html?id=${product.id}" class="product-card__image-container">
                <img src="${imagenUrlCompleta}" alt="${product.nombre}" class="product-card__image">
                <div class="product-card__overlay">Ver Producto</div>
            </a>
            <div class="product-card__info">
                <p class="product-card__brand">${product.marca || 'Importada'}</p>
                <h4 class="product-card__name"><a href="producto-detalle.html?id=${product.id}">${product.nombre}</a></h4>
                <p class="product-card__price">${precioFormateado}</p>
            </div>
            <button class="product-card__btn add-to-cart">Agregar al Carrito</button>
        `;

        const addToCartBtn = card.querySelector('.add-to-cart');
        if (addToCartBtn && typeof agregarAlCarrito !== 'undefined') {
            addToCartBtn.addEventListener('click', (e) => {
                e.preventDefault();
                agregarAlCarrito({
                    id: product.id,
                    nombre: product.nombre,
                    precio: product.precio,
                    imagen_icono: product.imagen_icono || product.imagen_url,
                    marca: product.marca
                });
            });
        }
        return card;
    }

    seeMoreBtn.addEventListener('click', renderMoreProducts);

    initializeApp();
});
