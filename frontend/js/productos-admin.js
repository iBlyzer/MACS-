document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        // window.location.href = '/admin/login.html'; // Descomentar para producción
    }

    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    const productForm = document.getElementById('productForm');
    const productsTableBody = document.getElementById('productsTableBody');
    const addProductBtn = document.getElementById('addProductBtn');
    const tieneTallasCheckbox = document.getElementById('tiene_tallas');
    const tallasContainer = document.getElementById('tallas-container');
    const addTallaBtn = document.getElementById('addTallaBtn');

    const API_URL = 'http://localhost:3000/api';

    // Cargar productos al iniciar
    loadProducts();
    loadCategories();

    function loadProducts() {
        fetch(`${API_URL}/productos`)
            .then(response => response.json())
            .then(products => {
                productsTableBody.innerHTML = '';
                products.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.id}</td>
                        <td>${product.nombre}</td>
                        <td>${product.marca}</td>
                        <td>${product.precio}</td>
                        <td>${product.stock_total}</td>
                        <td>${product.activo ? 'Sí' : 'No'}</td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-btn" data-id="${product.id}">Editar</button>
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${product.id}">Eliminar</button>
                        </td>
                    `;
                    productsTableBody.appendChild(row);
                });
            });
    }

    function loadCategories() {
        fetch(`${API_URL}/categorias`)
            .then(response => response.json())
            .then(categories => {
                const categoriaSelect = document.getElementById('categoria');
                categoriaSelect.innerHTML = '<option value="">Seleccione una categoría</option>';
                categories.forEach(cat => {
                    categoriaSelect.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
                });
            });
    }

    document.getElementById('categoria').addEventListener('change', (e) => {
        const categoriaId = e.target.value;
        if (categoriaId) {
            fetch(`${API_URL}/subcategorias/categoria/${categoriaId}`)
                .then(response => response.json())
                .then(subcategories => {
                    const subcategoriaSelect = document.getElementById('subcategoria');
                    subcategoriaSelect.innerHTML = '<option value="">Seleccione una subcategoría</option>';
                    subcategories.forEach(sub => {
                        subcategoriaSelect.innerHTML += `<option value="${sub.id}">${sub.nombre}</option>`;
                    });
                });
        }
    });

    // Lógica de tallas
    tieneTallasCheckbox.addEventListener('change', () => {
        tallasContainer.style.display = tieneTallasCheckbox.checked ? 'block' : 'none';
        addTallaBtn.style.display = tieneTallasCheckbox.checked ? 'block' : 'none';
    });

    addTallaBtn.addEventListener('click', () => {
        addTallaInput();
    });

    function addTallaInput(talla = '', stock = '') {
        const tallaDiv = document.createElement('div');
        tallaDiv.classList.add('row', 'mb-2', 'talla-item');
        tallaDiv.innerHTML = `
            <div class="col-5">
                <input type="text" class="form-control form-control-sm talla-name" placeholder="Talla (ej. S, M, 42)" value="${talla}" required>
            </div>
            <div class="col-5">
                <input type="number" class="form-control form-control-sm talla-stock" placeholder="Stock" value="${stock}" required>
            </div>
            <div class="col-2">
                <button type="button" class="btn btn-danger btn-sm remove-talla-btn">X</button>
            </div>
        `;
        tallasContainer.appendChild(tallaDiv);
    }

    tallasContainer.addEventListener('click', e => {
        if (e.target.classList.contains('remove-talla-btn')) {
            e.target.closest('.talla-item').remove();
        }
    });

    // Abrir modal para crear
    addProductBtn.addEventListener('click', () => {
        productForm.reset();
        document.getElementById('productId').value = '';
        document.getElementById('productModalLabel').textContent = 'Añadir Producto';
        tallasContainer.innerHTML = '';
        tieneTallasCheckbox.checked = false;
        tallasContainer.style.display = 'none';
        addTallaBtn.style.display = 'none';
        addTallaInput('Única', '0'); // Por defecto para productos sin tallas
    });

    // Abrir modal para editar
    productsTableBody.addEventListener('click', async e => {
        if (e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            const response = await fetch(`${API_URL}/productos/${id}`);
            const product = await response.json();

            document.getElementById('productId').value = product.id;
            document.getElementById('productModalLabel').textContent = 'Editar Producto';
            document.getElementById('nombre').value = product.nombre;
            document.getElementById('marca').value = product.marca;
            document.getElementById('descripcion').value = product.descripcion;
            document.getElementById('precio').value = product.precio;
            document.getElementById('categoria').value = product.categoria_id;
            // Cargar y seleccionar subcategoría
            // ...
            document.getElementById('activo').value = product.activo.toString();
            document.getElementById('destacado').value = product.destacado.toString();
            
            tieneTallasCheckbox.checked = product.tiene_tallas;
            tallasContainer.style.display = product.tiene_tallas ? 'block' : 'none';
            addTallaBtn.style.display = product.tiene_tallas ? 'block' : 'none';
            tallasContainer.innerHTML = '';

            if (product.Tallas && product.Tallas.length > 0) {
                product.Tallas.forEach(t => addTallaInput(t.talla, t.stock));
            } else {
                addTallaInput('Única', '0');
            }

            productModal.show();
        }
    });

    // Enviar formulario
    productForm.addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('productId').value;
        const formData = new FormData();
        
        formData.append('nombre', document.getElementById('nombre').value);
        formData.append('marca', document.getElementById('marca').value);
        formData.append('precio', document.getElementById('precio').value);
        formData.append('descripcion', document.getElementById('descripcion').value);
        formData.append('categoria_id', document.getElementById('categoria').value);
        formData.append('subcategoria_id', document.getElementById('subcategoria').value);
        formData.append('activo', document.getElementById('activo').value);
        formData.append('destacado', document.getElementById('destacado').value);
        formData.append('tiene_tallas', tieneTallasCheckbox.checked);

        const tallas = [];
        document.querySelectorAll('.talla-item').forEach(item => {
            const talla = item.querySelector('.talla-name').value;
            const stock = item.querySelector('.talla-stock').value;
            if (talla && stock) {
                tallas.push({ talla, stock });
            }
        });
        formData.append('tallas', JSON.stringify(tallas));

        // Aquí iría la lógica para adjuntar imágenes

        const url = id ? `${API_URL}/productos/update/${id}` : `${API_URL}/productos/create`;
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar el producto');
            }

            productModal.hide();
            loadProducts();

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

     // Eliminar producto
    productsTableBody.addEventListener('click', async e => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                try {
                    const response = await fetch(`${API_URL}/productos/delete/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al eliminar el producto');
                    }
                    
                    loadProducts();

                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            }
        }
    });
});
