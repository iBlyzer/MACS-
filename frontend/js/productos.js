

document.addEventListener("DOMContentLoaded", () => {
  const productPageContainer = document.getElementById("productos-container");
  const loader = document.getElementById("loader");
  const searchInput = document.getElementById("search-input");

  if (typeof agregarAlCarrito === 'undefined' || typeof createProductLinkElement === 'undefined') {
    console.error("Error: El script 'cart.js' o la función 'createProductLinkElement' no están disponibles.");
    return;
  }

  const API_URL = 'http://localhost:3000/api/productos';
  let allProductsInCategory = [];
  let currentlyDisplayedProducts = [];
  let productsLoaded = 0;
  const productsPerLoad = 8;
  let isLoading = false;

  async function initializeApp() {
    if (!productPageContainer) return;

    const categorySection = document.querySelector('main.productos-pagina > section');
    let categoryFilter = '';
    let subcategoryFilter = '';
    let brandName = ''; // For backward compatibility with Gorras pages

    if (categorySection) {
        // Get primary category filter
        if (categorySection.dataset.categoria) {
            categoryFilter = categorySection.dataset.categoria.toLowerCase();
        }
        // Get sub-category filter (new method)
        if (categorySection.dataset.subcategoria) {
            subcategoryFilter = categorySection.dataset.subcategoria.toLowerCase();
        }
        // Get brand from ID (old method for Gorras)
        if (categorySection.id && !subcategoryFilter) {
             brandName = categorySection.id.replace('productos-', '');
        }
    }

    if (!categoryFilter) {
      console.error("No se pudo determinar la categoría de la página.");
      productPageContainer.innerHTML = "<p>Error: Configuración de página incompleta.</p>";
      return;
    }

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Error en la petición: ${response.statusText}`);
      const allProducts = await response.json();

      allProductsInCategory = allProducts.filter(p => {
        const categoriaLowerCase = (p.categoria_nombre || '').toLowerCase();
        
        // 1. Must match the main category
        if (categoriaLowerCase !== categoryFilter) {
            return false;
        }

        // 2. Apply sub-filter
        if (subcategoryFilter) {
            // New method: filter by subcategory
            const subcategoriaLowerCase = (p.subcategoria_nombre || '').toLowerCase();
            return subcategoriaLowerCase === subcategoryFilter;
        } else if (brandName) {
            // Old method: filter by brand (for Gorras)
            const marcaLowerCase = (p.marca || '').toLowerCase();
            return marcaLowerCase === brandName;
        }
        
        // Fallback for pages with only a category (if any)
        return true;
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
