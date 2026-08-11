const AUTH_URL = import.meta.env.VITE_AUTH_URL;
const UBICACION_URL = import.meta.env.VITE_UBICACION_URL;

// =====================================================
// PROCESAR RESPUESTA
// =====================================================

const procesarRespuesta = async (respuesta) => {
    const texto = await respuesta.text();

    let data;

    try {
        data = texto ? JSON.parse(texto) : {};
    } catch {
        throw new Error(
            `El servidor respondió con ${respuesta.status} y no devolvió JSON`
        );
    }

    if (!respuesta.ok) {
        const error = new Error(
            data.error ||
            data.mensaje ||
            "Error en la petición"
        );

        error.status = respuesta.status;

        throw error;
    }

    return data;
};

// =====================================================
// OBTENER CHOFERES
// =====================================================
// UBICACIÓN SERVICE
//
// Devuelve:
// - chofer
// - jornada
// - ruta
// - autobús
// - ubicación
// =====================================================

export const obtenerChoferes = async (token) => {
    const respuesta = await fetch(
        `${UBICACION_URL}/admin/choferes`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await procesarRespuesta(respuesta);

    return data.choferes || [];
};

// =====================================================
// CREAR CHOFER
// =====================================================
// AUTH SERVICE
// =====================================================

export const crearChofer = async (token, datos) => {
    const respuesta = await fetch(
        `${AUTH_URL}/admin/choferes`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(datos)
        }
    );

    return procesarRespuesta(respuesta);
};

// =====================================================
// ACTUALIZAR CHOFER
// =====================================================
// AUTH SERVICE
// =====================================================

export const actualizarChofer = async (
    token,
    id,
    datos
) => {
    const respuesta = await fetch(
        `${AUTH_URL}/admin/choferes/${id}`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(datos)
        }
    );

    return procesarRespuesta(respuesta);
};

// =====================================================
// ELIMINAR CHOFER
// =====================================================
// AUTH SERVICE
// =====================================================

export const eliminarChofer = async (
    token,
    id
) => {
    const respuesta = await fetch(
        `${AUTH_URL}/admin/choferes/${id}`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return procesarRespuesta(respuesta);
};

// =====================================================
// OBTENER RUTAS
// =====================================================
// UBICACIÓN SERVICE
// =====================================================

export const obtenerRutas = async (token) => {
    const respuesta = await fetch(
        `${UBICACION_URL}/admin/rutas`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await procesarRespuesta(respuesta);

    return data.rutas || [];
};

// =====================================================
// OBTENER AUTOBUSES
// =====================================================
// UBICACIÓN SERVICE
// =====================================================

export const obtenerAutobuses = async (
    token,
    rutaId = null
) => {
    let url = `${UBICACION_URL}/admin/autobuses`;

    if (rutaId) {
        url += `?ruta_id=${rutaId}`;
    }

    const respuesta = await fetch(
        url,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await procesarRespuesta(respuesta);

    return data.autobuses || [];
};