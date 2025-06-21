const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const SLIDER_IMGS_DIR = path.join(__dirname, '..', 'assets', 'slider-imgs');
const CONFIG_PATH = path.join(__dirname, '..', 'config', 'slider-config.json');

// --- Helpers --- //

const readConfig = () => {
    if (!fs.existsSync(CONFIG_PATH)) {
        return [];
    }
    const data = fs.readFileSync(CONFIG_PATH);
    return JSON.parse(data);
};

const writeConfig = (config) => {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
};

// --- Multer Config --- //

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, SLIDER_IMGS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// --- Routes --- //

// GET /api/slider-manager/images - List all images and their status
router.get('/images', (req, res) => {
    try {
        let config = readConfig();
        const actualFiles = fs.readdirSync(SLIDER_IMGS_DIR);

        // Eliminar de la config las entradas que ya no tienen un archivo físico
        let syncedConfig = config.filter(c => actualFiles.includes(c.filename));
        
        // Añadir a la config los nuevos archivos encontrados en el directorio
        const newFiles = actualFiles.filter(f => !syncedConfig.some(c => c.filename === f));
        newFiles.forEach(f => syncedConfig.push({ filename: f }));

        // Limpiar la propiedad "active" de todas las entradas para eliminar la funcionalidad
        syncedConfig.forEach(c => delete c.active);

        writeConfig(syncedConfig);

        const images = syncedConfig.map(imageConfig => ({
            filename: imageConfig.filename,
            url: `/assets/slider-imgs/${imageConfig.filename}`
        }));

        res.json(images);
    } catch (error) {
        res.status(500).json({ message: 'Error al leer las imágenes.', error: error.message });
    }
});

// POST /api/slider-manager/upload - Upload new images
router.post('/upload', upload.array('sliderImages'), (req, res) => {
    try {
        const config = readConfig();

        req.files.forEach(file => {
            const existing = config.find(c => c.filename === file.originalname);
            if (!existing) {
                config.push({ filename: file.originalname, active: true });
            }
        });

        writeConfig(config);
        res.status(201).json({ message: 'Imágenes subidas y activadas correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al subir las imágenes.', error });
    }
});

// DELETE /api/slider-manager/delete/:filename - Delete an image
router.delete('/delete/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(SLIDER_IMGS_DIR, filename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        let config = readConfig();
        config = config.filter(c => c.filename !== filename);
        writeConfig(config);

        res.status(200).json({ message: `Imagen '${filename}' eliminada correctamente.` });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la imagen.', error });
    }
});



module.exports = router;
