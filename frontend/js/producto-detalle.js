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

    // --- Crear columnas principales ---
    const galleryColumn = document.createElement('div');
    galleryColumn.className = 'product-gallery';
    
    const infoColumn = document.createElement('div');
    infoColumn.className = 'detalle-info';

    // --- Añadir columnas al DOM ---
    detalleContainer.appendChild(galleryColumn);
    detalleContainer.appendChild(infoColumn);

    // --- Llenar la columna de Información ---
    const brandStockContainer = document.createElement('div');
    brandStockContainer.className = 'brand-stock-container';
    brandStockContainer.innerHTML = `
        <p class="product-brand">${product.marca || 'Macs'}</p>
        <div class="stock-info">
            <span class="stock-indicator ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                ${product.stock > 0 ? `EN STOCK (${product.stock})` : 'AGOTADO'}
            </span>
        </div>
    `;

    const productName = document.createElement('h1');
    productName.textContent = product.nombre;

    const productRef = document.createElement('p');
    productRef.className = 'ref';
    productRef.innerHTML = `<span class="ref-number">REF: ${product.numero_referencia || 'N/A'}</span><span class="unpersonalized-text">¡Gorra sin personalizar!</span>`;

    const priceBoxContainer = document.createElement('div');
    priceBoxContainer.className = 'price-box-container';
    priceBoxContainer.innerHTML = `
        <div class="main-prices">
            <span id="unit-price" class="price-offer"></span>
            <span id="total-price" class="price-normal"></span>
        </div>
        <div id="discount-message" class="discount-message"></div>
        <div id="tiered-prices-display" class="tiered-prices"></div>
    `;

    // --- Tallas ---
    const sizesContainer = document.createElement('div');
    sizesContainer.className = 'sizes-container';
    sizesContainer.innerHTML = `
        <h3 class="sizes-title">TALLA</h3>
        <div class="size-options">
            <button class="size-option selected" disabled>OS</button>
        </div>
    `;

    // --- Controles de Compra (Cantidad, Personalizar, Añadir) ---
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';

    const personalizeBtnHTML = `<a href="https://wa.me/573204829726?text=Hola,%20estoy%20interesado%20en%20personalizar%20el%20producto:%20${encodeURIComponent(product.nombre)}%20(REF:%20${product.numero_referencia})" target="_blank" class="personalize-btn">Personalizar ahora <i class="fa-brands fa-whatsapp"></i></a>`;

    if (product.stock > 0) {
        controlsContainer.innerHTML = `
            <div class="quantity-selector">
                <button id="decrease-quantity">-</button>
                <input type="number" id="quantity" value="1" min="1" max="${product.stock}">
                <button id="increase-quantity">+</button>
            </div>
            ${personalizeBtnHTML}
            <button id="add-to-cart-btn" class="add-to-cart-btn">AÑADIR A LA CESTA</button>
        `;
    } else {
        controlsContainer.innerHTML = personalizeBtnHTML;
    }

    // --- Descripción ---
    const descriptionContainer = document.createElement('div');
    descriptionContainer.className = 'descripcion-container';
    descriptionContainer.innerHTML = `
        <h3 class="descripcion-title">Descripción</h3>
        <p class="descripcion-text">${product.descripcion}</p>
    `;

    // --- Añadir elementos a la columna de información ---
    infoColumn.appendChild(brandStockContainer);
    infoColumn.appendChild(productName);
    infoColumn.appendChild(productRef);
    infoColumn.appendChild(priceBoxContainer);
    infoColumn.appendChild(controlsContainer);
    infoColumn.appendChild(sizesContainer);
    infoColumn.appendChild(descriptionContainer);

    // --- Configurar funcionalidades ---
    setupImageGallery(product, galleryColumn);

    if (product.stock > 0) {
        setupDynamicPricing(product, formatCurrency);

        document.getElementById('add-to-cart-btn').addEventListener('click', () => {
            const quantityInput = document.getElementById('quantity');
            const quantity = parseInt(quantityInput.value, 10);
            if (typeof agregarAlCarrito !== 'undefined') {
                const currentPrice = parseFloat(quantityInput.dataset.currentPrice) || product.precio;
                agregarAlCarrito({ ...product, precio: currentPrice }, quantity);
            } else {
                console.error('La función agregarAlCarrito no está definida.');
            }
        });

        const quantityInput = document.getElementById('quantity');
        const increaseBtn = document.getElementById('increase-quantity');
        const decreaseBtn = document.getElementById('decrease-quantity');

        increaseBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue < product.stock) {
                quantityInput.value = currentValue + 1;
                quantityInput.dispatchEvent(new Event('input'));
            }
        });

        decreaseBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
                quantityInput.dispatchEvent(new Event('input'));
            }
        });
    }
}

function setupDynamicPricing(product, formatCurrency) {
    const quantityInput = document.getElementById('quantity');
    if (!quantityInput) return;

    const basePrice = product.precio;
    const priceTiers = [
        { min: 200, price: 13000 },
        { min: 100, price: 14000 },
        { min: 50, price: 15000 },
        { min: 25, price: 16000 },
        { min: 13, price: 17000 },
        { min: 1, price: basePrice }
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

        const row1 = tiersForDisplay.slice(0, 3);
        const row2 = tiersForDisplay.slice(3);

        const generateHtml = (tiers) => tiers.map(item => `
            <div class="tiered-price-item">
                <span class="tiered-price-value">${formatCurrency(item.tier.price)}</span>
                <span class="tiered-price-qty">${item.label}</span>
            </div>
        `).join('');

        tieredPricesDisplayEl.innerHTML = `
            <div class="tiered-prices-row">${generateHtml(row1)}</div>
            <div class="tiered-prices-row">${generateHtml(row2)}</div>
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
        if (totalPriceEl) totalPriceEl.textContent = `Total: ${formatCurrency(totalPrice)}`;
        if (quantityInput) quantityInput.dataset.currentPrice = unitPrice;

        if (discountMessageEl) {
            if (unitPrice < basePrice) {
                const totalDiscount = (basePrice - unitPrice) * quantity;
                discountMessageEl.textContent = `¡Ahorras ${formatCurrency(totalDiscount)}!`;
                discountMessageEl.style.display = 'block';
            } else {
                discountMessageEl.textContent = '';
                discountMessageEl.style.display = 'none';
            }
        }
    }

    quantityInput.addEventListener('input', () => updatePrices(parseInt(quantityInput.value, 10)));
    updatePrices(parseInt(quantityInput.value, 10));
}

function setupImageGallery(product, container) {
    const images = (product.Imagenes && Array.isArray(product.Imagenes))
        ? product.Imagenes.map(img => img.ruta_imagen).filter(Boolean)
        : [];

    if (!container) return;

    if (images.length === 0) {
        container.innerHTML = `<img src="https://via.placeholder.com/500x500.png?text=Imagen+no+disponible" alt="Imagen no disponible" style="width: 100%; border-radius: 12px;">`;
        return;
    }

    container.innerHTML = `
        <div style="--swiper-navigation-color: #000; --swiper-pagination-color: #000" class="swiper gallery-top">
            <div class="swiper-wrapper">
                ${images.map(img => `
                    <div class="swiper-slide">
                        <div class="zoom-container">
                            <img src="${getImageUrl(img)}" alt="Imagen del producto">
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="swiper-button-next"></div>
            <div class="swiper-button-prev"></div>
        </div>
        <div class="swiper gallery-thumbs">
            <div class="swiper-wrapper">
                ${images.map(img => `
                    <div class="swiper-slide">
                        <img src="${getImageUrl(img)}" alt="Miniatura del producto">
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    const galleryThumbs = new Swiper(container.querySelector('.gallery-thumbs'), {
        spaceBetween: 10,
        slidesPerView: 5,
        freeMode: true,
        watchSlidesProgress: true,
        centerInsufficientSlides: true,
    });

    const galleryTop = new Swiper(container.querySelector('.gallery-top'), {
        spaceBetween: 10,
        navigation: {
            nextEl: container.querySelector('.swiper-button-next'),
            prevEl: container.querySelector('.swiper-button-prev'),
        },
        thumbs: {
            swiper: galleryThumbs,
        },
    });

    galleryTop.on('click', function () {
        openImageModal(product, this.realIndex);
    });

    const zoomContainers = container.querySelectorAll('.zoom-container');
    zoomContainers.forEach(zoomContainer => {
        const img = zoomContainer.querySelector('img');
        zoomContainer.addEventListener('mousemove', (e) => {
            const rect = zoomContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
        });
        zoomContainer.addEventListener('mouseleave', () => {
            img.style.transformOrigin = 'center center';
        });
    });
}

function openImageModal(product, startIndex) {
    const images = (product.Imagenes && Array.isArray(product.Imagenes))
        ? product.Imagenes.map(img => img.ruta_imagen).filter(Boolean)
        : [];
    
    if (images.length === 0) return;

    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="image-modal-content">
            <span class="modal-close-btn">&times;</span>
            <div style="--swiper-navigation-color: #fff; --swiper-pagination-color: #fff" class="swiper modal-gallery-top">
                <div class="swiper-wrapper">
                    ${images.map(img => `
                        <div class="swiper-slide">
                            <div class="swiper-zoom-container">
                                <img src="${getImageUrl(img)}" alt="Imagen del producto">
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="swiper-button-next"></div>
                <div class="swiper-button-prev"></div>
            </div>
            
            <div class="modal-bottom-container">
                <div class="modal-product-info">${product.nombre || ''}</div>
                <div class="swiper modal-gallery-thumbs">
                    <div class="swiper-wrapper">
                        ${images.map(img => `
                            <div class="swiper-slide">
                                <img src="${getImageUrl(img)}" alt="Miniatura del producto">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const modalThumbs = new Swiper(modal.querySelector('.modal-gallery-thumbs'), {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesProgress: true,
        breakpoints: { 500: { slidesPerView: 5 }, 768: { slidesPerView: 6 } }
    });

    const modalTop = new Swiper(modal.querySelector('.modal-gallery-top'), {
        spaceBetween: 10,
        navigation: {
            nextEl: modal.querySelector('.swiper-button-next'),
            prevEl: modal.querySelector('.swiper-button-prev'),
        },
        thumbs: { swiper: modalThumbs },
        zoom: false, // Desactivamos el zoom nativo para usar el nuestro
    });

    modalTop.slideTo(startIndex, 0);

    // Lógica para el zoom dinámico en el modal
    const zoomContainers = modal.querySelectorAll('.swiper-zoom-container');
    zoomContainers.forEach(container => {
        const img = container.querySelector('img');
        container.addEventListener('mousemove', (e) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const xPercent = (x / rect.width) * 100;
            const yPercent = (y / rect.height) * 100;
            img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
        });
        container.addEventListener('mouseleave', () => {
            img.style.transformOrigin = 'center center';
        });
    });

    const closeModal = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEsc);
    };

    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };

    modal.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    document.addEventListener('keydown', handleEsc);
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
