import "./guia_viaje.css";
import Navar from "../../components/Navar";
import {
  FaBus,
  FaMapMarkerAlt,
  FaWalking,
  FaExchangeAlt,
  FaFlagCheckered
} from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

function GuiaViaje() {
  const location = useLocation();
  const navigate = useNavigate();

  const datos = location.state;

  if (!datos || !datos.rutas) {
    return (
      <>
        <Navar />

        <div className="guia-container">
          <div className="contenido-guia">
            <h1>Guía de viaje</h1>

            <p>No hay una ruta seleccionada.</p>

            <button
              className="boton-volver"
              onClick={() => navigate("/")}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </>
    );
  }

  const resultado = datos.rutas;

  const rutas = resultado.rutas || [];
  const cantidadCamiones = resultado.cantidad_camiones || rutas.length;

  return (
    <>
      <Navar />

      <div className="guia-container">
        <div className="contenido-guia">

          <div className="encabezado-guia">
            <div className="icono-ruta">
              <FaBus />
            </div>

            <div>
              <p className="titulo-secundario">
                TU VIAJE
              </p>

              <h1>
                Guía de viaje
              </h1>
            </div>
          </div>


          <div className="resumen-viaje">

            <FaBus />

            <div>

              <strong>
                {cantidadCamiones === 1
                  ? "Toma un solo camión para llegar a tu destino."
                  : "Necesitas tomar dos camiones para llegar a tu destino."
                }
              </strong>

              <p>
                {cantidadCamiones}{" "}
                {cantidadCamiones === 1
                  ? "camión"
                  : "camiones"
                }
              </p>

            </div>

          </div>


          <div className="ruta-completa">

            {rutas.map((ruta, index) => (

              <div
                className="paso"
                key={index}
              >

                <div className="linea-tiempo">

                  <div className="circulo">

                    {index === 0
                      ? <FaMapMarkerAlt />
                      : <FaExchangeAlt />
                    }

                  </div>

                  {index < rutas.length && (
                    <div className="linea"></div>
                  )}

                </div>


                <div className="contenido-paso">

                  <p className="etiqueta">

                    {index === 0
                      ? "PRIMER CAMIÓN"
                      : "SEGUNDO CAMIÓN"
                    }

                  </p>


                  <h2>
                    {ruta.ruta}
                  </h2>


                  <span
                    className="color-ruta"
                    style={{
                      backgroundColor: ruta.color
                    }}
                  >
                    {ruta.color}
                  </span>


                  <div className="detalle">

                    <FaWalking />

                    <div>

                      <strong>
                        Camina hasta la parada
                      </strong>

                      <p>
                        {ruta.parada_subida?.nombre}
                      </p>

                    </div>

                  </div>


                  <div className="detalle">

                    <FaBus />

                    <div>

                      <strong>
                        Aborda este camión
                      </strong>

                      <p>
                        Ruta {ruta.ruta}
                      </p>

                    </div>

                  </div>


                  <div className="detalle">

                    <FaMapMarkerAlt />

                    <div>

                      <strong>
                        Baja en
                      </strong>

                      <p>
                        {ruta.parada_bajada?.nombre}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

            ))}


            <div className="paso final">

              <div className="linea-tiempo">

                <div className="circulo">
                  <FaFlagCheckered />
                </div>

              </div>


              <div className="contenido-paso">

                <p className="etiqueta">
                  DESTINO
                </p>

                <h2>
                  Has llegado a tu destino
                </h2>

              </div>

            </div>

          </div>


          <button
            className="boton-volver"
            onClick={() => navigate("/")}
          >
            Buscar otra ruta
          </button>

        </div>
      </div>
    </>
  );
}

export default GuiaViaje;