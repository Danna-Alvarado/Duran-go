const express = require("express");
const router = express.Router();
const pool = require("./db");

const calcularDistancia = (lat1, lng1, lat2, lng2) => {
const R = 6371000;
const dLat = (lat2 - lat1) * Math.PI / 180;
const dLng = (lng2 - lng1) * Math.PI / 180;
const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

router.post("/buscar-ruta", async (req, res) => {
try {
const { origenLat, origenLng, destinoLat, destinoLng } = req.body;

    if ([origenLat, origenLng, destinoLat, destinoLng].some(valor => valor === undefined || valor === null || isNaN(Number(valor)))) {
        return res.status(400).json({ mensaje: "Coordenadas inválidas" });
    }

    const resultado = await pool.query(`
        SELECT
            r.id AS ruta_id,
            r.nombre AS ruta,
            r.color,
            p.id AS parada_id,
            p.nombre_parada,
            p.latitud,
            p.longitud,
            rp.orden
        FROM rutas r
        INNER JOIN ruta_paradas rp ON rp.ruta_id = r.id
        INNER JOIN paradas p ON p.id = rp.parada_id
        ORDER BY r.id, rp.orden
    `);

    const datos = resultado.rows;

    if (!datos.length) {
        return res.status(404).json({
            mensaje: "No hay rutas registradas"
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

    const paradas = {};

    for (const fila of datos) {
        if (!paradas[fila.parada_id]) {
            paradas[fila.parada_id] = {
                id: fila.parada_id,
                nombre: fila.nombre_parada,
                latitud: Number(fila.latitud),
                longitud: Number(fila.longitud),
                rutas: []
            };
        }

        if (!paradas[fila.parada_id].rutas.includes(fila.ruta_id)) {
            paradas[fila.parada_id].rutas.push(fila.ruta_id);
        }
    }

    const rutas = {};

    for (const fila of datos) {
        if (!rutas[fila.ruta_id]) {
            rutas[fila.ruta_id] = {
                ruta_id: fila.ruta_id,
                ruta: fila.ruta,
                color: fila.color,
                paradas: []
            };
        }

        rutas[fila.ruta_id].paradas.push({
            id: fila.parada_id,
            nombre: fila.nombre_parada,
            latitud: Number(fila.latitud),
            longitud: Number(fila.longitud),
            orden: Number(fila.orden)
        });
    }

    const todasLasParadas = Object.values(paradas);

    const paradasOrigen = todasLasParadas
        .map(parada => ({
            ...parada,
            distancia: calcularDistancia(
                origen.lat,
                origen.lng,
                parada.latitud,
                parada.longitud
            )
        }))
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, 8);

    const paradasDestino = todasLasParadas
        .map(parada => ({
            ...parada,
            distancia: calcularDistancia(
                destino.lat,
                destino.lng,
                parada.latitud,
                parada.longitud
            )
        }))
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, 8);

    const soluciones = [];

    for (const ruta of Object.values(rutas)) {
        for (const subida of paradasOrigen) {
            const indiceSubida = ruta.paradas.findIndex(
                parada => parada.id === subida.id
            );

            if (indiceSubida === -1) continue;

            for (const bajada of paradasDestino) {
                const indiceBajada = ruta.paradas.findIndex(
                    parada => parada.id === bajada.id
                );

                if (indiceBajada === -1) continue;
                if (indiceBajada <= indiceSubida) continue;

                soluciones.push({
                    cantidad_camiones: 1,
                    distancia: subida.distancia + bajada.distancia,
                    rutas: [{
                        ruta_id: ruta.ruta_id,
                        ruta: ruta.ruta,
                        color: ruta.color,
                        numero: 1,
                        parada_subida: ruta.paradas[indiceSubida],
                        parada_bajada: ruta.paradas[indiceBajada]
                    }]
                });
            }
        }
    }

    for (const ruta1 of Object.values(rutas)) {
        for (const subida of paradasOrigen) {
            const indiceSubida = ruta1.paradas.findIndex(
                parada => parada.id === subida.id
            );

            if (indiceSubida === -1) continue;

            for (const transbordo of ruta1.paradas) {
                if (transbordo.orden <= ruta1.paradas[indiceSubida].orden) continue;

                for (const ruta2 of Object.values(rutas)) {
                    if (ruta1.ruta_id === ruta2.ruta_id) continue;

                    const indiceTransbordo = ruta2.paradas.findIndex(
                        parada => parada.id === transbordo.id
                    );

                    if (indiceTransbordo === -1) continue;

                    for (const bajada of paradasDestino) {
                        const indiceBajada = ruta2.paradas.findIndex(
                            parada => parada.id === bajada.id
                        );

                        if (indiceBajada === -1) continue;
                        if (indiceBajada <= indiceTransbordo) continue;

                        soluciones.push({
                            cantidad_camiones: 2,
                            distancia: subida.distancia + bajada.distancia,
                            rutas: [
                                {
                                    ruta_id: ruta1.ruta_id,
                                    ruta: ruta1.ruta,
                                    color: ruta1.color,
                                    numero: 1,
                                    parada_subida: ruta1.paradas[indiceSubida],
                                    parada_bajada: transbordo
                                },
                                {
                                    ruta_id: ruta2.ruta_id,
                                    ruta: ruta2.ruta,
                                    color: ruta2.color,
                                    numero: 2,
                                    parada_subida: ruta2.paradas[indiceTransbordo],
                                    parada_bajada: ruta2.paradas[indiceBajada]
                                }
                            ]
                        });
                    }
                }
            }
        }
    }

    for (const ruta1 of Object.values(rutas)) {
        for (const subida of paradasOrigen) {
            const indiceSubida = ruta1.paradas.findIndex(
                parada => parada.id === subida.id
            );

            if (indiceSubida === -1) continue;

            for (const transbordo1 of ruta1.paradas) {
                if (transbordo1.orden <= ruta1.paradas[indiceSubida].orden) continue;

                for (const ruta2 of Object.values(rutas)) {
                    if (ruta2.ruta_id === ruta1.ruta_id) continue;

                    const indiceTransbordo1 = ruta2.paradas.findIndex(
                        parada => parada.id === transbordo1.id
                    );

                    if (indiceTransbordo1 === -1) continue;

                    for (const transbordo2 of ruta2.paradas) {
                        if (transbordo2.orden <= ruta2.paradas[indiceTransbordo1].orden) continue;

                        for (const ruta3 of Object.values(rutas)) {
                            if (ruta3.ruta_id === ruta1.ruta_id || ruta3.ruta_id === ruta2.ruta_id) continue;

                            const indiceTransbordo2 = ruta3.paradas.findIndex(
                                parada => parada.id === transbordo2.id
                            );

                            if (indiceTransbordo2 === -1) continue;

                            for (const bajada of paradasDestino) {
                                const indiceBajada = ruta3.paradas.findIndex(
                                    parada => parada.id === bajada.id
                                );

                                if (indiceBajada === -1) continue;
                                if (indiceBajada <= indiceTransbordo2) continue;

                                soluciones.push({
                                    cantidad_camiones: 3,
                                    distancia: subida.distancia + bajada.distancia,
                                    rutas: [
                                        {
                                            ruta_id: ruta1.ruta_id,
                                            ruta: ruta1.ruta,
                                            color: ruta1.color,
                                            numero: 1,
                                            parada_subida: ruta1.paradas[indiceSubida],
                                            parada_bajada: transbordo1
                                        },
                                        {
                                            ruta_id: ruta2.ruta_id,
                                            ruta: ruta2.ruta,
                                            color: ruta2.color,
                                            numero: 2,
                                            parada_subida: ruta2.paradas[indiceTransbordo1],
                                            parada_bajada: transbordo2
                                        },
                                        {
                                            ruta_id: ruta3.ruta_id,
                                            ruta: ruta3.ruta,
                                            color: ruta3.color,
                                            numero: 3,
                                            parada_subida: ruta3.paradas[indiceTransbordo2],
                                            parada_bajada: ruta3.paradas[indiceBajada]
                                        }
                                    ]
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    if (!soluciones.length) {
        return res.status(404).json({
            mensaje: "No se encontró una combinación de rutas para llegar al destino"
        });
    }

    const rutasUnicas = [];

    for (const solucion of soluciones) {
        const clave = solucion.rutas
            .map(ruta => `${ruta.ruta_id}-${ruta.parada_subida.id}-${ruta.parada_bajada.id}`)
            .join("|");

        if (!rutasUnicas.some(item => item.clave === clave)) {
            rutasUnicas.push({
                clave,
                ...solucion
            });
        }
    }

    rutasUnicas.sort((a, b) => {
        if (a.cantidad_camiones !== b.cantidad_camiones) {
            return a.cantidad_camiones - b.cantidad_camiones;
        }

        return a.distancia - b.distancia;
    });

    const mejores = rutasUnicas.slice(0, 3);

    return res.json({
        cantidad_camiones: mejores[0].cantidad_camiones,
        rutas: mejores.map(opcion => ({
            cantidad_camiones: opcion.cantidad_camiones,
            segmentos: opcion.rutas
        }))
    });
} catch (error) {
    console.error("Error en /buscar-ruta:", error);
    return res.status(500).json({
        mensaje: "Error interno al buscar la ruta",
        error: error.message
    });
}


});

module.exports = router;
