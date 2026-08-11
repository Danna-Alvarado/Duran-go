import "./chofer.css";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const AUTH_URL = import.meta.env.VITE_AUTH_URL;

function Choferes() {
    const navigate = useNavigate();

    const [numeroUnico, setNumeroUnico] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [mensaje, setMensaje] = useState("");

    const iniciarSesion = async () => {
        if (!numeroUnico || !contrasena) {
            setMensaje("Complete todos los campos");
            return;
        }

        try {
            const respuesta = await fetch(
                `${AUTH_URL}/auth/chofer/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        numero_unico: numeroUnico,
                        contrasena: contrasena
                    })
                }
            );

            const data = await respuesta.json();

            if (!respuesta.ok) {
                setMensaje(
                    data.error || "No se pudo iniciar sesión"
                );
                return;
            }

            // Guardar token EXCLUSIVO del administrador
            localStorage.setItem(
                "adminToken",
                data.token
            );

            // Guardar información del administrador
            localStorage.setItem(
                "admin",
                JSON.stringify(data.usuario)
            );

            setMensaje("");

            // Ir al panel administrativo
            navigate("/adminchofer");

        } catch (error) {
            console.error("Error iniciando sesión:", error);

            setMensaje(
                "Error al conectar con el servidor"
            );
        }
    };

    return (
        <div className="chofer-container">
            <div className="chofer-card">

                <h1>Acceso administrativo</h1>

                <p>
                    Ingresa tu código de administrador y contraseña
                </p>

                {mensaje && (
                    <p className="mensaje">
                        {mensaje}
                    </p>
                )}

                <input
                    type="text"
                    placeholder="Código de administrador"
                    className="chofer-input"
                    value={numeroUnico}
                    onChange={(e) =>
                        setNumeroUnico(e.target.value)
                    }
                />

                <input
                    type="password"
                    placeholder="Contraseña"
                    className="chofer-input"
                    value={contrasena}
                    onChange={(e) =>
                        setContrasena(e.target.value)
                    }
                />

                <button
                    type="button"
                    className="chofer-btn"
                    onClick={iniciarSesion}
                >
                    Ingresar
                </button>

                <button
                    type="button"
                    className="volver-btn"
                    onClick={() => navigate("/")}
                >
                    Volver
                </button>

            </div>
        </div>
    );
}

export default Choferes;

