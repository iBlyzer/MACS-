document.addEventListener('DOMContentLoaded', () => {
    // 0. Check for token
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 1. Constants and Global Variables
    const API_URL = 'http://localhost:3001/api';
    const BASE_URL = 'http://localhost:3001';

    // 2. Element Selectors
    const tablaProductosContainer = document.getElementById('tabla-productos-container');
    const modal = document.getElementById('producto-modal');
    const modalTitulo = document.getElementById('modal-titulo');
    const closeButton = document.querySelector('.close-button');
    const productoForm = document.getElementById('producto-form');
    const btnAgregarProducto = document.getElementById('btn-agregar-producto');
    const btnFiltrar = document.getElementById('btn-filtrar');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const filtroSubcategoria = document.getElementById('filtro-subcategoria');
    const filtroNombre = document.getElementById('filtro-nombre');
    const imagePreviewsContainer = document.getElementById('image-previews-container');
    const imageCountSpan = document.getElementById('image-count');
    const productoCategoriaSelect = document.getElementById('producto-categoria');

    const imageTypes = [
        { id: 'imagen_3_4', name: 'Principal (3:4)' },
        { id: 'imagen_frontal', name: 'Frontal' },
        { id: 'imagen_lateral', name: 'Lateral' },
        { id: 'imagen_trasera', name: 'Trasera' },
        { id: 'imagen_superior', name: 'Superior' },
        { id: 'imagen_inferior', name: 'Inferior' },
    ];

    // 3. API Fetch Helper
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
        const fetchOptions = { ...options };
        fetchOptions.headers = { ...fetchOptions.headers, 'Authorization': `Bearer ${token}` };

        const response = await fetch(url, fetchOptions);
        if (response.status === 401) {
            console.error('Authentication error (401). Redirecting to login.');
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            throw new Error('Token invalid or expired.');
        }
        return response;
    }

    // 4. Core Functions (Data Loading)
    async function cargarProductos() {
        const searchTerm = filtroNombre ? filtroNombre.value : '';
        const categoriaId = filtroCategoria ? filtroCategoria.value : '';
        const subcategoriaId = filtroSubcategoria ? filtroSubcategoria.value : '';

        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (categoriaId) params.append('categoria', categoriaId);
        if (subcategoriaId) params.append('subcategoriaId', subcategoriaId);

        const fetchUrl = `${API_URL}/productos/get-all?${params.toString()}`;

        try {
            const response = await fetchWithAuth(fetchUrl);
            if (!response.ok) throw new Error('Could not load products.');
            const productos = await response.json();
            renderizarTabla(productos);
        } catch (error) {
            console.error('Error loading products:', error);
            if (tablaProductosContainer) tablaProductosContainer.innerHTML = '<p>Error al cargar productos.</p>';
        }
    }

    async function cargarCategorias() {
        try {
            const response = await fetchWithAuth(`${API_URL}/categorias`);
            if (!response.ok) throw new Error('Could not load categories.');
            const categorias = await response.json();
            const optionsHTML = categorias.map(cat => `<option value="${cat.id}">${cat.nombre}</option>`).join('');
            
            if (productoCategoriaSelect) productoCategoriaSelect.innerHTML = `<option value="">Seleccione una categoría</option>${optionsHTML}`;
            if (filtroCategoria) filtroCategoria.innerHTML = `<option value="">Todas las categorías</option>${optionsHTML}`;
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    async function cargarSubcategorias(categoriaId, subcategoriaSeleccionadaId = null) {
        const productoSubcategoria = document.getElementById('producto-subcategoria');
        if (!productoSubcategoria) return;
        if (!categoriaId) {
            productoSubcategoria.innerHTML = '<option value="">Seleccione una categoría primero</option>';
            return;
        }
        try {
            const response = await fetchWithAuth(`${API_URL}/subs?categoriaId=${categoriaId}`);
            if (!response.ok) throw new Error('Could not load subcategories.');
            const subcategorias = await response.json();
            
            let optionsHTML = '<option value="">Seleccione una subcategoría</option>';
            if (subcategorias.length > 0) {
                optionsHTML += subcategorias.map(sub => `<option value="${sub.id}">${sub.nombre}</option>`).join('');
            } else {
                optionsHTML = '<option value="">No hay subcategorías</option>';
            }
            productoSubcategoria.innerHTML = optionsHTML;
    
            if (subcategoriaSeleccionadaId) {
                productoSubcategoria.value = subcategoriaSeleccionadaId;
            }
        } catch (error) {
            console.error('Error loading subcategories:', error);
        }
    }
    
    async function cargarSubcategoriasFiltro(categoriaId) {
        if (!filtroSubcategoria) return;
        let fetchUrl = `${API_URL}/subs`;
        if (categoriaId) fetchUrl += `?categoriaId=${categoriaId}`;
        
        try {
            const response = await fetchWithAuth(fetchUrl);
            if (!response.ok) throw new Error('Could not load filter subcategories.');
            const subcategorias = await response.json();
            
            let optionsHTML = '<option value="">Todas las subcategorías</option>';
            optionsHTML += subcategorias.map(sub => `<option value="${sub.id}">${sub.nombre}</option>`).join('');
            filtroSubcategoria.innerHTML = optionsHTML;
        } catch (error) {
            console.error('Error loading filter subcategories:', error);
        }
    }

    // 5. Rendering Functions
    function renderizarTabla(productos) {
        if (!tablaProductosContainer) return;
        if (!productos || productos.length === 0) {
            tablaProductosContainer.innerHTML = '<p>No hay productos para mostrar.</p>';
            return;
        }

        const tablaHTML = `
            <table class="tabla-admin">
                <thead>
                    <tr>
                        <th>ID</th><th>Icono</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map(p => `
                        <tr class="${!p.activo ? 'producto-inactivo' : ''}">
                            <td>${p.id}</td>
                            <td><img src="${p.imagen_3_4 ? BASE_URL + p.imagen_3_4 : 'https://via.placeholder.com/50'}" alt="Icono" class="producto-icono"></td>
                            <td>${p.nombre || 'N/A'}</td>
                            <td>${p.categoria_nombre || 'N/A'}</td>
                            <td>$${(parseFloat(p.precio) || 0).toFixed(2)}</td>
                            <td>${p.stock || 0}</td>
                            <td><span class="status ${p.activo ? 'status-activo' : 'status-inactivo'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
                            <td class="acciones">
                                <button class="btn-editar" data-id="${p.id}">EDITAR</button>
                                <button class="btn-eliminar" data-id="${p.id}">ELIMINAR</button>
                                ${p.activo 
                                    ? `<button class="btn-desactivar" data-id="${p.id}">DESACTIVAR</button>` 
                                    : `<button class="btn-activar" data-id="${p.id}">ACTIVAR</button>`
                                }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        tablaProductosContainer.innerHTML = tablaHTML;
    }

    function inicializarImagePreviews(existingImages = {}) {
        if (!imagePreviewsContainer) return;
        imagePreviewsContainer.innerHTML = '';
        imageTypes.forEach(type => {
            const card = document.createElement('div');
            card.className = 'image-preview-card';
            card.dataset.typeId = type.id;
            const existingImageUrl = existingImages[type.id] ? `${BASE_URL}${existingImages[type.id]}` : '';
            card.innerHTML = `
                <p>${type.name}</p>
                <div class="image-placeholder">
                    ${existingImageUrl ? `<img src="${existingImageUrl}" alt="${type.name}">` : `<span class="placeholder-text">Sin imagen</span>`}
                </div>
                <div class="file-input-wrapper">
                    <label for="${type.id}-file" class="file-input-label">Elegir archivo</label>
                    <input type="file" id="${type.id}-file" name="${type.id}" accept="image/*" style="display: none;">
                    <span class="file-name">No se ha seleccionado...</span>
                </div>
                <button type="button" class="remove-image-btn" style="display: ${existingImageUrl ? 'block' : 'none'};">&times;</button>
            `;
            imagePreviewsContainer.appendChild(card);
        });
        updateImageCounter();
        attachImagePreviewListeners();
    }

    function attachImagePreviewListeners() {
        document.querySelectorAll('.image-preview-card').forEach(card => {
            const fileInput = card.querySelector('input[type="file"]');
            const fileNameSpan = card.querySelector('.file-name');
            const placeholder = card.querySelector('.image-placeholder');
            const removeBtn = card.querySelector('.remove-image-btn');

            if (fileInput) fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if(placeholder) placeholder.innerHTML = `<img src="${event.target.result}" alt="Vista previa">`;
                        if(fileNameSpan) fileNameSpan.textContent = file.name;
                        if(removeBtn) removeBtn.style.display = 'block';
                        updateImageCounter();
                    };
                    reader.readAsDataURL(file);
                }
            });

            if (removeBtn) removeBtn.addEventListener('click', () => {
                if(fileInput) fileInput.value = '';
                if(placeholder) placeholder.innerHTML = `<span class="placeholder-text">Sin imagen</span>`;
                if(fileNameSpan) fileNameSpan.textContent = 'No se ha seleccionado...';
                removeBtn.style.display = 'none';
                updateImageCounter();
            });
        });
    }

    function updateImageCounter() {
        if (!imageCountSpan) return;
        const selectedImages = document.querySelectorAll('.image-placeholder img').length;
        imageCountSpan.textContent = `${selectedImages}`;
    }

    // 6. Modal and CRUD Actions
    function abrirModal() { if(modal) modal.style.display = 'block'; }
    function cerrarModal() { if(modal) modal.style.display = 'none'; }

    function abrirModalParaCrear() {
        if(modalTitulo) modalTitulo.textContent = 'Nuevo Producto';
        if(productoForm) productoForm.reset();
        const productoIdInput = document.getElementById('producto-id');
        if(productoIdInput) productoIdInput.value = '';
        const productoSubcategoria = document.getElementById('producto-subcategoria');
        if(productoSubcategoria) productoSubcategoria.innerHTML = '<option value="">Seleccione una categoría primero</option>';
        inicializarImagePreviews();
        abrirModal();
    }

    async function abrirModalParaEditar(id) {
        if (!id) return;
        if(modalTitulo) modalTitulo.textContent = 'Editar Producto';
        if(productoForm) productoForm.reset();
        try {
            const response = await fetchWithAuth(`${API_URL}/productos/admin/${id}`);
            if (!response.ok) throw new Error('Could not get product.');
            const p = await response.json();

            // Populate form fields
            document.getElementById('producto-id').value = p.id;
            document.getElementById('nombre').value = p.nombre;
            document.getElementById('marca').value = p.marca;
            document.getElementById('precio').value = p.precio;
            document.getElementById('stock').value = p.stock;
            document.getElementById('producto-descripcion').value = p.descripcion;
            document.getElementById('producto-referencia').value = p.numero_referencia || '';
            document.getElementById('activo').checked = p.activo;
            document.getElementById('destacado').checked = p.destacado;
            document.getElementById('producto-categoria').value = p.categoria_id;
            
            await cargarSubcategorias(p.categoria_id, p.subcategoria_id);

            const existingImages = {
                imagen_3_4: p.imagen_3_4,
                imagen_frontal: p.imagen_frontal,
                imagen_lateral: p.imagen_lateral,
                imagen_trasera: p.imagen_trasera,
                imagen_superior: p.imagen_superior,
                imagen_inferior: p.imagen_inferior,
            };
            inicializarImagePreviews(existingImages);
            abrirModal();
        } catch (error) {
            console.error('Error loading product for editing:', error);
            alert('Could not load product information.');
        }
    }

    async function guardarProducto(e) {
        e.preventDefault();
        const id = document.getElementById('producto-id').value;
        const esNuevo = !id;
        const formData = new FormData(productoForm);

        // Append file inputs to formData
        document.querySelectorAll('.image-preview-card input[type="file"]').forEach(input => {
            if (input.files[0]) {
                formData.append(input.name, input.files[0]);
            }
        });

        const url = esNuevo ? `${API_URL}/productos` : `${API_URL}/productos/${id}`;
        const method = esNuevo ? 'POST' : 'PUT';

        try {
            const response = await fetchWithAuth(url, { method, body: formData });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error saving product.');
            }
            alert(`Producto ${esNuevo ? 'creado' : 'actualizado'} correctamente.`);
            cerrarModal();
            cargarProductos();
        } catch (error) {
            console.error('Error saving product:', error);
            alert(`Hubo un error: ${error.message}`);
        }
    }

    async function toggleEstadoProducto(id) {
        try {
            const response = await fetchWithAuth(`${API_URL}/productos/${id}/toggle-active`, { method: 'PATCH' });
            if (!response.ok) throw new Error('Could not change product status.');
            cargarProductos();
        } catch (error) {
            console.error('Error toggling status:', error);
            alert('Error changing product status.');
        }
    }

    async function eliminarProducto(id) {
        try {
            const response = await fetchWithAuth(`${API_URL}/productos/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Could not delete product.');
            alert('Producto eliminado correctamente.');
            cargarProductos();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Error deleting product.');
        }
    }

    // 7. Initialization and Event Listeners
    function inicializar() {
        // Initial data loads
        cargarCategorias().then(() => {
            cargarSubcategoriasFiltro(filtroCategoria ? filtroCategoria.value : null).then(() => {
                cargarProductos();
            });
        });

        // General UI Listeners
        if (btnAgregarProducto) btnAgregarProducto.addEventListener('click', abrirModalParaCrear);
        if (filtroCategoria) {
            filtroCategoria.addEventListener('change', async () => {
                await cargarSubcategoriasFiltro(filtroCategoria.value);
                cargarProductos();
            });
        }
        if (filtroSubcategoria) filtroSubcategoria.addEventListener('change', cargarProductos);
        if (filtroNombre) filtroNombre.addEventListener('input', cargarProductos); // Optional: filter as you type

        // Modal Listeners
        if (closeButton) closeButton.addEventListener('click', cerrarModal);
        if (productoForm) productoForm.addEventListener('submit', guardarProducto);
        window.addEventListener('click', (e) => { if (modal && e.target === modal) cerrarModal(); });
        if (productoCategoriaSelect) productoCategoriaSelect.addEventListener('change', (e) => cargarSubcategorias(e.target.value));

        // Table Event Delegation
        if (tablaProductosContainer) {
            tablaProductosContainer.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                
                const id = target.dataset.id;
                if (!id) return;

                if (target.classList.contains('btn-editar')) {
                    abrirModalParaEditar(id);
                } else if (target.classList.contains('btn-eliminar')) {
                    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                        eliminarProducto(id);
                    }
                } else if (target.classList.contains('btn-activar') || target.classList.contains('btn-desactivar')) {
                    toggleEstadoProducto(id);
                }
            });
        }
    }

    inicializar();
});