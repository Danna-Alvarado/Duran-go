const express = require("express");
const router = express.Router();

const pool = require("./db");

router.post("/buscar-ruta", async (req, res, next) => {

    try {

        const {
            origenLat,
            origenLng,
            destinoLat,
            destinoLng
        } = req.body;


        const resultado = await pool.query(`

        WITH paradas_usuario AS (

            SELECT
                p.id,
                p.nombre_parada,
                p.latitud,
                p.longitud,

                (
                    6371 * acos(
                        cos(radians($1))
                        *
                        cos(radians(p.latitud))
                        *
                        cos(radians(p.longitud) - radians($2))
                        +
                        sin(radians($1))
                        *
                        sin(radians(p.latitud))
                    )
                ) AS distancia_origen,

                (
                    6371 * acos(
                        cos(radians($3))
                        *
                        cos(radians(p.latitud))
                        *
                        cos(radians(p.longitud) - radians($4))
                        +
                        sin(radians($3))
                        *
                        sin(radians(p.latitud))
                    )
                ) AS distancia_destino

            FROM paradas p

        ),

        parada_inicio AS (

            SELECT *
            FROM paradas_usuario
            ORDER BY distancia_origen
            LIMIT 1

        ),

        parada_fin AS (

            SELECT *
            FROM paradas_usuario
            ORDER BY distancia_destino
            LIMIT 1

        )

        SELECT DISTINCT

            r.id,
            r.nombre,
            r.color,

            pi.nombre_parada AS parada_subida,
            pi.distancia_origen AS distancia_subida,

            pf.nombre_parada AS parada_bajada,
            pf.distancia_destino AS distancia_bajada

        FROM rutas r

        JOIN ruta_paradas rp1
        ON rp1.ruta_id = r.id

        JOIN ruta_paradas rp2
        ON rp2.ruta_id = r.id

        CROSS JOIN parada_inicio pi
        CROSS JOIN parada_fin pf

        WHERE rp1.parada_id = pi.id
        AND rp2.parada_id = pf.id

        ORDER BY distancia_subida;

        `, [
            origenLat,
            origenLng,
            destinoLat,
            destinoLng
        ]);


        res.json(resultado.rows);

    } catch (err) {

        next(err);

    }

});

module.exports = router;