document.addEventListener('DOMContentLoaded', function () {

    // 1. INICIALIZAR SLIDER PRINCIPAL
    async function initializeMainSlider() {
        try {
            const response = await fetch('http://localhost:3001/api/new-slider/images');
            if (!response.ok) {
                throw new Error('La respuesta de la red no fue correcta');
            }
            const slidesData = await response.json();
            const swiperWrapper = document.querySelector('#main-swiper .swiper-wrapper');
            if (!swiperWrapper) return;

            const slideContents = [
                { title: 'BASICS & ESSENTIALS', buttonText: 'COMPRAR AHORA', buttonLink: '#productos-destacados-section' },
                { title: 'NEW ERA COLLABS', buttonText: 'VER COLABORACIONES', buttonLink: '#productos-destacados-section' },
                { title: 'NUEVA COLECCIÓN', buttonText: 'DESCUBRIR', buttonLink: '#productos-macs-section' }
            ];

            if (slidesData && slidesData.length > 0) {
                swiperWrapper.innerHTML = slidesData.map((imageUrl, index) => {
                    const content = slideContents[index] || slideContents[0];
                    const encodedImageUrl = encodeURI(imageUrl);
                    return `
                    <div class="swiper-slide" style="background-image: url(http://localhost:3001${encodedImageUrl})">
                        <div class="slide-content">
                            <h1>${content.title}</h1>
                            <a href="${content.buttonLink}" class="btn-comprar">${content.buttonText}</a>
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
        const sliderContainer = document.querySelector(`#${containerId}`);
        if (!sliderContainer) return;

        const swiperWrapper = sliderContainer.querySelector('.swiper-wrapper');
        if (!swiperWrapper) return;

        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                swiperWrapper.innerHTML = '<p>Error al cargar los productos.</p>';
                throw new Error(`Error al cargar productos de ${apiEndpoint}`);
            }
            const products = await response.json();

            if (products.length === 0) {
                swiperWrapper.innerHTML = '<p>No hay productos para mostrar.</p>';
                return;
            }

            swiperWrapper.innerHTML = products.map(product => {
                const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.precio);

                const imagenUrl = product.imagen_3_4 || product.imagen_principal || product.imagen_icono || product.imagen_url;
                const imagenUrlCompleta = imagenUrl
                    ? `http://localhost:3001${imagenUrl}`
                    : 'https://via.placeholder.com/300x300.png?text=Imagen no disponible';

                const stock = parseInt(product.stock, 10) || 0;
                const stockText = stock > 0 ? `EN STOCK (${stock})` : 'AGOTADO';
                const stockClass = stock > 0 ? 'in-stock' : 'out-of-stock';
                const stockInfoHTML = `<div class="stock-info"><span class="stock-indicator ${stockClass}">${stockText}</span></div>`;

                const marca = product.marca || 'Macs';
                let marcaClass = '';
                if (marca.toLowerCase() === 'macs') {
                    marcaClass = 'macs-brand-rgb';
                }
                const marcaHTML = `<p class="product-card__brand ${marcaClass}">${marca}</p>`;

                const addToCartCall = `agregarAlCarrito(${product.id}, '${product.nombre.replace(/'/g, "\\'")}', ${product.precio}, '${imagenUrlCompleta}')`;

                return `
                    <div class="swiper-slide">
                        <div class="product-card">
                            <a href="producto-detalle.html?id=${product.id}" class="product-card__image-container">
                                <img src="${imagenUrlCompleta}" alt="${product.nombre}" class="product-card__image" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x300.png?text=Imagen no disponible';">
                                <div class="product-card__overlay">Ver Producto</div>
                            </a>
                            <div class="product-card__info">
                                ${marcaHTML}
                                ${stockInfoHTML}
                                <h3 class="product-card__name"><a href="producto-detalle.html?id=${product.id}">${product.nombre}</a></h3>
                                <p class="product-card__price">${precioFormateado}</p>
                            </div>
                            <button class="product-card__btn" onclick="${addToCartCall}">Agregar al carrito</button>
                        </div>
                    </div>
                `;
            }).join('');

            new Swiper(sliderContainer, {
                loop: true,
                slidesPerView: 1, 
                spaceBetween: 15,
                navigation: {
                    nextEl: sliderContainer.querySelector('.swiper-button-next'),
                    prevEl: sliderContainer.querySelector('.swiper-button-prev'),
                },
                breakpoints: {
                    640: { slidesPerView: 2, spaceBetween: 20 },
                    768: { slidesPerView: 4, spaceBetween: 30 },
                    1024: { slidesPerView: 5, spaceBetween: 30 },
                }
            });

            // Si es el slider de destacados, ajustamos la altura del slider principal
            if (containerId === 'destacados-slider') {
                setTimeout(adjustMainSliderHeight, 200); // Espera a que el DOM se pinte
            }

        } catch (error) {
            console.error(`Error inicializando el slider ${containerId}:`, error);
            // El mensaje de error ya se muestra en el bloque if(!response.ok)
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
    initializeProductSlider('destacados-slider', 'http://localhost:3001/api/productos/destacados');
    initializeProductSlider('macs-slider', 'http://localhost:3001/api/productos/categoria/Macs');
    initializeProductSlider('importadas-slider', 'http://localhost:3001/api/productos/categoria/Importada');
});
