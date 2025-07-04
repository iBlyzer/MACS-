document.addEventListener('DOMContentLoaded', () => {
    const cestaVaciaDiv = document.getElementById('cesta-vacia');
    const cestaConItemsDiv = document.getElementById('cesta-con-items');
    const pagarAhoraBtn = document.getElementById('pagar-ahora');
    
    const subtotalCestaSpan = document.getElementById('subtotal-cesta');
    const descuentoCestaSpan = document.getElementById('descuento-cesta');
    const precioTotalSpan = document.getElementById('precio-total');

    let cesta = JSON.parse(localStorage.getItem('cesta')) || [];
    let productsDetailsMap = new Map();

    // --- INICIO: Script de Migración y Reparación de la Cesta ---
    let cestaModificada = false;
    cesta = cesta.map(item => {
        const itemId = item.id || item._id;
        if (!itemId) {
            cestaModificada = true;
            return null; // Eliminar artículos sin ID
        }

        const talla = item.talla || 'unica';
        const idCorrecto = `${itemId}-${talla}`;

        // Estandarizar el objeto item
        if (item.id !== itemId) { item.id = itemId; cestaModificada = true; }
        if (item._id) { delete item._id; cestaModificada = true; }
        if (item.talla !== talla) { item.talla = talla; cestaModificada = true; }
        if (item.cartItemId !== idCorrecto) { item.cartItemId = idCorrecto; cestaModificada = true; }

        return item;
    }).filter(Boolean); // Limpiar los items nulos

    if (cestaModificada) {
        console.log('Cesta reparada: Se estandarizaron los artículos y se corrigieron IDs.');
        localStorage.setItem('cesta', JSON.stringify(cesta));
    }
    // --- FIN: Script de Migración y Reparación de la Cesta ---

    function formatCurrency(value) {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
    }

    async function fetchProductDetails() {
        const ids = [...new Set(cesta.map(item => item.id))];
        if (ids.length === 0) {
            productsDetailsMap.clear();
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/productos/details-by-ids`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            if (!response.ok) throw new Error('Failed to fetch product details.');
            const products = await response.json();
            productsDetailsMap.clear();
            products.forEach(p => productsDetailsMap.set(p.id.toString(), p));
        } catch (error) {
            console.error("Error fetching product details:", error);
        }
    }

    async function renderizarCesta() {
        if (typeof actualizarContadorCesta === 'function') {
            actualizarContadorCesta();
        }
        
        await fetchProductDetails();

        const totalItems = cesta.reduce((acc, item) => acc + item.cantidad, 0);

        if (cesta.length === 0) {
            cestaVaciaDiv.style.display = 'block';
            cestaConItemsDiv.style.display = 'none';
            if (document.querySelector('#cesta-vacia h2')) {
                document.querySelector('#cesta-vacia h2').textContent = `TODOS LOS ARTÍCULOS (0)`;
            }
            pagarAhoraBtn.disabled = true;
        } else {
            cestaVaciaDiv.style.display = 'none';
            cestaConItemsDiv.style.display = 'block';
            pagarAhoraBtn.disabled = false;

            let itemsHTML = `<h2>TODOS LOS ARTÍCULOS (${totalItems})</h2>`;
            
            cesta.forEach(item => {
                const precioFormateado = formatCurrency(item.precio);
                const productDetails = productsDetailsMap.get(item.id.toString());
                const imagenUrl = productDetails && productDetails.imagen_3_4
                    ? `${API_BASE_URL}${productDetails.imagen_3_4}`
                    : '/assets/logo.png';

                let tallaInfo = '';
                if (productDetails && productDetails.tallas && productDetails.tallas.length > 0) {
                    const options = productDetails.tallas.map(t =>
                        `<option value="${t.talla}" ${t.talla == item.talla ? 'selected' : ''} ${t.stock === 0 && t.talla != item.talla ? 'disabled' : ''}>` +
                        `${t.talla}${t.stock === 0 && t.talla != item.talla ? ' (Agotado)' : ''}` +
                        `</option>`
                    ).join('');
                    tallaInfo = `
                        <div class="item-talla-selector" style="display: flex; align-items: center; margin-top: 5px;">
                            <label for="talla-select-${item.cartItemId}" style="font-size: 0.9em; color: #555; margin-right: 5px;">Talla:</label>
                            <select id="talla-select-${item.cartItemId}" class="talla-select" data-id="${item.cartItemId}" style="padding: 2px 5px; border-radius: 4px;">
                                ${options}
                            </select>
                        </div>`;
                } else if (item.talla) {
                    tallaInfo = `<p class="item-talla" style="font-size: 0.9em; color: #555;">Talla: ${item.talla}</p>`;
                }
                
                const stockTallaActual = productDetails?.tallas.find(t => t.talla === item.talla)?.stock;
                const stockMax = stockTallaActual !== undefined ? stockTallaActual : (item.stock || 99);

                itemsHTML += `
                    <div class="cesta-item">
                        <img src="${imagenUrl}" alt="${item.nombre}" class="cesta-item-imagen">
                        <div class="item-detalles">
                            <a href="producto-detalle.html?id=${item.id}" class="item-nombre-link">
                                <p class="item-marca">${item.marca || 'Macs'}</p>
                                <p class="item-nombre">${item.nombre}</p>
                            </a>
                            ${tallaInfo}
                            <p class="item-precio">${precioFormateado}</p>
                        </div>
                        <div class="item-controles">
                            <div class="item-cantidad">
                                <button class="btn-cantidad" data-id="${item.cartItemId}" data-accion="decrementar">-</button>
                                <input type="number" class="item-quantity-input" value="${item.cantidad}" data-id="${item.cartItemId}" min="1" max="${stockMax}">
                                <button class="btn-cantidad" data-id="${item.cartItemId}" data-accion="incrementar">+</button>
                            </div>
                            <button class="btn-eliminar" data-id="${item.cartItemId}">Eliminar</button>
                        </div>
                    </div>
                `;
            });

            cestaConItemsDiv.innerHTML = itemsHTML;
        }
        calcularTotal();
    }

    function calcularTotal() {
        const totalItems = cesta.reduce((acc, item) => acc + item.cantidad, 0);
        const subtotal = cesta.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

        if (totalItems === 0) {
            subtotalCestaSpan.textContent = formatCurrency(0);
            descuentoCestaSpan.textContent = formatCurrency(0);
            precioTotalSpan.textContent = formatCurrency(0);
            descuentoCestaSpan.parentElement.style.display = 'none';
            return;
        }

        const nuevoPrecioUnitario = getTieredUnitPrice(totalItems);
        let totalFinal = subtotal;
        let descuento = 0;

        if (nuevoPrecioUnitario !== null) {
            totalFinal = nuevoPrecioUnitario * totalItems;
            descuento = subtotal - totalFinal;
        }

        subtotalCestaSpan.textContent = formatCurrency(subtotal);
        precioTotalSpan.textContent = formatCurrency(totalFinal);

        if (descuento > 0) {
            descuentoCestaSpan.textContent = `- ${formatCurrency(descuento)}`;
            descuentoCestaSpan.parentElement.style.display = 'flex';
        } else {
            descuentoCestaSpan.parentElement.style.display = 'none';
        }
    }

    function actualizarCantidad(cartItemId, accion) {
        const itemIndex = cesta.findIndex(item => item.cartItemId === cartItemId);
        if (itemIndex === -1) return;

        const productDetails = productsDetailsMap.get(cesta[itemIndex].id.toString());
        const stockTallaActual = productDetails?.tallas.find(t => t.talla === cesta[itemIndex].talla)?.stock;
        const stockMax = stockTallaActual !== undefined ? stockTallaActual : (cesta[itemIndex].stock || 99);

        if (accion === 'incrementar') {
            if (cesta[itemIndex].cantidad < stockMax) {
                cesta[itemIndex].cantidad++;
            } else {
                alert(`No puedes añadir más de ${stockMax} unidades para la talla seleccionada.`);
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

    function actualizarCantidadManualmente(cartItemId, nuevaCantidad) {
        const itemIndex = cesta.findIndex(item => item.cartItemId === cartItemId);
        if (itemIndex === -1) return;

        const productDetails = productsDetailsMap.get(cesta[itemIndex].id.toString());
        const stockTallaActual = productDetails?.tallas.find(t => t.talla === cesta[itemIndex].talla)?.stock;
        const stockMax = stockTallaActual !== undefined ? stockTallaActual : (cesta[itemIndex].stock || 99);

        if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
            cesta[itemIndex].cantidad = 1;
        } else if (nuevaCantidad > stockMax) {
            alert(`Lo sentimos, para la talla seleccionada solo quedan ${stockMax} unidades.`);
            cesta[itemIndex].cantidad = stockMax;
        } else {
            cesta[itemIndex].cantidad = nuevaCantidad;
        }

        localStorage.setItem('cesta', JSON.stringify(cesta));
        renderizarCesta();
    }

    function actualizarTalla(oldCartItemId, nuevaTalla) {
        const itemIndex = cesta.findIndex(item => item.cartItemId === oldCartItemId);
        if (itemIndex === -1) return;

        const originalItem = { ...cesta[itemIndex] };
        const productId = originalItem.id;
        const newCartItemId = `${productId}-Talla-${nuevaTalla}`;
        
        const existingItemIndex = cesta.findIndex(item => item.cartItemId === newCartItemId);

        const productDetails = productsDetailsMap.get(productId.toString());
        const stockNuevaTalla = productDetails?.tallas.find(t => t.talla === nuevaTalla)?.stock || 0;

        if (existingItemIndex !== -1) {
            if (existingItemIndex === itemIndex) return; 
            
            const cantidadTotal = cesta[existingItemIndex].cantidad + originalItem.cantidad;
            if (cantidadTotal > stockNuevaTalla) {
                alert(`No se puede cambiar la talla. La cantidad total (${cantidadTotal}) excede el stock disponible (${stockNuevaTalla}) para la talla ${nuevaTalla}.`);
                renderizarCesta();
                return;
            }

            cesta[existingItemIndex].cantidad = cantidadTotal;
            cesta.splice(itemIndex, 1);
        } else {
            if (originalItem.cantidad > stockNuevaTalla) {
                alert(`No se puede cambiar la talla. La cantidad (${originalItem.cantidad}) excede el stock disponible (${stockNuevaTalla}) para la talla ${nuevaTalla}.`);
                renderizarCesta();
                return;
            }
            cesta[itemIndex].talla = nuevaTalla;
            cesta[itemIndex].cartItemId = newCartItemId;
            cesta[itemIndex].stock = stockNuevaTalla;
        }

        localStorage.setItem('cesta', JSON.stringify(cesta));
        renderizarCesta();
    }

    function eliminarItem(cartItemId) {
        cesta = cesta.filter(item => item.cartItemId !== cartItemId);
        localStorage.setItem('cesta', JSON.stringify(cesta));
        renderizarCesta();
    }

    document.body.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('btn-cantidad') && target.closest('.cesta-item')) {
            actualizarCantidad(target.dataset.id, target.dataset.accion);
        }
        if (target.classList.contains('btn-eliminar') && target.closest('.cesta-item')) {
            eliminarItem(target.dataset.id);
        }
    });

    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.classList.contains('item-quantity-input') && target.closest('.cesta-item')) {
            actualizarCantidadManualmente(target.dataset.id, parseInt(target.value, 10));
        } else if (target.classList.contains('talla-select') && target.closest('.cesta-item')) {
            actualizarTalla(target.dataset.id, target.value);
        }
    });

    pagarAhoraBtn.addEventListener('click', () => {
        if (cesta.length === 0) return;

        const numeroReferencia = `MACS-${Date.now()}`;
        const numeroWhatsApp = '573019998933';
        let mensaje = `¡Hola! Quisiera hacer el siguiente pedido:\n\n*N° de Referencia: ${numeroReferencia}*\n\n`;

        cesta.forEach(item => {
            const refText = item.numero_referencia ? `*Ref:* ${item.numero_referencia} ` : '';
            const tallaText = item.talla ? `*Talla:* ${item.talla} ` : '';
            mensaje += `*Producto:* ${item.nombre} ${refText}${tallaText}*Cantidad:* ${item.cantidad} *Precio Unitario:* ${formatCurrency(item.precio)}\n`;
        });

        const totalItems = cesta.reduce((acc, item) => acc + item.cantidad, 0);
        const subtotal = cesta.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
        const nuevoPrecioUnitario = getTieredUnitPrice(totalItems);
        let totalFinal = subtotal;
        let descuento = 0;

        if (nuevoPrecioUnitario !== null) {
            totalFinal = nuevoPrecioUnitario * totalItems;
            descuento = subtotal - totalFinal;
        }

        mensaje += `--- RESUMEN ---\n`;
        mensaje += `*Subtotal:* ${formatCurrency(subtotal)}\n`;
        if (descuento > 0) {
            mensaje += `*Descuento por volumen:* - ${formatCurrency(descuento)}\n`;
        }
        mensaje += `*TOTAL DEL PEDIDO: ${formatCurrency(totalFinal)}*`;

        const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

        localStorage.removeItem('cesta');
        window.open(urlWhatsApp, '_blank');
        cesta = [];
        renderizarCesta();
    });

    renderizarCesta();
});