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

    async function fetchProductDetails(ids) {
        if (ids.length === 0) {
            return [];
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/productos/details-by-ids?ids=${ids.join(',')}`);
            
            // Verificar si la respuesta de la red fue exitosa
            if (!response.ok) {
                // Lanzar un error con el estado para que pueda ser capturado por el bloque catch
                throw new Error(`Error de red: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching product details:', error);
            // Mostrar una alerta al usuario sobre el problema
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'No se pudieron cargar los detalles de los productos. Por favor, inténtalo de nuevo más tarde.',
            });
            // Retornar un array vacío en caso de error para evitar que el código que lo consume falle.
            return [];
        }
    }

    async function renderizarCesta() {
        if (typeof actualizarContadorCesta === 'function') {
            actualizarContadorCesta();
        }
        
        const ids = [...new Set(cesta.map(item => item.id))];
        const products = await fetchProductDetails(ids);

        productsDetailsMap.clear();
        products.forEach(p => productsDetailsMap.set(p.id.toString(), p));

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
                const imagenUrl = productDetails && productDetails.imagen_principal 
                    ? (productDetails.imagen_principal.startsWith('http') ? productDetails.imagen_principal : `${API_BASE_URL}${productDetails.imagen_principal}`)
                    : './assets/img/placeholder.png'; // Placeholder por si no hay imagen

                let tallaInfo = '';
                if (productDetails && Array.isArray(productDetails.tallas) && productDetails.tallas.length > 0) {
                    const tallaSeleccionada = productDetails.tallas.find(t => t.talla === item.talla);
                    const stock = tallaSeleccionada ? tallaSeleccionada.stock : 'N/A';
                    tallaInfo = `
                        <p class="mb-1">Talla: 
                            <select class="talla-select form-select form-select-sm d-inline-block w-auto" data-id="${item.cartItemId}">
                                ${productDetails.tallas.map(t => `<option value="${t.talla}" ${t.talla === item.talla ? 'selected' : ''}>${t.talla}</option>`).join('')}
                            </select>
                        </p>
                        <p class="mb-0 text-muted small">Stock: ${stock}</p>
                    `;
                } else if (productDetails && !productDetails.tiene_tallas) {
                    tallaInfo = `<p class="mb-1">Talla: Única</p>`;
                } else {
                    // Fallback por si las tallas no se cargan pero se esperaban
                    tallaInfo = `<p class="mb-1 text-danger">Talla no disponible</p>`;
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