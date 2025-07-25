const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;
const fs = require('fs').promises;

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
});

// Directorio específico para los PDFs de pedidos
const pedidosDirectory = 'C:\\Users\\Macs Agencia\\Documents\\uploads\\pedidos';

// Función para obtener todos los archivos de forma recursiva
async function getFiles(dir) {
    try {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(dirents.map((dirent) => {
            const res = path.resolve(dir, dirent.name);
            return dirent.isDirectory() ? getFiles(res) : res;
        }));
        return Array.prototype.concat(...files);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: El directorio no existe -> ${dir}`);
            return [];
        }
        throw error;
    }
}

async function uploadPdfsAsImages() {
    console.log(`Buscando archivos PDF en: ${pedidosDirectory}`);
    
    let allFiles = await getFiles(pedidosDirectory);

    // Filtra solo por archivos .pdf
    const pdfFiles = allFiles.filter(file => path.extname(file).toLowerCase() === '.pdf');

    if (pdfFiles.length === 0) {
        console.log('No se encontraron archivos .pdf para subir.');
        return;
    }

    console.log(`Se encontraron ${pdfFiles.length} archivos PDF. Iniciando subida como resource_type='image'...`);

    const uploadPromises = pdfFiles.map(filePath => {
        const publicId = path.parse(filePath).name;
        
        // Subir como 'image' y guardar en la carpeta 'pedidos'
        const resourceType = 'image';

        return cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            resource_type: resourceType,
            folder: 'pedidos', // Guardar en la carpeta 'pedidos'
            overwrite: true,
            access_mode: 'public',
        }).then(result => {
            console.log(`Éxito: ${path.basename(filePath)} -> ${result.public_id} (subido como ${result.resource_type})`);
        }).catch(error => {
            console.error(`Error al subir ${path.basename(filePath)}: ${error.message}`);
        });
    });

    await Promise.all(uploadPromises);

    console.log('\n¡Subida de todos los archivos PDF completada!');
}

uploadPdfsAsImages();
