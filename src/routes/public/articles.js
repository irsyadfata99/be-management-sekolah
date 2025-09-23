const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

// ============================================================================
// EMERGENCY FIX - PUBLIC ARTIKEL ROUTES
// Alternative approach to avoid MySQL parameter issues
// ============================================================================

// GET /api/public/articles - Emergency fix version
router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "9",
      search,
      kategori,
      featured,
      sort = "tanggal_publish",
      order = "desc",
    } = req.query;

    // Proper parameter conversion
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 9));
    const offset = (pageNum - 1) * limitNum;

    console.log("📊 Query params:", {
      page: pageNum,
      limit: limitNum,
      offset,
      search,
      kategori,
      featured,
    });

    // STEP 1: Check if tables exist
    try {
      const [tablesCheck] = await pool.execute("SHOW TABLES");
      console.log(
        "📊 Available tables:",
        tablesCheck.map((t) => Object.values(t)[0])
      );

      const hasArticles = tablesCheck.some(
        (t) => Object.values(t)[0] === "articles"
      );
      const hasCategories = tablesCheck.some(
        (t) => Object.values(t)[0] === "categories"
      );

      if (!hasArticles) {
        return res.status(500).json({
          success: false,
          message: "Articles table does not exist",
          error:
            "Database not properly initialized. Please run the CREATE TABLE script first.",
        });
      }

      console.log(
        `✅ Tables check: articles=${hasArticles}, categories=${hasCategories}`
      );
    } catch (tableError) {
      console.error("❌ Table check error:", tableError);
      return res.status(500).json({
        success: false,
        message: "Database table check failed",
        error: tableError.message,
      });
    }

    // STEP 2: Try simple query first (without LIMIT/OFFSET)
    let baseQuery = `
      SELECT a.id, a.judul, a.slug, a.konten_singkat, a.konten_lengkap, 
             a.gambar_utama, a.kategori_id, a.penulis, a.is_published, 
             a.tanggal_publish, a.is_featured, a.meta_description, 
             a.tags, a.views, a.created_at, a.updated_at,
             k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.is_published = 1
    `;

    const params = [];

    // Apply filters
    if (search && search.trim()) {
      baseQuery += " AND (a.judul LIKE ? OR a.konten_singkat LIKE ?)";
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm);
    }

    if (kategori && kategori.trim()) {
      baseQuery += " AND k.slug = ?";
      params.push(kategori.trim());
    }

    if (featured === "1") {
      baseQuery += " AND a.is_featured = 1";
    } else if (featured === "0") {
      baseQuery += " AND a.is_featured = 0";
    }

    // Sorting
    const allowedSorts = ["tanggal_publish", "created_at", "judul", "views"];
    const sortField = allowedSorts.includes(sort) ? sort : "tanggal_publish";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

    baseQuery += ` ORDER BY a.${sortField} ${sortOrder}`;

    console.log("🔍 Base Query (no limit):", baseQuery);
    console.log("🔍 Parameters:", params);

    // STEP 3: Execute base query first
    let allArticles;
    try {
      const [results] = await pool.execute(baseQuery, params);
      allArticles = results;
      console.log(
        `✅ Base query successful: ${allArticles.length} articles found`
      );
    } catch (baseError) {
      console.error("❌ Base query error:", baseError);
      return res.status(500).json({
        success: false,
        message: "Failed to execute base query",
        error: baseError.message,
        debug: {
          query: baseQuery,
          params: params,
          sqlMessage: baseError.sqlMessage,
        },
      });
    }

    // STEP 4: Apply pagination manually (since LIMIT/OFFSET causes issues)
    const total = allArticles.length;
    const paginatedArticles = allArticles.slice(offset, offset + limitNum);

    console.log(
      `📄 Pagination: showing ${paginatedArticles.length} of ${total} articles (page ${pageNum})`
    );

    // Process articles data
    const processedArticles = paginatedArticles.map((article) => ({
      ...article,
      tags: article.tags
        ? article.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Published articles retrieved successfully",
      data: processedArticles,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_pages: Math.ceil(total / limitNum),
        total_articles: total,
        has_next: pageNum * limitNum < total,
        has_prev: pageNum > 1,
      },
      debug: {
        query_method: "manual_pagination",
        total_found: total,
        slice_start: offset,
        slice_end: offset + limitNum,
      },
    });
  } catch (error) {
    console.error("❌ Get public articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve articles",
      error: error.message,
      debug: {
        stack: error.stack,
        sql: error.sql,
        sqlMessage: error.sqlMessage,
        code: error.code,
      },
    });
  }
});

// GET /api/public/articles/categories - Simple version
router.get("/categories", async (req, res) => {
  try {
    console.log("🔍 Fetching categories...");

    // Simple query without complex JOINs first
    const [categories] = await pool.execute(`
      SELECT id, nama_kategori, slug, deskripsi, warna, created_at, updated_at
      FROM categories 
      ORDER BY nama_kategori ASC
    `);

    console.log(`✅ Found ${categories.length} categories`);

    // Manually count articles for each category (avoid JOIN issues)
    const categoriesWithCount = [];

    for (const category of categories) {
      try {
        const [countResult] = await pool.execute(
          "SELECT COUNT(*) as total FROM articles WHERE kategori_id = ? AND is_published = 1",
          [category.id]
        );

        categoriesWithCount.push({
          ...category,
          total_artikel: countResult[0].total,
        });
      } catch (countError) {
        console.warn(
          `⚠️ Count error for category ${category.id}:`,
          countError.message
        );
        categoriesWithCount.push({
          ...category,
          total_artikel: 0,
        });
      }
    }

    res.json({
      success: true,
      message: "Categories retrieved successfully",
      data: { categories: categoriesWithCount },
    });
  } catch (error) {
    console.error("❌ Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
      error: error.message,
    });
  }
});

// GET /api/public/articles/featured - Simple version
router.get("/featured", async (req, res) => {
  try {
    console.log("🔍 Fetching featured articles...");

    // Simple query without LIMIT first
    const [allFeatured] = await pool.execute(`
      SELECT a.*, k.nama_kategori, k.slug as slug_kategori, k.warna as warna_kategori
      FROM articles a 
      LEFT JOIN categories k ON a.kategori_id = k.id 
      WHERE a.is_published = 1 AND a.is_featured = 1
      ORDER BY a.tanggal_publish DESC
    `);

    console.log(`✅ Found ${allFeatured.length} featured articles`);

    // Manual limit to 6
    const { limit = "6" } = req.query;
    const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 6));
    const featuredArticles = allFeatured.slice(0, limitNum);

    const processedArticles = featuredArticles.map((article) => ({
      ...article,
      tags: article.tags
        ? article.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
      is_published: Boolean(article.is_published),
      is_featured: Boolean(article.is_featured),
    }));

    res.json({
      success: true,
      message: "Featured articles retrieved successfully",
      data: processedArticles,
    });
  } catch (error) {
    console.error("❌ Get featured articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve featured articles",
      error: error.message,
    });
  }
});

// Simple health check for this route
router.get("/health", async (req, res) => {
  try {
    // Test basic database connection
    const [result] = await pool.execute("SELECT 1 as test");

    // Test if articles table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'articles'");

    res.json({
      success: true,
      message: "Articles API health check",
      data: {
        database_connected: true,
        articles_table_exists: tables.length > 0,
        test_result: result[0].test,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Articles API health check failed",
      error: error.message,
    });
  }
});

module.exports = router;
