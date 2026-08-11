require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();


// ==========================================
// CORS
// ==========================================

app.use(cors());


// ==========================================
// JSON
// ==========================================

app.use(express.json());


// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

app.use("/auth", require("./auth.routes"));

app.use(
    "/auth/chofer",
    require("./auth.chofer")
);


// ==========================================
// RUTAS DE ADMINISTRADOR
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