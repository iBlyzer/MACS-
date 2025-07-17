

document.addEventListener("DOMContentLoaded", () => {
  const productPageContainer = document.getElementById("productos-container");
  const loader = document.getElementById("loader");
  const searchInput = document.getElementById("search-input");

  if (typeof agregarAlCarrito === 'undefined' || typeof createProductLinkElement === 'undefined') {
    console.error("Error: El script 'cart.js' o la función 'createProductLinkElement' no están disponibles.");
    return;
  }

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

    // Construir la URL de la API dinámicamente
    let apiUrl = `${API_BASE_URL}/api/productos/categoria/${encodeURIComponent(categoryName)}`;
    if (subcategoryName) {
        apiUrl += `?subcategoria=${encodeURIComponent(subcategoryName)}`;
    }

    try {
      // Llamar al endpoint específico de la categoría
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Error en la petición: ${response.statusText}`);
      
      let fetchedProducts = await response.json();

      // Solo aplicar la lógica de orden estricto para la subcategoría 'Macs'
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
        // Para cualquier otra subcategoría, simplemente mostrar los productos
        allProductsInCategory = fetchedProducts;
      }
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
      if (product.isMissing) {
        const comment = document.createComment(` Producto con REF ${product.numero_referencia} falta `);
        fragment.appendChild(comment);
      } else {
        const productElement = createProductLinkElement(product);
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
