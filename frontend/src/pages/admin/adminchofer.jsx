import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FaPlus,
    FaSignOutAlt,
    FaEdit,
    FaTrash,
    FaSyncAlt,
    FaUserTie,
    FaTimes
} from "react-icons/fa";
import "./adminchofer.css";

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL;

function AdminChofer() {
    const navigate = useNavigate();

    const [choferes, setChoferes] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [choferEditando, setChoferEditando] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const [formulario, setFormulario] = useState({
        numero_unico: "",
        nombre_completo: "",
        correo: "",
        telefono: "",
        contrasena: ""
    });

    const obtenerToken = () => {
        return localStorage.getItem("adminToken");
    };

    const manejarSesion = (respuesta) => {
        if (respuesta.status === 401 || respuesta.status === 403) {
            localStorage.removeItem("adminToken");
            navigate("/", { replace: true });
            return false;
        }

        return true;
    };

    const cargarChoferes = async () => {
        try {
            setCargando(true);
            setError("");
            setMensaje("");

            const token = obtenerToken();

            if (!token) {
                navigate("/", { replace: true });
                return;
            }

            const respuesta = await fetch(
                `${ADMIN_URL}/choferes`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!manejarSesion(respuesta)) {
                return;
            }

            const data = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    data.mensaje ||
                    "No se pudieron obtener los choferes"
                );
            }

            setChoferes(data.choferes || []);

        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    };

    const abrirAgregar = () => {
        setFormulario({
            numero_unico: "",
            nombre_completo: "",
            correo: "",
            telefono: "",
            contrasena: ""
        });

        setModoEdicion(false);
        setChoferEditando(null);
        setMensaje("");
        setError("");
        setMostrarModal(true);
    };

    const abrirEditar = (chofer) => {
        setFormulario({
            numero_unico: chofer.numero_unico || "",
            nombre_completo: chofer.nombre_completo || "",
            correo: chofer.correo || "",
            telefono: chofer.telefono || "",
            contrasena: ""
        });

        setModoEdicion(true);
        setChoferEditando(chofer);
        setMensaje("");
        setError("");
        setMostrarModal(true);
    };

    const cerrarModal = () => {
        setMostrarModal(false);
        setChoferEditando(null);
        setModoEdicion(false);

        setFormulario({
            numero_unico: "",
            nombre_completo: "",
            correo: "",
            telefono: "",
            contrasena: ""
        });
    };

    const cambiarCampo = (e) => {
        const { name, value } = e.target;

        setFormulario((actual) => ({
            ...actual,
            [name]: value
        }));
    };

    const guardarChofer = async (e) => {
        e.preventDefault();

        setMensaje("");
        setError("");

        try {
            const token = obtenerToken();

            if (!token) {
                navigate("/", { replace: true });
                return;
            }

            const url = modoEdicion
                ? `${ADMIN_URL}/choferes/${choferEditando.id}`
                : `${ADMIN_URL}/choferes`;

            const respuesta = await fetch(url, {
                method: modoEdicion ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formulario)
            });

            if (!manejarSesion(respuesta)) {
                return;
            }

            const data = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    data.mensaje ||
                    "No se pudo guardar el chofer"
                );
            }

            cerrarModal();

            setMensaje(
                modoEdicion
                    ? "Chofer actualizado correctamente"
                    : "Chofer agregado correctamente"
            );

            await cargarChoferes();

        } catch (err) {
            setError(err.message);
        }
    };

    const eliminarChofer = async (chofer) => {
        const confirmar = window.confirm(
            `¿Seguro que quieres eliminar a ${chofer.nombre_completo}?`
        );

        if (!confirmar) {
            return;
        }

        try {
            setError("");
            setMensaje("");

            const token = obtenerToken();

            if (!token) {
                navigate("/", { replace: true });
                return;
            }

            const respuesta = await fetch(
                `${ADMIN_URL}/choferes/${chofer.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!manejarSesion(respuesta)) {
                return;
            }

            const data = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    data.mensaje ||
                    "No se pudo eliminar el chofer"
                );
            }

            setMensaje("Chofer eliminado correctamente");

            await cargarChoferes();

        } catch (err) {
            setError(err.message);
        }
    };

    const cerrarSesion = () => {
        localStorage.removeItem("adminToken");
        navigate("/", { replace: true });
    };

    return (
        <div className="admin-chofer-page">

            <div className="admin-chofer-container">

                <div className="admin-chofer-top">

                    <div>
                        <span className="admin-etiqueta">
                            ADMINISTRACIÓN
                        </span>

                        <h1>Choferes</h1>

                        <p>
                            Administra los conductores registrados
                            en DURAN-GO.
                        </p>
                    </div>

                    <div className="admin-acciones-top">

                        <button
                            className="btn-cerrar-sesion"
                            onClick={cerrarSesion}
                        >
                            <FaSignOutAlt />
                            Cerrar sesión
                        </button>

                        <button
                            className="btn-agregar"
                            onClick={abrirAgregar}
                        >
                            <FaPlus />
                            Agregar chofer
                        </button>

                    </div>

                </div>

                {mensaje && (
                    <div className="alerta alerta-exito">
                        {mensaje}
                    </div>
                )}

                {error && (
                    <div className="alerta alerta-error">
                        {error}
                    </div>
                )}

                <div className="choferes-panel">

                    <div className="panel-header">

                        <div>
                            <h2>Lista de choferes</h2>

                            <p>
                                {choferes.length} choferes registrados
                            </p>
                        </div>

                        <button
                            className="btn-recargar"
                            onClick={cargarChoferes}
                            disabled={cargando}
                        >
                            <FaSyncAlt />
                            {cargando
                                ? "Cargando..."
                                : "Actualizar"}
                        </button>

                    </div>

                    {choferes.length === 0 && !cargando ? (

                        <div className="sin-choferes">

                            <div className="sin-choferes-icono">
                                <FaUserTie />
                            </div>

                            <h3>
                                No hay choferes registrados
                            </h3>

                            <p>
                                Agrega el primer chofer para comenzar.
                            </p>

                            <button
                                className="btn-agregar-secundario"
                                onClick={abrirAgregar}
                            >
                                <FaPlus />
                                Agregar chofer
                            </button>

                        </div>

                    ) : (

                        <div className="tabla-contenedor">

                            <table>

                                <thead>
                                    <tr>
                                        <th>Chofer</th>
                                        <th>Número único</th>
                                        <th>Correo</th>
                                        <th>Teléfono</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {choferes.map((chofer) => (

                                        <tr key={chofer.id}>

                                            <td>
                                                <div className="chofer-info">

                                                    <div className="chofer-avatar">
                                                        {chofer.nombre_completo
                                                            ?.charAt(0)
                                                            ?.toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {chofer.nombre_completo}
                                                        </strong>

                                                        <span>
                                                            ID #{chofer.id}
                                                        </span>
                                                    </div>

                                                </div>
                                            </td>

                                            <td>
                                                <span className="numero-badge">
                                                    {chofer.numero_unico}
                                                </span>
                                            </td>

                                            <td>
                                                {chofer.correo}
                                            </td>

                                            <td>
                                                {chofer.telefono}
                                            </td>

                                            <td>
                                                <div className="acciones">

                                                    <button
                                                        className="btn-editar"
                                                        onClick={() =>
                                                            abrirEditar(chofer)
                                                        }
                                                    >
                                                        <FaEdit />
                                                        Editar
                                                    </button>

                                                    <button
                                                        className="btn-eliminar"
                                                        onClick={() =>
                                                            eliminarChofer(chofer)
                                                        }
                                                    >
                                                        <FaTrash />
                                                        Eliminar
                                                    </button>

                                                </div>
                                            </td>

                                        </tr>

                                    ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

            {mostrarModal && (

                <div
                    className="modal-fondo"
                    onClick={cerrarModal}
                >

                    <div
                        className="modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <div className="modal-top">

                            <div>
                                <span className="modal-etiqueta">
                                    {modoEdicion
                                        ? "EDITAR"
                                        : "NUEVO CHOFER"}
                                </span>

                                <h2>
                                    {modoEdicion
                                        ? "Editar chofer"
                                        : "Agregar chofer"}
                                </h2>
                            </div>

                            <button
                                className="btn-cerrar"
                                onClick={cerrarModal}
                            >
                                <FaTimes />
                            </button>

                        </div>

                        <form onSubmit={guardarChofer}>

                            <div className="form-grid">

                                <div className="campo">

                                    <label>
                                        Número único
                                    </label>

                                    <input
                                        name="numero_unico"
                                        value={
                                            formulario.numero_unico
                                        }
                                        onChange={cambiarCampo}
                                        placeholder="Ej. CH-001"
                                        required
                                    />

                                </div>

                                <div className="campo">

                                    <label>
                                        Nombre completo
                                    </label>

                                    <input
                                        name="nombre_completo"
                                        value={
                                            formulario.nombre_completo
                                        }
                                        onChange={cambiarCampo}
                                        placeholder="Nombre del chofer"
                                        required
                                    />

                                </div>

                                <div className="campo">

                                    <label>
                                        Correo electrónico
                                    </label>

                                    <input
                                        type="email"
                                        name="correo"
                                        value={
                                            formulario.correo
                                        }
                                        onChange={cambiarCampo}
                                        placeholder="correo@ejemplo.com"
                                        required
                                    />

                                </div>

                                <div className="campo">

                                    <label>
                                        Teléfono
                                    </label>

                                    <input
                                        name="telefono"
                                        value={
                                            formulario.telefono
                                        }
                                        onChange={cambiarCampo}
                                        placeholder="618 000 0000"
                                        required
                                    />

                                </div>

                                <div className="campo campo-completo">

                                    <label>
                                        {modoEdicion
                                            ? "Nueva contraseña"
                                            : "Contraseña"}
                                    </label>

                                    <input
                                        type="password"
                                        name="contrasena"
                                        value={
                                            formulario.contrasena
                                        }
                                        onChange={cambiarCampo}
                                        placeholder={
                                            modoEdicion
                                                ? "Dejar vacío para conservar"
                                                : "Contraseña"
                                        }
                                        required={!modoEdicion}
                                    />

                                </div>

                            </div>

                            <div className="modal-acciones">

                                <button
                                    type="button"
                                    className="btn-cancelar"
                                    onClick={cerrarModal}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="btn-guardar"
                                >
                                    {modoEdicion
                                        ? "Guardar cambios"
                                        : "Crear chofer"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default AdminChofer;