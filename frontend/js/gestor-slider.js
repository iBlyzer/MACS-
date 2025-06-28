document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const uploadForm = document.getElementById('upload-form');
    const imageFileInput = document.getElementById('image-file');
    const titleInput = document.getElementById('title');
    const buttonTextInput = document.getElementById('button-text');
    const galleryContainer = document.getElementById('gallery-container');
    const fileNameSpan = document.getElementById('file-name');

    // --- Elementos del Modal ---
    const editModal = document.getElementById('edit-modal');
    const editForm = document.getElementById('edit-form');
    const editFilenameInput = document.getElementById('edit-filename');
    const editTitleInput = document.getElementById('edit-title');
    const editButtonTextInput = document.getElementById('edit-button-text');
    const closeModalButton = document.querySelector('.close-button');

    const API_URL = '/api/slider-manager';

    // --- Lógica de carga de imágenes ---
    async function loadImages() {
        try {
            const response = await fetch(`${API_URL}/images?timestamp=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Error al cargar imágenes');
            const images = await response.json();

            galleryContainer.innerHTML = '';
            images.forEach(image => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `
                    <img src="${image.url}" alt="${image.title || image.filename}">
                    <div class="gallery-item-info">
                        <p><strong>Título:</strong> ${image.title || '<em>No asignado</em>'}</p>
                        <p><strong>Botón:</strong> ${image.buttonText || '<em>No asignado</em>'}</p>
                    </div>
                    <div class="gallery-item-actions">
                        <button class="edit-btn" 
                                data-filename="${image.filename}" 
                                data-title="${image.title}" 
                                data-button-text="${image.buttonText}"
                                title="Editar detalles">
                            Editar
                        </button>
                        <button class="delete-btn" data-filename="${image.filename}" title="Eliminar imagen">&times;</button>
                    </div>
                `;
                galleryContainer.appendChild(item);
            });
        } catch (error) {
            console.error('Error al cargar las imágenes:', error);
            galleryContainer.innerHTML = '<p>No se pudieron cargar las imágenes.</p>';
        }
    }

    // --- Lógica de subida de imagen ---
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!imageFileInput.files[0]) {
                alert('Por favor, selecciona una imagen para subir.');
                return;
            }

            const formData = new FormData();
            formData.append('sliderImage', imageFileInput.files[0]);
            formData.append('title', titleInput.value);
            formData.append('buttonText', buttonTextInput.value);

            try {
                const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
                const result = await response.json();

                if (!response.ok) throw new Error(result.message || 'Error al subir la imagen');
                
                await loadImages();
                uploadForm.reset();
                if (fileNameSpan) fileNameSpan.textContent = 'No se ha seleccionado ningún archivo';
                alert(result.message);

            } catch (error) {
                console.error('Error al subir la imagen:', error);
                alert(`Ocurrió un error: ${error.message}`);
            }
        });
    }

    // --- Lógica de eventos en la galería (Editar y Eliminar) ---
    if (galleryContainer) {
        galleryContainer.addEventListener('click', async (e) => {
            const target = e.target;
            // Botón de Eliminar
            if (target.classList.contains('delete-btn')) {
                const filename = target.dataset.filename;
                if (!filename) return;

                if (confirm(`¿Estás seguro de que quieres eliminar la imagen "${filename}"?`)) {
                    try {
                        const response = await fetch(`${API_URL}/delete/${filename}`, { method: 'DELETE' });
                        if (!response.ok) throw new Error('La respuesta del servidor no fue OK');
                        await loadImages();
                    } catch (error) {
                        console.error('Error al eliminar la imagen:', error);
                        alert('No se pudo eliminar la imagen.');
                    }
                }
            }

            // Botón de Editar
            if (target.classList.contains('edit-btn')) {
                const { filename, title, buttonText } = target.dataset;
                editFilenameInput.value = filename;
                editTitleInput.value = title;
                editButtonTextInput.value = buttonText;
                editModal.style.display = 'block';
            }
        });
    }

    // --- Lógica del Modal de Edición ---
    function closeModal() {
        editModal.style.display = 'none';
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeModal);
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const filename = editFilenameInput.value;
            const data = {
                title: editTitleInput.value,
                buttonText: editButtonTextInput.value
            };

            try {
                const response = await fetch(`${API_URL}/update/${encodeURIComponent(filename)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message || 'Error al actualizar');

                alert(result.message);
                closeModal();
                await loadImages();

            } catch (error) {
                console.error('Error al actualizar:', error);
                alert(`No se pudo actualizar: ${error.message}`);
            }
        });
    }
    
    // --- Lógica de la UI del input de archivo ---
    if (imageFileInput && fileNameSpan) {
        imageFileInput.addEventListener('change', () => {
            fileNameSpan.textContent = imageFileInput.files[0] ? imageFileInput.files[0].name : 'No se ha seleccionado ningún archivo';
        });
    }

    // Carga inicial
    loadImages();
});
