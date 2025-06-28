// Esta función crea el HTML para una tarjeta de producto y la devuelve.
// Se define en el ámbito global para que otros scripts puedan usarla si es necesario.
function createProductLinkElement(product) {
  const card = document.createElement("div");
  card.className = "product-card";

  const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.precio);

  // Lógica de imagen mejorada: prioriza imagen_3_4
  const imagenUrl = product.imagen_3_4 || product.imagen_icono || product.imagen_url;
  const imagenUrlCompleta = imagenUrl
    ? `http://localhost:3001${imagenUrl}`
    : 'https://via.placeholder.com/300x300.png?text=Imagen no disponible';

  // Lógica para mostrar el stock
  const stock = parseInt(product.stock, 10) || 0;
  const stockText = stock > 0 ? `EN STOCK (${stock})` : 'AGOTADO';
  const stockClass = stock > 0 ? 'in-stock' : 'out-of-stock';
  const stockInfoHTML = `<div class="stock-info"><span class="stock-indicator ${stockClass}">${stockText}</span></div>`;

  // Lógica para el estilo de la marca
  const marca = product.marca || 'Macs';
  let marcaClass = '';
  if (marca.toLowerCase() === 'macs') {
    marcaClass = 'rgb-text';
  }
  const marcaHTML = `<p class="product-card__brand ${marcaClass}">${marca}</p>`;

  card.innerHTML = `
    <a href="producto-detalle.html?id=${product.id}" class="product-card__image-container">
      <img src="${imagenUrlCompleta}" alt="${product.nombre}" class="product-card__image" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x300.png?text=Imagen no disponible';">
      <div class="product-card__overlay">Ver Producto</div>
    </a>
    <div class="product-card__info">
      ${marcaHTML}
      ${stockInfoHTML}
      <h3 class="product-card__name"><a href="producto-detalle.html?id=${product.id}">${product.nombre}</a></h3>
      <p class="product-card__price">${precioFormateado}</p>
    </div>
    <button class="product-card__btn">Agregar al carrito</button>
  `;

  const addToCartBtn = card.querySelector('.product-card__btn');
  addToCartBtn.addEventListener('click', () => {
    const productData = {
      id: product.id,
      nombre: product.nombre,
      precio: product.precio,
      imagen_icono: imagenUrl, // Usar la misma URL de imagen
      marca: product.marca
    };
    agregarAlCarrito(productData);
  });

  return card;
}

document.addEventListener("DOMContentLoaded", () => {
  const productPageContainer = document.getElementById("productos-container");
  const loader = document.getElementById("loader");
  const searchInput = document.getElementById("search-input");

  if (typeof agregarAlCarrito === 'undefined' || typeof createProductLinkElement === 'undefined') {
    console.error("Error: El script 'cart.js' o la función 'createProductLinkElement' no están disponibles.");
    return;
  }

  const API_URL = 'http://localhost:3001/api/productos';
  let allProductsInCategory = [];
  let currentlyDisplayedProducts = [];
  let productsLoaded = 0;
  const productsPerLoad = 8;
  let isLoading = false;

  async function initializeApp() {
    if (!productPageContainer) return;

    const categorySection = document.querySelector('main.productos-pagina > section');
    let brandName = '';
    let categoryFilter = '';

    if (categorySection) {
        if (categorySection.id) {
            brandName = categorySection.id.replace('productos-', '');
        }
        if (categorySection.dataset.categoria) {
            categoryFilter = categorySection.dataset.categoria.toLowerCase();
        }
    }

    if (!brandName || !categoryFilter) {
      console.error("No se pudo determinar la marca o categoría de la página.");
      productPageContainer.innerHTML = "<p>Error: Configuración de página incompleta.</p>";
      return;
    }

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Error en la petición: ${response.statusText}`);
      const allProducts = await response.json();

      allProductsInCategory = allProducts.filter(p => {
        // La propiedad correcta es 'categoria_nombre', no 'categoria'.
        if (!p.marca || !p.categoria_nombre) return false;
        
        const marcaLowerCase = p.marca.toLowerCase();
        const categoriaLowerCase = p.categoria_nombre.toLowerCase();
        
        const brandMatch = brandName.includes(marcaLowerCase) || marcaLowerCase.includes(brandName);
        // Hacemos el filtro de categoría más flexible (ej. 'gorras' coincide con 'gorra')
        const categoryMatch = categoryFilter.includes(categoriaLowerCase) || categoriaLowerCase.includes(categoryFilter);

        return brandMatch && categoryMatch;
      });
      currentlyDisplayedProducts = [...allProductsInCategory];

      renderProductPageItems(true);

      window.addEventListener('scroll', handleInfiniteScroll, { passive: true });

      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        // Filtra solo sobre los productos que ya pertenecen a la categoría y marca correctas
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
      const productElement = createProductLinkElement(product);
      fragment.appendChild(productElement);
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
