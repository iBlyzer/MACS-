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

async function deletePdfs() {
    console.log(`Buscando archivos PDF en: ${pedidosDirectory} para obtener sus public_ids...`);
    
    let allFiles = await getFiles(pedidosDirectory);
    const pdfFiles = allFiles.filter(file => path.extname(file).toLowerCase() === '.pdf');

    if (pdfFiles.length === 0) {
        console.log('No se encontraron archivos PDF para eliminar de Cloudinary.');
        return;
    }

    console.log(`Se encontraron ${pdfFiles.length} public_ids para eliminar. Iniciando eliminación...`);

    const deletePromises = pdfFiles.map(filePath => {
        const publicId = path.parse(filePath).name;
        
        // Apuntar a los archivos de tipo 'raw' para la eliminación
        const resourceType = 'raw';

        return cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        }).then(result => {
            if (result.result === 'ok') {
                console.log(`Éxito al eliminar: ${publicId}`);
            } else {
                console.warn(`Aviso al eliminar ${publicId}: ${result.result}`);
            }
        }).catch(error => {
            console.error(`Error al eliminar ${publicId}: ${error.message}`);
        });
    });

    await Promise.all(deletePromises);

    console.log('\n¡Eliminación de todos los PDFs de Cloudinary completada!');
}

deletePdfs();
