function agregarAlCarrito(product) {
  // Asegurarse de que el producto tenga la información necesaria
    if (!product || !(product.id || product._id) || !product.nombre || !product.precio) {
    console.error('Intento de agregar un producto inválido a la cesta:', product);
    alert('No se pudo agregar el producto. Falta información.');
    return;
  }

  let cesta = JSON.parse(localStorage.getItem('cesta')) || [];
    const productoExistente = cesta.find(item => (item.id || item._id) === (product.id || product._id));

  const cantidadAAgregar = product.cantidad || 1; // Usar la cantidad del producto o 1 por defecto

  if (productoExistente) {
    productoExistente.cantidad += cantidadAAgregar;
  } else {
    cesta.push({ ...product, cantidad: cantidadAAgregar });
  }

  localStorage.setItem('cesta', JSON.stringify(cesta));
  actualizarContadorCesta();
  
  // Notificación visual para el usuario
  alert(`${product.nombre} ha sido agregado a la cesta.`);
}

function actualizarContadorCesta() {
  const cartCountElement = document.getElementById('cart-count');
  if (!cartCountElement) return;

  let cesta = JSON.parse(localStorage.getItem('cesta')) || [];
  const totalItems = cesta.reduce((total, item) => total + (item.cantidad || 0), 0);
  cartCountElement.innerText = totalItems;
}

// Actualizar el contador en cuanto cargue la página
document.addEventListener('DOMContentLoaded', actualizarContadorCesta);
