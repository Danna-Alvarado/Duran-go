const express = require("express");
const router = express.Router();
const pool = require("./db");

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
        return res.status(400).json({ mensaje: "Coordenadas inválidas" });
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
        return res.status(404).json({ mensaje: "No hay rutas disponibles" });
    }

    const paradas = {};
    const rutas = {};

    for (const row of rows) {
        const parada = {
            id: row.parada_id,
            nombre: row.nombre_parada,
            latitud: Number(row.latitud),
            longitud: Number(row.longitud),
            orden: Number(row.orden)
        };

        if (!paradas[row.parada_id]) {
            paradas[row.parada_id] = {
                ...parada,
                rutas: []
            };
        }

        if (!paradas[row.parada_id].rutas.includes(row.ruta_id)) {
            paradas[row.parada_id].rutas.push(row.ruta_id);
        }

        if (!rutas[row.ruta_id]) {
            rutas[row.ruta_id] = {
                ruta_id: row.ruta_id,
                ruta: row.ruta,
                color: row.color,
                paradas: []
            };
        }

        rutas[row.ruta_id].paradas.push(parada);
    }

    const listaParadas = Object.values(paradas);

    const paradasOrigen = listaParadas
        .map(parada => ({
            ...parada,
            distancia: distancia(
                Number(origenLat),
                Number(origenLng),
                parada.latitud,
                parada.longitud
            )
        }))
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, 10);

    const paradasDestino = listaParadas
        .map(parada => ({
            ...parada,
            distancia: distancia(
                Number(destinoLat),
                Number(destinoLng),
                parada.latitud,
                parada.longitud
            )
        }))
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, 10);

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

            const ruta = rutas[rutaId];
            const otraRuta = rutas[otraRutaId];

            const paradasCompartidas = [];

            for (const parada of ruta.paradas) {
                const existe = otraRuta.paradas.find(p => p.id === parada.id);

                if (existe) {
                    paradasCompartidas.push(parada);
                }
            }

            if (paradasCompartidas.length) {
                conexiones[rutaId].push({
                    ruta_id: Number(otraRutaId),
                    paradas: paradasCompartidas
                });
            }
        }
    }

    const soluciones = [];

    const buscarCaminos = (rutaActual, camino, visitadas) => {
        if (camino.length > 6) return;

        if (rutasDestino.has(Number(rutaActual))) {
            soluciones.push([...camino]);
            return;
        }

        for (const conexion of conexiones[rutaActual] || []) {
            if (visitadas.has(conexion.ruta_id)) continue;

            const nuevasVisitadas = new Set(visitadas);
            nuevasVisitadas.add(conexion.ruta_id);

            buscarCaminos(
                conexion.ruta_id,
                [...camino, {
                    ruta_id: conexion.ruta_id,
                    transbordos: conexion.paradas
                }],
                nuevasVisitadas
            );
        }
    };

    for (const rutaId of rutasOrigen) {
        buscarCaminos(
            Number(rutaId),
            [{
                ruta_id: Number(rutaId),
                transbordos: []
            }],
            new Set([Number(rutaId)])
        );
    }

    const opciones = [];

    for (const camino of soluciones) {
        const primeraRuta = rutas[camino[0].ruta_id];
        const ultimaRuta = rutas[camino[camino.length - 1].ruta_id];

        const subida = paradasOrigen.find(parada =>
            parada.rutas.includes(primeraRuta.ruta_id)
        );

        const bajada = paradasDestino.find(parada =>
            parada.rutas.includes(ultimaRuta.ruta_id)
        );

        if (!subida || !bajada) continue;

        const segmentos = [];

        for (let i = 0; i < camino.length; i++) {
            const ruta = rutas[camino[i].ruta_id];

            let paradaSubida;
            let paradaBajada;

            if (i === 0) {
                paradaSubida = subida;
            } else {
                const rutaAnterior = rutas[camino[i - 1].ruta_id];

                const compartidas = rutaAnterior.paradas.filter(parada =>
                    ruta.paradas.some(p => p.id === parada.id)
                );

                paradaSubida = compartidas[0];
            }

            if (i === camino.length - 1) {
                paradaBajada = bajada;
            } else {
                const siguienteRuta = rutas[camino[i + 1].ruta_id];

                const compartidas = ruta.paradas.filter(parada =>
                    siguienteRuta.paradas.some(p => p.id === parada.id)
                );

                paradaBajada = compartidas[0];
            }

            if (!paradaSubida || !paradaBajada) continue;

            segmentos.push({
                ruta_id: ruta.ruta_id,
                ruta: ruta.ruta,
                color: ruta.color,
                numero: i + 1,
                parada_subida: paradaSubida,
                parada_bajada: paradaBajada
            });
        }

        if (segmentos.length === camino.length) {
            opciones.push({
                cantidad_camiones: segmentos.length,
                distancia: subida.distancia + bajada.distancia,
                segmentos
            });
        }
    }

    const claves = new Set();
    const opcionesUnicas = [];

    for (const opcion of opciones) {
        const clave = opcion.segmentos
            .map(s => `${s.ruta_id}-${s.parada_subida.id}-${s.parada_bajada.id}`)
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

        return a.distancia - b.distancia;
    });

    const mejores = opcionesUnicas.slice(0, 3);

    if (!mejores.length) {
        return res.status(404).json({
            mensaje: "No se encontró una combinación de rutas para llegar al destino"
        });
    }

    return res.json({
        cantidad_camiones: mejores[0].cantidad_camiones,
        rutas: mejores
    });
} catch (error) {
    console.error("Error en buscar-ruta:", error);

    return res.status(500).json({
        mensaje: "Error interno al buscar la ruta",
        error: error.message
    });
}


});

module.exports = router;
