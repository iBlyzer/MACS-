document.addEventListener("DOMContentLoaded", () => {
  const productPageContainer = document.getElementById("productos-container");
  const seeMoreBtn = document.getElementById("ver-mas-btn");

  const API_URL = 'http://localhost:3001/api/productos';
  let allProducts = [];
  let displayedProducts = [];
  let productsLoaded = 0;
  const productsPerLoad = 8;

  async function initializeApp() {
    // Solo se ejecuta en la página de "Gorras Macs"
    if (!productPageContainer || !seeMoreBtn) return;

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`Error en la petición: ${response.statusText}`);
      allProducts = await response.json();
      
      displayedProducts = allProducts.filter(p => p.marca && p.marca.toLowerCase().includes('macs'));
      renderProductPageItems();
      seeMoreBtn.addEventListener('click', renderProductPageItems);

    } catch (error) {
      console.error("Error al inicializar la aplicación:", error);
      productPageContainer.innerHTML = "<p>No se pudieron cargar los productos. Inténtalo de nuevo más tarde.</p>";
    }
  }

  function renderProductPageItems() {
    const fragment = document.createDocumentFragment();
    const end = Math.min(productsLoaded + productsPerLoad, displayedProducts.length);

    if (productsLoaded >= displayedProducts.length) {
      seeMoreBtn.style.display = "none";
      return;
    }
    
    for (let i = productsLoaded; i < end; i++) {
      const product = displayedProducts[i];
      const productElement = createProductLinkElement(product);
      fragment.appendChild(productElement);
    }

    productPageContainer.appendChild(fragment);
    productsLoaded = end;

    if (productsLoaded >= displayedProducts.length) {
      seeMoreBtn.style.display = "none";
    }
  }

  function createProductLinkElement(product) {
      const divProducto = document.createElement("div");
      divProducto.className = "producto";
      
      const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.precio);
      const imagenUrl = product.imagen_principal ? `http://localhost:3001${product.imagen_principal}` : 'https://via.placeholder.com/300x300.png?text=Imagen+no+disponible';

      divProducto.innerHTML = `
        <a href="producto-detalle.html?id=${product.id}" class="producto-link">
          <img src="${imagenUrl}" alt="${product.nombre}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x300.png?text=Imagen+no+disponible';">
          <div class="overlay-text">Ver Producto</div>
        </a>
        <div class="producto-info">
            <p class="marca">${product.marca || 'Macs'}</p>
            <h3><a href="producto-detalle.html?id=${product.id}">${product.nombre}</a></h3>
            <p class="precio">${precioFormateado}</p>
        </div>
      `;
      return divProducto;
  }
  
  initializeApp();
});
