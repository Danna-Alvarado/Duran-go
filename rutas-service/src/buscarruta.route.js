const express = require("express");
const router = express.Router();
const pool = require("./db");

router.post("/buscar-ruta", async (req, res) => {
    try {
        const {
            origenLat,
            origenLng,
            destinoLat,
            destinoLng
        } = req.body;

        if (
            origenLat == null ||
            origenLng == null ||
            destinoLat == null ||
            destinoLng == null
        ) {
            return res.status(400).json({
                error: "Se requieren las coordenadas de origen y destino"
            });
        }

        const radio = 800;

        const resultado = await pool.query(
            `
            WITH paradas_cercanas AS (
                SELECT
                    p.id,
                    p.nombre_parada,
                    p.latitud,
                    p.longitud,

                    6371000 * acos(
                        LEAST(
                            1,
                            GREATEST(
                                -1,
                                cos(radians($1))
                                * cos(radians(p.latitud))
                                * cos(
                                    radians(p.longitud)
                                    - radians($2)
                                )
                                + sin(radians($1))
                                * sin(radians(p.latitud))
                            )
                        )
                    ) AS distancia_origen,

                    6371000 * acos(
                        LEAST(
                            1,
                            GREATEST(
                                -1,
                                cos(radians($3))
                                * cos(radians(p.latitud))
                                * cos(
                                    radians(p.longitud)
                                    - radians($4)
                                )
                                + sin(radians($3))
                                * sin(radians(p.latitud))
                            )
                        )
                    ) AS distancia_destino

                FROM paradas p
            ),

            origen AS (
                SELECT *
                FROM paradas_cercanas
                WHERE distancia_origen <= $5
            ),

            destino AS (
                SELECT *
                FROM paradas_cercanas
                WHERE distancia_destino <= $5
            ),

            rutas_directas AS (
                SELECT
                    r.id AS ruta_id,
                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color,

                    po.id AS parada_subida_id,
                    po.nombre_parada AS parada_subida,
                    po.latitud AS parada_subida_latitud,
                    po.longitud AS parada_subida_longitud,

                    pd.id AS parada_bajada_id,
                    pd.nombre_parada AS parada_bajada,
                    pd.latitud AS parada_bajada_latitud,
                    pd.longitud AS parada_bajada_longitud,

                    o.distancia_origen,
                    d.distancia_destino,

                    rpo.orden AS orden_subida,
                    rpd.orden AS orden_bajada

                FROM origen o

                INNER JOIN ruta_paradas rpo
                    ON rpo.parada_id = o.id

                INNER JOIN rutas r
                    ON r.id = rpo.ruta_id

                INNER JOIN ruta_paradas rpd
                    ON rpd.ruta_id = r.id

                INNER JOIN destino d
                    ON d.id = rpd.parada_id

                INNER JOIN paradas po
                    ON po.id = o.id

                INNER JOIN paradas pd
                    ON pd.id = d.id

                WHERE rpo.orden < rpd.orden
            )

            SELECT *
            FROM rutas_directas
            ORDER BY
                distancia_origen + distancia_destino ASC
            LIMIT 1;
            `,
            [
                origenLat,
                origenLng,
                destinoLat,
                destinoLng,
                radio
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró una ruta directa.",
                rutas: []
            });
        }

        const ruta = resultado.rows[0];

        return res.json({
            tipo: "DIRECTA",
            cantidad_camiones: 1,
            rutas: [
                {
                    numero: 1,

                    ruta_id: ruta.ruta_id,

                    ruta: ruta.ruta_nombre,

                    color: ruta.ruta_color,

                    parada_subida: {
                        id: ruta.parada_subida_id,
                        nombre: ruta.parada_subida,
                        latitud: Number(ruta.parada_subida_latitud),
                        longitud: Number(ruta.parada_subida_longitud)
                    },

                    parada_bajada: {
                        id: ruta.parada_bajada_id,
                        nombre: ruta.parada_bajada,
                        latitud: Number(ruta.parada_bajada_latitud),
                        longitud: Number(ruta.parada_bajada_longitud)
                    }
                }
            ]
        });

    } catch (error) {
        console.error("ERROR BUSCANDO RUTA:");
        console.error(error);

        return res.status(500).json({
            error: "Error interno al buscar ruta.",
            detalle: error.message
        });
    }
});

module.exports = router;