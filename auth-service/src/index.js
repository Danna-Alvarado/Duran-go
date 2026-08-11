require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// CORS
app.use(cors());

// JSON
app.use(express.json());

// Rutas de usuarios
app.use("/auth", require("./auth.routes"));

// Rutas de choferes
app.use("/auth/chofer", require("./auth.chofer"));

// Puerto
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});

