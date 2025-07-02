function agregarAlCarrito(product) {
    if (!product || !(product.id || product._id) || !product.nombre || !product.precio) {
        console.error('Intento de agregar un producto inválido a la cesta:', product);
        alert('No se pudo agregar el producto. Falta información.');
        return;
    }

    let cesta = JSON.parse(localStorage.getItem('cesta')) || [];
    // Usamos cartItemId para identificar de forma única el producto y su talla
    const itemIndex = cesta.findIndex(item => item.cartItemId === product.cartItemId);
    const cantidadAAgregar = product.cantidad || 1;

    if (itemIndex > -1) {
        // El producto con la misma talla ya existe, solo actualizamos la cantidad.
        cesta[itemIndex].cantidad += cantidadAAgregar;
    } else {
        // Es un producto nuevo o una talla nueva del mismo producto.
        cesta.push({ ...product, cantidad: cantidadAAgregar });
    }


    localStorage.setItem('cesta', JSON.stringify(cesta));
    actualizarContadorCesta();

    alert(`${product.nombre} ha sido agregado a la cesta.`);
}

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
