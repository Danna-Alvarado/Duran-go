import "./guia_viaje.css";
import Navar from "../../components/Navar";

import {
    FaBus,
    FaWalking,
    FaMapMarkerAlt,
    FaArrowDown
} from "react-icons/fa";

import { useLocation, useNavigate } from "react-router-dom";

function GuiaViaje() {

    const location = useLocation();
    const navigate = useNavigate();

    const rutasData = location.state?.rutas;


    const rutas = rutasData?.rutas || [];

 
    if (rutas.length === 0) {

        return (

            <div className="guia-page">

                <Navar />

                <main className="guia-container">

                    <div className="guia-vacia">

                        <div className="guia-vacia-icon">
                            <FaBus />
                        </div>

                        <h2>
                            No hay una ruta disponible
                        </h2>

                        <p>
                            Regresa e intenta buscar otro destino.
                        </p>

                        <button
                            className="btn-nueva-ruta"
                            onClick={() => navigate("/")}
                        >
                            Buscar otra ruta
                        </button>

                    </div>

                </main>

            </div>

        );

    }


  

    const cantidadCamiones =
        rutas.length;


   

    const textoCamiones =
        cantidadCamiones === 1
            ? "Necesitas tomar un camión para llegar a tu destino."
            : `Necesitas tomar ${cantidadCamiones} camiones para llegar a tu destino.`;



    const obtenerNumero =
        index => {

            const numeros = [
                "PRIMER",
                "SEGUNDO",
                "TERCER",
                "CUARTO",
                "QUINTO",
                "SEXTO"
            ];

            return numeros[index] ||
                `${index + 1}°`;

        };


    return (

        <div className="guia-page">

            <Navar />

            <main className="guia-container">

                <div className="contenido-guia">


               
                    <section className="guia-header">
                        <p className="guia-descripcion">
                            {textoCamiones}
                        </p>

                    </section>
                    <section className="recorrido">

                        {rutas.map((ruta, index) => (

                            <div
                                className="tramo-ruta"
                                key={`${ruta.ruta_id}-${index}`}
                            >

                                {index > 0 && (

                                    <div className="conexion">

                                        <div className="conexion-linea"></div>

                                        <div className="conexion-icono">
                                            <FaWalking />
                                        </div>

                                        <span>
                                            Transbordo
                                        </span>

                                    </div>

                                )}



                                <article className="tarjeta-ruta">

                                    <div className="ruta-header">

                                        <div>

                                            <span className="numero-ruta">
                                                {obtenerNumero(index)} CAMIÓN
                                            </span>

                                            <h2>
                                                {ruta.ruta}
                                            </h2>

                                        </div>


                                        <div
                                            className="color-ruta"
                                            style={{
                                                backgroundColor:
                                                    ruta.color?.toLowerCase()
                                            }}
                                        >
                                            {ruta.color}
                                        </div>

                                    </div>



                                    <div className="paso-ruta">


                                        <div className="paso">

                                            <div className="paso-icono caminar">
                                                <FaWalking />
                                            </div>

                                            <div className="paso-info">

                                                <span>
                                                    Camina hasta la parada
                                                </span>

                                                <strong>
                                                    {
                                                        ruta.parada_subida?.nombre
                                                        ||
                                                        "Parada cercana"
                                                    }
                                                </strong>

                                            </div>

                                        </div>


                                        {/* LÍNEA */}

                                        <div className="linea-paso"></div>


                                        {/* SUBIR */}

                                        <div className="paso">

                                            <div className="paso-icono bus">
                                                <FaBus />
                                            </div>

                                            <div className="paso-info">

                                                <span>
                                                    Aborda este camión
                                                </span>

                                                <strong>
                                                    Ruta {ruta.ruta}
                                                </strong>

                                            </div>

                                        </div>


                                        {/* LÍNEA */}

                                        <div className="linea-paso"></div>


                                        {/* BAJAR */}

                                        <div className="paso">

                                            <div className="paso-icono bajar">
                                                <FaMapMarkerAlt />
                                            </div>

                                            <div className="paso-info">

                                                <span>
                                                    Baja en
                                                </span>

                                                <strong>

                                                    {
                                                        ruta.parada_bajada?.nombre
                                                        ||
                                                        "Parada de transbordo"
                                                    }

                                                </strong>

                                            </div>

                                        </div>


                                    </div>


                                </article>


                            </div>

                        ))}
                        


                    </section>


                  

                    <button
                        className="btn-nueva-ruta"
                        onClick={() => navigate("/home")}
                    >
                        Buscar otra ruta
                        <FaArrowDown />

                    </button>


                </div>

            </main>

        </div>

    );

}

export default GuiaViaje;