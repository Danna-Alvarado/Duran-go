const express = require("express");
const router = express.Router();
const pool = require("./db");

router.post("/buscar-ruta", async (req, res) => {
try {
console.log("BUSCAR RUTA: endpoint funcionando");


    const resultado = await pool.query("SELECT 1 AS prueba");

    console.log("BUSCAR RUTA: BD funcionando");
    console.log(resultado.rows);

    res.json({
        mensaje: "Endpoint funcionando",
        bd: resultado.rows
    });

} catch (error) {
    console.error("ERROR EN BUSCAR-RUTA:", error);

    res.status(500).json({
        mensaje: "Error interno buscando rutas",
        error: error.message
    });
}


});

module.exports = router;
