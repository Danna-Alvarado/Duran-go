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
                error: "Faltan coordenadas"
            });
        }

        const RADIO_ORIGEN = 1000;
        const RADIO_DESTINO = 1000;
        const RADIO_TRANSBORDO = 600;


        /*
        ============================================
        PARADAS
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
            id: Number(p.id),
            nombre: p.nombre_parada,
            latitud: Number(p.latitud),
            longitud: Number(p.longitud)
        }));


        /*
        ============================================
        DISTANCIAS
        ============================================
        */

        const paradasCalculadas = paradas.map(p => ({
            ...p,

            distanciaOrigen: distancia(
                origenLat,
                origenLng,
                p.latitud,
                p.longitud
            ),

            distanciaDestino: distancia(
                destinoLat,
                destinoLng,
                p.latitud,
                p.longitud
            )
        }));


        const paradasOrigen =
            paradasCalculadas
                .filter(p =>
                    p.distanciaOrigen <= RADIO_ORIGEN
                )
                .sort(
                    (a, b) =>
                        a.distanciaOrigen -
                        b.distanciaOrigen
                );


        const paradasDestino =
            paradasCalculadas
                .filter(p =>
                    p.distanciaDestino <= RADIO_DESTINO
                )
                .sort(
                    (a, b) =>
                        a.distanciaDestino -
                        b.distanciaDestino
                );


        console.log(
            "=============================="
        );

        console.log(
            "PARADAS ORIGEN:"
        );

        console.table(
            paradasOrigen
        );

        console.log(
            "PARADAS DESTINO:"
        );

        console.table(
            paradasDestino
        );


        if (
            paradasOrigen.length === 0 ||
            paradasDestino.length === 0
        ) {

            return res.status(404).json({

                mensaje:
                    "No existen paradas cercanas.",

                paradas_cercanas_origen:
                    paradasOrigen.length,

                paradas_cercanas_destino:
                    paradasDestino.length,

                rutas: []

            });

        }


        /*
        ============================================
        RUTAS Y PARADAS
        ============================================
        */

        const result = await pool.query(`
            SELECT
                r.id AS ruta_id,
                r.nombre AS ruta_nombre,
                r.color AS ruta_color,

                rp.parada_id,
                rp.orden,

                p.nombre_parada,
                p.latitud,
                p.longitud

            FROM rutas r

            INNER JOIN ruta_paradas rp
                ON rp.ruta_id = r.id

            INNER JOIN paradas p
                ON p.id = rp.parada_id

            ORDER BY
                r.id,
                rp.orden
        `);


        /*
        ============================================
        AGRUPAR RUTAS
        ============================================
        */

        const rutas = new Map();


        for (const row of result.rows) {

            const rutaId =
                Number(row.ruta_id);


            if (!rutas.has(rutaId)) {

                rutas.set(rutaId, {

                    id: rutaId,

                    nombre:
                        row.ruta_nombre,

                    color:
                        row.ruta_color,

                    paradas: []

                });

            }


            rutas.get(rutaId).paradas.push({

                id:
                    Number(row.parada_id),

                nombre:
                    row.nombre_parada,

                latitud:
                    Number(row.latitud),

                longitud:
                    Number(row.longitud),

                orden:
                    Number(row.orden)

            });

        }


        console.log(
            "RUTAS CARGADAS:",
            rutas.size
        );


        /*
        ============================================
        RUTA DIRECTA
        ============================================
        */

        const directas = [];


        for (const ruta of rutas.values()) {

            const subidas =
                ruta.paradas.filter(p =>
                    paradasOrigen.some(
                        o => o.id === p.id
                    )
                );


            const bajadas =
                ruta.paradas.filter(p =>
                    paradasDestino.some(
                        d => d.id === p.id
                    )
                );


            for (const subida of subidas) {

                for (const bajada of bajadas) {

                    if (
                        subida.orden >=
                        bajada.orden
                    ) {
                        continue;
                    }


                    const origen =
                        paradasOrigen.find(
                            o =>
                                o.id ===
                                subida.id
                        );


                    const destino =
                        paradasDestino.find(
                            d =>
                                d.id ===
                                bajada.id
                        );


                    directas.push({

                        ruta,

                        subida,

                        bajada,

                        costo:
                            origen.distanciaOrigen +
                            destino.distanciaDestino

                    });

                }

            }

        }


        console.log(
            "RUTAS DIRECTAS ENCONTRADAS:",
            directas.length
        );


        if (directas.length > 0) {

            directas.sort(
                (a, b) =>
                    a.costo -
                    b.costo
            );


            const mejor =
                directas[0];


            return res.json({

                tipo:
                    "DIRECTA",

                cantidad_camiones:
                    1,

                rutas: [

                    {

                        numero:
                            1,

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
        TRANSBORDOS
        ============================================
        */

        const transbordos = [];


        for (const ruta1 of rutas.values()) {

            const subidas =
                ruta1.paradas.filter(p =>
                    paradasOrigen.some(
                        o => o.id === p.id
                    )
                );


            for (const subida of subidas) {

                const paradasPosteriores =
                    ruta1.paradas.filter(
                        p =>
                            p.orden >
                            subida.orden
                    );


                for (
                    const bajada1
                    of paradasPosteriores
                ) {


                    for (
                        const ruta2
                        of rutas.values()
                    ) {

                        if (
                            ruta1.id ===
                            ruta2.id
                        ) {
                            continue;
                        }


                        const subidas2 =
                            ruta2.paradas.filter(
                                p =>

                                    p.orden <
                                    ruta2.paradas.length
                            );


                        for (
                            const subida2
                            of subidas2
                        ) {


                            const distanciaCambio =
                                distancia(

                                    bajada1.latitud,

                                    bajada1.longitud,

                                    subida2.latitud,

                                    subida2.longitud

                                );


                            if (
                                distanciaCambio >
                                RADIO_TRANSBORDO
                            ) {
                                continue;
                            }


                            const bajadas2 =
                                ruta2.paradas.filter(
                                    p =>

                                        p.orden >
                                        subida2.orden &&

                                        paradasDestino.some(
                                            d =>
                                                d.id ===
                                                p.id
                                        )
                                );


                            for (
                                const bajada2
                                of bajadas2
                            ) {

                                const origen =
                                    paradasOrigen.find(
                                        o =>
                                            o.id ===
                                            subida.id
                                    );


                                const destino =
                                    paradasDestino.find(
                                        d =>
                                            d.id ===
                                            bajada2.id
                                    );


                                transbordos.push({

                                    ruta1,

                                    subida,

                                    bajada1,

                                    ruta2,

                                    subida2,

                                    bajada2,

                                    distanciaCambio,

                                    costo:

                                        origen.distanciaOrigen +

                                        distanciaCambio +

                                        destino.distanciaDestino

                                });

                            }

                        }

                    }

                }

            }

        }


        console.log(
            "TRANSBORDOS ENCONTRADOS:",
            transbordos.length
        );


        if (
            transbordos.length === 0
        ) {

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


        transbordos.sort(
            (a, b) =>
                a.costo -
                b.costo
        );


        const mejor =
            transbordos[0];


        return res.json({

            tipo:
                "TRANSBORDO",

            cantidad_camiones:
                2,

            rutas: [

                {

                    numero:
                        1,

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
                            mejor.bajada1.id,

                        nombre:
                            mejor.bajada1.nombre,

                        latitud:
                            mejor.bajada1.latitud,

                        longitud:
                            mejor.bajada1.longitud

                    }

                },


                {

                    numero:
                        2,

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
                            mejor.bajada2.id,

                        nombre:
                            mejor.bajada2.nombre,

                        latitud:
                            mejor.bajada2.latitud,

                        longitud:
                            mejor.bajada2.longitud

                    }

                }

            ]

        });

    } catch (error) {

        console.error(
            "ERROR BUSCANDO RUTA:"
        );

        console.error(error);

        return res.status(500).json({

            error:
                "Error interno al buscar ruta.",

            detalle:
                error.message

        });

    }

});

router.get("/debug-rutas", async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT
                r.id AS ruta_id,
                r.nombre AS ruta,
                r.color,

                rp.orden,

                p.id AS parada_id,
                p.nombre_parada,
                p.latitud,
                p.longitud

            FROM rutas r

            INNER JOIN ruta_paradas rp
                ON rp.ruta_id = r.id

            INNER JOIN paradas p
                ON p.id = rp.parada_id

            ORDER BY
                r.id,
                rp.orden
        `);

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: error.message
        });

    }

});

module.exports = router;