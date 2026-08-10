import "./guia_viaje.css";
import Navar from "../../components/Navar";
import { FaBus, FaMapMarkerAlt,  FaExchangeAlt, FaFlagCheckered } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";

function GuiaViaje() {
const location = useLocation();
const navigate = useNavigate();
const data = location.state?.rutas;
const origen = location.state?.origen;
const destino = location.state?.destino;

if (!data?.rutas?.length) {
    return (
        <div className="guia-container">
            <Navar />
            <div className="contenido-guia">
                <div className="guia-vacia">
                    <FaMapMarkerAlt />
                    <h2>No se encontró una ruta</h2>
                    <p>No encontramos una combinación de camiones para llegar a tu destino.</p>
                    <button onClick={() => navigate("/")}>Buscar otra ruta</button>
                </div>
            </div>
        </div>
    );
}

const mejorRuta = data.rutas[0];
const segmentos = mejorRuta.segmentos || [];

return (
    <div className="guia-container">
        <Navar />
        <div className="contenido-guia">
            <div className="encabezado-guia">
                <div>
                    <span className="etiqueta-guia">TU VIAJE</span>
                    <h1>Guía de viaje</h1>
                    <p>
                        {mejorRuta.cantidad_camiones === 1
                            ? "Toma un solo camión para llegar a tu destino."
                            : `Necesitas ${mejorRuta.cantidad_camiones} camiones para llegar a tu destino.`}
                    </p>
                </div>
                <div className="resumen-viaje">
                    <FaBus />
                    <strong>{mejorRuta.cantidad_camiones}</strong>
                    <span>{mejorRuta.cantidad_camiones === 1 ? "camión" : "camiones"}</span>
                </div>
            </div>

            <div className="ruta-linea">
                <div className="punto-viaje inicio">
                    <FaMapMarkerAlt />
                </div>
                <div className="informacion-punto">
                    <span>Tu ubicación</span>
                    <strong>{origen ? `${Number(origen.lat).toFixed(5)}, ${Number(origen.lng).toFixed(5)}` : "Origen"}</strong>
                </div>
            </div>

            {segmentos.map((segmento, index) => (
                <div key={`${segmento.ruta_id}-${index}`} className="segmento-viaje">
                    <div className="linea-conexion"></div>

                    <div className="tarjeta-bus">
                        <div className="numero-paso">{index + 1}</div>
                        <div className="icono-bus">
                            <FaBus />
                        </div>
                        <div className="datos-bus">
                            <span className="tipo-transporte">CAMIÓN {index + 1}</span>
                            <h2>{segmento.ruta}</h2>
                            <div className="color-ruta">
                                <span style={{ backgroundColor: segmento.color || "#777" }}></span>
                                {segmento.color || "Ruta"}
                            </div>
                        </div>
                    </div>

                    <div className="paradas-viaje">
                        <div className="parada">
                            <FaMapMarkerAlt />
                            <div>
                                <small>Sube en</small>
                                <strong>{segmento.parada_subida?.nombre || "Parada de subida"}</strong>
                            </div>
                        </div>

                        {index < segmentos.length - 1 && (
                            <div className="transbordo">
                                <FaExchangeAlt />
                                <span>Transbordo</span>
                            </div>
                        )}

                        <div className="parada">
                            <FaFlagCheckered />
                            <div>
                                <small>{index === segmentos.length - 1 ? "Baja en" : "Baja para cambiar"}</small>
                                <strong>{segmento.parada_bajada?.nombre || "Parada de bajada"}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            <div className="ruta-linea final">
                <div className="punto-viaje destino">
                    <FaFlagCheckered />
                </div>
                <div className="informacion-punto">
                    <span>Destino</span>
                    <strong>{destino ? `${Number(destino.lat).toFixed(5)}, ${Number(destino.lng).toFixed(5)}` : "Destino"}</strong>
                </div>
            </div>

            {data.rutas.length > 1 && (
                <div className="otras-rutas">
                    <h2>Otras opciones</h2>
                    {data.rutas.slice(1).map((opcion, index) => (
                        <div className="opcion-ruta" key={index}>
                            <div>
                                <strong>{opcion.cantidad_camiones} {opcion.cantidad_camiones === 1 ? "camión" : "camiones"}</strong>
                                <span>{opcion.segmentos.map(s => s.ruta).join(" → ")}</span>
                            </div>
                            
                        </div>
                    ))}
                </div>
            )}

            <button className="btn-regresar" onClick={() => navigate("/")}>
                Buscar otra ruta
            </button>
        </div>
    </div>
);


}

export default GuiaViaje;
