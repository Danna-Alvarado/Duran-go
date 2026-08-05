import { useEffect, useState } from "react";
import "./jornadachofer.css";

   const UBICACION_URL = import.meta.env.VITE_UBICACION_URL;

export default function JornadaChofer() {
    const [rutas, setRutas] = useState([]);
    const [rutaSeleccionada, setRutaSeleccionada] = useState("");
    const [colorRuta, setColorRuta] = useState("");
    const [autobuses, setAutobuses] = useState([]);
    const [autobusSeleccionado, setAutobusSeleccionado] = useState("");
    const RUTAS_URL = import.meta.env.VITE_RUTAS_URL;
 

    const token = localStorage.getItem("token");


    useEffect(() => {
    async function cargarRutas() {
        try {
            const respuesta = await fetch( `${RUTAS_URL}/rutas`);
            const data = await respuesta.json();
            setRutas(data);
        } catch (error) {
            console.error(error);
        }
    }

    cargarRutas();
}, []);


    // Cuando cambia la ruta
    async function seleccionarRuta(e) {

        const rutaId = e.target.value;

        setRutaSeleccionada(rutaId);

        const ruta = rutas.find(r => r.id == rutaId);

        if (ruta) {
            setColorRuta(ruta.color);
        }

        try {

            const respuesta = await fetch(
                `${RUTAS_URL}/autobuses/${rutaId}`
            );

            const data = await respuesta.json();

            setAutobuses(data);

            setAutobusSeleccionado("");

        } catch (error) {

            console.error(error);

        }

    }

    // Iniciar jornada
    async function iniciarJornada() {

        if (!autobusSeleccionado) {
            alert("Seleccione un autobús");
            return;
        }

        try {

            const respuesta = await fetch(
                `${UBICACION_URL}/jornada`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        autobus_id: autobusSeleccionado
                    })
                }
            );

            const data = await respuesta.json();

            alert(data.mensaje || data.error);

        } catch (error) {

            console.error(error);

        }

    }

    return (

        <div className="jornada-container">

            <div className="jornada-card">

                <h2>
                    <span className="material-symbols-outlined">
                    </span>

                    Iniciar Jornada
                </h2>

                <div className="campo">

                    <label>
                        <span className="material-symbols-outlined">
                        </span>
                        Ruta
                    </label>
                    <select
                        value={rutaSeleccionada}
                        onChange={seleccionarRuta}
                    >
                        <option value="">
                            Seleccione una ruta
                        </option>

                        {rutas.map((ruta) => (
                            <option
                                key={ruta.id}
                                value={ruta.id}
                            >
                                {ruta.nombre}

                            </option>

                        ))}

                    </select>

                </div>

                <div className="campo">
                    <label>
                        <span className="material-symbols-outlined">
                        </span>
                        Color
                    </label>

                    <input
                        type="text"
                        value={colorRuta}
                        readOnly
                    />

                </div>

                <div className="campo">

                    <label>
                        <span className="material-symbols-outlined">
                            
                        </span>

                        Autobús
                    </label>

                    <select
                        value={autobusSeleccionado}
                        onChange={(e) =>
                            setAutobusSeleccionado(e.target.value)
                        }
                    >

                        <option value="">
                            Seleccione un autobús
                        </option>

                        {autobuses.map((bus) => (
                            <option
                                key={bus.id}
                                value={bus.id}
                            >
                                {bus.numero_bus}

                            </option>

                        ))}

                    </select>

                </div>

                <button
                    className="btn-iniciar"
                    onClick={iniciarJornada}
                >
                    <span className="material-symbols-outlined">
                    </span>
                    Iniciar Jornada
                </button>

            </div>

        </div>

    );

}