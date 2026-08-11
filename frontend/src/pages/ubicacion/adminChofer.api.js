const ADMIN_URL = import.meta.env.VITE_ADMIN_URL;

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

export const obtenerChoferes = async (token) => {
    const respuesta = await fetch(
        `${ADMIN_URL}/choferes`,
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

export const crearChofer = async (token, datos) => {
    const respuesta = await fetch(
        `${ADMIN_URL}/choferes`,
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

export const actualizarChofer = async (
    token,
    id,
    datos
) => {
    const respuesta = await fetch(
        `${ADMIN_URL}/choferes/${id}`,
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

export const eliminarChofer = async (
    token,
    id
) => {
    const respuesta = await fetch(
        `${ADMIN_URL}/choferes/${id}`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return procesarRespuesta(respuesta);
};

