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

    const { rows: paradas } = await pool.query(`
        SELECT p.id, p.nombre_parada AS nombre, p.latitud, p.longitud, rp.ruta_id, rp.orden,
               r.nombre AS ruta, r.color
        FROM paradas p
        INNER JOIN ruta_paradas rp ON rp.parada_id = p.id
        INNER JOIN rutas r ON r.id = rp.ruta_id
        ORDER BY rp.ruta_id, rp.orden
    `);

    if (!paradas.length) {
        return res.status(404).json({ mensaje: "No hay paradas registradas" });
    }

    const porRuta = {};
    const porParada = {};

    for (const parada of paradas) {
        const item = {
            id: parada.id,
            nombre: parada.nombre,
            latitud: Number(parada.latitud),
            longitud: Number(parada.longitud),
            ruta_id: parada.ruta_id,
            orden: parada.orden,
            ruta: parada.ruta,
            color: parada.color
        };

        if (!porRuta[item.ruta_id]) porRuta[item.ruta_id] = [];
        porRuta[item.ruta_id].push(item);

        if (!porParada[item.id]) porParada[item.id] = [];
        porParada[item.id].push(item);
    }

    const todasParadas = Object.values(paradas.reduce((acc, p) => {
        if (!acc[p.id]) {
            acc[p.id] = {
                id: p.id,
                nombre: p.nombre,
                latitud: Number(p.latitud),
                longitud: Number(p.longitud)
            };
        }
        return acc;
    }, {}));

    const origenes = todasParadas
        .map(p => ({
            ...p,
            distancia: distancia(Number(origenLat), Number(origenLng), p.latitud, p.longitud)
        }))
        .filter(p => p.distancia <= 2000)
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, 10);

    const destinos = todasParadas
        .map(p => ({
            ...p,
            distancia: distancia(Number(destinoLat), Number(destinoLng), p.latitud, p.longitud)
        }))
        .filter(p => p.distancia <= 2000)
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, 10);

    if (!origenes.length || !destinos.length) {
        return res.status(404).json({
            mensaje: "No se encontraron paradas cercanas al origen o destino"
        });
    }

    const destinoIds = new Set(destinos.map(p => p.id));

    const conexiones = {};

    for (const rutaId of Object.keys(porRuta)) {
        const lista = porRuta[rutaId].sort((a, b) => a.orden - b.orden);

        for (let i = 0; i < lista.length; i++) {
            for (let j = i + 1; j < lista.length; j++) {
                const a = lista[i];
                const b = lista[j];

                if (!conexiones[a.id]) conexiones[a.id] = [];
                conexiones[a.id].push({
                    parada: b,
                    ruta_id: Number(rutaId),
                    ruta: a.ruta,
                    color: a.color
                });
            }
        }
    }

    const cola = [];

    for (const origen of origenes) {
        const rutasOrigen = porParada[origen.id] || [];

        for (const ruta of rutasOrigen) {
            cola.push({
                paradaActual: origen.id,
                rutaActual: ruta.ruta_id,
                segmentos: [],
                visitados: new Set([`${origen.id}-${ruta.ruta_id}`]),
                distanciaCaminando: origen.distancia
            });
        }
    }

    let soluciones = [];

    while (cola.length && soluciones.length < 20) {
        const estado = cola.shift();
        const paradaActual = todasParadas.find(p => p.id === estado.paradaActual);

        if (!paradaActual) continue;

        if (destinoIds.has(paradaActual.id)) {
            const destino = destinos.find(d => d.id === paradaActual.id);

            soluciones.push({
                segmentos: estado.segmentos,
                distanciaCaminando: estado.distanciaCaminando + destino.distancia,
                cantidadCamiones: estado.segmentos.length
            });

            continue;
        }

        const movimientos = conexiones[estado.paradaActual] || [];

        for (const movimiento of movimientos) {
            const clave = `${movimiento.parada.id}-${movimiento.ruta_id}`;

            if (estado.visitados.has(clave)) continue;

            const ultimo = estado.segmentos[estado.segmentos.length - 1];
            const cambiaRuta = ultimo && ultimo.ruta_id !== movimiento.ruta_id;

            const segmentos = [...estado.segmentos];

            if (!ultimo || ultimo.ruta_id !== movimiento.ruta_id) {
                segmentos.push({
                    ruta_id: movimiento.ruta_id,
                    ruta: movimiento.ruta,
                    color: movimiento.color,
                    parada_subida: ultimo ? ultimo.parada_bajada : paradaActual,
                    parada_bajada: movimiento.parada
                });
            } else {
                ultimo.parada_bajada = movimiento.parada;
            }

            if (segmentos.length > 5) continue;

            const visitados = new Set(estado.visitados);
            visitados.add(clave);

            cola.push({
                paradaActual: movimiento.parada.id,
                rutaActual: movimiento.ruta_id,
                segmentos,
                visitados,
                distanciaCaminando: estado.distanciaCaminando
            });
        }
    }

    if (!soluciones.length) {
        return res.status(404).json({
            mensaje: "No se encontró una combinación de rutas para llegar al destino"
        });
    }

    const rutasFinales = soluciones
        .sort((a, b) => {
            if (a.cantidadCamiones !== b.cantidadCamiones) {
                return a.cantidadCamiones - b.cantidadCamiones;
            }
            return a.distanciaCaminando - b.distanciaCaminando;
        })
        .slice(0, 3)
        .map(solucion => {
            const segmentos = solucion.segmentos.map((segmento, index) => ({
                ...segmento,
                numero: index + 1
            }));

            return {
                cantidad_camiones: segmentos.length,
                distancia_caminando: Math.round(solucion.distanciaCaminando),
                segmentos
            };
        });

    return res.json({
        cantidad_camiones: rutasFinales[0].cantidad_camiones,
        rutas: rutasFinales
    });
} catch (error) {
    console.error("Error buscando ruta:", error);
    res.status(500).json({
        mensaje: "Error interno al buscar la ruta"
    });
}


});

module.exports = router;
