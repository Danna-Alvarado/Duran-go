const express = require("express");
const router = express.Router();
const pool = require("./db");

const RADIO = 800;
const MAX_CAMIONES = 4;

function distancia(lat1, lng1, lat2, lng2) {
    const R = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );
}

function compararRutas(a, b) {

    if (a.camiones !== b.camiones) {
        return a.camiones - b.camiones;
    }

    if (Math.abs(a.caminata - b.caminata) > 1) {
        return a.caminata - b.caminata;
    }

    if (Math.abs(a.distancia_final - b.distancia_final) > 1) {
        return a.distancia_final - b.distancia_final;
    }

    return a.recorrido - b.recorrido;
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
                mensaje: "Se requieren las coordenadas de origen y destino.",
                rutas: []
            });
        }

        const origen = {
            lat: Number(origenLat),
            lng: Number(origenLng)
        };

        const destino = {
            lat: Number(destinoLat),
            lng: Number(destinoLng)
        };

        if (
            !Number.isFinite(origen.lat) ||
            !Number.isFinite(origen.lng) ||
            !Number.isFinite(destino.lat) ||
            !Number.isFinite(destino.lng)
        ) {
            return res.status(400).json({
                mensaje: "Las coordenadas no son válidas.",
                rutas: []
            });
        }

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

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No existen rutas con paradas registradas.",
                rutas: []
            });
        }

        const filas = resultado.rows.map(row => ({
            ruta_id: Number(row.ruta_id),
            ruta: row.ruta,
            color: row.color,
            orden: Number(row.orden),
            parada_id: Number(row.parada_id),
            nombre: row.nombre_parada,
            lat: Number(row.latitud),
            lng: Number(row.longitud)
        }));

        const rutasMap = new Map();

        for (const parada of filas) {

            if (!rutasMap.has(parada.ruta_id)) {
                rutasMap.set(parada.ruta_id, {
                    ruta_id: parada.ruta_id,
                    ruta: parada.ruta,
                    color: parada.color,
                    paradas: []
                });
            }

            rutasMap
                .get(parada.ruta_id)
                .paradas
                .push(parada);
        }

        const rutas = Array.from(rutasMap.values());

        /*
        ==================================================
        PARADAS CERCANAS AL ORIGEN
        ==================================================
        */

        const paradasOrigen = [];

        for (const fila of filas) {

            const d = distancia(
                origen.lat,
                origen.lng,
                fila.lat,
                fila.lng
            );

            if (d <= RADIO) {

                paradasOrigen.push({
                    ...fila,
                    distancia_origen: d
                });

            }
        }

        /*
        ==================================================
        SI NO HAY PARADA CERCA DEL ORIGEN
        ==================================================
        */

        if (paradasOrigen.length === 0) {

            return res.status(404).json({
                mensaje: "No se encontró una parada cercana al origen.",
                radio_busqueda_metros: RADIO,
                tipo: "origen",
                rutas: []
            });
        }

        /*
        ==================================================
        FUNCIÓN PARA CONSTRUIR UNA RUTA
        ==================================================
        */

        function construirResultado(candidata) {

            return candidata.tramos.map((tramo, index) => {

                const salida = {
                    numero: index + 1,
                    ruta_id: tramo.ruta_id,
                    ruta: tramo.ruta,
                    color: tramo.color,

                    parada_subida: {
                        id: tramo.parada_subida.parada_id,
                        nombre: tramo.parada_subida.nombre,
                        latitud: tramo.parada_subida.lat,
                        longitud: tramo.parada_subida.lng
                    },

                    parada_bajada: {
                        id: tramo.parada_bajada.parada_id,
                        nombre: tramo.parada_bajada.nombre,
                        latitud: tramo.parada_bajada.lat,
                        longitud: tramo.parada_bajada.lng
                    }
                };

                return salida;
            });
        }

        /*
        ==================================================
        CANDIDATAS
        ==================================================
        */

        const candidatas = [];

        /*
        ==================================================
        BUSCAR TODAS LAS POSIBILIDADES
        ==================================================
        */

        function buscarDesde(
            rutaActual,
            paradaSubida,
            indiceSubida,
            tramos,
            rutasUsadas,
            caminata
        ) {

            /*
            ----------------------------------------------
            TODAS LAS PARADAS DESPUÉS DE LA SUBIDA
            ----------------------------------------------
            */

            for (
                let i = indiceSubida;
                i < rutaActual.paradas.length;
                i++
            ) {

                const paradaActual =
                    rutaActual.paradas[i];

                /*
                ------------------------------------------
                DISTANCIA DESDE ESTA PARADA AL DESTINO
                ------------------------------------------
                */

                const distanciaDestino = distancia(
                    paradaActual.lat,
                    paradaActual.lng,
                    destino.lat,
                    destino.lng
                );

                /*
                ------------------------------------------
                ESTA PARADA PUEDE SER DESTINO
                ------------------------------------------
                */

                if (distanciaDestino <= RADIO) {

                    const nuevaCandidata = {

                        camiones: tramos.length,

                        caminata:
                            caminata +
                            distanciaDestino,

                        distancia_final:
                            distanciaDestino,

                        recorrido:
                            i - indiceSubida,

                        tramos: [
                            ...tramos,
                            {
                                ruta_id: rutaActual.ruta_id,
                                ruta: rutaActual.ruta,
                                color: rutaActual.color,

                                parada_subida:
                                    paradaSubida,

                                parada_bajada:
                                    paradaActual
                            }
                        ]

                    };

                    candidatas.push(
                        nuevaCandidata
                    );

                }

                /*
                ------------------------------------------
                SI YA TENEMOS 4 CAMIONES NO BUSCAMOS MÁS
                ------------------------------------------
                */

                if (tramos.length >= MAX_CAMIONES) {
                    continue;
                }

                /*
                ------------------------------------------
                ESTA PARADA PUEDE SER TRANSBORDO
                ------------------------------------------
                */

                for (const siguienteRuta of rutas) {

                    if (
                        rutasUsadas.includes(
                            siguienteRuta.ruta_id
                        )
                    ) {
                        continue;
                    }


                    for (
                        let j = 0;
                        j < siguienteRuta.paradas.length;
                        j++
                    ) {

                        const siguienteParada =
                            siguienteRuta.paradas[j];

                        const distanciaTransbordo =
                            distancia(
                                paradaActual.lat,
                                paradaActual.lng,
                                siguienteParada.lat,
                                siguienteParada.lng
                            );

                        if (
                            distanciaTransbordo > RADIO
                        ) {
                            continue;
                        }

      

                        if (
                            siguienteParada.parada_id ===
                            paradaActual.parada_id
                        ) {
                            continue;
                        }

             
                        buscarDesde(
                            siguienteRuta,

                            siguienteParada,

                            j,

                            [
                                ...tramos,
                                {
                                    ruta_id:
                                        rutaActual.ruta_id,

                                    ruta:
                                        rutaActual.ruta,

                                    color:
                                        rutaActual.color,

                                    parada_subida:
                                        paradaSubida,

                                    parada_bajada:
                                        paradaActual
                                }
                            ],

                            [
                                ...rutasUsadas,
                                siguienteRuta.ruta_id
                            ],

                            caminata +
                            distanciaTransbordo
                        );

                    }

                }

            }

        }

        for (const inicio of paradasOrigen) {

            const rutaInicial =
                rutas.find(
                    r =>
                        r.ruta_id ===
                        inicio.ruta_id
                );

            if (!rutaInicial) {
                continue;
            }

            const indiceInicial =
                rutaInicial.paradas.findIndex(
                    p =>
                        p.parada_id ===
                        inicio.parada_id
                );

            if (indiceInicial === -1) {
                continue;
            }

            buscarDesde(

                rutaInicial,

                inicio,

                indiceInicial,

                [],

                [
                    rutaInicial.ruta_id
                ],

                inicio.distancia_origen

            );

        }



        if (candidatas.length === 0) {

            return res.status(404).json({

                mensaje:
                    "No se encontró una ruta directa ni una combinación de camiones.",

                radio_busqueda_metros:
                    RADIO,

                paradas_cercanas_origen:
                    paradasOrigen.length,

                rutas:
                    []

            });

        }



        const rutasUnicas = new Map();

        for (const candidata of candidatas) {

            const clave =
                candidata.tramos
                    .map(
                        t =>
                            `${t.ruta_id}-${t.parada_subida.parada_id}-${t.parada_bajada.parada_id}`
                    )
                    .join("|");

            if (
                !rutasUnicas.has(clave) ||
                compararRutas(
                    candidata,
                    rutasUnicas.get(clave)
                ) < 0
            ) {

                rutasUnicas.set(
                    clave,
                    candidata
                );

            }

        }

        const candidatasUnicas =
            Array.from(
                rutasUnicas.values()
            );

        /*
        ==================================================
        ORDENAR TODAS LAS RUTAS
        ==================================================
        */

        candidatasUnicas.sort(
            compararRutas
        );

        /*
        ==================================================
        MEJOR RUTA
        ==================================================
        */

        const mejorRuta =
            candidatasUnicas[0];

        const resultadoFinal =
            construirResultado(
                mejorRuta
            );

        /*
        ==================================================
        RESPUESTA
        ==================================================
        */

        return res.json({

            tipo:
                resultadoFinal.length === 1
                    ? "DIRECTA"
                    : "TRANSBORDO",

            cantidad_camiones:
                resultadoFinal.length,

            radio_busqueda_metros:
                RADIO,

            rutas:
                resultadoFinal

        });

    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "ERROR BUSCANDO RUTA"
        );

        console.error(
            error
        );

       

        return res.status(500).json({

            error:
                "Error interno al buscar la ruta.",

            detalle:
                error.message

        });

    }

});

module.exports = router;