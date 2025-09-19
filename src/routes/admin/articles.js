const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");
const { authenticateToken } = require("../../middleware/auth");
const { uploadArticleImage } = require("../../config/upload");
const { body } = require("express-validator");
const { checkValidationResult } = require("../../middleware/validation");

router.use(authenticateToken);

// Article validation
const articleValidation = [
  body("judul")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Judul harus 5-200 karakter"),
  body("konten_lengkap")
    .trim()
    .isLength({ min: 50 })
    .withMessage("Konten minimal 50 karakter"),
  body("kategori_id").isInt({ min: 1 }).withMessage("Kategori harus dipilih"),
];

// GET /api/admin/articles - List artikel
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      kategori,
      status = "all",
      search,
    } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];

    if (kategori) {
      whereConditions.push("a.kategori_id = ?");
      queryParams.push(kategori);
    }

    if (status !== "all") {
      whereConditions.push("a.is_published = ?");
      queryParams.push(status === "published" ? 1 : 0);
    }

    if (search) {
      whereConditions.push("a.judul LIKE ?");
      queryParams.push(`%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Get total count
    const [countResult] = await pool.execute(
      `
            SELECT COUNT(*) as total FROM artikel a ${whereClause}
        `,
      queryParams
    );

    // Get data
    const dataQuery = `
            SELECT a.*, k.nama_kategori
            FROM artikel a
            LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        `;

    queryParams.push(parseInt(limit), offset);
    const [rows] = await pool.execute(dataQuery, queryParams);

    res.json({
      success: true,
      data: {
        items: rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_items: countResult[0].total,
          total_pages: Math.ceil(countResult[0].total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get articles error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// POST /api/admin/articles - Create artikel
router.post("/", (req, res) => {
  uploadArticleImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "File upload error",
        error: err.message,
      });
    }

    try {
      const {
        judul,
        slug,
        konten_singkat,
        konten_lengkap,
        kategori_id,
        penulis,
        is_published = false,
        tanggal_publish,
        is_featured = false,
        meta_description,
        tags,
      } = req.body;

      const gambar_utama = req.file ? req.file.filename : null;

      // Generate slug if not provided
      const finalSlug =
        slug ||
        judul
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

      const insertQuery = `
                INSERT INTO artikel (
                    judul, slug, konten_singkat, konten_lengkap, gambar_utama,
                    kategori_id, penulis, is_published, tanggal_publish, is_featured,
                    meta_description, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

      const [result] = await pool.execute(insertQuery, [
        judul,
        finalSlug,
        konten_singkat,
        konten_lengkap,
        gambar_utama,
        parseInt(kategori_id),
        penulis || req.user.full_name,
        is_published === "true" || is_published === true,
        tanggal_publish || null,
        is_featured === "true" || is_featured === true,
        meta_description || null,
        tags || null,
      ]);

      res.status(201).json({
        success: true,
        message: "Artikel berhasil dibuat",
        data: {
          id: result.insertId,
          judul,
          slug: finalSlug,
          gambar_utama,
        },
      });
    } catch (error) {
      console.error("Create article error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });
});

// GET /api/admin/articles/:id - Get artikel detail
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `
            SELECT a.*, k.nama_kategori
            FROM artikel a
            LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
            WHERE a.id = ?
        `,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Get article error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// PUT /api/admin/articles/:id - Update artikel
router.put("/:id", (req, res) => {
  uploadArticleImage(req, res, async (err) => {
    if (err && err.code !== "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "File upload error",
        error: err.message,
      });
    }

    try {
      const { id } = req.params;
      const {
        judul,
        slug,
        konten_singkat,
        konten_lengkap,
        kategori_id,
        penulis,
        is_published,
        tanggal_publish,
        is_featured,
        meta_description,
        tags,
      } = req.body;

      // Check if article exists
      const [checkRows] = await pool.execute(
        "SELECT gambar_utama FROM artikel WHERE id = ?",
        [id]
      );
      if (checkRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Artikel tidak ditemukan",
        });
      }

      let updateFields = [];
      let values = [];

      if (judul) {
        updateFields.push("judul = ?");
        values.push(judul);
      }

      if (slug) {
        updateFields.push("slug = ?");
        values.push(slug);
      }

      if (konten_singkat) {
        updateFields.push("konten_singkat = ?");
        values.push(konten_singkat);
      }

      if (konten_lengkap) {
        updateFields.push("konten_lengkap = ?");
        values.push(konten_lengkap);
      }

      if (req.file) {
        updateFields.push("gambar_utama = ?");
        values.push(req.file.filename);
      }

      if (kategori_id) {
        updateFields.push("kategori_id = ?");
        values.push(parseInt(kategori_id));
      }

      if (penulis) {
        updateFields.push("penulis = ?");
        values.push(penulis);
      }

      if (typeof is_published !== "undefined") {
        updateFields.push("is_published = ?");
        values.push(is_published === "true" || is_published === true);
      }

      if (tanggal_publish) {
        updateFields.push("tanggal_publish = ?");
        values.push(tanggal_publish);
      }

      if (typeof is_featured !== "undefined") {
        updateFields.push("is_featured = ?");
        values.push(is_featured === "true" || is_featured === true);
      }

      if (meta_description) {
        updateFields.push("meta_description = ?");
        values.push(meta_description);
      }

      if (tags) {
        updateFields.push("tags = ?");
        values.push(tags);
      }

      updateFields.push("updated_at = CURRENT_TIMESTAMP");

      if (updateFields.length === 1) {
        // Only timestamp update
        return res.status(400).json({
          success: false,
          message: "No fields to update",
        });
      }

      values.push(id);

      const updateQuery = `UPDATE artikel SET ${updateFields.join(
        ", "
      )} WHERE id = ?`;
      await pool.execute(updateQuery, values);

      res.json({
        success: true,
        message: "Artikel berhasil diupdate",
      });
    } catch (error) {
      console.error("Update article error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });
});

// DELETE /api/admin/articles/:id - Delete artikel
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get image filename before deletion
    const [rows] = await pool.execute(
      "SELECT gambar_utama FROM artikel WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    // Delete from database
    await pool.execute("DELETE FROM artikel WHERE id = ?", [id]);

    // Delete image file if exists
    if (rows[0].gambar_utama) {
      const fs = require("fs");
      const path = require("path");
      const imagePath = path.join(
        __dirname,
        "../../../uploads/articles",
        rows[0].gambar_utama
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({
      success: true,
      message: "Artikel berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete article error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
