const express = require("express");
const cors = require("cors");
const rutasRoutes = require("./rutas.route");
const horariosRoutes = require("./horarios.route");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", rutasRoutes);

app.use("/", horariosRoutes);


const PORT = process.env.PORT || 3002;

app.listen(process.env.PORT || 3002, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});