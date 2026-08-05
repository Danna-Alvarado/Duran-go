const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
require("dotenv").config();

// REGISTRO
router.post("/registro", async (req, res, next) => {
    try {

        const { 
            nombre_usuario, 
            correo, 
            contrasena, 
            telefono, 
            discapacidad_visual 
        } = req.body;

        if (!nombre_usuario || !correo || !contrasena || !telefono) {
            return res.status(400).json({
                error: "Complete todos los campos"
            });
        }

        const hash = await bcrypt.hash(contrasena, 10);

        await pool.query(
            `
            INSERT INTO usuarios
            (
                nombre_usuario,
                correo,
                contrasena,
                telefono,
                discapacidad_visual
            )
            VALUES ($1,$2,$3,$4,$5)
            `,
            [
                nombre_usuario,
                correo,
                hash,
                telefono,
                discapacidad_visual || false
            ]
        );

        res.status(201).json({
            mensaje: "Usuario registrado correctamente"
        });

    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({
                error: "El correo  ya está registrado"
            });
        }
        next(err);
    }
});

// LOGIN
router.post("/login", async (req, res, next) => {
    try {
        const { correo, contrasena } = req.body;
        if (!correo || !contrasena) {
            return res.status(400).json({
                error: "Correo y contraseña son obligatorios"
            });
        }

        const resultado = await pool.query(
            `
            SELECT
                id,
                nombre_usuario,
                correo,
                contrasena,
                telefono,
                discapacidad_visual
            FROM usuarios
            WHERE correo = $1
            `,
            [correo]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                error: "Credenciales inválidas"
            });
        }

        const usuario = resultado.rows[0];

        const passwordCorrecta = await bcrypt.compare(
            contrasena,
            usuario.contrasena
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                error: "Credenciales inválidas"
            });
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                correo: usuario.correo
            },
            process.env.JWT_SECRET,
            {
                expiresIn:"1h"
            }
        );
        res.json({
            token,
            usuario:{
                id: usuario.id,
                nombre_usuario: usuario.nombre_usuario,
                correo: usuario.correo,
                telefono: usuario.telefono,
                discapacidad_visual: usuario.discapacidad_visual
            }

        });

    } catch(err){

        next(err);
    }

});


module.exports = router;