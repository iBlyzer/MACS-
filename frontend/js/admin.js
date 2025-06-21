document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const API_URL = 'http://localhost:3001/api';
    const BASE_URL = 'http://localhost:3001';

    const tablaProductosContainer = document.getElementById('tabla-productos-container');
    const modal = document.getElementById('producto-modal');
    const modalTitulo = document.getElementById('modal-titulo');
    const closeButton = document.querySelector('.close-button');
    const btnNuevoProducto = document.getElementById('btn-nuevo-producto');
    const productoForm = document.getElementById('producto-form');

    const productoId = document.getElementById('producto-id');
    const nombre = document.getElementById('nombre');
    const marca = document.getElementById('marca');
    const precio = document.getElementById('precio');
    const stock = document.getElementById('stock');
    const descripcion = document.getElementById('producto-descripcion');
    const numero_referencia = document.getElementById('producto-referencia');
    const categoria = document.getElementById('producto-categoria');
    const subcategoria = document.getElementById('producto-subcategoria');
    const activo = document.getElementById('activo');
    const destacado = document.getElementById('destacado');

    const imagen_frontal = document.getElementById('imagen_frontal');
    const imagen_icono = document.getElementById('imagen_icono');
    const imagen_trasera = document.getElementById('imagen_trasera');
    const imagen_lateral_derecha = document.getElementById('imagen_lateral_derecha');
    const imagen_lateral_izquierda = document.getElementById('imagen_lateral_izquierda');


    async function cargarProductos() {
        const searchTerm = document.getElementById('buscar').value;
        const categoriaId = document.getElementById('filtro-categoria').value;
        const subcategoriaId = document.getElementById('filtro-subcategoria').value;

        let fetchUrl = `${API_URL}/productos/get-all?`;
        const params = new URLSearchParams();

        if (searchTerm) {
            params.append('search', searchTerm);
        }
        if (categoriaId) {
            params.append('categoria', categoriaId);
        }
        if (subcategoriaId) {
            params.append('subcategoriaId', subcategoriaId);
        }

        fetchUrl += params.toString();

        try {
            console.log('Fetching products from URL:', fetchUrl);
            const response = await fetch(fetchUrl, { headers: { 'x-auth-token': token } });
            if (!response.ok) {
                console.error('Fetch failed with status:', response.status);
                throw new Error('No se pudieron cargar los productos.');
            }
            const productos = await response.json();
            renderizarTabla(productos);
        } catch (error) { 
            console.error('Error:', error);
            tablaProductosContainer.innerHTML = '<p>Error al cargar los productos.</p>';
        }
    }

    async function cargarCategorias() {
        const filtroCategoria = document.getElementById('filtro-categoria');
        const productoCategoria = document.getElementById('producto-categoria');
        try {
            const response = await fetch(`${API_URL}/categorias`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('No se pudieron cargar las categorías.');
            const categorias = await response.json();
            
            const optionsHTML = categorias.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('');
            
            // Populate modal dropdown
            if(productoCategoria) productoCategoria.innerHTML = `<option value="">Seleccione una categoría</option>${optionsHTML}`;
            
            // Populate filter dropdown
            if (filtroCategoria) {
                filtroCategoria.innerHTML = `<option value="">Todas las categorías</option>${optionsHTML}`;
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            if(productoCategoria) productoCategoria.innerHTML = '<option value="">Error al cargar</option>';
            if (filtroCategoria) {
                filtroCategoria.innerHTML = '<option value="">Error</option>';
            }
        }
    }

    async function cargarSubcategoriasFiltro(categoriaId) {
        const filtroSubcategoria = document.getElementById('filtro-subcategoria');
        let fetchUrl = `${API_URL}/subs`;

        if (categoriaId) {
            fetchUrl += `?categoriaId=${categoriaId}`;
        }

        try {
            const response = await fetch(fetchUrl, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('No se pudieron cargar las subcategorías para el filtro.');
            const subcategorias = await response.json();
            
            let optionsHTML = '<option value="">Todas las subcategorías</option>';
            optionsHTML += subcategorias.map(sub => `<option value="${sub.id}">${sub.nombre}</option>`).join('');
            
            if (filtroSubcategoria) {
                filtroSubcategoria.innerHTML = optionsHTML;
            }
        } catch (error) {
            console.error('Error al cargar subcategorías para el filtro:', error);
            if (filtroSubcategoria) {
                filtroSubcategoria.innerHTML = '<option value="">Error</option>';
            }
        }
    }

    async function cargarSubcategorias(categoriaId, subcategoriaSeleccionadaId = null) {
        const productoSubcategoria = document.getElementById('producto-subcategoria');
        if (!categoriaId) {
            productoSubcategoria.innerHTML = '<option value="">Seleccione una categoría primero</option>';
            return;
        }
        try {
            const response = await fetch(`${API_URL}/subs?categoriaId=${categoriaId}`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('No se pudieron cargar las subcategorías.');
            const subcategorias = await response.json();
            
            if (subcategorias.length === 0) {
                productoSubcategoria.innerHTML = '<option value="">No hay subcategorías</option>';
            } else {
                const optionsHTML = subcategorias.map(sub => `<option value="${sub.id}">${sub.nombre}</option>`).join('');
                productoSubcategoria.innerHTML = `<option value="">Seleccione una subcategoría</option>${optionsHTML}`;
            }
    
            if (subcategoriaSeleccionadaId) {
                productoSubcategoria.value = subcategoriaSeleccionadaId;
            }
        } catch (error) {
            console.error('Error al cargar subcategorías:', error);
            productoSubcategoria.innerHTML = '<option value="">Error al cargar</option>';
        }
    }

    function renderizarTabla(productos) {
        if (productos.length === 0) {
            tablaProductosContainer.innerHTML = '<p>No hay productos para mostrar.</p>';
            return;
        }

        const tablaHTML = `
            <table class="tabla-admin">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Icono</th>
                        <th>Nombre</th>
                        <th>Marca</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map(producto => `
                        <tr class="${!producto.activo ? 'producto-inactivo' : ''}">
                            <td>${producto.id}</td>
                            <td><img src="${BASE_URL}${producto.imagen_icono || '/default-icon.png'}" alt="Icono" class="producto-icono"></td>
                            <td>${producto.nombre || 'N/A'}</td>
                            <td>${producto.marca || 'N/A'}</td>
                            <td>$${(parseFloat(producto.precio) || 0).toFixed(2)}</td>
                            <td>${producto.stock || 0}</td>
                            <td>
                                <span class="status ${producto.activo ? 'status-activo' : 'status-inactivo'}">
                                    ${producto.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-editar" data-id="${producto.id}">Editar</button>
                                <button class="btn-eliminar" data-id="${producto.id}">Eliminar</button>
                                <button class="btn-toggle-status" data-id="${producto.id}">Cambiar Estado</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        tablaProductosContainer.innerHTML = tablaHTML;
    }

    function abrirModal() { modal.style.display = 'block'; }
    function cerrarModal() { modal.style.display = 'none'; }

    function resetImagePreviews() {
        document.getElementById('frontal-preview').textContent = '';
        document.getElementById('icono-preview').textContent = '';
        document.getElementById('trasera-preview').textContent = '';
        document.getElementById('derecha-preview').textContent = '';
        document.getElementById('izquierda-preview').textContent = '';
    }

    function abrirModalParaCrear() {
        modalTitulo.textContent = 'Nuevo Producto';
        productoForm.reset();
        productoId.value = '';
        resetImagePreviews();
        document.getElementById('producto-subcategoria').innerHTML = '<option value="">Seleccione una categoría primero</option>';
        abrirModal();
    }

    async function abrirModalParaEditar(id) {
        modalTitulo.textContent = 'Editar Producto';
        productoForm.reset();
        resetImagePreviews();
        try {
            const response = await fetch(`${API_URL}/productos/${id}`, { headers: { 'x-auth-token': token } });
            if (!response.ok) throw new Error('No se pudo obtener el producto.');
            const p = await response.json();

            productoId.value = p.id;
            nombre.value = p.nombre;
            marca.value = p.marca;
            precio.value = p.precio;
            stock.value = p.stock;
            descripcion.value = p.descripcion;
            numero_referencia.value = p.numero_referencia || '';
            
            // Set category and then load/set subcategory
            document.getElementById('producto-categoria').value = p.categoria_id;
            await cargarSubcategorias(p.categoria_id, p.subcategoria_id);
            
            activo.checked = p.activo;
            destacado.checked = p.destacado;

            document.getElementById('frontal-preview').textContent = p.imagen_frontal ? p.imagen_frontal.split('/').pop() : 'No hay imagen';
            document.getElementById('icono-preview').textContent = p.imagen_icono ? p.imagen_icono.split('/').pop() : 'No hay imagen';
            document.getElementById('trasera-preview').textContent = p.imagen_trasera ? p.imagen_trasera.split('/').pop() : 'No hay imagen';
            document.getElementById('derecha-preview').textContent = p.imagen_lateral_derecha ? p.imagen_lateral_derecha.split('/').pop() : 'No hay imagen';
            document.getElementById('izquierda-preview').textContent = p.imagen_lateral_izquierda ? p.imagen_lateral_izquierda.split('/').pop() : 'No hay imagen';


            abrirModal();
        } catch (error) {
            console.error('Error al cargar producto para editar:', error);
            alert('No se pudo cargar la información del producto.');
        }
    }

    btnNuevoProducto.addEventListener('click', abrirModalParaCrear);
    closeButton.addEventListener('click', cerrarModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal();
    });

    tablaProductosContainer.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('btn-eliminar')) {
            if (confirm(`¿Estás seguro de que quieres eliminar el producto con ID ${id}?`)) await eliminarProducto(id);
        } else if (e.target.classList.contains('btn-editar')) {
            await abrirModalParaEditar(id);
        } else if (e.target.classList.contains('btn-toggle-status')) {
            await toggleEstadoProducto(id);
        }
    });

    productoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = productoId.value;
        const esNuevo = !id;

        const formData = new FormData();
        formData.append('nombre', nombre.value);
        formData.append('marca', marca.value);
        formData.append('precio', parseFloat(precio.value));
        formData.append('stock', parseInt(stock.value, 10));
        formData.append('descripcion', descripcion.value);
        formData.append('numero_referencia', numero_referencia.value);

        const categoriaIdNum = parseInt(categoria.value, 10);
        if (!isNaN(categoriaIdNum)) {
            formData.append('categoria_id', categoriaIdNum);
        }

        const subcategoriaIdNum = parseInt(subcategoria.value, 10);
        if (!isNaN(subcategoriaIdNum)) {
            formData.append('subcategoria_id', subcategoriaIdNum);
        }

        formData.append('activo', activo.checked);
        formData.append('destacado', destacado.checked);

        if (imagen_frontal.files[0]) formData.append('imagen_frontal', imagen_frontal.files[0]);
        if (imagen_icono.files[0]) formData.append('imagen_icono', imagen_icono.files[0]);
        if (imagen_trasera.files[0]) formData.append('imagen_trasera', imagen_trasera.files[0]);
        if (imagen_lateral_derecha.files[0]) formData.append('imagen_lateral_derecha', imagen_lateral_derecha.files[0]);
        if (imagen_lateral_izquierda.files[0]) formData.append('imagen_lateral_izquierda', imagen_lateral_izquierda.files[0]);


        const url = esNuevo ? `${API_URL}/productos` : `${API_URL}/productos/${id}`;
        const method = esNuevo ? 'POST' : 'PUT';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'x-auth-token': token },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar el producto.');
            }

            alert(`Producto ${esNuevo ? 'creado' : 'actualizado'} correctamente.`);
            cerrarModal();
            cargarProductos();
        } catch (error) {
            console.error('Error al guardar:', error);
            alert(`Hubo un error: ${error.message}`);
        }
    });

    async function toggleEstadoProducto(id) {
        try {
            const response = await fetch(`${API_URL}/productos/${id}/toggle-active`, {
                method: 'PATCH',
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) throw new Error('No se pudo cambiar el estado del producto.');
            cargarProductos(); // Recargar la tabla para mostrar el cambio
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            alert('Hubo un error al cambiar el estado del producto.');
        }
    }

    async function eliminarProducto(id) {
        try {
            const response = await fetch(`${API_URL}/productos/${id}`, {
                method: 'DELETE',
                headers: { 'x-auth-token': token }
            });
            if (!response.ok) throw new Error('No se pudo eliminar el producto.');
            alert('Producto eliminado correctamente.');
            cargarProductos();
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Hubo un error al eliminar el producto.');
        }
    }

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Event listener for category change to load subcategories
    document.getElementById('producto-categoria').addEventListener('change', (e) => {
        cargarSubcategorias(e.target.value);
    });

    // Event listeners for filters
    document.getElementById('buscar').addEventListener('input', cargarProductos);
    
    document.getElementById('filtro-categoria').addEventListener('change', async () => {
        const categoriaId = document.getElementById('filtro-categoria').value;
        await cargarSubcategoriasFiltro(categoriaId);
        cargarProductos();
    });

    document.getElementById('filtro-subcategoria').addEventListener('change', cargarProductos);

    // Initial data load
    cargarProductos();
    cargarCategorias();
    cargarSubcategoriasFiltro(); // Cargar todas las subcategorías al inicio
});
