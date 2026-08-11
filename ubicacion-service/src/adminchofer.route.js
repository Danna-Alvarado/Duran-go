const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("./db");

require("dotenv").config();


// =====================================================
// MIDDLEWARE: VERIFICAR ADMIN
// =====================================================

const verificarAdmin = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: "Token no proporcionado"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                error: "Token inválido"
            });
        }

        const jwt = require("jsonwebtoken");

        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (usuario.rol !== "admin") {
            return res.status(403).json({
                error: "Acceso exclusivo para administradores"
            });
        }

        req.usuario = usuario;

        next();

    } catch (error) {

        return res.status(401).json({
            error: "Token inválido o expirado"
        });

    }

};


// =====================================================
// OBTENER TODOS LOS CHOFERES
// =====================================================

router.get("/admin/choferes", verificarAdmin, async (req, res, next) => {

    try {

        const { rows } = await pool.query(`
            SELECT
                c.id,
                c.numero_unico,
                c.nombre_completo,
                c.correo,
                c.telefono,

                CASE
                    WHEN j.id IS NOT NULL
                    AND j.activa = true
                    THEN true
                    ELSE false
                END AS activo,

                r.id AS ruta_id,
                r.nombre AS ruta_nombre,
                r.color AS ruta_color,

                a.id AS autobus_id,
                a.numero_bus,

                a.latitud,
                a.longitud,
                a.ultima_actualizacion

            FROM choferes c

            LEFT JOIN jornadas_activas j
                ON j.chofer_id = c.id
                AND j.activa = true

            LEFT JOIN autobuses a
                ON a.id = j.autobus_id

            LEFT JOIN rutas r
                ON r.id = a.ruta_id

            WHERE c.rol = 'chofer'

            ORDER BY c.nombre_completo ASC
        `);

        return res.status(200).json({
            choferes: rows
        });

    } catch (error) {

        next(error);

    }

});


// =====================================================
// OBTENER UN CHOFER POR ID
// =====================================================

router.get("/admin/choferes/:id", verificarAdmin, async (req, res, next) => {

    try {

        const { id } = req.params;

        const { rows } = await pool.query(`
            SELECT
                c.id,
                c.numero_unico,
                c.nombre_completo,
                c.correo,
                c.telefono,

                CASE
                    WHEN j.id IS NOT NULL
                    AND j.activa = true
                    THEN true
                    ELSE false
                END AS activo,

                r.id AS ruta_id,
                r.nombre AS ruta_nombre,
                r.color AS ruta_color,

                a.id AS autobus_id,
                a.numero_bus,

                a.latitud,
                a.longitud,
                a.ultima_actualizacion

            FROM choferes c

            LEFT JOIN jornadas_activas j
                ON j.chofer_id = c.id
                AND j.activa = true

            LEFT JOIN autobuses a
                ON a.id = j.autobus_id

            LEFT JOIN rutas r
                ON r.id = a.ruta_id

            WHERE c.id = $1
            AND c.rol = 'chofer'

            LIMIT 1
        `, [id]);

        if (rows.length === 0) {

            return res.status(404).json({
                error: "Chofer no encontrado"
            });

        }

        return res.status(200).json({
            chofer: rows[0]
        });

    } catch (error) {

        next(error);

    }

});


// =====================================================
// CREAR CHOFER
// =====================================================

router.post("/admin/choferes", verificarAdmin, async (req, res, next) => {

    try {

        const {
            numero_unico,
            nombre_completo,
            correo,
            telefono,
            contrasena
        } = req.body;


        // Validar campos
        if (
            !numero_unico ||
            !nombre_completo ||
            !correo ||
            !telefono ||
            !contrasena
        ) {

            return res.status(400).json({
                error: "Todos los campos son obligatorios"
            });

        }


        // Verificar código existente
        const existeNumero = await pool.query(
            `
            SELECT id
            FROM choferes
            WHERE numero_unico = $1
            `,
            [numero_unico]
        );

        if (existeNumero.rows.length > 0) {

            return res.status(409).json({
                error: "El código del chofer ya existe"
            });

        }


        // Verificar correo existente
        const existeCorreo = await pool.query(
            `
            SELECT id
            FROM choferes
            WHERE correo = $1
            `,
            [correo]
        );

        if (existeCorreo.rows.length > 0) {

            return res.status(409).json({
                error: "El correo ya está registrado"
            });

        }


        // Encriptar contraseña
        const hash = await bcrypt.hash(
            contrasena,
            10
        );


        // Crear chofer
        const { rows } = await pool.query(
            `
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
            `,
            [
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                hash
            ]
        );


        return res.status(201).json({
            mensaje: "Chofer creado correctamente",
            chofer: rows[0]
        });

    } catch (error) {

        next(error);

    }

});


// =====================================================
// EDITAR CHOFER
// =====================================================

router.put("/admin/choferes/:id", verificarAdmin, async (req, res, next) => {

    try {

        const { id } = req.params;

        const {
            numero_unico,
            nombre_completo,
            correo,
            telefono,
            contrasena
        } = req.body;


        // Verificar que exista
        const existe = await pool.query(
            `
            SELECT id
            FROM choferes
            WHERE id = $1
            AND rol = 'chofer'
            `,
            [id]
        );

        if (existe.rows.length === 0) {

            return res.status(404).json({
                error: "Chofer no encontrado"
            });

        }


        // Si viene contraseña, actualizarla
        if (contrasena) {

            const hash = await bcrypt.hash(
                contrasena,
                10
            );

            const { rows } = await pool.query(
                `
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
                `,
                [
                    numero_unico,
                    nombre_completo,
                    correo,
                    telefono,
                    hash,
                    id
                ]
            );

            return res.status(200).json({
                mensaje: "Chofer actualizado correctamente",
                chofer: rows[0]
            });

        }


        // Actualizar sin cambiar contraseña
        const { rows } = await pool.query(
            `
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
            `,
            [
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                id
            ]
        );


        return res.status(200).json({
            mensaje: "Chofer actualizado correctamente",
            chofer: rows[0]
        });

    } catch (error) {

        next(error);

    }

});


// =====================================================
// ELIMINAR CHOFER
// =====================================================

router.delete("/admin/choferes/:id", verificarAdmin, async (req, res, next) => {

    try {

        const { id } = req.params;


        const { rows } = await pool.query(
            `
            DELETE FROM choferes
            WHERE id = $1
            AND rol = 'chofer'

            RETURNING
                id,
                numero_unico,
                nombre_completo
            `,
            [id]
        );


        if (rows.length === 0) {

            return res.status(404).json({
                error: "Chofer no encontrado"
            });

        }


        return res.status(200).json({
            mensaje: "Chofer eliminado correctamente",
            chofer: rows[0]
        });

    } catch (error) {

        next(error);

    }

});


module.exports = router;