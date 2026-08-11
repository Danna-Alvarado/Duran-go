const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
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

        const partes = authHeader.split(" ");

        if (
            partes.length !== 2 ||
            partes[0] !== "Bearer"
        ) {
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
                error: "Acceso exclusivo para administradores"
            });
        }

        req.usuario = usuario;

        next();

    } catch (error) {

        console.error(
            "Error verificando administrador:",
            error
        );

        return res.status(401).json({
            error: "Token inválido o expirado"
        });

    }

};


// =====================================================
// GET - OBTENER RUTAS
// =====================================================

router.get(
    "/admin/rutas",
    verificarAdmin,
    async (req, res, next) => {

        try {

            const { rows } = await pool.query(`
                SELECT
                    id,
                    nombre,
                    color
                FROM rutas
                ORDER BY nombre ASC
            `);

            return res.status(200).json({
                rutas: rows
            });

        } catch (error) {

            console.error(
                "Error obteniendo rutas:",
                error
            );

            next(error);

        }

    }
);


// =====================================================
// GET - OBTENER AUTOBUSES
//
// Se puede filtrar por ruta:
//
// /admin/autobuses?ruta_id=5
// =====================================================

router.get(
    "/admin/autobuses",
    verificarAdmin,
    async (req, res, next) => {

        try {

            const { ruta_id } = req.query;

            let query = `
                SELECT
                    a.id,
                    a.numero_bus,
                    a.ruta_id,
                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color,
                    a.latitud,
                    a.longitud,
                    a.ultima_actualizacion
                FROM autobuses a

                INNER JOIN rutas r
                    ON r.id = a.ruta_id
            `;

            const valores = [];

            if (ruta_id) {

                query += `
                    WHERE a.ruta_id = $1
                `;

                valores.push(ruta_id);

            }

            query += `
                ORDER BY a.numero_bus ASC
            `;

            const { rows } = await pool.query(
                query,
                valores
            );

            return res.status(200).json({
                autobuses: rows
            });

        } catch (error) {

            console.error(
                "Error obteniendo autobuses:",
                error
            );

            next(error);

        }

    }
);


// =====================================================
// GET - OBTENER ASIGNACIÓN ACTUAL DE UN CHOFER
// =====================================================

router.get(
    "/admin/choferes/:id/asignacion",
    verificarAdmin,
    async (req, res, next) => {

        try {

            const { id } = req.params;

            const { rows } = await pool.query(`
                SELECT
                    j.id AS jornada_id,
                    j.chofer_id,
                    j.autobus_id,
                    j.fecha_inicio,
                    j.activa,

                    c.numero_unico,
                    c.nombre_completo,

                    a.numero_bus,

                    r.id AS ruta_id,
                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color

                FROM jornadas_activas j

                INNER JOIN choferes c
                    ON c.id = j.chofer_id

                INNER JOIN autobuses a
                    ON a.id = j.autobus_id

                INNER JOIN rutas r
                    ON r.id = a.ruta_id

                WHERE j.chofer_id = $1
                AND j.activa = true

                LIMIT 1
            `, [id]);

            if (rows.length === 0) {

                return res.status(200).json({
                    asignacion: null
                });

            }

            return res.status(200).json({
                asignacion: rows[0]
            });

        } catch (error) {

            console.error(
                "Error obteniendo asignación:",
                error
            );

            next(error);

        }

    }
);


// =====================================================
// POST - ASIGNAR AUTOBÚS A CHOFER
//
// La ruta se obtiene automáticamente del autobús.
//
// Esto crea una jornada activa.
//
// Body:
//
// {
//     "chofer_id": 1,
//     "autobus_id": 5
// }
// =====================================================

router.post(
    "/admin/asignaciones",
    verificarAdmin,
    async (req, res, next) => {

        const client = await pool.connect();

        try {

            const {
                chofer_id,
                autobus_id
            } = req.body;


            // -----------------------------------------
            // VALIDAR DATOS
            // -----------------------------------------

            if (
                !chofer_id ||
                !autobus_id
            ) {

                return res.status(400).json({
                    error:
                        "chofer_id y autobus_id son obligatorios"
                });

            }


            await client.query("BEGIN");


            // -----------------------------------------
            // VERIFICAR CHOFER
            // -----------------------------------------

            const choferResult = await client.query(`
                SELECT
                    id,
                    nombre_completo,
                    numero_unico
                FROM choferes
                WHERE id = $1
                AND rol = 'chofer'
                FOR UPDATE
            `, [chofer_id]);


            if (choferResult.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Chofer no encontrado"
                });

            }


            // -----------------------------------------
            // VERIFICAR AUTOBÚS
            // -----------------------------------------

            const autobusResult = await client.query(`
                SELECT
                    a.id,
                    a.numero_bus,
                    a.ruta_id,
                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color
                FROM autobuses a

                INNER JOIN rutas r
                    ON r.id = a.ruta_id

                WHERE a.id = $1

                FOR UPDATE
            `, [autobus_id]);


            if (autobusResult.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Autobús no encontrado"
                });

            }


            const autobus =
                autobusResult.rows[0];


            // -----------------------------------------
            // VERIFICAR SI EL CHOFER YA TIENE JORNADA
            // -----------------------------------------

            const jornadaChofer = await client.query(`
                SELECT
                    id,
                    autobus_id
                FROM jornadas_activas
                WHERE chofer_id = $1
                AND activa = true
                FOR UPDATE
            `, [chofer_id]);


            if (jornadaChofer.rows.length > 0) {

                await client.query("ROLLBACK");

                return res.status(409).json({
                    error:
                        "El chofer ya tiene una jornada activa"
                });

            }


            // -----------------------------------------
            // VERIFICAR SI EL AUTOBÚS YA ESTÁ OCUPADO
            // -----------------------------------------

            const jornadaAutobus = await client.query(`
                SELECT
                    j.id,
                    j.chofer_id,
                    c.nombre_completo
                FROM jornadas_activas j

                INNER JOIN choferes c
                    ON c.id = j.chofer_id

                WHERE j.autobus_id = $1
                AND j.activa = true

                FOR UPDATE
            `, [autobus_id]);


            if (jornadaAutobus.rows.length > 0) {

                await client.query("ROLLBACK");

                return res.status(409).json({
                    error:
                        `El autobús ${autobus.numero_bus} ya está asignado a ${jornadaAutobus.rows[0].nombre_completo}`
                });

            }


            // -----------------------------------------
            // CREAR JORNADA
            // -----------------------------------------

            const jornadaResult = await client.query(`
                INSERT INTO jornadas_activas (
                    chofer_id,
                    autobus_id,
                    fecha_inicio,
                    activa
                )

                VALUES (
                    $1,
                    $2,
                    NOW(),
                    true
                )

                RETURNING
                    id,
                    chofer_id,
                    autobus_id,
                    fecha_inicio,
                    activa
            `, [
                chofer_id,
                autobus_id
            ]);


            await client.query("COMMIT");


            return res.status(201).json({

                mensaje:
                    "Chofer asignado correctamente",

                jornada:
                    jornadaResult.rows[0],

                asignacion: {

                    chofer_id,

                    autobus_id,

                    numero_bus:
                        autobus.numero_bus,

                    ruta_id:
                        autobus.ruta_id,

                    ruta_nombre:
                        autobus.ruta_nombre,

                    ruta_color:
                        autobus.ruta_color

                }

            });

        } catch (error) {

            await client.query("ROLLBACK");

            console.error(
                "Error asignando chofer:",
                error
            );

            next(error);

        } finally {

            client.release();

        }

    }
);


// =====================================================
// PUT - CAMBIAR ASIGNACIÓN
//
// Si el chofer ya tiene jornada:
//
// cambia el autobús.
//
// Body:
//
// {
//     "autobus_id": 5
// }
// =====================================================

router.put(
    "/admin/choferes/:id/asignacion",
    verificarAdmin,
    async (req, res, next) => {

        const client = await pool.connect();

        try {

            const { id } = req.params;
            const { autobus_id } = req.body;


            if (!autobus_id) {

                return res.status(400).json({
                    error:
                        "autobus_id es obligatorio"
                });

            }


            await client.query("BEGIN");


            // -----------------------------------------
            // VERIFICAR CHOFER
            // -----------------------------------------

            const choferResult = await client.query(`
                SELECT
                    id,
                    nombre_completo
                FROM choferes
                WHERE id = $1
                AND rol = 'chofer'
            `, [id]);


            if (choferResult.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Chofer no encontrado"
                });

            }


            // -----------------------------------------
            // VERIFICAR AUTOBÚS
            // -----------------------------------------

            const autobusResult = await client.query(`
                SELECT
                    a.id,
                    a.numero_bus,
                    a.ruta_id,
                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color
                FROM autobuses a

                INNER JOIN rutas r
                    ON r.id = a.ruta_id

                WHERE a.id = $1

                FOR UPDATE
            `, [autobus_id]);


            if (autobusResult.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Autobús no encontrado"
                });

            }


            const autobus =
                autobusResult.rows[0];


            // -----------------------------------------
            // VERIFICAR QUE EL AUTOBÚS NO ESTÉ OCUPADO
            // -----------------------------------------

            const ocupado = await client.query(`
                SELECT
                    j.id,
                    j.chofer_id,
                    c.nombre_completo
                FROM jornadas_activas j

                INNER JOIN choferes c
                    ON c.id = j.chofer_id

                WHERE j.autobus_id = $1
                AND j.activa = true
                AND j.chofer_id <> $2

                FOR UPDATE
            `, [
                autobus_id,
                id
            ]);


            if (ocupado.rows.length > 0) {

                await client.query("ROLLBACK");

                return res.status(409).json({
                    error:
                        `El autobús ${autobus.numero_bus} ya está asignado a ${ocupado.rows[0].nombre_completo}`
                });

            }


            // -----------------------------------------
            // BUSCAR JORNADA DEL CHOFER
            // -----------------------------------------

            const jornada = await client.query(`
                SELECT id
                FROM jornadas_activas
                WHERE chofer_id = $1
                AND activa = true
                LIMIT 1
                FOR UPDATE
            `, [id]);


            // -----------------------------------------
            // SI NO TIENE JORNADA, CREARLA
            // -----------------------------------------

            if (jornada.rows.length === 0) {

                await client.query(`
                    INSERT INTO jornadas_activas (
                        chofer_id,
                        autobus_id,
                        fecha_inicio,
                        activa
                    )

                    VALUES (
                        $1,
                        $2,
                        NOW(),
                        true
                    )
                `, [
                    id,
                    autobus_id
                ]);

            } else {

                // -------------------------------------
                // SI YA TIENE JORNADA, ACTUALIZARLA
                // -------------------------------------

                await client.query(`
                    UPDATE jornadas_activas

                    SET
                        autobus_id = $1

                    WHERE id = $2
                `, [
                    autobus_id,
                    jornada.rows[0].id
                ]);

            }


            await client.query("COMMIT");


            return res.status(200).json({

                mensaje:
                    "Asignación actualizada correctamente",

                asignacion: {

                    chofer_id: Number(id),

                    autobus_id:
                        autobus.id,

                    numero_bus:
                        autobus.numero_bus,

                    ruta_id:
                        autobus.ruta_id,

                    ruta_nombre:
                        autobus.ruta_nombre,

                    ruta_color:
                        autobus.ruta_color

                }

            });

        } catch (error) {

            await client.query("ROLLBACK");

            console.error(
                "Error actualizando asignación:",
                error
            );

            next(error);

        } finally {

            client.release();

        }

    }
);


// =====================================================
// DELETE - FINALIZAR JORNADA
// =====================================================

router.delete(
    "/admin/choferes/:id/asignacion",
    verificarAdmin,
    async (req, res, next) => {

        try {

            const { id } = req.params;

            const { rows } = await pool.query(`
                UPDATE jornadas_activas

                SET
                    activa = false,
                    fecha_fin = NOW()

                WHERE chofer_id = $1
                AND activa = true

                RETURNING
                    id,
                    chofer_id,
                    autobus_id,
                    fecha_inicio,
                    fecha_fin,
                    activa
            `, [id]);


            if (rows.length === 0) {

                return res.status(404).json({
                    error:
                        "El chofer no tiene una jornada activa"
                });

            }


            return res.status(200).json({

                mensaje:
                    "Jornada finalizada correctamente",

                jornada:
                    rows[0]

            });

        } catch (error) {

            console.error(
                "Error finalizando jornada:",
                error
            );

            next(error);

        }

    }
);


// =====================================================
// EXPORTAR
// =====================================================

module.exports = router;
