const express = require("express");
const router = express.Router();

const pool = require("./db");
const verificarToken = require("./auth.middleware");

// Obtener todas las rutas guardadas del usuario
router.get("/guardados", verificarToken, async (req, res, next) => {

    try {

        const usuarioId = req.usuario.id;

        const resultado = await pool.query(
            `SELECT
                f.id,
                f.nombre_personalizado,
                r.id AS ruta_id,
                r.nombre,
                r.color
            FROM favoritos f
            INNER JOIN rutas r
                ON f.ruta_id = r.id
            WHERE f.usuario_id = $1
            ORDER BY f.id DESC`,
            [usuarioId]
        );

        res.json(resultado.rows);

    } catch (error) {
        next(error);
    }

});

// Guardar ruta
router.post("/guardados", verificarToken, async (req, res, next) => {

    try {

        const usuarioId = req.usuario.id;
        const { ruta_id, nombre_personalizado } = req.body;

        const existe = await pool.query(
            `SELECT id
             FROM favoritos
             WHERE usuario_id = $1
             AND ruta_id = $2`,
            [usuarioId, ruta_id]
        );

        if (existe.rows.length > 0) {

            return res.status(400).json({
                error: "La ruta ya se encuentra guardada."
            });

        }

        await pool.query(
            `INSERT INTO favoritos
            (usuario_id, ruta_id, nombre_personalizado)
            VALUES ($1,$2,$3)`,
            [usuarioId, ruta_id, nombre_personalizado]
        );

        res.status(201).json({
            mensaje: "Ruta guardada correctamente."
        });

    } catch (error) {
        next(error);
    }

});

// Eliminar ruta
router.delete("/guardados/:id", verificarToken, async (req, res, next) => {

    try {

        const usuarioId = req.usuario.id;

        await pool.query(
            `DELETE FROM favoritos
            WHERE id = $1
            AND usuario_id = $2`,
            [req.params.id, usuarioId]
        );

        res.json({
            mensaje: "Ruta eliminada."
        });

    } catch (error) {
        next(error);
    }

});

module.exports = router;