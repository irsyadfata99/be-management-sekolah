// src/routes/public/article.js
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

// ============================================================================
// GET ALL PUBLISHED ARTICLES - With Pagination and Filters
// ============================================================================

router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = "",
      kategori_id = "",
      kategori_slug = "",
      sort = "created_at",
      order = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause - only published articles
    let whereClause = "WHERE a.is_published = 1";
    const params = [];

    // Search by title, content excerpt, or tags
    if (search) {
      whereClause +=
        " AND (a.judul LIKE ? OR a.konten_singkat LIKE ? OR a.tags LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Filter by category ID
    if (kategori_id) {
      whereClause += " AND a.kategori_id = ?";
      params.push(kategori_id);
    }

    // Filter by category slug
    if (kategori_slug) {
      whereClause += " AND c.slug = ?";
      params.push(kategori_slug);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM articles a 
       LEFT JOIN categories c ON a.kategori_id = c.id 
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Validate sort column
    const allowedSortColumns = [
      "created_at",
      "tanggal_publish",
      "judul",
      "views",
    ];
    const sortColumn = allowedSortColumns.includes(sort) ? sort : "created_at";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Get paginated data
    const query = `
      SELECT 
        a.id,
        a.judul,
        a.slug,
        a.konten_singkat,
        a.gambar_utama,
        a.penulis,
        a.tanggal_publish,
        a.is_featured,
        a.views,
        a.tags,
        a.created_at,
        c.id as kategori_id,
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
    console.error("Error fetching public articles:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data artikel",
      error: error.message,
    });
  }
});

// ============================================================================
// GET FEATURED ARTICLES
// ============================================================================

router.get("/featured", async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const [articles] = await pool.execute(
      `
      SELECT 
        a.id,
        a.judul,
        a.slug,
        a.konten_singkat,
        a.gambar_utama,
        a.penulis,
        a.tanggal_publish,
        a.is_featured,
        a.views,
        a.tags,
        c.id as kategori_id,
        c.nama_kategori,
        c.slug as kategori_slug,
        c.warna as kategori_warna
      FROM articles a
      LEFT JOIN categories c ON a.kategori_id = c.id
      WHERE a.is_published = 1 AND a.is_featured = 1
      ORDER BY a.tanggal_publish DESC
      LIMIT ?
    `,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error("Error fetching featured articles:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil artikel unggulan",
      error: error.message,
    });
  }
});

// ============================================================================
// GET ARTICLES BY CATEGORY SLUG
// ============================================================================

router.get("/kategori/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const offset = (page - 1) * limit;

    // Check if category exists
    const [categories] = await pool.execute(
      "SELECT id, nama_kategori, slug, deskripsi, warna FROM categories WHERE slug = ?",
      [slug]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Kategori tidak ditemukan",
      });
    }

    const category = categories[0];

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM articles 
       WHERE kategori_id = ? AND is_published = 1`,
      [category.id]
    );
    const total = countResult[0].total;

    // Get articles
    const [articles] = await pool.execute(
      `
      SELECT 
        a.id,
        a.judul,
        a.slug,
        a.konten_singkat,
        a.gambar_utama,
        a.penulis,
        a.tanggal_publish,
        a.is_featured,
        a.views,
        a.tags,
        a.created_at
      FROM articles a
      WHERE a.kategori_id = ? AND a.is_published = 1
      ORDER BY a.tanggal_publish DESC
      LIMIT ? OFFSET ?
    `,
      [category.id, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        category: category,
        articles: articles,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching articles by category:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil artikel kategori",
      error: error.message,
    });
  }
});

// ============================================================================
// GET ARTICLE DETAIL BY SLUG
// ============================================================================

router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [articles] = await pool.execute(
      `
      SELECT 
        a.*,
        c.id as kategori_id,
        c.nama_kategori,
        c.slug as kategori_slug,
        c.warna as kategori_warna,
        c.deskripsi as kategori_deskripsi
      FROM articles a
      LEFT JOIN categories c ON a.kategori_id = c.id
      WHERE a.slug = ? AND a.is_published = 1
    `,
      [slug]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    const article = articles[0];

    // Get related articles (same category, exclude current)
    const [relatedArticles] = await pool.execute(
      `
      SELECT 
        a.id,
        a.judul,
        a.slug,
        a.konten_singkat,
        a.gambar_utama,
        a.penulis,
        a.tanggal_publish,
        a.views,
        c.nama_kategori,
        c.slug as kategori_slug,
        c.warna as kategori_warna
      FROM articles a
      LEFT JOIN categories c ON a.kategori_id = c.id
      WHERE a.kategori_id = ? 
        AND a.id != ? 
        AND a.is_published = 1
      ORDER BY a.tanggal_publish DESC
      LIMIT 3
    `,
      [article.kategori_id, article.id]
    );

    res.json({
      success: true,
      data: {
        article: article,
        related: relatedArticles,
      },
    });
  } catch (error) {
    console.error("Error fetching article detail:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail artikel",
      error: error.message,
    });
  }
});

// ============================================================================
// INCREMENT ARTICLE VIEWS
// ============================================================================

router.patch("/:slug/view", async (req, res) => {
  try {
    const { slug } = req.params;

    // Check if article exists and is published
    const [articles] = await pool.execute(
      "SELECT id, views FROM articles WHERE slug = ? AND is_published = 1",
      [slug]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Artikel tidak ditemukan",
      });
    }

    // Increment views
    await pool.execute("UPDATE articles SET views = views + 1 WHERE slug = ?", [
      slug,
    ]);

    res.json({
      success: true,
      message: "Views berhasil ditambahkan",
      data: {
        views: articles[0].views + 1,
      },
    });
  } catch (error) {
    console.error("Error incrementing views:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menambah views",
      error: error.message,
    });
  }
});

// ============================================================================
// GET LATEST ARTICLES
// ============================================================================

router.get("/latest/posts", async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const [articles] = await pool.execute(
      `
      SELECT 
        a.id,
        a.judul,
        a.slug,
        a.konten_singkat,
        a.gambar_utama,
        a.penulis,
        a.tanggal_publish,
        a.views,
        c.nama_kategori,
        c.slug as kategori_slug,
        c.warna as kategori_warna
      FROM articles a
      LEFT JOIN categories c ON a.kategori_id = c.id
      WHERE a.is_published = 1
      ORDER BY a.tanggal_publish DESC
      LIMIT ?
    `,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error("Error fetching latest articles:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil artikel terbaru",
      error: error.message,
    });
  }
});

// ============================================================================
// GET POPULAR ARTICLES (Most Viewed)
// ============================================================================

router.get("/popular/posts", async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const [articles] = await pool.execute(
      `
      SELECT 
        a.id,
        a.judul,
        a.slug,
        a.konten_singkat,
        a.gambar_utama,
        a.penulis,
        a.tanggal_publish,
        a.views,
        c.nama_kategori,
        c.slug as kategori_slug,
        c.warna as kategori_warna
      FROM articles a
      LEFT JOIN categories c ON a.kategori_id = c.id
      WHERE a.is_published = 1
      ORDER BY a.views DESC
      LIMIT ?
    `,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    console.error("Error fetching popular articles:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil artikel populer",
      error: error.message,
    });
  }
});

// ============================================================================
// SEARCH ARTICLES BY TAG
// ============================================================================

router.get("/search/tags", async (req, res) => {
  try {
    const { tag, page = 1, limit = 12 } = req.query;

    if (!tag) {
      return res.status(400).json({
        success: false,
        message: "Tag parameter diperlukan",
      });
    }

    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM articles 
       WHERE is_published = 1 AND tags LIKE ?`,
      [`%${tag}%`]
    );
    const total = countResult[0].total;

    // Get articles
    const [articles] = await pool.execute(
      `
      SELECT 
        a.id,
        a.judul,
        a.slug,
        a.konten_singkat,
        a.gambar_utama,
        a.penulis,
        a.tanggal_publish,
        a.is_featured,
        a.views,
        a.tags,
        c.id as kategori_id,
        c.nama_kategori,
        c.slug as kategori_slug,
        c.warna as kategori_warna
      FROM articles a
      LEFT JOIN categories c ON a.kategori_id = c.id
      WHERE a.is_published = 1 AND a.tags LIKE ?
      ORDER BY a.tanggal_publish DESC
      LIMIT ? OFFSET ?
    `,
      [`%${tag}%`, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: {
        tag: tag,
        articles: articles,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error searching articles by tag:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mencari artikel berdasarkan tag",
      error: error.message,
    });
  }
});

// ============================================================================
// GET ALL CATEGORIES
// ============================================================================

router.get("/categories/all", async (req, res) => {
  try {
    const [categories] = await pool.execute(
      `
      SELECT 
        c.id,
        c.nama_kategori,
        c.slug,
        c.deskripsi,
        c.warna,
        COUNT(a.id) as article_count
      FROM categories c
      LEFT JOIN articles a ON c.id = a.kategori_id AND a.is_published = 1
      GROUP BY c.id, c.nama_kategori, c.slug, c.deskripsi, c.warna
      ORDER BY c.nama_kategori ASC
    `
    );

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data kategori",
      error: error.message,
    });
  }
});

module.exports = router;
