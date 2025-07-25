
require('dotenv').config({ path: '../.env' });
const cloudinary = require('cloudinary').v2;

// Configura Cloudinary con tus credenciales
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim()
});

async function deleteAllImages() {
  try {
    console.log('Obteniendo la lista de imágenes de Cloudinary...');
    let next_cursor = null;
    const public_ids = [];

    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        max_results: 500,
        next_cursor: next_cursor
      });

      result.resources.forEach(resource => {
        public_ids.push(resource.public_id);
      });

      next_cursor = result.next_cursor;
    } while (next_cursor);

    if (public_ids.length === 0) {
      console.log('No se encontraron imágenes para borrar.');
      return;
    }

    console.log(`Se encontraron ${public_ids.length} imágenes. Borrando...`);

    // Borrar en lotes de 100
    for (let i = 0; i < public_ids.length; i += 100) {
        const batch = public_ids.slice(i, i + 100);
        await cloudinary.api.delete_resources(batch);
        console.log(`Lote de ${batch.length} imágenes borrado.`);
    }

    console.log('¡Todas las imágenes han sido borradas exitosamente!');

  } catch (error) {
    console.error('Error al borrar las imágenes:', error);
  }
}

deleteAllImages();
