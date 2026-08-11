require("dotenv").config();

const express = require("express");
const cors = require("cors");

const adminChoferesRouter = require("./adminchofer.route");

const app = express();


// =====================================================
// MIDDLEWARES
// =====================================================

app.use(cors());

app.use(express.json());


// =====================================================
// RUTA PRINCIPAL
// =====================================================

app.get("/", (req, res) => {

    res.json({
        mensaje: "Ubicación Service funcionando 🚀"
    });

});


// =====================================================
// RUTAS DE ADMINISTRACIÓN DE CHOFERES
// =====================================================

app.use("/", adminChoferesRouter);


// =====================================================
// SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {

    console.log(
        `Ubicación Service ejecutándose en el puerto ${PORT}`
    );

});