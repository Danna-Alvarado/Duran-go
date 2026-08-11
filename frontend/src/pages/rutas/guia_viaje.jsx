import "./guia_viaje.css";
import Navar from "../../components/Navar";

import {
    FaBus,
    FaWalking,
    FaMapMarkerAlt,
    FaArrowDown,
    FaHeart
} from "react-icons/fa";

import {
    useLocation,
    useNavigate
} from "react-router-dom";

import {
    useEffect,
    useState
} from "react";

const USUARIO_URL =
    import.meta.env.VITE_USUARIO_URL;

function GuiaViaje() {

    const location = useLocation();
    const navigate = useNavigate();

    const rutasData =
        location.state?.rutas;

    const rutas =
        rutasData?.rutas || [];

    const [guardadas, setGuardadas] =
        useState({});

    const [guardando, setGuardando] =
        useState(null);

    const [mostrarNombre, setMostrarNombre] =
        useState(null);

    const [nombrePersonalizado, setNombrePersonalizado] =
        useState("");

    useEffect(() => {

        const cargarGuardadas = async () => {

            try {

                const token =
                    localStorage.getItem("token");

                if (!token) {
                    return;
                }

                const respuesta =
                    await fetch(
                        `${USUARIO_URL}/guardados`,
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        }
                    );

                if (!respuesta.ok) {
                    return;
                }

                const datos =
                    await respuesta.json();

                const lista =
                    Array.isArray(datos)
                        ? datos
                        : datos.guardados || [];

                const estado = {};

                lista.forEach(ruta => {

                    estado[ruta.ruta_id] =
                        true;

                });

                setGuardadas(estado);

            } catch (error) {

                console.error(
                    "Error cargando guardados:",
                    error
                );

            }

        };

        cargarGuardadas();

    }, []);

    const abrirGuardar =
        (ruta) => {

            const token =
                localStorage.getItem("token");

            if (!token) {

                alert(
                    "Inicia sesión para guardar esta ruta."
                );

                return;

            }

            if (!ruta?.ruta_id) {
                return;
            }

            if (guardadas[ruta.ruta_id]) {
                return;
            }

            setMostrarNombre(ruta.ruta_id);

            setNombrePersonalizado(
                ruta.ruta || ""
            );
        };

    const cancelarGuardar =
        () => {

            setMostrarNombre(null);

            setNombrePersonalizado("");

        };

    const guardarRuta =
        async (ruta) => {

            try {

                const token =
                    localStorage.getItem("token");

                if (!token) {

                    alert(
                        "Inicia sesión para guardar esta ruta."
                    );

                    return;

                }

                if (!ruta?.ruta_id) {
                    return;
                }

                if (guardadas[ruta.ruta_id]) {
                    return;
                }

                const nombre =
                    nombrePersonalizado.trim();

                if (!nombre) {

                    alert(
                        "Escribe un nombre para guardar la ruta."
                    );

                    return;

                }

                setGuardando(
                    ruta.ruta_id
                );

                const respuesta =
                    await fetch(
                        `${USUARIO_URL}/guardados`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${token}`
                            },

                            body: JSON.stringify({

                                ruta_id:
                                    ruta.ruta_id,

                                nombre_personalizado:
                                    nombre

                            })
                        }
                    );

                const datos =
                    await respuesta.json();

                if (!respuesta.ok) {

                    if (
                        respuesta.status === 409
                    ) {

                        setGuardadas(
                            anterior => ({
                                ...anterior,

                                [ruta.ruta_id]:
                                    true
                            })
                        );

                        setMostrarNombre(null);

                        return;

                    }

                    throw new Error(
                        datos?.mensaje ||
                        datos?.error ||
                        "No se pudo guardar la ruta."
                    );

                }

                setGuardadas(
                    anterior => ({

                        ...anterior,

                        [ruta.ruta_id]:
                            true

                    })
                );

                setMostrarNombre(null);

                setNombrePersonalizado("");

            } catch (error) {

                console.error(
                    "Error guardando ruta:",
                    error
                );

                alert(
                    error.message
                );

            } finally {

                setGuardando(null);

            }

        };

    if (rutas.length === 0) {

        return (

            <div className="guia-page">

                <Navar />

                <main className="guia-container">

                    <div className="guia-vacia">

                        <div className="guia-vacia-icon">
                            <FaBus />
                        </div>

                        <h2>
                            No hay una ruta disponible
                        </h2>

                        <p>
                            Regresa e intenta buscar otro destino.
                        </p>

                        <button
                            className="btn-nueva-ruta"
                            onClick={() =>
                                navigate("/")
                            }
                        >
                            Buscar otra ruta
                        </button>

                    </div>

                </main>

            </div>

        );

    }

    const cantidadCamiones =
        rutas.length;

    const textoCamiones =
        cantidadCamiones === 1
            ? "Necesitas tomar un camión para llegar a tu destino."
            : `Necesitas tomar ${cantidadCamiones} camiones para llegar a tu destino.`;

    const obtenerNumero =
        index => {

            const numeros = [
                "PRIMER",
                "SEGUNDO",
                "TERCER",
                "CUARTO",
                "QUINTO",
                "SEXTO"
            ];

            return numeros[index] ||
                `${index + 1}°`;

        };

    return (

        <div className="guia-page">

            <Navar />

            <main className="guia-container">

                <div className="contenido-guia">

                    <section className="guia-header">

                        <p className="guia-descripcion">
                            {textoCamiones}
                        </p>

                    </section>

                    <section className="recorrido">

                        {rutas.map(
                            (ruta, index) => (

                                <div
                                    className="tramo-ruta"
                                    key={`${ruta.ruta_id}-${index}`}
                                >

                                    {index > 0 && (

                                        <div className="conexion">

                                            <div className="conexion-linea"></div>

                                            <div className="conexion-icono">
                                                <FaWalking />
                                            </div>

                                            <span>
                                                Transbordo
                                            </span>

                                        </div>

                                    )}

                                    <article className="tarjeta-ruta">

                                        <div className="ruta-header">

                                            <div>

                                                <span className="numero-ruta">
                                                    {obtenerNumero(index)} CAMIÓN
                                                </span>

                                                <h2>
                                                    {ruta.ruta}
                                                </h2>

                                            </div>

                                            <div className="ruta-header-derecha">

                                                <div
                                                    className="color-ruta"
                                                    style={{
                                                        backgroundColor:
                                                            ruta.color?.toLowerCase()
                                                    }}
                                                >
                                                    {ruta.color}
                                                </div>

                                                <button
                                                    className={
                                                        guardadas[ruta.ruta_id]
                                                            ? "btn-corazon guardado"
                                                            : "btn-corazon"
                                                    }
                                                    onClick={() =>
                                                        abrirGuardar(ruta)
                                                    }
                                                    disabled={
                                                        guardando ===
                                                        ruta.ruta_id
                                                    }
                                                    title={
                                                        guardadas[ruta.ruta_id]
                                                            ? "Ruta guardada"
                                                            : "Guardar ruta"
                                                    }
                                                >

                                                    <FaHeart />

                                                </button>

                                            </div>

                                        </div>

                                        {mostrarNombre === ruta.ruta_id && (

                                            <div className="nombre-guardar">

                                                <label>
                                                    Nombre de la ruta guardada
                                                </label>

                                                <input
                                                    type="text"
                                                    value={
                                                        nombrePersonalizado
                                                    }
                                                    onChange={e =>
                                                        setNombrePersonalizado(
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="Ej. Ruta a la escuela"
                                                    maxLength={100}
                                                    autoFocus
                                                />

                                                <div className="acciones-guardar">

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            cancelarGuardar
                                                        }
                                                    >
                                                        Cancelar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            guardarRuta(ruta)
                                                        }
                                                        disabled={
                                                            guardando ===
                                                            ruta.ruta_id
                                                        }
                                                    >
                                                        {guardando ===
                                                        ruta.ruta_id
                                                            ? "Guardando..."
                                                            : "Guardar ruta"}
                                                    </button>

                                                </div>

                                            </div>

                                        )}

                                        <div className="paso-ruta">

                                            <div className="paso">

                                                <div className="paso-icono caminar">
                                                    <FaWalking />
                                                </div>

                                                <div className="paso-info">

                                                    <span>
                                                        Camina hasta la parada
                                                    </span>

                                                    <strong>
                                                        {
                                                            ruta.parada_subida?.nombre
                                                            ||
                                                            "Parada cercana"
                                                        }
                                                    </strong>

                                                </div>

                                            </div>

                                            <div className="linea-paso"></div>

                                            <div className="paso">

                                                <div className="paso-icono bus">
                                                    <FaBus />
                                                </div>

                                                <div className="paso-info">

                                                    <span>
                                                        Aborda este camión
                                                    </span>

                                                    <strong>
                                                        Ruta {ruta.ruta}
                                                    </strong>

                                                </div>

                                            </div>

                                            <div className="linea-paso"></div>

                                            <div className="paso">

                                                <div className="paso-icono bajar">
                                                    <FaMapMarkerAlt />
                                                </div>

                                                <div className="paso-info">

                                                    <span>
                                                        Baja en
                                                    </span>

                                                    <strong>
                                                        {
                                                            ruta.parada_bajada?.nombre
                                                            ||
                                                            "Parada de transbordo"
                                                        }
                                                    </strong>

                                                </div>

                                            </div>

                                        </div>

                                    </article>

                                </div>

                            )
                        )}

                    </section>

                    <button
                        className="btn-nueva-ruta"
                        onClick={() =>
                            navigate("/home")
                        }
                    >

                        Buscar otra ruta

                        <FaArrowDown />

                    </button>

                </div>

            </main>

        </div>

    );
}

export default GuiaViaje;

