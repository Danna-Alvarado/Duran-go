import "./login.css";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../../assets/logo.png";

function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");


  const login = async () => {

    setError("");

    if (!email || !password) {
      setError("Completa todos los campos.");
      return;
    }


    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correoValido.test(email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }


    try {

      const respuesta = await fetch(
        "http://localhost:3001/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            correo: email,
            contrasena: password,
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        setError(data.error);
        return;
      }

      // Guardar sesión
      localStorage.setItem(
        "token",
        data.token
      );


      localStorage.setItem(
        "usuario",
        JSON.stringify(data.usuario)
      );


      navigate("/home");


    } catch (error) {

      console.error(error);

      setError(
        "No se pudo conectar con el servidor."
      );

    }

  };


  return (

    <div className="container">


      <div className="left-side"></div>



      <div className="right-side">


        <img
          src={logo}
          alt="logo"
          className="logo"
        />


        <input
          type="email"
          placeholder="Correo electrónico"
          className="input"

          value={email}

          onChange={(e) =>
            setEmail(e.target.value)
          }

          autoComplete="username"
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="input"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }

          autoComplete="current-password"
        />

        {
          error && (
            <p className="mensaje-error">
              {error}
            </p>
          )
        }

        <button
          className="btn-login"
          onClick={login}
        >
          Entrar
        </button>

        <Link
          to="/register"
          className="crear-cuenta"
        >
          Crear cuenta
        </Link>

        <button
          className="btn-chofer"

          onClick={() =>
            navigate("/chofer")
          }
        >
          Chofer
        </button>



      </div>


    </div>

  );

}


export default Login;