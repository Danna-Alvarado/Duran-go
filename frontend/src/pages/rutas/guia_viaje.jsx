import "./guia_viaje.css";
import Navar from "../../components/Navar";

import {
    FaBus,
    FaMapMarkerAlt,
    FaWalking,
    FaFlagCheckered
} from "react-icons/fa";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";


const API_URL = import.meta.env.VITE_RUTAS_URL;


function GuiaViaje() {


    const location = useLocation();

    const state = location.state;


    const [rutas, setRutas] = useState([]);

    const [cargando, setCargando] = useState(!!state);

    const [error, setError] = useState(
        state ? "" : "No se recibió información del viaje."
    );



    useEffect(() => {


    if (!state) {
        return;
    }



    const buscarRuta = async () => {


        try {


            setCargando(true);

            setError("");



            const respuesta = await fetch(
                `${API_URL}/buscar-ruta`,
                {
                    method:"POST",

                    headers:{
                        "Content-Type":"application/json"
                    },

                    body:JSON.stringify({

                        origenLat: state.origenLat,

                        origenLng: state.origenLng,

                        destinoLat: state.destinoLat,

                        destinoLng: state.destinoLng

                    })

                }
            );




            const datos = await respuesta.json();




            if(!respuesta.ok){

                throw new Error(
                    datos.mensaje ||
                    datos.error ||
                    "No se encontraron rutas"
                );

            }




            setRutas(
                datos.rutas || []
            );



        } catch(error){


            console.error(error);


            setError(
                error.message
            );


            setRutas([]);



        } finally{


            setCargando(false);


        }



    };



    buscarRuta();


}, [state]);





    const formatearDistancia = (metros) => {


        if (
            metros === null ||
            metros === undefined
        ) {

            return "0 m";

        }



        const distancia = Number(metros);



        if (distancia >= 1000) {


            return (
                (distancia / 1000)
                .toFixed(1)
                + " km"
            );


        }



        return (
            Math.round(distancia)
            + " m"
        );


    };





    return (

        <div className="guia-container">



            <div className="contenido">



                <h2>
                    Tu viaje
                </h2>





                {
                cargando && (

                    <div className="mensaje">

                        <p>
                            Calculando ruta...
                        </p>

                    </div>

                )
                }





                {
                !cargando && error && (

                    <div className="mensaje error">

                        <p>
                            {error}
                        </p>

                    </div>

                )
                }






                {
                !cargando &&
                !error &&
                rutas.length === 0 && (

                    <div className="mensaje">

                        <p>
                            No hay rutas disponibles.
                        </p>

                    </div>

                )
                }







                {
                !cargando &&
                rutas.length > 0 && (


                <>


                <h3 className="subtitulo">
                    Autobuses disponibles
                </h3>





                {
                rutas.map((ruta,index)=>(



                <div
                    className="ruta-viaje"
                    key={index}
                >





                    <div className="ruta-header">


                        <div className="bus-icon-container">

                            <FaBus
                                className="icono-bus"
                            />

                        </div>




                        <div>


                            <h3>
                                {ruta.nombre}
                            </h3>


                            <p>
                                Ruta #{ruta.id}
                            </p>


                        </div>


                    </div>







                    <div className="recorrido">





                        <div className="paso">


                            <div className="paso-icono">

                                <FaWalking />

                            </div>



                            <div className="paso-info">


                                <span className="paso-titulo">

                                    Camina hasta

                                </span>



                                <strong>

                                    {ruta.parada_subida}

                                </strong>



                                <span>

                                    Distancia:
                                    {" "}
                                    {
                                    formatearDistancia(
                                        ruta.distancia_origen_metros
                                    )
                                    }

                                </span>


                            </div>


                        </div>





                        <div className="linea-recorrido"/>






                        <div className="paso">


                            <div className="paso-icono">

                                <FaBus />

                            </div>




                            <div className="paso-info">


                                <span className="paso-titulo">

                                    Subir al autobús

                                </span>



                                <strong>

                                    {ruta.parada_subida}

                                </strong>



                                <span>

                                    Ruta:
                                    {" "}
                                    {ruta.nombre}

                                </span>



                            </div>


                        </div>







                        <div className="linea-recorrido"/>







                        <div className="paso">


                            <div className="paso-icono">

                                <FaMapMarkerAlt />

                            </div>




                            <div className="paso-info">


                                <span className="paso-titulo">

                                    Bajar en

                                </span>




                                <strong>

                                    {ruta.parada_bajada}

                                </strong>




                                <span>

                                    Orden de parada:
                                    {" "}
                                    {ruta.orden_bajada}

                                </span>




                            </div>



                        </div>







                        <div className="linea-recorrido"/>







                        <div className="paso">


                            <div className="paso-icono">

                                <FaFlagCheckered />

                            </div>




                            <div className="paso-info">


                                <span className="paso-titulo">

                                    Llegaste cerca de tu destino

                                </span>




                                <strong>

                                    Destino

                                </strong>




                                <span>

                                    Distancia desde parada:
                                    {" "}
                                    {
                                    formatearDistancia(
                                    ruta.distancia_destino_metros
                                    )
                                    }

                                </span>



                            </div>



                        </div>





                    </div>









                    <div className="ruta-info">


                        <p>

                            <strong>
                                Color:
                            </strong>

                            {" "}

                            {ruta.color}


                        </p>





                        <p>

                            <strong>
                                Caminata total:
                            </strong>

                            {" "}

                            {
                            formatearDistancia(
                                ruta.distancia_caminando_total_metros
                            )
                            }


                        </p>





                        <p>

                            <strong>
                                Subir:
                            </strong>

                            {" "}

                            {ruta.parada_subida}


                        </p>





                        <p>

                            <strong>
                                Bajar:
                            </strong>

                            {" "}

                            {ruta.parada_bajada}


                        </p>




                    </div>





                </div>


                ))

                }








                <button

                    className="btn-comenzar"

                    onClick={()=>{

                        console.log(
                            "Ruta elegida:",
                            rutas[0]
                        );

                    }}

                >

                    <FaBus/>

                    Comenzar viaje


                </button>





                </>

                )

                }







            </div>




            <Navar/>


        </div>


    );

}


export default GuiaViaje;