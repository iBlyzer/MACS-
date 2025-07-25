require('dotenv').config({ path: '../.env' });
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configuración de Cloudinary (asegúrate de que las variables de entorno estén limpias)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
});

const pdfsDirectory = path.join(__dirname, '..', 'uploads', 'pedidos');

fs.readdir(pdfsDirectory, (err, files) => {
  if (err) {
    return console.error('No se pudo leer el directorio de PDFs:', err);
  }

  const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

  if (pdfFiles.length === 0) {
    console.log('No se encontraron archivos PDF para subir.');
    return;
  }

  pdfFiles.forEach(file => {
    const filePath = path.join(pdfsDirectory, file);
    const publicId = path.parse(file).name; // Usa el nombre del archivo sin extensión

    cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      resource_type: 'raw', // Importante para archivos que no son imágenes, como PDFs
      folder: 'pedidos' // Sube los PDFs a una carpeta llamada 'pedidos' en Cloudinary
    }, (error, result) => {
      if (error) {
        console.error(`Error al subir ${file}:`, error);
      } else {
        console.log(`Se subió ${file} como ${result.public_id} exitosamente: ${result.secure_url}`);
      }
    });
  });
});
