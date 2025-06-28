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

        // Sincronizar el config con los archivos reales
        let syncedConfig = config.filter(c => actualFiles.includes(c.filename));
        const existingFilenames = syncedConfig.map(c => c.filename);

        actualFiles.forEach(file => {
            if (!existingFilenames.includes(file)) {
                syncedConfig.push({
                    filename: file,
                    title: "Título por defecto",
                    buttonText: "Ver más"
                });
            }
        });

        // Asegurarse de que todos los elementos tengan los campos necesarios
        syncedConfig.forEach(c => {
            c.title = c.title || "";
            c.buttonText = c.buttonText || "";
            delete c.active; // Eliminar campo obsoleto
        });

        writeConfig(syncedConfig);

        const images = syncedConfig.map(imageConfig => ({
            filename: imageConfig.filename,
            url: `/assets/slider-imgs/${imageConfig.filename}`,
            title: imageConfig.title,
            buttonText: imageConfig.buttonText
        }));

        res.json(images);
    } catch (error) {
        res.status(500).json({ message: 'Error al leer las imágenes.', error: error.message });
    }
});

// POST /api/slider-manager/upload - Upload a new image with details
router.post('/upload', upload.single('sliderImage'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
        }

        const { title, buttonText } = req.body;
        const filename = req.file.originalname;

        const config = readConfig();
        const existing = config.find(c => c.filename === filename);

        if (existing) {
            return res.status(409).json({ message: `La imagen '${filename}' ya existe.` });
        }

        config.push({
            filename,
            title: title || '',
            buttonText: buttonText || ''
        });

        writeConfig(config);
        res.status(201).json({ message: 'Imagen subida correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al subir la imagen.', error });
    }
});

// PUT /api/slider-manager/update/:filename - Update image details
router.put('/update/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const { title, buttonText } = req.body;

        let config = readConfig();
        const imageIndex = config.findIndex(c => c.filename === filename);

        if (imageIndex === -1) {
            return res.status(404).json({ message: 'Imagen no encontrada en la configuración.' });
        }

        // Actualizar los datos
        config[imageIndex].title = title !== undefined ? title : config[imageIndex].title;
        config[imageIndex].buttonText = buttonText !== undefined ? buttonText : config[imageIndex].buttonText;

        writeConfig(config);
        res.status(200).json({ message: `Datos de '${filename}' actualizados.` });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar los datos de la imagen.', error });
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
