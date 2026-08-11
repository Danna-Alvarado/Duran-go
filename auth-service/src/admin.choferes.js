const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

require("dotenv").config();


// ==========================================
// MIDDLEWARE: VERIFICAR ADMIN
// ==========================================

function verificarAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: "Token no proporcionado"
            });
        }

        const partes = authHeader.split(" ");

        if (partes.length !== 2 || partes[0] !== "Bearer") {
            return res.status(401).json({
                error: "Formato de token inválido"
            });
        }

        const token = partes[1];

        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (usuario.rol !== "admin") {
            return res.status(403).json({
                error: "No tienes permisos de administrador"
            });
        }

        req.usuario = usuario;

        next();

    } catch (error) {
        console.error("Error verificando token:", error);

        return res.status(401).json({
            error: "Token inválido o expirado"
        });
    }
}


// ==========================================
// GET - OBTENER CHOFERES
// ==========================================

router.get("/choferes", verificarAdmin, async (req, res, next) => {

    try {

        const { rows } = await pool.query(`
            SELECT
                id,
                numero_unico,
                nombre_completo,
                correo,
                telefono,
                rol
            FROM choferes
            WHERE rol = 'chofer'
            ORDER BY id DESC
        `);

        return res.status(200).json({
            choferes: rows
        });

    } catch (error) {

        console.error("Error obteniendo choferes:", error);

        next(error);
    }
});


// ==========================================
// POST - CREAR CHOFER
// ==========================================

router.post("/choferes", verificarAdmin, async (req, res, next) => {

    try {

        const {
            numero_unico,
            nombre_completo,
            correo,
            telefono,
            contrasena
        } = req.body;


        // Validaciones
        if (
            !numero_unico ||
            !nombre_completo ||
            !correo ||
            !contrasena
        ) {
            return res.status(400).json({
                error: "Número único, nombre, correo y contraseña son obligatorios"
            });
        }


        // Verificar número único
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
                error: "El número único ya está registrado"
            });
        }


        // Verificar correo
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
        const hash = await bcrypt.hash(contrasena, 10);


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
                telefono || null,
                hash
            ]
        );


        return res.status(201).json({
            mensaje: "Chofer creado correctamente",
            chofer: rows[0]
        });

    } catch (error) {

        console.error("Error creando chofer:", error);

        next(error);
    }
});


// ==========================================
// PUT - ACTUALIZAR CHOFER
// ==========================================

router.put("/choferes/:id", verificarAdmin, async (req, res, next) => {

    try {

        const { id } = req.params;

        const {
            numero_unico,
            nombre_completo,
            correo,
            telefono,
            contrasena
        } = req.body;


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


        let query;
        let valores;


        if (contrasena) {

            const hash = await bcrypt.hash(
                contrasena,
                10
            );

            query = `
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
            `;

            valores = [
                numero_unico,
                nombre_completo,
                correo,
                telefono || null,
                hash,
                id
            ];

        } else {

            query = `
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
            `;

            valores = [
                numero_unico,
                nombre_completo,
                correo,
                telefono || null,
                id
            ];
        }


        const { rows } = await pool.query(
            query,
            valores
        );


        return res.status(200).json({
            mensaje: "Chofer actualizado correctamente",
            chofer: rows[0]
        });

    } catch (error) {

        console.error("Error actualizando chofer:", error);

        next(error);
    }
});


// ==========================================
// DELETE - ELIMINAR CHOFER
// ==========================================

router.delete("/choferes/:id", verificarAdmin, async (req, res, next) => {

    try {

        const { id } = req.params;


        const { rows } = await pool.query(
            `
            DELETE FROM choferes
            WHERE id = $1
            AND rol = 'chofer'
            RETURNING id
            `,
            [id]
        );


        if (rows.length === 0) {
            return res.status(404).json({
                error: "Chofer no encontrado"
            });
        }


        return res.status(200).json({
            mensaje: "Chofer eliminado correctamente"
        });

    } catch (error) {

        console.error("Error eliminando chofer:", error);

        next(error);
    }
});


module.exports = router;