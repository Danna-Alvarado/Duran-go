const express = require("express");
const router = express.Router();
const pool = require("./db");

const MAX_ORIGEN_PARADA = 800;
const MAX_TRANSBORDO = 500;
const MAX_DESTINO_PARADA = 800;
const MAX_RESULTADOS = 3;

function distanciaMetros(lat1, lng1, lat2, lng2) {
const R = 6371000;
const rad = Math.PI / 180;

```
const dLat = (lat2 - lat1) * rad;
const dLng = (lng2 - lng1) * rad;

const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) ** 2;

return R * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
);
```

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
            mensaje: "Faltan las coordenadas de origen o destino"
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
            mensaje: "Las coordenadas no son válidas"
        });
    }

    const [paradasResult, rutasResult, rutaParadasResult] =
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
    const relaciones = rutaParadasResult.rows;

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

    for (const lista of rutasParadas.values()) {
        lista.sort((a, b) => a.orden - b.orden);
    }

    const paradasCercanasOrigen = paradas
        .map(parada => {
            const p = mapaParadas.get(Number(parada.id));

            return {
                ...p,
                distancia: distanciaMetros(
                    origen.lat,
                    origen.lng,
                    p.latitud,
                    p.longitud
                )
            };
        })
        .filter(
            parada =>
                parada.distancia <= MAX_ORIGEN_PARADA
        )
        .sort(
            (a, b) =>
                a.distancia - b.distancia
        );

    const paradasCercanasDestino = paradas
        .map(parada => {
            const p = mapaParadas.get(Number(parada.id));

            return {
                ...p,
                distancia: distanciaMetros(
                    destino.lat,
                    destino.lng,
                    p.latitud,
                    p.longitud
                )
            };
        })
        .filter(
            parada =>
                parada.distancia <= MAX_DESTINO_PARADA
        )
        .sort(
            (a, b) =>
                a.distancia - b.distancia
        );

    if (paradasCercanasOrigen.length === 0) {
        return res.json({
            cantidad_camiones: 0,
            rutas: [],
            mensaje:
                "No hay paradas a menos de 800 metros del origen",
            tipo: "origen",
            radio_busqueda_metros: MAX_ORIGEN_PARADA
        });
    }

    if (paradasCercanasDestino.length === 0) {
        return res.json({
            cantidad_camiones: 0,
            rutas: [],
            mensaje:
                "No hay paradas a menos de 800 metros del destino",
            tipo: "destino",
            radio_busqueda_metros: MAX_DESTINO_PARADA
        });
    }

    function obtenerRutasDeParada(paradaId) {
        const resultado = [];

        for (const [rutaId, lista] of rutasParadas) {
            const parada = lista.find(
                item =>
                    item.id === Number(paradaId)
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

    function obtenerParadaEnRuta(rutaId, paradaId) {
        const lista =
            rutasParadas.get(rutaId) || [];

        return lista.find(
            parada =>
                parada.id === Number(paradaId)
        );
    }

    function obtenerParadasPosteriores(
        rutaId,
        orden
    ) {
        const lista =
            rutasParadas.get(rutaId) || [];

        return lista.filter(
            parada =>
                parada.orden > orden
        );
    }

    function distanciaEntreParadas(
        paradaA,
        paradaB
    ) {
        return distanciaMetros(
            paradaA.latitud,
            paradaA.longitud,
            paradaB.latitud,
            paradaB.longitud
        );
    }

    function crearRuta1(
        rutaId,
        subida,
        bajada
    ) {
        const ruta =
            mapaRutas.get(rutaId);

        if (!ruta) {
            return null;
        }

        return {
            ruta_id: ruta.id,
            nombre: ruta.nombre,
            color: ruta.color,
            parada_subida: {
                id: subida.id,
                nombre: subida.nombre,
                latitud: subida.latitud,
                longitud: subida.longitud,
                distancia_origen:
                    Math.round(
                        subida.distancia
                    )
            },
            parada_bajada: {
                id: bajada.id,
                nombre: bajada.nombre,
                latitud: bajada.latitud,
                longitud: bajada.longitud
            }
        };
    }

    function buscarUnaRuta() {
        const resultados = [];

        for (const subida of paradasCercanasOrigen) {
            const rutasSubida =
                obtenerRutasDeParada(
                    subida.id
                );

            for (const rutaSubida of rutasSubida) {
                for (
                    const destinoParada
                    of paradasCercanasDestino
                ) {
                    const bajada =
                        obtenerParadaEnRuta(
                            rutaSubida.rutaId,
                            destinoParada.id
                        );

                    if (!bajada) {
                        continue;
                    }

                    if (
                        bajada.orden <=
                        rutaSubida.orden
                    ) {
                        continue;
                    }

                    const ruta =
                        crearRuta1(
                            rutaSubida.rutaId,
                            subida,
                            {
                                ...destinoParada,
                                orden:
                                    bajada.orden
                            }
                        );

                    if (!ruta) {
                        continue;
                    }

                    ruta.parada_bajada = {
                        id: destinoParada.id,
                        nombre:
                            destinoParada.nombre,
                        latitud:
                            destinoParada.latitud,
                        longitud:
                            destinoParada.longitud,
                        distancia_destino:
                            Math.round(
                                destinoParada.distancia
                            )
                    };

                    resultados.push({
                        camiones: 1,
                        ruta_1: ruta,
                        transbordos: [],
                        distancia_total_caminando:
                            Math.round(
                                subida.distancia +
                                destinoParada.distancia
                            )
                    });
                }
            }
        }

        return resultados;
    }

    function buscarDosRutas() {
        const resultados = [];

        for (
            const subidaA
            of paradasCercanasOrigen
        ) {
            const rutasA =
                obtenerRutasDeParada(
                    subidaA.id
                );

            for (const rutaA of rutasA) {
                const paradasPosterioresA =
                    obtenerParadasPosteriores(
                        rutaA.rutaId,
                        rutaA.orden
                    );

                for (
                    const bajadaA
                    of paradasPosterioresA
                ) {
                    const rutasCercanas =
                        [];

                    for (
                        const posibleSubidaB
                        of mapaParadas.values()
                    ) {
                        const distancia =
                            distanciaEntreParadas(
                                bajadaA,
                                posibleSubidaB
                            );

                        if (
                            distancia <=
                            MAX_TRANSBORDO
                        ) {
                            rutasCercanas.push({
                                parada:
                                    posibleSubidaB,
                                distancia
                            });
                        }
                    }

                    for (
                        const conexion
                        of rutasCercanas
                    ) {
                        const rutasB =
                            obtenerRutasDeParada(
                                conexion.parada.id
                            );

                        for (
                            const rutaB
                            of rutasB
                        ) {
                            if (
                                rutaB.rutaId ===
                                rutaA.rutaId
                            ) {
                                continue;
                            }

                            for (
                                const destinoParada
                                of paradasCercanasDestino
                            ) {
                                const bajadaB =
                                    obtenerParadaEnRuta(
                                        rutaB.rutaId,
                                        destinoParada.id
                                    );

                                if (!bajadaB) {
                                    continue;
                                }

                                if (
                                    bajadaB.orden <=
                                    rutaB.orden
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

                                if (
                                    !ruta1 ||
                                    !ruta2
                                ) {
                                    continue;
                                }

                                resultados.push({
                                    camiones: 2,
                                    ruta_1: {
                                        ruta_id:
                                            ruta1.id,
                                        nombre:
                                            ruta1.nombre,
                                        color:
                                            ruta1.color,
                                        parada_subida:
                                            {
                                                id:
                                                    subidaA.id,
                                                nombre:
                                                    subidaA.nombre,
                                                latitud:
                                                    subidaA.latitud,
                                                longitud:
                                                    subidaA.longitud,
                                                distancia_origen:
                                                    Math.round(
                                                        subidaA.distancia
                                                    )
                                            },
                                        parada_bajada:
                                            {
                                                id:
                                                    bajadaA.id,
                                                nombre:
                                                    bajadaA.nombre,
                                                latitud:
                                                    bajadaA.latitud,
                                                longitud:
                                                    bajadaA.longitud
                                            }
                                    },
                                    ruta_2: {
                                        ruta_id:
                                            ruta2.id,
                                        nombre:
                                            ruta2.nombre,
                                        color:
                                            ruta2.color,
                                        parada_subida:
                                            {
                                                id:
                                                    conexion.parada.id,
                                                nombre:
                                                    conexion.parada.nombre,
                                                latitud:
                                                    conexion.parada.latitud,
                                                longitud:
                                                    conexion.parada.longitud,
                                                distancia_transbordo:
                                                    Math.round(
                                                        conexion.distancia
                                                    )
                                            },
                                        parada_bajada:
                                            {
                                                id:
                                                    destinoParada.id,
                                                nombre:
                                                    destinoParada.nombre,
                                                latitud:
                                                    destinoParada.latitud,
                                                longitud:
                                                    destinoParada.longitud,
                                                distancia_destino:
                                                    Math.round(
                                                        destinoParada.distancia
                                                    )
                                            }
                                    },
                                    transbordos: [
                                        {
                                            bajar_en:
                                                {
                                                    id:
                                                        bajadaA.id,
                                                    nombre:
                                                        bajadaA.nombre,
                                                    latitud:
                                                        bajadaA.latitud,
                                                    longitud:
                                                        bajadaA.longitud
                                                },
                                            subir_en:
                                                {
                                                    id:
                                                        conexion.parada.id,
                                                    nombre:
                                                        conexion.parada.nombre,
                                                    latitud:
                                                        conexion.parada.latitud,
                                                    longitud:
                                                        conexion.parada.longitud
                                                },
                                            distancia:
                                                Math.round(
                                                    conexion.distancia
                                                )
                                        }
                                    ],
                                    distancia_total_caminando:
                                        Math.round(
                                            subidaA.distancia +
                                            conexion.distancia +
                                            destinoParada.distancia
                                        )
                                });
                            }
                        }
                    }
                }
            }
        }

        return resultados;
    }

    function buscarTresRutas() {
        const resultados = [];

        for (
            const subidaA
            of paradasCercanasOrigen
        ) {
            const rutasA =
                obtenerRutasDeParada(
                    subidaA.id
                );

            for (const rutaA of rutasA) {
                const posterioresA =
                    obtenerParadasPosteriores(
                        rutaA.rutaId,
                        rutaA.orden
                    );

                for (
                    const bajadaA
                    of posterioresA
                ) {
                    for (
                        const subidaB
                        of mapaParadas.values()
                    ) {
                        const distanciaAB =
                            distanciaEntreParadas(
                                bajadaA,
                                subidaB
                            );

                        if (
                            distanciaAB >
                            MAX_TRANSBORDO
                        ) {
                            continue;
                        }

                        const rutasB =
                            obtenerRutasDeParada(
                                subidaB.id
                            );

                        for (
                            const rutaB
                            of rutasB
                        ) {
                            if (
                                rutaB.rutaId ===
                                rutaA.rutaId
                            ) {
                                continue;
                            }

                            const posterioresB =
                                obtenerParadasPosteriores(
                                    rutaB.rutaId,
                                    rutaB.orden
                                );

                            for (
                                const bajadaB
                                of posterioresB
                            ) {
                                for (
                                    const subidaC
                                    of mapaParadas.values()
                                ) {
                                    const distanciaBC =
                                        distanciaEntreParadas(
                                            bajadaB,
                                            subidaC
                                        );

                                    if (
                                        distanciaBC >
                                        MAX_TRANSBORDO
                                    ) {
                                        continue;
                                    }

                                    const rutasC =
                                        obtenerRutasDeParada(
                                            subidaC.id
                                        );

                                    for (
                                        const rutaC
                                        of rutasC
                                    ) {
                                        if (
                                            rutaC.rutaId ===
                                            rutaA.rutaId ||
                                            rutaC.rutaId ===
                                            rutaB.rutaId
                                        ) {
                                            continue;
                                        }

                                        for (
                                            const destinoParada
                                            of paradasCercanasDestino
                                        ) {
                                            const bajadaC =
                                                obtenerParadaEnRuta(
                                                    rutaC.rutaId,
                                                    destinoParada.id
                                                );

                                            if (!bajadaC) {
                                                continue;
                                            }

                                            if (
                                                bajadaC.orden <=
                                                rutaC.orden
                                            ) {
                                                continue;
                                            }

                                            const infoA =
                                                mapaRutas.get(
                                                    rutaA.rutaId
                                                );

                                            const infoB =
                                                mapaRutas.get(
                                                    rutaB.rutaId
                                                );

                                            const infoC =
                                                mapaRutas.get(
                                                    rutaC.rutaId
                                                );

                                            if (
                                                !infoA ||
                                                !infoB ||
                                                !infoC
                                            ) {
                                                continue;
                                            }

                                            resultados.push({
                                                camiones: 3,
                                                ruta_1: {
                                                    ruta_id:
                                                        infoA.id,
                                                    nombre:
                                                        infoA.nombre,
                                                    color:
                                                        infoA.color,
                                                    parada_subida:
                                                        {
                                                            id:
                                                                subidaA.id,
                                                            nombre:
                                                                subidaA.nombre,
                                                            latitud:
                                                                subidaA.latitud,
                                                            longitud:
                                                                subidaA.longitud,
                                                            distancia_origen:
                                                                Math.round(
                                                                    subidaA.distancia
                                                                )
                                                        },
                                                    parada_bajada:
                                                        {
                                                            id:
                                                                bajadaA.id,
                                                            nombre:
                                                                bajadaA.nombre,
                                                            latitud:
                                                                bajadaA.latitud,
                                                            longitud:
                                                                bajadaA.longitud
                                                        }
                                                },
                                                ruta_2: {
                                                    ruta_id:
                                                        infoB.id,
                                                    nombre:
                                                        infoB.nombre,
                                                    color:
                                                        infoB.color,
                                                    parada_subida:
                                                        {
                                                            id:
                                                                subidaB.id,
                                                            nombre:
                                                                subidaB.nombre,
                                                            latitud:
                                                                subidaB.latitud,
                                                            longitud:
                                                                subidaB.longitud
                                                        },
                                                    parada_bajada:
                                                        {
                                                            id:
                                                                bajadaB.id,
                                                            nombre:
                                                                bajadaB.nombre,
                                                            latitud:
                                                                bajadaB.latitud,
                                                            longitud:
                                                                bajadaB.longitud
                                                        }
                                                },
                                                ruta_3: {
                                                    ruta_id:
                                                        infoC.id,
                                                    nombre:
                                                        infoC.nombre,
                                                    color:
                                                        infoC.color,
                                                    parada_subida:
                                                        {
                                                            id:
                                                                subidaC.id,
                                                            nombre:
                                                                subidaC.nombre,
                                                            latitud:
                                                                subidaC.latitud,
                                                            longitud:
                                                                subidaC.longitud
                                                        },
                                                    parada_bajada:
                                                        {
                                                            id:
                                                                destinoParada.id,
                                                            nombre:
                                                                destinoParada.nombre,
                                                            latitud:
                                                                destinoParada.latitud,
                                                            longitud:
                                                                destinoParada.longitud,
                                                            distancia_destino:
                                                                Math.round(
                                                                    destinoParada.distancia
                                                                )
                                                        }
                                                },
                                                transbordos: [
                                                    {
                                                        bajar_en:
                                                            {
                                                                id:
                                                                    bajadaA.id,
                                                                nombre:
                                                                    bajadaA.nombre,
                                                                latitud:
                                                                    bajadaA.latitud,
                                                                longitud:
                                                                    bajadaA.longitud
                                                            },
                                                        subir_en:
                                                            {
                                                                id:
                                                                    subidaB.id,
                                                                nombre:
                                                                    subidaB.nombre,
                                                                latitud:
                                                                    subidaB.latitud,
                                                                longitud:
                                                                    subidaB.longitud
                                                            },
                                                        distancia:
                                                            Math.round(
                                                                distanciaAB
                                                            )
                                                    },
                                                    {
                                                        bajar_en:
                                                            {
                                                                id:
                                                                    bajadaB.id,
                                                                nombre:
                                                                    bajadaB.nombre,
                                                                latitud:
                                                                    bajadaB.latitud,
                                                                longitud:
                                                                    bajadaB.longitud
                                                            },
                                                        subir_en:
                                                            {
                                                                id:
                                                                    subidaC.id,
                                                                nombre:
                                                                    subidaC.nombre,
                                                                latitud:
                                                                    subidaC.latitud,
                                                                longitud:
                                                                    subidaC.longitud
                                                            },
                                                        distancia:
                                                            Math.round(
                                                                distanciaBC
                                                            )
                                                    }
                                                ],
                                                distancia_total_caminando:
                                                    Math.round(
                                                        subidaA.distancia +
                                                        distanciaAB +
                                                        distanciaBC +
                                                        destinoParada.distancia
                                                    )
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        return resultados;
    }

    function ordenarResultados(resultados) {
        return resultados.sort((a, b) => {
            if (
                a.distancia_total_caminando !==
                b.distancia_total_caminando
            ) {
                return (
                    a.distancia_total_caminando -
                    b.distancia_total_caminando
                );
            }

            return 0;
        });
    }

    const rutasUna =
        buscarUnaRuta();

    if (rutasUna.length > 0) {
        return res.json({
            cantidad_camiones: 1,
            rutas: ordenarResultados(
                rutasUna
            ).slice(0, MAX_RESULTADOS),
            origen,
            destino
        });
    }

    const rutasDos =
        buscarDosRutas();

    if (rutasDos.length > 0) {
        return res.json({
            cantidad_camiones: 2,
            rutas: ordenarResultados(
                rutasDos
            ).slice(0, MAX_RESULTADOS),
            origen,
            destino
        });
    }

    const rutasTres =
        buscarTresRutas();

    if (rutasTres.length > 0) {
        return res.json({
            cantidad_camiones: 3,
            rutas: ordenarResultados(
                rutasTres
            ).slice(0, MAX_RESULTADOS),
            origen,
            destino
        });
    }

    return res.json({
        cantidad_camiones: 0,
        rutas: [],
        mensaje:
            "No se encontraron rutas de 1, 2 o 3 camiones",
        origen,
        destino
    });

} catch (error) {
    console.error(
        "Error buscando ruta:",
        error
    );

    return res.status(500).json({
        mensaje:
            "Error interno buscando rutas",
        error: error.message
    });
}


});

module.exports = router;
