const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const { body, validationResult } = require("express-validator");

// ============================================================================
// ADMIN ARTIKEL MANAGEMENT ROUTES
// ============================================================================

// GET /api/admin/articles - List all articles with filters
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, kategori, is_published, is_featured, sort = "created_at", order = "desc" } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (search) {
      query += " AND (a.judul LIKE ? OR a.konten_singkat LIKE ? OR a.penulis LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (kategori) {
      query += " AND a.kategori_id = ?";
      params.push(kategori);
    }

    if (is_published !== undefined) {
      query += " AND a.is_published = ?";
      params.push(is_published);
    }

    if (is_featured !== undefined) {
      query += " AND a.is_featured = ?";
      params.push(is_featured);
    }

    // Sorting
    const allowedSorts = ["created_at", "updated_at", "judul", "tanggal_publish", "views"];
    const sortField = allowedSorts.includes(sort) ? sort : "created_at";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

    query += ` ORDER BY a.${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [articles] = await pool.execute(query, params);

    // Count total for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += " AND (a.judul LIKE ? OR a.konten_singkat LIKE ? OR a.penulis LIKE ?)";
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (kategori) {
      countQuery += " AND a.kategori_id = ?";
      countParams.push(kategori);
    }

    if (is_published !== undefined) {
      countQuery += " AND a.is_published = ?";
      countParams.push(is_published);
    }

    if (is_featured !== undefined) {
      countQuery += " AND a.is_featured = ?";
      countParams.push(is_featured);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      message: "Articles retrieved successfully",
      data: articles,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_pages: Math.ceil(total / limit),
        total_articles: total,
        has_next: page * limit < total,
        has_prev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve articles",
      error: error.message,
    });
  }
});

// POST /api/admin/articles - Create new article
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  [
    body("judul").notEmpty().withMessage("Judul artikel harus diisi"),
    body("slug").notEmpty().withMessage("Slug artikel harus diisi"),
    body("konten_lengkap").notEmpty().withMessage("Konten lengkap harus diisi"),
    body("kategori_id").optional().isInt({ min: 1 }).withMessage("Kategori ID harus berupa angka positif"),
    body("is_published").optional().isBoolean().withMessage("Status publish harus berupa boolean"),
    body("is_featured").optional().isBoolean().withMessage("Status featured harus berupa boolean"),
    body("tanggal_publish").optional().isDate().withMessage("Tanggal publish harus berupa tanggal valid"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Data tidak valid",
          errors: errors.array(),
        });
      }

      const { judul, slug, konten_singkat, konten_lengkap, gambar_utama, kategori_id, penulis, is_published = 0, tanggal_publish, is_featured = 0, meta_description, tags } = req.body;

      // Check if slug already exists
      const [existingSlug] = await pool.execute("SELECT id FROM articles WHERE slug = ?", [slug]);

      if (existingSlug.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Slug artikel sudah digunakan",
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO articles (
          judul, slug, konten_singkat, konten_lengkap, gambar_utama,
          kategori_id, penulis, is_published, tanggal_publish, is_featured,
          meta_description, tags, views
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [judul, slug, konten_singkat, konten_lengkap, gambar_utama, kategori_id || null, penulis, is_published ? 1 : 0, tanggal_publish || null, is_featured ? 1 : 0, meta_description, tags]
      );

      res.json({
        success: true,
        message: "Artikel berhasil dibuat",
        data: {
          id: result.insertId,
          slug: slug,
        },
      });
    } catch (error) {
      console.error("Create article error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal membuat artikel",
        error: error.message,
      });
    }
  }
);

// GET /api/admin/articles/:id - Get single article
router.get("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [articles] = await pool.execute(
      `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.id = ?
    `,
      [req.params.id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Article retrieved successfully",
      data: articles[0],
    });
  } catch (error) {
    console.error("Get article error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve article",
      error: error.message,
    });
  }
});

// PUT /api/admin/articles/:id - Update article
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { judul, slug, konten_singkat, konten_lengkap, gambar_utama, kategori_id, penulis, is_published, tanggal_publish, is_featured, meta_description, tags } = req.body;

    // Check if article exists
    const [existing] = await pool.execute("SELECT id FROM articles WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    // Check if slug is taken by another article
    if (slug) {
      const [existingSlug] = await pool.execute("SELECT id FROM articles WHERE slug = ? AND id != ?", [slug, id]);

      if (existingSlug.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Slug artikel sudah digunakan",
        });
      }
    }

    const [result] = await pool.execute(
      `UPDATE articles SET 
        judul = ?, slug = ?, konten_singkat = ?, konten_lengkap = ?,
        gambar_utama = ?, kategori_id = ?, penulis = ?, is_published = ?,
        tanggal_publish = ?, is_featured = ?, meta_description = ?, tags = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [judul, slug, konten_singkat, konten_lengkap, gambar_utama, kategori_id || null, penulis, is_published ? 1 : 0, tanggal_publish || null, is_featured ? 1 : 0, meta_description, tags, id]
    );

    res.json({
      success: true,
      message: "Artikel berhasil diupdate",
    });
  } catch (error) {
    console.error("Update article error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate artikel",
      error: error.message,
    });
  }
});

// DELETE /api/admin/articles/:id - Delete article
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute("DELETE FROM articles WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Artikel berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete article error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus artikel",
      error: error.message,
    });
  }
});

// POST /api/admin/articles/:id/publish - Publish/unpublish article
router.post("/:id/publish", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;

    const [result] = await pool.execute("UPDATE articles SET is_published = ?, tanggal_publish = ? WHERE id = ?", [is_published ? 1 : 0, is_published ? new Date() : null, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: is_published ? "Artikel berhasil dipublish" : "Artikel berhasil di-unpublish",
    });
  } catch (error) {
    console.error("Publish article error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengubah status publish artikel",
      error: error.message,
    });
  }
});

// POST /api/admin/articles/:id/feature - Feature/unfeature article
router.post("/:id/feature", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_featured } = req.body;

    const [result] = await pool.execute("UPDATE articles SET is_featured = ? WHERE id = ?", [is_featured ? 1 : 0, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: is_featured ? "Artikel berhasil di-feature" : "Artikel berhasil di-unfeature",
    });
  } catch (error) {
    console.error("Feature article error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengubah status feature artikel",
      error: error.message,
    });
  }
});

// GET /api/admin/articles/categories - Get all categories
router.get("/manage/categories", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT k.*, 
        (SELECT COUNT(*) FROM articles WHERE kategori_id = k.id AND is_published = 1) as total_artikel
      FROM categories k 
      ORDER BY k.nama_kategori ASC
    `);

    res.json({
      success: true,
      message: "Categories retrieved successfully",
      data: { categories },
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
      error: error.message,
    });
  }
});

// GET /api/admin/articles/stats - Get article statistics
router.get("/manage/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_articles,
        SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published_articles,
        SUM(CASE WHEN is_published = 0 THEN 1 ELSE 0 END) as draft_articles,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured_articles,
        SUM(views) as total_views,
        AVG(views) as avg_views
      FROM articles
    `);

    const [recent] = await pool.execute(`
      SELECT id, judul, views, created_at, is_published
      FROM articles 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    const [popular] = await pool.execute(`
      SELECT id, judul, views, created_at, is_published
      FROM articles 
      WHERE is_published = 1
      ORDER BY views DESC 
      LIMIT 5
    `);

    res.json({
      success: true,
      message: "Article statistics retrieved successfully",
      data: {
        statistics: stats[0],
        recent_articles: recent,
        popular_articles: popular,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message,
    });
  }
});

module.exports = router;
