require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// Cargar rutas
const authRoutes = require("./auth.routes");
const authChoferRoutes = require("./auth.chofer");


console.log("authRoutes:", typeof authRoutes);
console.log("authChoferRoutes:", typeof authChoferRoutes);



// Registrar rutas
app.use("/auth", authRoutes);
app.use("/auth/chofer", authChoferRoutes);



const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor en puerto ${PORT}`);
});