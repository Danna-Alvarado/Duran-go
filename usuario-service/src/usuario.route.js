const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const pool = require("./db");
const verificarToken = require("./auth.middleware");

router.get("/perfil", verificarToken, async (req, res, next) => {
    try {
        const id = req.usuario.id;

        const resultado = await pool.query(
            `SELECT id, nombre_usuario, correo, telefono, discapacidad_visual
             FROM usuarios
             WHERE id = $1`,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                error: "Usuario no encontrado"
            });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        next(error);
    }
});

router.put("/perfil", verificarToken, async (req, res, next) => {
    try {
        const id = req.usuario.id;

        const {
            nombre_usuario,
            correo,
            telefono,
            discapacidad_visual
        } = req.body;

        await pool.query(
            `UPDATE usuarios
             SET nombre_usuario = $1,
                 correo = $2,
                 telefono = $3,
                 discapacidad_visual = $4
             WHERE id = $5`,
            [
                nombre_usuario,
                correo,
                telefono,
                discapacidad_visual,
                id
            ]
        );

        res.json({
            mensaje: "Perfil actualizado correctamente"
        });

    } catch (error) {
        next(error);
    }
});

router.put(
    "/perfil/contrasena",
    verificarToken,
    async (req, res, next) => {
        try {
            const id = req.usuario.id;

            const {
                contrasena_actual,
                contrasena_nueva
            } = req.body;

            if (!contrasena_actual || !contrasena_nueva) {
                return res.status(400).json({
                    error: "La contraseña actual y la nueva son obligatorias"
                });
            }

            if (contrasena_nueva.length < 6) {
                return res.status(400).json({
                    error: "La nueva contraseña debe tener al menos 6 caracteres"
                });
            }

            const resultado = await pool.query(
                `SELECT contrasena
                 FROM usuarios
                 WHERE id = $1`,
                [id]
            );

            if (resultado.rows.length === 0) {
                return res.status(404).json({
                    error: "Usuario no encontrado"
                });
            }

            const contrasenaValida = await bcrypt.compare(
                contrasena_actual,
                resultado.rows[0].contrasena
            );

            if (!contrasenaValida) {
                return res.status(400).json({
                    error: "La contraseña actual es incorrecta"
                });
            }

            const nuevaHash = await bcrypt.hash(
                contrasena_nueva,
                10
            );

            await pool.query(
                `UPDATE usuarios
                 SET contrasena = $1
                 WHERE id = $2`,
                [nuevaHash, id]
            );

            res.json({
                mensaje: "Contraseña actualizada correctamente"
            });

        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;

