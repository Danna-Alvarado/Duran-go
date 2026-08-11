import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/login";
import Home from "./pages/rutas/home";
import CrearCuenta from "./pages/auth/register";
import Horarios from "./pages/rutas/horarios";
import Guardados from "./pages/usuario/guardados";
import Perfil from "./pages/usuario/perfil";
import Chofer from "./pages/auth/chofer";
import GuiaViaje from "./pages/rutas/guia_viaje";

import AdminChofer from "./pages/ubicacion/adminchofer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/adminProtectedRoute";



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<CrearCuenta />} />
        <Route path="/chofer" element={<Chofer />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/horarios"
          element={
            <ProtectedRoute>
              <Horarios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/guardados"
          element={
            <ProtectedRoute>
              <Guardados />
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />

        <Route
          path="/guia_viaje"
          element={
            <ProtectedRoute>
              <GuiaViaje />
            </ProtectedRoute>
          }
        />

        <Route
          path="/adminchofer"
          element={
           
              <AdminProtectedRoute>
              <AdminChofer />
            </AdminProtectedRoute>
           
          }
        />

         


      </Routes>
    </BrowserRouter>
  );
}

export default App;