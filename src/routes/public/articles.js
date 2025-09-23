const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

// ============================================================================
// PUBLIC ARTIKEL ROUTES (No Authentication Required)
// ============================================================================

// GET /api/public/articles - Get published articles for public
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 9, search, kategori, featured, sort = "tanggal_publish", order = "desc" } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.is_published = 1
    `;
    const params = [];

    // Apply filters
    if (search) {
      query += " AND (a.judul LIKE ? OR a.konten_singkat LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (kategori) {
      query += " AND k.slug = ?";
      params.push(kategori);
    }

    if (featured === "1") {
      query += " AND a.is_featured = 1";
    } else if (featured === "0") {
      query += " AND a.is_featured = 0";
    }

    // Sorting
    const allowedSorts = ["tanggal_publish", "created_at", "judul", "views"];
    const sortField = allowedSorts.includes(sort) ? sort : "tanggal_publish";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

    query += ` ORDER BY a.${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [articles] = await pool.execute(query, params);

    // Count total for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.is_published = 1
    `;
    const countParams = [];

    if (search) {
      countQuery += " AND (a.judul LIKE ? OR a.konten_singkat LIKE ?)";
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }

    if (kategori) {
      countQuery += " AND k.slug = ?";
      countParams.push(kategori);
    }

    if (featured === "1") {
      countQuery += " AND a.is_featured = 1";
    } else if (featured === "0") {
      countQuery += " AND a.is_featured = 0";
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Process articles to ensure proper data structure
    const processedArticles = articles.map((article) => ({
      ...article,
      tags: article.tags ? article.tags.split(",").map((tag) => tag.trim()) : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Published articles retrieved successfully",
      data: processedArticles,
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
    console.error("Get public articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve articles",
      error: error.message,
    });
  }
});

// GET /api/public/articles/featured - Get featured articles
router.get("/featured", async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const [articles] = await pool.execute(
      `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.is_published = 1 AND a.is_featured = 1
      ORDER BY a.tanggal_publish DESC 
      LIMIT ?
    `,
      [parseInt(limit)]
    );

    const processedArticles = articles.map((article) => ({
      ...article,
      tags: article.tags ? article.tags.split(",").map((tag) => tag.trim()) : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Featured articles retrieved successfully",
      data: processedArticles,
    });
  } catch (error) {
    console.error("Get featured articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve featured articles",
      error: error.message,
    });
  }
});

// GET /api/public/articles/latest - Get latest articles
router.get("/latest", async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const [articles] = await pool.execute(
      `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.is_published = 1
      ORDER BY a.tanggal_publish DESC 
      LIMIT ?
    `,
      [parseInt(limit)]
    );

    const processedArticles = articles.map((article) => ({
      ...article,
      tags: article.tags ? article.tags.split(",").map((tag) => tag.trim()) : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Latest articles retrieved successfully",
      data: processedArticles,
    });
  } catch (error) {
    console.error("Get latest articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve latest articles",
      error: error.message,
    });
  }
});

// GET /api/public/articles/popular - Get popular articles by views
router.get("/popular", async (req, res) => {
  try {
    const { limit = 5, days = 30 } = req.query;

    let query = `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.is_published = 1
    `;

    const params = [];

    if (days && days !== "all") {
      query += " AND a.tanggal_publish >= DATE_SUB(NOW(), INTERVAL ? DAY)";
      params.push(parseInt(days));
    }

    query += " ORDER BY a.views DESC LIMIT ?";
    params.push(parseInt(limit));

    const [articles] = await pool.execute(query, params);

    const processedArticles = articles.map((article) => ({
      ...article,
      tags: article.tags ? article.tags.split(",").map((tag) => tag.trim()) : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Popular articles retrieved successfully",
      data: processedArticles,
    });
  } catch (error) {
    console.error("Get popular articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve popular articles",
      error: error.message,
    });
  }
});

// GET /api/public/articles/slug/:slug - Get single article by slug
router.get("/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [articles] = await pool.execute(
      `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
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

    // Increment view count
    await pool.execute("UPDATE articles SET views = views + 1 WHERE slug = ?", [slug]);

    const article = {
      ...articles[0],
      tags: articles[0].tags ? articles[0].tags.split(",").map((tag) => tag.trim()) : [],
      is_published: Boolean(articles[0].is_published),
      is_featured: Boolean(articles[0].is_featured),
    };

    // Get related articles (same category, excluding current article)
    const [relatedArticles] = await pool.execute(
      `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.kategori_id = ? AND a.id != ? AND a.is_published = 1
      ORDER BY a.tanggal_publish DESC 
      LIMIT 3
    `,
      [article.kategori_id, article.id]
    );

    const processedRelated = relatedArticles.map((article) => ({
      ...article,
      tags: article.tags ? article.tags.split(",").map((tag) => tag.trim()) : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Article retrieved successfully",
      data: {
        article: article,
        related_articles: processedRelated,
      },
    });
  } catch (error) {
    console.error("Get article by slug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve article",
      error: error.message,
    });
  }
});

// GET /api/public/articles/categories - Get all categories with article count
router.get("/categories", async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT k.*, 
        COUNT(a.id) as total_artikel
      FROM categories k 
      LEFT JOIN articles a ON k.id = a.kategori_id AND a.is_published = 1
      GROUP BY k.id, k.nama_kategori, k.slug, k.deskripsi, k.warna
      HAVING total_artikel > 0 OR k.id IS NOT NULL
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

// GET /api/public/articles/category/:slug - Get articles by category slug
router.get("/category/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 9 } = req.query;
    const offset = (page - 1) * limit;

    // First get category info
    const [categories] = await pool.execute("SELECT * FROM categories WHERE slug = ?", [slug]);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Kategori tidak ditemukan",
      });
    }

    const category = categories[0];

    // Get articles in this category
    const [articles] = await pool.execute(
      `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE k.slug = ? AND a.is_published = 1
      ORDER BY a.tanggal_publish DESC 
      LIMIT ? OFFSET ?
    `,
      [slug, parseInt(limit), parseInt(offset)]
    );

    // Count total
    const [countResult] = await pool.execute(
      `
      SELECT COUNT(*) as total 
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE k.slug = ? AND a.is_published = 1
    `,
      [slug]
    );

    const total = countResult[0].total;

    const processedArticles = articles.map((article) => ({
      ...article,
      tags: article.tags ? article.tags.split(",").map((tag) => tag.trim()) : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Articles by category retrieved successfully",
      data: {
        category: category,
        articles: processedArticles,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_pages: Math.ceil(total / limit),
          total_articles: total,
          has_next: page * limit < total,
          has_prev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get articles by category error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve articles by category",
      error: error.message,
    });
  }
});

// GET /api/public/articles/search - Search articles
router.get("/search", async (req, res) => {
  try {
    const { q, page = 1, limit = 9 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Query pencarian minimal 2 karakter",
      });
    }

    const offset = (page - 1) * limit;
    const searchTerm = `%${q.trim()}%`;

    const [articles] = await pool.execute(
      `
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.is_published = 1 AND (
        a.judul LIKE ? OR 
        a.konten_singkat LIKE ? OR 
        a.konten_lengkap LIKE ? OR
        a.tags LIKE ?
      )
      ORDER BY 
        CASE 
          WHEN a.judul LIKE ? THEN 1
          WHEN a.konten_singkat LIKE ? THEN 2
          WHEN a.tags LIKE ? THEN 3
          ELSE 4
        END,
        a.tanggal_publish DESC 
      LIMIT ? OFFSET ?
    `,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)]
    );

    // Count total
    const [countResult] = await pool.execute(
      `
      SELECT COUNT(*) as total 
      FROM articles a 
      WHERE a.is_published = 1 AND (
        a.judul LIKE ? OR 
        a.konten_singkat LIKE ? OR 
        a.konten_lengkap LIKE ? OR
        a.tags LIKE ?
      )
    `,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    const total = countResult[0].total;

    const processedArticles = articles.map((article) => ({
      ...article,
      tags: article.tags ? article.tags.split(",").map((tag) => tag.trim()) : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Search results retrieved successfully",
      data: {
        query: q.trim(),
        articles: processedArticles,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_pages: Math.ceil(total / limit),
          total_articles: total,
          has_next: page * limit < total,
          has_prev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Search articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search articles",
      error: error.message,
    });
  }
});

module.exports = router;
