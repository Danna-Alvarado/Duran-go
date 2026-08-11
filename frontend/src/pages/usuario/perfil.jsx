import "./perfil.css";
import Navar from "../../components/Navar";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    FaUserCircle,
    FaSignOutAlt,
    FaLock,
    FaTimes
} from "react-icons/fa";

const USUARIO_URL = import.meta.env.VITE_USUARIO_URL;

function Perfil() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState({
        nombre_usuario: "",
        correo: "",
        telefono: "",
        discapacidad_visual: false
    });

    const [mensaje, setMensaje] = useState("");
    const [cargando, setCargando] = useState(true);
    const [mensajeGuardar, setMensajeGuardar] = useState("");

    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cambiandoPassword, setCambiandoPassword] = useState(false);
    const [mensajePassword, setMensajePassword] = useState("");
    const [errorPassword, setErrorPassword] = useState("");

    const [password, setPassword] = useState({
        actual: "",
        nueva: "",
        confirmar: ""
    });

    useEffect(() => {
        const cargarPerfil = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                navigate("/");
                return;
            }

            try {
                const respuesta = await fetch(
                    `${USUARIO_URL}/perfil`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                if (respuesta.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                    navigate("/", { replace: true });
                    return;
                }

                const data = await respuesta.json();

                if (respuesta.ok) {
                    setUsuario({
                        nombre_usuario: data.nombre_usuario || "",
                        correo: data.correo || "",
                        telefono: data.telefono || "",
                        discapacidad_visual: Boolean(
                            data.discapacidad_visual
                        )
                    });
                } else {
                    setMensaje(
                        data.error || "No se pudo cargar el perfil"
                    );
                }
            } catch (error) {
                console.log(error);
                setMensaje("Error al conectar con el servidor");
            } finally {
                setCargando(false);
            }
        };

        cargarPerfil();
    }, [navigate]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setUsuario((actual) => ({
            ...actual,
            [name]: value
        }));
    };

    const guardarCambios = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }

        try {
            setMensajeGuardar("");

            const respuesta = await fetch(
                `${USUARIO_URL}/perfil`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(usuario)
                }
            );

            if (respuesta.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("usuario");
                navigate("/", { replace: true });
                return;
            }

            const data = await respuesta.json();

            if (respuesta.ok) {
                setMensajeGuardar(
                    "Cambios guardados correctamente"
                );
            } else {
                setMensajeGuardar(
                    data.error || "No se pudieron guardar los cambios"
                );
            }
        } catch (error) {
            console.log(error);
            setMensajeGuardar(
                "Error al actualizar perfil"
            );
        }
    };

    const abrirCambiarPassword = () => {
        setPassword({
            actual: "",
            nueva: "",
            confirmar: ""
        });

        setMensajePassword("");
        setErrorPassword("");
        setMostrarPassword(true);
    };

    const cerrarCambiarPassword = () => {
        if (cambiandoPassword) {
            return;
        }

        setMostrarPassword(false);
        setPassword({
            actual: "",
            nueva: "",
            confirmar: ""
        });
        setMensajePassword("");
        setErrorPassword("");
    };

    const cambiarPassword = async (e) => {
        e.preventDefault();

        setMensajePassword("");
        setErrorPassword("");

        if (password.nueva.length < 6) {
            setErrorPassword(
                "La nueva contraseña debe tener al menos 6 caracteres"
            );
            return;
        }

        if (password.nueva !== password.confirmar) {
            setErrorPassword(
                "Las contraseñas nuevas no coinciden"
            );
            return;
        }

        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/");
            return;
        }

        try {
            setCambiandoPassword(true);

            const respuesta = await fetch(
                `${USUARIO_URL}/perfil/contrasena`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        contrasena_actual: password.actual,
                        contrasena_nueva: password.nueva
                    })
                }
            );

            if (respuesta.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("usuario");
                navigate("/", { replace: true });
                return;
            }

            const data = await respuesta.json();

            if (!respuesta.ok) {
                setErrorPassword(
                    data.error ||
                    "No se pudo cambiar la contraseña"
                );
                return;
            }

            setMensajePassword(
                "Contraseña actualizada correctamente"
            );

            setPassword({
                actual: "",
                nueva: "",
                confirmar: ""
            });

            setTimeout(() => {
                setMostrarPassword(false);
                setMensajePassword("");
            }, 1200);

        } catch (error) {
            console.log(error);
            setErrorPassword(
                "Error al conectar con el servidor"
            );
        } finally {
            setCambiandoPassword(false);
        }
    };

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/", { replace: true });
    };

    if (cargando) {
        return <h3>Cargando perfil...</h3>;
    }

    return (
        <>
            <Navar />

            <div className="perfil">
                <div className="perfil-card">

                    <div className="perfil-header">
                        <FaUserCircle className="avatar" />

                        <h1>
                            {usuario.nombre_usuario || "Usuario"}
                        </h1>

                        <p>
                            Usuario registrado
                        </p>
                    </div>

                    <div className="perfil-body">

                        <h2>
                            Información personal
                        </h2>

                        {mensaje && (
                            <p className="mensaje">
                                {mensaje}
                            </p>
                        )}

                        <div className="grupo">
                            <label>
                                Nombre
                            </label>

                            <input
                                type="text"
                                name="nombre_usuario"
                                value={usuario.nombre_usuario}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grupo">
                            <label>
                                Correo electrónico
                            </label>

                            <input
                                type="email"
                                name="correo"
                                value={usuario.correo}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grupo">
                            <label>
                                Teléfono
                            </label>

                            <input
                                type="text"
                                name="telefono"
                                value={usuario.telefono}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grupo">
                            <label>
                                Discapacidad visual
                            </label>

                            <div className="radio-group">

                                <label>
                                    <input
                                        type="radio"
                                        name="visual"
                                        checked={
                                            usuario.discapacidad_visual === true
                                        }
                                        onChange={() =>
                                            setUsuario((actual) => ({
                                                ...actual,
                                                discapacidad_visual: true
                                            }))
                                        }
                                    />
                                    Sí
                                </label>

                                <label>
                                    <input
                                        type="radio"
                                        name="visual"
                                        checked={
                                            usuario.discapacidad_visual === false
                                        }
                                        onChange={() =>
                                            setUsuario((actual) => ({
                                                ...actual,
                                                discapacidad_visual: false
                                            }))
                                        }
                                    />
                                    No
                                </label>

                            </div>
                        </div>

                        <hr />

                        <h2>
                            Seguridad
                        </h2>

                        <button
                            className="btnPassword"
                            onClick={abrirCambiarPassword}
                        >
                            <FaLock />
                            Cambiar contraseña
                        </button>

                        <button
                            className="btnGuardar"
                            onClick={guardarCambios}
                        >
                            Guardar cambios
                        </button>

                        {mensajeGuardar && (
                            <p className="mensaje-guardar">
                                {mensajeGuardar}
                            </p>
                        )}

                        <button
                            className="btnCerrar"
                            onClick={cerrarSesion}
                        >
                            <FaSignOutAlt />
                            Cerrar sesión
                        </button>

                    </div>
                </div>
            </div>

            {mostrarPassword && (
                <div
                    className="password-overlay"
                    onClick={cerrarCambiarPassword}
                >
                    <div
                        className="password-modal"
                        onClick={(e) => e.stopPropagation()}
                    >

                        <div className="password-header">
                            <div>
                                <span>
                                    SEGURIDAD
                                </span>

                                <h2>
                                    Cambiar contraseña
                                </h2>

                                <p>
                                    Actualiza la contraseña de tu cuenta.
                                </p>
                            </div>

                            <button
                                className="password-cerrar"
                                onClick={cerrarCambiarPassword}
                                type="button"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={cambiarPassword}>

                            <div className="password-grupo">
                                <label>
                                    Contraseña actual
                                </label>

                                <input
                                    type="password"
                                    value={password.actual}
                                    onChange={(e) =>
                                        setPassword((actual) => ({
                                            ...actual,
                                            actual: e.target.value
                                        }))
                                    }
                                    placeholder="Escribe tu contraseña actual"
                                    required
                                />
                            </div>

                            <div className="password-grupo">
                                <label>
                                    Nueva contraseña
                                </label>

                                <input
                                    type="password"
                                    value={password.nueva}
                                    onChange={(e) =>
                                        setPassword((actual) => ({
                                            ...actual,
                                            nueva: e.target.value
                                        }))
                                    }
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                />
                            </div>

                            <div className="password-grupo">
                                <label>
                                    Confirmar nueva contraseña
                                </label>

                                <input
                                    type="password"
                                    value={password.confirmar}
                                    onChange={(e) =>
                                        setPassword((actual) => ({
                                            ...actual,
                                            confirmar: e.target.value
                                        }))
                                    }
                                    placeholder="Repite la nueva contraseña"
                                    required
                                />
                            </div>

                            {errorPassword && (
                                <p className="password-error">
                                    {errorPassword}
                                </p>
                            )}

                            {mensajePassword && (
                                <p className="password-exito">
                                    {mensajePassword}
                                </p>
                            )}

                            <div className="password-acciones">

                                <button
                                    type="button"
                                    className="password-cancelar"
                                    onClick={cerrarCambiarPassword}
                                    disabled={cambiandoPassword}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="password-guardar"
                                    disabled={cambiandoPassword}
                                >
                                    {cambiandoPassword
                                        ? "Actualizando..."
                                        : "Cambiar contraseña"}
                                </button>

                            </div>

                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default Perfil;
