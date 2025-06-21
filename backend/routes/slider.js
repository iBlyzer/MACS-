const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Endpoint para obtener las imágenes del slider
router.get('/images', (req, res) => {
  const sliderImagesDir = path.join(__dirname, '../assets/slider-imgs');

  fs.readdir(sliderImagesDir, (err, files) => {
    if (err) {
      console.error('Error al leer el directorio de imágenes del slider:', err);
      return res.status(500).json({ message: 'No se pudieron cargar las imágenes del slider.' });
    }

    const imageFiles = files.filter(file => {
      const fileExtension = path.extname(file).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(fileExtension);
    });

    const imageUrls = imageFiles.map(file => `/assets/slider-imgs/${file}`);

    res.json(imageUrls);
  });
});

module.exports = router;
