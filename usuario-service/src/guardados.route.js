
const express = require("express");
const router = express.Router();

const pool = require("./db");
const verificarToken = require("./auth.middleware");

// =====================================================
// OBTENER RUTAS GUARDADAS
// =====================================================

router.get(
  "/guardados",
  verificarToken,
  async (req, res, next) => {

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
                'nombre', p.nombre,
                'latitud', p.latitud,
                'longitud', p.longitud,
                'orden', rp.orden
              )
              ORDER BY rp.orden
            )
            FILTER (WHERE p.id IS NOT NULL),
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

      console.error(
        "Error obteniendo guardados:",
        error
      );

      next(error);

    }

  }
);


// =====================================================
// GUARDAR RUTA
// =====================================================

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


      // Validar datos

      if (!ruta_id) {

        return res.status(400).json({
          error: "Falta el id de la ruta."
        });

      }


      if (
        !nombre_personalizado ||
        !nombre_personalizado.trim()
      ) {

        return res.status(400).json({
          error: "Debes proporcionar un nombre."
        });

      }


      // Comprobar que la ruta existe

      const rutaExiste = await pool.query(
        `
        SELECT id
        FROM rutas
        WHERE id = $1
        `,
        [ruta_id]
      );


      if (rutaExiste.rows.length === 0) {

        return res.status(404).json({
          error: "La ruta no existe."
        });

      }


      // Comprobar si ya está guardada

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


      // Guardar

      const resultado = await pool.query(
        `
        INSERT INTO favoritos
        (
          usuario_id,
          ruta_id,
          nombre_personalizado
        )

        VALUES ($1, $2, $3)

        RETURNING id
        `,
        [
          usuarioId,
          ruta_id,
          nombre_personalizado.trim()
        ]
      );


      res.status(201).json({

        mensaje:
          "Ruta guardada correctamente.",

        id:
          resultado.rows[0].id

      });

    } catch (error) {

      console.error(
        "Error guardando ruta:",
        error
      );

      next(error);

    }

  }
);


// =====================================================
// ELIMINAR RUTA GUARDADA
// =====================================================

router.delete(
  "/guardados/:id",
  verificarToken,
  async (req, res, next) => {

    try {

      const usuarioId = req.usuario.id;

      const resultado = await pool.query(
        `
        DELETE FROM favoritos

        WHERE id = $1
        AND usuario_id = $2

        RETURNING id
        `,
        [
          req.params.id,
          usuarioId
        ]
      );


      if (resultado.rows.length === 0) {

        return res.status(404).json({
          error:
            "La ruta guardada no existe."
        });

      }


      res.json({
        mensaje:
          "Ruta eliminada correctamente."
      });

    } catch (error) {

      console.error(
        "Error eliminando ruta:",
        error
      );

      next(error);

    }

  }
);


module.exports = router;

