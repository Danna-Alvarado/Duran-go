const express = require("express");
const router = express.Router();
const pool = require("./db");

const RADIO_MAXIMO = 800;
const MAX_CAMIONES = 4;

const distancia = (lat1, lng1, lat2, lng2) => {
const R = 6371000;
const dLat = (lat2 - lat1) * Math.PI / 180;
const dLng = (lng2 - lng1) * Math.PI / 180;
const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

router.post("/buscar-ruta", async (req, res) => {
try {
const { origenLat, origenLng, destinoLat, destinoLng } = req.body;


    if ([origenLat, origenLng, destinoLat, destinoLng].some(v => v === undefined || v === null || isNaN(Number(v)))) {
        return res.status(400).json({
            mensaje: "Coordenadas inválidas"
        });
    }

    const { rows } = await pool.query(`
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

    if (!rows.length) {
        return res.status(404).json({
            mensaje: "No hay rutas registradas"
        });
    }

    const rutas = {};

    for (const row of rows) {
        const rutaId = Number(row.ruta_id);

        if (!rutas[rutaId]) {
            rutas[rutaId] = {
                ruta_id: rutaId,
                ruta: row.ruta,
                color: row.color,
                paradas: []
            };
        }

        rutas[rutaId].paradas.push({
            id: Number(row.parada_id),
            nombre: row.nombre_parada,
            latitud: Number(row.latitud),
            longitud: Number(row.longitud),
            orden: Number(row.orden)
        });
    }

    const todasLasParadas = [];
    const paradasMap = new Map();

    for (const ruta of Object.values(rutas)) {
        for (const parada of ruta.paradas) {
            if (!paradasMap.has(parada.id)) {
                paradasMap.set(parada.id, {
                    id: parada.id,
                    nombre: parada.nombre,
                    latitud: parada.latitud,
                    longitud: parada.longitud,
                    rutas: []
                });
            }

            const registro = paradasMap.get(parada.id);

            if (!registro.rutas.includes(ruta.ruta_id)) {
                registro.rutas.push(ruta.ruta_id);
            }
        }
    }

    todasLasParadas.push(...paradasMap.values());

    const paradasOrigen = todasLasParadas
        .map(parada => ({
            ...parada,
            distancia: distancia(
                Number(origenLat),
                Number(origenLng),
                parada.latitud,
                parada.longitud
            )
        }))
        .filter(parada => parada.distancia <= RADIO_MAXIMO)
        .sort((a, b) => a.distancia - b.distancia);

    const paradasDestino = todasLasParadas
        .map(parada => ({
            ...parada,
            distancia: distancia(
                Number(destinoLat),
                Number(destinoLng),
                parada.latitud,
                parada.longitud
            )
        }))
        .filter(parada => parada.distancia <= RADIO_MAXIMO)
        .sort((a, b) => a.distancia - b.distancia);

    console.log("ORIGEN:", Number(origenLat), Number(origenLng));
    console.log("DESTINO:", Number(destinoLat), Number(destinoLng));

    console.log(
        "PARADAS ORIGEN:",
        paradasOrigen.map(p => ({
            id: p.id,
            nombre: p.nombre,
            distancia: Math.round(p.distancia),
            rutas: p.rutas
        }))
    );

    console.log(
        "PARADAS DESTINO:",
        paradasDestino.map(p => ({
            id: p.id,
            nombre: p.nombre,
            distancia: Math.round(p.distancia),
            rutas: p.rutas
        }))
    );

    if (!paradasOrigen.length) {
        return res.status(404).json({
            mensaje: "No hay paradas a menos de 800 metros de tu ubicación",
            radio_busqueda_metros: RADIO_MAXIMO
        });
    }

    if (!paradasDestino.length) {
        return res.status(404).json({
            mensaje: "No hay paradas a menos de 800 metros del destino",
            radio_busqueda_metros: RADIO_MAXIMO
        });
    }

    const opciones = [];

    for (const ruta of Object.values(rutas)) {
        const subidas = paradasOrigen
            .filter(parada => parada.rutas.includes(ruta.ruta_id))
            .map(parada => {
                const encontrada = ruta.paradas.find(p => p.id === parada.id);

                return encontrada
                    ? {
                        ...parada,
                        orden: encontrada.orden
                    }
                    : null;
            })
            .filter(Boolean);

        const bajadas = paradasDestino
            .filter(parada => parada.rutas.includes(ruta.ruta_id))
            .map(parada => {
                const encontrada = ruta.paradas.find(p => p.id === parada.id);

                return encontrada
                    ? {
                        ...parada,
                        orden: encontrada.orden
                    }
                    : null;
            })
            .filter(Boolean);

        for (const subida of subidas) {
            for (const bajada of bajadas) {
                if (bajada.orden <= subida.orden) continue;

                opciones.push({
                    cantidad_camiones: 1,
                    distancia_total: subida.distancia + bajada.distancia,
                    segmentos: [{
                        ruta_id: ruta.ruta_id,
                        ruta: ruta.ruta,
                        color: ruta.color,
                        numero: 1,
                        parada_subida: subida,
                        parada_bajada: bajada
                    }]
                });
            }
        }
    }

    const buscarCombinaciones = (camino, visitadas) => {
        if (camino.length >= MAX_CAMIONES) return;

        const rutaActual = rutas[camino[camino.length - 1].ruta_id];

        for (const rutaSiguiente of Object.values(rutas)) {
            if (visitadas.has(rutaSiguiente.ruta_id)) continue;

            const conexiones = [];

            for (const paradaActual of rutaActual.paradas) {
                const paradaSiguiente = rutaSiguiente.paradas.find(
                    parada => parada.id === paradaActual.id
                );

                if (paradaSiguiente) {
                    conexiones.push({
                        id: paradaActual.id,
                        nombre: paradaActual.nombre,
                        latitud: paradaActual.latitud,
                        longitud: paradaActual.longitud,
                        ordenActual: paradaActual.orden,
                        ordenSiguiente: paradaSiguiente.orden
                    });
                }
            }

            if (!conexiones.length) continue;

            for (const conexion of conexiones) {
                const nuevoCamino = [
                    ...camino,
                    {
                        ruta_id: rutaSiguiente.ruta_id,
                        conexion
                    }
                ];

                const subidasIniciales = paradasOrigen.filter(
                    parada => parada.rutas.includes(camino[0].ruta_id)
                );

                const bajadasFinales = paradasDestino.filter(
                    parada => parada.rutas.includes(rutaSiguiente.ruta_id)
                );

                for (const subidaInicial of subidasIniciales) {
                    const subidaRuta = rutas[camino[0].ruta_id].paradas.find(
                        parada => parada.id === subidaInicial.id
                    );

                    if (!subidaRuta) continue;

                    if (camino.length === 1 && conexion.ordenActual <= subidaRuta.orden) {
                        continue;
                    }

                    for (const bajadaFinal of bajadasFinales) {
                        const bajadaRuta = rutaSiguiente.paradas.find(
                            parada => parada.id === bajadaFinal.id
                        );

                        if (!bajadaRuta) continue;

                        if (bajadaRuta.orden <= conexion.ordenSiguiente) {
                            continue;
                        }

                        const segmentos = [];

                        let valido = true;

                        for (let i = 0; i < nuevoCamino.length; i++) {
                            const ruta = rutas[nuevoCamino[i].ruta_id];

                            let paradaSubida;
                            let paradaBajada;

                            if (i === 0) {
                                paradaSubida = ruta.paradas.find(
                                    parada => parada.id === subidaInicial.id
                                );
                            } else {
                                const conexionAnterior = nuevoCamino[i].conexion;

                                paradaSubida = ruta.paradas.find(
                                    parada => parada.id === conexionAnterior.id
                                );
                            }

                            if (i === nuevoCamino.length - 1) {
                                paradaBajada = ruta.paradas.find(
                                    parada => parada.id === bajadaFinal.id
                                );
                            } else {
                                paradaBajada = ruta.paradas.find(
                                    parada => parada.id === nuevoCamino[i + 1].conexion.id
                                );
                            }

                            if (!paradaSubida || !paradaBajada) {
                                valido = false;
                                break;
                            }

                            if (paradaBajada.orden <= paradaSubida.orden) {
                                valido = false;
                                break;
                            }

                            segmentos.push({
                                ruta_id: ruta.ruta_id,
                                ruta: ruta.ruta,
                                color: ruta.color,
                                numero: i + 1,
                                parada_subida: paradaSubida,
                                parada_bajada: paradaBajada
                            });
                        }

                        if (valido) {
                            opciones.push({
                                cantidad_camiones: segmentos.length,
                                distancia_total: subidaInicial.distancia + bajadaFinal.distancia,
                                segmentos
                            });
                        }
                    }
                }

                const nuevasVisitadas = new Set(visitadas);
                nuevasVisitadas.add(rutaSiguiente.ruta_id);

                buscarCombinaciones(
                    nuevoCamino,
                    nuevasVisitadas
                );
            }
        }
    };

    for (const ruta of Object.values(rutas)) {
        const tieneOrigen = paradasOrigen.some(
            parada => parada.rutas.includes(ruta.ruta_id)
        );

        if (!tieneOrigen) continue;

        buscarCombinaciones(
            [{
                ruta_id: ruta.ruta_id
            }],
            new Set([ruta.ruta_id])
        );
    }

    const claves = new Set();
    const opcionesUnicas = [];

    for (const opcion of opciones) {
        const clave = opcion.segmentos
            .map(segmento =>
                `${segmento.ruta_id}-${segmento.parada_subida.id}-${segmento.parada_bajada.id}`
            )
            .join("|");

        if (!claves.has(clave)) {
            claves.add(clave);
            opcionesUnicas.push(opcion);
        }
    }

    opcionesUnicas.sort((a, b) => {
        if (a.cantidad_camiones !== b.cantidad_camiones) {
            return a.cantidad_camiones - b.cantidad_camiones;
        }

        return a.distancia_total - b.distancia_total;
    });

    const mejores = opcionesUnicas.slice(0, 3);

    console.log(
        "OPCIONES ENCONTRADAS:",
        mejores.map(opcion => ({
            camiones: opcion.cantidad_camiones,
            rutas: opcion.segmentos.map(segmento => segmento.ruta),
            distancia: Math.round(opcion.distancia_total)
        }))
    );

    if (!mejores.length) {
        return res.status(404).json({
            mensaje: "No se encontró una combinación de rutas para llegar al destino",
            radio_busqueda_metros: RADIO_MAXIMO,
            paradas_origen: paradasOrigen.map(p => ({
                id: p.id,
                nombre: p.nombre,
                distancia: Math.round(p.distancia)
            })),
            paradas_destino: paradasDestino.map(p => ({
                id: p.id,
                nombre: p.nombre,
                distancia: Math.round(p.distancia)
            }))
        });
    }

    return res.json({
        cantidad_camiones: mejores[0].cantidad_camiones,
        rutas: mejores
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
