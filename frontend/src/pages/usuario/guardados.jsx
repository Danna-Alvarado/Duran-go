import { useEffect, useState } from "react";
import "./guardados.css";
import Navar from "../../components/Navar";

import {
    FaBus,
    FaTrash,
    FaBookmark
} from "react-icons/fa";
const USUARIO_URL = import.meta.env.VITE_USUARIO_URL;

function Guardados() {

    const [guardados, setGuardados] = useState([]);
    const [cargando, setCargando] = useState(true);
    

    useEffect(() => {

        async function cargar() {

            try {

                const token = localStorage.getItem("token");

                const respuesta = await fetch(
                     `${USUARIO_URL}/guardados`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (!respuesta.ok) {
                    throw new Error("Error al obtener guardados");
                }

                const datos = await respuesta.json();

                setGuardados(datos);

            } catch (error) {

                console.error(error);

            } finally {

                setCargando(false);

            }

        }

        cargar();

    }, []);

    async function eliminarGuardado(id) {

        try {

            const token = localStorage.getItem("token");

            const respuesta = await fetch(

                `${USUARIO_URL}/guardados/${id}`,

                {

                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }

                }

            );

            if (!respuesta.ok) {

                throw new Error("No se pudo eliminar.");

            }

            setGuardados((anterior) =>
                anterior.filter((ruta) => ruta.id !== id)
            );

        } catch (error) {

            console.error(error);

        }

    }

    return (

        <>
            <Navar />
            <div className="guardados">
                <div className="titulo">
                    <h1>Mis rutas guardadas</h1>
                    <p>
                        Tus rutas favoritas aparecerán aquí.
                    </p>

                </div>

                {

                    cargando ?

                        <div className="sinGuardados">

                            <h2>Cargando...</h2>

                        </div>

                    :

                    guardados.length === 0 ?

                        <div className="sinGuardados">

                            <FaBookmark
                                size={70}
                                color="#75176E"
                            />

                            <h2
                                style={{
                                    marginTop:20,
                                    color:"#75176E"
                                }}
                            >
                                No tienes rutas guardadas
                            </h2>

                            <p
                                style={{
                                    marginTop:10
                                }}
                            >
                                Guarda una ruta cuando busques un destino.
                            </p>

                        </div>

                    :

                        <div className="contenedor">

                            {

                                guardados.map((ruta) => (

                                    <div
                                        className="ruta-card"
                                        key={ruta.id}
                                    >

                                        <div className="parteSuperior">

                                            <div className="bus">

                                                <FaBus />

                                            </div>

                                            <div className="info">

                                                <h2>

                                                    {ruta.nombre_personalizado}

                                                </h2>

                                                <div className="ruta-info">

                                                    <span className="nombre-ruta">

                                                        {ruta.nombre}

                                                    </span>

                                                    <div
                                                        className="color-ruta"
                                                        style={{
                                                            backgroundColor: ruta.color
                                                        }}
                                                    ></div>

                                                </div>

                                            </div>

                                        </div>

                                        <div className="acciones">

                                            <button
                                                className="eliminar"
                                                onClick={() => eliminarGuardado(ruta.id)}
                                            >

                                                <FaTrash />

                                            </button>

                                        </div>

                                    </div>

                                ))

                            }

                        </div>

                }

            </div>

        </>

    );

}

export default Guardados;