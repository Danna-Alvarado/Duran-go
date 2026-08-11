const express = require("express");
const router = express.Router();
const pool = require("./db");

// =====================================================
// OBTENER TODOS LOS HORARIOS
// =====================================================

router.get("/horarios", async (req, res) => {

    try {

        const resultado = await pool.query(
            `
            SELECT *
            FROM horarios
            ORDER BY hora_paso
            `
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error("Error obteniendo horarios:", error);

        res.status(500).json({
            error: "Error al obtener horarios"
        });

    }

});


// =====================================================
// BUSCAR HORARIOS POR RUTA Y PARADA
// =====================================================

router.get("/horarios/buscar", async (req, res) => {

    try {

        const { ruta, parada } = req.query;

        if (!ruta || !parada) {

            return res.status(400).json({
                mensaje: "Se necesita ruta y parada"
            });

        }

        const resultado = await pool.query(
            `
            SELECT
                id,
                ruta_id,
                parada_id,
                hora_paso
            FROM horarios
            WHERE ruta_id = $1
              AND parada_id = $2
            ORDER BY hora_paso
            `,
            [ruta, parada]
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error("Error buscando horarios:", error);

        res.status(500).json({
            error: "Error buscando horarios"
        });

    }

});


// =====================================================
// OBTENER PARADAS DE UNA RUTA
// =====================================================

router.get("/paradas/ruta/:ruta_id", async (req, res) => {

    try {

        const { ruta_id } = req.params;

        console.log(
            "Buscando paradas para ruta:",
            ruta_id
        );

        const resultado = await pool.query(
            `
            SELECT
                p.id,
                p.nombre_parada,
                rp.orden
            FROM ruta_paradas rp

            INNER JOIN paradas p
                ON p.id = rp.parada_id

            WHERE rp.ruta_id = $1

            ORDER BY rp.orden
            `,
            [ruta_id]
        );

        console.log(
            "Paradas encontradas:",
            resultado.rows
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error(
            "Error obteniendo paradas:",
            error
        );

        res.status(500).json({
            error: "Error obteniendo paradas"
        });

    }

});


module.exports = router;