require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Rutas de usuarios
app.use("/auth", require("./auth.routes"));

// Rutas de choferes
app.use("/auth/chofer", require("./auth.chofer"));


const PORT = process.env.PORT || 3001;

app.listen(process.env.PORT, () => {
    console.log(`Servidor en puerto ${process.env.PORT}`);
});