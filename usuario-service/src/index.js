const express = require("express");
const cors = require("cors");

const usuarioRoutes = require("./usuario.route");
const guardadosRoutes = require("./guardados.route");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", usuarioRoutes);
app.use("/", guardadosRoutes);

const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
    console.log(`Usuario Service iniciado en puerto ${PORT}`);
});