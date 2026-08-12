const express = require("express");
const router = express.Router();

const pool = require("./db");
const verificarToken = require("./auth.middleware");


// OBTENER RUTAS GUARDADAS

router.get("/guardados", verificarToken, async (req, res, next) => {

        try {

            const usuarioId = req.usuario.id;

            const resultado = await pool.query(
                `
                SELECT
                    f.id,
                    f.nombre_personalizado,

                    r.id AS ruta_id,
                    r.nombre,
                    r.color,

                    COALESCE(
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', p.id,
                                'nombre', p.nombre_parada,
                                'lat', p.latitud,
                                'lng', p.longitud,
                                'orden', rp.orden
                            )
                            ORDER BY rp.orden
                        ) FILTER (
                            WHERE p.id IS NOT NULL
                        ),
                        '[]'
                    ) AS paradas

                FROM favoritos f

                INNER JOIN rutas r
                    ON f.ruta_id = r.id

                LEFT JOIN ruta_paradas rp
                    ON rp.ruta_id = r.id

                LEFT JOIN paradas p
                    ON p.id = rp.parada_id

                WHERE f.usuario_id = $1

                GROUP BY
                    f.id,
                    f.nombre_personalizado,
                    r.id,
                    r.nombre,
                    r.color

                ORDER BY f.id DESC
                `,
                [usuarioId]
            );


            res.json(resultado.rows);

        } catch (error) {

            next(error);

        }

    }
);



// GUARDAR RUTA

router.post(
    "/guardados",
    verificarToken,
    async (req, res, next) => {

        try {

            const usuarioId = req.usuario.id;

            const {
                ruta_id,
                nombre_personalizado
            } = req.body;


            if (!ruta_id) {

                return res.status(400).json({
                    error: "El ruta_id es obligatorio."
                });

            }


            // Verificar que la ruta exista

            const ruta = await pool.query(
                `
                SELECT id
                FROM rutas
                WHERE id = $1
                `,
                [ruta_id]
            );


            if (ruta.rows.length === 0) {

                return res.status(404).json({
                    error: "La ruta no existe."
                });

            }


            // Verificar si ya está guardada

            const existe = await pool.query(
                `
                SELECT id
                FROM favoritos

                WHERE usuario_id = $1
                AND ruta_id = $2
                `,
                [
                    usuarioId,
                    ruta_id
                ]
            );


            if (existe.rows.length > 0) {

                return res.status(400).json({
                    error:
                        "La ruta ya se encuentra guardada."
                });

            }


            await pool.query(
                `
                INSERT INTO favoritos
                (
                    usuario_id,
                    ruta_id,
                    nombre_personalizado
                )

                VALUES ($1, $2, $3)
                `,
                [
                    usuarioId,
                    ruta_id,
                    nombre_personalizado ||
                    "Mi ruta"
                ]
            );


            res.status(201).json({

                mensaje:
                    "Ruta guardada correctamente."

            });


        } catch (error) {

            next(error);

        }

    }
);

// ELIMINAR RUTA GUARDADA
router.delete(
    "/guardados/:id",
    verificarToken,
    async (req, res, next) => {

        try {
            const usuarioId = req.usuario.id;
            const guardadoId = req.params.id;
            const resultado = await pool.query(
                `
                DELETE FROM favoritos
                WHERE id = $1
                AND usuario_id = $2
                RETURNING id
                `,[guardadoId, usuarioId ]
            );


            if (resultado.rows.length === 0) {

                return res.status(404).json({
                    error:
                        "La ruta guardada no existe."
                });

            }


            res.json({

                mensaje:
                    "Ruta eliminada."

            });


        } catch (error) {

            next(error);

        }

    }
);


module.exports = router;