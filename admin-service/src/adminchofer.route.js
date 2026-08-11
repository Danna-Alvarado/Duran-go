const express = require("express");
const router = express.Router();
const pool = require("./db");

router.get("/choferes", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                id,
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                rol
            FROM choferes
            WHERE rol = 'chofer'
            ORDER BY id ASC
        `);

        res.json({
            ok: true,
            choferes: resultado.rows
        });

    } catch (error) {
        console.error("Error obteniendo choferes:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error al obtener los choferes"
        });
    }
});

router.get("/choferes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
            SELECT
                id,
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                rol
            FROM choferes
            WHERE id = $1
              AND rol = 'chofer'
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Chofer no encontrado"
            });
        }

        res.json({
            ok: true,
            chofer: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error obteniendo chofer:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error al obtener el chofer"
        });
    }
});

router.post("/choferes", async (req, res) => {
    try {
        const {
            numero_unico,
            nombre_completo,
            correo,
            telefono,
            contrasena
        } = req.body;

        if (
            !numero_unico ||
            !nombre_completo ||
            !correo ||
            !telefono ||
            !contrasena
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Todos los campos son obligatorios"
            });
        }

        const existente = await pool.query(`
            SELECT id
            FROM choferes
            WHERE numero_unico = $1
               OR correo = $2
        `, [
            numero_unico,
            correo
        ]);

        if (existente.rows.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "El número único o correo ya está registrado"
            });
        }

        const resultado = await pool.query(`
            INSERT INTO choferes (
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                contrasena,
                rol
            )
            VALUES ($1, $2, $3, $4, $5, 'chofer')
            RETURNING
                id,
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                rol
        `, [
            numero_unico,
            nombre_completo,
            correo,
            telefono,
            contrasena
        ]);

        res.status(201).json({
            ok: true,
            mensaje: "Chofer creado correctamente",
            chofer: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error creando chofer:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error al crear el chofer"
        });
    }
});

router.put("/choferes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            numero_unico,
            nombre_completo,
            correo,
            telefono,
            contrasena
        } = req.body;

        if (
            !numero_unico ||
            !nombre_completo ||
            !correo ||
            !telefono
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Todos los campos son obligatorios"
            });
        }

        const existente = await pool.query(`
            SELECT id
            FROM choferes
            WHERE (numero_unico = $1 OR correo = $2)
              AND id <> $3
        `, [
            numero_unico,
            correo,
            id
        ]);

        if (existente.rows.length > 0) {
            return res.status(409).json({
                ok: false,
                mensaje: "El número único o correo ya está registrado"
            });
        }

        let resultado;

        if (contrasena && contrasena.trim() !== "") {
            resultado = await pool.query(`
                UPDATE choferes
                SET
                    numero_unico = $1,
                    nombre_completo = $2,
                    correo = $3,
                    telefono = $4,
                    contrasena = $5
                WHERE id = $6
                  AND rol = 'chofer'
                RETURNING
                    id,
                    numero_unico,
                    nombre_completo,
                    correo,
                    telefono,
                    rol
            `, [
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                contrasena,
                id
            ]);
        } else {
            resultado = await pool.query(`
                UPDATE choferes
                SET
                    numero_unico = $1,
                    nombre_completo = $2,
                    correo = $3,
                    telefono = $4
                WHERE id = $5
                  AND rol = 'chofer'
                RETURNING
                    id,
                    numero_unico,
                    nombre_completo,
                    correo,
                    telefono,
                    rol
            `, [
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                id
            ]);
        }

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Chofer no encontrado"
            });
        }

        res.json({
            ok: true,
            mensaje: "Chofer actualizado correctamente",
            chofer: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error actualizando chofer:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar el chofer"
        });
    }
});

router.delete("/choferes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(`
            DELETE FROM choferes
            WHERE id = $1
              AND rol = 'chofer'
            RETURNING
                id,
                numero_unico,
                nombre_completo
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Chofer no encontrado"
            });
        }

        res.json({
            ok: true,
            mensaje: "Chofer eliminado correctamente",
            chofer: resultado.rows[0]
        });

    } catch (error) {
        console.error("Error eliminando chofer:", error);

        res.status(500).json({
            ok: false,
            mensaje: "Error al eliminar el chofer"
        });
    }
});

module.exports = router;

