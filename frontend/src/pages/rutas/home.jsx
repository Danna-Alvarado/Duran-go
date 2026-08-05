import "./home.css";
import Navar from "../../components/Navar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { obtenerUbicacion } from "../../services/geolocation";
import { buscarLugares } from "../../services/places";

function Home() {

  const navigate = useNavigate();

  const [ubicacion, setUbicacion] = useState("");
  const [coordenadas, setCoordenadas] = useState(null);

  const [destino, setDestino] = useState("");
  const [destinoCoords, setDestinoCoords] = useState(null);

  const [sugerencias, setSugerencias] = useState([]);
  const [cargando, setCargando] = useState(true);


  useEffect(() => {

    const cargarUbicacion = async () => {

      try {
        const datos = await obtenerUbicacion();
        setUbicacion(datos.direccion);
        setCoordenadas({
          lat: datos.lat,
          lng: datos.lng
        });

        console.log("Origen:");
        console.log({
          lat: datos.lat,
          lng: datos.lng
        });

      } catch (error) {

        console.error(error);
        alert("No se pudo obtener tu ubicación.");

      } finally {
        setCargando(false);
      }

    };


    cargarUbicacion();

  }, []);


  const confirmarDestino = () => {

    if(!destinoCoords){
        alert("Selecciona un destino");
        return;
    }


    const datosRuta = {

        origen: coordenadas,

        destino: destinoCoords

    };


    console.log("Datos para calcular ruta:");
    console.log(datosRuta);


    navigate("/guia_viaje", {
        state: datosRuta
    });

  };



  return (

    <div className="home-container">

      <div className="form-overlay">

        <h2 className="titulo-home">
          Encuentra tu mejor ruta
        </h2>

        <input
          type="text"
          value={ubicacion}
          readOnly
          className="input-home"
          placeholder="Obteniendo ubicación..."
        />


        <input
          type="text"

          value={destino}

          onChange={async (e)=>{
            const texto = e.target.value;
            setDestino(texto);
            setDestinoCoords(null);

            if(texto.length < 3){
              setSugerencias([]);
              return;

            }
            const resultados = await buscarLugares(texto);
            console.log("Resultados:", resultados);
            setSugerencias(resultados);


          }}

          placeholder="¿A dónde quieres ir?"

          className="input-home"

        />



        <div className="sugerencias">

          {
            sugerencias.map((lugar, index)=>(

              <div

                key={index}

                className="item-sugerencia"

                onClick={()=>{


                  setDestino(lugar.nombre);


                  setDestinoCoords({

                    lat: lugar.lat,

                    lng: lugar.lng

                  });


                  setSugerencias([]);


                  console.log("Destino seleccionado:");

                  console.log({

                    nombre: lugar.nombre,

                    lat: lugar.lat,

                    lng: lugar.lng

                  });


                }}

              >

                {lugar.nombre}

                <br/>

                <small>
                  {lugar.direccion}
                </small>


              </div>


            ))
          }


        </div>



        <button

          className="btn-confirmar"

          disabled={cargando}

          onClick={confirmarDestino}

        >

          {cargando 
            ? "Obteniendo ubicación..." 
            : "Buscar ruta"
          }


        </button>



      </div>


      <Navar />


    </div>

  );

}

export default Home;