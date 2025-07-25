document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG & TOKEN CHECK ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return; // Stop script execution if not logged in
    }

    const API_URL = 'http://localhost:3000/api';
    const BASE_URL = 'http://localhost:3000';

    // --- LOGOUT BUTTON (General) ---
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/admin/login.html';
        });
    }

    // --- PRODUCT PANEL SPECIFIC LOGIC ---
    const tablaProductosContainer = document.getElementById('tabla-productos-container');

    // Only run this code if we are on the product management page
    if (tablaProductosContainer) {

    // --- DOM SELECTORS (Product Page) ---
    const modal = document.getElementById('producto-modal');
    const modalTitulo = document.getElementById('modal-titulo');
    const closeButton = document.querySelector('.close-button');
    const productoForm = document.getElementById('producto-form');
    const btnAgregarProducto = document.getElementById('btn-agregar-producto');
    const productoCategoriaSelect = document.getElementById('producto-categoria');
    const productoSubcategoriaSelect = document.getElementById('producto-subcategoria');
    const tieneTallasCheckbox = document.getElementById('tiene_tallas');
    const tallasSection = document.getElementById('tallas-section');
    const stockGeneralSection = document.getElementById('stock-general-section');
    const stockGeneralInput = document.getElementById('stock');
    const btnAgregarTalla = document.getElementById('add-talla-btn');
    const tallasList = document.getElementById('tallas-list');

    // Selectors for main page filters
    const filtroNombreInput = document.getElementById('filtro-nombre');
    const filtroReferenciaInput = document.getElementById('filtro-referencia');
    const filtroMarcaInput = document.getElementById('filtro-marca');
    const filtroCategoriaSelect = document.getElementById('filtro-categoria');
    const filtroSubcategoriaSelect = document.getElementById('filtro-subcategoria');
    const filtroStockSelect = document.getElementById('filtro-stock');
    const filtroEstadoSelect = document.getElementById('filtro-estado');

    // --- AUTH MODAL & EDIT MODE SELECTORS ---
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authCancelBtn = document.getElementById('auth-cancel-btn');
    const authErrorMessage = document.getElementById('auth-error-message');
    const editModeToggle = document.getElementById('edit-mode-toggle');
    const productFormFieldset = document.getElementById('product-form-fieldset');


    // --- STATE VARIABLES ---
    let imagesToDelete = [];
    let imageFiles = {}; // Stores files to be uploaded, e.g., { imagen_frontal: File, ... }

    // --- API HELPER ---
    async function fetchWithAuth(url, options = {}) {
        const headers = new Headers(options.headers || {});
        if (token) {
            headers.append('Authorization', `Bearer ${token}`);
        }

        // Don't set Content-Type for FormData, browser does it automatically
        if (options.body instanceof FormData) {
            // Let the browser set the Content-Type with the boundary
        } else if (typeof options.body === 'object' && options.body !== null) {
            headers.append('Content-Type', 'application/json');
            options.body = JSON.stringify(options.body);
        }

        const finalOptions = { ...options, headers };

        try {
            const response = await fetch(url, finalOptions);

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                window.location.href = '/admin/login.html';
                throw new Error('No autorizado. Redirigiendo al login.');
            }

            if (response.status === 204) { // No Content success status
                return null;
            }
            
            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Ocurrió un error en la solicitud.');
            }

            return responseData;

        } catch (error) {
            console.error('Fetch error:', error);
            throw error; // Re-throw the error to be caught by the calling function
        }
    }

    // --- DATA LOADING ---
    async function cargarProductos() {
        try {
            const params = new URLSearchParams();
            if (filtroNombreInput.value) params.append('nombre', filtroNombreInput.value);
            if (filtroReferenciaInput.value) params.append('referencia', filtroReferenciaInput.value);
            if (filtroMarcaInput.value) params.append('marca', filtroMarcaInput.value);
            if (filtroCategoriaSelect.value) params.append('categoria_id', filtroCategoriaSelect.value);
            if (filtroSubcategoriaSelect.value) params.append('subcategoria_id', filtroSubcategoriaSelect.value);
            if (filtroStockSelect.value) params.append('stock', filtroStockSelect.value);
            if (filtroEstadoSelect.value) params.append('activo', filtroEstadoSelect.value);

            const url = `${API_URL}/productos/admin?${params.toString()}`;
            const productos = await fetchWithAuth(url);
            renderizarTabla(productos);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            if(tablaProductosContainer) tablaProductosContainer.innerHTML = '<p>Error al cargar productos.</p>';
        }
    }

    async function cargarCategorias() {
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

    // For main page filters
    async function cargarCategoriasParaFiltro() {
        if (!filtroCategoriaSelect) return;
        try {
            const categorias = await fetchWithAuth(`${API_URL}/categorias`);
            filtroCategoriaSelect.innerHTML = '<option value="">Todas las categorías</option>';
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nombre;
                filtroCategoriaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar categorías para filtro:', error);
        }
    }

    // For main page filters
    async function cargarSubcategoriasParaFiltro(categoriaId) {
        if (!filtroSubcategoriaSelect) return;
        filtroSubcategoriaSelect.innerHTML = '<option value="">Todas las subcategorías</option>';
        if (!categoriaId) {
            filtroSubcategoriaSelect.disabled = true;
            return;
        }
        filtroSubcategoriaSelect.disabled = false;
        try {
            const subcategorias = await fetchWithAuth(`${API_URL}/subcategorias/categoria/${categoriaId}`);
            subcategorias.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.id;
                option.textContent = sub.nombre;
                filtroSubcategoriaSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error al cargar subcategorías para filtro:', error);
        }
    }

    // --- UI RENDERING ---
    function renderizarTabla(productos) {
        if (!tablaProductosContainer || !Array.isArray(productos)) return;
        tablaProductosContainer.innerHTML = `
            <table class="tabla-admin">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Nombre</th>
                        <th>Referencia</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Dest.</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map(p => {
                        const imagenUrl = getImageUrl(p.imagen_3_4) || '/Assets/loading_no_background.png';
                        return `
                            <tr>
                                <td><img src="${imagenUrl}" alt="${p.nombre}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;"></td>
                                <td title="${p.nombre || ''}">${p.nombre || ''}</td>
                                <td>${p.numero_referencia || 'N/A'}</td>
                                <td>${p.categoria_nombre || 'N/A'}</td>
                                <td>S/ ${parseFloat(p.precio || 0).toFixed(2)}</td>
                                <td>${p.stock_total !== null && p.stock_total !== undefined ? p.stock_total : '0'}</td>
                                <td>
                                    <span class="status-pill ${p.activo ? 'activo' : 'inactivo'}">
                                        ${p.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td>${p.destacado ? '⭐' : ''}</td>
                                <td>
                                    <div class="acciones-container">
                                        <button class="btn-accion btn-edit" data-id="${p.id}">Editar</button>
                                        <button class="btn-accion btn-delete" data-id="${p.id}">Eliminar</button>
                                        <button class="btn-accion btn-toggle-status ${p.activo ? 'desactivar' : 'activar'}" data-id="${p.id}" data-status="${!p.activo}">
                                            ${p.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // --- MODAL MANAGEMENT ---
    function abrirModalParaCrear() {
        resetModal();
        modalTitulo.textContent = 'Agregar Producto';
        if (modal) modal.style.display = 'block';
    }

    async function abrirModalParaEditar(id) {
        resetModal();
        modalTitulo.textContent = 'Editar Producto';

        try {
            const p = await fetchWithAuth(`${API_URL}/productos/${id}`);
            document.getElementById('producto-id').value = p.id;
            document.getElementById('nombre').value = p.nombre;
            document.getElementById('marca').value = p.marca;
            document.getElementById('producto-descripcion').value = p.descripcion;
            document.getElementById('precio').value = p.precio;
            document.getElementById('producto-referencia').value = p.numero_referencia;
            document.getElementById('activo').checked = p.activo;
            document.getElementById('destacado').checked = p.destacado;

            await cargarCategorias();
            productoCategoriaSelect.value = p.categoria_id;
            await cargarSubcategorias(p.categoria_id);
            productoSubcategoriaSelect.value = p.subcategoria_id;

            // Manually trigger the category change logic to set up the form correctly
            handleCategoryChange();

            // Now, populate the sizes based on the product data, respecting the category logic
            const selectedOption = productoCategoriaSelect.options[productoCategoriaSelect.selectedIndex];
            const categoryName = selectedOption ? selectedOption.textContent.toLowerCase() : '';

            if (!categoryName.includes('gorras')) {
                // For non-gorras, populate sizes as before
                tieneTallasCheckbox.checked = p.tiene_tallas;
                updateTallasVisibility(p.tiene_tallas);

                if (p.tiene_tallas && p.tallas) {
                    tallasList.innerHTML = ''; // Clear before adding
                    p.tallas.forEach(t => agregarInputTalla(t.talla, t.stock)); 
                } else {
                    stockGeneralInput.value = p.stock_total || '';
                }
            } else {
                // For gorras, assume the first size entry is the 'OS' stock.
                tallasList.innerHTML = '';
                agregarInputTalla('OS', p.stock_total || '');
            }

            renderImageUploader(p.imagenes);
            if (modal) modal.style.display = 'block';
        } catch (error) {
            console.error('Error al cargar producto para editar:', error);
            alert('No se pudo cargar la información del producto.');
        }
    }

    function closeModal() {
        if (modal) modal.style.display = 'none';
    }

    function resetModal() {
        // Asegurarse de que los campos de stock vuelvan a ser editables para 'Crear Producto'
        stockGeneralInput.readOnly = false;

        productoForm.reset();
        document.getElementById('producto-id').value = '';
        if (tallasList) tallasList.innerHTML = '';

        // Reset special states for Gorras logic
        tieneTallasCheckbox.disabled = false;
        btnAgregarTalla.style.display = 'block';

        // Trigger visibility update to reset to default (no tallas)
        updateTallasVisibility(false);
        
        renderImageUploader();
    }

    // --- DATA PERSISTENCE ---
    async function guardarProducto(event) {
        console.log('Paso 1: guardarProducto iniciado.');
        event.preventDefault();

        const id = document.getElementById('producto-id').value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/productos/update/${id}` : `${API_URL}/productos/create`;
        console.log('Paso 2: URL y método definidos.');

        const plainFormData = new FormData(productoForm);
        const formData = new FormData();

        // Copiar todos los campos de texto y select del formulario original
        for (const [key, value] of plainFormData.entries()) {
            if (typeof value !== 'object') { // Excluir campos de archivo
                formData.append(key, value);
            }
        }

        // Añadir los valores de los checkboxes explícitamente
        formData.set('activo', document.getElementById('activo').checked);
        formData.set('destacado', document.getElementById('destacado').checked);
        formData.set('tiene_tallas', document.getElementById('tiene_tallas').checked);

        // Añadir solo los archivos que el usuario ha seleccionado
        for (const fieldName in imageFiles) {
            if (Object.prototype.hasOwnProperty.call(imageFiles, fieldName) && imageFiles[fieldName]) {
                formData.append(fieldName, imageFiles[fieldName]);
            }
        }

        // Marcar imágenes para eliminación
        imagesToDelete.forEach(fieldName => {
            formData.append(`remove_${fieldName}`, 'true');
        });

        if (tieneTallasCheckbox.checked) {
            formData.delete('stock'); // No enviar stock general si hay tallas
            formData.delete('talla[]');
            formData.delete('stock[]');
            const tallasInputs = document.querySelectorAll('.talla-item');
            const tallas = Array.from(tallasInputs).map(item => ({
                talla: item.querySelector('input[name="talla[]"]').value,
                stock: item.querySelector('input[name="stock[]"]').value
            }));
            formData.append('tallas', JSON.stringify(tallas));
        }

        try {
            await fetchWithAuth(url, { method, body: formData });
            closeModal();
            cargarProductos();
        } catch (error) {
            console.error('Error al guardar producto:', error);
            alert(`No se pudo guardar el producto: ${error.message}`);
        }
    }

    async function eliminarProducto(id) {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;
        try {
            await fetchWithAuth(`${API_URL}/productos/${id}`, { method: 'DELETE' });
            cargarProductos();
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            alert('No se pudo eliminar el producto.');
        }
    }

    async function toggleEstadoProducto(id, nuevoEstado, buttonElement) {
        const accion = nuevoEstado ? 'activar' : 'desactivar';
        if (!confirm(`¿Estás seguro de que quieres ${accion} este producto?`)) return;

        try {
            const responseData = await fetchWithAuth(`${API_URL}/productos/${id}/toggle-status`, {
                method: 'PUT',
                body: { activo: nuevoEstado }
            });

            // Actualización de la UI sin recargar toda la tabla
            const row = buttonElement.closest('tr');
            if (row) {
                // Actualizar píldora de estado
                const statusPill = row.querySelector('.status-pill');
                statusPill.textContent = nuevoEstado ? 'Activo' : 'Inactivo';
                statusPill.className = `status-pill ${nuevoEstado ? 'activo' : 'inactivo'}`;

                // Actualizar texto de referencia
                // La referencia es el 3er <td> (índice 2)
                const refCell = row.cells[2];
                if (refCell) {
                    refCell.textContent = responseData.nueva_referencia;
                }

                // Actualizar el botón de toggle
                buttonElement.textContent = nuevoEstado ? 'Desactivar' : 'Activar';
                buttonElement.dataset.status = !nuevoEstado;
                buttonElement.className = `btn-accion btn-toggle-status ${nuevoEstado ? 'desactivar' : 'activar'}`;
            }

        } catch (error) {
            console.error(`Error al ${accion} producto:`, error);
            alert(`No se pudo ${accion} el producto: ${error.message}`);
        }
    }

    // --- TALLAS & CATEGORY MANAGEMENT ---
    function setupEventListeners() {
        // Main page filters
        const allFilters = [filtroNombreInput, filtroReferenciaInput, filtroMarcaInput, filtroCategoriaSelect, filtroSubcategoriaSelect, filtroStockSelect, filtroEstadoSelect];
        allFilters.forEach(filter => {
            if (filter) {
                filter.addEventListener('change', cargarProductos); // 'change' is better for selects
                if (filter.type === 'text') {
                    let debounceTimer;
                    filter.addEventListener('input', () => {
                        clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(cargarProductos, 300);
                    });
                }
            }
        });

        if (filtroCategoriaSelect) {
            filtroCategoriaSelect.addEventListener('change', async () => {
                await cargarSubcategoriasParaFiltro(filtroCategoriaSelect.value);
                cargarProductos(); // This will be called twice, but it's fine for now
            });
        }
        if (filtroSubcategoriaSelect) {
            filtroSubcategoriaSelect.addEventListener('change', cargarProductos);
        }

        // Main page buttons
        if (btnAgregarProducto) {
            btnAgregarProducto.addEventListener('click', abrirModalParaCrear);
        }
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                window.location.href = '/admin/login.html';
            });
        }

        // Product table actions (event delegation)
        if (tablaProductosContainer) {
            tablaProductosContainer.addEventListener('click', (e) => {
                const target = e.target.closest('button.btn-accion');
                if (!target) return;

                const id = target.dataset.id;
                if (target.classList.contains('btn-edit')) {
                    abrirModalParaEditar(id);
                } else if (target.classList.contains('btn-delete')) {
                    eliminarProducto(id);
                } else if (target.classList.contains('btn-toggle-status')) {
                    const nuevoEstado = target.dataset.status === 'true';
                    toggleEstadoProducto(id, nuevoEstado, target);
                }
            });
        }

        // Modal events
        if (closeButton) closeButton.addEventListener('click', closeModal);
        if (modal) window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        if (productoForm) productoForm.addEventListener('submit', guardarProducto);
        
        // Modal form fields
        if (productoCategoriaSelect) {
            productoCategoriaSelect.addEventListener('change', () => {
                cargarSubcategorias(productoCategoriaSelect.value);
                handleCategoryChange();
            });
        }
        if (tieneTallasCheckbox) {
            tieneTallasCheckbox.addEventListener('change', (e) => {
                if (e.target.disabled) return;
                updateTallasVisibility(e.target.checked);
            });
        }
        if (btnAgregarTalla) {
            btnAgregarTalla.addEventListener('click', () => agregarInputTalla());
        }
        if (tallasList) {
            tallasList.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-remove-talla')) {
                    e.target.closest('.talla-item').remove();
                }
            });
        }
    }

    function handleCategoryChange() {
        const selectedOption = productoCategoriaSelect.options[productoCategoriaSelect.selectedIndex];
        const categoryName = selectedOption ? selectedOption.textContent.toLowerCase() : '';

        if (categoryName.includes('gorras')) {
            tieneTallasCheckbox.checked = true;
            tieneTallasCheckbox.disabled = true;
            btnAgregarTalla.style.display = 'none';
            updateTallasVisibility(true);
            tallasList.innerHTML = ''; 
            agregarInputTalla('OS', '', true); // Add 'OS' size, readonly
        } else {
            // Reset to default behavior for other categories
            tieneTallasCheckbox.disabled = false;
            btnAgregarTalla.style.display = 'block';
            updateTallasVisibility(tieneTallasCheckbox.checked);
        }
    }

    function updateTallasVisibility(showTallas) {
        tallasSection.style.display = showTallas ? 'block' : 'none';
        stockGeneralSection.style.display = showTallas ? 'none' : 'block';
        stockGeneralInput.required = !showTallas;

        if (showTallas) {
            const isGorra = (productoCategoriaSelect.options[productoCategoriaSelect.selectedIndex]?.textContent.toLowerCase() || '').includes('gorras');
            if (tallasList.children.length === 0 && !isGorra) {
                agregarInputTalla();
            }
            tallasList.querySelectorAll('input').forEach(input => input.required = true);
        } else {
            tallasList.querySelectorAll('input').forEach(input => input.required = false);
            tallasList.innerHTML = '';
        }
    }

    function agregarInputTalla(talla = '', stock = '', isReadOnly = false) {
        if (!tallasList) return;
        const item = document.createElement('div');
        item.className = 'talla-item';
        // Se añade el atributo 'readonly' también al input de stock si isReadOnly es true
        item.innerHTML = `
            <input type="text" name="talla[]" placeholder="Talla (ej. S, M, L)" value="${talla}" ${isReadOnly ? 'readonly' : ''}>
            <input type="number" name="stock[]" placeholder="Stock" value="${stock}" ${isReadOnly ? 'readonly' : ''}>
            <button type="button" class="remove-talla-btn" style="display: ${isReadOnly ? 'none' : 'inline-block'};">&times;</button>
        `;
        tallasList.appendChild(item);

        if (!isReadOnly) {
            item.querySelector('.remove-talla-btn').addEventListener('click', () => item.remove());
        }
    }

    // --- IMAGE MANAGEMENT (REFACTORED) ---
    function updateImageCounter() {
        const container = document.getElementById('image-previews-container');
        if (!container) return;
        const loadedImages = container.querySelectorAll('.image-placeholder img[src]:not([src=""])').length;
        const countSpan = document.getElementById('image-count');
        if (countSpan) {
            countSpan.textContent = `${loadedImages}/6`;
        }
    }

    const imageFieldsMetadata = [
        { name: 'imagen_3_4', label: 'Principal (3:4)' },
        { name: 'imagen_frontal', label: 'Frontal' },
        { name: 'imagen_lateral', label: 'Lateral' },
        { name: 'imagen_trasera', label: 'Trasera' },
        { name: 'imagen_superior', label: 'Superior' },
        { name: 'imagen_inferior', label: 'Inferior' }
    ];

    function renderImageUploader(existingImages = []) {
        const container = document.getElementById('image-previews-container');
        if (!container) return;
        container.innerHTML = '';
        imageFiles = {};
        imagesToDelete = [];

        imageFieldsMetadata.forEach(field => {
            const existingImage = existingImages.find(img => img.id === field.name);
            const card = document.createElement('div');
            card.className = 'image-preview-card';
            const placeholder = document.createElement('div');
            placeholder.className = 'image-placeholder';
            const img = document.createElement('img');
            img.src = existingImage ? getImageUrl(existingImage.ruta_imagen) : '';
            placeholder.innerHTML = existingImage ? '' : '<span class="upload-icon">+</span>';
            if (existingImage) placeholder.appendChild(img);
            const label = document.createElement('p');
            label.className = 'image-label';
            label.textContent = field.label;
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.name = field.name;
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'remove-image-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.style.display = existingImage ? 'block' : 'none';
            card.appendChild(placeholder);
            card.appendChild(label);
            card.appendChild(fileInput);
            card.appendChild(deleteBtn);
            container.appendChild(card);

            const handleFileSelect = (file) => {
                if (file && file.type.startsWith('image/')) {
                    imageFiles[field.name] = file;

                    const index = imagesToDelete.indexOf(field.name);
                    if (index > -1) {
                        imagesToDelete.splice(index, 1);
                    }

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        img.src = event.target.result;
                        placeholder.innerHTML = '';
                        placeholder.appendChild(img);
                        placeholder.classList.add('has-image');
                        deleteBtn.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
                updateImageCounter();
            };

            // Event Listeners
            placeholder.addEventListener('click', () => fileInput.click());

            // Drag & Drop Listeners
            ['dragenter', 'dragover'].forEach(eventName => {
                placeholder.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    placeholder.classList.add('drag-over');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                placeholder.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    placeholder.classList.remove('drag-over');
                });
            });

            placeholder.addEventListener('drop', (e) => {
                const file = e.dataTransfer.files[0];
                handleFileSelect(file);
            });

            deleteBtn.addEventListener('click', () => {
                if (existingImage) {
                    if (!imagesToDelete.includes(field.name)) {
                        imagesToDelete.push(field.name);
                    }
                }
                delete imageFiles[field.name];

                img.src = '';
                placeholder.innerHTML = '<span class="upload-icon">+</span>';
                placeholder.classList.remove('has-image');
                deleteBtn.style.display = 'none';
                updateImageCounter();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                handleFileSelect(file);
            });
        });

        updateImageCounter();
    }

    // --- SETUP DE CATEGORÍAS INICIALES ---
    async function setupInitialCategories() {
        try {
            const newCategoryName = 'Textiles Artesanales';
            const newSubcategories = ['Ponchos', 'Muleras'];

            // 1. Verificar si la categoría ya existe
            const existingCategories = await fetchWithAuth(`${API_URL}/categorias`);
            let category = existingCategories.find(c => c.nombre.toLowerCase() === newCategoryName.toLowerCase());

            // 2. Si no existe, crearla
            if (!category) {
                console.log(`Creando categoría: "${newCategoryName}"...`);
                category = await fetchWithAuth(`${API_URL}/categorias`, {
                    method: 'POST',
                    body: { nombre: newCategoryName }
                });
                console.log('Categoría creada con éxito.');
            } else {
                console.log(`La categoría "${newCategoryName}" ya existe.`);
            }

            // 3. Añadir subcategorías
            if (category && category.id) {
                const existingSubcategories = await fetchWithAuth(`${API_URL}/subcategorias/categoria/${category.id}`);
                const existingSubcategoryNames = existingSubcategories.map(s => s.nombre.toLowerCase());

                for (const subcategoryName of newSubcategories) {
                    if (!existingSubcategoryNames.includes(subcategoryName.toLowerCase())) {
                        console.log(`Creando subcategoría: "${subcategoryName}" para "${newCategoryName}"...`);
                        await fetchWithAuth(`${API_URL}/subcategorias`, {
                            method: 'POST',
                            body: { nombre: subcategoryName, categoria_id: category.id }
                        });
                        console.log('Subcategoría creada con éxito.');
                    } else {
                        console.log(`La subcategoría "${subcategoryName}" ya existe.`);
                    }
                }
            }
        } catch (error) {
            console.error('Error durante la configuración inicial de categorías:', error);
        }
    }


    // --- EDIT MODE & AUTHENTICATION LOGIC ---
    if (editModeToggle && productFormFieldset && authModal && authForm) {
        
        const openAuthModal = () => {
            authModal.style.display = 'flex';
            authErrorMessage.textContent = '';
            authForm.reset();
            document.getElementById('auth-user').focus();
        };

        const closeAuthModal = () => {
            authModal.style.display = 'none';
        };

        const setEditMode = (enabled) => {
            productFormFieldset.disabled = !enabled;
            editModeToggle.classList.toggle('edit-mode-on', enabled);
            
            const icon = editModeToggle.querySelector('i');
            if (enabled) {
                icon.classList.remove('fa-lock');
                icon.classList.add('fa-unlock-alt');
            } else {
                icon.classList.remove('fa-unlock-alt');
                icon.classList.add('fa-lock');
            }
        };

        editModeToggle.addEventListener('click', () => {
            if (productFormFieldset.disabled) {
                openAuthModal();
            } else {
                setEditMode(false);
            }
        });

        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('auth-user').value;
            const password = document.getElementById('auth-password').value;

            // Simple hardcoded credentials (replace with a secure check)
            if (username === 'Control-Maestro' && password === 'Activar_Control_Maestro_llave_00001') {
                setEditMode(true);
                closeAuthModal();
            } else {
                authErrorMessage.textContent = 'Credenciales incorrectas.';
                // Shake animation for feedback
                authModal.querySelector('.modal-content').style.animation = 'modal-shake 0.5s';
                setTimeout(() => {
                    authModal.querySelector('.modal-content').style.animation = '';
                }, 500);
            }
        });

        document.getElementById('cancel-auth-btn').addEventListener('click', closeAuthModal);

        // Close modal if clicking outside of it
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeAuthModal();
            }
        });
    }

    // --- INITIALIZATION ---
    async function init() {
        await setupInitialCategories(); // Añadir categorías y subcategorías si no existen
        setupEventListeners();
        cargarProductos();
        cargarCategorias(); // For modal
        cargarCategoriasParaFiltro();
        cargarSubcategoriasParaFiltro(); // Initial call to set it to disabled
    }

    init();

    } // End of the 'if (tablaProductosContainer)' block
});
