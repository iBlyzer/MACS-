document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productoId = urlParams.get('id');
  const detalleContainer = document.getElementById('detalle-producto-container');

  if (!productoId) {
    if(detalleContainer) detalleContainer.innerHTML = '<p>Producto no especificado.</p>';
    return;
  }

  try {
    const response = await fetch(`http://localhost:3001/api/productos/${productoId}`);
    if (!response.ok) {
      throw new Error('Producto no encontrado');
    }
    const producto = await response.json();

    renderizarProductoPrincipal(producto);
    await cargarRecomendados(producto.categoria_id, producto.id);

  } catch (error) {
    console.error('Error al cargar el producto:', error);
    if(detalleContainer) detalleContainer.innerHTML = `<p>Error al cargar el producto: ${error.message}</p>`;
  }
});

function getImageUrl(imagePath) {
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
        return 'https://via.placeholder.com/400x400.png?text=Imagen';
    }
    return `http://localhost:3001${imagePath}`;
}

function renderizarProductoPrincipal(product) {
    const detalleContainer = document.getElementById('detalle-producto-container');
    if (!detalleContainer) return;

    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { 
        style: 'currency', currency: 'COP', minimumFractionDigits: 0 
    }).format(value);

    const precioFormateado = formatCurrency(product.precio);

    const images = [
        product.imagen_frontal,
        product.imagen_trasera,
        product.imagen_lateral_izquierda,
        product.imagen_lateral_derecha
    ].filter(Boolean);

    const galleryHTML = `
    <div class="product-gallery">
        <div class="main-image-container">
            <img id="main-product-image" src="${getImageUrl(images[0])}" alt="Vista principal del producto">
            <button class="gallery-nav-btn prev" id="slider-prev">&#10094;</button>
            <button class="gallery-nav-btn next" id="slider-next">&#10095;</button>
        </div>
        <div class="thumbnail-slider">
            <div class="thumbnails" id="thumbnails">
                ${images.map((img, index) => `
                    <img src="${getImageUrl(img)}" alt="Miniatura ${index + 1}" class="thumbnail-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                `).join('')}
            </div>
        </div>
    </div>
  `;

    const infoHTML = `
      <div class="detalle-info">
          <p class="product-brand">${product.marca || 'Macs'}</p>
          <h1>${product.nombre}</h1>
          <p class="ref">REF: ${product.numero_referencia || 'N/A'}</p>
          
          <div class="price-main-container">
            <p class="price" id="dynamic-price">${precioFormateado}</p>
            <div class="tiered-prices">
              <div class="tiered-price-item">
                <p class="tiered-price">${formatCurrency(18000)}</p>
                <p class="tiered-condition">por 50 unidades</p>
              </div>
              <div class="tiered-price-item">
                <p class="tiered-price">${formatCurrency(16000)}</p>
                <p class="tiered-condition">por 100 unidades</p>
              </div>
            </div>
          </div>
          <p id="discount-message" class="discount-message"></p>

          <div class="stock-section">
              ${product.stock > 0 ? `
                  <p class="stock-title">Stock disponible</p>
                  <div class="quantity-selector">
                      <label for="quantity-input">Cantidad:</label>
                      <input type="number" id="quantity-input" name="quantity" value="1" min="1" max="${product.stock}" />
                      <span class="stock-available">(${product.stock} disponibles)</span>
                  </div>
              ` : `<p class="stock-agotado">AGOTADO</p>`}
          </div>
          <div class="tallas"><p>TALLAS</p><button class="talla-btn active">OS</button></div>
          <button id="add-to-cart-main" class="add-to-cart-btn" ${product.stock === 0 ? 'disabled' : ''}>
              ${product.stock > 0 ? 'AGREGAR AL CARRITO' : 'SIN STOCK'}
          </button>
          <div class="descripcion">
              <h3>Descripción</h3>
              <p>${product.descripcion ? product.descripcion.replace(/\n/g, '<br>') : 'Sin descripción.'}</p>
          </div>
      </div>
  `;

    detalleContainer.innerHTML = galleryHTML + infoHTML;

    setupImageGallery(images);

    if (product.stock > 0) {
        setupDynamicPricing(product, formatCurrency);
    }
}

function setupDynamicPricing(product, formatCurrency) {
    const quantityInput = document.getElementById('quantity-input');
    const priceDisplay = document.getElementById('dynamic-price');
    const discountMessage = document.getElementById('discount-message');
    const addToCartBtn = document.getElementById('add-to-cart-main');

    const basePrice = product.precio;
    const priceTier1 = 18000;
    const priceTier2 = 16000;

    let currentPrice = basePrice;

    quantityInput.addEventListener('input', () => {
        let quantity = parseInt(quantityInput.value, 10);

        if (isNaN(quantity) || quantity < 1) {
            quantity = 1;
            quantityInput.value = 1;
        }

        if (quantity > product.stock) {
            quantity = product.stock;
            quantityInput.value = product.stock;
        }

        if (quantity >= 100) {
            currentPrice = priceTier2;
            priceDisplay.textContent = formatCurrency(currentPrice);
            discountMessage.textContent = `Descuento de ${formatCurrency(priceTier2)}`;
            discountMessage.style.display = 'block';
        } else if (quantity >= 50) {
            currentPrice = priceTier1;
            priceDisplay.textContent = formatCurrency(currentPrice);
            discountMessage.textContent = `Descuento de ${formatCurrency(priceTier1)}`;
            discountMessage.style.display = 'block';
        } else {
            currentPrice = basePrice;
            priceDisplay.textContent = formatCurrency(currentPrice);
            discountMessage.style.display = 'none';
        }
    });

    addToCartBtn.addEventListener('click', () => {
        if (typeof agregarAlCarrito !== 'undefined') {
            const selectedQuantity = parseInt(quantityInput.value, 10);
            const productToAdd = {
                ...product,
                precio: currentPrice, // Usar el precio dinámico actual
                cantidad: selectedQuantity
            };
            agregarAlCarrito(productToAdd);
        }
    });
}

function setupImageGallery(images) {
    const mainImage = document.getElementById('main-product-image');
    const thumbnailsContainer = document.getElementById('thumbnails');
    const allThumbnails = thumbnailsContainer.querySelectorAll('.thumbnail-item');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');
    
    let currentIndex = 0;

    function updateMainImage(index) {
        currentIndex = index;
        const newSrc = getImageUrl(images[index]);
        mainImage.src = newSrc;
        allThumbnails.forEach(thumb => thumb.classList.remove('active'));
        thumbnailsContainer.querySelector(`[data-index="${index}"]`).classList.add('active');
    }

    thumbnailsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('thumbnail-item')) {
            updateMainImage(parseInt(e.target.dataset.index, 10));
        }
    });

    prevBtn.addEventListener('click', () => {
        const newIndex = (currentIndex - 1 + images.length) % images.length;
        updateMainImage(newIndex);
    });

    nextBtn.addEventListener('click', () => {
        const newIndex = (currentIndex + 1) % images.length;
        updateMainImage(newIndex);
    });

    // --- New In-place Zoom & Modal Trigger ---
    const mainImageContainer = mainImage.parentElement;
    const zoomFactor = 1.75;

    mainImageContainer.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 992) return;
        const rect = mainImageContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        mainImage.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    });

    mainImageContainer.addEventListener('mouseenter', () => {
        if (window.innerWidth < 992) return;
        mainImage.style.transform = `scale(${zoomFactor})`;
    });

    mainImageContainer.addEventListener('mouseleave', () => {
        mainImage.style.transform = 'scale(1)';
        mainImage.style.transformOrigin = 'center center';
    });

    mainImageContainer.addEventListener('click', (e) => {
        // Prevent modal from opening when clicking nav buttons
        if (e.target.classList.contains('gallery-nav-btn')) {
            return;
        }
        openImageModal(images, currentIndex);
    });
}

function openImageModal(images, startIndex) {
    document.body.style.overflow = 'hidden';

    const modalHTML = `
        <div class="image-modal-overlay" id="image-modal-overlay">
            <button class="image-modal-close" id="image-modal-close">&times;</button>
            <div class="image-modal-content">
                <div class="modal-main-image-wrapper">
                    <div class="modal-main-image-container">
                        <img id="modal-main-image" src="${getImageUrl(images[startIndex])}" alt="Vista ampliada del producto">
                    </div>
                    <button class="modal-nav-btn prev" id="modal-prev">&#10094;</button>
                    <button class="modal-nav-btn next" id="modal-next">&#10095;</button>
                </div>
                <div class="modal-thumbnails">
                    ${images.map((img, index) => `
                        <img src="${getImageUrl(img)}" alt="Miniatura modal ${index + 1}" class="modal-thumbnail-item ${index === startIndex ? 'active' : ''}" data-index="${index}">
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modalOverlay = document.getElementById('image-modal-overlay');
    const modalMainImage = document.getElementById('modal-main-image');
    const modalThumbnailsContainer = modalOverlay.querySelector('.modal-thumbnails');
    const modalPrevBtn = document.getElementById('modal-prev');
    const modalNextBtn = document.getElementById('modal-next');
    const closeModalBtn = document.getElementById('image-modal-close');

    let currentModalIndex = startIndex;

    function updateModalImage(index) {
        currentModalIndex = index;
        modalMainImage.src = getImageUrl(images[index]);
        modalOverlay.querySelectorAll('.modal-thumbnail-item').forEach(thumb => thumb.classList.remove('active'));
        modalOverlay.querySelector(`.modal-thumbnail-item[data-index="${index}"]`).classList.add('active');
        // Reset zoom when image changes
        modalMainImage.style.transform = 'scale(1)';
        modalMainImage.style.transformOrigin = 'center center';
    }

    modalThumbnailsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-thumbnail-item')) {
            updateModalImage(parseInt(e.target.dataset.index, 10));
        }
    });

    modalPrevBtn.addEventListener('click', () => {
        const newIndex = (currentModalIndex - 1 + images.length) % images.length;
        updateModalImage(newIndex);
    });

    modalNextBtn.addEventListener('click', () => {
        const newIndex = (currentModalIndex + 1) % images.length;
        updateModalImage(newIndex);
    });

    const closeModal = () => {
        document.body.style.overflow = '';
        if (modalOverlay) {
            modalOverlay.remove();
        }
    };

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // --- Zoom logic for modal image ---
    const modalImageContainer = modalMainImage.parentElement;
    const modalZoomFactor = 2;

    modalImageContainer.addEventListener('mousemove', (e) => {
        const rect = modalImageContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;

        modalMainImage.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    });

    modalImageContainer.addEventListener('mouseenter', () => {
        modalMainImage.style.transform = `scale(${modalZoomFactor})`;
    });

    modalImageContainer.addEventListener('mouseleave', () => {
        modalMainImage.style.transform = 'scale(1)';
        modalMainImage.style.transformOrigin = 'center center';
    });
}

async function cargarRecomendados(categoriaId, excludeId) {
  const track = document.getElementById('recomendados-track');
  if (!track) return;

  try {
    const response = await fetch(`http://localhost:3001/api/productos/recomendados?categoriaId=${categoriaId}&excludeId=${excludeId}&limit=8`);
    if (!response.ok) throw new Error('No se pudieron cargar las recomendaciones.');
    
    const recomendados = await response.json();
    track.innerHTML = '';

    if (recomendados.length < 4) {
      document.getElementById('recomendados').style.display = 'none';
      return;
    }

    recomendados.forEach(recProduct => {
      const productElement = document.createElement('div');
      productElement.className = 'product-card'; // Estandarizar clase

      const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(recProduct.precio);
      const imagenUrl = recProduct.imagen_icono ? `http://localhost:3001${recProduct.imagen_icono}` : 'https://via.placeholder.com/300x300.png?text=Imagen';

      // Usar la nueva estructura estandarizada con overlay
      productElement.innerHTML = `
        <a href="producto-detalle.html?id=${recProduct.id}" class="product-card__image-container">
            <img src="${imagenUrl}" alt="${recProduct.nombre}" class="product-card__image" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x300.png?text=Imagen';">
            <div class="product-card__overlay">Ver Producto</div>
        </a>
        <div class="product-card__info">
            <p class="product-card__brand">${recProduct.marca || 'Macs'}</p>
            <h4 class="product-card__name"><a href="producto-detalle.html?id=${recProduct.id}">${recProduct.nombre}</a></h4>
            <p class="product-card__price">${precioFormateado}</p>
        </div>
        <button class="product-card__btn add-to-cart">Agregar al Carrito</button>
      `;

      productElement.querySelector('.add-to-cart').addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof agregarAlCarrito !== 'undefined') {
          agregarAlCarrito(recProduct);
        }
      });

      track.appendChild(productElement);
    });

    if (recomendados.length > 0) setupCarousel(recomendados.length);

  } catch (error) {
    console.error('Error al cargar recomendados:', error);
    document.getElementById('recomendados').style.display = 'none';
  }
}

function setupCarousel(itemCount) {
  const track = document.getElementById('recomendados-track');
  const prevBtn = document.getElementById('recomendados-prev');
  const nextBtn = document.getElementById('recomendados-next');
  
  let currentIndex = 0;
  const itemsVisible = 4;

  if (itemCount <= itemsVisible) {
      prevBtn.style.display = 'none';
      nextBtn.style.display = 'none';
      return;
  }

  function updateCarousel() {
    const itemWidth = track.querySelector('.product-card').getBoundingClientRect().width;
    track.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    prevBtn.style.display = currentIndex === 0 ? 'none' : 'flex';
    nextBtn.style.display = currentIndex >= itemCount - itemsVisible ? 'none' : 'flex';
  }

  nextBtn.addEventListener('click', () => {
    if (currentIndex < itemCount - itemsVisible) {
      currentIndex++;
      updateCarousel();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });

  window.addEventListener('resize', updateCarousel);
  updateCarousel();
}
