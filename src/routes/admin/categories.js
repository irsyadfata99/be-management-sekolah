const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");
const { authenticateToken } = require("../../middleware/auth");
const { body } = require("express-validator");
const { checkValidationResult } = require("../../middleware/validation");

router.use(authenticateToken);

// Category validation
const categoryValidation = [
  body("nama_kategori")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Nama kategori harus 2-50 karakter"),
  body("slug").optional().isSlug().withMessage("Slug tidak valid"),
];

// GET /api/admin/categories - List kategori
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
            SELECT k.*, COUNT(a.id) as total_artikel
            FROM kategori_artikel k
            LEFT JOIN artikel a ON k.id = a.kategori_id
            WHERE k.is_active = TRUE
            GROUP BY k.id
            ORDER BY k.urutan ASC, k.nama_kategori ASC
        `);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// POST /api/admin/categories - Create kategori
router.post(
  "/",
  categoryValidation,
  checkValidationResult,
  async (req, res) => {
    try {
      const {
        nama_kategori,
        slug,
        deskripsi,
        warna_kategori = "#3B82F6",
      } = req.body;

      // Generate slug if not provided
      const finalSlug =
        slug ||
        nama_kategori
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

      const [result] = await pool.execute(
        `
            INSERT INTO kategori_artikel (nama_kategori, slug, deskripsi, warna_kategori)
            VALUES (?, ?, ?, ?)
        `,
        [nama_kategori, finalSlug, deskripsi || null, warna_kategori]
      );

      res.status(201).json({
        success: true,
        message: "Kategori berhasil dibuat",
        data: {
          id: result.insertId,
          nama_kategori,
          slug: finalSlug,
        },
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          success: false,
          message: "Nama kategori atau slug sudah digunakan",
        });
      }

      console.error("Create category error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// PUT /api/admin/categories/:id - Update kategori
router.put(
  "/:id",
  categoryValidation,
  checkValidationResult,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nama_kategori, slug, deskripsi, warna_kategori, urutan } =
        req.body;

      let updateFields = [];
      let values = [];

      if (nama_kategori) {
        updateFields.push("nama_kategori = ?");
        values.push(nama_kategori);
      }

      if (slug) {
        updateFields.push("slug = ?");
        values.push(slug);
      }

      if (deskripsi !== undefined) {
        updateFields.push("deskripsi = ?");
        values.push(deskripsi);
      }

      if (warna_kategori) {
        updateFields.push("warna_kategori = ?");
        values.push(warna_kategori);
      }

      if (urutan !== undefined) {
        updateFields.push("urutan = ?");
        values.push(parseInt(urutan));
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      const [result] = await pool.execute(
        `UPDATE kategori_artikel SET ${updateFields.join(", ")} WHERE id = ?`,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
      }

      res.json({
        success: true,
        message: "Kategori berhasil diupdate",
      });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// DELETE /api/admin/categories/:id - Delete kategori
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has articles
    const [articleCheck] = await pool.execute(
      "SELECT COUNT(*) as count FROM artikel WHERE kategori_id = ?",
      [id]
    );

    if (articleCheck[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: "Kategori tidak dapat dihapus karena masih memiliki artikel",
      });
    }

    const [result] = await pool.execute(
      "DELETE FROM kategori_artikel WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Kategori tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Kategori berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
