import "./guia_viaje.css";
import Navar from "../../components/Navar";
import { FaBus } from "react-icons/fa";

function GuiaViaje() {
  return (
    <div className="guia-container">

      <div className="contenido">

        <h2>Autobuses a tomar</h2>

        <div className="bus-card">
          <FaBus className="icono-bus"/>
          <span>Ruta 2</span>
        </div>

        <div className="bus-card">
          <FaBus className="icono-bus"/>
          <span>Piedrera</span>
        </div>

        <button className="btn-comenzar">
          Comenzar
        </button>

      </div>

      <Navar />

    </div>
  );
}

export default GuiaViaje;