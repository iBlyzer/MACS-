const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Endpoint para obtener las imágenes del nuevo slider
router.get('/images', (req, res) => {
  const sliderImagesDir = path.join(__dirname, '../assets/slider-imgs');

  fs.readdir(sliderImagesDir, (err, files) => {
    if (err) {
      console.error('Error al leer el directorio de imágenes del slider:', err);
      return res.status(500).json({ message: 'No se pudieron cargar las imágenes del slider.' });
    }

    // Filtrar para asegurarse de que solo se incluyan archivos de imagen y no otros archivos como .DS_Store
    const imageFiles = files.filter(file => {
      const extension = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(extension);
    });

    // Construir las rutas completas para que el frontend pueda acceder a ellas
    const imageUrls = imageFiles.map(file => `/assets/slider-imgs/${file}`);

    res.json(imageUrls);
  });
});

module.exports = router;
