document.addEventListener('DOMContentLoaded', function() {
    // Elementos de la tabla
    const tableBody = document.getElementById('pedidos-table-body');

    // Elementos de los filtros
    const filtroNumeroOrden = document.getElementById('filtro-numero-orden');
    const filtroCliente = document.getElementById('filtro-cliente');
    const filtroFechaInicio = document.getElementById('filtro-fecha-inicio');
    const filtroFechaFin = document.getElementById('filtro-fecha-fin');
    const btnFiltrar = document.getElementById('btn-filtrar');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');

    async function cargarPedidos(filtros = {}) {
        try {
            // Construir la URL con los parámetros de búsqueda
            const params = new URLSearchParams();
            if (filtros.numero_orden) params.append('numero_orden', filtros.numero_orden);
            if (filtros.cliente_nombre) params.append('cliente_nombre', filtros.cliente_nombre);
            if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
            if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
            
            const url = `/api/pedidos?${params.toString()}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Error al cargar el historial de pedidos.');
            }
            const pedidos = await response.json();

            tableBody.innerHTML = ''; // Limpiar la tabla

            if (pedidos.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No se encontraron pedidos con los filtros aplicados.</td></tr>';
                return;
            }

            pedidos.forEach(pedido => {
                const row = document.createElement('tr');
                
                const fecha = new Date(pedido.fecha).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                const total = parseFloat(pedido.total).toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    minimumFractionDigits: 2
                });

                row.innerHTML = `
                    <td>${pedido.numero_orden}</td>
                    <td>${fecha}</td>
                    <td>${pedido.cliente_nombre}</td>
                    <td>${total}</td>
                    <td>
                        <a href="/uploads/pedidos/${pedido.numero_orden}.pdf" class="btn-accion" target="_blank">Ver PDF</a>
                    </td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error('Error:', error);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">${error.message}</td></tr>`;
        }
    }

    // Evento para el botón de filtrar
    btnFiltrar.addEventListener('click', () => {
        const filtros = {
            numero_orden: filtroNumeroOrden.value,
            cliente_nombre: filtroCliente.value,
            fecha_inicio: filtroFechaInicio.value,
            fecha_fin: filtroFechaFin.value
        };
        cargarPedidos(filtros);
    });

    // Evento para el botón de limpiar filtros
    btnLimpiar.addEventListener('click', () => {
        filtroNumeroOrden.value = '';
        filtroCliente.value = '';
        filtroFechaInicio.value = '';
        filtroFechaFin.value = '';
        cargarPedidos();
    });

    // Carga inicial de todos los pedidos
    cargarPedidos();
});
