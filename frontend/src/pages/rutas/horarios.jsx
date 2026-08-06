import { useEffect, useState } from "react";
import Navar from "../../components/Navar";
import "./horarios.css";

import {
    FaBus,
    FaClock,
    FaMapMarkerAlt,
    FaInfoCircle
} from "react-icons/fa";
    const RUTAS_URL = import.meta.env.VITE_RUTAS_URL;

function Horarios() {
    const [rutas, setRutas] = useState([]);
    const [paradas, setParadas] = useState([]);
    const [horarios, setHorarios] = useState([]);

    const [rutaSeleccionada, setRutaSeleccionada] = useState("");
    const [paradaSeleccionada, setParadaSeleccionada] = useState("");

    // Cargar rutas

    useEffect(() => {
        const cargarRutas = async () => {
            try {
                const respuesta = await fetch(
                    `${RUTAS_URL}/rutas` // enlace al servicio 
                );
                const data = await respuesta.json();
                console.log(data);
                setRutas(data);

            } catch (error) {
                console.error(
                    "Error cargando rutas:",
                    error
                );
            }
        };
        cargarRutas();
    }, []);

    // Cargar paradas de una ruta
    useEffect(() => {
        if (!rutaSeleccionada) return;
        const cargarParadas = async () => {
            try {
                const respuesta = await fetch(
                  `${RUTAS_URL}/paradas/ruta/${rutaSeleccionada}` 
                );
                const data = await respuesta.json();
                setParadas(data);
            } catch (error) {
                console.error("Error cargando paradas:", error );
            }
        };
        cargarParadas();
    }, [rutaSeleccionada]);


    // Cargar horarios
    useEffect(() => {
        if (!rutaSeleccionada || !paradaSeleccionada) return;
        const cargarHorarios = async () => {
            try {
                const respuesta = await fetch(
                    `${RUTAS_URL}/horarios/buscar?ruta=${rutaSeleccionada}&parada=${paradaSeleccionada}`,
                );
                const data = await respuesta.json();

                setHorarios(data);

            } catch (error) {
                console.error(
                    "Error cargando horarios:",
                    error
                );
            }
        };

        cargarHorarios();
    }, [
        rutaSeleccionada,
        paradaSeleccionada
    ]);

    // Cambio de ruta
    const cambiarRuta = (e) => {
        const idRuta = e.target.value;
        setRutaSeleccionada(idRuta);
        setParadaSeleccionada("");
        setParadas([]);
        setHorarios([]);
    };

    // Cambio de parada
    const cambiarParada = (e) => {
        const idParada = e.target.value;
        setParadaSeleccionada(idParada);
        setHorarios([]);
    };

    return (
        <>
            <Navar />
            <div className="horarios-container">
                <div className="select-container">
                    <FaBus className="iconBus" />
                    <select
                        value={rutaSeleccionada}
                        onChange={cambiarRuta}
                    >
                        <option value=""  disabled hidden>
                            Selecciona una ruta
                        </option>
                        {rutas.map((ruta) => (
                                <option
                                    key={ruta.id}
                                    value={ruta.id}
                                >
                                    {ruta.nombre}
                                </option>
                            ))
                        }
                    </select>
                </div>

                {/* Selector de parada */}
                <div className="select-container">
                    <FaMapMarkerAlt className="iconBus" />
                    <select
                        value={paradaSeleccionada}
                        onChange={cambiarParada}
                        disabled={!rutaSeleccionada}
                    >
                        <option value="" disabled hidden>
                            Selecciona una parada
                        </option>
                        { paradas.map((parada) => (
                                <option
                                    key={parada.id}
                                    value={parada.id}
                                >
                                    {parada.nombre_parada}
                                </option>
                            ))
                        }
                    </select>
                </div>

                {/* Horarios */}
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
                                            {
                                                horario.hora_paso
                                                    .substring(0,5)
                                            }
                                        </span>
                                    </div>
                                ))
                            ) : 
                            (


                                <p className="sinHorarios">
                                    Selecciona ruta y parada.
                                </p>
                            )
                        }

                    </div>
                </div>

                <div className="infohorarios">
                    <FaInfoCircle />
                    <p>
                        Los horarios pueden variar dependiendo del tráfico.
                    </p>
                </div>
            </div>
        </>
    );

}


export default Horarios;