document.addEventListener('DOMContentLoaded', () => {
    const productoCategoriaSelect = document.getElementById('producto-categoria');
    const productoSubcategoriaSelect = document.getElementById('producto-subcategoria');

    // --- Lógica para cargar categorías y subcategorías ---
    const API_URL = 'http://localhost:3000/api'; // Asegúrate de que esta URL sea correcta

    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('No se encontró el token de autenticación. Por favor, inicie sesión de nuevo.');
            window.location.href = '/admin/login.html'; // Redirigir al login
            throw new Error('Token no encontrado');
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
        };

        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Error al contactar la API: ${errorData.message}`);
            }
            return response.json();
        } catch (error) {
            console.error('Error en fetchWithAuth:', error);
            // No mostramos la alerta aquí para que cada llamada pueda manejarla
            throw error; // Re-lanzamos el error para que el llamador lo maneje
        }
    }

    async function cargarCategorias() {
        if (!productoCategoriaSelect) return;
        try {
            const categorias = await fetchWithAuth(`${API_URL}/categorias`);
            productoCategoriaSelect.innerHTML = '<option value="">Seleccione una categoría</option>';
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nombre;
                productoCategoriaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    }

    async function cargarSubcategorias(categoriaId) {
        if (!productoSubcategoriaSelect) return;
        productoSubcategoriaSelect.innerHTML = '<option value="">Seleccione una subcategoría</option>';
        if (!categoriaId) return;

        try {
            const subcategorias = await fetchWithAuth(`${API_URL}/subcategorias/categoria/${categoriaId}`);
            subcategorias.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.id;
                option.textContent = sub.nombre;
                productoSubcategoriaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar subcategorías:', error);
        }
    }

    if (productoCategoriaSelect) {
        cargarCategorias();
        productoCategoriaSelect.addEventListener('change', () => {
            cargarSubcategorias(productoCategoriaSelect.value);
        });
    }

    const stockForm = document.getElementById('stock-change-form');
    const historyBody = document.getElementById('stock-history-body');
    const refProductoInput = document.getElementById('ref_producto');
    const tallaFormGroup = document.getElementById('talla-form-group');
    const tallaSelect = document.getElementById('talla');
    const refStatus = document.getElementById('ref-status');
    const productNameDisplay = document.getElementById('product-name-display');

    async function checkAndFetchTallas() {
        const API_URL = 'http://localhost:3000/api'; // Asegúrate de que esta URL sea correcta
        const referencia = refProductoInput.value.trim();
        const categoriaId = productoCategoriaSelect.value;
        const subcategoriaId = productoSubcategoriaSelect.value;

        // Limpiar estado anterior
        refStatus.textContent = '';
        refStatus.className = 'ref-status';
        productNameDisplay.textContent = ''; // Limpiar el nombre del producto
        tallaFormGroup.style.display = 'none';

        // SOLO PROCEDER SI LOS TRES CAMPOS ESTÁN LLENOS
        if (referencia && categoriaId && subcategoriaId) {
            refStatus.textContent = 'Buscando...';
            refStatus.classList.add('searching');

            console.log(`%c[FRONTEND-DEBUG] Iniciando búsqueda con:`, 'color: blue; font-weight: bold;');
            console.log(`%c  - Referencia: ${referencia}`, 'color: blue;');
            console.log(`%c  - Categoria ID: ${categoriaId}`, 'color: blue;');

            try {
                // APUNTAMOS A LA NUEVA RUTA DE BACKEND
                const url = `/api/stock/lookup?referencia=${encodeURIComponent(referencia)}&categoriaId=${encodeURIComponent(categoriaId)}&subcategoriaId=${encodeURIComponent(subcategoriaId)}`;
                const data = await fetchWithAuth(url);

                if (data && data.id) {
                    refStatus.textContent = 'Referencia válida.';
                    refStatus.className = 'ref-status success';

                    // --- NUEVA LÓGICA ---
                    // El lookup solo nos da el ID, ahora buscamos el producto completo para obtener el nombre.
                    try {
                        const productoCompleto = await fetchWithAuth(`${API_URL}/productos/${data.id}`);
                        if (productoCompleto && productoCompleto.nombre) {
                            productNameDisplay.textContent = productoCompleto.nombre; // Mostrar el nombre del producto
                        }
                    } catch (fetchError) {
                        console.error('Error al obtener los detalles completos del producto:', fetchError);
                        productNameDisplay.textContent = 'No se pudo cargar el nombre.';
                    }
                    // --- FIN NUEVA LÓGICA ---

                    // Si el producto tiene tallas, las cargamos
                    if (data.tiene_tallas && data.tallas) {
                        tallaFormGroup.style.display = 'block';
                        tallaSelect.innerHTML = '<option value="">Seleccione una talla</option>';
                        data.tallas.forEach(tallaInfo => {
                            const option = document.createElement('option');
                            option.value = tallaInfo.talla;
                            option.textContent = `${tallaInfo.talla} (Stock: ${tallaInfo.stock})`;
                            tallaSelect.appendChild(option);
                        });
                    } else {
                        tallaFormGroup.style.display = 'none';
                    }
                } else {
                    throw new Error('Producto no encontrado en la respuesta de la API');
                }
            } catch (error) {
                refStatus.textContent = 'Referencia no encontrada.';
                refStatus.className = 'ref-status error';
                productNameDisplay.textContent = ''; // Limpiar si no se encuentra
                refStatus.classList.add('error');
                tallaFormGroup.style.display = 'none';
                console.error('%c[FRONTEND-DEBUG] Error en checkAndFetchTallas:', 'color: red; font-weight: bold;', error.message);
            }
        }
    }

    // La búsqueda se activa al cambiar la referencia o la categoría.
    refProductoInput.addEventListener('blur', checkAndFetchTallas);
    productoCategoriaSelect.addEventListener('change', checkAndFetchTallas);
    productoSubcategoriaSelect.addEventListener('change', checkAndFetchTallas);

    const stockChangeIdSufijoInput = document.getElementById('stock_change_order_id_sufijo');
    const stockChangeIdHiddenInput = document.getElementById('stock_change_order_id');

    const filterBtn = document.getElementById('btn-filtrar');
    const clearFiltersBtn = document.getElementById('btn-limpiar-filtros');

    const fetchStockHistory = async (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        try {
            const history = await fetchWithAuth(`/api/stock/modificaciones?${queryParams}`);
            renderStockHistory(history);
        } catch (error) {
            // fetchWithAuth ya maneja el error y lo loguea, solo mostramos la alerta
            alert(error.message || 'Error al obtener el historial de stock.');
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
            historyBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No se encontraron registros.</td></tr>';
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
                <td>${record.talla || 'N/A'}</td>
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
            const result = await fetchWithAuth('/api/stock/modificaciones', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            // Muestra el mensaje de éxito específico del servidor.
            alert(result.message);
            stockForm.reset();
            fetchStockHistory(); // Recargar el historial
        } catch (error) {
            console.error(error);
            // Si el error es genérico, es muy probable que sea por un ID de movimiento duplicado.
            if (error.message.includes('Error interno del servidor')) {
                alert('Error al procesar la modificación. El ID de Movimiento que intenta usar ya existe. Por favor, verifíquelo.');
            } else {
                // Para otros errores, muestra el mensaje específico.
                alert(error.message);
            }
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
