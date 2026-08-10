import { useState } from "react";
import "./guia_viaje.css";
import Navar from "../../components/Navar";

import {
    FaBus,
    FaHeart,
    FaMapMarkerAlt,
    FaWalking
} from "react-icons/fa";

import {
    useLocation,
    useNavigate
} from "react-router-dom";


const USUARIO_URL =
    import.meta.env.VITE_USUARIO_URL;


function GuiaViaje() {

    const location = useLocation();
    const navigate = useNavigate();


    // =====================================================
    // DATOS RECIBIDOS DESDE HOME
    // =====================================================

    const datos = location.state?.rutas;

    const rutas = Array.isArray(datos?.rutas)
        ? datos.rutas
        : [];

    const tipoRuta = datos?.tipo || "";


    // =====================================================
    // ESTADOS
    // =====================================================

    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");


    // =====================================================
    // GUARDAR RUTA
    // =====================================================

    const guardarRuta = async (ruta) => {

        try {

            const token =
                localStorage.getItem("token");


            if (!token) {

                alert(
                    "Debes iniciar sesión para guardar una ruta."
                );

                return;

            }


            if (!ruta.ruta_id) {

                console.error(
                    "Ruta sin ID:",
                    ruta
                );

                alert(
                    "No se puede guardar esta ruta porque no tiene ID."
                );

                return;

            }


            const nombreRuta =
                ruta.ruta ||
                `Ruta ${ruta.ruta_id}`;


            const nombre =
                window.prompt(
                    "¿Qué nombre quieres ponerle a esta ruta?",
                    nombreRuta
                );


            if (
                !nombre ||
                !nombre.trim()
            ) {

                return;

            }


            setGuardando(true);
            setMensaje("");


            console.log(
                "Guardando ruta:",
                {
                    ruta_id:
                        ruta.ruta_id,

                    nombre_personalizado:
                        nombre.trim()
                }
            );


            const respuesta =
                await fetch(
                    `${USUARIO_URL}/guardados`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${token}`
                        },

                        body: JSON.stringify({

                            ruta_id:
                                ruta.ruta_id,

                            nombre_personalizado:
                                nombre.trim()

                        })
                    }
                );


            const datosRespuesta =
                await respuesta.json();


            console.log(
                "Respuesta guardar:",
                datosRespuesta
            );


            if (!respuesta.ok) {

                throw new Error(
                    datosRespuesta?.error ||
                    datosRespuesta?.mensaje ||
                    "No se pudo guardar la ruta."
                );

            }


            setMensaje(
                "❤️ Ruta guardada correctamente."
            );


        } catch (error) {

            console.error(
                "Error guardando ruta:",
                error
            );

            alert(
                error.message
            );


        } finally {

            setGuardando(false);

        }

    };


    // =====================================================
    // NO HAY DATOS
    // =====================================================

    if (!location.state) {

        return (

            <div className="guia-container">

                <main className="guia-contenido">

                    <div className="sin-rutas">

                        <FaBus />

                        <h1>
                            No hay una ruta seleccionada
                        </h1>

                        <p>
                            Regresa al inicio para
                            buscar una nueva ruta.
                        </p>

                        <button
                            className="btn-regresar"
                            onClick={() =>
                                navigate("/")
                            }
                        >
                            Buscar ruta
                        </button>

                    </div>

                </main>

                <Navar />

            </div>

        );

    }


    // =====================================================
    // NO SE ENCONTRARON RUTAS
    // =====================================================

    if (rutas.length === 0) {

        return (

            <div className="guia-container">

                <main className="guia-contenido">

                    <div className="sin-rutas">

                        <FaBus />

                        <h1>
                            No encontramos una ruta
                        </h1>

                        <p>
                            No se encontró una ruta
                            disponible para tu recorrido.
                        </p>

                        <button
                            className="btn-regresar"
                            onClick={() =>
                                navigate("/")
                            }
                        >
                            Buscar otra ruta
                        </button>

                    </div>

                </main>

                <Navar />

            </div>

        );

    }


    // =====================================================
    // GUÍA DE VIAJE
    // =====================================================

    return (

        <div className="guia-container">

            <main className="guia-contenido">


                {/* =========================================
                    ENCABEZADO
                ========================================= */}

                <div className="guia-header">

                    <h1>
                        Guía de viaje
                    </h1>

                    <p>

                        {tipoRuta === "TRANSBORDO"

                            ? "Necesitas tomar 2 camiones."

                            : "Puedes llegar directamente a tu destino."

                        }

                    </p>

                </div>


                {/* =========================================
                    AVISO DE TRANSBORDO
                ========================================= */}

                {tipoRuta === "TRANSBORDO" && (

                    <div className="aviso-transbordo">

                        <FaBus />

                        <div>

                            <strong>
                                Ruta con transbordo
                            </strong>

                            <p>
                                Toma el primer camión,
                                baja en el punto de
                                transbordo y después
                                toma el segundo.
                            </p>

                        </div>

                    </div>

                )}


                {/* =========================================
                    RUTAS
                ========================================= */}

                <div className="lista-rutas">

                    {rutas.map(
                        (ruta, index) => (

                            <div
                                className="ruta-guia"
                                key={
                                    ruta.ruta_id ||
                                    index
                                }
                            >


                                {/* =========================
                                    CABECERA
                                ========================= */}

                                <div className="ruta-header">

                                    <div>

                                        <span className="numero-ruta">

                                            {tipoRuta ===
                                            "TRANSBORDO"

                                                ? `CAMIÓN ${ruta.numero}`

                                                : "RUTA DIRECTA"

                                            }

                                        </span>


                                        <h2>
                                            {ruta.ruta ||
                                                "Ruta sin nombre"}
                                        </h2>

                                    </div>


                                    <button
                                        className="btn-guardar"
                                        onClick={() =>
                                            guardarRuta(
                                                ruta
                                            )
                                        }
                                        disabled={
                                            guardando
                                        }
                                        title="Guardar ruta"
                                    >

                                        <FaHeart />

                                    </button>

                                </div>


                                {/* =========================
                                    COLOR
                                ========================= */}

                                <div className="ruta-color">

                                    <span
                                        className="color-ruta"
                                        style={{
                                            backgroundColor:
                                                ruta.color ||
                                                "#75176E"
                                        }}
                                    />

                                    <span>
                                        {ruta.color ||
                                            "Color no disponible"}
                                    </span>

                                </div>


                                {/* =========================
                                    CAMINAR
                                ========================= */}

                                <div className="paso">

                                    <div className="paso-icono caminar">

                                        <FaWalking />

                                    </div>


                                    <div className="paso-info">

                                        <small>
                                            PASO 1
                                        </small>

                                        <strong>
                                            Dirígete a la parada
                                        </strong>

                                        <span>
                                            Camina hasta la
                                            parada indicada.
                                        </span>

                                    </div>

                                </div>


                                {/* =========================
                                    SUBIDA
                                ========================= */}

                                <div className="parada">

                                    <div className="parada-icono">

                                        <FaMapMarkerAlt />

                                    </div>


                                    <div className="parada-info">

                                        <small>
                                            SUBE EN
                                        </small>

                                        <strong>

                                            {
                                                ruta
                                                    .parada_subida
                                                    ?.nombre ||

                                                "Parada no disponible"

                                            }

                                        </strong>

                                    </div>

                                </div>


                                {/* =========================
                                    CAMIÓN
                                ========================= */}

                                <div className="paso-camion">

                                    <FaBus />

                                    <div>

                                        <small>
                                            TOMA EL CAMIÓN
                                        </small>

                                        <strong>
                                            {ruta.ruta}
                                        </strong>

                                    </div>

                                </div>


                                {/* =========================
                                    BAJADA
                                ========================= */}

                                <div className="parada">

                                    <div className="parada-icono">

                                        <FaMapMarkerAlt />

                                    </div>


                                    <div className="parada-info">

                                        <small>

                                            {tipoRuta ===
                                                "TRANSBORDO" &&
                                            index === 0

                                                ? "BAJA PARA TRANSBORDAR"

                                                : "BAJA EN"

                                            }

                                        </small>


                                        <strong>

                                            {
                                                ruta
                                                    .parada_bajada
                                                    ?.nombre ||

                                                "Parada no disponible"

                                            }

                                        </strong>

                                    </div>

                                </div>


                                {/* =========================
                                    TRANSBORDO
                                ========================= */}

                                {tipoRuta ===
                                    "TRANSBORDO" &&

                                    index === 0 && (

                                    <div className="transbordo">

                                        <FaMapMarkerAlt />

                                        <div>

                                            <strong>
                                                Transbordo
                                            </strong>

                                            <p>
                                                Baja aquí y
                                                camina hacia
                                                la siguiente
                                                parada para
                                                tomar el segundo
                                                camión.
                                            </p>

                                        </div>

                                    </div>

                                )}

                            </div>

                        )
                    )}

                </div>


                {/* =========================================
                    MENSAJE
                ========================================= */}

                {mensaje && (

                    <div className="mensaje-exito">

                        {mensaje}

                    </div>

                )}


                {/* =========================================
                    REGRESAR
                ========================================= */}

                <button
                    className="btn-regresar"
                    onClick={() =>
                        navigate("/")
                    }
                >
                    Buscar otra ruta
                </button>


            </main>


            <Navar />

        </div>

    );

}


export default GuiaViaje;