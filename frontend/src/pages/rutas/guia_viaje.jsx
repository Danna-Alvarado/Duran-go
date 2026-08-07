
import "./guia_viaje.css";
import Navar from "../../components/Navar";

import {
    FaBus,
    FaMapMarkerAlt,
    FaWalking,
    FaFlagCheckered,
    FaExchangeAlt
} from "react-icons/fa";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_RUTAS_URL;


function GuiaViaje() {

    const { state } = useLocation();

    const [rutas, setRutas] = useState([]);

    const [cargando, setCargando] = useState(
        Boolean(state)
    );

    const [error, setError] = useState(
        state
            ? ""
            : "No se recibió la información del viaje."
    );


    // =====================================================
    // BUSCAR RUTAS
    // =====================================================

    useEffect(() => {

        if (!state) {
            return;
        }

        let cancelado = false;


        const buscarRuta = async () => {

            try {

                setCargando(true);
                setError("");


                // =========================================
                // COORDENADAS
                // =========================================

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
                    "Coordenadas enviadas a buscar-ruta:",
                    {
                        origenLat,
                        origenLng,
                        destinoLat,
                        destinoLng
                    }
                );


                // =========================================
                // VALIDAR COORDENADAS
                // =========================================

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


                // =========================================
                // PETICIÓN
                // =========================================

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


                // =========================================
                // ERROR
                // =========================================

                if (!respuesta.ok) {

                    setRutas([]);

                    setError(
                        datos.mensaje ||
                        datos.error ||
                        "No fue posible encontrar una ruta."
                    );

                    setCargando(false);

                    return;
                }


                // =========================================
                // GUARDAR RECOMENDACIONES
                // =========================================

                if (
                    Array.isArray(datos.rutas)
                ) {

                    setRutas(datos.rutas);

                } else {

                    setRutas([]);

                }


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


    // =====================================================
    // FORMATEAR DISTANCIA
    // =====================================================

    const formatearDistancia = (metros) => {

        if (
            metros === null ||
            metros === undefined ||
            Number.isNaN(Number(metros))
        ) {

            return "0 m";

        }


        const distancia = Number(metros);


        if (distancia >= 1000) {

            return `${(
                distancia / 1000
            ).toFixed(1)} km`;

        }


        return `${Math.round(distancia)} m`;

    };


    // =====================================================
    // SIN INFORMACIÓN
    // =====================================================

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


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="guia-container">

            <div className="contenido">


                <h2>
                    Tu viaje
                </h2>


                {/* =================================================
                    CARGANDO
                ================================================= */}

                {cargando && (

                    <div className="mensaje">

                        <p>
                            Calculando las mejores rutas...
                        </p>

                    </div>

                )}


                {/* =================================================
                    ERROR
                ================================================= */}

                {!cargando && error && (

                    <div className="mensaje error">

                        <p>
                            {error}
                        </p>

                    </div>

                )}


                {/* =================================================
                    SIN RUTAS
                ================================================= */}

                {!cargando &&
                !error &&
                rutas.length === 0 && (

                    <div className="mensaje">

                        <p>
                            No se encontró una ruta disponible.
                        </p>

                    </div>

                )}


                {/* =================================================
                    RECOMENDACIONES
                ================================================= */}

                {!cargando &&
                !error &&
                rutas.length > 0 && (

                    <>

                        <h3 className="subtitulo">
                            Opciones para tu viaje
                        </h3>


                        {rutas.map(
                            (recomendacion, indice) => {

                                const tramos =
                                    Array.isArray(
                                        recomendacion.rutas
                                    )
                                        ? recomendacion.rutas
                                        : [];


                                return (

                                    <div
                                        className="ruta-viaje"
                                        key={`${indice}-${recomendacion.tipo}`}
                                    >


                                        {/* =================================
                                            ENCABEZADO DE RECOMENDACIÓN
                                        ================================= */}

                                        <div className="ruta-header">

                                            <div className="bus-icon-container">

                                                <FaBus
                                                    className="icono-bus"
                                                />

                                            </div>


                                            <div>

                                                <h3>
                                                    {indice === 0
                                                        ? "⭐ Mejor opción"
                                                        : `Opción ${indice + 1}`
                                                    }
                                                </h3>


                                                <p>

                                                    {recomendacion.numero_transbordos === 0
                                                        ? "Ruta directa"
                                                        : `${recomendacion.numero_transbordos} transbordo`
                                                    }

                                                </p>

                                            </div>

                                        </div>


                                        {/* =================================
                                            RECORRIDO COMPLETO
                                        ================================= */}

                                        <div className="recorrido">


                                            {/* =================================
                                                CAMINAR AL PRIMER CAMIÓN
                                            ================================= */}

                                            {tramos.length > 0 && (

                                                <>

                                                    <div className="paso">

                                                        <div className="paso-icono">

                                                            <FaWalking />

                                                        </div>


                                                        <div className="paso-info">

                                                            <span className="paso-titulo">
                                                                Camina hasta
                                                            </span>


                                                            <strong>
                                                                {tramos[0].parada_subida}
                                                            </strong>


                                                            <span>

                                                                Distancia:
                                                                {" "}

                                                                {formatearDistancia(
                                                                    tramos[0]
                                                                        .distancia_origen_metros
                                                                )}

                                                            </span>

                                                        </div>

                                                    </div>


                                                    <div className="linea-recorrido" />

                                                </>

                                            )}


                                            {/* =================================
                                                CADA CAMIÓN
                                            ================================= */}

                                            {tramos.map(
                                                (tramo, tramoIndex) => (

                                                    <div
                                                        key={`${tramo.id}-${tramoIndex}`}
                                                    >


                                                        {/* =========================
                                                            SUBIR AL AUTOBÚS
                                                        ========================= */}

                                                        <div className="paso">

                                                            <div className="paso-icono">

                                                                <FaBus />

                                                            </div>


                                                            <div className="paso-info">

                                                                <span className="paso-titulo">

                                                                    {tramoIndex === 0
                                                                        ? "Subir al autobús"
                                                                        : "Subir al segundo autobús"
                                                                    }

                                                                </span>


                                                                <strong>
                                                                    {tramo.parada_subida}
                                                                </strong>


                                                                <span>

                                                                    Ruta {tramo.nombre}

                                                                </span>


                                                                <span>

                                                                    Color:
                                                                    {" "}
                                                                    {tramo.color}

                                                                </span>

                                                            </div>

                                                        </div>


                                                        <div className="linea-recorrido" />


                                                        {/* =========================
                                                            BAJAR
                                                        ========================= */}

                                                        <div className="paso">

                                                            <div className="paso-icono">

                                                                <FaMapMarkerAlt />

                                                            </div>


                                                            <div className="paso-info">

                                                                <span className="paso-titulo">

                                                                    {tramoIndex <
                                                                    tramos.length - 1
                                                                        ? "Bajar para hacer transbordo"
                                                                        : "Bajar del autobús"
                                                                    }

                                                                </span>


                                                                <strong>
                                                                    {tramo.parada_bajada}
                                                                </strong>


                                                                <span>

                                                                    Parada #
                                                                    {" "}
                                                                    {tramo.orden_bajada}

                                                                </span>

                                                            </div>

                                                        </div>


                                                        {/* =================================
                                                            TRANSBORDO
                                                        ================================= */}

                                                        {tramoIndex <
                                                        tramos.length - 1 && (

                                                            <>

                                                                <div className="linea-recorrido" />


                                                                <div className="paso">

                                                                    <div className="paso-icono">

                                                                        <FaExchangeAlt />

                                                                    </div>


                                                                    <div className="paso-info">

                                                                        <span className="paso-titulo">
                                                                            Transbordo
                                                                        </span>


                                                                        <strong>

                                                                            Cambia a la ruta:
                                                                            {" "}
                                                                            {tramos[
                                                                                tramoIndex + 1
                                                                            ].nombre}

                                                                        </strong>


                                                                        <span>

                                                                            Camina aproximadamente
                                                                            {" "}
                                                                            {formatearDistancia(
                                                                                tramos[
                                                                                    tramoIndex + 1
                                                                                ]
                                                                                    .distancia_transbordo_metros
                                                                            )}

                                                                        </span>

                                                                    </div>

                                                                </div>


                                                                <div className="linea-recorrido" />

                                                            </>

                                                        )}

                                                    </div>

                                                )
                                            )}


                                            {/* =================================
                                                DESTINO FINAL
                                            ================================= */}

                                            {tramos.length > 0 && (

                                                <>

                                                    <div className="paso">

                                                        <div className="paso-icono">

                                                            <FaFlagCheckered />

                                                        </div>


                                                        <div className="paso-info">

                                                            <span className="paso-titulo">

                                                                Llegar a tu destino

                                                            </span>


                                                            <strong>

                                                                {state.destino?.nombre ||
                                                                "Destino"}

                                                            </strong>


                                                            <span>

                                                                Distancia desde la última parada:
                                                                {" "}

                                                                {formatearDistancia(
                                                                    tramos[
                                                                        tramos.length - 1
                                                                    ]
                                                                        .distancia_destino_metros
                                                                )}

                                                            </span>

                                                        </div>

                                                    </div>

                                                </>

                                            )}

                                        </div>


                                        {/* =================================
                                            INFORMACIÓN
                                        ================================= */}

                                        <div className="ruta-info">


                                            <p>

                                                <strong>
                                                    Tipo:
                                                </strong>

                                                {" "}

                                                {recomendacion.numero_transbordos === 0
                                                    ? "Ruta directa"
                                                    : "Ruta con transbordo"
                                                }

                                            </p>


                                            <p>

                                                <strong>
                                                    Camiones:
                                                </strong>

                                                {" "}

                                                {tramos.length}

                                            </p>


                                            <p>

                                                <strong>
                                                    Distancia caminando:
                                                </strong>

                                                {" "}

                                                {formatearDistancia(
                                                    recomendacion
                                                        .distancia_caminando_total
                                                )}

                                            </p>


                                            {tramos.map(
                                                (tramo, tramoIndex) => (

                                                    <p
                                                        key={`info-${tramo.id}-${tramoIndex}`}
                                                    >

                                                        <strong>

                                                            Ruta {tramoIndex + 1}:

                                                        </strong>

                                                        {" "}

                                                        {tramo.nombre}

                                                        {" — "}

                                                        {tramo.parada_subida}

                                                        {" → "}

                                                        {tramo.parada_bajada}

                                                    </p>

                                                )
                                            )}

                                        </div>


                                    </div>

                                );

                            }
                        )}


                        {/* =================================
                            COMENZAR VIAJE
                        ================================= */}

                        <button
                            className="btn-comenzar"
                            onClick={() => {

                                console.log(
                                    "Comenzando viaje..."
                                );

                            }}
                        >

                            <FaBus />

                            Comenzar viaje

                        </button>

                    </>

                )}

            </div>


            <Navar />

        </div>

    );

}


export default GuiaViaje;
