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

    const [guardados, setGuardados] = useState([]);
    const [cargando, setCargando] = useState(true);


    // =====================================================
    // CARGAR RUTAS GUARDADAS
    // =====================================================

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
                            method: "GET",

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


    // =====================================================
    // ELIMINAR
    // =====================================================

    const eliminarGuardado = async (id) => {

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
                        ruta => ruta.id !== id
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


    // =====================================================
    // VER RUTA
    // =====================================================

    const verRuta = (ruta) => {

        console.log(
            "Ruta guardada seleccionada:",
            ruta
        );


        /*
         * IMPORTANTE:
         *
         * Actualmente /guardados solamente devuelve:
         *
         * id
         * nombre_personalizado
         * ruta_id
         * nombre
         * color
         *
         * Por eso todavía NO tenemos
         * parada_subida y parada_bajada.
         */


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


    // =====================================================
    // CARGANDO
    // =====================================================

    if (cargando) {

        return (

            <div className="guardados-page">

                <Navar />

                <main className="guardados">

                    <div className="sinGuardados">

                        <div className="icono-sin">
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


    // =====================================================
    // PANTALLA
    // =====================================================

    return (

        <div className="guardados-page">

            <Navar />


            <main className="guardados">


                {/* =========================================
                    TÍTULO
                ========================================= */}

                <div className="titulo">

                    <div className="titulo-icono">

                        <FaHeart />

                    </div>


                    <h1>
                        Mis rutas guardadas
                    </h1>


                    <p>
                        Guarda tus rutas favoritas
                        para encontrarlas fácilmente.
                    </p>

                </div>


                {/* =========================================
                    SIN GUARDADOS
                ========================================= */}

                {guardados.length === 0 ? (

                    <div className="sinGuardados">

                        <div className="icono-sin">

                            <FaHeart />

                        </div>


                        <h2>
                            No tienes rutas guardadas
                        </h2>


                        <p>
                            Cuando encuentres una ruta
                            que quieras conservar,
                            guárdala usando el corazón.
                        </p>


                        <button
                            className="btn-ver-ruta"
                            onClick={() =>
                                navigate("/")
                            }
                        >

                            Buscar una ruta

                            <FaArrowRight />

                        </button>

                    </div>

                ) : (


                    /* =====================================
                       LISTA
                    ===================================== */

                    <div className="contenedor">

                        {guardados.map(
                            (ruta, index) => (

                                <article
                                    className="ruta-card"
                                    key={
                                        ruta.id ||
                                        index
                                    }
                                >


                                    {/* =====================
                                        ICONO
                                    ===================== */}

                                    <div className="icono-ruta">

                                        <FaBus />

                                    </div>


                                    {/* =====================
                                        CONTENIDO
                                    ===================== */}

                                    <div className="ruta-contenido">


                                        {/* CABECERA */}

                                        <div className="ruta-cabecera">

                                            <div>

                                                <span className="favorita">

                                                    <FaHeart />

                                                    GUARDADA

                                                </span>


                                                <h2>

                                                    {
                                                        ruta.nombre_personalizado ||
                                                        "Ruta guardada"
                                                    }

                                                </h2>

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


                                        {/* =====================
                                            RUTA
                                        ===================== */}

                                        <div className="nombre-ruta">

                                            <div className="nombre-ruta-icono">

                                                <FaBus />

                                            </div>


                                            <div className="nombre-ruta-texto">

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


                                        {/* =====================
                                            COLOR
                                        ===================== */}

                                        <div className="color-ruta-info">

                                            <span
                                                className="punto-ruta"
                                                style={{
                                                    backgroundColor:
                                                        ruta.color ||
                                                        "#75176E"
                                                }}
                                            />


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
                                            className="btn-ver-ruta"
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

                                </article>

                            )
                        )}

                    </div>

                )}

            </main>

        </div>

    );

}


export default Guardados;