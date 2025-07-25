require('dotenv').config({ path: '../.env' });
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises; // Usamos la versión de promesas de fs
const path = require('path');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
});

const uploadsDirectory = path.join(__dirname, '..', 'uploads');

// Función para obtener todos los archivos de forma recursiva
async function getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function uploadAll() {
    console.log('Buscando archivos para subir...');
    let allFiles = await getFiles(uploadsDirectory);

    // Filtra solo por archivos .webp y .pdf
    const allowedExtensions = ['.webp', '.pdf'];
    let filteredFiles = allFiles.filter(file => allowedExtensions.includes(path.extname(file).toLowerCase()));

    if (filteredFiles.length === 0) {
        console.log('No se encontraron archivos .webp o .pdf para subir.');
        return;
    }

    console.log(`Se encontraron ${filteredFiles.length} archivos (.webp y .pdf). Iniciando subida...`);

    const uploadPromises = filteredFiles.map(filePath => {
        const publicId = path.parse(filePath).name;
        const ext = path.extname(filePath).toLowerCase();
        const resourceType = ext === '.pdf' ? 'raw' : 'image';

        return cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            resource_type: resourceType,
            overwrite: true,
        }).then(result => {
            console.log(`Éxito: ${path.basename(filePath)} -> ${result.public_id}`);
        }).catch(error => {
            console.error(`Error al subir ${path.basename(filePath)}: ${error.message}`);
        });
    });

    await Promise.all(uploadPromises);

    console.log('\n¡Subida de todos los archivos completada!');
}

uploadAll();

