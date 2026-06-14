import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./login";
import Home from "./Home";
import CrearCuenta from "./Register";
import Horarios from "./Horarios";
import Guardados from "./Guardados";
import Perfil from "./Perfil";
function App() {
  return (
    <BrowserRouter Basename="/Duran-go">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/register" element={<CrearCuenta />} />
        <Route path="/horarios" element={<Horarios />} />
        <Route path="/guardados" element={<Guardados />} />
        <Route path="/perfil" element={<Perfil />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;