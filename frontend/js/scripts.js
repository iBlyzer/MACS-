document.addEventListener('DOMContentLoaded', function () {

    // 1. INICIALIZAR SLIDER PRINCIPAL
    async function initializeMainSlider() {
        try {
            // Usamos el endpoint correcto que devuelve la información completa
            const response = await fetch('http://localhost:3001/api/slider-manager/images');
            if (!response.ok) {
                throw new Error('La respuesta de la red no fue correcta');
            }
            const slidesData = await response.json();
            const swiperWrapper = document.querySelector('#main-swiper .swiper-wrapper');
            if (!swiperWrapper) return;

            if (slidesData && slidesData.length > 0) {
                // Ya no usamos contenido hardcodeado, usamos los datos de la API
                swiperWrapper.innerHTML = slidesData.map(slide => {
                    const { url, title, buttonText } = slide;
                    // Aseguramos que la URL esté correctamente codificada
                    const encodedImageUrl = encodeURI(url);
                    return `
                    <div class="swiper-slide" style="background-image: url(${encodedImageUrl})">
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

    // 2. INICIALIZAR SLIDERS DE PRODUCTOS
    async function initializeProductSlider(containerId, apiEndpoint) {
    const sliderContainer = document.getElementById(containerId);
    if (!sliderContainer) {
        console.error(`Slider container with ID #${containerId} not found.`);
        return;
    }
    const sliderWrapper = sliderContainer.querySelector('.swiper-wrapper');
    if (!sliderWrapper) {
        console.error(`Swiper wrapper for #${containerId} not found.`);
        return;
    }

    const productsMap = new Map();

    try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();

        sliderWrapper.innerHTML = ''; // Clear existing slides

        if (products.length === 0) {
            sliderWrapper.innerHTML = '<p>No hay productos para mostrar.</p>';
            return;
        }

        products.forEach(product => {
            if (product.stock > 0) {
                const productId = product._id || product.id;
                productsMap.set(productId.toString(), product);

                const imagenUrl = product.imagen_principal ? getImageUrl(product.imagen_principal) : 'img/default-product.png';
                const marca = product.marca || 'Macs';
                const marcaClass = marca.toLowerCase() === 'macs' ? 'rgb-text' : '';
                const marcaHTML = `<p class="product-card__brand ${marcaClass}">${marca}</p>`;

                const slideHTML = `
                    <div class="swiper-slide">
                        <div class="product-card">
                            <a href="producto-detalle.html?id=${productId}" class="product-card__link">
                                <div class="product-card__image-container">
                                    <img src="${imagenUrl}" alt="${product.nombre}" class="product-card__image">
                                    <div class="product-card__overlay">Ver detalle</div>
                                </div>
                                <div class="product-card__info">
                                    ${marcaHTML}
                                    ${product.stock > 0 ? `<p class="product-card__stock available">EN STOCK (${product.stock})</p>` : `<p class="product-card__stock unavailable">AGOTADO</p>`}
                                    <p class="product-card__name">${product.nombre}</p>
                                    <p class="product-card__price">${formatCurrency(product.precio)}</p>
                                </div>
                            </a>
                            <button class="product-card__add-to-cart-btn" data-product-id="${productId}">AGREGAR AL CARRITO</button>
                        </div>
                    </div>`;
                sliderWrapper.innerHTML += slideHTML;
            }
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
        console.error(`Error initializing product slider for #${containerId}:`, error);
        sliderWrapper.innerHTML = '<p>Error al cargar los productos.</p>';
    }

    sliderContainer.addEventListener('click', (event) => {
        if (event.target.matches('.product-card__add-to-cart-btn')) {
            const productId = event.target.getAttribute('data-product-id');
            const product = productsMap.get(productId);

            if (product) {
                if (typeof agregarAlCarrito === 'function') {
                    agregarAlCarrito(product);
                } else {
                    console.error('The function agregarAlCarrito is not defined.');
                }
            } else {
                console.error('Product not found in map:', productId);
            }
        }
    });
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
    initializeProductSlider('destacados-slider', 'http://localhost:3001/api/productos/destacados');
    initializeProductSlider('macs-slider', 'http://localhost:3001/api/productos/categoria/Macs');
    initializeProductSlider('importadas-slider', 'http://localhost:3001/api/productos/categoria/Importada');
});
