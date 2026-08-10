
import { useEffect, useState } from "react";
import "./guardados.css";
import Navar from "../../components/Navar";

import {
  FaBus,
  FaTrash,
  FaHeart,
  FaArrowRight,
  FaMapMarkerAlt
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";

const USUARIO_URL = import.meta.env.VITE_USUARIO_URL;

function Guardados() {

  const navigate = useNavigate();

  const [guardados, setGuardados] = useState([]);
  const [cargando, setCargando] = useState(true);

  // ==========================================
  // CARGAR GUARDADOS
  // ==========================================

  useEffect(() => {

    const cargarGuardados = async () => {

      try {

        const token = localStorage.getItem("token");

        if (!token) {
          setGuardados([]);
          return;
        }

        const respuesta = await fetch(
          `${USUARIO_URL}/guardados`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const datos = await respuesta.json();

        console.log(
          "Guardados:",
          datos
        );

        if (!respuesta.ok) {

          throw new Error(
            datos?.mensaje ||
            datos?.error ||
            "No se pudieron cargar los guardados."
          );

        }

        const lista = Array.isArray(datos)
          ? datos
          : datos.guardados || [];

        setGuardados(lista);

      } catch (error) {

        console.error(
          "Error cargando guardados:",
          error
        );

        setGuardados([]);

      } finally {

        setCargando(false);

      }

    };

    cargarGuardados();

  }, []);

  // ==========================================
  // ELIMINAR
  // ==========================================

  const eliminarGuardado = async (id) => {

    try {

      const token =
        localStorage.getItem("token");

      if (!token) {
        return;
      }

      const respuesta = await fetch(
        `${USUARIO_URL}/guardados/${id}`,
        {
          method: "DELETE",

          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

      if (!respuesta.ok) {

        const datos =
          await respuesta.json();

        throw new Error(
          datos?.mensaje ||
          "No se pudo eliminar la ruta."
        );

      }

      // Actualizamos pantalla
      // sin volver a consultar
      setGuardados(
        anteriores =>
          anteriores.filter(
            ruta => ruta.id !== id
          )
      );

    } catch (error) {

      console.error(
        "Error eliminando ruta:",
        error
      );

      alert(
        "No se pudo eliminar la ruta."
      );

    }

  };

  // ==========================================
  // VER RUTA INDIVIDUAL
  // ==========================================

  const verRuta = (ruta) => {

    console.log(
      "Abriendo ruta guardada:",
      ruta
    );

    navigate(
      "/guia_viaje",
      {
        state: {

          rutas: [

            {
              ruta_id:
                ruta.ruta_id,

              ruta:
                ruta.nombre ||
                ruta.nombre_ruta ||
                "Ruta",

              nombre:
                ruta.nombre ||
                ruta.nombre_ruta ||
                "Ruta",

              color:
                ruta.color ||
                "#75176E",

              numero:
                ruta.numero ||
                ruta.numero_bus ||
                null,

              parada_subida:
                ruta.parada_subida ||
                null,

              parada_bajada:
                ruta.parada_bajada ||
                null
            }

          ]

        }
      }
    );

  };

  // ==========================================
  // CARGANDO
  // ==========================================

  if (cargando) {

    return (

      <>
        <Navar />

        <main className="guardados">

          <div className="sinGuardados">

            <FaBus />

            <h2>
              Cargando tus rutas...
            </h2>

          </div>

        </main>
      </>

    );

  }

  // ==========================================
  // PANTALLA
  // ==========================================

  return (

    <>
      <Navar />

      <main className="guardados">

        <div className="titulo">

          <span className="titulo-icono">
            <FaHeart />
          </span>

          <h1>
            Mis rutas guardadas
          </h1>

          <p>
            Tus rutas favoritas aparecerán aquí.
          </p>

        </div>

        {guardados.length === 0 ? (

          // ====================================
          // SIN GUARDADOS
          // ====================================

          <div className="sinGuardados">

            <div className="icono-sin">
              <FaHeart />
            </div>

            <h2>
              No tienes rutas guardadas
            </h2>

            <p>
              Cuando encuentres una ruta que
              quieras conservar, toca el corazón.
            </p>

            <button
              className="btn-ver-ruta"
              onClick={() => navigate("/")}
            >
              Buscar una ruta
              <FaArrowRight />
            </button>

          </div>

        ) : (

          // ====================================
          // RUTAS
          // ====================================

          <div className="contenedor">

            {guardados.map(
              (ruta, index) => (

                <div
                  className="ruta-card"
                  key={
                    ruta.id ||
                    ruta.id_guardado ||
                    index
                  }
                >

                  {/* ICONO */}

                  <div
                    className="icono-ruta"
                    style={{
                      backgroundColor:
                        ruta.color ||
                        "#75176E"
                    }}
                  >

                    <FaBus />

                  </div>

                  {/* CONTENIDO */}

                  <div className="ruta-contenido">

                    {/* CABECERA */}

                    <div className="ruta-cabecera">

                      <div>

                        <span className="favorita">

                          <FaHeart />

                          GUARDADA

                        </span>

                        <h2>
                          {
                            ruta.nombre_personalizado ||
                            "Ruta guardada"
                          }
                        </h2>

                      </div>

                      <button
                        className="btn-eliminar"
                        title="Eliminar ruta"
                        onClick={() =>
                          eliminarGuardado(
                            ruta.id ||
                            ruta.id_guardado
                          )
                        }
                      >

                        <FaTrash />

                      </button>

                    </div>

                    {/* NOMBRE DE LA RUTA */}

                    <div className="nombre-ruta">

                      <FaBus />

                      <div>

                        <span>
                          RUTA
                        </span>

                        <strong>
                          {
                            ruta.nombre ||
                            ruta.nombre_ruta ||
                            "Ruta"
                          }
                        </strong>

                      </div>

                    </div>

                    {/* PARADAS */}

                    <div className="paradas-guardado">

                      <div className="parada-guardada">

                        <div className="icono-parada subida">

                          <FaMapMarkerAlt />

                        </div>

                        <div>

                          <small>
                            SUBE EN
                          </small>

                          <strong>
                            {
                              ruta.parada_subida?.nombre ||
                              "Parada de subida"
                            }
                          </strong>

                        </div>

                      </div>

                      <div className="flecha-parada">

                        <FaArrowRight />

                      </div>

                      <div className="parada-guardada">

                        <div className="icono-parada bajada">

                          <FaMapMarkerAlt />

                        </div>

                        <div>

                          <small>
                            BAJA EN
                          </small>

                          <strong>
                            {
                              ruta.parada_bajada?.nombre ||
                              "Parada de bajada"
                            }
                          </strong>

                        </div>

                      </div>

                    </div>

                    {/* VER RUTA */}

                    <button
                      className="btn-ver-ruta"
                      onClick={() =>
                        verRuta(ruta)
                      }
                    >

                      Ver ruta

                      <FaArrowRight />

                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </main>
    </>

  );

}

export default Guardados;
