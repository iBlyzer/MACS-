const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// POST para crear un nuevo pedido y generar PDF
router.post('/', async (req, res) => {
    const { cliente_nombre, cliente_id, cliente_telefono, cliente_direccion, pedido_fecha, pedido_numero, pedido_vendedor, productos, subtotal, iva, total } = req.body;

    let pedidoId;

    try {
        // Iniciar transacción
        await pool.query('BEGIN');

        // Insertar el pedido en la base de datos
        const pedidoResult = await pool.query(
            'INSERT INTO pedidos (numero_orden, fecha, cliente_nombre, cliente_id, cliente_telefono, cliente_direccion, vendedor, subtotal, iva, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [pedido_numero, pedido_fecha, cliente_nombre, cliente_id, cliente_telefono, cliente_direccion, pedido_vendedor, subtotal, iva, total]
        );
        pedidoId = pedidoResult[0].insertId;

        // Insertar los productos del pedido
        for (const producto of productos) {
            await pool.query(
                'INSERT INTO pedido_productos (pedido_id, referencia, nombre, cantidad, valor_unitario, valor_total) VALUES (?, ?, ?, ?, ?, ?)',
                [pedidoId, producto.referencia, producto.nombre, producto.cantidad, producto.valor_unitario, producto.valor_total]
            );
        }

        // Commit de la transacción
        await pool.query('COMMIT');

        // --- Generación del PDF ---
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const dirPath = path.join(__dirname, '..', 'uploads', 'pedidos');
        const filePath = path.join(dirPath, `${pedido_numero}.pdf`);
        await fs.promises.mkdir(dirPath, { recursive: true });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // --- Contenido del PDF ---
        doc.fontSize(20).font('Helvetica-Bold').text('Orden de Pedido', { align: 'center' });
        doc.moveDown(2);

        const infoTop = doc.y;
        doc.fontSize(12).font('Helvetica-Bold').text('Cliente:', 50, infoTop);
        doc.text('Nº Orden:', 350, infoTop);
        doc.font('Helvetica').text(cliente_nombre, 150, infoTop);
        doc.font('Helvetica').text(pedido_numero, 450, infoTop);

        const infoTop2 = doc.y;
        doc.font('Helvetica-Bold').text('Cédula/NIT:', 50, infoTop2);
        doc.font('Helvetica-Bold').text('Fecha:', 350, infoTop2);
        doc.font('Helvetica').text(cliente_id, 150, infoTop2);
        doc.font('Helvetica').text(new Date(pedido_fecha).toLocaleDateString('es-CO'), 450, infoTop2);
        doc.moveDown(0.5);

        const tableTop = doc.y + 20;
        doc.font('Helvetica-Bold');
        doc.text('Referencia', 50, tableTop);
        doc.text('Producto', 150, tableTop);
        doc.text('Cant.', 350, tableTop, { width: 40, align: 'right' });
        doc.text('V. Unitario', 400, tableTop, { width: 70, align: 'right' });
        doc.text('V. Total', 480, tableTop, { width: 70, align: 'right' });
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

        doc.font('Helvetica');
        let y = doc.y + 5;
        productos.forEach(p => {
            doc.text(p.referencia, 50, y);
            doc.text(p.nombre, 150, y, { width: 200 });
            doc.text(String(p.cantidad), 350, y, { width: 40, align: 'right' });
            doc.text(String(p.valor_unitario), 400, y, { width: 70, align: 'right' });
            doc.text(String(p.valor_total), 480, y, { width: 70, align: 'right' });
            y = doc.y + 15;
            if (y > 700) { 
                doc.addPage();
                y = 50;
            }
        });

        doc.y = y + 20;
        doc.font('Helvetica-Bold');
        doc.text('Subtotal:', 350, doc.y, { align: 'right', width: 120 });
        doc.font('Helvetica').text(String(subtotal), 480, doc.y - 15, { align: 'right', width: 70 });
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('IVA (19%):', 350, doc.y, { align: 'right', width: 120 });
        doc.font('Helvetica').text(String(iva), 480, doc.y - 15, { align: 'right', width: 70 });
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Total:', 350, doc.y, { align: 'right', width: 120 });
        doc.font('Helvetica').text(String(total), 480, doc.y - 15, { align: 'right', width: 70 });

        doc.end();

        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        res.status(201).json({ 
            message: 'Pedido creado exitosamente y archivo PDF generado.',
            pedidoId: pedidoId,
            downloadUrl: `/uploads/pedidos/${pedido_numero}.pdf`
        });

    } catch (error) {
        console.error('Error al crear el pedido:', error);
        if (!pedidoId) {
            await pool.query('ROLLBACK');
        }
        res.status(500).json({ message: 'Error en el servidor al procesar el pedido.', error: error.message });
    }
});

// GET para obtener todos los pedidos con filtros
router.get('/', async (req, res) => {
    try {
        const { numero_orden, cliente_nombre, fecha_inicio, fecha_fin } = req.query;

        let query = 'SELECT id, numero_orden, fecha, cliente_nombre, total FROM pedidos WHERE 1=1';
        const params = [];

        if (numero_orden) {
            query += ' AND numero_orden LIKE ?';
            params.push(`%${numero_orden}%`);
        }

        if (cliente_nombre) {
            query += ' AND cliente_nombre LIKE ?';
            params.push(`%${cliente_nombre}%`);
        }

        if (fecha_inicio) {
            query += ' AND DATE(fecha) >= ?';
            params.push(fecha_inicio);
        }

        if (fecha_fin) {
            query += ' AND DATE(fecha) <= ?';
            params.push(fecha_fin);
        }

        query += ' ORDER BY fecha DESC, id DESC';

        const [pedidos] = await pool.query(query, params);
        res.json(pedidos);
    } catch (error) {
        console.error('Error al obtener los pedidos:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener los pedidos.', error: error.message });
    }
});

module.exports = router;
