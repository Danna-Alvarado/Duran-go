const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

require("dotenv").config();

// LOGIN ADMIN
router.post("/login", async (req, res, next) => {
    try {

        const { numero_unico, contrasena } = req.body;

        // Validar datos
        if (!numero_unico || !contrasena) {
            return res.status(400).json({
                error: "Código y contraseña son obligatorios"
            });
        }

        // Buscar administrador
        const { rows } = await pool.query(
            `
            SELECT
                id,
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                contrasena,
                rol
            FROM choferes
            WHERE numero_unico = $1
            `,
            [numero_unico]
        );

        // Usuario no encontrado
        if (rows.length === 0) {
            return res.status(401).json({
                error: "Código o contraseña incorrectos"
            });
        }

        const usuario = rows[0];

        // Verificar que sea administrador
        if (usuario.rol !== "admin") {
            return res.status(403).json({
                error: "No tienes permisos para acceder a esta aplicación"
            });
        }

        // Verificar contraseña
        const passwordCorrecta = await bcrypt.compare(
            contrasena,
            usuario.contrasena
        );

        if (!passwordCorrecta) {
            return res.status(401).json({
                error: "Código o contraseña incorrectos"
            });
        }

        // Crear JWT
        const token = jwt.sign(
            {
                id: usuario.id,
                numero_unico: usuario.numero_unico,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        // Respuesta
        return res.status(200).json({
            mensaje: "Inicio de sesión correcto",
            token,
            usuario: {
                id: usuario.id,
                numero_unico: usuario.numero_unico,
                nombre_completo: usuario.nombre_completo,
                correo: usuario.correo,
                telefono: usuario.telefono,
                rol: usuario.rol
            }
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;

