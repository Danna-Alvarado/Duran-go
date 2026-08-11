import { useEffect, useState } from "react";
import Navar from "../../components/Navar";
import "./horarios.css";

import {
    FaBus,
    FaClock,
    FaMapMarkerAlt,
    FaInfoCircle,
    FaSearch
} from "react-icons/fa";

const RUTAS_URL = import.meta.env.VITE_RUTAS_URL;

function Horarios() {

    const [rutas, setRutas] = useState([]);
    const [paradas, setParadas] = useState([]);
    const [horarios, setHorarios] = useState([]);

    const [rutaSeleccionada, setRutaSeleccionada] = useState("");
    const [paradaSeleccionada, setParadaSeleccionada] = useState("");

    const [busqueda, setBusqueda] = useState("");

    const [cargandoParadas, setCargandoParadas] = useState(false);
    const [errorParadas, setErrorParadas] = useState("");

    // =========================================
    // CARGAR RUTAS
    // =========================================

    useEffect(() => {

        const cargarRutas = async () => {

            try {

                const respuesta = await fetch(`${RUTAS_URL}/rutas`);

                if (!respuesta.ok) {
                    throw new Error(`Error HTTP: ${respuesta.status}`);
                }

                const data = await respuesta.json();

                console.log("Rutas cargadas:", data);

                setRutas(data);

            } catch (error) {

                console.error("Error cargando rutas:", error);

            }

        };

        cargarRutas();

    }, []);


    // =========================================
    // CARGAR PARADAS DE LA RUTA
    // =========================================

    useEffect(() => {

        if (!rutaSeleccionada) {
            return;
        }

        const cargarParadas = async () => {

            try {

                setCargandoParadas(true);
                setErrorParadas("");

                console.log(
                    "Cargando paradas de ruta:",
                    rutaSeleccionada
                );

                const respuesta = await fetch(
                    `${RUTAS_URL}/paradas/ruta/${rutaSeleccionada}`
                );

                console.log(
                    "Respuesta paradas:",
                    respuesta.status
                );

                if (!respuesta.ok) {
                    throw new Error(
                        `Error HTTP: ${respuesta.status}`
                    );
                }

                const data = await respuesta.json();

                console.log("Paradas recibidas:", data);

                /*
                 * Soportamos tanto:
                 *
                 * [
                 *   {...},
                 *   {...}
                 * ]
                 *
                 * como:
                 *
                 * {
                 *   paradas: [...]
                 * }
                 */

                const listaParadas = Array.isArray(data)
                    ? data
                    : data.paradas || [];

                setParadas(listaParadas);

                if (listaParadas.length === 0) {
                    setErrorParadas(
                        "Esta ruta no tiene paradas registradas."
                    );
                }

            } catch (error) {

                console.error(
                    "Error cargando paradas:",
                    error
                );

                setParadas([]);

                setErrorParadas(
                    "No se pudieron cargar las paradas."
                );

            } finally {

                setCargandoParadas(false);

            }

        };

        cargarParadas();

    }, [rutaSeleccionada]);


    // =========================================
    // CARGAR HORARIOS
    // =========================================

    useEffect(() => {

        if (!rutaSeleccionada || !paradaSeleccionada) {
            return;
        }

        const cargarHorarios = async () => {

            try {

                console.log(
                    "Buscando horarios:",
                    {
                        ruta: rutaSeleccionada,
                        parada: paradaSeleccionada
                    }
                );

                const respuesta = await fetch(
                    `${RUTAS_URL}/horarios/buscar?ruta=${rutaSeleccionada}&parada=${paradaSeleccionada}`
                );

                if (!respuesta.ok) {
                    throw new Error(
                        `Error HTTP: ${respuesta.status}`
                    );
                }

                const data = await respuesta.json();

                console.log("Horarios recibidos:", data);

                setHorarios(
                    Array.isArray(data)
                        ? data
                        : data.horarios || []
                );

            } catch (error) {

                console.error(
                    "Error cargando horarios:",
                    error
                );

                setHorarios([]);

            }

        };

        cargarHorarios();

    }, [rutaSeleccionada, paradaSeleccionada]);


    // =========================================
    // SELECCIONAR RUTA DESDE EL BUSCADOR
    // =========================================

    const seleccionarRuta = (ruta) => {

        console.log("Ruta seleccionada:", ruta);

        setRutaSeleccionada(String(ruta.id));

        setBusqueda(ruta.nombre);

        setParadaSeleccionada("");

        setParadas([]);

        setHorarios([]);

        setErrorParadas("");

    };


    // =========================================
    // SELECCIONAR PARADA
    // =========================================

    const cambiarParada = (e) => {

        const idParada = e.target.value;

        console.log("Parada seleccionada:", idParada);

        setParadaSeleccionada(idParada);

        setHorarios([]);

    };


    // =========================================
    // BUSCADOR
    // =========================================

    const rutasFiltradas = rutas.filter((ruta) =>
        ruta.nombre
            ?.toLowerCase()
            .includes(busqueda.toLowerCase())
    );


    return (
        <>
            <Navar />

            <div className="horarios-container">

                {/* =================================
                    TÍTULO
                ================================= */}

                <div className="titulo-horarios">

                    <FaClock />

                    <div>

                        <h1>Horarios</h1>

                        <p>
                            Consulta los horarios de tus rutas
                        </p>

                    </div>

                </div>


                {/* =================================
                    BUSCADOR
                ================================= */}

                <div className="buscador-rutas">

                    <FaSearch className="iconSearch" />

                    <input
                        type="text"
                        placeholder="Buscar una ruta..."
                        value={busqueda}
                        onChange={(e) => {

                            setBusqueda(e.target.value);

                            /*
                             * Si el usuario empieza a escribir
                             * otra búsqueda, limpiamos la selección
                             */
                            setRutaSeleccionada("");
                            setParadaSeleccionada("");
                            setParadas([]);
                            setHorarios([]);
                            setErrorParadas("");

                        }}
                    />

                </div>


                {/* =================================
                    RESULTADOS
                ================================= */}

                {busqueda.trim() !== "" && !rutaSeleccionada && (

                    <div className="resultados-rutas">

                        {rutasFiltradas.length > 0 ? (

                            rutasFiltradas.map((ruta) => (

                                <button
                                    type="button"
                                    key={ruta.id}
                                    className="resultado-ruta"
                                    onClick={() =>
                                        seleccionarRuta(ruta)
                                    }
                                >

                                    <FaBus />

                                    <div>

                                        <strong>
                                            {ruta.nombre}
                                        </strong>

                                        <span>
                                            Ver paradas y horarios
                                        </span>

                                    </div>

                                </button>

                            ))

                        ) : (

                            <div className="sin-resultados">

                                <FaBus />

                                <p>
                                    No encontramos esa ruta.
                                </p>

                            </div>

                        )}

                    </div>

                )}


                {/* =================================
                    RUTA SELECCIONADA
                ================================= */}

                {rutaSeleccionada && (

                    <div className="ruta-seleccionada">

                        <FaBus />

                        <div>

                            <span>Ruta seleccionada</span>

                            <strong>
                                {busqueda}
                            </strong>

                        </div>

                    </div>

                )}


                {/* =================================
                    SELECT DE PARADA
                ================================= */}

                <div className="select-container">

                    <FaMapMarkerAlt className="iconBus" />

                    <select
                        value={paradaSeleccionada}
                        onChange={cambiarParada}
                        disabled={
                            !rutaSeleccionada ||
                            cargandoParadas ||
                            paradas.length === 0
                        }
                    >

                        <option value="" disabled>

                            {!rutaSeleccionada
                                ? "Primero busca una ruta"
                                : cargandoParadas
                                    ? "Cargando paradas..."
                                    : paradas.length === 0
                                        ? "No hay paradas disponibles"
                                        : "Selecciona una parada"
                            }

                        </option>

                        {paradas.map((parada) => (

                            <option
                                key={parada.id}
                                value={parada.id}
                            >

                                {parada.nombre_parada}

                            </option>

                        ))}

                    </select>

                </div>


                {/* =================================
                    ERROR PARADAS
                ================================= */}

                {errorParadas && (

                    <div className="error-paradas">

                        <FaInfoCircle />

                        <span>
                            {errorParadas}
                        </span>

                    </div>

                )}


                {/* =================================
                    HORARIOS
                ================================= */}

                <div className="card">

                    <h2>
                        Horarios disponibles
                    </h2>

                    <div className="listaHoras">

                        {horarios.length > 0 ? (

                            horarios.map((horario) => (

                                <div
                                    className="hora"
                                    key={horario.id}
                                >

                                    <FaClock className="clock" />

                                    <span>
                                        {horario.hora_paso.substring(0, 5)}
                                    </span>

                                </div>

                            ))

                        ) : (

                            <p className="sinHorarios">

                                {!rutaSeleccionada
                                    ? "Busca y selecciona una ruta."
                                    : !paradaSeleccionada
                                        ? "Selecciona una parada."
                                        : "No hay horarios disponibles."
                                }

                            </p>

                        )}

                    </div>

                </div>



                <div className="infohorarios">

                    <FaInfoCircle />

                    <p>
                        Los horarios pueden variar dependiendo
                        del tráfico.
                    </p>

                </div>

            </div>
        </>
    );
}

export default Horarios;