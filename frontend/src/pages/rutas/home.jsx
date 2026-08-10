
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
  const [errorUbicacion, setErrorUbicacion] = useState("");

  // ==========================================
  // BUSCAR RUTA
  // ==========================================

  const buscarRuta = async () => {

    try {

      if (!coordenadas || !destinoCoords) {
        return;
      }

      console.log("Calculando ruta...");

      const response = await fetch(
        `${import.meta.env.VITE_RUTAS_URL}/buscar-ruta`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            origenLat: coordenadas.lat,
            origenLng: coordenadas.lng,

            destinoLat: destinoCoords.lat,
            destinoLng: destinoCoords.lng

          })
        }
      );

      const data = await response.json();

      console.log("Respuesta del servidor:", data);

      if (!response.ok) {

        console.error(
          "Error del servidor:",
          data
        );

        alert(
          data?.mensaje ||
          data?.error ||
          "No se pudo encontrar una ruta."
        );

        return;
      }

      // ==========================================
      // VALIDAR RUTAS
      // ==========================================

      if (
        !data ||
        !Array.isArray(data.rutas) ||
        data.rutas.length === 0
      ) {

        alert(
          "No encontramos una ruta para este destino."
        );

        return;
      }

      console.log(
        "Rutas encontradas:",
        data.rutas
      );

      // ==========================================
      // IR A GUIA DE VIAJE
      // ==========================================

      navigate("/guia_viaje", {

        state: {

          rutas: data.rutas,

          origen: coordenadas,

          destino: destinoCoords

        }

      });

    } catch (error) {

      console.error(
        "Error buscando ruta:",
        error
      );

      alert(
        "Ocurrió un error al buscar la ruta."
      );

    }

  };

  // ==========================================
  // OBTENER UBICACIÓN
  // ==========================================

  useEffect(() => {

    const cargarUbicacion = async () => {

      try {

        const datos = await obtenerUbicacion();

        setUbicacion(
          datos.direccion
        );

        setCoordenadas({

          lat: datos.lat,

          lng: datos.lng

        });

        console.log(
          "Origen:",
          {
            lat: datos.lat,
            lng: datos.lng
          }
        );

      } catch (error) {

        console.error(
          error
        );

        setErrorUbicacion(
          "Activa la ubicación de tu dispositivo."
        );

      } finally {

        setCargando(false);

      }

    };

    cargarUbicacion();

  }, []);

  // ==========================================
  // CONFIRMAR DESTINO
  // ==========================================

  const confirmarDestino = () => {

    if (!destinoCoords) {

      alert(
        "Selecciona un destino."
      );

      return;
    }

    if (!coordenadas) {

      alert(
        "Esperando ubicación..."
      );

      return;
    }

    buscarRuta();

  };

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (

    <div className="home-container">

      <div className="form-overlay">

        <h2 className="titulo-home">
          Encuentra tu mejor ruta
        </h2>

        {/* UBICACIÓN */}

        <input
          type="text"
          value={ubicacion}
          readOnly
          className="input-home"
          placeholder="Obteniendo ubicación..."
        />

        {errorUbicacion && (

          <p className="mensaje-error">
            {errorUbicacion}
          </p>

        )}

        {/* DESTINO */}

        <input
          type="text"

          value={destino}

          onChange={async (e) => {

            const texto =
              e.target.value;

            setDestino(texto);

            setDestinoCoords(null);

            if (texto.length < 3) {

              setSugerencias([]);

              return;

            }

            try {

              const resultados =
                await buscarLugares(texto);

              console.log(
                "Resultados:",
                resultados
              );

              setSugerencias(
                resultados
              );

            } catch (error) {

              console.error(
                "Error buscando lugares:",
                error
              );

              setSugerencias([]);

            }

          }}

          placeholder="¿A dónde quieres ir?"

          className="input-home"

        />

        {/* SUGERENCIAS */}

        <div className="sugerencias">

          {sugerencias.map(
            (lugar, index) => (

              <div

                key={index}

                className="item-sugerencia"

                onClick={() => {

                  setDestino(
                    lugar.nombre
                  );

                  setDestinoCoords({

                    lat: lugar.lat,

                    lng: lugar.lng

                  });

                  setSugerencias([]);

                  console.log(
                    "Destino seleccionado:",
                    {
                      nombre: lugar.nombre,
                      lat: lugar.lat,
                      lng: lugar.lng
                    }
                  );

                }}

              >

                {lugar.nombre}

                <br />

                <small>
                  {lugar.direccion}
                </small>

              </div>

            )
          )}

        </div>

        {/* BOTÓN */}

        <button

          className="btn-confirmar"

          disabled={
            cargando ||
            !coordenadas ||
            !destinoCoords
          }

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
