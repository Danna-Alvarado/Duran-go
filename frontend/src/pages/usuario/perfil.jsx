import "./perfil.css";
import Navar from "../../components/Navar";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaUserCircle, FaSignOutAlt, FaLock } from "react-icons/fa";
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


        const data = await respuesta.json();


        if (respuesta.ok) {
          setUsuario({
            nombre_usuario: data.nombre_usuario || "",
            correo: data.correo || "",
            telefono: data.telefono || "",
            discapacidad_visual: Boolean(data.discapacidad_visual)
          });

        } else {

          setMensaje(data.error);

        }


      } catch (error) {

        console.log(error);
        setMensaje("Error al conectar con el servidor");


      } finally {

        setCargando(false);

      }

    };

    cargarPerfil();

  }, [navigate ]);



  const handleChange = (e) => {

    const { name, value } = e.target;

    setUsuario({
      ...usuario,
      [name]: value
    });

  };

  const guardarCambios = async () => {

    const token = localStorage.getItem("token");

    try {

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

      const data = await respuesta.json();


     if (respuesta.ok) {
        setMensajeGuardar("Cambios guardados correctamente ");
     } else {
    setMensajeGuardar(data.error);
}

    } catch (error) {
      console.log(error);
      setMensaje("Error al actualizar perfil");
    }

  };

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/");
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

            {
              mensaje && (
                <p className="mensaje">
                  {mensaje}
                </p>
              )
            }

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
                    checked={usuario.discapacidad_visual === true}
                    onChange={() =>
                      setUsuario({
                        ...usuario,
                        discapacidad_visual: true
                      })
                    }
                  />

                  Sí

                </label>

                <label>
                  <input
                    type="radio"
                    name="visual"
                    checked={usuario.discapacidad_visual === false}
                    onChange={() =>
                      setUsuario({
                        ...usuario,
                        discapacidad_visual: false
                      })
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
            <button className="btnPassword">
              <FaLock />
              Cambiar contraseña
            </button>

            <button className="btnGuardar"onClick={guardarCambios}>
              Guardar cambios
            </button>

            {mensajeGuardar && (<p className="mensaje-guardar">{mensajeGuardar} </p>)}

            <button className="btnCerrar" onClick={cerrarSesion}>
              <FaSignOutAlt />
              Cerrar sesión
            </button>

          </div>

        </div>

      </div>

    </>

  );
}

export default Perfil;