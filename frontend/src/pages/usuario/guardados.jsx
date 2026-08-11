import { useEffect, useState } from "react";
import "./guardados.css";
import Navar from "../../components/Navar";

import {
    FaBus,
    FaTrash,
    FaHeart,
    FaArrowRight
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

const USUARIO_URL =
    import.meta.env.VITE_USUARIO_URL;

function Guardados() {

    const navigate = useNavigate();

    const [guardados, setGuardados] =
        useState([]);

    const [cargando, setCargando] =
        useState(true);

    useEffect(() => {

        const cargarGuardados = async () => {

            try {

                const token =
                    localStorage.getItem("token");

                if (!token) {

                    setGuardados([]);

                    return;

                }

                const respuesta =
                    await fetch(
                        `${USUARIO_URL}/guardados`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );

                const datos =
                    await respuesta.json();

                console.log(
                    "Guardados:",
                    datos
                );

                if (!respuesta.ok) {

                    throw new Error(
                        datos?.mensaje ||
                        datos?.error ||
                        "No se pudieron cargar las rutas guardadas."
                    );

                }

                const lista =
                    Array.isArray(datos)
                        ? datos
                        : datos.guardados || [];

                setGuardados(lista);

            } catch (error) {

                console.error(
                    "Error cargando guardados:",
                    error
                );

                setGuardados([]);

            } finally {

                setCargando(false);

            }

        };

        cargarGuardados();

    }, []);

    const eliminarGuardado =
        async (id) => {

            const confirmar =
                window.confirm(
                    "¿Quieres eliminar esta ruta de tus guardados?"
                );

            if (!confirmar) {
                return;
            }

            try {

                const token =
                    localStorage.getItem("token");

                if (!token) {
                    return;
                }

                const respuesta =
                    await fetch(
                        `${USUARIO_URL}/guardados/${id}`,
                        {
                            method: "DELETE",

                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );

                const datos =
                    await respuesta.json();

                if (!respuesta.ok) {

                    throw new Error(
                        datos?.mensaje ||
                        datos?.error ||
                        "No se pudo eliminar la ruta."
                    );

                }

                setGuardados(
                    anteriores =>
                        anteriores.filter(
                            ruta =>
                                ruta.id !== id
                        )
                );

            } catch (error) {

                console.error(
                    "Error eliminando ruta:",
                    error
                );

                alert(
                    error.message
                );

            }

        };

    const verRuta =
        (ruta) => {

            navigate(
                "/guia_viaje",
                {
                    state: {

                        rutas: {

                            tipo: "DIRECTA",

                            cantidad_camiones: 1,

                            rutas: [

                                {
                                    ruta_id:
                                        ruta.ruta_id,

                                    ruta:
                                        ruta.nombre ||
                                        "Ruta",

                                    nombre:
                                        ruta.nombre ||
                                        "Ruta",

                                    color:
                                        ruta.color ||
                                        "#75176E",

                                    parada_subida:
                                        null,

                                    parada_bajada:
                                        null

                                }

                            ]

                        }

                    }

                }
            );

        };

    if (cargando) {

        return (

            <div className="guardados-page">

                <Navar />

                <main className="guardados">

                    <div className="guardados-cargando">

                        <div className="guardados-cargando-icono">
                            <FaBus />
                        </div>

                        <h2>
                            Cargando tus rutas...
                        </h2>

                        <p>
                            Estamos buscando tus rutas guardadas.
                        </p>

                    </div>

                </main>

            </div>

        );

    }

    return (

        <div className="guardados-page">

            <Navar />

            <main className="guardados">

                <header className="guardados-header">

                    <div className="guardados-icono">
                        <FaHeart />
                    </div>

                </header>

                {guardados.length === 0 ? (

                    <section className="sin-guardados">

                        <div className="sin-guardados-icono">
                            <FaHeart />
                        </div>

                        <h2>
                            Aún no tienes rutas guardadas
                        </h2>

                        <p>
                            Cuando encuentres una ruta que
                            quieras conservar, presiona el
                            corazón para guardarla.
                        </p>

                        <button
                            className="btn-buscar"
                            onClick={() =>
                                navigate("/")
                            }
                        >
                            Buscar una ruta
                            <FaArrowRight />
                        </button>

                    </section>

                ) : (

                    <section className="lista-guardados">

                        {guardados.map(
                            (ruta, index) => (

                                <article
                                    className="guardado-card"
                                    key={
                                        ruta.id ||
                                        index
                                    }
                                >

                                    <div className="guardado-contenido">

                                        <div className="guardado-top">

                                            <div className="guardado-icono-bus">
                                                <FaBus />
                                            </div>

                                            <button
                                                className="btn-eliminar"
                                                title="Eliminar ruta"
                                                onClick={() =>
                                                    eliminarGuardado(
                                                        ruta.id
                                                    )
                                                }
                                            >
                                                <FaTrash />
                                            </button>

                                        </div>

                                        <span className="guardado-label">
                                            <FaHeart />
                                            GUARDADA
                                        </span>

                                        <h2>
                                            {
                                                ruta.nombre_personalizado ||
                                                "Ruta guardada"
                                            }
                                        </h2>

                                        <div className="ruta-real">

                                            <div className="ruta-real-icono">
                                                <FaBus />
                                            </div>

                                            <div>

                                                <span>
                                                    RUTA
                                                </span>

                                                <strong>
                                                    {
                                                        ruta.nombre ||
                                                        "Ruta sin nombre"
                                                    }
                                                </strong>

                                            </div>

                                        </div>

                                        <div className="guardado-footer">

                                            <div className="color-info">

                                                <div className="color-icono">
                                                    <FaBus />
                                                </div>

                                                <div>

                                                    <span>
                                                        COLOR DE LA RUTA
                                                    </span>

                                                    <strong>
                                                        {
                                                            ruta.color ||
                                                            "No disponible"
                                                        }
                                                    </strong>

                                                </div>

                                            </div>

                                            <button
                                                className="btn-ver"
                                                onClick={() =>
                                                    verRuta(
                                                        ruta
                                                    )
                                                }
                                            >
                                                Ver ruta
                                                <FaArrowRight />
                                            </button>

                                        </div>

                                    </div>

                                </article>

                            )
                        )}

                    </section>

                )}

            </main>

        </div>

    );

}

export default Guardados;
