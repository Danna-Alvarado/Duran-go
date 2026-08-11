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
// GET /admin/asignaciones/rutas
// =====================================================

router.get(
    "/admin/asignaciones/rutas",
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
// =====================================================
// Puede recibir:
//
// /admin/asignaciones/autobuses
//
// o:
//
// /admin/asignaciones/autobuses?ruta_id=5
// =====================================================

router.get(
    "/admin/asignaciones/autobuses",
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

                    CASE
                        WHEN j.id IS NOT NULL
                        AND j.activa = true
                        THEN true
                        ELSE false
                    END AS ocupado

                FROM autobuses a

                INNER JOIN rutas r
                    ON r.id = a.ruta_id

                LEFT JOIN jornadas_activas j
                    ON j.autobus_id = a.id
                    AND j.activa = true
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
// GET - OBTENER ASIGNACIONES
// =====================================================
// GET /admin/asignaciones
//
// Muestra:
// - chofer
// - ruta
// - autobús
// - jornada
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
                    c.numero_unico,
                    c.nombre_completo,

                    j.autobus_id,
                    a.numero_bus,

                    a.ruta_id,
                    r.nombre AS ruta_nombre,
                    r.color AS ruta_color,

                    j.fecha_inicio,
                    j.activa,

                    a.latitud,
                    a.longitud,
                    a.ultima_actualizacion

                FROM jornadas_activas j

                INNER JOIN choferes c
                    ON c.id = j.chofer_id

                INNER JOIN autobuses a
                    ON a.id = j.autobus_id

                INNER JOIN rutas r
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
// POST - ASIGNAR CHOFER
// =====================================================
// POST /admin/asignaciones
//
// body:
//
// {
//     "chofer_id": 1,
//     "ruta_id": 5,
//     "autobus_id": 3
// }
//
// =====================================================

router.post(
    "/admin/asignaciones",
    verificarAdmin,
    async (req, res, next) => {

        const client = await pool.connect();

        try {

            const {
                chofer_id,
                ruta_id,
                autobus_id
            } = req.body;


            // =================================================
            // VALIDAR CAMPOS
            // =================================================

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


            // =================================================
            // INICIAR TRANSACCIÓN
            // =================================================

            await client.query("BEGIN");


            // =================================================
            // VERIFICAR CHOFER
            // =================================================

            const chofer = await client.query(`
                SELECT
                    id,
                    numero_unico,
                    nombre_completo
                FROM choferes
                WHERE id = $1
                AND rol = 'chofer'
            `, [chofer_id]);


            if (chofer.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Chofer no encontrado"
                });
            }


            // =================================================
            // VERIFICAR RUTA
            // =================================================

            const ruta = await client.query(`
                SELECT
                    id,
                    nombre,
                    color
                FROM rutas
                WHERE id = $1
            `, [ruta_id]);


            if (ruta.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Ruta no encontrada"
                });
            }


            // =================================================
            // VERIFICAR AUTOBÚS
            // =================================================

            const autobus = await client.query(`
                SELECT
                    id,
                    numero_bus,
                    ruta_id
                FROM autobuses
                WHERE id = $1
            `, [autobus_id]);


            if (autobus.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Autobús no encontrado"
                });
            }


            // =================================================
            // VERIFICAR QUE AUTOBÚS PERTENEZCA A LA RUTA
            // =================================================

            if (
                Number(autobus.rows[0].ruta_id) !==
                Number(ruta_id)
            ) {

                await client.query("ROLLBACK");

                return res.status(400).json({
                    error:
                        "El autobús seleccionado no pertenece a la ruta"
                });
            }


            // =================================================
            // VERIFICAR SI CHOFER YA TIENE JORNADA
            // =================================================

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


            // =================================================
            // VERIFICAR SI AUTOBÚS YA ESTÁ OCUPADO
            // =================================================

            const jornadaAutobus = await client.query(`
                SELECT
                    id,
                    chofer_id
                FROM jornadas_activas
                WHERE autobus_id = $1
                AND activa = true
                FOR UPDATE
            `, [autobus_id]);


            if (jornadaAutobus.rows.length > 0) {

                await client.query("ROLLBACK");

                return res.status(409).json({
                    error:
                        "El autobús ya está asignado a otro chofer"
                });
            }


            // =================================================
            // CREAR JORNADA
            // =================================================

            const { rows } = await client.query(`
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


            // =================================================
            // CONFIRMAR
            // =================================================

            await client.query("COMMIT");


            return res.status(201).json({
                mensaje:
                    "Chofer asignado correctamente",
                asignacion: {
                    jornada_id: rows[0].id,
                    chofer_id: rows[0].chofer_id,
                    autobus_id: rows[0].autobus_id,
                    ruta_id: Number(ruta_id),
                    fecha_inicio:
                        rows[0].fecha_inicio,
                    activa: rows[0].activa
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
// =====================================================
// PUT /admin/asignaciones/:choferId
//
// body:
//
// {
//     "ruta_id": 5,
//     "autobus_id": 3
// }
// =====================================================

router.put(
    "/admin/asignaciones/:choferId",
    verificarAdmin,
    async (req, res, next) => {

        const client = await pool.connect();

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


            await client.query("BEGIN");


            // =================================================
            // VERIFICAR CHOFER
            // =================================================

            const chofer = await client.query(`
                SELECT id
                FROM choferes
                WHERE id = $1
                AND rol = 'chofer'
            `, [choferId]);


            if (chofer.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Chofer no encontrado"
                });
            }


            // =================================================
            // VERIFICAR RUTA
            // =================================================

            const ruta = await client.query(`
                SELECT id
                FROM rutas
                WHERE id = $1
            `, [ruta_id]);


            if (ruta.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Ruta no encontrada"
                });
            }


            // =================================================
            // VERIFICAR AUTOBÚS
            // =================================================

            const autobus = await client.query(`
                SELECT
                    id,
                    ruta_id
                FROM autobuses
                WHERE id = $1
            `, [autobus_id]);


            if (autobus.rows.length === 0) {

                await client.query("ROLLBACK");

                return res.status(404).json({
                    error: "Autobús no encontrado"
                });
            }


            if (
                Number(autobus.rows[0].ruta_id) !==
                Number(ruta_id)
            ) {

                await client.query("ROLLBACK");

                return res.status(400).json({
                    error:
                        "El autobús no pertenece a la ruta seleccionada"
                });
            }


            // =================================================
            // VERIFICAR AUTOBÚS
            // =================================================

            const autobusOcupado = await client.query(`
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

                await client.query("ROLLBACK");

                return res.status(409).json({
                    error:
                        "El autobús ya está asignado a otro chofer"
                });
            }


            // =================================================
            // BUSCAR JORNADA ACTUAL
            // =================================================

            const jornada = await client.query(`
                SELECT id
                FROM jornadas_activas
                WHERE chofer_id = $1
                AND activa = true
                FOR UPDATE
            `, [choferId]);


            // =================================================
            // SI NO TIENE JORNADA → CREAR
            // =================================================

            if (jornada.rows.length === 0) {

                const nueva = await client.query(`
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
                    RETURNING id
                `, [
                    choferId,
                    autobus_id
                ]);

                await client.query("COMMIT");

                return res.status(201).json({
                    mensaje:
                        "Asignación creada correctamente",
                    jornada_id:
                        nueva.rows[0].id
                });
            }


            // =================================================
            // ACTUALIZAR JORNADA
            // =================================================

            const actualizada = await client.query(`
                UPDATE jornadas_activas
                SET
                    autobus_id = $1
                WHERE id = $2
                RETURNING
                    id,
                    chofer_id,
                    autobus_id,
                    fecha_inicio,
                    activa
            `, [
                autobus_id,
                jornada.rows[0].id
            ]);


            await client.query("COMMIT");


            return res.status(200).json({
                mensaje:
                    "Asignación actualizada correctamente",
                asignacion:
                    actualizada.rows[0]
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
// DELETE - LIBERAR CHOFER
// =====================================================
// DELETE /admin/asignaciones/:choferId
//
// No elimina al chofer.
// Solamente termina su jornada activa.
// =====================================================

router.delete(
    "/admin/asignaciones/:choferId",
    verificarAdmin,
    async (req, res, next) => {

        try {

            const { choferId } = req.params;

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
            `, [choferId]);


            if (rows.length === 0) {

                return res.status(404).json({
                    error:
                        "El chofer no tiene una jornada activa"
                });
            }


            return res.status(200).json({
                mensaje:
                    "Asignación liberada correctamente",
                asignacion:
                    rows[0]
            });

        } catch (error) {

            console.error(
                "Error liberando asignación:",
                error
            );

            next(error);
        }
    }
);


// =====================================================
// MANEJO DE ERRORES
// =====================================================

router.use((error, req, res, next) => {

    console.error(
        "Error en adminasignaciones.route:",
        error
    );

    return res.status(500).json({
        error:
            "Error interno del servidor"
    });
});


module.exports = router;
