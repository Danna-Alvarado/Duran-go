const express = require("express");
const router = express.Router();
const pool = require("./db");

const RADIO_MAXIMO = 800;
const MAX_CAMIONES = 4;

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
            mensaje: "No hay rutas disponibles"
        });
    }

    const rutas = {};
    const paradas = {};

    for (const row of rows) {
        const rutaId = Number(row.ruta_id);
        const paradaId = Number(row.parada_id);

        const parada = {
            id: paradaId,
            nombre: row.nombre_parada,
            latitud: Number(row.latitud),
            longitud: Number(row.longitud),
            orden: Number(row.orden)
        };

        if (!rutas[rutaId]) {
            rutas[rutaId] = {
                ruta_id: rutaId,
                ruta: row.ruta,
                color: row.color,
                paradas: []
            };
        }

        rutas[rutaId].paradas.push(parada);

        if (!paradas[paradaId]) {
            paradas[paradaId] = {
                id: paradaId,
                nombre: row.nombre_parada,
                latitud: Number(row.latitud),
                longitud: Number(row.longitud),
                rutas: []
            };
        }

        if (!paradas[paradaId].rutas.includes(rutaId)) {
            paradas[paradaId].rutas.push(rutaId);
        }
    }

    const listaParadas = Object.values(paradas);

    const paradasOrigen = listaParadas
        .map(parada => ({
            ...parada,
            distancia: calcularDistancia(
                Number(origenLat),
                Number(origenLng),
                parada.latitud,
                parada.longitud
            )
        }))
        .filter(parada => parada.distancia <= RADIO_MAXIMO)
        .sort((a, b) => a.distancia - b.distancia);

    const paradasDestino = listaParadas
        .map(parada => ({
            ...parada,
            distancia: calcularDistancia(
                Number(destinoLat),
                Number(destinoLng),
                parada.latitud,
                parada.longitud
            )
        }))
        .filter(parada => parada.distancia <= RADIO_MAXIMO)
        .sort((a, b) => a.distancia - b.distancia);

    console.log("Origen:", {
        lat: Number(origenLat),
        lng: Number(origenLng)
    });

    console.log("Destino:", {
        lat: Number(destinoLat),
        lng: Number(destinoLng)
    });

    console.log("Paradas cercanas al origen:", paradasOrigen.map(p => ({
        id: p.id,
        nombre: p.nombre,
        distancia: Math.round(p.distancia)
    })));

    console.log("Paradas cercanas al destino:", paradasDestino.map(p => ({
        id: p.id,
        nombre: p.nombre,
        distancia: Math.round(p.distancia)
    })));

    if (!paradasOrigen.length) {
        return res.status(404).json({
            mensaje: "No hay paradas a menos de 800 metros de tu ubicación",
            tipo: "origen",
            radio_busqueda_metros: RADIO_MAXIMO
        });
    }

    if (!paradasDestino.length) {
        return res.status(404).json({
            mensaje: "No hay paradas a menos de 800 metros del destino",
            tipo: "destino",
            radio_busqueda_metros: RADIO_MAXIMO
        });
    }

    const rutasOrigen = new Set();

    for (const parada of paradasOrigen) {
        for (const rutaId of parada.rutas) {
            rutasOrigen.add(rutaId);
        }
    }

    const rutasDestino = new Set();

    for (const parada of paradasDestino) {
        for (const rutaId of parada.rutas) {
            rutasDestino.add(rutaId);
        }
    }

    const conexiones = {};

    for (const rutaId of Object.keys(rutas)) {
        conexiones[rutaId] = [];

        for (const otraRutaId of Object.keys(rutas)) {
            if (rutaId === otraRutaId) continue;

            const rutaActual = rutas[rutaId];
            const otraRuta = rutas[otraRutaId];

            const paradasCompartidas = rutaActual.paradas.filter(paradaActual =>
                otraRuta.paradas.some(paradaOtra => paradaOtra.id === paradaActual.id)
            );

            if (paradasCompartidas.length) {
                conexiones[rutaId].push({
                    ruta_id: Number(otraRutaId),
                    paradas: paradasCompartidas
                });
            }
        }
    }

    const soluciones = [];

    const buscarCaminos = (rutaId, camino, visitadas) => {
        if (camino.length > MAX_CAMIONES) return;

        if (rutasDestino.has(rutaId)) {
            soluciones.push([...camino]);
            return;
        }

        for (const conexion of conexiones[rutaId] || []) {
            if (visitadas.has(conexion.ruta_id)) continue;

            const nuevasVisitadas = new Set(visitadas);
            nuevasVisitadas.add(conexion.ruta_id);

            buscarCaminos(
                conexion.ruta_id,
                [
                    ...camino,
                    {
                        ruta_id: conexion.ruta_id,
                        paradas_conexion: conexion.paradas
                    }
                ],
                nuevasVisitadas
            );
        }
    };

    for (const rutaId of rutasOrigen) {
        buscarCaminos(
            Number(rutaId),
            [{
                ruta_id: Number(rutaId),
                paradas_conexion: []
            }],
            new Set([Number(rutaId)])
        );
    }

    const opciones = [];

    for (const camino of soluciones) {
        const primeraRuta = rutas[camino[0].ruta_id];
        const ultimaRuta = rutas[camino[camino.length - 1].ruta_id];

        const posiblesSubidas = paradasOrigen.filter(parada =>
            parada.rutas.includes(primeraRuta.ruta_id)
        );

        const posiblesBajadas = paradasDestino.filter(parada =>
            parada.rutas.includes(ultimaRuta.ruta_id)
        );

        if (!posiblesSubidas.length || !posiblesBajadas.length) continue;

        const subida = posiblesSubidas[0];
        const bajada = posiblesBajadas[0];

        const segmentos = [];
        let rutaValida = true;

        for (let i = 0; i < camino.length; i++) {
            const ruta = rutas[camino[i].ruta_id];

            let paradaSubida = null;
            let paradaBajada = null;

            if (i === 0) {
                paradaSubida = ruta.paradas.find(parada =>
                    parada.id === subida.id
                );
            } else {
                const rutaAnterior = rutas[camino[i - 1].ruta_id];

                const conexionesEntreRutas = rutaAnterior.paradas.filter(paradaAnterior =>
                    ruta.paradas.some(paradaActual =>
                        paradaActual.id === paradaAnterior.id
                    )
                );

                if (!conexionesEntreRutas.length) {
                    rutaValida = false;
                    break;
                }

                paradaSubida = conexionesEntreRutas[0];
            }

            if (i === camino.length - 1) {
                paradaBajada = ruta.paradas.find(parada =>
                    parada.id === bajada.id
                );
            } else {
                const siguienteRuta = rutas[camino[i + 1].ruta_id];

                const conexionesEntreRutas = ruta.paradas.filter(paradaActual =>
                    siguienteRuta.paradas.some(paradaSiguiente =>
                        paradaSiguiente.id === paradaActual.id
                    )
                );

                if (!conexionesEntreRutas.length) {
                    rutaValida = false;
                    break;
                }

                paradaBajada = conexionesEntreRutas[0];
            }

            if (!paradaSubida || !paradaBajada) {
                rutaValida = false;
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

        if (!rutaValida || !segmentos.length) continue;

        opciones.push({
            cantidad_camiones: segmentos.length,
            distancia_origen: subida.distancia,
            distancia_destino: bajada.distancia,
            distancia_total: subida.distancia + bajada.distancia,
            segmentos
        });
    }

    const opcionesUnicas = [];
    const claves = new Set();

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

    if (!mejores.length) {
        return res.status(404).json({
            mensaje: "No se encontró una combinación de rutas para llegar al destino",
            radio_busqueda_metros: RADIO_MAXIMO,
            paradas_origen_encontradas: paradasOrigen.length,
            paradas_destino_encontradas: paradasDestino.length
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
