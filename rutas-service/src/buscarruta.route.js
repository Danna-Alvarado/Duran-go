const express = require("express");
const router = express.Router();
const pool = require("./db");

const MAX_DISTANCIA_PARADA = 800;
const MAX_RESULTADOS = 3;

function distanciaMetros(lat1, lng1, lat2, lng2) {
const R = 6371000;
const rad = Math.PI / 180;


const dLat = (lat2 - lat1) * rad;
const dLng = (lng2 - lng1) * rad;

const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) ** 2;

return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));


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
        origenLat === undefined ||
        origenLng === undefined ||
        destinoLat === undefined ||
        destinoLng === undefined
    ) {
        return res.status(400).json({
            mensaje: "Faltan coordenadas"
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

    const [paradasResult, rutasResult, relacionesResult] =
        await Promise.all([
            pool.query(`
                SELECT
                    id,
                    nombre_parada,
                    latitud,
                    longitud
                FROM paradas
            `),

            pool.query(`
                SELECT
                    id,
                    nombre,
                    color
                FROM rutas
            `),

            pool.query(`
                SELECT
                    ruta_id,
                    parada_id,
                    orden
                FROM ruta_paradas
                ORDER BY ruta_id, orden
            `)
        ]);

    const paradas = paradasResult.rows;
    const rutas = rutasResult.rows;
    const relaciones = relacionesResult.rows;

    const mapaParadas = new Map();

    paradas.forEach(parada => {
        mapaParadas.set(Number(parada.id), {
            id: Number(parada.id),
            nombre: parada.nombre_parada,
            latitud: Number(parada.latitud),
            longitud: Number(parada.longitud)
        });
    });

    const mapaRutas = new Map();

    rutas.forEach(ruta => {
        mapaRutas.set(Number(ruta.id), {
            id: Number(ruta.id),
            nombre: ruta.nombre,
            color: ruta.color
        });
    });

    const rutasParadas = new Map();

    relaciones.forEach(relacion => {
        const rutaId = Number(relacion.ruta_id);
        const paradaId = Number(relacion.parada_id);

        const parada = mapaParadas.get(paradaId);

        if (!parada) {
            return;
        }

        if (!rutasParadas.has(rutaId)) {
            rutasParadas.set(rutaId, []);
        }

        rutasParadas.get(rutaId).push({
            ...parada,
            orden: Number(relacion.orden)
        });
    });

    const paradasOrigen = paradas
        .map(parada => {
            const lat = Number(parada.latitud);
            const lng = Number(parada.longitud);

            return {
                id: Number(parada.id),
                nombre: parada.nombre_parada,
                latitud: lat,
                longitud: lng,
                distancia: distanciaMetros(
                    origen.lat,
                    origen.lng,
                    lat,
                    lng
                )
            };
        })
        .filter(parada => parada.distancia <= MAX_DISTANCIA_PARADA)
        .sort((a, b) => a.distancia - b.distancia);

    const paradasDestino = paradas
        .map(parada => {
            const lat = Number(parada.latitud);
            const lng = Number(parada.longitud);

            return {
                id: Number(parada.id),
                nombre: parada.nombre_parada,
                latitud: lat,
                longitud: lng,
                distancia: distanciaMetros(
                    destino.lat,
                    destino.lng,
                    lat,
                    lng
                )
            };
        })
        .filter(parada => parada.distancia <= MAX_DISTANCIA_PARADA)
        .sort((a, b) => a.distancia - b.distancia);

    if (paradasOrigen.length === 0) {
        return res.json({
            cantidad_camiones: 0,
            rutas: [],
            mensaje: "No hay paradas a menos de 800 metros del origen",
            radio_busqueda_metros: 800,
            tipo: "origen"
        });
    }

    if (paradasDestino.length === 0) {
        return res.json({
            cantidad_camiones: 0,
            rutas: [],
            mensaje: "No hay paradas a menos de 800 metros del destino",
            radio_busqueda_metros: 800,
            tipo: "destino"
        });
    }

    function obtenerRutaParada(rutaId, paradaId) {
        const lista = rutasParadas.get(rutaId) || [];

        return lista.find(
            parada => parada.id === Number(paradaId)
        );
    }

    function obtenerRutasDeParada(paradaId) {
        const resultado = [];

        for (const [rutaId, lista] of rutasParadas) {
            const parada = lista.find(
                item => item.id === Number(paradaId)
            );

            if (parada) {
                resultado.push({
                    rutaId,
                    orden: parada.orden,
                    parada
                });
            }
        }

        return resultado;
    }

    function crearResultadoDirecto(
        rutaId,
        paradaOrigen,
        paradaDestino
    ) {
        const ruta = mapaRutas.get(rutaId);

        if (!ruta) {
            return null;
        }

        return {
            camiones: 1,
            distancia_caminata_origen: Math.round(
                paradaOrigen.distancia
            ),
            distancia_caminata_destino: Math.round(
                paradaDestino.distancia
            ),
            ruta_1: {
                ruta_id: ruta.id,
                nombre: ruta.nombre,
                color: ruta.color,
                parada_subida: paradaOrigen,
                parada_bajada: paradaDestino
            },
            transbordos: []
        };
    }

    function buscarDirectas() {
        const resultados = [];

        for (const paradaOrigen of paradasOrigen) {
            const rutasOrigen = obtenerRutasDeParada(
                paradaOrigen.id
            );

            for (const rutaOrigen of rutasOrigen) {
                for (const paradaDestino of paradasDestino) {
                    const destinoEnRuta = obtenerRutaParada(
                        rutaOrigen.rutaId,
                        paradaDestino.id
                    );

                    if (!destinoEnRuta) {
                        continue;
                    }

                    if (
                        rutaOrigen.orden <
                        destinoEnRuta.orden
                    ) {
                        const resultado = crearResultadoDirecto(
                            rutaOrigen.rutaId,
                            paradaOrigen,
                            paradaDestino
                        );

                        if (resultado) {
                            resultados.push(resultado);
                        }
                    }
                }
            }
        }

        return resultados;
    }

    function buscarDosCamiones() {
        const resultados = [];

        for (const paradaOrigen of paradasOrigen) {
            const rutasOrigen = obtenerRutasDeParada(
                paradaOrigen.id
            );

            for (const rutaA of rutasOrigen) {
                const listaA =
                    rutasParadas.get(rutaA.rutaId) || [];

                for (const paradaTransbordo of listaA) {
                    if (
                        paradaTransbordo.orden <=
                        rutaA.orden
                    ) {
                        continue;
                    }

                    const rutasB = obtenerRutasDeParada(
                        paradaTransbordo.id
                    );

                    for (const rutaB of rutasB) {
                        if (
                            rutaB.rutaId ===
                            rutaA.rutaId
                        ) {
                            continue;
                        }

                        for (const paradaDestino of paradasDestino) {
                            const destinoEnRuta =
                                obtenerRutaParada(
                                    rutaB.rutaId,
                                    paradaDestino.id
                                );

                            if (!destinoEnRuta) {
                                continue;
                            }

                            if (
                                rutaB.orden >=
                                destinoEnRuta.orden
                            ) {
                                continue;
                            }

                            const ruta1 =
                                mapaRutas.get(
                                    rutaA.rutaId
                                );

                            const ruta2 =
                                mapaRutas.get(
                                    rutaB.rutaId
                                );

                            if (!ruta1 || !ruta2) {
                                continue;
                            }

                            resultados.push({
                                camiones: 2,
                                distancia_caminata_origen:
                                    Math.round(
                                        paradaOrigen.distancia
                                    ),
                                distancia_caminata_destino:
                                    Math.round(
                                        paradaDestino.distancia
                                    ),
                                ruta_1: {
                                    ruta_id: ruta1.id,
                                    nombre: ruta1.nombre,
                                    color: ruta1.color,
                                    parada_subida:
                                        paradaOrigen,
                                    parada_bajada:
                                        paradaTransbordo
                                },
                                ruta_2: {
                                    ruta_id: ruta2.id,
                                    nombre: ruta2.nombre,
                                    color: ruta2.color,
                                    parada_subida:
                                        paradaTransbordo,
                                    parada_bajada:
                                        paradaDestino
                                },
                                transbordos: [
                                    {
                                        parada:
                                            paradaTransbordo
                                    }
                                ]
                            });
                        }
                    }
                }
            }
        }

        return resultados;
    }

    const directas = buscarDirectas();

    if (directas.length > 0) {
        directas.sort((a, b) => {
            const distanciaA =
                a.distancia_caminata_origen +
                a.distancia_caminata_destino;

            const distanciaB =
                b.distancia_caminata_origen +
                b.distancia_caminata_destino;

            return distanciaA - distanciaB;
        });

        return res.json({
            cantidad_camiones: 1,
            rutas: directas.slice(0, MAX_RESULTADOS),
            origen,
            destino
        });
    }

    const dosCamiones = buscarDosCamiones();

    if (dosCamiones.length > 0) {
        dosCamiones.sort((a, b) => {
            const distanciaA =
                a.distancia_caminata_origen +
                a.distancia_caminata_destino;

            const distanciaB =
                b.distancia_caminata_origen +
                b.distancia_caminata_destino;

            return distanciaA - distanciaB;
        });

        return res.json({
            cantidad_camiones: 2,
            rutas: dosCamiones.slice(0, MAX_RESULTADOS),
            origen,
            destino
        });
    }

    return res.json({
        cantidad_camiones: 0,
        rutas: [],
        mensaje: "No se encontraron rutas de 1 o 2 camiones",
        origen,
        destino
    });

} catch (error) {
    console.error("Error buscando ruta:", error);

    return res.status(500).json({
        mensaje: "Error interno buscando rutas",
        error: error.message
    });
}


});

module.exports = router;
