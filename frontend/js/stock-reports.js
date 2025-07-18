document.addEventListener('DOMContentLoaded', () => {
    const stockForm = document.getElementById('stock-change-form');
    const historyBody = document.getElementById('stock-history-body');

    const stockChangeIdSufijoInput = document.getElementById('stock_change_order_id_sufijo');
    const stockChangeIdHiddenInput = document.getElementById('stock_change_order_id');

    const filterBtn = document.getElementById('btn-filtrar');
    const clearFiltersBtn = document.getElementById('btn-limpiar-filtros');

    const fetchStockHistory = async (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        try {
            const response = await fetch(`/api/stock/modificaciones?${queryParams}`);
            if (!response.ok) {
                throw new Error('Error al obtener el historial de stock.');
            }
            const history = await response.json();
            renderStockHistory(history);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    // Combinar prefijo y sufijo para el ID de Movimiento
    if (stockChangeIdSufijoInput) {
        stockChangeIdSufijoInput.addEventListener('input', () => {
            stockChangeIdHiddenInput.value = `MOD-${stockChangeIdSufijoInput.value}`;
        });
    }

    const renderStockHistory = (history) => {
        historyBody.innerHTML = '';
        if (history.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No se encontraron registros.</td></tr>';
            return;
        }

        history.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.id}</td>
                <td>${new Date(record.fecha_modificacion).toLocaleDateString('es-CO')}</td>
                <td>${record.responsable_modificacion}</td>
                <td>${record.autorizado_por}</td>
                <td>${record.ref_producto}</td>
                <td>${record.cantidad_cambio}</td>
                <td>${record.tipo_cambio}</td>
                <td>${record.stock_change_order_id}</td>
                <td>${record.descripcion_cambio}</td>
            `;
            historyBody.appendChild(row);
        });
    };

    stockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(stockForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/stock/modificaciones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                // Si la respuesta no es OK, lanza un error con el mensaje del servidor.
                throw new Error(result.message || 'Ocurrió un error desconocido.');
            }

            // Muestra el mensaje de éxito específico del servidor.
            alert(result.message);
            stockForm.reset();
            fetchStockHistory(); // Recargar el historial
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    filterBtn.addEventListener('click', () => {
        const filters = {
            fecha_inicio: document.getElementById('filtro-fecha-inicio').value,
            fecha_fin: document.getElementById('filtro-fecha-fin').value,
            ref_producto: document.getElementById('filtro-referencia').value,
            responsable: document.getElementById('filtro-responsable').value,
            orden_id: document.getElementById('filtro-orden-id').value
        };
        // Eliminar filtros vacíos
        Object.keys(filters).forEach(key => filters[key] === '' && delete filters[key]);
        fetchStockHistory(filters);
    });

    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filtro-fecha-inicio').value = '';
        document.getElementById('filtro-fecha-fin').value = '';
        document.getElementById('filtro-referencia').value = '';
        document.getElementById('filtro-responsable').value = '';
        document.getElementById('filtro-orden-id').value = '';
        fetchStockHistory();
    });

    // Carga inicial del historial
    fetchStockHistory();
});
