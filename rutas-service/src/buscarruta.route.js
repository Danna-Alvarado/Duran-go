const express = require("express");
const router = express.Router();
const pool = require("./db");

router.post("/buscar-ruta", async (req, res) => {
try {
const { origenLat, origenLng, destinoLat, destinoLng } = req.body;


    console.log("Coordenadas recibidas:", {
        origenLat,
        origenLng,
        destinoLat,
        destinoLng
    });

    const paradas = await pool.query(`
        SELECT id, nombre_parada, latitud, longitud
        FROM paradas
    `);

    const rutas = await pool.query(`
        SELECT id, nombre, color
        FROM rutas
    `);

    const rutaParadas = await pool.query(`
        SELECT ruta_id, parada_id, orden
        FROM ruta_paradas
        ORDER BY ruta_id, orden
    `);

    console.log("Paradas:", paradas.rows.length);
    console.log("Rutas:", rutas.rows.length);
    console.log("Relaciones:", rutaParadas.rows.length);

    return res.json({
        prueba: true,
        coordenadas: {
            origenLat,
            origenLng,
            destinoLat,
            destinoLng
        },
        datos: {
            paradas: paradas.rows.length,
            rutas: rutas.rows.length,
            ruta_paradas: rutaParadas.rows.length
        }
    });

} catch (error) {
    console.error("ERROR BUSCAR RUTA");
    console.error(error);

    return res.status(500).json({
        mensaje: "Error interno buscando rutas",
        error: error.message
    });
}


});

module.exports = router;
