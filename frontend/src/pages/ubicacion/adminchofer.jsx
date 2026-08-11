import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./adminchofer.css";

const AUTH_URL = import.meta.env.VITE_AUTH_URL;
const UBICACION_URL = import.meta.env.VITE_UBICACION_URL;

function AdminChofer() {

    const navigate = useNavigate();

    const [choferes, setChoferes] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const [modal, setModal] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [choferEditando, setChoferEditando] = useState(null);

    const [formulario, setFormulario] = useState({
        numero_unico: "",
        nombre_completo: "",
        correo: "",
        telefono: "",
        contrasena: ""
    });


    // =====================================================
    // OBTENER TOKEN
    // =====================================================

    const obtenerToken = () => {

        const token = localStorage.getItem("tokenAdmin");

        if (!token) {
            navigate("/");
            return null;
        }

        return token;
    };


    // =====================================================
    // PROCESAR RESPUESTA
    // =====================================================

    const obtenerRespuesta = async (respuesta) => {

        const texto = await respuesta.text();

        try {

            return texto
                ? JSON.parse(texto)
                : {};

        } catch {

            throw new Error(
                `El servidor respondió con ${respuesta.status} y no devolvió JSON`
            );

        }

    };


    // =====================================================
    // MANEJAR TOKEN INVÁLIDO
    // =====================================================

    const manejarTokenInvalido = (respuesta) => {

        if (
            respuesta.status === 401 ||
            respuesta.status === 403
        ) {

            localStorage.removeItem("tokenAdmin");
            localStorage.removeItem("admin");

            navigate("/");

            return true;
        }

        return false;
    };


    // =====================================================
    // CARGAR CHOFERES
    //
    // ESTA INFORMACIÓN VIENE DE UBICACIÓN
    //
    // Aquí obtenemos:
    // - chofer
    // - jornada
    // - ruta
    // - autobús
    // - ubicación
    // =====================================================

    const cargarChoferes = async () => {

        try {

            setError("");

            const token = obtenerToken();

            if (!token) {
                return;
            }

            const respuesta = await fetch(
                `${UBICACION_URL}/admin/choferes`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await obtenerRespuesta(respuesta);

            if (manejarTokenInvalido(respuesta)) {
                return;
            }

            if (!respuesta.ok) {

                throw new Error(
                    data.error ||
                    data.mensaje ||
                    "No se pudieron cargar los choferes"
                );

            }

            setChoferes(
                Array.isArray(data.choferes)
                    ? data.choferes
                    : []
            );

        } catch (error) {

            console.error(
                "Error cargando choferes:",
                error
            );

            setError(
                error.message ||
                "Error al cargar los choferes"
            );

        } finally {

            setCargando(false);

        }

    };


    // =====================================================
    // CARGAR AL ENTRAR
    // =====================================================

    useEffect(() => {

        let componenteActivo = true;

        const cargarInicial = async () => {

            try {

                const token = localStorage.getItem("tokenAdmin");

                if (!token) {

                    navigate("/");
                    return;

                }

                const respuesta = await fetch(
                    `${UBICACION_URL}/admin/choferes`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await obtenerRespuesta(respuesta);

                if (
                    respuesta.status === 401 ||
                    respuesta.status === 403
                ) {

                    localStorage.removeItem("tokenAdmin");
                    localStorage.removeItem("admin");

                    navigate("/");
                    return;
                }

                if (!respuesta.ok) {

                    throw new Error(
                        data.error ||
                        data.mensaje ||
                        "No se pudieron cargar los choferes"
                    );

                }

                if (componenteActivo) {

                    setChoferes(
                        Array.isArray(data.choferes)
                            ? data.choferes
                            : []
                    );

                }

            } catch (error) {

                console.error(
                    "Error cargando choferes:",
                    error
                );

                if (componenteActivo) {

                    setError(
                        error.message ||
                        "Error al cargar los choferes"
                    );

                }

            } finally {

                if (componenteActivo) {
                    setCargando(false);
                }

            }

        };

        cargarInicial();

        return () => {
            componenteActivo = false;
        };

    }, [navigate]);


    // =====================================================
    // CAMBIAR CAMPOS
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
    // ABRIR MODAL CREAR
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
    // ABRIR MODAL EDITAR
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
    //
    // CREAR / EDITAR = AUTH
    // =====================================================

    const guardarChofer = async (e) => {

        e.preventDefault();

        try {

            setMensaje("");
            setError("");

            const token = obtenerToken();

            if (!token) {
                return;
            }

            const url = modoEdicion
                ? `${AUTH_URL}/admin/choferes/${choferEditando.id}`
                : `${AUTH_URL}/admin/choferes`;

            const metodo = modoEdicion
                ? "PUT"
                : "POST";

            const cuerpo = {
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

                cuerpo.contrasena =
                    formulario.contrasena;

            }


            const respuesta = await fetch(
                url,
                {
                    method: metodo,

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body:
                        JSON.stringify(cuerpo)
                }
            );


            const data =
                await obtenerRespuesta(
                    respuesta
                );


            if (manejarTokenInvalido(respuesta)) {
                return;
            }


            if (!respuesta.ok) {

                setError(
                    data.error ||
                    data.mensaje ||
                    "No se pudo guardar el chofer"
                );

                return;

            }


            setMensaje(
                modoEdicion
                    ? "Chofer actualizado correctamente"
                    : "Chofer creado correctamente"
            );


            cerrarModal();

            // Actualizamos información del panel
            await cargarChoferes();

        } catch (error) {

            console.error(
                "Error guardando chofer:",
                error
            );

            setError(
                error.message ||
                "Error al conectar con el servidor"
            );

        }

    };


    // =====================================================
    // ELIMINAR CHOFER
    //
    // ELIMINAR = AUTH
    // =====================================================

    const eliminarChofer = async (id) => {

        const confirmar = window.confirm(
            "¿Seguro que deseas eliminar este chofer?"
        );

        if (!confirmar) {
            return;
        }

        try {

            setError("");
            setMensaje("");

            const token = obtenerToken();

            if (!token) {
                return;
            }


            const respuesta = await fetch(
                `${AUTH_URL}/admin/choferes/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


            const data =
                await obtenerRespuesta(
                    respuesta
                );


            if (manejarTokenInvalido(respuesta)) {
                return;
            }


            if (!respuesta.ok) {

                setError(
                    data.error ||
                    data.mensaje ||
                    "No se pudo eliminar el chofer"
                );

                return;

            }


            setMensaje(
                "Chofer eliminado correctamente"
            );


            await cargarChoferes();

        } catch (error) {

            console.error(
                "Error eliminando chofer:",
                error
            );

            setError(
                error.message ||
                "Error al conectar con el servidor"
            );

        }

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

            {/* =================================================
                ENCABEZADO
            ================================================= */}

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


            {/* =================================================
                MENSAJES
            ================================================= */}

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


            {/* =================================================
                CARGANDO
            ================================================= */}

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

                            {/* =================================================
                                HEADER
                            ================================================= */}

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


                            {/* =================================================
                                ESTADO DE JORNADA
                            ================================================= */}

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


                            {/* =================================================
                                DATOS
                            ================================================= */}

                            <div className="datos-chofer">

                                {/* RUTA */}

                                <div>

                                    <strong>
                                        Ruta
                                    </strong>

                                    <span>
                                        {chofer.ruta_nombre ||
                                            "Sin ruta asignada"}
                                    </span>

                                </div>


                                {/* AUTOBÚS */}

                                <div>

                                    <strong>
                                        Autobús
                                    </strong>

                                    <span>
                                        {chofer.numero_bus ||
                                            "Sin autobús"}
                                    </span>

                                </div>


                                {/* UBICACIÓN */}

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


                                {/* ÚLTIMA ACTUALIZACIÓN */}

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


                            {/* =================================================
                                ACCIONES
                            ================================================= */}

                            <div className="acciones-chofer">

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
                                        eliminarChofer(
                                            chofer.id
                                        )
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
                MODAL
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


                        <form
                            onSubmit={guardarChofer}
                        >

                            <label>
                                Código único
                            </label>

                            <input
                                type="text"
                                name="numero_unico"
                                value={
                                    formulario.numero_unico
                                }
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
                                value={
                                    formulario.nombre_completo
                                }
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
                                value={
                                    formulario.correo
                                }
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
                                value={
                                    formulario.telefono
                                }
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
                                value={
                                    formulario.contrasena
                                }
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

        </div>

    );

}

export default AdminChofer;