
require('dotenv').config({ path: '../.env' });
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configura Cloudinary con tus credenciales
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET?.trim()
});

const uploadsDir = path.join(__dirname, '..', 'uploads');

fs.readdir(uploadsDir, (err, files) => {
  if (err) {
    return console.error('No se pudo leer el directorio de uploads:', err);
  }

  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);

    const publicId = path.parse(file).name;

    // Sube el archivo a Cloudinary, usando el nombre original como public_id
    cloudinary.uploader.upload(filePath, { public_id: publicId, overwrite: true }, (error, result) => {
      if (error) {
        return console.error(`Error al subir ${file}:`, error);
      }
      console.log(`Se subió ${file} como ${result.public_id} exitosamente:`, result.secure_url);
      
      // Opcional: Borra el archivo local después de subirlo
      // fs.unlinkSync(filePath);
    });
  });
});
