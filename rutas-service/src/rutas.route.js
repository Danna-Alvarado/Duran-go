const express = require("express");
const router = express.Router();

const pool = require("./db");


// OBTENER RUTAS

router.get("/rutas", async (req, res, next) => {

    try {

        const resultado = await pool.query(`
            SELECT id, nombre, color
            FROM rutas
            ORDER BY nombre
        `);

        res.json(resultado.rows);

    } catch (err) {

        next(err);

    }

});



// OBTENER AUTOBUSES


router.get("/autobuses/:rutaId", async (req, res, next) => {

    try {

        const { rutaId } = req.params;

        const resultado = await pool.query(`
            SELECT
                a.id,
                a.numero_bus
            FROM autobuses a
            WHERE a.ruta_id = $1
            AND NOT EXISTS(
                SELECT 1
                FROM jornadas_activas j
                WHERE j.autobus_id = a.id
                AND j.activa = true
            )
            ORDER BY a.numero_bus
        `,[rutaId]);

        res.json(resultado.rows);

    } catch(err){

        next(err);

    }

});



module.exports = router;