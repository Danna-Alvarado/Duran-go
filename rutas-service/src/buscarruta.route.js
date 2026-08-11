const express = require("express");
const router = express.Router();
const pool = require("./db");

/*
====================================================
DISTANCIA ENTRE DOS COORDENADAS
====================================================
*/

function distancia(lat1, lng1, lat2, lng2) {

    const R = 6371000;

    const dLat =
        (lat2 - lat1) * Math.PI / 180;

    const dLng =
        (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    return (
        R *
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )
    );
}


/*
====================================================
CONFIGURACIÓN
====================================================
*/

const RADIO = 800;

// Máximo de camiones que puede recomendar.
// Si después quieres 5, simplemente cambia esto.
const MAX_CAMIONES = 4;


/*
====================================================
BUSCAR RUTA
====================================================
*/

router.post("/buscar-ruta", async (req, res) => {

    try {

        const {
            origenLat,
            origenLng,
            destinoLat,
            destinoLng
        } = req.body;


        /*
        ================================================
        VALIDACIÓN
        ================================================
        */

        if (
            origenLat == null ||
            origenLng == null ||
            destinoLat == null ||
            destinoLng == null
        ) {

            return res.status(400).json({
                error:
                    "Se requieren las coordenadas de origen y destino"
            });

        }


        /*
        ================================================
        OBTENER PARADAS
        ================================================
        */

        const paradasResult = await pool.query(`
            SELECT
                id,
                nombre_parada,
                latitud,
                longitud
            FROM paradas
        `);


        const paradas =
            paradasResult.rows.map(p => ({

                id:
                    Number(p.id),

                nombre:
                    p.nombre_parada,

                latitud:
                    Number(p.latitud),

                longitud:
                    Number(p.longitud)

            }));


        /*
        ================================================
        DISTANCIAS ORIGEN / DESTINO
        ================================================
        */

        const paradasCalculadas =
            paradas.map(p => ({

                ...p,

                distanciaOrigen:
                    distancia(
                        origenLat,
                        origenLng,
                        p.latitud,
                        p.longitud
                    ),

                distanciaDestino:
                    distancia(
                        destinoLat,
                        destinoLng,
                        p.latitud,
                        p.longitud
                    )

            }));


        /*
        ================================================
        PARADAS CERCA DEL ORIGEN
        ================================================
        */

        const paradasOrigen =
            paradasCalculadas
                .filter(
                    p =>
                        p.distanciaOrigen <= RADIO
                )
                .sort(
                    (a, b) =>
                        a.distanciaOrigen -
                        b.distanciaOrigen
                );


        /*
        ================================================
        PARADAS CERCA DEL DESTINO
        ================================================
        */

        const paradasDestino =
            paradasCalculadas
                .filter(
                    p =>
                        p.distanciaDestino <= RADIO
                )
                .sort(
                    (a, b) =>
                        a.distanciaDestino -
                        b.distanciaDestino
                );


        console.log(
            "================================"
        );

        console.log(
            "PARADAS CERCA DEL ORIGEN:",
            paradasOrigen.length
        );

        console.log(
            "PARADAS CERCA DEL DESTINO:",
            paradasDestino.length
        );


        /*
        ================================================
        SI NO HAY PARADA CERCA
        ================================================
        */

        if (
            paradasOrigen.length === 0 ||
            paradasDestino.length === 0
        ) {

            return res.json({

                tipo:
                    "SIN_RUTA",

                cantidad_camiones:
                    0,

                mensaje:
                    "No hay paradas dentro de 800 metros del origen o destino.",

                rutas:
                    []

            });

        }


        /*
        ================================================
        OBTENER RUTAS Y PARADAS
        ================================================
        */

        const relacionesResult =
            await pool.query(`

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
        ================================================
        AGRUPAR RUTAS
        ================================================
        */

        const rutas =
            new Map();


        for (
            const row
            of relacionesResult.rows
        ) {

            const rutaId =
                Number(row.ruta_id);


            if (
                !rutas.has(rutaId)
            ) {

                rutas.set(
                    rutaId,
                    {

                        id:
                            rutaId,

                        nombre:
                            row.ruta_nombre,

                        color:
                            row.ruta_color,

                        paradas:
                            []

                    }
                );

            }


            rutas
                .get(rutaId)
                .paradas
                .push({

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
            "RUTAS DISPONIBLES:",
            rutas.size
        );


        /*
        =================================================
        FUNCIONES AUXILIARES
        =================================================
        */


        // ¿La parada está cerca del origen?
        function cercaOrigen(parada) {

            return paradasOrigen.some(
                p =>
                    p.id === parada.id
            );

        }


        // ¿La parada está cerca del destino?
        function cercaDestino(parada) {

            return paradasDestino.some(
                p =>
                    p.id === parada.id
            );

        }


        /*
        =================================================
        BUSCAR CONEXIONES ENTRE RUTAS
        =================================================
        */

        function conexiones(
            paradaActual,
            rutaActualId
        ) {

            const resultado = [];


            for (
                const ruta
                of rutas.values()
            ) {

                if (
                    ruta.id ===
                    rutaActualId
                ) {
                    continue;
                }


                for (
                    const parada
                    of ruta.paradas
                ) {

                    const d =
                        distancia(
                            paradaActual.latitud,
                            paradaActual.longitud,
                            parada.latitud,
                            parada.longitud
                        );


                    if (
                        d <= RADIO
                    ) {

                        resultado.push({

                            ruta,

                            parada,

                            distancia:
                                d

                        });

                    }

                }

            }


            return resultado;

        }


        /*
        =================================================
        ESTADO INICIAL
        =================================================

        Desde el origen podemos subir a cualquier ruta
        que tenga una parada a <= 800 metros.
        =================================================
        */

        const estadosIniciales = [];


        for (
            const ruta
            of rutas.values()
        ) {

            for (
                const parada
                of ruta.paradas
            ) {

                const origen =
                    paradasOrigen.find(
                        p =>
                            p.id ===
                            parada.id
                    );


                if (!origen) {
                    continue;
                }


                estadosIniciales.push({

                    ruta,

                    parada,

                    costo:
                        origen.distanciaOrigen,

                    caminataInicial:
                        origen.distanciaOrigen,

                    caminataTransbordos:
                        0,

                    camiones:
                        1,

                    recorrido: [

                        {

                            ruta,

                            paradaSubida:
                                parada,

                            paradaBajada:
                                null

                        }

                    ]

                });

            }

        }


        /*
        =================================================
        ORDENAR INICIALES
        =================================================
        */

        estadosIniciales.sort(
            (a, b) =>
                a.costo -
                b.costo
        );


        /*
        =================================================
        BÚSQUEDA
        =================================================

        Es una búsqueda tipo BFS/Dijkstra sencilla.

        Cada estado representa:

        RUTA ACTUAL
        +
        PARADA ACTUAL
        +
        RECORRIDO
        =================================================
        */

        const cola =
            [...estadosIniciales];


        const visitados =
            new Set();


        let mejorRuta =
            null;


        while (
            cola.length > 0
        ) {

            /*
            ---------------------------------------------
            SACAR ESTADO MÁS BARATO
            ---------------------------------------------
            */

            cola.sort(
                (a, b) =>
                    a.costo -
                    b.costo
            );


            const estado =
                cola.shift();


            /*
            ---------------------------------------------
            CLAVE PARA EVITAR CICLOS
            ---------------------------------------------
            */

            const clave =
                `${estado.ruta.id}-${estado.parada.id}-${estado.camiones}`;


            if (
                visitados.has(clave)
            ) {
                continue;
            }


            visitados.add(clave);


            /*
            ---------------------------------------------
            ¿YA LLEGAMOS AL DESTINO?
            ---------------------------------------------
            */

            if (
                cercaDestino(
                    estado.parada
                )
            ) {

                const destino =
                    paradasDestino.find(
                        p =>
                            p.id ===
                            estado.parada.id
                    );


                const costoFinal =
                    estado.costo +
                    (
                        destino
                            ? destino.distanciaDestino
                            : 0
                    );


                mejorRuta = {

                    ...estado,

                    costo:
                        costoFinal

                };


                break;

            }


            /*
            ---------------------------------------------
            RECORRER LA RUTA HACIA ADELANTE
            ---------------------------------------------

            MUY IMPORTANTE:

            solamente podemos avanzar a una parada
            cuyo orden sea mayor.
            ---------------------------------------------
            */

            const siguientes =
                estado.ruta.paradas.filter(
                    p =>
                        p.orden >
                        estado.parada.orden
                );


            for (
                const siguiente
                of siguientes
            ) {

                /*
                -----------------------------------------
                CONTINUAR EN EL MISMO CAMIÓN
                -----------------------------------------
                */

                const recorridoNuevo =
                    estado.recorrido.map(
                        r =>
                            ({
                                ...r
                            })
                    );


                recorridoNuevo[
                    recorridoNuevo.length - 1
                ] = {

                    ...recorridoNuevo[
                        recorridoNuevo.length - 1
                    ],

                    paradaBajada:
                        siguiente

                };


                cola.push({

                    ruta:
                        estado.ruta,

                    parada:
                        siguiente,

                    costo:
                        estado.costo,

                    caminataInicial:
                        estado.caminataInicial,

                    caminataTransbordos:
                        estado.caminataTransbordos,

                    camiones:
                        estado.camiones,

                    recorrido:
                        recorridoNuevo

                });


                /*
                -----------------------------------------
                SI DESDE AQUÍ PODEMOS CAMBIAR
                DE CAMIÓN
                -----------------------------------------
                */

                if (
                    estado.camiones >=
                    MAX_CAMIONES
                ) {
                    continue;
                }


                const cambios =
                    conexiones(
                        siguiente,
                        estado.ruta.id
                    );


                for (
                    const cambio
                    of cambios
                ) {

                    /*
                    -------------------------------------
                    NO CAMBIAR A UNA RUTA SI NO PUEDE
                    AVANZAR DESDE ESA PARADA
                    -------------------------------------
                    */

                    const puedeContinuar =
                        cambio.ruta.paradas.some(
                            p =>
                                p.orden >
                                cambio.parada.orden
                        );


                    if (
                        !puedeContinuar
                    ) {
                        continue;
                    }


                    /*
                    -------------------------------------
                    CREAR NUEVO TRAMO
                    -------------------------------------
                    */

                    const nuevoRecorrido =
                        recorridoNuevo.map(
                            r =>
                                ({
                                    ...r
                                })
                        );


                    nuevoRecorrido.push({

                        ruta:
                            cambio.ruta,

                        paradaSubida:
                            cambio.parada,

                        paradaBajada:
                            null

                    });


                    cola.push({

                        ruta:
                            cambio.ruta,

                        parada:
                            cambio.parada,

                        costo:
                            estado.costo +
                            cambio.distancia,

                        caminataInicial:
                            estado.caminataInicial,

                        caminataTransbordos:
                            estado.caminataTransbordos +
                            cambio.distancia,

                        camiones:
                            estado.camiones + 1,

                        recorrido:
                            nuevoRecorrido

                    });

                }

            }

        }


        /*
        =================================================
        NO ENCONTRAMOS RUTA
        =================================================
        */

        if (
            !mejorRuta
        ) {

            return res.json({

                tipo:
                    "SIN_RUTA",

                cantidad_camiones:
                    0,

                mensaje:
                    "No se encontró una ruta dentro del radio de 800 metros.",

                paradas_cercanas_origen:
                    paradasOrigen.length,

                paradas_cercanas_destino:
                    paradasDestino.length,

                rutas:
                    []

            });

        }


        /*
        =================================================
        CONSTRUIR RESPUESTA
        =================================================
        */

        const rutasRespuesta =
            mejorRuta.recorrido.map(
                (tramo, index) => ({

                    numero:
                        index + 1,

                    ruta_id:
                        tramo.ruta.id,

                    ruta:
                        tramo.ruta.nombre,

                    color:
                        tramo.ruta.color,


                    parada_subida: {

                        id:
                            tramo.paradaSubida.id,

                        nombre:
                            tramo.paradaSubida.nombre,

                        latitud:
                            tramo.paradaSubida.latitud,

                        longitud:
                            tramo.paradaSubida.longitud

                    },


                    parada_bajada:
                        tramo.paradaBajada
                            ? {

                                id:
                                    tramo.paradaBajada.id,

                                nombre:
                                    tramo.paradaBajada.nombre,

                                latitud:
                                    tramo.paradaBajada.latitud,

                                longitud:
                                    tramo.paradaBajada.longitud

                            }
                            : null

                })
            );


        /*
        =================================================
        RESULTADO FINAL
        =================================================
        */

        console.log(
            "================================"
        );

        console.log(
            "RUTA ENCONTRADA"
        );

        console.log(
            "CAMIONES:",
            rutasRespuesta.length
        );

        console.log(
            rutasRespuesta
        );


        return res.json({

            tipo:
                rutasRespuesta.length === 1
                    ? "DIRECTA"
                    : "TRANSBORDO",

            cantidad_camiones:
                rutasRespuesta.length,

            radio_busqueda_metros:
                RADIO,

            rutas:
                rutasRespuesta

        });


    } catch (error) {

        console.error(
            "================================"
        );

        console.error(
            "ERROR BUSCANDO RUTA"
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


module.exports = router;