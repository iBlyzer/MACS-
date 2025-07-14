function agregarAlCarrito(product, boton) {
    if (!product || !product.id || !product.nombre || !product.precio) {
        console.error('Intento de agregar un producto inválido a la cesta:', product);
        alert('No se pudo agregar el producto. Falta información.');
        return;
    }

    if (boton) {
        const textElement = boton.querySelector('.btn-text');
        if (!textElement) return;
        const originalText = textElement.innerHTML;

        boton.classList.add('adding');
        boton.disabled = true;
        textElement.textContent = 'AÑADIENDO...';

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
                
                resolve(product);
            }, 1500);
        }).then((addedProduct) => {
            // Cambiar a estado de éxito y mostrar modal
            boton.classList.remove('adding');
            boton.classList.add('added');
            showAddedToCartModal(addedProduct, boton, originalText);
        });
    }
}

function showAddedToCartModal(product, boton, originalText) {
    const modal = document.getElementById('added-to-cart-modal');
    if (!modal) {
        console.error('Error: No se encontró el elemento de la modal #added-to-cart-modal.');
        return;
    }

    // Poblar datos del producto
    document.getElementById('modal-product-image').src = product.imagen_3_4 || './assets/placeholder.png';
    document.getElementById('modal-product-name').textContent = product.nombre;
    document.getElementById('modal-product-price').textContent = `$${product.precio.toLocaleString('es-CO')}`;
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

    // Escuchar el cierre de la modal para restaurar el botón
    const handleModalClose = () => {
        const textElement = boton.querySelector('.btn-text');
        boton.classList.remove('added');
        if (textElement) {
            textElement.innerHTML = originalText;
        }
        boton.disabled = false;
        document.removeEventListener('modalClosed', handleModalClose);
    };
    document.addEventListener('modalClosed', handleModalClose, { once: true });

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
