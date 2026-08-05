import "./register.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";


function CrearCuenta() {

  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [telefono, setTelefono] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);

  const [discapacidadVisual, setDiscapacidadVisual] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const AUTH_URL = import.meta.env.VITE_AUTH_URL;

  const registro = async () => {
    setError("");
    setSuccess("");

    if (!nombre || !email || !telefono || !password || !confirmPassword) {
      setError("Completa todos los campos.");
      return;
    }
    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correoValido.test(email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (telefono.length !== 10) {
      setError("Ingrese un número de teléfono válido.");
      return;

    }
    try {

      const respuesta = await fetch(
       `${AUTH_URL}/auth/registro`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",

          },

          body: JSON.stringify({
            nombre_usuario: nombre,
            correo: email,
            contrasena: password,
            telefono: telefono,
            discapacidad_visual: discapacidadVisual

          }),

        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        setError(data.error);
        return;
      }
      setSuccess(
        "Cuenta creada correctamente."
      );

      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (error) {
      console.error(error);
      setError(
        "No se pudo conectar con el servidor."
      );

    }

  };

  return (
    <div className="register-container">

      <h1>Crear Cuenta</h1>

      <div className="register-card">

        <input
          type="text"
          placeholder="Nombre de usuario"
          className="input-register"
          value={nombre}
          onChange={(e) =>
            setNombre(e.target.value)
          }
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          className="input-register"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }

        />
        <input
          type="text"
          placeholder="Teléfono"
          className="input-register"
          value={telefono}
          onChange={(e) =>
            setTelefono(e.target.value)
          }

        />

        <div className="password-container">
          <input
            type={
              mostrarPassword
                ? "text"
                : "password"
            }
            placeholder="Contraseña"
            className="input-register"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }

          />
          <button
            type="button"
            className="toggle-password"
            onClick={() =>
              setMostrarPassword(!mostrarPassword)
            }

          >
            {
              mostrarPassword
                ? <FaEyeSlash />
                : <FaEye />
            }

          </button>

        </div>

        <div className="password-container">
          <input
            type={
              mostrarConfirmPassword
                ? "text"
                : "password"
            }
            placeholder="Confirmar contraseña"
            className="input-register"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }

          />

          <button
            type="button"
            className="toggle-password"
            onClick={() =>
              setMostrarConfirmPassword(
                !mostrarConfirmPassword
              )
            }
          >

            {
              mostrarConfirmPassword
                ? <FaEyeSlash />
                : <FaEye />
            }
          </button>

        </div>


        <div className="discapacidad-container">

          <label className="titulo-discapacidad">

            Discapacidad visual
          </label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="discapacidad"
                checked={discapacidadVisual}
                onChange={() =>
                  setDiscapacidadVisual(true)
                }
              />
              Sí
            </label>

            <label className="radio-label">
              <input
                type="radio"
                name="discapacidad"
                checked={!discapacidadVisual}
                onChange={() =>
                  setDiscapacidadVisual(false)
                }

              />
              No

            </label>
          </div>
        </div>

        {
          error && (
            <p className="mensaje-error">
              {error}

            </p>

          )
        }

        {
          success && (
            <p className="mensaje-success">
              {success}
            </p>

          )
        }

        <button
          className="btn-register"
          onClick={registro}

        >
          Registrarse

        </button>

        <button
          className="btn-volver"

          onClick={() =>
            navigate("/")
          }

        >
          Volver

        </button>

      </div>

    </div>


  );


}


export default CrearCuenta;