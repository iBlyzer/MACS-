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

const GUIA_DE_TALLAS = {

    'sombreros': {
        titulo: 'Guía de Tallas para Sombreros',
        headers: ['Talla', 'Circunferencia'],
        medidas: [
            { talla: 'S', medida: '55-56 cm' },
            { talla: 'M', medida: '57-58 cm' },
            { talla: 'L', medida: '59-60 cm' },
            { talla: 'XL', medida: '61-62 cm' },
        ],
        nota: 'Mide la circunferencia de tu cabeza para encontrar la talla correcta.'
    }
    // Agrega aquí otras guías para 'camisetas', 'anillos', etc.
};

function renderizarProductoPrincipal(product) {
    const detalleContainer = document.getElementById('detalle-producto-container');
    if (!detalleContainer) return;

    // --- Estado de tallas y stock ---
    const hasTallas = Array.isArray(product.tallas) && product.tallas.length > 0;
    const tallasDisponibles = hasTallas ? product.tallas.filter(t => parseInt(t.stock, 10) > 0) : [];
    const stockTotal = hasTallas
        ? product.tallas.reduce((total, talla) => total + (parseInt(talla.stock, 10) || 0), 0)
        : (parseInt(product.stock, 10) || 0);

    let selectedTalla = null;
    let currentStock = stockTotal;

    // --- Limpiar y construir estructura base ---
    detalleContainer.innerHTML = '';
    const galleryColumn = document.createElement('div');
    galleryColumn.className = 'product-gallery';
    const infoColumn = document.createElement('div');
    infoColumn.className = 'detalle-info';
    detalleContainer.append(galleryColumn, infoColumn);

    // --- Contenedores de la columna de información ---
    const stockDisplayContainer = document.createElement('div');
    stockDisplayContainer.className = 'stock-display-container';

    const productName = document.createElement('h1');
    productName.textContent = product.nombre;

    const productRef = document.createElement('p');
    productRef.className = 'product-reference';
    productRef.textContent = `REF: ${product.numero_referencia || 'N/A'}`;

    const sizesContainer = document.createElement('div');
    sizesContainer.className = 'sizes-container';

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container product-actions';

    const accordionContainer = document.createElement('div');
    accordionContainer.className = 'product-info-accordion';
    accordionContainer.innerHTML = `
        <div class="accordion-item">
            <button class="accordion-header">
                <span>Descripción</span>
                <span class="accordion-icon"></span>
            </button>
            <div class="accordion-content">
                <p>${product.descripcion || 'No hay descripción disponible.'}</p>
            </div>
        </div>
        <div class="accordion-item">
            <button class="accordion-header">
                <span>Detalles</span>
                <span class="accordion-icon"></span>
            </button>
            <div class="accordion-content">
                <ul>
                    <li><strong>Marca:</strong> ${product.marca || 'N/A'}</li>
                    <li><strong>Categoría:</strong> ${product.categoria || 'N/A'}</li>
                    <li><strong>Material:</strong> ${product.material || 'N/A'}</li>
                    <li><strong>Origen:</strong> ${product.origen || 'Colombia'}</li>
                </ul>
            </div>
        </div>
        <div class="accordion-item">
            <button class="accordion-header">
                <span>Cuidados</span>
                <span class="accordion-icon"></span>
            </button>
            <div class="accordion-content">
                <ul>
                    <li>No lavar a máquina.</li>
                    <li>Limpiar con un paño húmedo.</li>
                    <li>No usar blanqueador.</li>
                    <li>Secar a la sombra.</li>
                </ul>
            </div>
        </div>
    `;

    // --- Añadir todos los contenedores a la columna de info ---
    infoColumn.append(stockDisplayContainer, productName, productRef, sizesContainer, controlsContainer, accordionContainer);

    // --- Lógica de la Marca con Efectos ---
    if (product.marca) {
        const productBrand = document.createElement('div');
        productBrand.className = 'product-brand';
        productBrand.textContent = product.marca;
        const marcaLowerCase = product.marca.toLowerCase();

        if (marcaLowerCase.includes('macs')) {
            productBrand.classList.add('brand-macs');
        } else if (marcaLowerCase.includes('importada')) {
            productBrand.classList.add('brand-importada');
        }
        
        // Insertar la marca justo después del stock y antes del nombre del producto
        stockDisplayContainer.insertAdjacentElement('afterend', productBrand);
    }

    // --- Funciones auxiliares para rellenar contenido y configurar eventos ---

    function setupAccordion() {
        const accordionItems = accordionContainer.querySelectorAll('.accordion-item');
        accordionItems.forEach((item, index) => {
            const header = item.querySelector('.accordion-header');
            const content = item.querySelector('.accordion-content');

            if (index === 0) {
                item.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }

            header.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                accordionItems.forEach(i => {
                    i.classList.remove('active');
                    i.querySelector('.accordion-content').style.maxHeight = '0px';
                });
                if (!isActive) {
                    item.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            });
        });
    }

    function updateStockDisplay(stock) {
        const stockStatus = stock > 0 ? 'in-stock' : 'out-of-stock';
        const stockLabel = stock > 0 ? 'En Stock' : 'Agotado';
        const stockQuantityText = stock > 0 ? `${stock} disponibles` : '';
        stockDisplayContainer.innerHTML = `
            <span class="stock-badge ${stockStatus}">${stockLabel}</span>
            ${stock > 0 ? `<span class="stock-quantity-available">${stockQuantityText}</span>` : ''}
        `;
    }

    function setupControls() {
        const esPersonalizable = product.nombre.toLowerCase().includes('personaliza');
        const mainButtonText = esPersonalizable ? 'Personalizar' : 'Añadir al carrito';
        const mainButtonId = esPersonalizable ? 'personalizar-btn' : 'add-to-cart-btn';

        const productActionsContainer = document.querySelector('.product-actions');
        productActionsContainer.innerHTML = `
            <div class="product-purchase-actions">
                <div class="quantity-selector-container">
                    <label for="quantity-input" class="quantity-label">Cantidad</label>
                    <div class="quantity-selector">
                        <button class="quantity-btn" id="decrease-quantity">-</button>
                        <input type="number" id="quantity-input" value="1" min="1">
                        <button class="quantity-btn" id="increase-quantity">+</button>
                    </div>
                </div>
                <div class="main-actions-container">
                    <button id="${mainButtonId}" class="btn-main-action">
                        <span class="btn-content">
                            <span class="btn-text">${mainButtonText.toUpperCase()}</span>
                            <span class="btn-arrow">&rarr;</span>
                        </span>
                        <span class="btn-loader"></span>
                        <span class="btn-success-icon"><i class="fas fa-check"></i></span>
                    </button>
                    <button class="btn-wishlist">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
            </div>
        `;

        const quantityInput = document.getElementById('quantity-input');
        const decreaseBtn = document.getElementById('decrease-quantity');
        const increaseBtn = document.getElementById('increase-quantity');

        quantityInput.max = currentStock;

        increaseBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value);
            if (val < currentStock) quantityInput.value = val + 1;
        });

        decreaseBtn.addEventListener('click', () => {
            let val = parseInt(quantityInput.value);
            if (val > 1) quantityInput.value = val - 1;
        });

        quantityInput.addEventListener('input', () => {
            if (parseInt(quantityInput.value) > currentStock) quantityInput.value = currentStock;
            if (parseInt(quantityInput.value) < 1) quantityInput.value = 1;
        });

        const actionsContainer = document.querySelector('.product-purchase-actions');
    

        if (actionsContainer) {
            actionsContainer.addEventListener('click', (e) => {
        
                const targetButton = e.target.closest('.btn-main-action');

                if (!targetButton) {
                    return;
                }

                if (targetButton.id === 'personalizar-btn') {
                    const whatsappLink = `https://wa.me/573019998933?text=Hola,%20estoy%20interesado%20en%20personalizar%20el%20producto:%20${encodeURIComponent(product.nombre)}%20(REF:%20${product.numero_referencia})`;
                    window.open(whatsappLink, '_blank');
                } else if (targetButton.id === 'add-to-cart-btn') {
    
                    if (hasTallas && !selectedTalla) {
                        alert('Por favor, seleccione una talla.');
                        return;
                    }
                    const baseId = product.id || product._id;
                    const cartItemId = selectedTalla ? `${baseId}-${selectedTalla.talla}` : baseId;
                    const productToAdd = { ...product, cartItemId, id: baseId, cantidad: parseInt(quantityInput.value), talla: selectedTalla ? selectedTalla.talla : null };
                    
                    if (typeof agregarAlCarrito === 'function') {
        
                        agregarAlCarrito(productToAdd, targetButton);
                    } else {
                        console.error('La función agregarAlCarrito no está disponible.');
                        console.error('[DEBUG] La función agregarAlCarrito no está disponible.');
                    }
                }
            });
        }
    }

    function setupTallasYGuia() {
        if (!hasTallas || tallasDisponibles.length === 0) {
            sizesContainer.innerHTML = '';
            updateStockDisplay(stockTotal);
            return;
        }

        const sizeButtonsHTML = tallasDisponibles.map(talla =>
            `<button class="size-box" data-talla='${JSON.stringify(talla)}' ${talla.stock === 0 ? 'disabled' : ''}>${talla.talla}</button>`
        ).join('');

        sizesContainer.innerHTML = `
            <div class="sizes-header">
                <h3 class="section-title">Tallas</h3>
                <a href="#" class="size-guide-link"> <i class="fa-solid fa-ruler-horizontal"></i> Guía de tallas</a>
            </div>
            <div class="size-grid">${sizeButtonsHTML}</div>
        `;

        const sizeGrid = sizesContainer.querySelector('.size-grid');
        sizeGrid.addEventListener('click', e => {
            if (e.target.classList.contains('size-box')) {
                sizeGrid.querySelectorAll('.size-box').forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
                selectedTalla = JSON.parse(e.target.dataset.talla);
                currentStock = parseInt(selectedTalla.stock, 10) || 0;
                document.getElementById('quantity-input').max = currentStock;
                if (parseInt(document.getElementById('quantity-input').value) > currentStock) {
                    document.getElementById('quantity-input').value = currentStock > 0 ? 1 : 0;
                }
                updateStockDisplay(currentStock);
            }
        });

        const firstAvailableButton = sizeGrid.querySelector('.size-box:not(:disabled)');
        if (firstAvailableButton) {
            firstAvailableButton.click();
        } else {
            updateStockDisplay(0);
        }

        const sizeGuideLink = sizesContainer.querySelector('.size-guide-link');
        const esSombrero = (product.nombre || '').toLowerCase().includes('sombrero');
        if (esSombrero) {
            sizeGuideLink.style.display = 'block';
            sizeGuideLink.addEventListener('click', (e) => {
                e.preventDefault();
                openSizeGuideModal('sombreros');
            });
        } else {
            sizeGuideLink.style.display = 'none';
        }
    }

    function openSizeGuideModal(category) {
        const guiaData = GUIA_DE_TALLAS[category];
        if (!guiaData) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'size-guide-modal-overlay';

        const tableRows = guiaData.medidas.map(m => `<tr><td>${m.talla}</td><td>${m.medida}</td></tr>`).join('');

        modalOverlay.innerHTML = `
            <div class="size-guide-modal-content">
                <button class="modal-close-btn">&times;</button>
                <h2 class="modal-title">${guiaData.titulo}</h2>
                <table class="size-guide-table"><thead><tr><th>${guiaData.headers[0]}</th><th>${guiaData.headers[1]}</th></tr></thead><tbody>${tableRows}</tbody></table>
                <p class="modal-note">${guiaData.nota}</p>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        document.body.style.overflow = 'hidden';

        const closeModal = () => {
            modalOverlay.remove();
            document.body.style.overflow = '';
        };

        modalOverlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', e => e.target === modalOverlay && closeModal());
    }

    // --- Inicialización de todos los componentes ---
    updateStockDisplay(currentStock);
    setupImageGallery(product, galleryColumn);
    setupControls();
    setupTallasYGuia();
    setupAccordion();
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
