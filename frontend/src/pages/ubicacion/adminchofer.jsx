import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./adminchofer.css";

import {
    obtenerChoferes,
    crearChofer,
    actualizarChofer,
    eliminarChofer
} from "./adminChofer.api";

function AdminChofer() {

    const navigate = useNavigate();

    // =====================================================
    // ESTADOS
    // =====================================================

    const [choferes, setChoferes] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const [modal, setModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [choferEditando, setChoferEditando] = useState(null);

    const [modalAsignar, setModalAsignar] = useState(false);
    const [choferAsignando, setChoferAsignando] = useState(null);

    const [formulario, setFormulario] = useState({
        numero_unico: "",
        nombre_completo: "",
        correo: "",
        telefono: "",
        contrasena: ""
    });

    // =====================================================
    // CARGAR CHOFERES
    // =====================================================

    useEffect(() => {

        let activo = true;

        const cargar = async () => {

            try {

                setCargando(true);
                setError("");

                const token = localStorage.getItem("tokenAdmin");

                if (!token) {
                    navigate("/");
                    return;
                }

                const resultado = await obtenerChoferes(token);

                if (!activo) {
                    return;
                }

                setChoferes(
                    Array.isArray(resultado)
                        ? resultado
                        : []
                );

            } catch (error) {

                console.error(
                    "Error cargando choferes:",
                    error
                );

                if (!activo) {
                    return;
                }

                if (
                    error.status === 401 ||
                    error.status === 403
                ) {

                    localStorage.removeItem("tokenAdmin");
                    localStorage.removeItem("admin");

                    navigate("/");
                    return;
                }

                setError(
                    error.message ||
                    "No se pudieron cargar los choferes"
                );

            } finally {

                if (activo) {
                    setCargando(false);
                }

            }

        };

        cargar();

        return () => {
            activo = false;
        };

    }, [navigate]);

    // =====================================================
    // RECARGAR CHOFERES
    // =====================================================

    const cargarChoferes = async () => {

        try {

            setError("");

            const token = localStorage.getItem("tokenAdmin");

            if (!token) {
                navigate("/");
                return;
            }

            const resultado = await obtenerChoferes(token);

            setChoferes(
                Array.isArray(resultado)
                    ? resultado
                    : []
            );

        } catch (error) {

            console.error(
                "Error recargando choferes:",
                error
            );

            if (
                error.status === 401 ||
                error.status === 403
            ) {

                localStorage.removeItem("tokenAdmin");
                localStorage.removeItem("admin");

                navigate("/");
                return;
            }

            setError(
                error.message ||
                "No se pudieron cargar los choferes"
            );

        }

    };

    // =====================================================
    // CAMBIAR FORMULARIO
    // =====================================================

    const manejarCambio = (e) => {

        const {
            name,
            value
        } = e.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value
        }));

    };

    // =====================================================
    // ABRIR CREAR
    // =====================================================

    const abrirCrear = () => {

        setModoEdicion(false);
        setChoferEditando(null);

        setFormulario({
            numero_unico: "",
            nombre_completo: "",
            correo: "",
            telefono: "",
            contrasena: ""
        });

        setMensaje("");
        setError("");

        setModal(true);

    };

    // =====================================================
    // ABRIR EDITAR
    // =====================================================

    const abrirEditar = (chofer) => {

        setModoEdicion(true);
        setChoferEditando(chofer);

        setFormulario({
            numero_unico:
                chofer.numero_unico || "",

            nombre_completo:
                chofer.nombre_completo || "",

            correo:
                chofer.correo || "",

            telefono:
                chofer.telefono || "",

            contrasena: ""
        });

        setMensaje("");
        setError("");

        setModal(true);

    };

    // =====================================================
    // CERRAR MODAL
    // =====================================================

    const cerrarModal = () => {

        setModal(false);
        setChoferEditando(null);

        setFormulario({
            numero_unico: "",
            nombre_completo: "",
            correo: "",
            telefono: "",
            contrasena: ""
        });

    };

    // =====================================================
    // GUARDAR CHOFER
    // =====================================================

    const guardarChofer = async (e) => {

        e.preventDefault();

        try {

            setMensaje("");
            setError("");

            const token =
                localStorage.getItem("tokenAdmin");

            if (!token) {
                navigate("/");
                return;
            }

            const datos = {
                numero_unico:
                    formulario.numero_unico.trim(),

                nombre_completo:
                    formulario.nombre_completo.trim(),

                correo:
                    formulario.correo.trim(),

                telefono:
                    formulario.telefono.trim()
            };

            if (
                formulario.contrasena.trim() !== ""
            ) {

                datos.contrasena =
                    formulario.contrasena;

            }

            if (modoEdicion) {

                await actualizarChofer(
                    token,
                    choferEditando.id,
                    datos
                );

                setMensaje(
                    "Chofer actualizado correctamente"
                );

            } else {

                await crearChofer(
                    token,
                    datos
                );

                setMensaje(
                    "Chofer creado correctamente"
                );

            }

            cerrarModal();

            await cargarChoferes();

        } catch (error) {

            console.error(
                "Error guardando chofer:",
                error
            );

            if (
                error.status === 401 ||
                error.status === 403
            ) {

                localStorage.removeItem("tokenAdmin");
                localStorage.removeItem("admin");

                navigate("/");
                return;
            }

            setError(
                error.message ||
                "No se pudo guardar el chofer"
            );

        }

    };

    // =====================================================
    // ELIMINAR
    // =====================================================

    const eliminar = async (id) => {

        const confirmar = window.confirm(
            "¿Seguro que deseas eliminar este chofer?"
        );

        if (!confirmar) {
            return;
        }

        try {

            setMensaje("");
            setError("");

            const token =
                localStorage.getItem("tokenAdmin");

            if (!token) {
                navigate("/");
                return;
            }

            await eliminarChofer(
                token,
                id
            );

            setMensaje(
                "Chofer eliminado correctamente"
            );

            await cargarChoferes();

        } catch (error) {

            console.error(
                "Error eliminando chofer:",
                error
            );

            if (
                error.status === 401 ||
                error.status === 403
            ) {

                localStorage.removeItem("tokenAdmin");
                localStorage.removeItem("admin");

                navigate("/");
                return;
            }

            setError(
                error.message ||
                "No se pudo eliminar el chofer"
            );

        }

    };

    // =====================================================
    // ASIGNAR RUTA
    // =====================================================

    const abrirAsignar = (chofer) => {

        setChoferAsignando(chofer);
        setMensaje("");
        setError("");
        setModalAsignar(true);

    };

    // =====================================================
    // VER UBICACIÓN
    // =====================================================

    const verUbicacion = (chofer) => {

        if (
            chofer.latitud === null ||
            chofer.longitud === null
        ) {
            return;
        }

        navigate(
            "/admin/monitoreo",
            {
                state: {
                    choferId: chofer.id
                }
            }
        );

    };

    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div className="admin-chofer-page">

            {/* HEADER */}

            <div className="admin-chofer-header">

                <div>

                    <h1>
                        Administración de choferes
                    </h1>

                    <p>
                        Gestiona y supervisa los choferes de DURAN-GO
                    </p>

                </div>

                <button
                    className="btn-agregar"
                    onClick={abrirCrear}
                >
                    + Agregar chofer
                </button>

            </div>


            {/* MENSAJES */}

            {mensaje && (

                <div className="mensaje-exito">
                    {mensaje}
                </div>

            )}

            {error && (

                <div className="mensaje-error">
                    {error}
                </div>

            )}


            {/* CARGANDO */}

            {cargando ? (

                <div className="estado">

                    <h2>
                        Cargando choferes...
                    </h2>

                    <p>
                        Estamos obteniendo la información.
                    </p>

                </div>

            ) : choferes.length === 0 ? (

                <div className="estado">

                    <h2>
                        No hay choferes registrados
                    </h2>

                    <p>
                        Agrega el primer chofer para comenzar.
                    </p>

                </div>

            ) : (

                <div className="choferes-grid">

                    {choferes.map((chofer) => (

                        <div
                            className="chofer-card-admin"
                            key={chofer.id}
                        >

                            {/* HEADER CARD */}

                            <div className="chofer-card-header">

                                <div className="avatar-chofer">

                                    {chofer.nombre_completo
                                        ?.charAt(0)
                                        .toUpperCase()}

                                </div>

                                <div>

                                    <h2>
                                        {chofer.nombre_completo}
                                    </h2>

                                    <span>
                                        {chofer.numero_unico}
                                    </span>

                                </div>

                            </div>


                            {/* ESTADO */}

                            <div className="estado-chofer">

                                <span
                                    className={
                                        chofer.activo
                                            ? "estado-activo"
                                            : "estado-inactivo"
                                    }
                                >
                                    ●
                                </span>

                                {chofer.activo
                                    ? "En jornada"
                                    : "Fuera de jornada"}

                            </div>


                            {/* DATOS */}

                            <div className="datos-chofer">

                                <div>

                                    <strong>
                                        Ruta
                                    </strong>

                                    <span>
                                        {chofer.ruta_nombre ||
                                            "Sin ruta asignada"}
                                    </span>

                                </div>

                                <div>

                                    <strong>
                                        Autobús
                                    </strong>

                                    <span>
                                        {chofer.numero_bus ||
                                            "Sin autobús"}
                                    </span>

                                </div>

                                <div>

                                    <strong>
                                        Ubicación
                                    </strong>

                                    <span>
                                        {chofer.latitud !== null &&
                                        chofer.longitud !== null
                                            ? "Disponible"
                                            : "No disponible"}
                                    </span>

                                </div>

                                {chofer.ultima_actualizacion && (

                                    <div>

                                        <strong>
                                            Última actualización
                                        </strong>

                                        <span>
                                            {new Date(
                                                chofer.ultima_actualizacion
                                            ).toLocaleString(
                                                "es-MX"
                                            )}
                                        </span>

                                    </div>

                                )}

                            </div>


                            {/* ACCIONES */}

                            <div className="acciones-chofer">

                                <button
                                    className="btn-asignar"
                                    onClick={() =>
                                        abrirAsignar(chofer)
                                    }
                                >
                                    🚍 Asignar ruta
                                </button>


                                {chofer.latitud !== null &&
                                chofer.longitud !== null && (

                                    <button
                                        className="btn-ubicacion"
                                        onClick={() =>
                                            verUbicacion(chofer)
                                        }
                                    >
                                        📍 Ver ubicación
                                    </button>

                                )}


                                <button
                                    className="btn-editar"
                                    onClick={() =>
                                        abrirEditar(chofer)
                                    }
                                >
                                    Editar
                                </button>


                                <button
                                    className="btn-eliminar"
                                    onClick={() =>
                                        eliminar(chofer.id)
                                    }
                                >
                                    Eliminar
                                </button>

                            </div>

                        </div>

                    ))}

                </div>

            )}


            {/* =================================================
                MODAL CREAR / EDITAR
            ================================================= */}

            {modal && (

                <div className="modal-fondo">

                    <div className="modal-chofer">

                        <div className="modal-header">

                            <div>

                                <h2>
                                    {modoEdicion
                                        ? "Editar chofer"
                                        : "Nuevo chofer"}
                                </h2>

                                <p>
                                    {modoEdicion
                                        ? "Actualiza la información del chofer"
                                        : "Registra un nuevo chofer"}
                                </p>

                            </div>

                            <button
                                type="button"
                                className="cerrar-modal"
                                onClick={cerrarModal}
                            >
                                ×
                            </button>

                        </div>


                        <form onSubmit={guardarChofer}>

                            <label>
                                Código único
                            </label>

                            <input
                                type="text"
                                name="numero_unico"
                                value={formulario.numero_unico}
                                onChange={manejarCambio}
                                placeholder="Ej. CH001"
                                required
                            />


                            <label>
                                Nombre completo
                            </label>

                            <input
                                type="text"
                                name="nombre_completo"
                                value={formulario.nombre_completo}
                                onChange={manejarCambio}
                                placeholder="Nombre del chofer"
                                required
                            />


                            <label>
                                Correo electrónico
                            </label>

                            <input
                                type="email"
                                name="correo"
                                value={formulario.correo}
                                onChange={manejarCambio}
                                placeholder="correo@ejemplo.com"
                                required
                            />


                            <label>
                                Teléfono
                            </label>

                            <input
                                type="tel"
                                name="telefono"
                                value={formulario.telefono}
                                onChange={manejarCambio}
                                placeholder="6181234567"
                                required
                            />


                            <label>

                                {modoEdicion
                                    ? "Nueva contraseña (opcional)"
                                    : "Contraseña"}

                            </label>

                            <input
                                type="password"
                                name="contrasena"
                                value={formulario.contrasena}
                                onChange={manejarCambio}
                                placeholder={
                                    modoEdicion
                                        ? "Dejar vacío para conservar"
                                        : "Contraseña"
                                }
                                required={!modoEdicion}
                            />


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


            {/* =================================================
                MODAL ASIGNAR
            ================================================= */}

            {modalAsignar && choferAsignando && (

                <div className="modal-fondo">

                    <div className="modal-chofer">

                        <div className="modal-header">

                            <div>

                                <h2>
                                    Asignar ruta
                                </h2>

                                <p>
                                    Chofer:{" "}
                                    <strong>
                                        {choferAsignando.nombre_completo}
                                    </strong>
                                </p>

                            </div>

                            <button
                                type="button"
                                className="cerrar-modal"
                                onClick={() =>
                                    setModalAsignar(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        <div className="estado">

                            <h3>
                                🚧 Asignación de ruta
                            </h3>

                            <p>
                                Aquí seleccionaremos la ruta y el
                                autobús que utilizará este chofer.
                            </p>

                            <p>
                                El siguiente paso es conectar este
                                modal con los endpoints de
                                <strong> rutas, autobuses y jornadas activas.</strong>
                            </p>

                        </div>


                        <div className="modal-acciones">

                            <button
                                type="button"
                                className="btn-cancelar"
                                onClick={() =>
                                    setModalAsignar(false)
                                }
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}

export default AdminChofer;

