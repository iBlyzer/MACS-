function agregarAlCarrito(product, boton) {
    if (!product || !product.id || !product.nombre || !product.precio) {
        console.error('Intento de agregar un producto inválido a la cesta:', product);
        alert('No se pudo agregar el producto. Falta información.');
        return;
    }

    // 1. Lógica de UI del botón (si el botón existe)
    let originalText = 'AGREGAR AL CARRITO'; // Texto por defecto
    if (boton) {
        const textElement = boton.querySelector('.btn-text');
        if (textElement) {
            originalText = textElement.innerHTML;
        }
        boton.classList.add('adding');
        boton.disabled = true;
        if (textElement) {
            textElement.textContent = 'AÑADIENDO...';
        }
    }

    // 2. Lógica de actualización del carrito (se ejecuta siempre)
    // Se usa una promesa para simular una operación asíncrona y no bloquear el hilo principal.
    new Promise(resolve => {
        setTimeout(() => {
            let cesta = JSON.parse(localStorage.getItem('cesta')) || [];
            const talla = product.talla || 'unica';
            const cartItemId = product.cartItemId || `${product.id}-${talla}`;
            const itemIndex = cesta.findIndex(item => item.cartItemId === cartItemId);
            const cantidadAAgregar = product.cantidad || 1;

            if (itemIndex > -1) {
                cesta[itemIndex].cantidad += cantidadAAgregar;
            } else {
                const newItem = { ...product, cantidad: cantidadAAgregar, talla: talla, cartItemId: cartItemId };
                cesta.push(newItem);
            }

            localStorage.setItem('cesta', JSON.stringify(cesta));
            actualizarContadorCesta();
            
            resolve(product); // Resolvemos con el producto añadido
        }, 1000); // Reducido el tiempo para una mejor experiencia de usuario
    }).then((addedProduct) => {
        // 3. Mostrar modal y actualizar UI del botón (cuando la promesa se resuelve)
        showAddedToCartModal(addedProduct, boton, originalText);
        
        if (boton) {
            boton.classList.remove('adding');
            boton.classList.add('added');
        }
    });
}

function showAddedToCartModal(product, boton, originalText) {
    const modal = document.getElementById('added-to-cart-modal');
    if (!modal) {
        console.error('Error: No se encontró el elemento de la modal #added-to-cart-modal.');
        return;
    }

    // Poblar datos del producto
    const imagePath = product.imagen_3_4 || product.imagen_principal;
    const imageUrl = imagePath && imagePath.startsWith('http') 
        ? imagePath 
        : (imagePath ? `${API_BASE_URL}${imagePath}` : './assets/placeholder.png');
    document.getElementById('modal-product-image').src = imageUrl;
    document.getElementById('modal-product-name').textContent = product.nombre;
    document.getElementById('modal-product-price').textContent = `$${Number(product.precio).toLocaleString('es-CO')}`;
    document.getElementById('modal-product-color').textContent = `Color: ${product.color || 'No especificado'}`;
    document.getElementById('modal-product-size').textContent = product.talla ? `Talla: ${product.talla}` : '';
    document.getElementById('modal-product-quantity').textContent = `Cantidad: ${product.cantidad || 1}`;

    // Poblar resumen del carrito
    const cesta = JSON.parse(localStorage.getItem('cesta')) || [];
    const totalItems = cesta.reduce((total, item) => total + item.cantidad, 0);
    const subtotal = cesta.reduce((total, item) => total + (item.precio * item.cantidad), 0);

    document.getElementById('modal-cart-count').textContent = totalItems;
    document.getElementById('modal-cart-subtotal').textContent = `$${subtotal.toLocaleString('es-CO')}`;
    document.getElementById('modal-cart-total').textContent = `$${subtotal.toLocaleString('es-CO')}`;

    // Escuchar el cierre de la modal para restaurar el botón, solo si el botón existe
    if (boton) {
        const handleModalClose = () => {
            const textElement = boton.querySelector('.btn-text');
            boton.classList.remove('added');
            if (textElement) {
                textElement.innerHTML = originalText;
            }
            boton.disabled = false;
            // Usar { once: true } directamente en el listener es más limpio
        };
        document.addEventListener('modalClosed', handleModalClose, { once: true });
    }

    // Mostrar modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);

}

function hideAddedToCartModal() {
    const modal = document.getElementById('added-to-cart-modal');
    if (!modal) return;

    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        // Disparar evento personalizado cuando la modal se oculta
        document.dispatchEvent(new CustomEvent('modalClosed'));
    }, 300); // Coincide con la duración de la transición
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('added-to-cart-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    if (modal) {
        closeModalBtn.addEventListener('click', hideAddedToCartModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAddedToCartModal();
            }
        });
    }
});

function actualizarContadorCesta() {
  const cartCountElement = document.getElementById('cart-count');
  if (!cartCountElement) return;

  let cesta = JSON.parse(localStorage.getItem('cesta')) || [];
  const totalItems = cesta.reduce((total, item) => total + (item.cantidad || 0), 0);
  cartCountElement.innerText = totalItems;

  if (totalItems > 0) {
    cartCountElement.classList.remove('hidden');
  } else {
    cartCountElement.classList.add('hidden');
  }
}

// Actualizar el contador en cuanto cargue la página
document.addEventListener('DOMContentLoaded', actualizarContadorCesta);
