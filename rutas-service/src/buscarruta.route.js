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

        const radioOrigen = 1000;
        const radioDestino = 1000;
        const radioTransbordo = 400;

        const resultado = await pool.query(
            `
            WITH todas_las_paradas AS (
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

            paradas_origen AS (
                SELECT *
                FROM todas_las_paradas
                WHERE distancia_origen <= $5
            ),

            paradas_destino AS (
                SELECT *
                FROM todas_las_paradas
                WHERE distancia_destino <= $6
            ),

            rutas_directas AS (
                SELECT
                    r.id AS ruta_id,
                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color,

                    po.id AS subida_id,
                    po.nombre_parada AS subida_nombre,
                    po.latitud AS subida_latitud,
                    po.longitud AS subida_longitud,
                    po.distancia_origen,

                    pd.id AS bajada_id,
                    pd.nombre_parada AS bajada_nombre,
                    pd.latitud AS bajada_latitud,
                    pd.longitud AS bajada_longitud,
                    pd.distancia_destino,

                    rp1.orden AS orden_subida,
                    rp2.orden AS orden_bajada

                FROM paradas_origen po

                INNER JOIN ruta_paradas rp1
                    ON rp1.parada_id = po.id

                INNER JOIN ruta_paradas rp2
                    ON rp2.ruta_id = rp1.ruta_id

                INNER JOIN paradas_destino pd
                    ON pd.id = rp2.parada_id

                INNER JOIN rutas r
                    ON r.id = rp1.ruta_id

                WHERE rp1.orden < rp2.orden
            ),

            mejor_directa AS (
                SELECT *
                FROM rutas_directas
                ORDER BY
                    distancia_origen
                    +
                    distancia_destino
                    +
                    ((orden_bajada - orden_subida) * 5)
                LIMIT 1
            ),

            posibles_primeros AS (
                SELECT
                    r.id AS ruta1_id,
                    r.nombre AS ruta1_nombre,
                    r.color AS ruta1_color,

                    po.id AS subida1_id,
                    po.nombre_parada AS subida1_nombre,
                    po.latitud AS subida1_latitud,
                    po.longitud AS subida1_longitud,
                    po.distancia_origen,

                    rp1.orden AS orden_subida1,

                    pt.id AS transbordo1_id,
                    pt.nombre_parada AS transbordo1_nombre,
                    pt.latitud AS transbordo1_latitud,
                    pt.longitud AS transbordo1_longitud,

                    rpT.orden AS orden_transbordo

                FROM paradas_origen po

                INNER JOIN ruta_paradas rp1
                    ON rp1.parada_id = po.id

                INNER JOIN rutas r
                    ON r.id = rp1.ruta_id

                INNER JOIN ruta_paradas rpT
                    ON rpT.ruta_id = r.id

                INNER JOIN paradas pt
                    ON pt.id = rpT.parada_id

                WHERE rp1.orden < rpT.orden
            ),

            posibles_segundos AS (
                SELECT
                    r.id AS ruta2_id,
                    r.nombre AS ruta2_nombre,
                    r.color AS ruta2_color,

                    pt.id AS subida2_id,
                    pt.nombre_parada AS subida2_nombre,
                    pt.latitud AS subida2_latitud,
                    pt.longitud AS subida2_longitud,

                    rpT.orden AS orden_subida2,

                    pd.id AS bajada2_id,
                    pd.nombre_parada AS bajada2_nombre,
                    pd.latitud AS bajada2_latitud,
                    pd.longitud AS bajada2_longitud,
                    pd.distancia_destino,

                    rpD.orden AS orden_bajada2

                FROM paradas_destino pd

                INNER JOIN ruta_paradas rpD
                    ON rpD.parada_id = pd.id

                INNER JOIN rutas r
                    ON r.id = rpD.ruta_id

                INNER JOIN ruta_paradas rpT
                    ON rpT.ruta_id = r.id

                INNER JOIN paradas pt
                    ON pt.id = rpT.parada_id

                WHERE rpT.orden < rpD.orden
            ),

            combinaciones AS (
                SELECT

                    p.ruta1_id,
                    p.ruta1_nombre,
                    p.ruta1_color,

                    p.subida1_id,
                    p.subida1_nombre,
                    p.subida1_latitud,
                    p.subida1_longitud,

                    p.transbordo1_id,
                    p.transbordo1_nombre,
                    p.transbordo1_latitud,
                    p.transbordo1_longitud,

                    s.ruta2_id,
                    s.ruta2_nombre,
                    s.ruta2_color,

                    s.subida2_id,
                    s.subida2_nombre,
                    s.subida2_latitud,
                    s.subida2_longitud,

                    s.bajada2_id,
                    s.bajada2_nombre,
                    s.bajada2_latitud,
                    s.bajada2_longitud,

                    p.distancia_origen,
                    s.distancia_destino,

                    6371000 * acos(
                        LEAST(
                            1,
                            GREATEST(
                                -1,

                                cos(
                                    radians(
                                        p.transbordo1_latitud
                                    )
                                )

                                *

                                cos(
                                    radians(
                                        s.subida2_latitud
                                    )
                                )

                                *

                                cos(
                                    radians(
                                        s.subida2_longitud
                                    )
                                    -
                                    radians(
                                        p.transbordo1_longitud
                                    )
                                )

                                +

                                sin(
                                    radians(
                                        p.transbordo1_latitud
                                    )
                                )

                                *

                                sin(
                                    radians(
                                        s.subida2_latitud
                                    )
                                )
                            )
                        )
                    ) AS distancia_transbordo

                FROM posibles_primeros p

                INNER JOIN posibles_segundos s
                    ON p.ruta1_id <> s.ruta2_id

                WHERE
                    6371000 * acos(
                        LEAST(
                            1,
                            GREATEST(
                                -1,

                                cos(
                                    radians(
                                        p.transbordo1_latitud
                                    )
                                )

                                *

                                cos(
                                    radians(
                                        s.subida2_latitud
                                    )
                                )

                                *

                                cos(
                                    radians(
                                        s.subida2_longitud
                                    )
                                    -
                                    radians(
                                        p.transbordo1_longitud
                                    )
                                )

                                +

                                sin(
                                    radians(
                                        p.transbordo1_latitud
                                    )
                                )

                                *

                                sin(
                                    radians(
                                        s.subida2_latitud
                                    )
                                )
                            )
                        )
                    ) <= $7
            ),

            mejor_transbordo AS (
                SELECT *
                FROM combinaciones
                ORDER BY
                    distancia_origen
                    +
                    distancia_transbordo
                    +
                    distancia_destino
                LIMIT 1
            )

            SELECT
                'DIRECTA' AS tipo,

                ruta_id AS ruta1_id,
                ruta_nombre AS ruta1_nombre,
                ruta_color AS ruta1_color,

                subida_id AS parada_subida_id,
                subida_nombre AS parada_subida,
                subida_latitud AS parada_subida_latitud,
                subida_longitud AS parada_subida_longitud,

                bajada_id AS parada_bajada_id,
                bajada_nombre AS parada_bajada,
                bajada_latitud AS parada_bajada_latitud,
                bajada_longitud AS parada_bajada_longitud,

                NULL::INTEGER AS ruta2_id,
                NULL::VARCHAR AS ruta2_nombre,
                NULL::VARCHAR AS ruta2_color,

                NULL::INTEGER AS parada_subida_2_id,
                NULL::VARCHAR AS parada_subida_2,
                NULL::NUMERIC AS parada_subida_2_latitud,
                NULL::NUMERIC AS parada_subida_2_longitud,

                1 AS cantidad_camiones

            FROM mejor_directa

            UNION ALL

            SELECT
                'TRANSBORDO' AS tipo,

                ruta1_id,
                ruta1_nombre,
                ruta1_color,

                subida1_id,
                subida1_nombre,
                subida1_latitud,
                subida1_longitud,

                transbordo1_id,
                transbordo1_nombre,
                transbordo1_latitud,
                transbordo1_longitud,

                ruta2_id,
                ruta2_nombre,
                ruta2_color,

                subida2_id,
                subida2_nombre,
                subida2_latitud,
                subida2_longitud,

                2 AS cantidad_camiones

            FROM mejor_transbordo

            WHERE NOT EXISTS (
                SELECT 1
                FROM mejor_directa
            );
            `,
            [
                origenLat,
                origenLng,
                destinoLat,
                destinoLng,
                radioOrigen,
                radioDestino,
                radioTransbordo
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró una ruta cercana.",
                rutas: []
            });
        }

        const ruta = resultado.rows[0];

        if (ruta.tipo === "DIRECTA") {
            return res.json({
                tipo: "DIRECTA",
                cantidad_camiones: 1,
                rutas: [
                    {
                        numero: 1,
                        ruta_id: ruta.ruta1_id,
                        ruta: ruta.ruta1_nombre,
                        color: ruta.ruta1_color,

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
        }

        return res.json({
            tipo: "TRANSBORDO",
            cantidad_camiones: 2,
            rutas: [
                {
                    numero: 1,
                    ruta_id: ruta.ruta1_id,
                    ruta: ruta.ruta1_nombre,
                    color: ruta.ruta1_color,

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
                },

                {
                    numero: 2,
                    ruta_id: ruta.ruta2_id,
                    ruta: ruta.ruta2_nombre,
                    color: ruta.ruta2_color,

                    parada_subida: {
                        id: ruta.parada_subida_2_id,
                        nombre: ruta.parada_subida_2,
                        latitud: Number(ruta.parada_subida_2_latitud),
                        longitud: Number(ruta.parada_subida_2_longitud)
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
        console.error("ERROR BUSCANDO RUTA");
        console.error(error);

        return res.status(500).json({
            error: "Error interno al buscar ruta.",
            detalle: error.message
        });
    }
});

module.exports = router;