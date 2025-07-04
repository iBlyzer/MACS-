document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const productoId = urlParams.get('id');
  const detalleContainer = document.getElementById('detalle-producto-container');

  if (!productoId) {
    if(detalleContainer) detalleContainer.innerHTML = '<p>Producto no especificado.</p>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/productos/${productoId}`);
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
    const placeholder = 'https://via.placeholder.com/400x400.png?text=Sin+Imagen';
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
        return placeholder;
    }

    // Si ya es una URL completa (de Cloudinary), la devolvemos tal cual.
    if (imagePath.startsWith('http')) {
        return imagePath;
    }

    // --- Lógica para datos antiguos (legacy) ---
    // Si es solo un nombre de archivo, construimos la ruta local.
    if (!imagePath.includes('/')) {
        return `${API_BASE_URL}/uploads/${imagePath}`;
    }

    // Si es una ruta relativa (ej: /uploads/imagen.png), la completamos.
    return `${API_BASE_URL}${imagePath}`;
}

function renderizarProductoPrincipal(product) {
    const detalleContainer = document.getElementById('detalle-producto-container');
    if (!detalleContainer) return;

    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(value);

    // --- Estado de tallas y stock ---
    const hasTallas = Array.isArray(product.tallas) && product.tallas.length > 0;
    const tallasDisponibles = hasTallas ? product.tallas.filter(t => (parseInt(t.stock, 10) || 0) > 0) : [];
    const stockTotal = hasTallas 
        ? product.tallas.reduce((total, talla) => total + (parseInt(talla.stock, 10) || 0), 0)
        : (parseInt(product.stock, 10) || 0);

    let selectedTalla = null;
    let currentStock = stockTotal;

    if (hasTallas && tallasDisponibles.length > 0) {
        selectedTalla = tallasDisponibles[0];
        currentStock = parseInt(selectedTalla.stock, 10) || 0;
    }

    detalleContainer.innerHTML = ''; // Limpiar

    // --- Columnas principales ---
    const galleryColumn = document.createElement('div');
    galleryColumn.className = 'product-gallery';
    const infoColumn = document.createElement('div');
    infoColumn.className = 'detalle-info';
    detalleContainer.appendChild(galleryColumn);
    detalleContainer.appendChild(infoColumn);

    // --- Contenido de la columna de información ---
    const brandStockContainer = document.createElement('div');
    brandStockContainer.className = 'brand-stock-container';
    brandStockContainer.innerHTML = `
        <p class="product-brand">${product.marca || 'Macs'}</p>
        <div class="stock-info">
            <span id="stock-indicator" class="stock-indicator ${stockTotal > 0 ? 'in-stock' : 'out-of-stock'}">
                ${stockTotal > 0 ? 'EN STOCK' : 'AGOTADO'}
            </span>
        </div>
    `;

    const productName = document.createElement('h1');
    productName.textContent = product.nombre;

    const productRef = document.createElement('p');
    productRef.className = 'ref';
    let tipoProducto = 'Producto';
    if (product.nombre.toLowerCase().includes('gorra')) {
        tipoProducto = 'Gorra';
    } else if (product.nombre.toLowerCase().includes('sombrero')) {
        tipoProducto = 'Sombrero';
    }
    productRef.innerHTML = `<span class="ref-number">REF: ${product.numero_referencia || 'N/A'}</span><span class="unpersonalized-text">¡${tipoProducto} sin personalizar!</span>`;

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

    const sizesContainer = document.createElement('div');
    sizesContainer.className = 'sizes-container';

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';

    const descriptionContainer = document.createElement('div');
    descriptionContainer.className = 'descripcion-container';
    descriptionContainer.innerHTML = `
        <h3 class="descripcion-title">Descripción</h3>
        <p class="descripcion-text">${product.descripcion}</p>
    `;

    infoColumn.append(brandStockContainer, productName, productRef, priceBoxContainer, sizesContainer, controlsContainer, descriptionContainer);

    // --- Lógica de precios y cantidad ---
    const unitPriceEl = document.getElementById('unit-price');
    const totalPriceEl = document.getElementById('total-price');
    const discountMessageEl = document.getElementById('discount-message');
    const stockIndicatorEl = document.getElementById('stock-indicator');
    const tieredPricesDisplayEl = document.getElementById('tiered-prices-display');

    const basePrice = parseFloat(product.precio);
    const priceTiers = [
        { min: 200, price: 13000 }, { min: 100, price: 13800 },
        { min: 50, price: 14500 }, { min: 25, price: 16000 },
        { min: 13, price: 16800 }, { min: 1, price: basePrice }
    ];
    
    if (tieredPricesDisplayEl) {
        const tiersForDisplay = priceTiers.filter(t => t.min > 1 && t.price < basePrice).sort((a, b) => a.min - b.min);
        tieredPricesDisplayEl.innerHTML = tiersForDisplay.map(tier => 
            `<div class="tiered-price-item">
                <span class="tiered-condition">${tier.min} o más unidades</span>
                <span class="tiered-price">${formatCurrency(tier.price)} c/u</span>
            </div>`
        ).join('');
    }

    function updatePrices(quantity) {
        const stock = currentStock;
        if (!quantity || quantity < 1) quantity = 1;
        if (quantity > stock) quantity = stock;
        
        const quantityInput = document.getElementById('quantity');
        if (quantityInput) quantityInput.value = quantity;

        const tier = priceTiers.find(t => quantity >= t.min);
        const unitPrice = tier ? tier.price : basePrice;
        const totalPrice = unitPrice * quantity;

        if (unitPriceEl) unitPriceEl.textContent = formatCurrency(unitPrice);
        if (totalPriceEl) totalPriceEl.textContent = `Total: ${formatCurrency(totalPrice)}`;

        if (discountMessageEl) {
            const currentTierIndex = priceTiers.findIndex(t => quantity >= t.min);
            const nextTier = (currentTierIndex > 0) ? priceTiers[currentTierIndex - 1] : null;
            if (nextTier && quantity < nextTier.min) {
                const itemsNeeded = nextTier.min - quantity;
                discountMessageEl.innerHTML = `¡Añade <b>${itemsNeeded}</b> más y paga <b>${formatCurrency(nextTier.price)}</b> por unidad!`;
                discountMessageEl.style.display = 'block';
            } else {
                discountMessageEl.style.display = 'none';
            }
        }
    }

    function setupControls() {
        const personalizeBtnHTML = `<a href="https://wa.me/573019998933?text=Hola,%20estoy%20interesado%20en%20personalizar%20el%20producto:%20${encodeURIComponent(product.nombre)}%20(REF:%20${product.numero_referencia})" target="_blank" class="personalize-btn">Personalizar ahora <i class="fa-brands fa-whatsapp"></i></a>`;
        if (stockTotal > 0) {
            controlsContainer.innerHTML = `
                <div class="quantity-selector">
                    <button id="decrease-quantity">-</button>
                    <input type="number" id="quantity" value="1" min="1" max="${currentStock}">
                    <button id="increase-quantity">+</button>
                </div>
                ${personalizeBtnHTML}
                <button id="add-to-cart-btn" class="add-to-cart-btn">AÑADIR A LA CESTA</button>
            `;

            const quantityInput = document.getElementById('quantity');
            const decreaseBtn = document.getElementById('decrease-quantity');
            const increaseBtn = document.getElementById('increase-quantity');
            const addToCartBtn = document.getElementById('add-to-cart-btn');

            increaseBtn.addEventListener('click', () => {
                let val = parseInt(quantityInput.value);
                if (val < currentStock) quantityInput.value = val + 1;
                updatePrices(parseInt(quantityInput.value));
            });

            decreaseBtn.addEventListener('click', () => {
                let val = parseInt(quantityInput.value);
                if (val > 1) quantityInput.value = val - 1;
                updatePrices(parseInt(quantityInput.value));
            });

            quantityInput.addEventListener('input', () => {
                if (parseInt(quantityInput.value) > currentStock) quantityInput.value = currentStock;
                if (parseInt(quantityInput.value) < 1) quantityInput.value = 1;
                updatePrices(parseInt(quantityInput.value));
            });

            addToCartBtn.addEventListener('click', () => {
                if (hasTallas && !selectedTalla) {
                    alert('Por favor, seleccione una talla.');
                    return;
                }

                const baseId = product.id || product._id;
                // Crear un ID único para el item en la cesta que incluye la talla
                const cartItemId = selectedTalla ? `${baseId}-${selectedTalla.talla}` : baseId;

                const productToAdd = {
                    ...product,
                    cartItemId: cartItemId, // ID único para la cesta
                    id: baseId, // ID original del producto
                    cantidad: parseInt(quantityInput.value),
                    talla: selectedTalla ? selectedTalla.talla : null
                };

                if (typeof agregarAlCarrito === 'function') {
                    agregarAlCarrito(productToAdd);
                }
            });

        } else {
            controlsContainer.innerHTML = personalizeBtnHTML;
        }
    }

    function setupTallas() {
        if (hasTallas && tallasDisponibles.length > 0) {
            const sizeOptionsHTML = tallasDisponibles.map(talla =>
                `<button class="size-option" data-talla='${JSON.stringify(talla)}'>${talla.talla}</button>`
            ).join('');
            sizesContainer.innerHTML = `<h3 class="sizes-title">TALLA</h3><div class="size-options">${sizeOptionsHTML}</div>`;

            const sizeOptionsContainer = sizesContainer.querySelector('.size-options');
            sizeOptionsContainer.addEventListener('click', e => {
                if (e.target.classList.contains('size-option')) {
                    sizeOptionsContainer.querySelectorAll('.size-option').forEach(btn => btn.classList.remove('selected'));
                    e.target.classList.add('selected');
                    
                    selectedTalla = JSON.parse(e.target.dataset.talla);
                    currentStock = parseInt(selectedTalla.stock, 10) || 0;
                    
                    const quantityInput = document.getElementById('quantity');
                    quantityInput.max = currentStock;
                    if (parseInt(quantityInput.value) > currentStock) quantityInput.value = currentStock;
                    
                    if(stockIndicatorEl) stockIndicatorEl.textContent = `EN STOCK (${currentStock})`;
                    updatePrices(parseInt(quantityInput.value));
                }
            });

            // Seleccionar la primera talla por defecto
            const firstButton = sizeOptionsContainer.querySelector('.size-option');
            if (firstButton) {
                firstButton.click();
            }
        } else {
            sizesContainer.style.display = 'none';
            if(stockIndicatorEl && stockTotal > 0) stockIndicatorEl.textContent = `EN STOCK (${stockTotal})`;
        }
    }

    // --- Inicialización ---
    setupImageGallery(product, galleryColumn);
    setupControls();
    setupTallas();
    updatePrices(1);
    
    if (stockTotal === 0) {
        if(totalPriceEl) totalPriceEl.style.display = 'none';
        if(discountMessageEl) discountMessageEl.style.display = 'none';
    }
}

function setupDynamicPricing(product, formatCurrency) {
const quantityInput = document.getElementById('quantity');
if (!quantityInput) return;

const basePrice = product.precio;
const unitPriceEl = document.getElementById('unit-price');
const totalPriceEl = document.getElementById('total-price');
const discountMessageEl = document.getElementById('discount-message');
const tieredPricesDisplayEl = document.getElementById('tiered-prices-display');

    // Usar la lógica centralizada de pricing.js
    const priceTiers = getPriceTiers();

    if (tieredPricesDisplayEl) {
        tieredPricesDisplayEl.innerHTML = priceTiers.map(tier => 
            `<div class="tiered-price-item">
                <span class="tiered-condition">${tier.min} o más unidades</span>
                <span class="tiered-price">${formatCurrency(tier.price)} c/u</span>
            </div>`
        ).join('');
    }

    function updatePrice() {
        const quantity = parseInt(quantityInput.value, 10) || 1;
        
        // Usar la función centralizada para obtener el precio
        const unitPrice = getTieredUnitPrice(quantity) || basePrice;
        const totalPrice = unitPrice * quantity;

        if (unitPriceEl) unitPriceEl.textContent = formatCurrency(unitPrice);
        if (totalPriceEl) totalPriceEl.textContent = formatCurrency(totalPrice);

        if (discountMessageEl) {
            const currentTier = priceTiers.find(t => quantity >= t.min);
            const higherTiers = priceTiers.filter(t => t.min > (currentTier ? currentTier.min : 0));
            const nextTier = higherTiers.length > 0 ? higherTiers[higherTiers.length - 1] : null;

            if (nextTier && quantity < nextTier.min) {
                const itemsNeeded = nextTier.min - quantity;
                discountMessageEl.innerHTML = `¡Añade <b>${itemsNeeded}</b> más y paga <b>${formatCurrency(nextTier.price)}</b> por unidad!`;
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
    const images = (product.imagenes && Array.isArray(product.imagenes))
        ? product.imagenes.filter(img => img && img.ruta_imagen)
        : [];

    if (!container) return;

    if (images.length === 0) {
        container.innerHTML = `<img src="/assets/logo.png" alt="Imagen no disponible" style="width: 100%; border-radius: 12px;">`;
        return;
    }

    container.innerHTML = `
        <div style="--swiper-navigation-color: #000; --swiper-pagination-color: #000" class="swiper gallery-top">
            <div class="swiper-wrapper">
                ${images.map(img => `
                    <div class="swiper-slide">
                        <div class="zoom-container">
                            <img src="${getImageUrl(img.ruta_imagen)}" alt="${img.label}">
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
                    <div class="swiper-slide" title="${img.label}">
                        <img src="${getImageUrl(img.ruta_imagen)}" alt="Miniatura: ${img.label}">
                        <span class="thumb-label">${img.label}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    setTimeout(() => {
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
    }, 100); // A small delay to ensure DOM is ready for Swiper
}

function openImageModal(product, startIndex) {
    const images = (product.imagenes && Array.isArray(product.imagenes))
        ? product.imagenes.filter(img => img && img.ruta_imagen)
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
                                <img src="${getImageUrl(img.ruta_imagen)}" alt="${img.label}">
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
                            <div class="swiper-slide" title="${img.label}">
                                <img src="${getImageUrl(img.ruta_imagen)}" alt="Miniatura: ${img.label}">
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
    const recomendadosSection = document.getElementById('recomendados');
    const sliderContainer = document.querySelector('#recomendados-slider');
    const swiperWrapper = sliderContainer ? sliderContainer.querySelector('.swiper-wrapper') : null;

    // Ocultar la sección por defecto y si falta algún elemento esencial.
    if (!recomendadosSection || !sliderContainer || !swiperWrapper) {
        if (recomendadosSection) recomendadosSection.style.display = 'none';
        console.error('Elementos DOM necesarios para la sección de recomendados no fueron encontrados.');
        return;
    }
    recomendadosSection.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/api/productos/recomendados?categoriaId=${categoriaId}&excludeId=${excludeId}&limit=8`);
        if (!response.ok) {
            throw new Error('La respuesta del servidor no fue exitosa.');
        }
        
        const recommendedProducts = await response.json();

        // Limpiar el contenedor antes de agregar nuevos elementos.
        swiperWrapper.innerHTML = '';
        const productsMap = new Map();
        let productsAdded = 0;

        recommendedProducts.forEach(product => {
            if (product.stock > 0) {
                productsAdded++;
                const productId = product._id || product.id;
                productsMap.set(productId.toString(), product);

                const imagenUrl = getImageUrl(product.imagen_principal || product.imagen_3_4 || product.imagen_frontal || product.imagen_icono);
                const marca = product.marca || 'Macs';
                const marcaClass = marca.toLowerCase() === 'macs' ? 'rgb-text' : '';
                const marcaHTML = `<p class="product-card__brand ${marcaClass}">${marca}</p>`;
                const stockHTML = `<div class="stock-info-slider"><span class="stock-indicator-slider in-stock-slider">EN STOCK (${product.stock})</span></div>`;
                const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.precio);

                const slide = document.createElement('div');
                slide.className = 'swiper-slide';
                slide.innerHTML = `
                    <div class="product-card">
                        <a href="producto-detalle.html?id=${productId}" class="product-card__link">
                            <div class="product-card__image-container">
                                <img src="${imagenUrl}" alt="${product.nombre}" class="product-card__image">
                                <div class="product-card__overlay"><i class="fas fa-eye"></i></div>
                            </div>
                            <div class="product-card__info">
                                ${marcaHTML}
                                ${stockHTML}
                                <p class="product-card__name">${product.nombre}</p>
                                <p class="product-card__price">${precioFormateado}</p>
                            </div>
                        </a>
                        <button class="product-card__add-to-cart-btn" data-product-id="${productId}">AGREGAR AL CARRITO</button>
                    </div>`;
                swiperWrapper.appendChild(slide);
            }
        });

        // Solo mostrar la sección si hay suficientes productos para el carrusel.
        if (productsAdded < 4) {
            return; // La sección ya está oculta por defecto.
        }

        // Si todo está bien, mostrar la sección e inicializar Swiper.
        recomendadosSection.style.display = 'block';

        new Swiper(sliderContainer, {
            slidesPerView: 1,
            spaceBetween: 10,
            navigation: {
                nextEl: sliderContainer.querySelector('.swiper-button-next'),
                prevEl: sliderContainer.querySelector('.swiper-button-prev'),
            },
            breakpoints: {
                640: { slidesPerView: 2, spaceBetween: 20 },
                768: { slidesPerView: 3, spaceBetween: 30 },
                1024: { slidesPerView: 4, spaceBetween: 40 },
            }
        });

        // Delegación de eventos para los botones de agregar al carrito.
        sliderContainer.addEventListener('click', (event) => {
            if (event.target.matches('.product-card__add-to-cart-btn')) {
                const productId = event.target.getAttribute('data-product-id');
                const product = productsMap.get(productId);

                if (product && typeof agregarAlCarrito === 'function') {
                    agregarAlCarrito(product);
                } else {
                    console.error('Error al intentar agregar el producto recomendado al carrito.');
                }
            }
        });

    } catch (error) {
        console.error('Error al cargar productos recomendados:', error);
        // Asegurarse de que la sección esté oculta si hay un error.
        recomendadosSection.style.display = 'none';
    }
}
