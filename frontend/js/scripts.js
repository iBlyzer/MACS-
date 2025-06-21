document.addEventListener('DOMContentLoaded', function () {
  // Cargar productos con más stock
  async function cargarTopStockProductos() {
    const container = document.getElementById('top-stock-container');
    if (!container) return;

    try {
            const response = await fetch('/api/productos/top-stock?categoria=Gorras&limit=3');
      if (!response.ok) throw new Error('No se pudieron cargar los productos destacados.');
      
      const productos = await response.json();
      container.innerHTML = '';

      if (productos.length === 0) {
        container.innerHTML = '<p>No hay productos destacados para mostrar.</p>';
        return;
      }

      productos.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'producto';

        const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(product.precio);
                const imagenUrl = product.imagen_icono ? product.imagen_icono : 'https://via.placeholder.com/300x300.png?text=Imagen+no+disponible';

        productElement.innerHTML = `
          <img src="${imagenUrl}" alt="${product.nombre}" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x300.png?text=Imagen+no+disponible';">
          <p class="marca">${product.marca || 'Macs'}</p>
          <h3>${product.nombre}</h3>
          <p class="precio">${precioFormateado}</p>
          <button class="add-to-cart-btn">Agregar al carrito</button>
          <div class="overlay-text">Ver Producto</div>
        `;

        const addToCartBtn = productElement.querySelector('.add-to-cart-btn');
        addToCartBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof agregarAlCarrito !== 'undefined') {
            const productData = {
              id: product.id,
              nombre: product.nombre,
              precio: product.precio,
              imagen_icono: product.imagen_icono,
              marca: product.marca
            };
            agregarAlCarrito(productData);
          } else {
            console.error('La función agregarAlCarrito no está definida.');
          }
        });

        productElement.addEventListener('click', () => {
          window.location.href = `producto-detalle.html?id=${product.id}`;
        });

        container.appendChild(productElement);
      });
    } catch (error) {
      console.error('Error al cargar productos destacados:', error);
      container.innerHTML = '<p>No se pudieron cargar los productos destacados.</p>';
    }
  }

  cargarTopStockProductos();

  // --- Lógica del Slider Dinámico ---
  async function initializeDynamicSlider() {
    const sliderTrack = document.getElementById('sliderTrack');
    const sliderDotsContainer = document.getElementById('sliderDots');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (!sliderTrack || !sliderDotsContainer) {
      console.error('Elementos del slider no encontrados.');
      return;
    }

    try {
            const apiUrl = `/api/slider/images?timestamp=${new Date().getTime()}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error('La respuesta de la petición fetch no fue exitosa:', response);
        throw new Error('No se pudieron cargar las imágenes del slider.');
      }
      
      const imageUrls = await response.json();

      if (imageUrls.length === 0) {
        const sliderContainer = document.querySelector('.slider-container');
        if (sliderContainer) sliderContainer.style.display = 'none';
        return;
      }

      // Limpiar contenido estático
      sliderTrack.innerHTML = '';
      sliderDotsContainer.innerHTML = '';

      // Generar slides y dots
      imageUrls.forEach((url, index) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        if (index === 0) slide.classList.add('active');
        
        const img = document.createElement('img');
                img.src = url;
        img.alt = `Imagen del slider ${index + 1}`;
        
        slide.appendChild(img);
        sliderTrack.appendChild(slide);

        const dot = document.createElement('span');
        dot.className = 'dot';
        if (index === 0) dot.classList.add('active');
        dot.dataset.slide = index;
        sliderDotsContainer.appendChild(dot);
      });

      // --- Lógica de control del slider ---
      const slides = sliderTrack.querySelectorAll('.slide');
      const dots = sliderDotsContainer.querySelectorAll('.dot');
      const totalSlides = slides.length;
      let currentIndex = 0;

      function goToSlide(index) {
        sliderTrack.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
        currentIndex = index;
      }

      function nextSlide() {
        goToSlide((currentIndex + 1) % totalSlides);
      }

      function prevSlide() {
        goToSlide((currentIndex - 1 + totalSlides) % totalSlides);
      }

      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
      });

      if (nextBtn) nextBtn.addEventListener('click', nextSlide);
      if (prevBtn) prevBtn.addEventListener('click', prevSlide);

      // Iniciar el carrusel automático
      setInterval(nextSlide, 4000);

    } catch (error) {
      console.error('Error al inicializar el slider dinámico:', error);
      sliderTrack.innerHTML = '<p>No se pudieron cargar las imágenes.</p>';
    }
  }

  initializeDynamicSlider();

  const whatsappContainer = document.querySelector('.whatsapp-container');
  const floatingWhatsAppButton = document.getElementById('floatingWhatsAppButton');

  if (whatsappContainer && floatingWhatsAppButton) {
    floatingWhatsAppButton.addEventListener('click', () => {
      whatsappContainer.classList.toggle('widget-open');
    });
  }
});
