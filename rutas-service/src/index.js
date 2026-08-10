const express = require("express");
const cors = require("cors");
const rutasRoutes = require("./rutas.route");
const horariosRoutes = require("./horarios.route");
const buscarRutaRoutes = require("./buscarruta.route");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", rutasRoutes);
app.use("/", horariosRoutes);
app.use("/", buscarRutaRoutes);

app.get("/", (req, res) => {
res.json({
mensaje: "Servicio de rutas funcionando"
});
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
console.log(`Servidor corriendo en el puerto ${PORT}`);
});
