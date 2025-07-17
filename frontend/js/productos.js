document.addEventListener("DOMContentLoaded", () => {
  const productPageContainer = document.getElementById("productos-container");
  const loader = document.getElementById("loader");
  const searchInput = document.getElementById("search-input");

  // La función crearTarjetaProducto se define aquí adentro, pero la necesitamos afuera.
  // Vamos a moverla.

  let allProductsInCategory = [];
  let currentlyDisplayedProducts = [];
  let productsLoaded = 0;
  const productsPerLoad = 8;
  let isLoading = false;

  async function initializeApp() {
    if (!productPageContainer) return;

    const categorySection = document.querySelector('main.productos-pagina > section');
    let categoryName = '';
    let subcategoryName = '';

    if (categorySection) {
        if (categorySection.dataset.categoria) {
            categoryName = categorySection.dataset.categoria;
        }
        if (categorySection.dataset.subcategoria) {
            subcategoryName = categorySection.dataset.subcategoria;
        }
    } else {
        console.error("No se encontró la sección de productos con 'data-attributes'.");
        productPageContainer.innerHTML = "<p>Error: Configuración de página incompleta.</p>";
        return;
    }

    if (!categoryName) {
        console.error("No se pudo determinar la categoría principal de la página.");
        productPageContainer.innerHTML = "<p>Error: Falta la categoría principal.</p>";
        return;
    }

    let apiUrl = `${API_BASE_URL}/api/productos/categoria/${encodeURIComponent(categoryName)}`;
    if (subcategoryName) {
        apiUrl += `?subcategoria=${encodeURIComponent(subcategoryName)}`;
    }

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Error en la petición: ${response.statusText}`);
      
      let fetchedProducts = await response.json();

      if (subcategoryName === 'Macs') {
        const referencedProducts = fetchedProducts.filter(p => p.numero_referencia && /^A\d+$/i.test(p.numero_referencia));
        if (referencedProducts.length > 0) {
          referencedProducts.sort((a, b) => {
            const getNum = (ref) => parseInt(ref.match(/^A(\d+)$/i)[1], 10);
            return getNum(a.numero_referencia) - getNum(b.numero_referencia);
          });
          const productMap = new Map(referencedProducts.map(p => [p.numero_referencia, p]));
          const lastRef = referencedProducts[referencedProducts.length - 1].numero_referencia;
          const maxRefNum = parseInt(lastRef.match(/^A(\d+)$/i)[1], 10);
          const completeProductList = [];
          for (let i = 1; i <= maxRefNum; i++) {
            const ref = `A${String(i).padStart(2, '0')}`;
            if (productMap.has(ref)) {
              completeProductList.push(productMap.get(ref));
            } else {
              completeProductList.push({ isMissing: true, numero_referencia: ref });
            }
          }
          allProductsInCategory = completeProductList;
        } else {
          allProductsInCategory = fetchedProducts;
        }
      } else {
        allProductsInCategory = fetchedProducts;
      }
      currentlyDisplayedProducts = [...allProductsInCategory];

      renderProductPageItems(true);

      window.addEventListener('scroll', handleInfiniteScroll, { passive: true });

      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const searchResults = allProductsInCategory.filter(product => 
          product.nombre.toLowerCase().includes(searchTerm)
        );
        currentlyDisplayedProducts = searchResults;
        renderProductPageItems(true);
      });

    } catch (error) {
      console.error("Error al inicializar la aplicación:", error);
      productPageContainer.innerHTML = "<p>No se pudieron cargar los productos. Inténtalo de nuevo más tarde.</p>";
    }
  }

  function renderProductPageItems(isNewRender = false) {
    if (isNewRender) {
      productPageContainer.innerHTML = '';
      productsLoaded = 0;
    }
    const fragment = document.createDocumentFragment();
    const end = Math.min(productsLoaded + productsPerLoad, currentlyDisplayedProducts.length);
    if (productsLoaded >= currentlyDisplayedProducts.length) {
      if (loader) loader.style.display = "none";
      if (isNewRender && currentlyDisplayedProducts.length === 0) {
        productPageContainer.innerHTML = "<p>No se encontraron productos con ese nombre.</p>";
      }
      return;
    }
    for (let i = productsLoaded; i < end; i++) {
      const product = currentlyDisplayedProducts[i];
      if (product.isMissing) {
        const comment = document.createComment(` Producto con REF ${product.numero_referencia} falta `);
        fragment.appendChild(comment);
      } else {
        const productElement = crearTarjetaProducto(product); // Ahora es global
        fragment.appendChild(productElement);
      }
    }
    productPageContainer.appendChild(fragment);
    productsLoaded = end;
    if (productsLoaded >= currentlyDisplayedProducts.length) {
      if (loader) loader.style.display = "none";
    } else {
      if (loader) loader.style.display = "none";
    }
  }

  function handleInfiniteScroll() {
    if (isLoading || productsLoaded >= currentlyDisplayedProducts.length) return;
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (clientHeight + scrollTop >= scrollHeight - 300) {
      loadMoreProducts();
    }
  }

  function loadMoreProducts() {
    if (isLoading) return;
    isLoading = true;
    if (loader) loader.style.display = 'flex';
    setTimeout(() => {
      renderProductPageItems(false);
      isLoading = false;
    }, 800);
  }

  initializeApp();
});

/**
 * Crea un elemento de tarjeta de producto con un enlace.
 * @param {object} producto - El objeto del producto.
 * @returns {HTMLElement} - El elemento de la tarjeta de producto.
 */
function crearTarjetaProducto(producto) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = producto.id;

    // 1. Contenedor de la Imagen (con enlace)
    const imageLink = document.createElement('a');
    imageLink.href = `producto-detalle.html?id=${producto.id}`;
    imageLink.className = 'product-card__image-link';

    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-card__image-container';

    const image = document.createElement('img');
    image.src = producto.imagen_principal || 'assets/placeholder.png';
    image.alt = producto.nombre;
    image.className = 'product-card__image';
    image.loading = 'lazy';

    imageContainer.appendChild(image);
    imageLink.appendChild(imageContainer);

    // 2. Contenedor de Contenido
    const content = document.createElement('div');
    content.className = 'product-card__content';

    // 3. Bloque de Información (Categoría, Nombre, Precio)
    const info = document.createElement('div');
    info.className = 'product-card__info';

    const category = document.createElement('p');
    category.className = 'product-category';
    category.textContent = producto.categoria_nombre || 'Categoría';

    const nameLink = document.createElement('a');
    nameLink.href = `producto-detalle.html?id=${producto.id}`;
    nameLink.className = 'product-name-link';
    const name = document.createElement('h3');
    name.className = 'product-name';
    name.textContent = producto.nombre;
    nameLink.appendChild(name);

    const price = document.createElement('p');
    price.className = 'product-price';
    price.textContent = `$${parseFloat(producto.precio).toLocaleString('es-CO')}`;

    info.appendChild(category);
    info.appendChild(nameLink);
    info.appendChild(price);

    // 4. Bloque de Acciones (Stock, Botón de carrito)
    const actions = document.createElement('div');
    actions.className = 'product-card__actions';

    if (producto.stock_total > 0) {
        const stockContainer = document.createElement('div');
        stockContainer.className = 'stock-container';

        const stockIndicator = document.createElement('span');
        stockIndicator.className = 'stock-indicator in-stock';
        stockIndicator.textContent = 'En Stock';

        const stockQuantity = document.createElement('span');
        stockQuantity.className = 'stock-quantity';
        stockQuantity.textContent = `(${producto.stock_total} disponibles)`;

        stockContainer.appendChild(stockIndicator);
        stockContainer.appendChild(stockQuantity);

        const cartButton = document.createElement('button');
        cartButton.className = 'btn-add-to-cart';
        cartButton.innerHTML = 'Agregar al Carrito';
        cartButton.onclick = (e) => {
            e.preventDefault();
            agregarAlCarrito(producto.id, producto.nombre, producto.precio, producto.imagen_principal, 1, 'única', 'único');
        };

        actions.appendChild(stockContainer);
        actions.appendChild(cartButton);
    } else {
        const stockIndicator = document.createElement('span');
        stockIndicator.className = 'stock-indicator out-of-stock';
        stockIndicator.textContent = 'Agotado';
        actions.appendChild(stockIndicator);
    }

    content.appendChild(info);
    content.appendChild(actions);

    card.appendChild(imageLink);
    card.appendChild(content);

    return card; // Devolvemos la tarjeta completa, no el enlace
}
