document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded and parsed. Initializing scripts...');

  // --- Element Selection ---
  const header = document.querySelector('header');
  const floatingNavBtn = document.getElementById('floatingNavButton');
  const modalMenu = document.getElementById('navModal');
  const floatingWhatsAppButton = document.getElementById('floatingWhatsAppButton');
  const whatsappWidget = document.getElementById('whatsappWidget');
  const whatsappContainer = document.getElementById('whatsappContainer');

  console.log('Elemento Botón WhatsApp:', floatingWhatsAppButton);
  console.log('Elemento Widget WhatsApp:', whatsappWidget);
  console.log('Elemento Contenedor WhatsApp:', whatsappContainer);

  // --- State Variables ---
  let lastScrollTop = 0;
  const SCROLL_CLASS = 'btn-visible-por-scroll';
  const MENU_OPEN_CLASS = 'menu-abierto';

  // --- Visibility Logic ---
  const manageScrollVisibility = () => {
    const isCestaPage = window.location.pathname.includes('cesta.html');

    if (floatingNavBtn) {
      // En la página de la cesta, el botón siempre debe estar visible.
      if (isCestaPage) {
        floatingNavBtn.classList.add(SCROLL_CLASS);
        return;
      }

      // En otras páginas, se muestra según el scroll.
      const shouldBeVisible = window.pageYOffset > 200;
      if (!floatingNavBtn.classList.contains(MENU_OPEN_CLASS)) {
        floatingNavBtn.classList.toggle(SCROLL_CLASS, shouldBeVisible);
      }
    }
  };

  // --- Modal Logic ---
  if (floatingNavBtn && modalMenu) {
    const closeModal = () => {
      modalMenu.classList.remove('show');
      floatingNavBtn.classList.remove(MENU_OPEN_CLASS);
      setTimeout(manageScrollVisibility, 0);
    };

    floatingNavBtn.addEventListener('click', function() {
      this.classList.toggle(MENU_OPEN_CLASS);
      modalMenu.classList.toggle('show');
      if (this.classList.contains(MENU_OPEN_CLASS)) {
        setTimeout(manageScrollVisibility, 0);
      }
    });

    document.addEventListener('click', function(event) {
      if (modalMenu.classList.contains('show') && !modalMenu.contains(event.target) && !floatingNavBtn.contains(event.target)) {
        closeModal();
      }
    });

    modalMenu.querySelectorAll('.modal-links a').forEach(link => link.addEventListener('click', closeModal));
  }

  // --- WhatsApp Widget Logic ---
  if (floatingWhatsAppButton && whatsappWidget && whatsappContainer) {
    console.log('Elementos de WhatsApp encontrados. Adjuntando eventos...');
    floatingWhatsAppButton.addEventListener('click', () => {
      console.log('¡Botón de WhatsApp clickeado!');
      whatsappContainer.classList.toggle('open');
    });

    document.addEventListener('click', function(event) {
      if (whatsappContainer.classList.contains('open') && 
          !whatsappContainer.contains(event.target) && 
          !floatingWhatsAppButton.contains(event.target)) {
        console.log('Clic fuera del widget. Cerrando...');
        whatsappContainer.classList.remove('open');
      }
    });
  } else {
    console.error('Error: No se encontraron uno o más elementos de WhatsApp. Verifica los IDs en cesta.html.');
  }

  // --- Lógica para ocultar el header al hacer scroll ---
  if (header) {
    // Oculta el header si no está en la parte superior al cargar la página
    if (window.scrollY > 0) {
        header.classList.add('header-hidden');
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 0) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
    });
  }

  // --- Scroll Listener para otros elementos ---
  window.addEventListener('scroll', () => {
    manageScrollVisibility();
  });
});
