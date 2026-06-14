import "./login.css";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
function Login() {
  const navigate = useNavigate();

  return (
    <div className="container">

      <div className="top-banner">
        <h1 className="logo-text">DURAN-GO</h1>
      </div>

      <div className="login-box">

        <input
          type="text"
          placeholder="Gmail"
          className="input"
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="input"
        />

        <button className="btn-login" onClick={() => navigate("/home")}>
          Entrar
        </button>

        <a href="/register" className="crear-cuenta">
          Crear cuenta
        </a>
       <GoogleLogin
         onSuccess={(credentialResponse) => {
         localStorage.setItem(
           "googleToken",
            credentialResponse.credential
          );

         navigate("/home");
  }}
  onError={() => {
    console.log("Error al iniciar sesión");
  }}
/>
      </div>

    </div>
  );
}

export default Login;