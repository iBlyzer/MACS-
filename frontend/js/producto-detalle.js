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

    detalleContainer.innerHTML = ''; // Limpiar contenido anterior

    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { 
        style: 'currency', currency: 'COP', minimumFractionDigits: 0 
    }).format(value);

    // --- Columna de Galería ---
    const galleryColumn = document.createElement('div');
    galleryColumn.className = 'product-gallery';
    const images = [product.imagen_frontal, product.imagen_trasera, product.imagen_lateral_izquierda, product.imagen_lateral_derecha].filter(Boolean);
    galleryColumn.innerHTML = `
        <div class="main-image-container">
            <img id="main-product-image" src="${getImageUrl(images.length > 0 ? images[0] : '')}" alt="Vista principal del producto">
            <button class="gallery-nav-btn prev" id="slider-prev">&#10094;</button>
            <button class="gallery-nav-btn next" id="slider-next">&#10095;</button>
        </div>
        <div class="thumbnail-slider">
            <div class="thumbnails" id="thumbnails">
                ${images.map((img, index) => `<img src="${getImageUrl(img)}" alt="Miniatura ${index + 1}" class="thumbnail-item ${index === 0 ? 'active' : ''}" data-index="${index}">`).join('')}
            </div>
        </div>
    `;

    // --- Columna de Información ---
    const infoColumn = document.createElement('div');
    infoColumn.className = 'detalle-info';
    const priceAndActionsHTML = `
        <div class="price-box-container">
            <div class="main-prices">
                <span id="unit-price" class="price-offer"></span>
                <span id="total-price" class="price-normal"></span>
            </div>
            <div id="discount-message" class="discount-message"></div>
            <div id="tiered-prices-display" class="tiered-prices"></div>
        </div>
        
        <div class="actions-wrapper">
            ${product.stock > 0 ? `
                <div class="quantity-control">
                    <button type="button" class="quantity-btn minus">-</button>
                    <input type="number" id="quantity-input" value="1" min="1" max="${product.stock}">
                    <button type="button" class="quantity-btn plus">+</button>
                </div>
                <button id="add-to-cart-main" class="add-to-cart-btn">Añadir a la cesta</button>
            ` : `<p class="stock-agotado">AGOTADO</p>`}
        </div>

        <button class="personalize-btn">
            Personalizar ahora <i class="fab fa-whatsapp"></i>
        </button>
    `;
    const colorRGB = product.color_rgb || '128, 128, 128'; // Fallback a gris
    const stockText = product.stock > 0 ? `EN STOCK (${product.stock})` : 'AGOTADO';
    const stockClass = product.stock > 0 ? 'in-stock' : 'out-of-stock';

    infoColumn.innerHTML = `
        <div class="brand-stock-container">
            <p class="product-brand">${product.marca || 'Macs'}</p>
            <div class="stock-info">
                <span class="stock-indicator ${stockClass}">${stockText}</span>
            </div>
        </div>
        <h1>${product.nombre}</h1>
        <p class="ref">REF: ${product.numero_referencia || 'N/A'}</p>
        ${priceAndActionsHTML}
        <div class="descripcion">
            <h3>Descripción</h3>
            <p>${product.descripcion ? product.descripcion.replace(/\n/g, '<br>') : 'Sin descripción.'}</p>
        </div>
    `;
    
    // --- Contenedor Principal ---
    const mainContainer = document.createElement('div');
    mainContainer.className = 'detalle-producto-main';
    mainContainer.appendChild(galleryColumn);
    mainContainer.appendChild(infoColumn);
    detalleContainer.appendChild(mainContainer);

    setupImageGallery(images);
    if (product.stock > 0) {
        setupDynamicPricing(product, formatCurrency);

        // Lógica para los botones de cantidad
        const quantityInput = document.getElementById('quantity-input');
        const plusBtn = document.querySelector('.quantity-btn.plus');
        const minusBtn = document.querySelector('.quantity-btn.minus');

        if (quantityInput && plusBtn && minusBtn) {
            plusBtn.addEventListener('click', () => {
                let currentValue = parseInt(quantityInput.value);
                const maxStock = parseInt(quantityInput.max);
                if (currentValue < maxStock) {
                    quantityInput.value = currentValue + 1;
                    quantityInput.dispatchEvent(new Event('input')); // Disparar evento para actualizar precios
                }
            });

            minusBtn.addEventListener('click', () => {
                let currentValue = parseInt(quantityInput.value);
                if (currentValue > 1) {
                    quantityInput.value = currentValue - 1;
                    quantityInput.dispatchEvent(new Event('input')); // Disparar evento para actualizar precios
                }
            });
        }
    }
}

function setupDynamicPricing(product, formatCurrency) {
    const quantityInput = document.getElementById('quantity-input');
    if (!quantityInput) return;

    const basePrice = 20000;
    const priceTiers = [
        { min: 200, price: 13000 },
        { min: 100, price: 14000 },
        { min: 50, price: 15000 },
        { min: 25, price: 16000 },
        { min: 13, price: 17000 },
        { min: 1, price: 20000 }
    ];

    const unitPriceEl = document.getElementById('unit-price');
    const totalPriceEl = document.getElementById('total-price');
    const discountMessageEl = document.getElementById('discount-message');
    const tieredPricesDisplayEl = document.getElementById('tiered-prices-display');

    if (tieredPricesDisplayEl) {
        const tiersForDisplay = [
            { tier: priceTiers.find(t => t.min === 1), label: "de 1 a 12 unds" },
            { tier: priceTiers.find(t => t.min === 13), label: "de 13 a 24 unds" },
            { tier: priceTiers.find(t => t.min === 25), label: "por 25+ unds" },
            { tier: priceTiers.find(t => t.min === 50), label: "por 50+ unds" },
            { tier: priceTiers.find(t => t.min === 100), label: "por 100+ unds" },
            { tier: priceTiers.find(t => t.min === 200), label: "por 200+ unds" },
        ].filter(item => item.tier);

        const row1 = tiersForDisplay.slice(0, 4);
        const row2 = tiersForDisplay.slice(4);

        const generateHtml = (tiers) => tiers.map(item => `
            <div class="tiered-price-item">
                <span class="tiered-price-value">${formatCurrency(item.tier.price)}</span>
                <span class="tiered-price-qty">${item.label}</span>
            </div>
        `).join('');

        tieredPricesDisplayEl.innerHTML = `
            <div class="tiered-prices-row">${generateHtml(row1)}</div>
            <div class="tiered-prices-row centered-row">${generateHtml(row2)}</div>
        `;
    }

    function updatePrices(quantity) {
        if (!quantity || quantity < 1) quantity = 1;
        if (quantity > product.stock) {
            quantity = product.stock;
            if(quantityInput) quantityInput.value = product.stock;
        }

        const tier = priceTiers.find(t => quantity >= t.min);
        const unitPrice = tier ? tier.price : basePrice;
        const totalPrice = unitPrice * quantity;

        if (unitPriceEl) unitPriceEl.textContent = formatCurrency(unitPrice);
        if (totalPriceEl) totalPriceEl.textContent = formatCurrency(totalPrice);
        if (quantityInput) quantityInput.dataset.currentPrice = unitPrice;

        if (discountMessageEl) {
            if (quantity > 12) {
                const totalDiscount = (basePrice - unitPrice) * quantity;
                discountMessageEl.textContent = `Descuento de ${formatCurrency(totalDiscount)} por ${quantity} unidades`;
                discountMessageEl.style.display = 'block';
            } else {
                discountMessageEl.textContent = '';
                discountMessageEl.style.display = 'none';
            }
        }
    }

    quantityInput.addEventListener('input', () => updatePrices(parseInt(quantityInput.value, 10)));
    updatePrices(parseInt(quantityInput.value, 10));

    const addToCartBtn = document.getElementById('add-to-cart-main');
    if(addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            if (typeof agregarAlCarrito !== 'undefined') {
                const selectedQuantity = parseInt(quantityInput.value, 10);
                const currentPrice = parseFloat(quantityInput.dataset.currentPrice) || product.precio;
                agregarAlCarrito({ ...product, precio: currentPrice, cantidad: selectedQuantity });
            }
        });
    }
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
