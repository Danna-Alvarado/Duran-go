
import "./guia_viaje.css";
import Navar from "../../components/Navar";
import { FaBus, FaMapMarkerAlt } from "react-icons/fa";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_RUTAS_URL;

function GuiaViaje() {

    const { state } = useLocation();

    const [rutas, setRutas] = useState([]);
    const [tipo, setTipo] = useState("");
    const [cargando, setCargando] = useState(Boolean(state));

    const [error, setError] = useState(
        state
            ? ""
            : "No se recibió la información del viaje."
    );


    // ============================================
    // BUSCAR RUTA
    // ============================================

    useEffect(() => {

        if (!state) {
            return;
        }

        let cancelado = false;

        const buscarRuta = async () => {

            try {

                // ========================================
                // COORDENADAS
                // ========================================

                const origenLat =
                    state.origen?.lat ??
                    state.origenLat;

                const origenLng =
                    state.origen?.lng ??
                    state.origenLng;

                const destinoLat =
                    state.destino?.lat ??
                    state.destinoLat;

                const destinoLng =
                    state.destino?.lng ??
                    state.destinoLng;


                console.log(
                    "Coordenadas enviadas:",
                    {
                        origenLat,
                        origenLng,
                        destinoLat,
                        destinoLng
                    }
                );


                // ========================================
                // VALIDAR
                // ========================================

                if (
                    origenLat == null ||
                    origenLng == null ||
                    destinoLat == null ||
                    destinoLng == null
                ) {

                    if (!cancelado) {

                        setError(
                            "No se encontraron las coordenadas de origen y destino."
                        );

                        setCargando(false);

                    }

                    return;
                }


                // ========================================
                // PETICIÓN
                // ========================================

                const respuesta = await fetch(
                    `${API_URL}/buscar-ruta`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            origenLat,
                            origenLng,
                            destinoLat,
                            destinoLng
                        })
                    }
                );


                const datos = await respuesta.json();


                console.log(
                    "Respuesta buscar-ruta:",
                    datos
                );


                if (cancelado) {
                    return;
                }


                // ========================================
                // ERROR
                // ========================================

                if (!respuesta.ok) {

                    setRutas([]);
                    setTipo("");

                    setError(
                        datos.mensaje ||
                        datos.error ||
                        "No fue posible encontrar una ruta."
                    );

                    setCargando(false);

                    return;
                }


                // ========================================
                // GUARDAR SOLO LAS RUTAS
                // ========================================

                setRutas(
                    Array.isArray(datos.rutas)
                        ? datos.rutas
                        : []
                );

                setTipo(
                    datos.tipo || ""
                );

                setError("");
                setCargando(false);


            } catch (err) {

                if (cancelado) {
                    return;
                }

                console.error(
                    "Error buscando ruta:",
                    err
                );

                setRutas([]);
                setTipo("");

                setError(
                    "No fue posible calcular la ruta."
                );

                setCargando(false);

            }

        };


        buscarRuta();


        return () => {

            cancelado = true;

        };

    }, [state]);


    // ============================================
    // SIN INFORMACIÓN
    // ============================================

    if (!state) {

        return (

            <div className="guia-container">

                <div className="contenido">

                    <h2>
                        Tu viaje
                    </h2>

                    <div className="mensaje error">

                        <p>
                            No se recibió la información del viaje.
                        </p>

                    </div>

                </div>

                <Navar />

            </div>

        );

    }


    // ============================================
    // RENDER
    // ============================================

    return (

        <div className="guia-container">

            <div className="contenido">

                <h2>
                    Tu viaje
                </h2>


                {/* ==================================
                    CARGANDO
                ================================== */}

                {cargando && (

                    <div className="mensaje">

                        <p>
                            Buscando los autobuses que necesitas...
                        </p>

                    </div>

                )}


                {/* ==================================
                    ERROR
                ================================== */}

                {!cargando && error && (

                    <div className="mensaje error">

                        <p>
                            {error}
                        </p>

                    </div>

                )}


                {/* ==================================
                    SIN RUTAS
                ================================== */}

                {!cargando &&
                !error &&
                rutas.length === 0 && (

                    <div className="mensaje">

                        <p>
                            No se encontró una ruta disponible.
                        </p>

                    </div>

                )}


                {/* ==================================
                    RUTAS
                ================================== */}

                {!cargando &&
                !error &&
                rutas.length > 0 && (

                    <div className="rutas-container">

                        <h3 className="subtitulo">

                            {tipo === "TRANSBORDO"
                                ? "Necesitas tomar 2 autobuses"
                                : "Necesitas tomar 1 autobús"
                            }

                        </h3>


                        {rutas.map((ruta, index) => (

                            <div
                                className="ruta-viaje"
                                key={`${ruta.ruta_id}-${index}`}
                            >

                                {/* =========================
                                    RUTA
                                ========================= */}

                                <div className="ruta-header">

                                    <div className="bus-icon-container">

                                        <FaBus
                                            className="icono-bus"
                                        />

                                    </div>


                                    <div>

                                        <span>
                                            Autobús {index + 1}
                                        </span>

                                        <h3>
                                            {ruta.ruta}
                                        </h3>

                                    </div>

                                </div>


                                {/* =========================
                                    PARADA DE SUBIDA
                                ========================= */}

                                <div className="parada-info">

                                    <FaBus />

                                    <div>

                                        <span>
                                            Sube en
                                        </span>

                                        <strong>
                                            {ruta.parada_subida}
                                        </strong>

                                    </div>

                                </div>


                                {/* =========================
                                    PARADA DE BAJADA
                                ========================= */}

                                <div className="parada-info">

                                    <FaMapMarkerAlt />

                                    <div>

                                        <span>
                                            Baja en
                                        </span>

                                        <strong>
                                            {ruta.parada_bajada}
                                        </strong>

                                    </div>

                                </div>


                            </div>

                        ))}

                    </div>

                )}

            </div>


            <Navar />

        </div>

    );

}

export default GuiaViaje;
