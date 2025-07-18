document.addEventListener('DOMContentLoaded', function() {
    const pedidoForm = document.getElementById('pedido-form');
    const addProductoBtn = document.getElementById('btn-agregar-producto-pedido');
    const productosLista = document.getElementById('pedido-productos-lista');

    // Inicializar vista de pedidos
    function initPedidosView() {
        // Establecer la fecha actual
        const fechaInput = document.getElementById('pedido-fecha');
        fechaInput.value = new Date().toISOString().split('T')[0];

        // Generar número de orden único (ej. timestamp)
        const numeroOrdenInput = document.getElementById('pedido-numero');
        numeroOrdenInput.value = `ORD-${Date.now()}`;

        // Limpiar formulario
        pedidoForm.reset();
        productosLista.innerHTML = '';
        fechaInput.value = new Date().toISOString().split('T')[0];
        numeroOrdenInput.value = `ORD-${Date.now()}`;
        updateResumen();
    }



    // Lógica para añadir productos a la orden
    addProductoBtn.addEventListener('click', () => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="producto-ref" placeholder="Referencia"></td>
            <td><input type="text" class="producto-nombre" placeholder="Nombre"></td>
            <td><input type="number" class="producto-cantidad" value="1" min="1"></td>
            <td><input type="number" class="producto-valor-unitario" value="0" min="0"></td>
            <td><input type="text" class="producto-valor-total" readonly></td>
            <td><button type="button" class="btn-remove-producto">Eliminar</button></td>
        `;
        productosLista.appendChild(row);
    });

    // Calcular totales y eliminar filas
    productosLista.addEventListener('input', (e) => {
        if (e.target.classList.contains('producto-cantidad') || e.target.classList.contains('producto-valor-unitario')) {
            const row = e.target.closest('tr');
            const cantidad = parseFloat(row.querySelector('.producto-cantidad').value) || 0;
            const valorUnitario = parseFloat(row.querySelector('.producto-valor-unitario').value) || 0;
            const valorTotalInput = row.querySelector('.producto-valor-total');
            valorTotalInput.value = (cantidad * valorUnitario).toFixed(2);
            updateResumen();
        }
    });

    productosLista.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-producto')) {
            e.target.closest('tr').remove();
            updateResumen();
        }
    });

    // Actualizar el resumen del pedido (subtotal, IVA, total)
    function updateResumen() {
        let subtotal = 0;
        productosLista.querySelectorAll('tr').forEach(row => {
            const valorTotal = parseFloat(row.querySelector('.producto-valor-total').value) || 0;
            subtotal += valorTotal;
        });

        const iva = subtotal * 0.19;
        const total = subtotal + iva;

        document.getElementById('pedido-subtotal').value = subtotal.toFixed(2);
        document.getElementById('pedido-iva').value = iva.toFixed(2);
        document.getElementById('pedido-total').value = total.toFixed(2);
    }

    // Enviar el formulario
    pedidoForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const productos = [];
        let subtotalCalculado = 0;
        productosLista.querySelectorAll('tr').forEach(row => {
            const valorTotalProducto = parseFloat(row.querySelector('.producto-valor-total').value) || 0;
            subtotalCalculado += valorTotalProducto;
            productos.push({
                referencia: row.querySelector('.producto-ref').value,
                nombre: row.querySelector('.producto-nombre').value,
                cantidad: parseFloat(row.querySelector('.producto-cantidad').value) || 0,
                valor_unitario: parseFloat(row.querySelector('.producto-valor-unitario').value) || 0,
                valor_total: parseFloat(row.querySelector('.producto-valor-total').value) || 0
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

        try {
            const response = await fetch('/api/pedidos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Error en la respuesta del servidor');
            }

            const result = await response.json();
            alert(result.message);
            
            // Ofrecer la descarga del archivo
            const downloadLink = document.createElement('a');
            downloadLink.href = result.downloadUrl;
            downloadLink.download = `${data.pedido_numero}.pdf`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            initPedidosView(); // Limpiar y reiniciar el formulario

        } catch (error) {
            console.error('Error al crear el pedido:', error);
            alert('Error al crear el pedido. Por favor, revise la consola para más detalles.');
        }
    });

    // Inicializar la vista al cargar la página
    initPedidosView();
});
