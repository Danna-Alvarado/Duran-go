import { useNavigate } from "react-router-dom";
function Navar() {
  const navigate = useNavigate();
  return (
    <div className="navbar">
      <button className="nav-button"onClick={() =>navigate("/home") }>Inicio</button>
      <button className="nav-button" onClick={() => navigate("/horarios") }>Horarios</button>
      <button className="nav-button" onClick={() => navigate("/guardados") }>Guardados</button>
      <button className="nav-button" onClick={() => navigate("/perfil") }>Perfil</button>
    </div>
  );
}

export default Navar;