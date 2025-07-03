function agregarAlCarrito(product) {
    if (!product || !product.id || !product.nombre || !product.precio) {
        console.error('Intento de agregar un producto inválido a la cesta:', product);
        alert('No se pudo agregar el producto. Falta información.');
        return;
    }

    let cesta = JSON.parse(localStorage.getItem('cesta')) || [];
    
    // Define la talla. Para productos sin tallas, usamos un identificador consistente.
    const talla = product.talla || 'unica';
    // Crea el identificador único aquí. Esta es la corrección clave.
    const cartItemId = `${product.id}-${talla}`;

    const itemIndex = cesta.findIndex(item => item.cartItemId === cartItemId);
    const cantidadAAgregar = product.cantidad || 1;

    if (itemIndex > -1) {
        // El artículo con este ID ya existe, solo actualizamos la cantidad.
        cesta[itemIndex].cantidad += cantidadAAgregar;
    } else {
        // Es un artículo nuevo, lo añadimos a la cesta con toda la información necesaria.
        const newItem = {
            ...product,
            cantidad: cantidadAAgregar,
            talla: talla, // Nos aseguramos de que la talla esté establecida.
            cartItemId: cartItemId // Establecemos el nuevo y correcto cartItemId.
        };
        cesta.push(newItem);
    }

    localStorage.setItem('cesta', JSON.stringify(cesta));
    actualizarContadorCesta();

    // Mensaje de confirmación mejorado
    const tallaMsg = product.talla ? `(Talla: ${product.talla})` : '';
    alert(`${product.nombre} ${tallaMsg} ha sido agregado a la cesta.`);
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
