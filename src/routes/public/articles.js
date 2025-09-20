// src/routes/public/articles.js - FIXED Route Order
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

// Helper functions (keep as is)
const formatArticleForPublic = (article) => {
  return {
    id: article.id,
    judul: article.judul,
    slug: article.slug,
    konten_singkat: article.konten_singkat,
    konten_lengkap: article.konten_lengkap,
    gambar_utama: article.gambar_utama ? `/uploads/articles/${article.gambar_utama}` : null,
    kategori: {
      id: article.kategori_id,
      nama: article.nama_kategori,
      slug: article.kategori_slug,
      warna: article.warna_kategori,
    },
    penulis: article.penulis,
    tanggal_publish: article.tanggal_publish,
    is_featured: Boolean(article.is_featured),
    meta_description: article.meta_description,
    tags: article.tags ? article.tags.split(",").map((tag) => tag.trim()) : [],
    views: article.views || 0,
    created_at: article.created_at,
    updated_at: article.updated_at,
  };
};

const formatCategoryForPublic = (category) => {
  return {
    id: category.id,
    nama_kategori: category.nama_kategori,
    slug: category.slug,
    deskripsi: category.deskripsi,
    warna_kategori: category.warna_kategori,
    total_artikel: category.total_artikel || 0,
  };
};

// =============================================================================
// SPECIFIC ROUTES FIRST - VERY IMPORTANT ORDER!
// =============================================================================

// GET /api/public/articles/categories - List active categories with article counts
router.get("/categories", async (req, res) => {
  try {
    const { include_empty = "false" } = req.query;

    let query = `
      SELECT 
        k.id, k.nama_kategori, k.slug, k.deskripsi, k.warna_kategori,
        COUNT(a.id) as total_artikel
      FROM kategori_artikel k
      LEFT JOIN artikel a ON k.id = a.kategori_id AND a.is_published = 1
      WHERE k.is_active = 1
      GROUP BY k.id
    `;

    // Exclude empty categories if requested
    if (include_empty !== "true") {
      query += " HAVING total_artikel > 0";
    }

    query += " ORDER BY k.urutan ASC, k.nama_kategori ASC";

    const [categories] = await pool.execute(query);

    res.json({
      success: true,
      message: "Categories retrieved successfully",
      data: {
        categories: categories.map(formatCategoryForPublic),
        total_categories: categories.length,
      },
    });
  } catch (error) {
    console.error("Get public categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
      error: error.message,
    });
  }
});

// GET /api/public/articles/categories/:slug - Get category details with articles
router.get("/categories/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 12, sort = "newest" } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get category details
    const categoryQuery = `
      SELECT k.*, COUNT(a.id) as total_artikel
      FROM kategori_artikel k
      LEFT JOIN artikel a ON k.id = a.kategori_id AND a.is_published = 1
      WHERE k.slug = ? AND k.is_active = 1
      GROUP BY k.id
    `;

    const [categories] = await pool.execute(categoryQuery, [slug]);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const category = categories[0];

    // Determine sort order
    let orderBy = "a.tanggal_publish DESC";
    switch (sort) {
      case "oldest":
        orderBy = "a.tanggal_publish ASC";
        break;
      case "popular":
        orderBy = "a.views DESC, a.tanggal_publish DESC";
        break;
      case "alphabetical":
        orderBy = "a.judul ASC";
        break;
      case "newest":
      default:
        orderBy = "a.tanggal_publish DESC";
        break;
    }

    // Get articles in this category
    const articlesQuery = `
      SELECT 
        a.id, a.judul, a.slug, a.konten_singkat, a.gambar_utama,
        a.penulis, a.tanggal_publish, a.is_featured, a.views,
        a.meta_description, a.tags, a.created_at, a.updated_at,
        k.id as kategori_id, k.nama_kategori, k.slug as kategori_slug, k.warna_kategori
      FROM artikel a
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
      WHERE k.slug = ? AND a.is_published = 1
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const [articles] = await pool.execute(articlesQuery, [slug, parseInt(limit), offset]);

    // Calculate pagination
    const totalPages = Math.ceil(category.total_artikel / parseInt(limit));

    res.json({
      success: true,
      message: "Category articles retrieved successfully",
      data: {
        category: formatCategoryForPublic(category),
        articles: articles.map(formatArticleForPublic),
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_articles: category.total_artikel,
          per_page: parseInt(limit),
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
        sort: sort,
      },
    });
  } catch (error) {
    console.error("Get category articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve category articles",
      error: error.message,
    });
  }
});

// GET /api/public/articles/search - Advanced search functionality
router.get("/search", async (req, res) => {
  try {
    const { q, page = 1, limit = 12, kategori, year, sort = "relevance" } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long",
      });
    }

    const searchTerm = `%${q.trim()}%`;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = ["a.is_published = 1", "(a.judul LIKE ? OR a.konten_lengkap LIKE ? OR a.tags LIKE ?)"];
    let queryParams = [searchTerm, searchTerm, searchTerm];

    // Add category filter
    if (kategori) {
      whereConditions.push("k.slug = ?");
      queryParams.push(kategori);
    }

    // Add year filter
    if (year) {
      whereConditions.push("YEAR(a.tanggal_publish) = ?");
      queryParams.push(parseInt(year));
    }

    const whereClause = whereConditions.join(" AND ");

    // Determine sort order
    let orderBy = "a.tanggal_publish DESC";
    switch (sort) {
      case "newest":
        orderBy = "a.tanggal_publish DESC";
        break;
      case "oldest":
        orderBy = "a.tanggal_publish ASC";
        break;
      case "popular":
        orderBy = "a.views DESC, a.tanggal_publish DESC";
        break;
      case "relevance":
      default:
        // Simple relevance scoring based on title matches
        orderBy = `
          CASE 
            WHEN a.judul LIKE ? THEN 1 
            WHEN a.tags LIKE ? THEN 2 
            ELSE 3 
          END, a.tanggal_publish DESC
        `;
        queryParams.unshift(searchTerm, searchTerm);
        break;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM artikel a
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
      WHERE ${whereClause}
    `;

    const countParams =
      sort === "relevance"
        ? queryParams.slice(2) // Remove the relevance parameters
        : [...queryParams];

    const [countResult] = await pool.execute(countQuery, countParams);
    const totalResults = countResult[0].total;

    // Get search results
    const searchQuery = `
      SELECT 
        a.id, a.judul, a.slug, a.konten_singkat, a.gambar_utama,
        a.penulis, a.tanggal_publish, a.views, a.tags,
        a.meta_description, a.created_at, a.updated_at,
        k.id as kategori_id, k.nama_kategori, k.slug as kategori_slug, k.warna_kategori
      FROM artikel a
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const [articles] = await pool.execute(searchQuery, queryParams);

    // Format results with search highlights
    const formattedResults = articles.map((article) => {
      const formatted = formatArticleForPublic(article);

      // Add search highlights (simple implementation)
      const searchRegex = new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");

      formatted.search_highlights = {
        judul: formatted.judul.replace(searchRegex, "<mark>$1</mark>"),
        konten_singkat: formatted.konten_singkat ? formatted.konten_singkat.replace(searchRegex, "<mark>$1</mark>") : null,
      };

      return formatted;
    });

    const totalPages = Math.ceil(totalResults / parseInt(limit));

    res.json({
      success: true,
      message: "Search completed successfully",
      data: {
        query: q.trim(),
        results: formattedResults,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_results: totalResults,
          per_page: parseInt(limit),
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
        },
        filters: {
          kategori,
          year: year ? parseInt(year) : null,
          sort,
        },
      },
    });
  } catch (error) {
    console.error("Search articles error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
});

// GET /api/public/articles/featured - Get featured articles
router.get("/featured", async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const query = `
      SELECT 
        a.id, a.judul, a.slug, a.konten_singkat, a.gambar_utama,
        a.penulis, a.tanggal_publish, a.views, a.meta_description,
        k.id as kategori_id, k.nama_kategori, k.slug as kategori_slug, k.warna_kategori
      FROM artikel a
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
      WHERE a.is_published = 1 AND a.is_featured = 1
      ORDER BY a.tanggal_publish DESC
      LIMIT ?
    `;

    const [articles] = await pool.execute(query, [parseInt(limit)]);

    res.json({
      success: true,
      message: "Featured articles retrieved successfully",
      data: {
        articles: articles.map(formatArticleForPublic),
        total_featured: articles.length,
      },
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

// GET /api/public/articles/recent - Get recent articles (for widgets, etc.)
router.get("/recent", async (req, res) => {
  try {
    const { limit = 5, exclude_id } = req.query;

    let query = `
      SELECT 
        a.id, a.judul, a.slug, a.gambar_utama, a.tanggal_publish,
        k.nama_kategori, k.slug as kategori_slug, k.warna_kategori
      FROM artikel a
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
      WHERE a.is_published = 1
    `;

    const queryParams = [];

    if (exclude_id) {
      query += " AND a.id != ?";
      queryParams.push(parseInt(exclude_id));
    }

    query += " ORDER BY a.tanggal_publish DESC LIMIT ?";
    queryParams.push(parseInt(limit));

    const [articles] = await pool.execute(query, queryParams);

    res.json({
      success: true,
      message: "Recent articles retrieved successfully",
      data: {
        articles: articles.map((article) => ({
          id: article.id,
          judul: article.judul,
          slug: article.slug,
          gambar_utama: article.gambar_utama ? `/uploads/articles/${article.gambar_utama}` : null,
          tanggal_publish: article.tanggal_publish,
          kategori: {
            nama: article.nama_kategori,
            slug: article.kategori_slug,
            warna: article.warna_kategori,
          },
        })),
      },
    });
  } catch (error) {
    console.error("Get recent articles error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve recent articles",
      error: error.message,
    });
  }
});

// GET /api/public/articles/stats - Get public statistics
router.get("/stats", async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_articles,
        COUNT(CASE WHEN is_featured = 1 THEN 1 END) as featured_articles,
        SUM(COALESCE(views, 0)) as total_views,
        COUNT(DISTINCT kategori_id) as total_categories
      FROM artikel 
      WHERE is_published = 1
    `);

    const [categoryStats] = await pool.execute(`
      SELECT 
        k.nama_kategori, k.slug, k.warna_kategori,
        COUNT(a.id) as article_count
      FROM kategori_artikel k
      LEFT JOIN artikel a ON k.id = a.kategori_id AND a.is_published = 1
      WHERE k.is_active = 1
      GROUP BY k.id
      HAVING article_count > 0
      ORDER BY article_count DESC
      LIMIT 10
    `);

    const [recentStats] = await pool.execute(`
      SELECT 
        DATE(tanggal_publish) as publish_date,
        COUNT(*) as articles_count
      FROM artikel 
      WHERE is_published = 1 
        AND tanggal_publish >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(tanggal_publish)
      ORDER BY publish_date DESC
    `);

    res.json({
      success: true,
      message: "Article statistics retrieved successfully",
      data: {
        overview: stats[0],
        by_category: categoryStats,
        recent_activity: recentStats,
      },
    });
  } catch (error) {
    console.error("Get article stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve article statistics",
      error: error.message,
    });
  }
});

// =============================================================================
// GENERIC ROUTES LAST - MUST BE AFTER SPECIFIC ROUTES!
// =============================================================================

// GET /api/public/articles - List published articles with pagination and filters
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 12, kategori, featured = false, search, sort = "newest", year, month } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = ["a.is_published = 1"];
    let queryParams = [];

    // Filter by category slug
    if (kategori) {
      whereConditions.push("k.slug = ?");
      queryParams.push(kategori);
    }

    // Filter featured articles
    if (featured === "true") {
      whereConditions.push("a.is_featured = 1");
    }

    // Search functionality
    if (search) {
      whereConditions.push("(a.judul LIKE ? OR a.konten_lengkap LIKE ? OR a.tags LIKE ?)");
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Filter by year
    if (year) {
      whereConditions.push("YEAR(a.tanggal_publish) = ?");
      queryParams.push(parseInt(year));
    }

    // Filter by month
    if (month && year) {
      whereConditions.push("MONTH(a.tanggal_publish) = ?");
      queryParams.push(parseInt(month));
    }

    const whereClause = whereConditions.join(" AND ");

    // Determine sort order
    let orderBy = "a.tanggal_publish DESC, a.created_at DESC";
    switch (sort) {
      case "oldest":
        orderBy = "a.tanggal_publish ASC, a.created_at ASC";
        break;
      case "popular":
        orderBy = "a.views DESC, a.tanggal_publish DESC";
        break;
      case "alphabetical":
        orderBy = "a.judul ASC";
        break;
      case "newest":
      default:
        orderBy = "a.tanggal_publish DESC, a.created_at DESC";
        break;
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM artikel a 
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id 
      WHERE ${whereClause}
    `;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalArticles = countResult[0].total;

    // Get articles data
    const articlesQuery = `
      SELECT 
        a.id, a.judul, a.slug, a.konten_singkat, a.konten_lengkap,
        a.gambar_utama, a.penulis, a.tanggal_publish, a.is_featured,
        a.meta_description, a.tags, a.views, a.created_at, a.updated_at,
        k.id as kategori_id, k.nama_kategori, k.slug as kategori_slug, k.warna_kategori
      FROM artikel a
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    const [articles] = await pool.execute(articlesQuery, queryParams);

    // Format articles for public consumption
    const formattedArticles = articles.map(formatArticleForPublic);

    // Calculate pagination
    const totalPages = Math.ceil(totalArticles / parseInt(limit));

    res.json({
      success: true,
      message: "Articles retrieved successfully",
      data: {
        articles: formattedArticles,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_articles: totalArticles,
          per_page: parseInt(limit),
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
          next_page: parseInt(page) < totalPages ? parseInt(page) + 1 : null,
          prev_page: parseInt(page) > 1 ? parseInt(page) - 1 : null,
        },
        filters: {
          kategori,
          featured: featured === "true",
          search,
          sort,
          year: year ? parseInt(year) : null,
          month: month ? parseInt(month) : null,
        },
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

// GET /api/public/articles/:slug - Get single article by slug
// THIS MUST BE THE LAST ROUTE because it's the most generic (catches anything)
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { increment_views = "true" } = req.query;

    const articleQuery = `
      SELECT 
        a.id, a.judul, a.slug, a.konten_singkat, a.konten_lengkap,
        a.gambar_utama, a.penulis, a.tanggal_publish, a.is_featured,
        a.meta_description, a.tags, a.views, a.created_at, a.updated_at,
        k.id as kategori_id, k.nama_kategori, k.slug as kategori_slug, 
        k.warna_kategori, k.deskripsi as kategori_deskripsi
      FROM artikel a
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
      WHERE a.slug = ? AND a.is_published = 1
    `;

    const [articles] = await pool.execute(articleQuery, [slug]);

    if (articles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    const article = articles[0];

    // Increment view count if requested
    if (increment_views === "true") {
      await pool.execute("UPDATE artikel SET views = COALESCE(views, 0) + 1 WHERE id = ?", [article.id]);
      article.views = (article.views || 0) + 1;
    }

    // Get related articles (same category, different article)
    const relatedQuery = `
      SELECT 
        a.id, a.judul, a.slug, a.konten_singkat, a.gambar_utama,
        a.penulis, a.tanggal_publish, a.views,
        k.nama_kategori, k.slug as kategori_slug, k.warna_kategori
      FROM artikel a
      LEFT JOIN kategori_artikel k ON a.kategori_id = k.id
      WHERE a.kategori_id = ? AND a.id != ? AND a.is_published = 1
      ORDER BY a.tanggal_publish DESC
      LIMIT 4
    `;

    const [relatedArticles] = await pool.execute(relatedQuery, [article.kategori_id, article.id]);

    // Get previous and next articles
    const prevQuery = `
      SELECT id, judul, slug, gambar_utama
      FROM artikel 
      WHERE tanggal_publish < ? AND is_published = 1
      ORDER BY tanggal_publish DESC 
      LIMIT 1
    `;

    const nextQuery = `
      SELECT id, judul, slug, gambar_utama
      FROM artikel 
      WHERE tanggal_publish > ? AND is_published = 1
      ORDER BY tanggal_publish ASC 
      LIMIT 1
    `;

    const [prevArticle] = await pool.execute(prevQuery, [article.tanggal_publish]);
    const [nextArticle] = await pool.execute(nextQuery, [article.tanggal_publish]);

    res.json({
      success: true,
      message: "Article retrieved successfully",
      data: {
        article: formatArticleForPublic(article),
        related_articles: relatedArticles.map(formatArticleForPublic),
        navigation: {
          previous:
            prevArticle.length > 0
              ? {
                  id: prevArticle[0].id,
                  judul: prevArticle[0].judul,
                  slug: prevArticle[0].slug,
                  gambar_utama: prevArticle[0].gambar_utama ? `/uploads/articles/${prevArticle[0].gambar_utama}` : null,
                }
              : null,
          next:
            nextArticle.length > 0
              ? {
                  id: nextArticle[0].id,
                  judul: nextArticle[0].judul,
                  slug: nextArticle[0].slug,
                  gambar_utama: nextArticle[0].gambar_utama ? `/uploads/articles/${nextArticle[0].gambar_utama}` : null,
                }
              : null,
        },
        seo: {
          title: article.judul,
          description: article.meta_description || article.konten_singkat?.substring(0, 160),
          keywords: article.tags,
          og_image: article.gambar_utama ? `/uploads/articles/${article.gambar_utama}` : null,
          canonical_url: `/artikel/${article.slug}`,
          published_time: article.tanggal_publish,
          modified_time: article.updated_at,
          author: article.penulis,
          section: article.nama_kategori,
        },
      },
    });
  } catch (error) {
    console.error("Get public article error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve article",
      error: error.message,
    });
  }
});

module.exports = router;
