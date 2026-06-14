import "./register.css";
import { useNavigate} from "react-router-dom";

function CrearCuenta() {
  const navigate = useNavigate();
  return (
    <div className="register-container">
        <h1>Crear Cuenta</h1>
        <input type="text" placeholder="Nombre de usuario" className="input-register" />

        <input type="email" placeholder="Correo electrónico" className="input-register" />

        <input type="password" placeholder="Contraseña" className="input-register" />

        <button className="btn-register" onClick={() => navigate("/")}>
          Registrarse
        </button>
    </div>
  );
}

export default CrearCuenta; 