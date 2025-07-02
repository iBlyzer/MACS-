document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIG & TOKEN CHECK ---
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return; // Stop script execution if not logged in
    }

    const API_URL = 'http://localhost:3000/api';
    const BASE_URL = 'http://localhost:3000';

    // --- DOM SELECTORS ---
    const tablaProductosContainer = document.getElementById('tabla-productos-container');
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
            // Use the admin-specific endpoint to get all products (active and inactive)
            const productos = await fetchWithAuth(`${API_URL}/productos/get-all`);
            renderizarTabla(productos);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            // alert('No se pudieron cargar los productos.');
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

    // --- UI RENDERING ---
    function renderizarTabla(productos) {
        if (!tablaProductosContainer || !Array.isArray(productos)) return;
        tablaProductosContainer.innerHTML = `
            <table class="tabla-admin">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Estado</th>
                        <th>Dest.</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map(p => `
                        <tr>
                            <td>${p.nombre || ''}</td>
                            <td>${p.categoria_nombre || 'N/A'}</td>
                            <td>S/ ${parseFloat(p.precio || 0).toFixed(2)}</td>
                            <td>${p.stock !== null ? p.stock : 'N/A'}</td>
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
                    `).join('')}
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
                    const stockUnico = p.tallas && p.tallas.length > 0 ? p.tallas[0].stock : '';
                    stockGeneralInput.value = stockUnico;
                }
            } else {
                // For gorras, assume the first size entry is the 'OS' stock.
                tallasList.innerHTML = '';
                const tallaUnica = p.tallas && p.tallas.length > 0 ? p.tallas[0] : null;
                agregarInputTalla('OS', tallaUnica ? tallaUnica.stock : '', true);
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
        event.preventDefault();
        const id = document.getElementById('producto-id').value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/productos/update/${id}` : `${API_URL}/productos/create`;

        const formData = new FormData(productoForm);

        // Explicitly set checkbox values, as unchecked boxes are not sent by default
        formData.set('activo', document.getElementById('activo').checked);
        formData.set('destacado', document.getElementById('destacado').checked);
        formData.set('tiene_tallas', document.getElementById('tiene_tallas').checked);

        for (const fieldName in imageFiles) {
            if (Object.prototype.hasOwnProperty.call(imageFiles, fieldName)) {
                formData.append(fieldName, imageFiles[fieldName]);
            }
        }

        if (imagesToDelete.length > 0) {
            formData.append('imagenes_a_eliminar', JSON.stringify(imagesToDelete));
        }

        if (tieneTallasCheckbox.checked) {
            formData.delete('stock'); // No enviar stock general si hay tallas
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

    async function toggleEstadoProducto(id, nuevoEstado) {
        const accion = nuevoEstado ? 'activar' : 'desactivar';
        if (!confirm(`¿Estás seguro de que quieres ${accion} este producto?`)) return;

        try {
            await fetchWithAuth(`${API_URL}/productos/${id}/toggle-status`, {
                method: 'PUT',
                body: { activo: nuevoEstado } 
            });
            cargarProductos(); // Recargar la tabla para mostrar el cambio
        } catch (error) {
            console.error(`Error al ${accion} producto:`, error);
            alert(`No se pudo ${accion} el producto.`);
        }
    }

    // --- TALLAS & CATEGORY MANAGEMENT ---
    function setupEventListeners() {
        if (!productoCategoriaSelect || !tieneTallasCheckbox || !btnAgregarTalla) return;

        // Listener for category changes to handle 'Gorras' logic
        productoCategoriaSelect.addEventListener('change', () => handleCategoryChange());

        // Listener for the 'tiene_tallas' checkbox
        tieneTallasCheckbox.addEventListener('change', (e) => {
            if (e.target.disabled) return; // Ignore if disabled (for Gorras)
            updateTallasVisibility(e.target.checked);
        });

        // Listener for the 'Add Talla' button
        btnAgregarTalla.addEventListener('click', () => agregarInputTalla());
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
        const div = document.createElement('div');
        div.className = 'talla-item';
        const tallaInputHTML = `<input type="text" name="talla[]" placeholder="Talla" value="${talla}" required ${isReadOnly ? 'readonly' : ''}>`;
        const stockInputHTML = `<input type="number" name="stock[]" placeholder="Stock" value="${stock}" required>`;
        const removeButtonHTML = `<button type="button" class="btn-remove-talla" style="display: ${isReadOnly ? 'none' : 'inline-block'}">&times;</button>`;

        div.innerHTML = `${tallaInputHTML} ${stockInputHTML} ${removeButtonHTML}`;
        tallasList.appendChild(div);

        if (!isReadOnly) {
            div.querySelector('.btn-remove-talla').addEventListener('click', () => div.remove());
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
            img.src = existingImage ? `${BASE_URL}${existingImage.ruta_imagen}` : '';
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

            placeholder.addEventListener('click', () => fileInput.click());
            deleteBtn.addEventListener('click', () => {
                if (existingImage) {
                    if (!imagesToDelete.includes(existingImage.id)) {
                        imagesToDelete.push(existingImage.id);
                    }
                }
                delete imageFiles[field.name];
                img.src = '';
                placeholder.innerHTML = '<span class="upload-icon">+</span>';
                deleteBtn.style.display = 'none';
                updateImageCounter(); // Update count on delete
            });
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    imageFiles[field.name] = file;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        img.src = e.target.result;
                        placeholder.innerHTML = '';
                        placeholder.appendChild(img);
                        deleteBtn.style.display = 'block';
                        if (existingImage && !imagesToDelete.includes(existingImage.id)) {
                            imagesToDelete.push(existingImage.id);
                        }
                        updateImageCounter(); // Update count on new image
                    };
                    reader.readAsDataURL(file);
                }
            });
        });
        updateImageCounter(); // Update count on initial render
    }

    // --- INITIALIZATION & EVENT LISTENERS ---
    btnAgregarProducto.addEventListener('click', abrirModalParaCrear);
    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    productoForm.addEventListener('submit', guardarProducto);
    productoCategoriaSelect.addEventListener('change', (e) => cargarSubcategorias(e.target.value));
    tablaProductosContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('btn-edit')) {
            abrirModalParaEditar(target.dataset.id);
        }
        if (target.classList.contains('btn-delete')) {
            eliminarProducto(target.dataset.id);
        }
        if (target.classList.contains('btn-toggle-status')) {
            const id = target.dataset.id;
            const nuevoEstado = target.dataset.status === 'true';
            toggleEstadoProducto(id, nuevoEstado);
        }
    });

    setupEventListeners();
    cargarProductos();
    cargarCategorias();
});
