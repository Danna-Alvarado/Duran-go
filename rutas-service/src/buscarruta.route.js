
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


        // ============================================
        // VALIDACIÓN
        // ============================================

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


        // ============================================
        // CONFIGURACIÓN
        // ============================================

        // Distancia máxima desde el origen
        // hasta la primera parada.
        const radioOrigenDestino = 800;

        // Distancia máxima entre la parada
        // donde bajas del primer camión y
        // la parada donde subes al segundo.
        const radioTransbordo = 500;


        // ============================================
        // CONSULTA
        // ============================================

        const resultado = await pool.query(
            `

            WITH paradas_distancias AS (

                SELECT

                    p.id,
                    p.nombre_parada,
                    p.latitud,
                    p.longitud,


                    -- ========================================
                    -- DISTANCIA AL ORIGEN
                    -- ========================================

                    (
                        6371000 * acos(
                            LEAST(
                                1,
                                GREATEST(
                                    -1,

                                    cos(radians($1))
                                    *
                                    cos(radians(p.latitud))
                                    *
                                    cos(
                                        radians(p.longitud)
                                        -
                                        radians($2)
                                    )

                                    +

                                    sin(radians($1))
                                    *
                                    sin(radians(p.latitud))
                                )
                            )
                        )
                    ) AS distancia_origen,


                    -- ========================================
                    -- DISTANCIA AL DESTINO
                    -- ========================================

                    (
                        6371000 * acos(
                            LEAST(
                                1,
                                GREATEST(
                                    -1,

                                    cos(radians($3))
                                    *
                                    cos(radians(p.latitud))
                                    *
                                    cos(
                                        radians(p.longitud)
                                        -
                                        radians($4)
                                    )

                                    +

                                    sin(radians($3))
                                    *
                                    sin(radians(p.latitud))
                                )
                            )
                        )
                    ) AS distancia_destino

                FROM paradas p

            ),


            -- ============================================
            -- PARADAS CERCA DEL ORIGEN
            -- ============================================

            paradas_origen AS (

                SELECT *

                FROM paradas_distancias

                WHERE distancia_origen <= $5

            ),


            -- ============================================
            -- PARADAS CERCA DEL DESTINO
            -- ============================================

            paradas_destino AS (

                SELECT *

                FROM paradas_distancias

                WHERE distancia_destino <= $5

            ),


            -- ============================================
            -- RUTAS DIRECTAS
            -- ============================================

            rutas_directas AS (

                SELECT

                    r.id AS ruta_id,
                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color,


                    -- PARADA DONDE SUBE

                    po.id AS parada_subida_id,
                    po.nombre_parada AS parada_subida,
                    po.latitud AS parada_subida_latitud,
                    po.longitud AS parada_subida_longitud,


                    -- PARADA DONDE BAJA

                    pd.id AS parada_bajada_id,
                    pd.nombre_parada AS parada_bajada,
                    pd.latitud AS parada_bajada_latitud,
                    pd.longitud AS parada_bajada_longitud,


                    po.distancia_origen,
                    pd.distancia_destino,


                    rp1.orden AS orden_subida,
                    rp2.orden AS orden_bajada


                FROM rutas r


                INNER JOIN ruta_paradas rp1
                    ON rp1.ruta_id = r.id


                INNER JOIN ruta_paradas rp2
                    ON rp2.ruta_id = r.id


                INNER JOIN paradas_origen po
                    ON po.id = rp1.parada_id


                INNER JOIN paradas_destino pd
                    ON pd.id = rp2.parada_id


                WHERE

                    rp1.orden < rp2.orden

                    AND rp1.parada_id <> rp2.parada_id

            ),


            -- ============================================
            -- MEJOR RUTA DIRECTA
            -- ============================================

            mejor_directa AS (

                SELECT *

                FROM rutas_directas

                ORDER BY

                    distancia_origen
                    +
                    distancia_destino

                LIMIT 1

            ),


            -- ============================================
            -- PRIMER CAMIÓN
            --
            -- ORIGEN
            -- ↓
            -- PARADA TRANSBORDO
            -- ============================================

            primer_camion AS (

                SELECT

                    r1.id AS ruta1_id,
                    r1.nombre AS ruta1_nombre,
                    r1.color AS ruta1_color,


                    -- PARADA DONDE SUBE

                    po.id AS parada_subida_id,
                    po.nombre_parada AS parada_subida,
                    po.latitud AS parada_subida_latitud,
                    po.longitud AS parada_subida_longitud,


                    -- PARADA DE TRANSBORDO

                    pt.id AS parada_transbordo_id,
                    pt.nombre_parada AS parada_transbordo,
                    pt.latitud AS parada_transbordo_latitud,
                    pt.longitud AS parada_transbordo_longitud,


                    po.distancia_origen,


                    rp1.orden AS orden_subida,
                    rp_transbordo.orden AS orden_transbordo


                FROM rutas r1


                INNER JOIN ruta_paradas rp1

                    ON rp1.ruta_id = r1.id


                INNER JOIN ruta_paradas rp_transbordo

                    ON rp_transbordo.ruta_id = r1.id


                INNER JOIN paradas_origen po

                    ON po.id = rp1.parada_id


                INNER JOIN paradas pt

                    ON pt.id = rp_transbordo.parada_id


                WHERE

                    rp1.orden < rp_transbordo.orden

            ),


            -- ============================================
            -- SEGUNDO CAMIÓN
            --
            -- PARADA TRANSBORDO
            -- ↓
            -- DESTINO
            -- ============================================

            segundo_camion AS (

                SELECT

                    r2.id AS ruta2_id,
                    r2.nombre AS ruta2_nombre,
                    r2.color AS ruta2_color,


                    -- PARADA DONDE SUBE

                    pt2.id AS parada_subida_id,
                    pt2.nombre_parada AS parada_subida,
                    pt2.latitud AS parada_subida_latitud,
                    pt2.longitud AS parada_subida_longitud,


                    -- PARADA DONDE BAJA

                    pd.id AS parada_bajada_id,
                    pd.nombre_parada AS parada_bajada,
                    pd.latitud AS parada_bajada_latitud,
                    pd.longitud AS parada_bajada_longitud,


                    pd.distancia_destino,


                    rp_transbordo2.orden AS orden_subida,
                    rp2.orden AS orden_bajada


                FROM rutas r2


                INNER JOIN ruta_paradas rp_transbordo2

                    ON rp_transbordo2.ruta_id = r2.id


                INNER JOIN ruta_paradas rp2

                    ON rp2.ruta_id = r2.id


                INNER JOIN paradas pt2

                    ON pt2.id = rp_transbordo2.parada_id


                INNER JOIN paradas_destino pd

                    ON pd.id = rp2.parada_id


                WHERE

                    rp_transbordo2.orden < rp2.orden

            ),


            -- ============================================
            -- COMBINAR LOS DOS CAMIONES
            -- ============================================

            rutas_dos_camiones AS (

                SELECT

                    p.ruta1_id,
                    p.ruta1_nombre,
                    p.ruta1_color,


                    -- ================================
                    -- PRIMERA PARADA
                    -- ================================

                    p.parada_subida_id,
                    p.parada_subida,
                    p.parada_subida_latitud,
                    p.parada_subida_longitud,


                    -- ================================
                    -- TRANSBORDO
                    -- ================================

                    p.parada_transbordo_id,
                    p.parada_transbordo,
                    p.parada_transbordo_latitud,
                    p.parada_transbordo_longitud,


                    -- ================================
                    -- SEGUNDA RUTA
                    -- ================================

                    s.ruta2_id,
                    s.ruta2_nombre,
                    s.ruta2_color,


                    -- ================================
                    -- SEGUNDA PARADA DE SUBIDA
                    -- ================================

                    s.parada_subida_id AS parada_subida_2_id,

                    s.parada_subida AS parada_subida_2,

                    s.parada_subida_latitud
                        AS parada_subida_2_latitud,

                    s.parada_subida_longitud
                        AS parada_subida_2_longitud,


                    -- ================================
                    -- DESTINO
                    -- ================================

                    s.parada_bajada_id,

                    s.parada_bajada,

                    s.parada_bajada_latitud,

                    s.parada_bajada_longitud,


                    p.distancia_origen,

                    s.distancia_destino,


                    -- =================================
                    -- DISTANCIA ENTRE TRANSBORDOS
                    -- =================================

                    (
                        6371000 * acos(
                            LEAST(
                                1,
                                GREATEST(
                                    -1,

                                    cos(
                                        radians(
                                            p.parada_transbordo_latitud
                                        )
                                    )

                                    *

                                    cos(
                                        radians(
                                            s.parada_subida_latitud
                                        )
                                    )

                                    *

                                    cos(
                                        radians(
                                            s.parada_subida_longitud
                                        )
                                        -
                                        radians(
                                            p.parada_transbordo_longitud
                                        )
                                    )

                                    +

                                    sin(
                                        radians(
                                            p.parada_transbordo_latitud
                                        )
                                    )

                                    *

                                    sin(
                                        radians(
                                            s.parada_subida_latitud
                                        )
                                    )
                                )
                            )
                        )
                    ) AS distancia_transbordo


                FROM primer_camion p


                INNER JOIN segundo_camion s

                    ON p.ruta1_id <> s.ruta2_id


                WHERE

                    (
                        6371000 * acos(
                            LEAST(
                                1,
                                GREATEST(
                                    -1,

                                    cos(
                                        radians(
                                            p.parada_transbordo_latitud
                                        )
                                    )

                                    *

                                    cos(
                                        radians(
                                            s.parada_subida_latitud
                                        )
                                    )

                                    *

                                    cos(
                                        radians(
                                            s.parada_subida_longitud
                                        )
                                        -
                                        radians(
                                            p.parada_transbordo_longitud
                                        )
                                    )

                                    +

                                    sin(
                                        radians(
                                            p.parada_transbordo_latitud
                                        )
                                    )

                                    *

                                    sin(
                                        radians(
                                            s.parada_subida_latitud
                                        )
                                    )
                                )
                            )
                        )
                    ) <= $6

            ),


            -- ============================================
            -- MEJOR COMBINACIÓN DE 2 CAMIONES
            -- ============================================

            mejor_dos_camiones AS (

                SELECT *

                FROM rutas_dos_camiones

                ORDER BY

                    distancia_origen
                    +
                    distancia_transbordo
                    +
                    distancia_destino

                LIMIT 1

            )


            -- ============================================
            -- RESULTADO
            --
            -- SI EXISTE DIRECTA:
            -- DEVOLVEMOS 1
            --
            -- SI NO:
            -- DEVOLVEMOS 2
            -- ============================================

            SELECT

                'DIRECTA' AS tipo,


                ruta_id AS ruta1_id,
                ruta_nombre AS ruta1_nombre,
                ruta_color AS ruta1_color,


                parada_subida_id,
                parada_subida,
                parada_subida_latitud,
                parada_subida_longitud,


                parada_bajada_id,
                parada_bajada,
                parada_bajada_latitud,
                parada_bajada_longitud,


                NULL::INTEGER AS ruta2_id,
                NULL::VARCHAR AS ruta2_nombre,
                NULL::VARCHAR AS ruta2_color,


                NULL::INTEGER AS parada_subida_2_id,
                NULL::VARCHAR AS parada_subida_2,
                NULL::DOUBLE PRECISION AS parada_subida_2_latitud,
                NULL::DOUBLE PRECISION AS parada_subida_2_longitud,


                1 AS cantidad_camiones


            FROM mejor_directa


            UNION ALL


            SELECT

                'TRANSBORDO' AS tipo,


                ruta1_id,
                ruta1_nombre,
                ruta1_color,


                parada_subida_id,
                parada_subida,
                parada_subida_latitud,
                parada_subida_longitud,


                parada_transbordo_id AS parada_bajada_id,
                parada_transbordo AS parada_bajada,
                parada_transbordo_latitud AS parada_bajada_latitud,
                parada_transbordo_longitud AS parada_bajada_longitud,


                ruta2_id,
                ruta2_nombre,
                ruta2_color,


                parada_subida_2_id,
                parada_subida_2,
                parada_subida_2_latitud,
                parada_subida_2_longitud,


                2 AS cantidad_camiones


            FROM mejor_dos_camiones


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
                radioOrigenDestino,
                radioTransbordo
            ]

        );


        // ============================================
        // NO SE ENCONTRÓ NADA
        // ============================================

        if (resultado.rows.length === 0) {

            return res.status(404).json({

                mensaje:
                    "No se encontró una ruta directa ni una combinación de dos camiones.",

                rutas: []

            });

        }


        const resultadoRuta = resultado.rows[0];


        // ============================================
        // RUTA DIRECTA
        // ============================================

        if (resultadoRuta.tipo === "DIRECTA") {

            return res.json({

                tipo: "DIRECTA",

                cantidad_camiones: 1,

                rutas: [

                    {

                        ruta_id:
                            resultadoRuta.ruta1_id,

                        ruta:
                            resultadoRuta.ruta1_nombre,

                        color:
                            resultadoRuta.ruta1_color,


                        parada_subida: {

                            id:
                                resultadoRuta.parada_subida_id,

                            nombre:
                                resultadoRuta.parada_subida,

                            latitud:
                                resultadoRuta.parada_subida_latitud,

                            longitud:
                                resultadoRuta.parada_subida_longitud

                        },


                        parada_bajada: {

                            id:
                                resultadoRuta.parada_bajada_id,

                            nombre:
                                resultadoRuta.parada_bajada,

                            latitud:
                                resultadoRuta.parada_bajada_latitud,

                            longitud:
                                resultadoRuta.parada_bajada_longitud

                        }

                    }

                ]

            });

        }


        // ============================================
        // DOS CAMIONES
        // ============================================

        return res.json({

            tipo: "TRANSBORDO",

            cantidad_camiones: 2,

            rutas: [

                {

                    numero: 1,

                    ruta_id:
                        resultadoRuta.ruta1_id,

                    ruta:
                        resultadoRuta.ruta1_nombre,

                    color:
                        resultadoRuta.ruta1_color,


                    parada_subida: {

                        id:
                            resultadoRuta.parada_subida_id,

                        nombre:
                            resultadoRuta.parada_subida,

                        latitud:
                            resultadoRuta.parada_subida_latitud,

                        longitud:
                            resultadoRuta.parada_subida_longitud

                    },


                    parada_bajada: {

                        id:
                            resultadoRuta.parada_bajada_id,

                        nombre:
                            resultadoRuta.parada_bajada,

                        latitud:
                            resultadoRuta.parada_bajada_latitud,

                        longitud:
                            resultadoRuta.parada_bajada_longitud

                    }

                },


                {

                    numero: 2,

                    ruta_id:
                        resultadoRuta.ruta2_id,

                    ruta:
                        resultadoRuta.ruta2_nombre,

                    color:
                        resultadoRuta.ruta2_color,


                    parada_subida: {

                        id:
                            resultadoRuta.parada_subida_2_id,

                        nombre:
                            resultadoRuta.parada_subida_2,

                        latitud:
                            resultadoRuta.parada_subida_2_latitud,

                        longitud:
                            resultadoRuta.parada_subida_2_longitud

                    },


                    parada_bajada: {

                        id:
                            resultadoRuta.parada_bajada_id,

                        nombre:
                            resultadoRuta.parada_bajada,

                        latitud:
                            resultadoRuta.parada_bajada_latitud,

                        longitud:
                            resultadoRuta.parada_bajada_longitud

                    }

                }

            ]

        });

    } catch (err) {

        console.error(
            "================================="
        );

        console.error(
            "ERROR BUSCANDO RUTA"
        );

        console.error(
            "Mensaje:",
            err.message
        );

        console.error(
            "Código:",
            err.code
        );

        console.error(
            "Detalle:",
            err.detail
        );

        console.error(
            "Hint:",
            err.hint
        );

        console.error(
            "Stack:",
            err.stack
        );

        console.error(
            "================================="
        );


        return res.status(500).json({

            error:
                "Error interno al buscar la ruta.",

            detalle:
                err.message

        });

    }

});


module.exports = router;

