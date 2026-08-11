require("dotenv").config();

const express = require("express");
const cors = require("cors");

const adminChoferesRouter = require("./adminchofer.route");
const adminAsignacionesRouter = require("./adminasignaciones.route");

const app = express();

app.use(cors());
app.use(express.json());

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {
    res.json({
        mensaje: "Ubicación Service funcionando 🚀"
    });
});

// =====================================================
// RUTAS
// =====================================================

app.use("/", adminChoferesRouter);
app.use("/", adminAsignacionesRouter);

// =====================================================
// SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log(
        `Ubicación Service ejecutándose en el puerto ${PORT}`
    );
});