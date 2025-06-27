document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const imageFilesInput = document.getElementById('image-files');
    const galleryContainer = document.getElementById('gallery-container');
    const fileNameSpan = document.getElementById('file-name');

    const API_URL = '/api/slider-manager';

    if (imageFilesInput && fileNameSpan) {
        imageFilesInput.addEventListener('change', () => {
            if (imageFilesInput.files.length > 1) {
                fileNameSpan.textContent = `${imageFilesInput.files.length} archivos seleccionados`;
            } else if (imageFilesInput.files.length === 1) {
                fileNameSpan.textContent = imageFilesInput.files[0].name;
            } else {
                fileNameSpan.textContent = 'No se ha seleccionado ningún archivo';
            }
        });
    }

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
                    <img src="${image.url}" alt="Imagen del slider">
                    <button class="delete-btn" data-filename="${image.filename}" title="Eliminar imagen">&times;</button>
                `;
                galleryContainer.appendChild(item);
            });
        } catch (error) {
            console.error('Error al cargar las imágenes:', error);
            galleryContainer.innerHTML = '<p>No se pudieron cargar las imágenes.</p>';
        }
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (imageFilesInput.files.length === 0) {
                alert('Por favor, selecciona al menos una imagen para subir.');
                return;
            }

            const formData = new FormData();
            for (const file of imageFilesInput.files) {
                formData.append('sliderImages', file);
            }

            try {
                const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
                if (!response.ok) throw new Error('Error al subir las imágenes');
                await loadImages();
                uploadForm.reset();
                if (fileNameSpan) fileNameSpan.textContent = 'No se ha seleccionado ningún archivo';
            } catch (error) {
                console.error('Error al subir las imágenes:', error);
                alert('Ocurrió un error al subir las imágenes.');
            }
        });
    }

    if (galleryContainer) {
        galleryContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-btn')) {
                const filename = e.target.dataset.filename;
                if (!filename) return;

                if (confirm(`¿Estás seguro de que quieres eliminar esta imagen?`)) {
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
        });
    }

    loadImages();
});
