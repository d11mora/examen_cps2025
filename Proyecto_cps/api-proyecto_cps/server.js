const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { getPool, sql } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// --- Salud del servidor
app.get('/health', (_, res) => res.json({ ok: true }));

// --- Salud de la DB (prueba conexión)
app.get('/health-db', async (_, res) => {
    try {
        const pool = await getPool();
        await pool.request().query('SELECT 1 AS ok');
        res.json({ ok: true });
    } catch (e) {
        console.error('Health DB error:', e.message);
        res.status(500).json({ ok: false, error: e.message });
    }
});

// --- Listar clientes
app.get('/clientes', async (_, res) => {
    try {
        const pool = await getPool();
        const rs = await pool.request()
            .query('SELECT TOP 50 id_cliente, nombre, tipo, descuento_pct, activo FROM dbo.cliente ORDER BY id_cliente');
        res.json(rs.recordset);
    } catch (e) {
        console.error('GET /clientes error:', e.message);
        res.status(500).json({ error: 'Error consultando clientes' });
    }
});

// --- Buscar cliente por ID
app.get('/clientes/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'id inválido' });

    try {
        const pool = await getPool();
        const rs = await pool.request()
            .input('id', sql.Int, id)
            .query(`
        SELECT id_cliente, nombre, tipo, descuento_pct, activo
        FROM dbo.cliente
        WHERE id_cliente = @id
      `);
        if (rs.recordset.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(rs.recordset[0]);
    } catch (e) {
        console.error('GET /clientes/:id error:', e.message);
        res.status(500).json({ error: 'Error consultando cliente' });
    }
});

// --- Listar países (para dropdowns y tarifa de destino)
app.get('/paises', async (_, res) => {
    try {
        const pool = await getPool();
        const rs = await pool.request()
            .query('SELECT id_pais, nombre, region, tarifa FROM dbo.pais ORDER BY nombre');
        res.json(rs.recordset);
    } catch (e) {
        console.error('GET /paises error:', e.message);
        res.status(500).json({ error: 'Error consultando países' });
    }
});

// --- Crear paquete (inserta en detalle_paquete)
// Nota: total lo calcularemos en Angular según tu fórmula; aquí solo insertamos.
app.post('/paquetes', async (req, res) => {
    const {
        peso, ancho, alto, largo,
        id_pais_origen, id_pais_destino,
        id_cliente = null,
        total = 0
    } = req.body || {};

    if (
        peso == null || ancho == null || alto == null || largo == null ||
        id_pais_origen == null || id_pais_destino == null
    ) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('peso', sql.Decimal(10, 3), Number(peso))
            .input('ancho', sql.Decimal(10, 2), Number(ancho))
            .input('alto', sql.Decimal(10, 2), Number(alto))
            .input('largo', sql.Decimal(10, 2), Number(largo))
            .input('origen', sql.Int, Number(id_pais_origen))
            .input('dest', sql.Int, Number(id_pais_destino))
            .input('cli', sql.Int, id_cliente != null ? Number(id_cliente) : null)
            .input('total', sql.Decimal(12, 2), Number(total))
            .query(`
        INSERT INTO dbo.detalle_paquete
          (peso, ancho, alto, largo, id_pais_origen, id_pais_destino, id_cliente, total)
        OUTPUT INSERTED.id_paquete
        VALUES (@peso, @ancho, @alto, @largo, @origen, @dest, @cli, @total)
      `);

        const newId = result.recordset[0].id_paquete;
        res.status(201).json({ ok: true, id_paquete: newId });
    } catch (e) {
        console.error('POST /paquetes error:', e.message);
        res.status(500).json({ error: 'Error creando paquete' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API escuchando en http://localhost:${port}`));
