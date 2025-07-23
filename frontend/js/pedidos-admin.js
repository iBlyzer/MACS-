document.addEventListener('DOMContentLoaded', function() {
    // --- Referencias a elementos del DOM ---
    const pedidoForm = document.getElementById('pedido-form');
    const productosLista = document.getElementById('pedido-productos-lista');
    const pedidoNumeroSufijoInput = document.getElementById('pedido-numero-sufijo');
    const pedidoNumeroHiddenInput = document.getElementById('pedido-numero');

    // --- Referencias a elementos de la Modal ---
    const modal = document.getElementById('product-modal'); // Corregido: ID del modal
    const openModalBtn = document.getElementById('btn-agregar-producto-pedido');
    const closeModalBtn = document.querySelector('.close-btn'); // Corregido: Clase del botón de cierre
    // La siguiente línea se deja comentada porque el formulario no existe en el modal actual
    // const productoTareaForm = document.getElementById('form-producto-tarea');

    // --- Funciones de la Modal ---
    function openModal() {
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
        productoTareaForm.reset(); // Limpiar el formulario al cerrar
    }

    // --- Event Listeners de la Modal ---
    openModalBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            closeModal();
        }
    });

    // --- Lógica principal del formulario de Pedidos ---

    // Inicializar vista de pedidos
    function initPedidosView() {
        const fechaInput = document.getElementById('pedido-fecha');
        fechaInput.value = new Date().toISOString().split('T')[0];
        pedidoForm.reset();
        productosLista.innerHTML = '';
        fechaInput.value = new Date().toISOString().split('T')[0];
        actualizarResumenPedido();
    }

    // Combinar prefijo y sufijo para el número de orden
    pedidoNumeroSufijoInput.addEventListener('input', () => {
        pedidoNumeroHiddenInput.value = `ORD-${pedidoNumeroSufijoInput.value}`;
    });

    // Lógica para AÑADIR producto desde la modal a la tabla
    // Se comenta temporalmente ya que el formulario 'productoTareaForm' no existe en el HTML actual.
    /*
    productoTareaForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Obtener valores del formulario de la modal
        const referencia = document.getElementById('producto-referencia').value;
        const nombre = document.getElementById('producto-nombre').value;
        const cantidad = parseFloat(document.getElementById('producto-cantidad').value) || 1;
        const valorUnitario = parseFloat(document.getElementById('producto-valor').value) || 0;
        const area = document.getElementById('tarea-area').value;
        const descripcion = document.getElementById('tarea-descripcion').value;

        const imagenesInput = document.getElementById('tarea-imagenes');
        const tieneImagenes = imagenesInput.files.length > 0;

        const valorTotal = cantidad * valorUnitario;

        // Crear la nueva fila para la tabla de productos
        const row = document.createElement('tr');
        row.dataset.tareaDescripcion = descripcion;

        row.dataset.tieneImagenes = tieneImagenes;
        
        row.innerHTML = `
            <td>${referencia}</td>
            <td>${nombre}</td>
            <td>${area}</td>
            <td>${cantidad}</td>
            <td>${valorUnitario.toFixed(2)}</td>
            <td class="valor-total-producto">${valorTotal.toFixed(2)}</td>
            <td><button type="button" class="btn-remove-producto">Eliminar</button></td>
            
            <input type="hidden" name="referencia[]" value="${referencia}">
            <input type="hidden" name="nombre[]" value="${nombre}">
            <input type="hidden" name="area[]" value="${area}">
            <input type="hidden" name="cantidad[]" value="${cantidad}">
            <input type="hidden" name="valor_unitario[]" value="${valorUnitario.toFixed(2)}">
            <input type="hidden" name="valor_total[]" value="${valorTotal.toFixed(2)}">
        `;
        
        productosLista.appendChild(row);
        actualizarResumenPedido();
        closeModal();
    });
    */

    // Eliminar filas de productos
    productosLista.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-producto')) {
            e.target.closest('tr').remove();
            actualizarResumenPedido();
        }
    });

    // Actualizar el resumen del pedido (subtotal, IVA, total)
    function actualizarResumenPedido() {
        let subtotal = 0;
        document.querySelectorAll('#pedido-productos-lista tr').forEach(fila => {
            const valorTotalCell = fila.querySelector('.valor-total-producto');
            if (valorTotalCell) {
                subtotal += parseFloat(valorTotalCell.textContent) || 0;
            }
        });

        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(value);

        document.getElementById('pedido-subtotal').value = subtotal.toFixed(2);
        document.getElementById('pedido-iva').value = iva.toFixed(2);
        document.getElementById('pedido-total').value = total.toFixed(2);

        document.getElementById('resumen-subtotal').textContent = formatCurrency(subtotal);
        document.getElementById('resumen-iva').textContent = formatCurrency(iva);
        document.getElementById('resumen-total').textContent = formatCurrency(total);
    }

    // Enviar el formulario principal
    pedidoForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const productos = [];
        let subtotalCalculado = 0;
        
        productosLista.querySelectorAll('tr').forEach(row => {
            const valorTotalProducto = parseFloat(row.querySelector('input[name="valor_total[]"]').value) || 0;
            subtotalCalculado += valorTotalProducto;
            
            productos.push({
                referencia: row.querySelector('input[name="referencia[]"]').value,
                nombre: row.querySelector('input[name="nombre[]"]').value,
                cantidad: parseFloat(row.querySelector('input[name="cantidad[]"]').value) || 0,
                valor_unitario: parseFloat(row.querySelector('input[name="valor_unitario[]"]').value) || 0,
                valor_total: valorTotalProducto,
                area: row.querySelector('input[name="area[]"]').value,
                tarea_descripcion: row.dataset.tareaDescripcion,

            });
        });

        const ivaCalculado = subtotalCalculado * 0.19;
        const totalCalculado = subtotalCalculado + ivaCalculado;

        const data = {
            cliente_nombre: document.getElementById('cliente-nombre').value,
            cliente_id: document.getElementById('cliente-id').value,
            cliente_telefono: document.getElementById('cliente-telefono').value,
            cliente_direccion: document.getElementById('cliente-direccion').value,
            pedido_fecha: document.getElementById('pedido-fecha').value,
            pedido_numero: document.getElementById('pedido-numero').value,
            pedido_vendedor: document.getElementById('pedido-vendedor').value,
            subtotal: subtotalCalculado,
            iva: ivaCalculado,
            total: totalCalculado,
            productos: productos
        };

        console.log('Enviando datos:', data);

        try {
            const response = await fetch('/api/pedidos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Error al crear el pedido.');
            }

            alert(result.message);
            
            if (result.downloadUrl) {
                const downloadLink = document.createElement('a');
                downloadLink.href = result.downloadUrl;
                downloadLink.download = `${data.pedido_numero}.pdf`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }

            initPedidosView();

        } catch (error) {
            console.error('Error al crear el pedido:', error);
            alert(error.message);
        }
    });

    // Inicializar la vista al cargar la página
    initPedidosView();
});
