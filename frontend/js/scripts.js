// =================================================================================
// FUNCIÓN GLOBAL PARA CREAR TARJETAS DE PRODUCTO
// Se define en el ámbito global para que sea accesible desde otros scripts (ej. productos.js)
// =================================================================================
function createProductLinkElement(product) {
    const card = document.createElement("div");
    card.className = "product-card";

    const precioFormateado = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(product.precio);

    const imagenUrl = product.imagen_principal || product.imagen_3_4;
    const imagenUrlCompleta = imagenUrl ? `${API_BASE_URL}${imagenUrl}` : '/assets/logo.png';

    const stock = product.tallas && product.tallas.length > 0
        ? product.tallas.reduce((acc, t) => acc + (t.stock || 0), 0)
        : (product.stock || 0);

    const stockInfoHTML = stock > 0 ? `<div class="stock-indicator in-stock">EN STOCK</div>` : `<div class="stock-indicator out-of-stock">AGOTADO</div>`;
    const marca = product.marca || 'Macs';
    const marcaClass = marca.toLowerCase() === 'macs' ? 'rgb-text' : '';
    const marcaHTML = `<p class="product-card__brand ${marcaClass}">${marca}</p>`;

    let tallaSelectorHTML = '';
    if (product.tiene_tallas && product.tallas && product.tallas.length > 0) {
        const tallaOptions = product.tallas
            .map(t => `<option value="${t.talla}" ${t.stock === 0 ? 'disabled' : ''}>${t.talla}${t.stock === 0 ? ' (Agotado)' : ''}</option>`)
            .join('');
        tallaSelectorHTML = `
            <select class="product-card__talla-select">
                <option value="">Seleccionar talla</option>
                ${tallaOptions}
            </select>
        `;
    }

    card.innerHTML = `
        <a href="producto-detalle.html?id=${product.id}" class="product-card__link">
            <div class="product-card__image-container">
                <img src="${imagenUrlCompleta}" alt="${product.nombre}" class="product-card__image" onerror="this.src='/assets/logo.png'">
                <div class="product-card__overlay"><i class="fas fa-eye"></i></div>
            </div>
            <div class="product-card__info">
                ${marcaHTML}
                ${stockInfoHTML}
                <p class="product-card__name">${product.nombre}</p>
                <p class="product-card__price">${precioFormateado}</p>
            </div>
        </a>
        ${tallaSelectorHTML}
        <button class="product-card__add-to-cart-btn" data-product-id="${product.id}" ${stock === 0 ? 'disabled' : ''}>
           ${stock === 0 ? 'AGOTADO' : 'AGREGAR AL CARRITO'}
        </button>
    `;

    const addToCartBtn = card.querySelector('.product-card__add-to-cart-btn');
    addToCartBtn.addEventListener('click', () => {
        if (typeof agregarAlCarrito !== 'function') {
            console.error('La función agregarAlCarrito no está definida.');
            return;
        }

        const productToAdd = { ...product, cantidad: 1 };

        if (product.tiene_tallas && product.tallas && product.tallas.length > 0) {
            const tallaSelect = card.querySelector('.product-card__talla-select');
            const selectedTalla = tallaSelect ? tallaSelect.value : null;

            if (!selectedTalla) {
                Swal.fire({
                    icon: 'warning',
                    title: '¡Un momento!',
                    text: 'Por favor, selecciona una talla para continuar.',
                    confirmButtonColor: '#2a2a2a'
                });
                tallaSelect.focus();
                return;
            }
            productToAdd.talla = selectedTalla;
            productToAdd.cartItemId = `${product.id}-Talla-${selectedTalla}`;
        } else {
            productToAdd.cartItemId = String(product.id);
        }
        
        agregarAlCarrito(productToAdd);
    });

    return card;
}

document.addEventListener('DOMContentLoaded', function () {

    // 1. INICIALIZAR SLIDER PRINCIPAL
    async function initializeMainSlider() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/slider-manager/images`);
            if (!response.ok) throw new Error('La respuesta de la red no fue correcta');
            
            const slidesData = await response.json();
            const swiperWrapper = document.querySelector('#main-swiper .swiper-wrapper');
            if (!swiperWrapper) return;

            if (slidesData && slidesData.length > 0) {
                swiperWrapper.innerHTML = slidesData.map(slide => {
                    const { url, title, buttonText } = slide;
                    const imageUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
                    const encodedImageUrl = encodeURI(imageUrl);
                    return `
                    <div class="swiper-slide" style="background-image: url('${encodedImageUrl}')">
                        <div class="slide-content">
                            <h1>${title || ''}</h1>
                            <a href="#" class="btn-comprar">${buttonText || ''}</a>
                        </div>
                    </div>
                `;
                }).join('');
            } else {
                 swiperWrapper.innerHTML = '<p>No hay imágenes para mostrar.</p>';
                 return;
            }

            new Swiper('#main-swiper', {
                loop: true,
                autoplay: { delay: 5000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                effect: 'fade',
                fadeEffect: { crossFade: true },
            });

        } catch (error) {
            console.error('Fallo al inicializar el slider principal:', error);
            const sliderContainer = document.getElementById('main-swiper');
            if (sliderContainer) {
                sliderContainer.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Error al cargar el slider.</p>';
            }
        }
    }

    // 2. INICIALIZAR SLIDERS DE PRODUCTOS (REFACTORIZADO)
    async function initializeProductSlider(containerId, apiEndpoint) {
        const sliderContainer = document.getElementById(containerId);
        if (!sliderContainer) return;

        const sliderWrapper = sliderContainer.querySelector('.swiper-wrapper');
        if (!sliderWrapper) return;

        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const products = await response.json();

            sliderWrapper.innerHTML = '';

            if (!products || products.length === 0) {
                sliderWrapper.innerHTML = '<p>No hay productos para mostrar.</p>';
                return;
            }

            products.forEach(product => {
                const productCard = createProductLinkElement(product);
                
                const swiperSlide = document.createElement('div');
                swiperSlide.className = 'swiper-slide';
                swiperSlide.appendChild(productCard);
                
                sliderWrapper.appendChild(swiperSlide);
            });

            new Swiper(`#${containerId}`, {
                slidesPerView: 1,
                spaceBetween: 20,
                navigation: {
                    nextEl: `#${containerId} .swiper-button-next`,
                    prevEl: `#${containerId} .swiper-button-prev`,
                },
                breakpoints: {
                    640: { slidesPerView: 2 },
                    768: { slidesPerView: 3 },
                    1024: { slidesPerView: 4 },
                },
            });

        } catch (error) {
            console.error(`Error al inicializar el slider de productos para #${containerId}:`, error);
            sliderWrapper.innerHTML = '<p>Error al cargar los productos.</p>';
        }
    }

    // 3. AJUSTAR ALTURA DEL SLIDER PRINCIPAL
    function adjustMainSliderHeight() {
        const mainSlider = document.querySelector('.main-slider');
        const destacadosSlider = document.querySelector('#destacados-slider');

        if (mainSlider && destacadosSlider) {
            const destacadosWidth = destacadosSlider.offsetWidth;
            if (destacadosWidth > 0) {
                const newHeight = destacadosWidth * 0.5; // Proporción del 50% del ancho
                mainSlider.style.height = `${newHeight}px`;
                console.log(`Ajustando altura del slider principal a: ${newHeight}px`);
            }
        }
    }

    // 4. LLAMADAS A LAS FUNCIONES DE INICIALIZACIÓN
    initializeMainSlider();
    initializeProductSlider('destacados-slider', `${API_BASE_URL}/api/productos/destacados`);
    initializeProductSlider('macs-slider', `${API_BASE_URL}/api/productos/categoria/Macs`);
    initializeProductSlider('importadas-slider', `${API_BASE_URL}/api/productos/categoria/Importada`);
    initializeProductSlider('alone-slider', `${API_BASE_URL}/api/productos/categoria/Alone`);
    initializeProductSlider('safari-slider', `${API_BASE_URL}/api/productos/categoria/Safari`);
    initializeProductSlider('qs-slider', `${API_BASE_URL}/api/productos/categoria/QS`);
});
