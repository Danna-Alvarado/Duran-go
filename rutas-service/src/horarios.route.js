const express = require("express");
const router = express.Router();
const pool = require("./db");



// Obtener todos los horarios
router.get("/horarios", async(req,res)=>{

    try{

        const resultado = await pool.query(
            "SELECT * FROM horarios ORDER BY hora_paso"
        );

        res.json(resultado.rows);


    }catch(error){

        console.error(error);

        res.status(500).json({
            error:"Error al obtener horarios"
        });

    }

});





// Buscar horarios por ruta y parada
router.get("/horarios/buscar", async(req,res)=>{


    try{


        const {
            ruta,
            parada
        } = req.query;



        if(!ruta || !parada){

            return res.status(400).json({
                mensaje:"Se necesita ruta y parada"
            });

        }




        const resultado = await pool.query(

            `
            SELECT 
                id,
                ruta_id,
                parada_id,
                hora_paso

            FROM horarios

            WHERE ruta_id=$1
            AND parada_id=$2

            ORDER BY hora_paso

            `,

            [
                ruta,
                parada
            ]

        );



        res.json(resultado.rows);



    }catch(error){


        console.error(error);


        res.status(500).json({
            error:"Error buscando horarios"
        });


    }


});





// Obtener paradas de una ruta
router.get("/paradas/ruta/:ruta_id", async(req,res)=>{


    try{


        const {ruta_id}=req.params;



        const resultado = await pool.query(

            `SELECT DISTINCT p.id, p.nombre FROM paradas p INNER JOIN horarios h ON p.id = h.parada_id WHERE h.ruta_id=$1 ORDER BY p.nombre `,  [ruta_id]);



        res.json(resultado.rows);


    }catch(error){


        console.error(error);


        res.status(500).json({
            error:"Error obteniendo paradas"
        });


    }


});





module.exports = router;