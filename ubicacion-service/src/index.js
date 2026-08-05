require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
    res.json({
        mensaje: "Ubicación Service funcionando 🚀"
    });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(`Ubicación Service ejecutándose en el puerto ${PORT}`);
});