const express = require("express");
const router = express.Router();
const pool = require("./db");

const MAX_ORIGEN = 800;
const MAX_TRANSBORDO = 500;
const MAX_DESTINO = 800;
const MAX_RESULTADOS = 3;

function distancia(lat1, lng1, lat2, lng2) {
const R = 6371000;
const rad = Math.PI / 180;


const dLat = (lat2 - lat1) * rad;
const dLng = (lng2 - lng1) * rad;

const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

return R * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
);


}

function cercanasAParada(paradas, lat, lng, limite) {
return paradas
.map(parada => ({
...parada,
distancia: distancia(
lat,
lng,
parada.latitud,
parada.longitud
)
}))
.filter(parada => parada.distancia <= limite)
.sort((a, b) => a.distancia - b.distancia);
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

    const paradas = paradasResult.rows.map(parada => ({
        id: Number(parada.id),
        nombre: parada.nombre_parada,
        latitud: Number(parada.latitud),
        longitud: Number(parada.longitud)
    }));

    const rutas = rutasResult.rows.map(ruta => ({
        id: Number(ruta.id),
        nombre: ruta.nombre,
        color: ruta.color
    }));

    const rutaParadas = relacionesResult.rows.map(relacion => ({
        ruta_id: Number(relacion.ruta_id),
        parada_id: Number(relacion.parada_id),
        orden: Number(relacion.orden)
    }));

    const mapaParadas = new Map();

    paradas.forEach(parada => {
        mapaParadas.set(parada.id, parada);
    });

    const mapaRutas = new Map();

    rutas.forEach(ruta => {
        mapaRutas.set(ruta.id, ruta);
    });

    const recorridos = new Map();

    rutaParadas.forEach(relacion => {
        if (!recorridos.has(relacion.ruta_id)) {
            recorridos.set(relacion.ruta_id, []);
        }

        const parada = mapaParadas.get(
            relacion.parada_id
        );

        if (!parada) {
            return;
        }

        recorridos.get(relacion.ruta_id).push({
            ...parada,
            orden: relacion.orden
        });
    });

    recorridos.forEach(lista => {
        lista.sort((a, b) => a.orden - b.orden);
    });

    const paradasOrigen = cercanasAParada(
        paradas,
        origen.lat,
        origen.lng,
        MAX_ORIGEN
    );

    const paradasDestino = cercanasAParada(
        paradas,
        destino.lat,
        destino.lng,
        MAX_DESTINO
    );

    console.log(
        "Paradas cercanas al origen:",
        paradasOrigen.length
    );

    console.log(
        "Paradas cercanas al destino:",
        paradasDestino.length
    );

    if (paradasOrigen.length === 0) {
        return res.json({
            cantidad_camiones: 0,
            rutas: [],
            mensaje: "No hay paradas cercanas al origen"
        });
    }

    if (paradasDestino.length === 0) {
        return res.json({
            cantidad_camiones: 0,
            rutas: [],
            mensaje: "No hay paradas cercanas al destino"
        });
    }

    function rutasQuePasanPor(paradaId) {
        const resultado = [];

        recorridos.forEach((lista, rutaId) => {
            const parada = lista.find(
                item => item.id === paradaId
            );

            if (parada) {
                resultado.push({
                    rutaId,
                    parada
                });
            }
        });

        return resultado;
    }

    function paradasPosteriores(rutaId, orden) {
        const lista = recorridos.get(rutaId) || [];

        return lista.filter(
            parada => parada.orden > orden
        );
    }

    function paradaEnRuta(rutaId, paradaId) {
        const lista = recorridos.get(rutaId) || [];

        return lista.find(
            parada => parada.id === paradaId
        );
    }

    function crearRuta(
        rutaId,
        subida,
        bajada
    ) {
        const ruta = mapaRutas.get(rutaId);

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
                longitud: subida.longitud
            },
            parada_bajada: {
                id: bajada.id,
                nombre: bajada.nombre,
                latitud: bajada.latitud,
                longitud: bajada.longitud
            }
        };
    }

    function buscarDirectas() {
        const resultados = [];

        for (const subida of paradasOrigen) {
            const rutasSubida =
                rutasQuePasanPor(subida.id);

            for (const infoRuta of rutasSubida) {
                const rutaId = infoRuta.rutaId;
                const ordenSubida =
                    infoRuta.parada.orden;

                for (const destinoParada of paradasDestino) {
                    const bajada =
                        paradaEnRuta(
                            rutaId,
                            destinoParada.id
                        );

                    if (!bajada) {
                        continue;
                    }

                    if (
                        bajada.orden <=
                        ordenSubida
                    ) {
                        continue;
                    }

                    const ruta =
                        crearRuta(
                            rutaId,
                            subida,
                            bajada
                        );

                    if (!ruta) {
                        continue;
                    }

                    resultados.push({
                        camiones: 1,
                        ruta_1: ruta,
                        transbordos: [],
                        distancia_total_caminando:
                            Math.round(
                                subida.distancia +
                                destinoParada.distancia
                            ),
                        distancia_origen:
                            Math.round(
                                subida.distancia
                            ),
                        distancia_destino:
                            Math.round(
                                destinoParada.distancia
                            )
                    });
                }
            }
        }

        return resultados;
    }

    function buscarDos() {
        const resultados = [];

        for (const subidaA of paradasOrigen) {
            const rutasA =
                rutasQuePasanPor(subidaA.id);

            for (const infoA of rutasA) {
                const rutaAId = infoA.rutaId;
                const ordenA =
                    infoA.parada.orden;

                const posiblesBajadas =
                    paradasPosteriores(
                        rutaAId,
                        ordenA
                    );

                for (
                    const bajadaA
                    of posiblesBajadas
                ) {
                    for (
                        const subidaB
                        of paradas
                    ) {
                        const distanciaTransbordo =
                            distancia(
                                bajadaA.latitud,
                                bajadaA.longitud,
                                subidaB.latitud,
                                subidaB.longitud
                            );

                        if (
                            distanciaTransbordo >
                            MAX_TRANSBORDO
                        ) {
                            continue;
                        }

                        const rutasB =
                            rutasQuePasanPor(
                                subidaB.id
                            );

                        for (
                            const infoB
                            of rutasB
                        ) {
                            const rutaBId =
                                infoB.rutaId;

                            if (
                                rutaBId ===
                                rutaAId
                            ) {
                                continue;
                            }

                            for (
                                const destinoParada
                                of paradasDestino
                            ) {
                                const bajadaB =
                                    paradaEnRuta(
                                        rutaBId,
                                        destinoParada.id
                                    );

                                if (!bajadaB) {
                                    continue;
                                }

                                if (
                                    bajadaB.orden <=
                                    infoB.parada.orden
                                ) {
                                    continue;
                                }

                                const ruta1 =
                                    crearRuta(
                                        rutaAId,
                                        subidaA,
                                        bajadaA
                                    );

                                const ruta2 =
                                    crearRuta(
                                        rutaBId,
                                        subidaB,
                                        bajadaB
                                    );

                                if (
                                    !ruta1 ||
                                    !ruta2
                                ) {
                                    continue;
                                }

                                resultados.push({
                                    camiones: 2,
                                    ruta_1: ruta1,
                                    ruta_2: ruta2,
                                    transbordos: [
                                        {
                                            bajar_en: {
                                                id:
                                                    bajadaA.id,
                                                nombre:
                                                    bajadaA.nombre,
                                                latitud:
                                                    bajadaA.latitud,
                                                longitud:
                                                    bajadaA.longitud
                                            },
                                            subir_en: {
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
                                                    distanciaTransbordo
                                                )
                                        }
                                    ],
                                    distancia_total_caminando:
                                        Math.round(
                                            subidaA.distancia +
                                            distanciaTransbordo +
                                            destinoParada.distancia
                                        ),
                                    distancia_origen:
                                        Math.round(
                                            subidaA.distancia
                                        ),
                                    distancia_destino:
                                        Math.round(
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

    function buscarTres() {
        const resultados = [];

        for (const subidaA of paradasOrigen) {
            const rutasA =
                rutasQuePasanPor(subidaA.id);

            for (const infoA of rutasA) {
                const rutaAId = infoA.rutaId;

                const bajadasA =
                    paradasPosteriores(
                        rutaAId,
                        infoA.parada.orden
                    );

                for (
                    const bajadaA
                    of bajadasA
                ) {
                    for (
                        const subidaB
                        of paradas
                    ) {
                        const distanciaAB =
                            distancia(
                                bajadaA.latitud,
                                bajadaA.longitud,
                                subidaB.latitud,
                                subidaB.longitud
                            );

                        if (
                            distanciaAB >
                            MAX_TRANSBORDO
                        ) {
                            continue;
                        }

                        const rutasB =
                            rutasQuePasanPor(
                                subidaB.id
                            );

                        for (
                            const infoB
                            of rutasB
                        ) {
                            const rutaBId =
                                infoB.rutaId;

                            if (
                                rutaBId ===
                                rutaAId
                            ) {
                                continue;
                            }

                            const bajadasB =
                                paradasPosteriores(
                                    rutaBId,
                                    infoB.parada.orden
                                );

                            for (
                                const bajadaB
                                of bajadasB
                            ) {
                                for (
                                    const subidaC
                                    of paradas
                                ) {
                                    const distanciaBC =
                                        distancia(
                                            bajadaB.latitud,
                                            bajadaB.longitud,
                                            subidaC.latitud,
                                            subidaC.longitud
                                        );

                                    if (
                                        distanciaBC >
                                        MAX_TRANSBORDO
                                    ) {
                                        continue;
                                    }

                                    const rutasC =
                                        rutasQuePasanPor(
                                            subidaC.id
                                        );

                                    for (
                                        const infoC
                                        of rutasC
                                    ) {
                                        const rutaCId =
                                            infoC.rutaId;

                                        if (
                                            rutaCId ===
                                            rutaAId ||
                                            rutaCId ===
                                            rutaBId
                                        ) {
                                            continue;
                                        }

                                        for (
                                            const destinoParada
                                            of paradasDestino
                                        ) {
                                            const bajadaC =
                                                paradaEnRuta(
                                                    rutaCId,
                                                    destinoParada.id
                                                );

                                            if (
                                                !bajadaC
                                            ) {
                                                continue;
                                            }

                                            if (
                                                bajadaC.orden <=
                                                infoC.parada.orden
                                            ) {
                                                continue;
                                            }

                                            const ruta1 =
                                                crearRuta(
                                                    rutaAId,
                                                    subidaA,
                                                    bajadaA
                                                );

                                            const ruta2 =
                                                crearRuta(
                                                    rutaBId,
                                                    subidaB,
                                                    bajadaB
                                                );

                                            const ruta3 =
                                                crearRuta(
                                                    rutaCId,
                                                    subidaC,
                                                    bajadaC
                                                );

                                            if (
                                                !ruta1 ||
                                                !ruta2 ||
                                                !ruta3
                                            ) {
                                                continue;
                                            }

                                            resultados.push({
                                                camiones: 3,
                                                ruta_1:
                                                    ruta1,
                                                ruta_2:
                                                    ruta2,
                                                ruta_3:
                                                    ruta3,
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
                                                    ),
                                                distancia_origen:
                                                    Math.round(
                                                        subidaA.distancia
                                                    ),
                                                distancia_destino:
                                                    Math.round(
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

    function ordenar(resultados) {
        return resultados.sort(
            (a, b) =>
                a.distancia_total_caminando -
                b.distancia_total_caminando
        );
    }

    const directas = ordenar(
        buscarDirectas()
    );

    if (directas.length > 0) {
        return res.json({
            cantidad_camiones: 1,
            rutas: directas.slice(
                0,
                MAX_RESULTADOS
            ),
            origen,
            destino
        });
    }

    const dos = ordenar(
        buscarDos()
    );

    if (dos.length > 0) {
        return res.json({
            cantidad_camiones: 2,
            rutas: dos.slice(
                0,
                MAX_RESULTADOS
            ),
            origen,
            destino
        });
    }

    const tres = ordenar(
        buscarTres()
    );

    if (tres.length > 0) {
        return res.json({
            cantidad_camiones: 3,
            rutas: tres.slice(
                0,
                MAX_RESULTADOS
            ),
            origen,
            destino
        });
    }

    return res.json({
        cantidad_camiones: 0,
        rutas: [],
        mensaje:
            "No se encontraron rutas",
        origen,
        destino
    });

} catch (error) {
    console.error(
        "ERROR BUSCANDO RUTA:",
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
