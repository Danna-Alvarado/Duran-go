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

        const bcrypt = require("bcrypt");

        bcrypt.hash("123456", 10).then(hash => {
            console.log("HASH:");
            console.log(hash);
        });

        console.log("========== LOGIN CHOFER ==========");
        console.log("numero_unico recibido:", numero_unico);
        console.log("contraseña recibida:", contrasena ? "SI" : "NO");

        if (!numero_unico || !contrasena) {
            return res.status(400).json({
                error: "Código y contraseña son obligatorios"
            });
        }

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

        console.log("Resultado BD:", rows);

        if (rows.length === 0) {

            console.log("❌ NO SE ENCONTRÓ EL CHOFER");

            return res.status(401).json({
                error: "Código o contraseña incorrectos"
            });
        }

        const usuario = rows[0];

        console.log("Chofer encontrado:", {
            id: usuario.id,
            numero_unico: usuario.numero_unico,
            nombre: usuario.nombre_completo,
            rol: usuario.rol,
            tieneContrasena: !!usuario.contrasena
        });

        if (usuario.rol !== "admin") {

            console.log("❌ EL ROL NO ES ADMIN:", usuario.rol);

            return res.status(403).json({
                error: "No tienes permisos para acceder a esta aplicación"
            });
        }

        const passwordCorrecta = await bcrypt.compare(
            contrasena,
            usuario.contrasena
        );

        console.log("Contraseña correcta:", passwordCorrecta);

        if (!passwordCorrecta) {

            console.log("❌ CONTRASEÑA INCORRECTA");

            return res.status(401).json({
                error: "Código o contraseña incorrectos"
            });
        }

        console.log("✅ LOGIN CORRECTO");

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
        console.error("❌ ERROR LOGIN CHOFER:", err);
        next(err);
    }
});
module.exports = router;