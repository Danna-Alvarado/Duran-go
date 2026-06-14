import "./home.css";
import Navar from "./Navar";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

function Home() {
  const [position, setPosition] = useState(null);
  const [ubicacion, setUbicacion] = useState("");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setPosition([lat, lon]);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );

          const data = await response.json();

         setUbicacion(
          `${data.address.road || ""}, ${
          data.address.city || data.address.town || "Durango"
    }`
 );
        } catch (error) {
          console.error(error);
        }
      },
      (err) => {
        console.error(err);
        alert("No se pudo obtener la ubicación");
      }
    );
  }, []);

  return (
    <div className="home-container">

      {position && (
        <MapContainer
          center={position}
          zoom={15}
          className="map-background"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={position}>
            <Popup>Ubicación actual</Popup>
          </Marker>
        </MapContainer>
      )}

      <div className="form-overlay">

        <input
          type="text"
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          className="input-home"
          placeholder="Ubicación actual"
       />

        <input
          type="text"
          placeholder="Destino"
          className="input-home"
        />

        <button className="btn-confirmar">
          Confirmar destino
        </button>

      </div>

      <Navar />
    </div>
  );
}

export default Home;