require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// ==========================================
// AUTENTICACIÓN USUARIOS
// ==========================================

app.use(
    "/auth",
    require("./auth.routes")
);


// ==========================================
// AUTENTICACIÓN CHOFER
// ==========================================

app.use(
    "/auth/chofer",
    require("./auth.chofer")
);


// ==========================================
// ADMINISTRACIÓN DE CHOFERES
// ==========================================

app.use(
    "/admin",
    require("./admin.choferes")
);


// ==========================================
// PUERTO
// ==========================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});