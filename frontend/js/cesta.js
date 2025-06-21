document.addEventListener('DOMContentLoaded', () => {
    const cestaVaciaDiv = document.getElementById('cesta-vacia');
    const cestaConItemsDiv = document.getElementById('cesta-con-items');
    const resumenPedidoDiv = document.querySelector('.resumen-pedido');
    const precioTotalSpan = document.getElementById('precio-total');
    const pagarAhoraBtn = document.getElementById('pagar-ahora');
    const articulosTitulo = document.querySelector('#cesta-vacia h2') || document.querySelector('#cesta-con-items h2');

    let cesta = JSON.parse(localStorage.getItem('cesta')) || [];

    function renderizarCesta() {
        // Actualizar contador en el header por si acaso
        if (typeof actualizarContadorCesta === 'function') {
            actualizarContadorCesta();
        }

        if (cesta.length === 0) {
            cestaVaciaDiv.style.display = 'block';
            cestaConItemsDiv.style.display = 'none';
            resumenPedidoDiv.style.display = 'block'; // Mostrar resumen aunque esté en cero
            pagarAhoraBtn.disabled = true;
        } else {
            cestaVaciaDiv.style.display = 'none';
            cestaConItemsDiv.style.display = 'block';
            pagarAhoraBtn.disabled = false;

            cestaConItemsDiv.innerHTML = `<h2>TODOS LOS ARTÍCULOS (${cesta.reduce((acc, item) => acc + item.cantidad, 0)})</h2>`;
            cesta.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('cesta-item');
                const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.precio);
                const imagenUrl = item.imagen_icono ? `http://localhost:3001${item.imagen_icono}` : 'https://via.placeholder.com/100x100.png?text=Imagen';

                itemElement.innerHTML = `
                    <a href="producto-detalle.html?id=${item.id}" class="cesta-item-link">
                        <img src="${imagenUrl}" alt="${item.nombre}">
                        <div class="item-info">
                            <p class="item-marca">${item.marca || 'Macs'}</p>
                            <p class="item-nombre">${item.nombre}</p>
                            <p class="item-precio">${precioFormateado}</p>
                        </div>
                    </a>
                    <div class="item-cantidad">
                        <button class="btn-cantidad" data-id="${item.id}" data-accion="decrementar">-</button>
                        <input type="number" class="item-quantity-input" value="${item.cantidad}" data-id="${item.id}" min="1" max="${item.stock || 99}">
                        <button class="btn-cantidad" data-id="${item.id}" data-accion="incrementar">+</button>
                    </div>
                    <button class="btn-eliminar" data-id="${item.id}">Eliminar</button>
                `;
                cestaConItemsDiv.appendChild(itemElement);
            });
        }
        calcularTotal();
    }

    function calcularTotal() {
        const total = cesta.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
        const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total);
        precioTotalSpan.textContent = precioFormateado;
    }

    function actualizarCantidad(productId, accion) {
        const itemIndex = cesta.findIndex(item => item.id == productId);
        if (itemIndex === -1) return;

        const stockDisponible = cesta[itemIndex].stock || 99;

        if (accion === 'incrementar') {
            if (cesta[itemIndex].cantidad < stockDisponible) {
                cesta[itemIndex].cantidad++;
            } else {
                alert(`No puedes agregar más unidades. Stock máximo alcanzado.`);
            }
        } else if (accion === 'decrementar') {
            cesta[itemIndex].cantidad--;
            if (cesta[itemIndex].cantidad <= 0) {
                cesta.splice(itemIndex, 1);
            }
        }

        localStorage.setItem('cesta', JSON.stringify(cesta));
        renderizarCesta();
    }

    function actualizarCantidadManualmente(productId, nuevaCantidad) {
        const itemIndex = cesta.findIndex(item => item.id == productId);
        if (itemIndex === -1) return;

        const stockDisponible = cesta[itemIndex].stock || 99;

        if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
            cesta[itemIndex].cantidad = 1;
        } else if (nuevaCantidad > stockDisponible) {
            alert(`Lo sentimos, solo quedan ${stockDisponible} unidades de este producto.`);
            cesta[itemIndex].cantidad = stockDisponible;
        } else {
            cesta[itemIndex].cantidad = nuevaCantidad;
        }

        localStorage.setItem('cesta', JSON.stringify(cesta));
        renderizarCesta();
    }

    function eliminarItem(productId) {
        cesta = cesta.filter(item => item.id != productId);
        localStorage.setItem('cesta', JSON.stringify(cesta));
        renderizarCesta();
    }

    // Event Listeners
    cestaConItemsDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-cantidad')) {
            const productId = e.target.dataset.id;
            const accion = e.target.dataset.accion;
            actualizarCantidad(productId, accion);
        }
        if (e.target.classList.contains('btn-eliminar')) {
            const productId = e.target.dataset.id;
            eliminarItem(productId);
        }
    });

    cestaConItemsDiv.addEventListener('change', (e) => {
        if (e.target.classList.contains('item-quantity-input')) {
            const productId = e.target.dataset.id;
            const nuevaCantidad = parseInt(e.target.value, 10);
            actualizarCantidadManualmente(productId, nuevaCantidad);
        }
    });

    pagarAhoraBtn.addEventListener('click', () => {
        if (cesta.length === 0) return;

        // Generar número de referencia único
        const numeroReferencia = `MACS-${Date.now()}`;

        const numeroWhatsApp = '573204829726'; // Reemplaza con tu número de WhatsApp
        let mensaje = `¡Hola! Quisiera hacer el siguiente pedido:\n\n`;
        mensaje += `*N° de Referencia: ${numeroReferencia}*\n\n`; // Añadir número de referencia

        cesta.forEach(item => {
            const precioFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.precio * item.cantidad);
            mensaje += `*Producto:* ${item.nombre}\n`;
            mensaje += `*Cantidad:* ${item.cantidad}\n`;
            mensaje += `*Subtotal:* ${precioFormateado}\n\n`;
        });

        const total = cesta.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
        const totalFormateado = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total);
        mensaje += `*TOTAL DEL PEDIDO: ${totalFormateado}*`;

        const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

        // Limpiar cesta después de enviar
        localStorage.removeItem('cesta');
        
        // Redirigir a WhatsApp
        window.open(urlWhatsApp, '_blank');

        // Actualizar la vista de la cesta
        cesta = [];
        renderizarCesta();
    });

    // Renderizar la cesta al cargar la página
    renderizarCesta();
});