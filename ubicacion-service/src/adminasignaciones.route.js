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
// GET
// OBTENER ASIGNACIÓN ACTUAL DE UN CHOFER
// =====================================================

router.get(
    "/admin/asignaciones/chofer/:choferId",
    verificarAdmin,
    async (req, res, next) => {

        try {
            const { choferId } = req.params;

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
                    a.ruta_id,

                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color

                FROM jornadas_activas j

                INNER JOIN choferes c
                    ON c.id = j.chofer_id

                INNER JOIN autobuses a
                    ON a.id = j.autobus_id

                LEFT JOIN rutas r
                    ON r.id = a.ruta_id

                WHERE j.chofer_id = $1
                AND j.activa = true

                LIMIT 1
            `, [choferId]);

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
// GET
// OBTENER TODAS LAS ASIGNACIONES ACTIVAS
// =====================================================

router.get(
    "/admin/asignaciones",
    verificarAdmin,
    async (req, res, next) => {

        try {

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
                    a.ruta_id,

                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color

                FROM jornadas_activas j

                INNER JOIN choferes c
                    ON c.id = j.chofer_id

                INNER JOIN autobuses a
                    ON a.id = j.autobus_id

                LEFT JOIN rutas r
                    ON r.id = a.ruta_id

                WHERE j.activa = true

                ORDER BY
                    c.nombre_completo ASC
            `);

            return res.status(200).json({
                asignaciones: rows
            });

        } catch (error) {

            console.error(
                "Error obteniendo asignaciones:",
                error
            );

            next(error);
        }
    }
);


// =====================================================
// POST
// ASIGNAR CHOFER + RUTA + AUTOBÚS
// =====================================================

router.post(
    "/admin/asignaciones",
    verificarAdmin,
    async (req, res, next) => {

        const cliente = await pool.connect();

        try {

            const {
                chofer_id,
                ruta_id,
                autobus_id
            } = req.body;

            // -----------------------------------------
            // VALIDAR DATOS
            // -----------------------------------------

            if (
                !chofer_id ||
                !ruta_id ||
                !autobus_id
            ) {
                return res.status(400).json({
                    error:
                        "Chofer, ruta y autobús son obligatorios"
                });
            }

            await cliente.query("BEGIN");

            // -----------------------------------------
            // VERIFICAR CHOFER
            // -----------------------------------------

            const chofer = await cliente.query(`
                SELECT
                    id,
                    numero_unico,
                    nombre_completo
                FROM choferes
                WHERE id = $1
                AND rol = 'chofer'
                FOR UPDATE
            `, [chofer_id]);

            if (chofer.rows.length === 0) {

                await cliente.query("ROLLBACK");

                return res.status(404).json({
                    error: "Chofer no encontrado"
                });
            }

            // -----------------------------------------
            // VERIFICAR RUTA
            // -----------------------------------------

            const ruta = await cliente.query(`
                SELECT
                    id,
                    nombre,
                    color
                FROM rutas
                WHERE id = $1
            `, [ruta_id]);

            if (ruta.rows.length === 0) {

                await cliente.query("ROLLBACK");

                return res.status(404).json({
                    error: "Ruta no encontrada"
                });
            }

            // -----------------------------------------
            // VERIFICAR AUTOBÚS
            // -----------------------------------------

            const autobus = await cliente.query(`
                SELECT
                    id,
                    numero_bus,
                    ruta_id
                FROM autobuses
                WHERE id = $1
                FOR UPDATE
            `, [autobus_id]);

            if (autobus.rows.length === 0) {

                await cliente.query("ROLLBACK");

                return res.status(404).json({
                    error: "Autobús no encontrado"
                });
            }

            const autobusData = autobus.rows[0];

            // -----------------------------------------
            // VERIFICAR QUE EL AUTOBÚS PERTENEZCA
            // A LA RUTA SELECCIONADA
            // -----------------------------------------

            if (
                Number(autobusData.ruta_id) !==
                Number(ruta_id)
            ) {

                await cliente.query("ROLLBACK");

                return res.status(400).json({
                    error:
                        "El autobús seleccionado no pertenece a la ruta elegida"
                });
            }

            // -----------------------------------------
            // VERIFICAR SI EL CHOFER YA TIENE JORNADA
            // -----------------------------------------

            const jornadaChofer =
                await cliente.query(`
                    SELECT
                        id,
                        autobus_id,
                        fecha_inicio
                    FROM jornadas_activas
                    WHERE chofer_id = $1
                    AND activa = true
                    FOR UPDATE
                `, [chofer_id]);

            if (jornadaChofer.rows.length > 0) {

                await cliente.query("ROLLBACK");

                return res.status(409).json({
                    error:
                        "El chofer ya tiene una jornada activa"
                });
            }

            // -----------------------------------------
            // VERIFICAR SI EL AUTOBÚS YA ESTÁ ASIGNADO
            // -----------------------------------------

            const jornadaAutobus =
                await cliente.query(`
                    SELECT
                        id,
                        chofer_id,
                        fecha_inicio
                    FROM jornadas_activas
                    WHERE autobus_id = $1
                    AND activa = true
                    FOR UPDATE
                `, [autobus_id]);

            if (jornadaAutobus.rows.length > 0) {

                await cliente.query("ROLLBACK");

                return res.status(409).json({
                    error:
                        "El autobús ya está asignado a otro chofer"
                });
            }

            // -----------------------------------------
            // CREAR JORNADA ACTIVA
            // -----------------------------------------

            const nuevaJornada =
                await cliente.query(`
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

            await cliente.query("COMMIT");

            return res.status(201).json({
                mensaje:
                    "Chofer asignado correctamente",

                asignacion: {
                    ...nuevaJornada.rows[0],
                    ruta_id:
                        ruta.rows[0].id,
                    ruta_nombre:
                        ruta.rows[0].nombre,
                    ruta_color:
                        ruta.rows[0].color,
                    numero_bus:
                        autobusData.numero_bus,
                    numero_unico:
                        chofer.rows[0].numero_unico,
                    nombre_completo:
                        chofer.rows[0].nombre_completo
                }
            });

        } catch (error) {

            await cliente.query("ROLLBACK");

            console.error(
                "Error creando asignación:",
                error
            );

            next(error);

        } finally {

            cliente.release();

        }
    }
);


// =====================================================
// PUT
// CAMBIAR ASIGNACIÓN DE UN CHOFER
// =====================================================

router.put(
    "/admin/asignaciones/chofer/:choferId",
    verificarAdmin,
    async (req, res, next) => {

        const cliente = await pool.connect();

        try {

            const { choferId } = req.params;

            const {
                ruta_id,
                autobus_id
            } = req.body;

            if (
                !ruta_id ||
                !autobus_id
            ) {
                return res.status(400).json({
                    error:
                        "Ruta y autobús son obligatorios"
                });
            }

            await cliente.query("BEGIN");

            // -----------------------------------------
            // VERIFICAR CHOFER
            // -----------------------------------------

            const chofer =
                await cliente.query(`
                    SELECT
                        id,
                        numero_unico,
                        nombre_completo
                    FROM choferes
                    WHERE id = $1
                    AND rol = 'chofer'
                    FOR UPDATE
                `, [choferId]);

            if (chofer.rows.length === 0) {

                await cliente.query("ROLLBACK");

                return res.status(404).json({
                    error:
                        "Chofer no encontrado"
                });
            }

            // -----------------------------------------
            // VERIFICAR RUTA
            // -----------------------------------------

            const ruta =
                await cliente.query(`
                    SELECT
                        id,
                        nombre,
                        color
                    FROM rutas
                    WHERE id = $1
                `, [ruta_id]);

            if (ruta.rows.length === 0) {

                await cliente.query("ROLLBACK");

                return res.status(404).json({
                    error:
                        "Ruta no encontrada"
                });
            }

            // -----------------------------------------
            // VERIFICAR AUTOBÚS
            // -----------------------------------------

            const autobus =
                await cliente.query(`
                    SELECT
                        id,
                        numero_bus,
                        ruta_id
                    FROM autobuses
                    WHERE id = $1
                    FOR UPDATE
                `, [autobus_id]);

            if (autobus.rows.length === 0) {

                await cliente.query("ROLLBACK");

                return res.status(404).json({
                    error:
                        "Autobús no encontrado"
                });
            }

            const autobusData =
                autobus.rows[0];

            // -----------------------------------------
            // AUTOBÚS PERTENECE A RUTA
            // -----------------------------------------

            if (
                Number(autobusData.ruta_id) !==
                Number(ruta_id)
            ) {

                await cliente.query("ROLLBACK");

                return res.status(400).json({
                    error:
                        "El autobús no pertenece a la ruta seleccionada"
                });
            }

            // -----------------------------------------
            // VERIFICAR QUE EL AUTOBÚS NO ESTÉ
            // OCUPADO POR OTRO CHOFER
            // -----------------------------------------

            const autobusOcupado =
                await cliente.query(`
                    SELECT
                        id,
                        chofer_id
                    FROM jornadas_activas
                    WHERE autobus_id = $1
                    AND activa = true
                    AND chofer_id <> $2
                    FOR UPDATE
                `, [
                    autobus_id,
                    choferId
                ]);

            if (autobusOcupado.rows.length > 0) {

                await cliente.query("ROLLBACK");

                return res.status(409).json({
                    error:
                        "El autobús ya está asignado a otro chofer"
                });
            }

            // -----------------------------------------
            // DESACTIVAR ASIGNACIÓN ANTERIOR
            // -----------------------------------------

            await cliente.query(`
                UPDATE jornadas_activas

                SET activa = false

                WHERE chofer_id = $1
                AND activa = true
            `, [choferId]);

            // -----------------------------------------
            // CREAR NUEVA ASIGNACIÓN
            // -----------------------------------------

            const nuevaJornada =
                await cliente.query(`
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
                    choferId,
                    autobus_id
                ]);

            await cliente.query("COMMIT");

            return res.status(200).json({
                mensaje:
                    "Asignación actualizada correctamente",

                asignacion: {
                    ...nuevaJornada.rows[0],
                    ruta_id:
                        ruta.rows[0].id,
                    ruta_nombre:
                        ruta.rows[0].nombre,
                    ruta_color:
                        ruta.rows[0].color,
                    numero_bus:
                        autobusData.numero_bus,
                    numero_unico:
                        chofer.rows[0].numero_unico,
                    nombre_completo:
                        chofer.rows[0].nombre_completo
                }
            });

        } catch (error) {

            await cliente.query("ROLLBACK");

            console.error(
                "Error actualizando asignación:",
                error
            );

            next(error);

        } finally {

            cliente.release();

        }
    }
);


// =====================================================
// DELETE
// QUITAR ASIGNACIÓN DEL CHOFER
// =====================================================

router.delete(
    "/admin/asignaciones/chofer/:choferId",
    verificarAdmin,
    async (req, res, next) => {

        try {

            const { choferId } = req.params;

            const { rows } = await pool.query(`
                UPDATE jornadas_activas

                SET activa = false

                WHERE chofer_id = $1
                AND activa = true

                RETURNING
                    id,
                    chofer_id,
                    autobus_id,
                    fecha_inicio,
                    activa
            `, [choferId]);

            if (rows.length === 0) {

                return res.status(404).json({
                    error:
                        "El chofer no tiene una asignación activa"
                });
            }

            return res.status(200).json({
                mensaje:
                    "Asignación eliminada correctamente",

                asignacion:
                    rows[0]
            });

        } catch (error) {

            console.error(
                "Error eliminando asignación:",
                error
            );

            next(error);
        }
    }
);


module.exports = router;