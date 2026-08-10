import "./guia_viaje.css";
import Navar from "../../components/Navar";
import { FaBus, FaMapMarkerAlt, FaWalking, FaFlagCheckered } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

function GuiaViaje() {

  const location = useLocation();
  const navigate = useNavigate();

  const rutas = location.state?.rutas || [];
  const origen = location.state?.origen;
  const destino = location.state?.destino;

  console.log("Rutas recibidas:", rutas);
  console.log("Origen:", origen);
  console.log("Destino:", destino);


  const comenzarViaje = () => {

    navigate("/viaje", {
      state: {
        rutas,
        origen,
        destino
      }
    });

  };


  return (

    <div className="guia-container">

      <div className="contenido">

        <h2>Autobuses a tomar</h2>


        {rutas.length === 0 ? (

          <div className="mensaje-sin-ruta">

            <FaBus className="icono-bus-grande"/>

            <h3>No encontramos una ruta</h3>

            <p>
              No encontramos autobuses que pasen cerca
              de tu ubicación y destino.
            </p>

            <button
              className="btn-regresar"
              onClick={() => navigate("/")}
            >
              Regresar
            </button>

          </div>

        ) : (

          <>

            <div className="rutas-encontradas">

              {rutas.map((ruta, index) => (

                <div
                  className="bus-card"
                  key={ruta.id || index}
                >

                  <div className="bus-icon-container">

                    <FaBus className="icono-bus"/>

                  </div>


                  <div className="bus-info">

                    <h3>
                      {ruta.nombre}
                    </h3>


                    {ruta.color && (

                      <p className="color-ruta">

                        <span
                          className="color-indicador"
                          style={{
                            backgroundColor:
                              ruta.color.toLowerCase()
                          }}
                        ></span>

                        {ruta.color}

                      </p>

                    )}


                    {ruta.parada_subida && (

                      <div className="parada-info">

                        <FaMapMarkerAlt/>

                        <div>

                          <strong>Sube en</strong>

                          <span>
                            {ruta.parada_subida}
                          </span>

                          {ruta.distancia_subida !== undefined && (

                            <small>
                              {Math.round(
                                ruta.distancia_subida * 1000
                              )} metros
                            </small>

                          )}

                        </div>

                      </div>

                    )}


                    {ruta.parada_bajada && (

                      <div className="parada-info">

                        <FaFlagCheckered/>

                        <div>

                          <strong>Baja en</strong>

                          <span>
                            {ruta.parada_bajada}
                          </span>

                          {ruta.distancia_bajada !== undefined && (

                            <small>
                              {Math.round(
                                ruta.distancia_bajada * 1000
                              )} metros
                            </small>

                          )}

                        </div>

                      </div>

                    )}

                  </div>

                </div>

              ))}

            </div>


            <button
              className="btn-comenzar"
              onClick={comenzarViaje}
            >

              <FaWalking/>

              Comenzar

            </button>

          </>

        )}

      </div>


      <Navar/>

    </div>

  );

}

export default GuiaViaje;