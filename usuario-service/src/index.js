const express = require("express");
const cors = require("cors");

const usuarioRoutes = require("./usuario.route");
const guardadosRoutes = require("./guardados.route");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", usuarioRoutes);
app.use("/", guardadosRoutes);

app.listen(3002, () => {
    console.log("Usuario Service iniciado en puerto 3002");
});