document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const imageFilesInput = document.getElementById('image-files');
    const galleryContainer = document.getElementById('gallery-container');

    const API_URL = '/api/slider-manager';

    async function loadImages() {
        try {
                                    const response = await fetch(`${API_URL}/images?timestamp=${new Date().getTime()}`);
            const images = await response.json();

            galleryContainer.innerHTML = '';
            images.forEach(image => {
                const card = document.createElement('div');
                card.className = 'gallery-card';
                card.innerHTML = `
                    <img src="${image.url}" alt="${image.filename}">
                    <p>${image.filename}</p>
                    <div class="card-actions">
                        <button class="delete-btn" data-filename="${image.filename}">Eliminar</button>
                    </div>
                `;
                galleryContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error al cargar las imágenes:', error);
            galleryContainer.innerHTML = '<p>No se pudieron cargar las imágenes.</p>';
        }
    }

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        for (const file of imageFilesInput.files) {
            formData.append('sliderImages', file);
        }

        try {
            await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });
            loadImages();
            uploadForm.reset();
        } catch (error) {
            console.error('Error al subir las imágenes:', error);
        }
    });

    galleryContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const filename = e.target.dataset.filename;
            if (!filename) return;

            if (confirm(`¿Estás seguro de que quieres eliminar la imagen '${filename}'?`)) {
                try {
                    const response = await fetch(`${API_URL}/delete/${filename}`, { method: 'DELETE' });
                    if (!response.ok) {
                        throw new Error('La respuesta del servidor no fue OK');
                    }
                    loadImages(); // Recargar la galería para reflejar el cambio
                } catch (error) {
                    console.error('Error al eliminar la imagen:', error);
                    alert('No se pudo eliminar la imagen.');
                }
            }
        }
    });

    loadImages();
});

