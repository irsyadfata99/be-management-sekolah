// src/routes/admin/article.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { pool } = require("../../config/database");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// ============================================================================
// MULTER CONFIGURATION - Image Upload for Articles
// ============================================================================

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../../uploads/articles");
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `article-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Format gambar tidak valid. Gunakan PNG, JPG, JPEG, atau WEBP"),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate slug from title
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}

// Check if slug exists (for duplicate detection)
async function checkSlugExists(slug, excludeId = null) {
  const query = excludeId
    ? "SELECT COUNT(*) as count FROM articles WHERE slug = ? AND id != ?"
    : "SELECT COUNT(*) as count FROM articles WHERE slug = ?";
  const params = excludeId ? [slug, excludeId] : [slug];

  const [result] = await pool.execute(query, params);
  return result[0].count > 0;
}

// Delete image file
async function deleteImageFile(filename) {
  if (!filename) return;
  try {
    const filePath = path.join(
      __dirname,
      "../../../uploads/articles",
      filename
    );
    await fs.unlink(filePath);
    console.log(`Deleted image: ${filename}`);
  } catch (error) {
    console.error(`Error deleting image ${filename}:`, error);
  }
}

// ============================================================================
// STATISTICS ENDPOINT
// ============================================================================

router.get("/statistics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total articles
    const [totalResult] = await pool.execute(
      "SELECT COUNT(*) as total FROM articles"
    );

    // By status
    const [statusResult] = await pool.execute(`
      SELECT 
        SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN is_published = 0 THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured
      FROM articles
    `);

    // By category
    const [categoryResult] = await pool.execute(`
      SELECT 
        c.nama_kategori,
        c.slug,
        c.warna,
        COUNT(a.id) as count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.kategori_id
      GROUP BY c.id, c.nama_kategori, c.slug, c.warna
      ORDER BY count DESC
    `);

    // Recent articles (last 7 days)
    const [recentResult] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM articles 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    // Most viewed articles
    const [topViewedResult] = await pool.execute(`
      SELECT judul, views, slug
      FROM articles
      ORDER BY views DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        total: totalResult[0].total,
        published: statusResult[0].published || 0,
        draft: statusResult[0].draft || 0,
        featured: statusResult[0].featured || 0,
        byCategory: categoryResult,
        recentWeek: recentResult[0].count,
        topViewed: topViewedResult,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik",
      error: error.message,
    });
  }
});

// ============================================================================
// GET ALL ARTICLES - With Pagination, Search, and Filters
// ============================================================================

router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      kategori_id = "",
      is_published = "",
      is_featured = "",
      sort = "created_at",
      order = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = "WHERE 1=1";
    const params = [];

    // Search by title, content, or tags
    if (search) {
      whereClause +=
        " AND (a.judul LIKE ? OR a.konten_singkat LIKE ? OR a.konten_lengkap LIKE ? OR a.tags LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Filter by category
    if (kategori_id) {
      whereClause += " AND a.kategori_id = ?";
      params.push(kategori_id);
    }

    // Filter by published status
    if (is_published !== "") {
      whereClause += " AND a.is_published = ?";
      params.push(is_published);
    }

    // Filter by featured status
    if (is_featured !== "") {
      whereClause += " AND a.is_featured = ?";
      params.push(is_featured);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Validate sort column
    const allowedSortColumns = [
      "created_at",
      "updated_at",
      "judul",
      "views",
      "tanggal_publish",
    ];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : "created_at";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Get paginated data
    const query = `
      SELECT 
        a.*,
        c.nama_kategori,
        c.slug as kategori_slug,
        c.warna as kategori_warna
      FROM articles a
      LEFT JOIN categories c ON a.kategori_id = c.id
      ${whereClause}
      ORDER BY a.${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const [articles] = await pool.execute(query, [
      ...params,
      parseInt(limit),
      offset,
    ]);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data artikel",
      error: error.message,
    });
  }
});

// ============================================================================
// GET SINGLE ARTICLE BY ID
// ============================================================================

router.get("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [articles] = await pool.execute(
      `
      SELECT 
        a.*,
        c.nama_kategori,
        c.slug as kategori_slug,
        c.warna as kategori_warna,
        c.deskripsi as kategori_deskripsi
      FROM articles a
      LEFT JOIN categories c ON a.kategori_id = c.id
      WHERE a.id = ?
    `,
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: articles[0],
    });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail artikel",
      error: error.message,
    });
  }
});

// ============================================================================
// CREATE NEW ARTICLE - With Image Upload
// ============================================================================

router.post(
  "/",
  authenticateToken,
  requireAdmin,
  upload.single("gambar_utama"),
  async (req, res) => {
    try {
      const {
        judul,
        slug: customSlug,
        konten_singkat,
        konten_lengkap,
        kategori_id,
        penulis,
        is_published = 0,
        tanggal_publish,
        is_featured = 0,
        meta_description,
        tags,
      } = req.body;

      // Validation
      if (!judul || !konten_lengkap || !kategori_id || !penulis) {
        // Delete uploaded file if validation fails
        if (req.file) {
          await deleteImageFile(req.file.filename);
        }
        return res.status(400).json({
          success: false,
          message: "Judul, konten lengkap, kategori, dan penulis wajib diisi",
        });
      }

      // Generate or use custom slug
      let slug = customSlug ? generateSlug(customSlug) : generateSlug(judul);

      // Check for duplicate slug
      const slugExists = await checkSlugExists(slug);
      if (slugExists) {
        // Add timestamp to make slug unique
        slug = `${slug}-${Date.now()}`;
      }

      // Check if category exists
      const [categoryCheck] = await pool.execute(
        "SELECT id FROM categories WHERE id = ?",
        [kategori_id]
      );

      if (categoryCheck.length === 0) {
        if (req.file) {
          await deleteImageFile(req.file.filename);
        }
        return res.status(400).json({
          success: false,
          message: "Kategori tidak ditemukan",
        });
      }

      // Get uploaded image filename
      const gambar_utama = req.file ? req.file.filename : null;

      // Insert article
      const [result] = await pool.execute(
        `
        INSERT INTO articles (
          judul, slug, konten_singkat, konten_lengkap, gambar_utama,
          kategori_id, penulis, is_published, tanggal_publish,
          is_featured, meta_description, tags, views, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
      `,
        [
          judul,
          slug,
          konten_singkat || null,
          konten_lengkap,
          gambar_utama,
          kategori_id,
          penulis,
          is_published,
          tanggal_publish || null,
          is_featured,
          meta_description || null,
          tags || null,
        ]
      );

      res.status(201).json({
        success: true,
        message: "Artikel berhasil dibuat",
        data: {
          id: result.insertId,
          slug: slug,
          gambar_utama: gambar_utama,
        },
      });
    } catch (error) {
      // Delete uploaded file if error occurs
      if (req.file) {
        await deleteImageFile(req.file.filename);
      }

      console.error("Error creating article:", error);
      res.status(500).json({
        success: false,
        message: "Gagal membuat artikel",
        error: error.message,
      });
    }
  }
);

// ============================================================================
// UPDATE ARTICLE - With Optional Image Upload
// ============================================================================

router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  upload.single("gambar_utama"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        judul,
        slug: customSlug,
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
      const [existingArticle] = await pool.execute(
        "SELECT * FROM articles WHERE id = ?",
        [id]
      );

      if (existingArticle.length === 0) {
        if (req.file) {
          await deleteImageFile(req.file.filename);
        }
        return res.status(404).json({
          success: false,
          message: "Artikel tidak ditemukan",
        });
      }

      // Generate slug if title changed
      let slug = existingArticle[0].slug;
      if (judul && judul !== existingArticle[0].judul) {
        slug = customSlug ? generateSlug(customSlug) : generateSlug(judul);

        // Check for duplicate slug (excluding current article)
        const slugExists = await checkSlugExists(slug, id);
        if (slugExists) {
          slug = `${slug}-${Date.now()}`;
        }
      }

      // Handle image update
      let gambar_utama = existingArticle[0].gambar_utama;
      if (req.file) {
        // Delete old image if exists
        if (existingArticle[0].gambar_utama) {
          await deleteImageFile(existingArticle[0].gambar_utama);
        }
        gambar_utama = req.file.filename;
      }

      // Update article
      await pool.execute(
        `
        UPDATE articles SET
          judul = ?,
          slug = ?,
          konten_singkat = ?,
          konten_lengkap = ?,
          gambar_utama = ?,
          kategori_id = ?,
          penulis = ?,
          is_published = ?,
          tanggal_publish = ?,
          is_featured = ?,
          meta_description = ?,
          tags = ?,
          updated_at = NOW()
        WHERE id = ?
      `,
        [
          judul || existingArticle[0].judul,
          slug,
          konten_singkat !== undefined
            ? konten_singkat
            : existingArticle[0].konten_singkat,
          konten_lengkap || existingArticle[0].konten_lengkap,
          gambar_utama,
          kategori_id || existingArticle[0].kategori_id,
          penulis || existingArticle[0].penulis,
          is_published !== undefined
            ? is_published
            : existingArticle[0].is_published,
          tanggal_publish !== undefined
            ? tanggal_publish
            : existingArticle[0].tanggal_publish,
          is_featured !== undefined
            ? is_featured
            : existingArticle[0].is_featured,
          meta_description !== undefined
            ? meta_description
            : existingArticle[0].meta_description,
          tags !== undefined ? tags : existingArticle[0].tags,
          id,
        ]
      );

      res.json({
        success: true,
        message: "Artikel berhasil diupdate",
        data: {
          id: id,
          slug: slug,
          gambar_utama: gambar_utama,
        },
      });
    } catch (error) {
      if (req.file) {
        await deleteImageFile(req.file.filename);
      }

      console.error("Error updating article:", error);
      res.status(500).json({
        success: false,
        message: "Gagal update artikel",
        error: error.message,
      });
    }
  }
);

// ============================================================================
// DELETE ARTICLE - Also Delete Image
// ============================================================================

router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get article data
    const [articles] = await pool.execute(
      "SELECT * FROM articles WHERE id = ?",
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    const article = articles[0];

    // Delete image file if exists
    if (article.gambar_utama) {
      await deleteImageFile(article.gambar_utama);
    }

    // Delete article from database
    await pool.execute("DELETE FROM articles WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Artikel berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting article:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus artikel",
      error: error.message,
    });
  }
});

// ============================================================================
// TOGGLE PUBLISH STATUS
// ============================================================================

router.patch(
  "/:id/publish",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get current status
      const [articles] = await pool.execute(
        "SELECT is_published FROM articles WHERE id = ?",
        [id]
      );

      if (articles.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Artikel tidak ditemukan",
        });
      }

      const newStatus = articles[0].is_published === 1 ? 0 : 1;

      // Update status
      await pool.execute(
        `
        UPDATE articles 
        SET is_published = ?,
            tanggal_publish = IF(? = 1 AND tanggal_publish IS NULL, NOW(), tanggal_publish),
            updated_at = NOW()
        WHERE id = ?
      `,
        [newStatus, newStatus, id]
      );

      res.json({
        success: true,
        message: `Artikel berhasil ${
          newStatus === 1 ? "dipublikasi" : "dijadikan draft"
        }`,
        data: {
          is_published: newStatus,
        },
      });
    } catch (error) {
      console.error("Error toggling publish status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengubah status publish",
        error: error.message,
      });
    }
  }
);

// ============================================================================
// TOGGLE FEATURED STATUS
// ============================================================================

router.patch(
  "/:id/feature",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Get current status
      const [articles] = await pool.execute(
        "SELECT is_featured FROM articles WHERE id = ?",
        [id]
      );

      if (articles.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Artikel tidak ditemukan",
        });
      }

      const newStatus = articles[0].is_featured === 1 ? 0 : 1;

      // Update status
      await pool.execute(
        "UPDATE articles SET is_featured = ?, updated_at = NOW() WHERE id = ?",
        [newStatus, id]
      );

      res.json({
        success: true,
        message: `Artikel berhasil ${
          newStatus === 1 ? "dijadikan unggulan" : "dihapus dari unggulan"
        }`,
        data: {
          is_featured: newStatus,
        },
      });
    } catch (error) {
      console.error("Error toggling featured status:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengubah status unggulan",
        error: error.message,
      });
    }
  }
);

// ============================================================================
// GET CATEGORIES FOR ARTICLE FORM
// ============================================================================

router.get(
  "/manage/categories",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [categories] = await pool.execute(
        "SELECT id, nama_kategori, slug, deskripsi, warna FROM categories ORDER BY nama_kategori ASC"
      );

      res.json({
        success: true,
        data: {
          categories: categories,
        },
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data kategori",
        error: error.message,
      });
    }
  }
);

module.exports = router;
