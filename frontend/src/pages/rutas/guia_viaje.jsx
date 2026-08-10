import { useState } from "react";
import "./guia_viaje.css";
import Navar from "../../components/Navar";

import {
    FaBus,
    FaHeart,
    FaMapMarkerAlt
} from "react-icons/fa";

import {
    useLocation,
    useNavigate
} from "react-router-dom";

const USUARIO_URL = import.meta.env.VITE_USUARIO_URL;

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

    const tipoRuta = datos?.tipo || "DIRECTA";


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

            const token = localStorage.getItem("token");

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


            const nombrePredeterminado =
                ruta.ruta ||
                ruta.nombre ||
                `Ruta ${ruta.ruta_id}`;


            const nombre = window.prompt(
                "¿Qué nombre quieres ponerle a esta ruta?",
                nombrePredeterminado
            );


            if (!nombre || !nombre.trim()) {
                return;
            }


            setGuardando(true);
            setMensaje("");


            const respuesta = await fetch(
                `${USUARIO_URL}/guardados`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },

                    body: JSON.stringify({
                        ruta_id: ruta.ruta_id,
                        nombre_personalizado: nombre.trim()
                    })
                }
            );


            const datosRespuesta = await respuesta.json();


            if (!respuesta.ok) {

                throw new Error(
                    datosRespuesta?.error ||
                    datosRespuesta?.mensaje ||
                    "No se pudo guardar la ruta."
                );
            }


            setMensaje(
                "Ruta guardada correctamente."
            );


        } catch (error) {

            console.error(
                "Error guardando ruta:",
                error
            );

            alert(error.message);


        } finally {

            setGuardando(false);

        }

    };


    // =====================================================
    // SIN DATOS DE NAVEGACIÓN
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
                            Regresa al inicio para buscar
                            una nueva ruta.
                        </p>

                        <button
                            className="btn-regresar"
                            onClick={() => navigate("/")}
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
    // SIN RUTAS ENCONTRADAS
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
                            No encontramos una ruta
                            disponible para tu recorrido.
                        </p>

                        <button
                            className="btn-regresar"
                            onClick={() => navigate("/")}
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

                {/* =================================================
                    ENCABEZADO
                ================================================= */}

                <div className="guia-header">

                    <h1>
                        Guía de viaje
                    </h1>

                    <p>

                        {tipoRuta === "TRANSBORDO"

                            ? "Tu recorrido requiere un transbordo."

                            : "Esta ruta te lleva directamente a tu destino."
                        }

                    </p>

                </div>


                {/* =================================================
                    AVISO DE TRANSBORDO
                ================================================= */}

                {tipoRuta === "TRANSBORDO" && (

                    <div className="aviso-transbordo">

                        <FaBus />

                        <div>

                            <strong>
                                Tu viaje requiere un transbordo
                            </strong>

                            <p>
                                Toma el primer camión,
                                baja en la parada indicada
                                y continúa con el siguiente
                                camión.
                            </p>

                        </div>

                    </div>

                )}


                {/* =================================================
                    LISTA DE RUTAS
                ================================================= */}

                <div className="lista-rutas">

                    {rutas.map((ruta, index) => {

                        const nombreRuta =
                            ruta.ruta ||
                            ruta.nombre ||
                            `Ruta ${index + 1}`;


                        const paradaSubida =
                            ruta.parada_subida?.nombre ||
                            "Parada no disponible";


                        const paradaBajada =
                            ruta.parada_bajada?.nombre ||
                            "Parada no disponible";


                        const esTransbordo =
                            tipoRuta === "TRANSBORDO";


                        const esPrimerCamion =
                            esTransbordo &&
                            index === 0;
                        return (

                            <div
                                className="ruta-guia"
                                key={
                                    ruta.ruta_id ||
                                    `${nombreRuta}-${index}`
                                }
                            >


                                <div className="ruta-header">

                                    <div>

                                        <span className="numero-ruta">

                                            {esTransbordo

                                                ? `CAMIÓN ${index + 1}`

                                                : "RUTA DIRECTA"

                                            }

                                        </span>


                                        <h2>
                                            {nombreRuta}
                                        </h2>

                                    </div>


                                    <button
                                        className="btn-guardar"
                                        onClick={() =>
                                            guardarRuta(ruta)
                                        }
                                        disabled={guardando}
                                        title="Guardar ruta"
                                    >

                                        <FaHeart />

                                    </button>

                                </div>


                                <div className="ruta-color">

                                    <span
                                        className="color-ruta"
                                        
                                        
                                    />
                                    <h1 className="color-r">color:</h1>

                                    <span>
                                        { ruta.color ||
                                            "Color no disponible"}
                                    </span>

                                </div>


                                <div className="parada">

                                    <div className="parada-icono">

                                        <FaMapMarkerAlt />

                                    </div>


                                    <div className="parada-info">

                                        <small>
                                            SUBE EN
                                        </small>

                                        <strong>
                                            {paradaSubida}
                                        </strong>

                                    </div>

                                </div>


                                <div className="paso-camion">

                                    <FaBus />

                                    <div>

                                        <small>
                                            TOMA EL CAMIÓN
                                        </small>

                                        <strong>
                                            {nombreRuta}
                                        </strong>

                                    </div>

                                </div>

                                <div className="parada">

                                    <div className="parada-icono">

                                        <FaMapMarkerAlt />

                                    </div>


                                    <div className="parada-info">

                                        <small>

                                            {esPrimerCamion

                                                ? "BAJA PARA TRANSBORDAR"

                                                : "BAJA EN"

                                            }

                                        </small>


                                        <strong>
                                            {paradaBajada}
                                        </strong>

                                    </div>

                                </div>


                                {esPrimerCamion && (

                                    <div className="transbordo">

                                        <FaMapMarkerAlt />

                                        <div>

                                            <strong>
                                                Transbordo
                                            </strong>

                                            <p>
                                                Baja en esta parada
                                                y continúa con el
                                                siguiente camión.
                                            </p>

                                        </div>

                                    </div>

                                )}

                            </div>

                        );

                    })}

                </div>


                {mensaje && (

                    <div className="mensaje-exito">

                         {mensaje}

                    </div>

                )}



                <button
                    className="btn-regresar"
                    onClick={() => navigate("/home")}
                >
                    Buscar otra ruta
                </button>

            </main>


            <Navar />

        </div>

    );
}

export default GuiaViaje;