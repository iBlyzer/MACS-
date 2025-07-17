document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');
    const detalleContainer = document.getElementById('detalle-producto-container');

    if (!productoId) {
        if (detalleContainer) detalleContainer.innerHTML = '<p>Producto no especificado.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/productos/${productoId}`);
        if (!response.ok) {
            throw new Error('Producto no encontrado');
        }
        const producto = await response.json();

        renderizarProductoPrincipal(producto);

        // Asegurarse de que categoria_id exista antes de llamar a cargarRecomendados
        if (producto.categoria_id) {
            await cargarRecomendados(producto.categoria_id, producto.id);
        }

    } catch (error) {
        console.error('Error al cargar el producto:', error);
        if (detalleContainer) detalleContainer.innerHTML = `<p>Error al cargar el producto: ${error.message}</p>`;
    }
});

function getImageUrl(imagePath) {
    const placeholder = 'https://via.placeholder.com/400x400.png?text=Sin+Imagen';
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
        return placeholder;
    }
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    if (!imagePath.includes('/')) {
        return `${API_BASE_URL}/uploads/${imagePath}`;
    }
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
};

function openImageModal(product, initialIndex) {
    const images = product.imagenes.filter(img => img && img.ruta_imagen);
    if (images.length === 0) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'image-modal-overlay';

    modalOverlay.innerHTML = `
        <div class="image-modal-content">
            <button class="modal-close-btn">&times;</button>
            <div class="swiper-container modal-swiper">
                <div class="swiper-wrapper">
                    ${images.map(img => `
                        <div class="swiper-slide">
                            <img src="${getImageUrl(img.ruta_imagen)}" alt="${product.nombre}">
                        </div>
                    `).join('')}
                </div>
                <div class="swiper-button-next"></div>
                <div class="swiper-button-prev"></div>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);
    document.body.style.overflow = 'hidden';

    const modalSwiper = new Swiper('.modal-swiper', {
        initialSlide: initialIndex,
        navigation: {
            nextEl: '.modal-swiper .swiper-button-next',
            prevEl: '.modal-swiper .swiper-button-prev',
        },
        keyboard: true,
    });

    const closeModal = () => {
        modalOverlay.remove();
        document.body.style.overflow = '';
    };

    modalOverlay.querySelector('.modal-close-btn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => e.target === modalOverlay && closeModal());
}

function renderizarProductoPrincipal(product) {
    const detalleContainer = document.getElementById('detalle-producto-container');
    if (!detalleContainer) return;

    const hasTallas = Array.isArray(product.tallas) && product.tallas.length > 0;
    const tallasDisponibles = hasTallas ? product.tallas.filter(t => parseInt(t.stock, 10) > 0) : [];
    const stockTotal = hasTallas
        ? product.tallas.reduce((total, talla) => total + (parseInt(talla.stock, 10) || 0), 0)
        : (parseInt(product.stock, 10) || 0);

    let selectedTalla = null;
    let currentStock = stockTotal;

    detalleContainer.innerHTML = '';
    const galleryColumn = document.createElement('div');
    galleryColumn.className = 'product-gallery';
    const infoColumn = document.createElement('div');
    infoColumn.className = 'detalle-info';
    detalleContainer.append(galleryColumn, infoColumn);

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
            <button class="accordion-header"><span>Descripción</span><span class="accordion-icon"></span></button>
            <div class="accordion-content"><p>${product.descripcion || 'No hay descripción disponible.'}</p></div>
        </div>
        <div class="accordion-item">
            <button class="accordion-header"><span>Detalles</span><span class="accordion-icon"></span></button>
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
            <button class="accordion-header"><span>Cuidados</span><span class="accordion-icon"></span></button>
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

    infoColumn.append(stockDisplayContainer, productName, productRef, sizesContainer, controlsContainer, accordionContainer);

    if (product.marca) {
        const productBrand = document.createElement('div');
        productBrand.className = 'product-brand';
        productBrand.textContent = product.marca;
        const marcaLowerCase = product.marca.toLowerCase();
        if (marcaLowerCase.includes('macs')) productBrand.classList.add('brand-macs');
        else if (marcaLowerCase.includes('importada')) productBrand.classList.add('brand-importada');
        stockDisplayContainer.insertAdjacentElement('afterend', productBrand);
    }

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
        stockDisplayContainer.innerHTML = `<span class="stock-badge ${stockStatus}">${stockLabel}</span>${stock > 0 ? `<span class="stock-quantity-available">${stockQuantityText}</span>` : ''}`;
    }

    function setupControls() {
        const esPersonalizable = product.nombre.toLowerCase().includes('personaliza');
        const mainButtonText = esPersonalizable ? 'Personalizar' : 'Añadir al carrito';
        const mainButtonId = esPersonalizable ? 'personalizar-btn' : 'add-to-cart-btn';

        controlsContainer.innerHTML = `
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

        increaseBtn.addEventListener('click', () => { if (parseInt(quantityInput.value) < currentStock) quantityInput.value = parseInt(quantityInput.value) + 1; });
        decreaseBtn.addEventListener('click', () => { if (parseInt(quantityInput.value) > 1) quantityInput.value = parseInt(quantityInput.value) - 1; });
        quantityInput.addEventListener('input', () => {
            if (parseInt(quantityInput.value) > currentStock) quantityInput.value = currentStock;
            if (parseInt(quantityInput.value) < 1) quantityInput.value = 1;
        });

        controlsContainer.addEventListener('click', (e) => {
            const targetButton = e.target.closest('.btn-main-action');
            if (!targetButton) return;

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
                }
            }
        });
    }

    function setupTallasYGuia() {
        if (!hasTallas || tallasDisponibles.length === 0) {
            sizesContainer.innerHTML = '';
            updateStockDisplay(stockTotal);
            return;
        }

        const sizeButtonsHTML = tallasDisponibles.map(talla => `<button class="size-box" data-talla='${JSON.stringify(talla)}' ${talla.stock === 0 ? 'disabled' : ''}>${talla.talla}</button>`).join('');
        sizesContainer.innerHTML = `
            <div class="sizes-header">
                <h3 class="section-title">Tallas</h3>
                <a href="#" class="size-guide-link"><i class="fa-solid fa-ruler-horizontal"></i> Guía de tallas</a>
            </div>
            <div class="size-grid">${sizeButtonsHTML}</div>
        `;

        const sizeGrid = sizesContainer.querySelector('.size-grid');
        sizeGrid.addEventListener('click', (e) => {
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
                ${images.map((img, index) => `
                    <div class="swiper-slide">
                        <img src="${getImageUrl(img.ruta_imagen)}" alt="${product.nombre}" data-index="${index}">
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
                        <img src="${getImageUrl(img.ruta_imagen)}" alt="Thumbnail ${product.nombre}">
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    try {
        const galleryTopContainer = container.querySelector('.gallery-top');
        const galleryThumbsContainer = container.querySelector('.gallery-thumbs');

        const galleryThumbs = new Swiper(galleryThumbsContainer, {
            spaceBetween: 10,
            slidesPerView: 4,
            freeMode: true,
            watchSlidesProgress: true,
        });

        const galleryTop = new Swiper(galleryTopContainer, {
            spaceBetween: 10,
            navigation: {
                nextEl: galleryTopContainer.querySelector('.swiper-button-next'),
                prevEl: galleryTopContainer.querySelector('.swiper-button-prev'),
            },
            thumbs: {
                swiper: galleryThumbs,
            },
        });

        container.querySelector('.gallery-top .swiper-wrapper').addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                const index = parseInt(e.target.dataset.index, 10);
                openImageModal(product, index);
            }
        });

    } catch (e) {
        console.error('Error inicializando Swiper:', e);
    }
}

async function cargarRecomendados(categoriaId, excludeId) {
    const recomendadosSection = document.getElementById('recomendados');
    const recomendadosContainer = document.getElementById('recomendados-slider');
    const recomendadosWrapper = recomendadosContainer ? recomendadosContainer.querySelector('.swiper-wrapper') : null;

    if (!recomendadosWrapper || !recomendadosSection) {
        if (recomendadosSection) recomendadosSection.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/productos/recomendados?categoriaId=${categoriaId}&excludeId=${excludeId}`);
        if (!response.ok) {
            throw new Error('No se pudieron obtener los recomendados.');
        }
        let recomendadosSimplificados = await response.json();

        if (recomendadosSimplificados.length === 0) {
            recomendadosSection.style.display = 'none';
            return;
        }

        // Obtener los detalles completos de cada producto recomendado
        const promesasProductos = recomendadosSimplificados.map(p => 
            fetch(`${API_BASE_URL}/api/productos/${p.id}`).then(res => res.json())
        );

        const recomendados = await Promise.all(promesasProductos);

        if (recomendados.length === 0) {
            recomendadosSection.style.display = 'block';
            recomendadosContainer.innerHTML = '<p style="text-align: center; width: 100%;">No hay productos recomendados por el momento.</p>';
            return;
        }

        recomendadosWrapper.innerHTML = ''; // Limpiar el contenedor
        recomendados.forEach(producto => {
            const productCard = createProductLinkElement(producto);
            
            const swiperSlide = document.createElement('div');
            swiperSlide.className = 'swiper-slide';
            swiperSlide.appendChild(productCard);
            
            recomendadosWrapper.appendChild(swiperSlide);
        });

        new Swiper('#recomendados-slider', {
            effect: 'coverflow',
            grabCursor: true,
            centeredSlides: true,
            loop: true,
            slidesPerView: 1,
            spaceBetween: 20,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            coverflowEffect: {
                rotate: 40,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows: false,
            },
            pagination: {
                el: '#recomendados-slider .swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '#recomendados-slider .swiper-button-next',
                prevEl: '#recomendados-slider .swiper-button-prev',
            },
            breakpoints: {
                640: { slidesPerView: 2 },
                768: { slidesPerView: 3 },
                1024: { 
                    slidesPerView: 4,
                    spaceBetween: 30
                },
            },
        });

        recomendadosSection.style.display = 'block';

    } catch (error) {
        console.error('Error al cargar productos recomendados:', error);
        recomendadosSection.style.display = 'block';
        recomendadosContainer.innerHTML = '<p style="text-align: center; width: 100%;">No se pudieron cargar los productos recomendados.</p>';
    }
}
