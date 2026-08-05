const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");
require("dotenv").config();


// LOGIN CHOFER
router.post("/login", async (req, res, next) => {
    try {
        const { numero_unico, contrasena } = req.body;
        if (!numero_unico || !contrasena) {
            return res.status(400).json({
                error: "Código y contraseña son obligatorios"
            });
        }

        const { rows } = await pool.query( ` SELECT id, numero_unico, nombre_completo, correo, telefono, contrasena FROM choferes WHERE numero_unico = $1 `, [numero_unico]);

        if (rows.length === 0) {
            return res.status(401).json({
                error: "Código o contraseña incorrectos"
            });
        }

        const chofer = rows[0];

        const passwordCorrecta = await bcrypt.compare(
            contrasena,
            chofer.contrasena
        );

        if (!passwordCorrecta) {
            return res.status(401).json({error: "Código o contraseña incorrectos" });
        }

        const token = jwt.sign(
            {
                id: chofer.id,
                numero_unico: chofer.numero_unico,
                tipo: "chofer"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.status(200).json({
            mensaje: "Inicio de sesión correcto",
            token,
            chofer: {
                id: chofer.id,
                numero_unico: chofer.numero_unico,
                nombre_completo: chofer.nombre_completo,
                correo: chofer.correo,
                telefono: chofer.telefono
            }
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;