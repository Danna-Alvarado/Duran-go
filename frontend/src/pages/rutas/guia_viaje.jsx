import "./guia_viaje.css";
import Navar from "../../components/Navar";
import {
  FaBus,
  FaHeart,
  FaArrowRight,
  FaMapMarkerAlt
} from "react-icons/fa";

import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

const USUARIO_URL = import.meta.env.VITE_USUARIO_URL;

function GuiaViaje() {
  const location = useLocation();
  const navigate = useNavigate();

  const [nombreGuardado, setNombreGuardado] = useState("");
  const [rutaParaGuardar, setRutaParaGuardar] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  /*
    Home puede mandar:

    state: {
      rutas: [...]
    }

    o directamente:

    state: {
      cantidad_camiones: 2,
      rutas: [...]
    }
  */

  const datos = location.state || {};

  const rutas = Array.isArray(datos)
    ? datos
    : Array.isArray(datos.rutas)
      ? datos.rutas
      : [];

  // Abrir ventana para guardar
  const abrirGuardar = (ruta) => {
    setRutaParaGuardar(ruta);
    setNombreGuardado(
      ruta.ruta ||
      ruta.nombre ||
      `Ruta ${ruta.numero || ""}`.trim()
    );
    setMensaje("");
  };

  // Guardar ruta
  const guardarRuta = async () => {
    if (!rutaParaGuardar) return;

    const nombre = nombreGuardado.trim();

    if (!nombre) {
      setMensaje("Ponle un nombre a tu ruta.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMensaje("Debes iniciar sesión para guardar rutas.");
      return;
    }

    try {
      setGuardando(true);
      setMensaje("");

      const respuesta = await fetch(`${USUARIO_URL}/guardados`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ruta_id: rutaParaGuardar.ruta_id,
          nombre_personalizado: nombre
        })
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data?.mensaje ||
          data?.error ||
          "No se pudo guardar la ruta."
        );
      }

      setMensaje("¡Ruta guardada! ❤️");

      setTimeout(() => {
        setRutaParaGuardar(null);
        setNombreGuardado("");
        setMensaje("");
      }, 900);

    } catch (error) {
      console.error("Error guardando ruta:", error);
      setMensaje(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Navar />

      <main className="guia-container">

        <div className="contenido-guia">

          <div className="guia-header">
            <div>
              <span className="guia-etiqueta">
                TU VIAJE
              </span>

              <h1>Ruta recomendada</h1>

              <p>
                Estos son los camiones que necesitas tomar.
              </p>
            </div>

            <button
              className="btn-guardados"
              onClick={() => navigate("/guardados")}
            >
              <FaHeart />
              Ver guardados
            </button>
          </div>

          {rutas.length === 0 ? (

            <div className="sin-rutas">
              <FaBus />

              <h2>No encontramos una ruta</h2>

              <p>
                Regresa al inicio e intenta buscar tu destino nuevamente.
              </p>

              <button
                onClick={() => navigate("/")}
              >
                Volver al inicio
              </button>
            </div>

          ) : (

            <div className="rutas-viaje">

              {rutas.map((ruta, index) => {

                const nombreRuta =
                  ruta.ruta ||
                  ruta.nombre ||
                  `Ruta ${ruta.numero || index + 1}`;

                const numero =
                  ruta.numero ??
                  ruta.ruta_id ??
                  index + 1;

                const color =
                  ruta.color ||
                  "#555";

                const subida =
                  ruta.parada_subida?.nombre ||
                  ruta.parada_subida?.nombre_parada ||
                  "Parada de subida";

                const bajada =
                  ruta.parada_bajada?.nombre ||
                  ruta.parada_bajada?.nombre_parada ||
                  "Parada de bajada";

                return (
                  <section
                    className="ruta-card"
                    key={`${ruta.ruta_id}-${index}`}
                  >

                    <div className="ruta-numero">
                      <span>
                        {index + 1}
                      </span>

                      {index < rutas.length - 1 && (
                        <div className="linea-ruta" />
                      )}
                    </div>

                    <div className="ruta-contenido">

                      <div className="ruta-top">

                        <div className="ruta-info">

                          <div
                            className="bus-icono"
                            style={{
                              backgroundColor: color
                            }}
                          >
                            <FaBus />
                          </div>

                          <div>
                            <span className="tomar">
                              {index === 0
                                ? "TOMA ESTE CAMIÓN"
                                : "DESPUÉS TOMA ESTE CAMIÓN"}
                            </span>

                            <h2>
                              {nombreRuta}
                            </h2>

                            <p>
                              Camión #{numero}
                            </p>
                          </div>

                        </div>

                        <button
                          className="corazon-btn"
                          onClick={() => abrirGuardar(ruta)}
                          title="Guardar ruta"
                        >
                          <FaHeart />
                        </button>

                      </div>

                      <div className="recorrido">

                        <div className="parada">

                          <div className="punto subida">
                            <FaMapMarkerAlt />
                          </div>

                          <div>
                            <span>SUBE EN</span>
                            <strong>{subida}</strong>
                          </div>

                        </div>

                        <div className="flecha">
                          <FaArrowRight />
                        </div>

                        <div className="parada">

                          <div className="punto bajada">
                            <FaMapMarkerAlt />
                          </div>

                          <div>
                            <span>BAJA EN</span>
                            <strong>{bajada}</strong>
                          </div>

                        </div>

                      </div>

                    </div>

                  </section>
                );
              })}

            </div>
          )}

        </div>
      </main>

      {/* MODAL PARA GUARDAR */}

      {rutaParaGuardar && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!guardando) {
              setRutaParaGuardar(null);
            }
          }}
        >

          <div
            className="modal-guardar"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modal-corazon">
              <FaHeart />
            </div>

            <h2>Guardar ruta</h2>

            <p>
              Ponle un nombre para encontrarla fácilmente después.
            </p>

            <input
              type="text"
              value={nombreGuardado}
              onChange={(e) =>
                setNombreGuardado(e.target.value)
              }
              placeholder="Ej. Casa a la escuela"
              maxLength={100}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  guardarRuta();
                }
              }}
            />

            {mensaje && (
              <div
                className={
                  mensaje.includes("guardada")
                    ? "mensaje-exito"
                    : "mensaje-error"
                }
              >
                {mensaje}
              </div>
            )}

            <div className="modal-botones">

              <button
                className="btn-cancelar"
                disabled={guardando}
                onClick={() =>
                  setRutaParaGuardar(null)
                }
              >
                Cancelar
              </button>

              <button
                className="btn-guardar"
                disabled={guardando}
                onClick={guardarRuta}
              >
                <FaHeart />

                {guardando
                  ? "Guardando..."
                  : "Guardar"}
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}

export default GuiaViaje;