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
        // RADIO MÁXIMO PARA BUSCAR PARADAS
        // ============================================

        // 800 metros = máximo que consideraremos
        // como distancia caminando aproximada.
        //
        // Puedes cambiarlo después a 500, 1000, etc.

        const radioMaximo = 800;

        // ============================================
        // BUSCAR RUTAS
        // ============================================

        const resultado = await pool.query(
            `
            WITH paradas_distancias AS (

                SELECT
                    p.id,
                    p.nombre_parada,
                    p.latitud,
                    p.longitud,

                    -- =================================
                    -- DISTANCIA AL ORIGEN
                    -- =================================

                    (
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
                        )
                    ) AS distancia_origen,

                    -- =================================
                    -- DISTANCIA AL DESTINO
                    -- =================================

                    (
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
                        )
                    ) AS distancia_destino

                FROM paradas p
            ),

            -- ============================================
            -- PARADAS CERCANAS AL ORIGEN
            -- ============================================

            paradas_origen AS (

                SELECT *
                FROM paradas_distancias
                WHERE distancia_origen <= $5
            ),

            -- ============================================
            -- PARADAS CERCANAS AL DESTINO
            -- ============================================

            paradas_destino AS (

                SELECT *
                FROM paradas_distancias
                WHERE distancia_destino <= $5
            ),

            -- ============================================
            -- POSIBLES RUTAS
            -- ============================================

            rutas_posibles AS (

                SELECT

                    r.id,
                    r.nombre,
                    r.color,

                    -- Parada donde sube
                    po.id AS parada_subida_id,
                    po.nombre_parada AS parada_subida,
                    po.latitud AS parada_subida_latitud,
                    po.longitud AS parada_subida_longitud,
                    po.distancia_origen,

                    -- Parada donde baja
                    pd.id AS parada_bajada_id,
                    pd.nombre_parada AS parada_bajada,
                    pd.latitud AS parada_bajada_latitud,
                    pd.longitud AS parada_bajada_longitud,
                    pd.distancia_destino,

                    -- Orden dentro de la ruta
                    rp1.orden AS orden_subida,
                    rp2.orden AS orden_bajada,

                    -- Distancia total caminando aproximada
                    (
                        po.distancia_origen
                        +
                        pd.distancia_destino
                    ) AS distancia_caminando_total

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

                    -- Evitamos que sea la misma parada
                    AND rp1.parada_id <> rp2.parada_id
            ),

            -- ============================================
            -- ELEGIR LA MEJOR OPCIÓN DE CADA RUTA
            -- ============================================

            mejores_rutas AS (

                SELECT
                    *,
                    ROW_NUMBER() OVER (
                        PARTITION BY id
                        ORDER BY distancia_caminando_total
                    ) AS posicion

                FROM rutas_posibles
            )

            -- ============================================
            -- RESULTADO FINAL
            -- ============================================

            SELECT

                id,
                nombre,
                color,

                parada_subida_id,
                parada_subida,
                parada_subida_latitud,
                parada_subida_longitud,

                ROUND(
                    distancia_origen::numeric,
                    2
                ) AS distancia_origen_metros,

                parada_bajada_id,
                parada_bajada,
                parada_bajada_latitud,
                parada_bajada_longitud,

                ROUND(
                    distancia_destino::numeric,
                    2
                ) AS distancia_destino_metros,

                orden_subida,
                orden_bajada,

                ROUND(
                    distancia_caminando_total::numeric,
                    2
                ) AS distancia_caminando_total_metros

            FROM mejores_rutas

            WHERE posicion = 1

            ORDER BY distancia_caminando_total

            LIMIT 5;
            `,

            [
                origenLat,
                origenLng,
                destinoLat,
                destinoLng,
                radioMaximo
            ]
        );

        // ============================================
        // SIN RUTAS
        // ============================================

        if (resultado.rows.length === 0) {

            return res.status(404).json({
                mensaje: "No se encontraron rutas cercanas",
                radio_busqueda_metros: radioMaximo,
                rutas: []
            });

        }

        // ============================================
        // RESPUESTA
        // ============================================

        res.json({
            cantidad: resultado.rows.length,
            radio_busqueda_metros: radioMaximo,
            rutas: resultado.rows
        });

    } catch (err) {

        console.error("Error buscando ruta:", err);

        next(err);
    }
});

module.exports = router;