const express = require("express");
const router = express.Router();
const pool = require("./db");

function distancia(lat1, lng1, lat2, lng2) {
    const R = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    return R * 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );
}

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

        /*
        ============================================
        CONFIGURACIÓN
        ============================================
        */

        const RADIO_ORIGEN = 1000;
        const RADIO_DESTINO = 1000;
        const RADIO_TRANSBORDO = 500;


        /*
        ============================================
        OBTENER TODAS LAS PARADAS
        ============================================
        */

        const paradasResult = await pool.query(`
            SELECT
                id,
                nombre_parada,
                latitud,
                longitud
            FROM paradas
        `);

        const paradas = paradasResult.rows.map(p => ({
            id: p.id,
            nombre: p.nombre_parada,
            latitud: Number(p.latitud),
            longitud: Number(p.longitud)
        }));


        /*
        ============================================
        CALCULAR DISTANCIA DE CADA PARADA
        ============================================
        */

        const paradasCalculadas = paradas.map(parada => {

            const distanciaOrigen = distancia(
                origenLat,
                origenLng,
                parada.latitud,
                parada.longitud
            );

            const distanciaDestino = distancia(
                destinoLat,
                destinoLng,
                parada.latitud,
                parada.longitud
            );

            return {
                ...parada,
                distanciaOrigen,
                distanciaDestino
            };

        });


        /*
        ============================================
        PARADAS CERCANAS
        ============================================
        */

        const paradasOrigen = paradasCalculadas
            .filter(p => p.distanciaOrigen <= RADIO_ORIGEN)
            .sort((a, b) =>
                a.distanciaOrigen - b.distanciaOrigen
            );

        const paradasDestino = paradasCalculadas
            .filter(p => p.distanciaDestino <= RADIO_DESTINO)
            .sort((a, b) =>
                a.distanciaDestino - b.distanciaDestino
            );


        console.log(
            "Paradas cercanas al origen:",
            paradasOrigen.length
        );

        console.log(
            "Paradas cercanas al destino:",
            paradasDestino.length
        );


        if (
            paradasOrigen.length === 0 ||
            paradasDestino.length === 0
        ) {

            return res.status(404).json({

                mensaje:
                    "No existen paradas suficientemente cercanas al origen o destino.",

                origen: {
                    lat: origenLat,
                    lng: origenLng
                },

                destino: {
                    lat: destinoLat,
                    lng: destinoLng
                },

                paradas_cercanas_origen:
                    paradasOrigen.length,

                paradas_cercanas_destino:
                    paradasDestino.length,

                rutas: []

            });

        }


        /*
        ============================================
        OBTENER RELACIONES RUTA - PARADA
        ============================================
        */

        const relacionesResult = await pool.query(`
            SELECT
                rp.ruta_id,
                rp.parada_id,
                rp.orden,
                r.nombre AS ruta_nombre,
                r.color AS ruta_color
            FROM ruta_paradas rp
            INNER JOIN rutas r
                ON r.id = rp.ruta_id
            ORDER BY
                rp.ruta_id,
                rp.orden
        `);

        const relaciones = relacionesResult.rows;


        /*
        ============================================
        CREAR MAPA DE PARADAS
        ============================================
        */

        const mapaParadas = new Map();

        for (const parada of paradasCalculadas) {
            mapaParadas.set(
                Number(parada.id),
                parada
            );
        }


        /*
        ============================================
        AGRUPAR PARADAS POR RUTA
        ============================================
        */

        const rutas = new Map();

        for (const relacion of relaciones) {

            const rutaId = Number(relacion.ruta_id);

            if (!rutas.has(rutaId)) {

                rutas.set(rutaId, {
                    id: rutaId,
                    nombre: relacion.ruta_nombre,
                    color: relacion.ruta_color,
                    paradas: []
                });

            }

            const parada = mapaParadas.get(
                Number(relacion.parada_id)
            );

            if (!parada) {
                continue;
            }

            rutas.get(rutaId).paradas.push({
                ...parada,
                orden: Number(relacion.orden)
            });

        }


        /*
        ============================================
        BUSCAR RUTA DIRECTA
        ============================================
        */

        const rutasDirectas = [];


        for (const ruta of rutas.values()) {

            const subidas = ruta.paradas.filter(parada =>
                paradasOrigen.some(
                    origen =>
                        origen.id === parada.id
                )
            );

            const bajadas = ruta.paradas.filter(parada =>
                paradasDestino.some(
                    destino =>
                        destino.id === parada.id
                )
            );


            for (const subida of subidas) {

                for (const bajada of bajadas) {

                    if (
                        subida.orden >= bajada.orden
                    ) {
                        continue;
                    }


                    const distanciaOrigen =
                        subida.distanciaOrigen;

                    const distanciaDestino =
                        bajada.distanciaDestino;


                    rutasDirectas.push({

                        tipo: "DIRECTA",

                        ruta,

                        subida,

                        bajada,

                        distanciaTotal:
                            distanciaOrigen +
                            distanciaDestino

                    });

                }

            }

        }


        /*
        ============================================
        SI EXISTE DIRECTA
        ============================================
        */

        if (rutasDirectas.length > 0) {

            rutasDirectas.sort(
                (a, b) =>
                    a.distanciaTotal -
                    b.distanciaTotal
            );

            const mejor =
                rutasDirectas[0];


            return res.json({

                tipo: "DIRECTA",

                cantidad_camiones: 1,

                rutas: [

                    {

                        numero: 1,

                        ruta_id:
                            mejor.ruta.id,

                        ruta:
                            mejor.ruta.nombre,

                        color:
                            mejor.ruta.color,

                        parada_subida: {

                            id:
                                mejor.subida.id,

                            nombre:
                                mejor.subida.nombre,

                            latitud:
                                mejor.subida.latitud,

                            longitud:
                                mejor.subida.longitud

                        },

                        parada_bajada: {

                            id:
                                mejor.bajada.id,

                            nombre:
                                mejor.bajada.nombre,

                            latitud:
                                mejor.bajada.latitud,

                            longitud:
                                mejor.bajada.longitud

                        }

                    }

                ]

            });

        }


        /*
        ============================================
        BUSCAR TRANSBORDOS
        ============================================
        */

        const combinaciones = [];


        for (const ruta1 of rutas.values()) {

            const subidas = ruta1.paradas.filter(
                parada =>
                    paradasOrigen.some(
                        origen =>
                            origen.id === parada.id
                    )
            );


            for (const subida of subidas) {

                for (const transbordo of ruta1.paradas) {

                    if (
                        transbordo.orden <=
                        subida.orden
                    ) {
                        continue;
                    }


                    for (const ruta2 of rutas.values()) {

                        if (
                            ruta1.id ===
                            ruta2.id
                        ) {
                            continue;
                        }


                        const posiblesSubidas =
                            ruta2.paradas.filter(
                                parada =>
                                    parada.orden <
                                    Math.max(
                                        ...ruta2.paradas.map(
                                            p => p.orden
                                        )
                                    )
                            );


                        for (
                            const subida2
                            of posiblesSubidas
                        ) {

                            const distanciaTransbordo =
                                distancia(
                                    transbordo.latitud,
                                    transbordo.longitud,
                                    subida2.latitud,
                                    subida2.longitud
                                );


                            if (
                                distanciaTransbordo >
                                RADIO_TRANSBORDO
                            ) {
                                continue;
                            }


                            const bajadas =
                                ruta2.paradas.filter(
                                    parada =>

                                        parada.orden >
                                        subida2.orden &&

                                        paradasDestino.some(
                                            destino =>
                                                destino.id ===
                                                parada.id
                                        )
                                );


                            for (
                                const bajada
                                of bajadas
                            ) {

                                const distanciaTotal =

                                    subida.distanciaOrigen +

                                    distanciaTransbordo +

                                    bajada.distanciaDestino;


                                combinaciones.push({

                                    ruta1,

                                    subida,

                                    transbordo,

                                    ruta2,

                                    subida2,

                                    bajada,

                                    distanciaTransbordo,

                                    distanciaTotal

                                });

                            }

                        }

                    }

                }

            }

        }


        /*
        ============================================
        NO HAY RUTA
        ============================================
        */

        if (combinaciones.length === 0) {

            return res.status(404).json({

                mensaje:
                    "No se encontró una ruta directa ni una combinación de dos camiones.",

                paradas_cercanas_origen:
                    paradasOrigen.length,

                paradas_cercanas_destino:
                    paradasDestino.length,

                rutas: []

            });

        }


        /*
        ============================================
        MEJOR TRANSBORDO
        ============================================
        */

        combinaciones.sort(
            (a, b) =>
                a.distanciaTotal -
                b.distanciaTotal
        );


        const mejor =
            combinaciones[0];


        /*
        ============================================
        RESPUESTA
        ============================================
        */

        return res.json({

            tipo: "TRANSBORDO",

            cantidad_camiones: 2,

            rutas: [

                {

                    numero: 1,

                    ruta_id:
                        mejor.ruta1.id,

                    ruta:
                        mejor.ruta1.nombre,

                    color:
                        mejor.ruta1.color,

                    parada_subida: {

                        id:
                            mejor.subida.id,

                        nombre:
                            mejor.subida.nombre,

                        latitud:
                            mejor.subida.latitud,

                        longitud:
                            mejor.subida.longitud

                    },

                    parada_bajada: {

                        id:
                            mejor.transbordo.id,

                        nombre:
                            mejor.transbordo.nombre,

                        latitud:
                            mejor.transbordo.latitud,

                        longitud:
                            mejor.transbordo.longitud

                    }

                },

                {

                    numero: 2,

                    ruta_id:
                        mejor.ruta2.id,

                    ruta:
                        mejor.ruta2.nombre,

                    color:
                        mejor.ruta2.color,

                    parada_subida: {

                        id:
                            mejor.subida2.id,

                        nombre:
                            mejor.subida2.nombre,

                        latitud:
                            mejor.subida2.latitud,

                        longitud:
                            mejor.subida2.longitud

                    },

                    parada_bajada: {

                        id:
                            mejor.bajada.id,

                        nombre:
                            mejor.bajada.nombre,

                        latitud:
                            mejor.bajada.latitud,

                        longitud:
                            mejor.bajada.longitud

                    }

                }

            ]

        });

    } catch (error) {

        console.error(
            "================================"
        );

        console.error(
            "ERROR BUSCANDO RUTA"
        );

        console.error(
            error
        );

        console.error(
            "================================"
        );

        return res.status(500).json({

            error:
                "Error interno al buscar ruta.",

            detalle:
                error.message

        });

    }

});

module.exports = router;