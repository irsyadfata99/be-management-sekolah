// ============================================================================
// PUBLIC DOCUMENTS ROUTES - Download API (FIXED VERSION)
// File: src/routes/public/documents.js
// ============================================================================

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { param, query, validationResult } = require("express-validator");
const { pool } = require("../../config/database");

// ============================================================================
// RATE LIMITING & SECURITY
// ============================================================================

// Simple rate limiting for downloads (optional - can use express-rate-limit)
const downloadTracker = new Map();

const rateLimitDownload = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxDownloads = 10; // max 10 downloads per minute per IP

  if (!downloadTracker.has(clientIP)) {
    downloadTracker.set(clientIP, []);
  }

  const downloads = downloadTracker.get(clientIP);

  // Clean old entries
  const recentDownloads = downloads.filter((time) => now - time < windowMs);

  if (recentDownloads.length >= maxDownloads) {
    return res.status(429).json({
      success: false,
      message: "Too many downloads. Please try again later.",
      retry_after: Math.ceil(windowMs / 1000),
    });
  }

  recentDownloads.push(now);
  downloadTracker.set(clientIP, recentDownloads);

  next();
};

// Clean rate limit tracker every hour
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;

  for (const [ip, downloads] of downloadTracker.entries()) {
    const recentDownloads = downloads.filter((time) => now - time < windowMs);
    if (recentDownloads.length === 0) {
      downloadTracker.delete(ip);
    } else {
      downloadTracker.set(ip, recentDownloads);
    }
  }
}, 60 * 60 * 1000); // Every hour

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Format file size for display
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Check if table exists helper
async function tableExists(tableName) {
  try {
    const [result] = await pool.execute(
      `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ?
    `,
      [tableName]
    );
    return result[0].count > 0;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}

// ============================================================================
// GET ROUTES - Public Document Listing & Download
// ============================================================================

// GET /api/public/documents - List all public documents
router.get(
  "/",
  [
    query("category")
      .optional()
      .isIn([
        "pengumuman",
        "kurikulum",
        "akademik",
        "administrasi",
        "keuangan",
        "prestasi",
        "lainnya",
      ]),
    query("featured").optional().isBoolean(),
    query("search").optional().isString().trim(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("sort_by")
      .optional()
      .isIn(["title", "upload_date", "download_count"]),
    query("sort_order").optional().isIn(["asc", "desc"]),
  ],
  async (req, res) => {
    try {
      console.log("=== PUBLIC DOCUMENTS LIST REQUEST ===");
      console.log("Query params:", req.query);
      console.log("Client IP:", req.ip);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: errors.array(),
        });
      }

      // Check if tables exist
      const documentsTableExists = await tableExists("public_documents");
      const categoriesTableExists = await tableExists("document_categories");

      if (!documentsTableExists) {
        return res.status(404).json({
          success: false,
          message: "Documents system not initialized",
          data: [],
          note: "public_documents table not found",
        });
      }

      const {
        category,
        featured,
        search,
        page = 1,
        limit = 20,
        sort_by = "upload_date",
        sort_order = "desc",
      } = req.query;

      // ✅ FIXED: Proper parameter conversion
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Build WHERE conditions for public access
      const conditions = [
        "pd.is_active = 1",
        "pd.approved_by IS NOT NULL", // Only approved documents
        "(pd.published_date IS NULL OR pd.published_date <= CURDATE())", // Published or no publish date
        "(pd.expiry_date IS NULL OR pd.expiry_date >= CURDATE())", // Not expired
      ];
      const queryParams = [];

      if (category) {
        conditions.push("pd.category = ?");
        queryParams.push(category);
      }

      if (featured === true || featured === "true") {
        conditions.push("pd.is_featured = 1");
      }

      if (search && search.trim()) {
        conditions.push(
          "(pd.title LIKE ? OR pd.description LIKE ? OR pd.tags LIKE ? OR pd.keywords LIKE ?)"
        );
        const searchTerm = `%${search.trim()}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      // ✅ FIXED: Simplified query without problematic JOIN if categories table doesn't exist
      let mainQuery, countQuery;

      if (categoriesTableExists) {
        mainQuery = `
          SELECT 
            pd.id,
            pd.title,
            pd.description,
            pd.category,
            pd.original_filename,
            pd.file_size,
            pd.file_type,
            pd.file_extension,
            pd.upload_date,
            pd.published_date,
            pd.download_count,
            pd.is_featured,
            pd.requires_login,
            pd.tags,
            pd.keywords,
            pd.created_at,
            dc.category_name,
            dc.icon as category_icon,
            dc.color as category_color
          FROM public_documents pd
          LEFT JOIN document_categories dc ON pd.category = dc.category_slug
          ${whereClause}
          ORDER BY pd.${sort_by} ${sort_order.toUpperCase()}, pd.created_at DESC
          LIMIT ? OFFSET ?
        `;
      } else {
        mainQuery = `
          SELECT 
            pd.id,
            pd.title,
            pd.description,
            pd.category,
            pd.original_filename,
            pd.file_size,
            pd.file_type,
            pd.file_extension,
            pd.upload_date,
            pd.published_date,
            pd.download_count,
            pd.is_featured,
            pd.requires_login,
            pd.tags,
            pd.keywords,
            pd.created_at,
            pd.category as category_name,
            NULL as category_icon,
            NULL as category_color
          FROM public_documents pd
          ${whereClause}
          ORDER BY pd.${sort_by} ${sort_order.toUpperCase()}, pd.created_at DESC
          LIMIT ? OFFSET ?
        `;
      }

      countQuery = `
        SELECT COUNT(*) as total
        FROM public_documents pd
        ${whereClause}
      `;

      console.log("Executing main query:", mainQuery);
      console.log("With params:", [...queryParams, limitNum, offset]);

      // ✅ FIXED: Proper parameter binding
      const [documents] = await pool.execute(mainQuery, [
        ...queryParams,
        limitNum,
        offset,
      ]);
      const [countResult] = await pool.execute(countQuery, queryParams);

      const totalRecords = countResult[0].total;
      const totalPages = Math.ceil(totalRecords / limitNum);

      // Add computed fields for public consumption
      documents.forEach((doc) => {
        doc.file_size_formatted = formatFileSize(doc.file_size);
        doc.download_url = `/api/public/documents/download/${doc.id}`;
        doc.days_since_upload = Math.floor(
          (new Date() - new Date(doc.created_at)) / (1000 * 60 * 60 * 24)
        );

        // Remove sensitive information
        delete doc.created_at;
      });

      console.log(`Found ${documents.length} public documents`);

      res.json({
        success: true,
        message: "Public documents retrieved successfully",
        data: documents,
        pagination: {
          current_page: pageNum,
          per_page: limitNum,
          total_records: totalRecords,
          total_pages: totalPages,
          has_next: pageNum < totalPages,
          has_prev: pageNum > 1,
        },
        filters_applied: {
          category: category || "all",
          featured: featured || false,
          search: search || "",
          sort_by,
          sort_order,
        },
      });
    } catch (error) {
      console.error("Error fetching public documents:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve documents",
        error: "Internal server error",
        debug: error.message,
      });
    }
  }
);

// GET /api/public/documents/categories - List all document categories
router.get("/categories", async (req, res) => {
  try {
    console.log("=== PUBLIC DOCUMENT CATEGORIES REQUEST ===");

    const categoriesTableExists = await tableExists("document_categories");

    if (!categoriesTableExists) {
      // Return default categories if table doesn't exist
      const defaultCategories = [
        {
          category_name: "Pengumuman",
          category_slug: "pengumuman",
          document_count: 0,
        },
        {
          category_name: "Kurikulum",
          category_slug: "kurikulum",
          document_count: 0,
        },
        {
          category_name: "Akademik",
          category_slug: "akademik",
          document_count: 0,
        },
        {
          category_name: "Administrasi",
          category_slug: "administrasi",
          document_count: 0,
        },
        {
          category_name: "Keuangan",
          category_slug: "keuangan",
          document_count: 0,
        },
        {
          category_name: "Prestasi",
          category_slug: "prestasi",
          document_count: 0,
        },
        {
          category_name: "Lainnya",
          category_slug: "lainnya",
          document_count: 0,
        },
      ];

      return res.json({
        success: true,
        message: "Default document categories retrieved",
        data: defaultCategories,
        note: "Using default categories - document_categories table not found",
      });
    }

    const [categories] = await pool.execute(`
      SELECT 
        dc.category_name,
        dc.category_slug,
        dc.description,
        dc.icon,
        dc.color,
        COUNT(pd.id) as document_count
      FROM document_categories dc
      LEFT JOIN public_documents pd ON dc.category_slug = pd.category 
        AND pd.is_active = 1 
        AND pd.approved_by IS NOT NULL
        AND (pd.published_date IS NULL OR pd.published_date <= CURDATE())
        AND (pd.expiry_date IS NULL OR pd.expiry_date >= CURDATE())
      WHERE dc.is_active = 1
      GROUP BY dc.id, dc.category_name, dc.category_slug, dc.description, dc.icon, dc.color
      HAVING document_count > 0
      ORDER BY dc.display_order, dc.category_name
    `);

    console.log(`Found ${categories.length} public categories`);

    res.json({
      success: true,
      message: "Document categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching public categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
      error: "Internal server error",
      debug: error.message,
    });
  }
});

// GET /api/public/documents/featured - Get featured documents (FIXED VERSION)
router.get(
  "/featured",
  [query("limit").optional().isInt({ min: 1, max: 20 })],
  async (req, res) => {
    try {
      console.log("=== PUBLIC FEATURED DOCUMENTS REQUEST ===");
      console.log("Query params:", req.query);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: errors.array(),
        });
      }

      // Check if table exists
      const documentsTableExists = await tableExists("public_documents");
      if (!documentsTableExists) {
        return res.status(404).json({
          success: false,
          message: "Documents system not initialized",
          data: [],
          note: "public_documents table not found",
        });
      }

      // ✅ FINAL FIX: Use string concatenation for LIMIT to avoid parameter binding issues
      const { limit = 10 } = req.query;
      const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 10));

      console.log("Using limit:", limitNum, "Type:", typeof limitNum);

      // ✅ SOLUTION: Build query with LIMIT directly in string (safe because we validate limitNum)
      const query = `
        SELECT 
          pd.id,
          pd.title,
          pd.description,
          pd.category,
          pd.original_filename,
          pd.file_size,
          pd.file_type,
          pd.upload_date,
          pd.download_count,
          pd.tags
        FROM public_documents pd
        WHERE pd.is_active = 1 
          AND pd.approved_by IS NOT NULL
          AND pd.is_featured = 1
          AND (pd.published_date IS NULL OR pd.published_date <= CURDATE())
          AND (pd.expiry_date IS NULL OR pd.expiry_date >= CURDATE())
        ORDER BY pd.download_count DESC, pd.upload_date DESC
        LIMIT ${limitNum}
      `;

      console.log("Executing featured query:", query);

      // ✅ NO PARAMETERS: Execute without parameter binding for LIMIT
      const [documents] = await pool.execute(query);

      // Add computed fields
      documents.forEach((doc) => {
        doc.file_size_formatted = formatFileSize(doc.file_size);
        doc.download_url = `/api/public/documents/download/${doc.id}`;
      });

      console.log(`Found ${documents.length} featured documents`);

      res.json({
        success: true,
        message: "Featured documents retrieved successfully",
        data: documents,
        query_info: {
          limit_requested: limit,
          limit_used: limitNum,
          total_found: documents.length,
        },
      });
    } catch (error) {
      console.error("Error fetching featured documents:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve featured documents",
        error: "Internal server error",
        debug: error.message,
      });
    }
  }
);

// GET /api/public/documents/recent - Get recent documents (FIXED VERSION)
router.get(
  "/recent",
  [query("limit").optional().isInt({ min: 1, max: 20 })],
  async (req, res) => {
    try {
      console.log("=== PUBLIC RECENT DOCUMENTS REQUEST ===");
      console.log("Query params:", req.query);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: errors.array(),
        });
      }

      // Check if table exists
      const documentsTableExists = await tableExists("public_documents");
      if (!documentsTableExists) {
        return res.status(404).json({
          success: false,
          message: "Documents system not initialized",
          data: [],
          note: "public_documents table not found",
        });
      }

      // ✅ FINAL FIX: Use string concatenation for LIMIT to avoid parameter binding issues
      const { limit = 10 } = req.query;
      const limitNum = Math.min(20, Math.max(1, parseInt(limit) || 10));

      console.log("Using limit:", limitNum, "Type:", typeof limitNum);

      // ✅ SOLUTION: Build query with LIMIT directly in string (safe because we validate limitNum)
      const query = `
        SELECT 
          pd.id,
          pd.title,
          pd.description,
          pd.category,
          pd.original_filename,
          pd.file_size,
          pd.file_type,
          pd.upload_date,
          pd.download_count,
          pd.tags
        FROM public_documents pd
        WHERE pd.is_active = 1 
          AND pd.approved_by IS NOT NULL
          AND (pd.published_date IS NULL OR pd.published_date <= CURDATE())
          AND (pd.expiry_date IS NULL OR pd.expiry_date >= CURDATE())
        ORDER BY pd.upload_date DESC, pd.id DESC
        LIMIT ${limitNum}
      `;

      console.log("Executing recent query:", query);

      // ✅ NO PARAMETERS: Execute without parameter binding for LIMIT
      const [documents] = await pool.execute(query);

      // Add computed fields
      documents.forEach((doc) => {
        doc.file_size_formatted = formatFileSize(doc.file_size);
        doc.download_url = `/api/public/documents/download/${doc.id}`;
        doc.days_since_upload = Math.floor(
          (new Date() - new Date(doc.upload_date)) / (1000 * 60 * 60 * 24)
        );
      });

      console.log(`Found ${documents.length} recent documents`);

      res.json({
        success: true,
        message: "Recent documents retrieved successfully",
        data: documents,
        query_info: {
          limit_requested: limit,
          limit_used: limitNum,
          total_found: documents.length,
        },
      });
    } catch (error) {
      console.error("Error fetching recent documents:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve recent documents",
        error: "Internal server error",
        debug: error.message,
      });
    }
  }
);

// ============================================================================
// DOWNLOAD ROUTES - Public Access with Logging
// ============================================================================

// GET /api/public/documents/download/:id - Public download with logging
router.get(
  "/download/:id",
  rateLimitDownload,
  [
    param("id")
      .isInt({ min: 1 })
      .withMessage("Document ID must be a positive integer"),
  ],
  async (req, res) => {
    const connection = await pool.getConnection();

    try {
      console.log("=== PUBLIC DOWNLOAD REQUEST ===");
      const { id } = req.params;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get("User-Agent") || "";
      const referrer = req.get("Referrer") || req.get("Referer") || "";

      console.log(`Download request - Document ID: ${id}, IP: ${clientIP}`);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid document ID",
          errors: errors.array(),
        });
      }

      await connection.beginTransaction();

      // Get document info with security checks
      const [documents] = await connection.execute(
        `
      SELECT 
        pd.id, 
        pd.title, 
        pd.original_filename, 
        pd.file_path, 
        pd.file_type, 
        pd.file_size,
        pd.requires_login,
        pd.download_count
      FROM public_documents pd
      WHERE pd.id = ? 
        AND pd.is_active = 1 
        AND pd.approved_by IS NOT NULL
        AND (pd.published_date IS NULL OR pd.published_date <= CURDATE())
        AND (pd.expiry_date IS NULL OR pd.expiry_date >= CURDATE())
    `,
        [parseInt(id)]
      );

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found or not available for public download",
        });
      }

      const document = documents[0];

      // Check if login is required (future enhancement)
      if (document.requires_login) {
        return res.status(403).json({
          success: false,
          message: "This document requires authentication to download",
        });
      }

      // Check if file exists on filesystem
      const filePath = path.join(__dirname, "../../..", document.file_path);
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return res.status(404).json({
          success: false,
          message: "File not found on server",
        });
      }

      // Check if download logs table exists before logging
      const downloadLogsExists = await tableExists("document_download_logs");

      if (downloadLogsExists) {
        // Log the download
        await connection.execute(
          `
        INSERT INTO document_download_logs (document_id, ip_address, user_agent, referrer)
        VALUES (?, ?, ?, ?)
      `,
          [parseInt(id), clientIP, userAgent, referrer]
        );
      }

      // Update download count
      await connection.execute(
        `
      UPDATE public_documents 
      SET download_count = download_count + 1, last_downloaded_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
        [parseInt(id)]
      );

      await connection.commit();

      console.log(`Download initiated - ${document.title} by ${clientIP}`);

      // Set appropriate headers for download
      res.setHeader("Content-Type", document.file_type);
      res.setHeader("Content-Length", document.file_size);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(
          document.original_filename
        )}"`
      );
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day
      res.setHeader("Last-Modified", new Date().toUTCString());

      // Stream the file
      const fileStream = fs.createReadStream(filePath);

      fileStream.on("error", (error) => {
        console.error("File stream error:", error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: "Error reading file",
          });
        }
      });

      fileStream.pipe(res);
    } catch (error) {
      await connection.rollback();
      console.error("Error in public download:", error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Failed to download document",
          error: "Internal server error",
        });
      }
    } finally {
      connection.release();
    }
  }
);

// GET /api/public/documents/info/:id - Get document info without downloading
router.get(
  "/info/:id",
  [
    param("id")
      .isInt({ min: 1 })
      .withMessage("Document ID must be a positive integer"),
  ],
  async (req, res) => {
    try {
      console.log("=== PUBLIC DOCUMENT INFO REQUEST ===");
      const { id } = req.params;
      console.log("Document ID:", id);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid document ID",
          errors: errors.array(),
        });
      }

      // Get document info
      const [documents] = await pool.execute(
        `
      SELECT 
        pd.id,
        pd.title,
        pd.description,
        pd.category,
        pd.original_filename,
        pd.file_size,
        pd.file_type,
        pd.file_extension,
        pd.upload_date,
        pd.published_date,
        pd.download_count,
        pd.is_featured,
        pd.requires_login,
        pd.tags,
        pd.keywords
      FROM public_documents pd
      WHERE pd.id = ? 
        AND pd.is_active = 1 
        AND pd.approved_by IS NOT NULL
        AND (pd.published_date IS NULL OR pd.published_date <= CURDATE())
        AND (pd.expiry_date IS NULL OR pd.expiry_date >= CURDATE())
    `,
        [parseInt(id)]
      );

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found or not available",
        });
      }

      const document = documents[0];

      // Add computed fields
      document.file_size_formatted = formatFileSize(document.file_size);
      document.download_url = `/api/public/documents/download/${document.id}`;
      document.days_since_upload = Math.floor(
        (new Date() - new Date(document.upload_date)) / (1000 * 60 * 60 * 24)
      );

      console.log("Document info retrieved successfully");

      res.json({
        success: true,
        message: "Document information retrieved successfully",
        data: document,
      });
    } catch (error) {
      console.error("Error fetching document info:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve document information",
        error: "Internal server error",
        debug: error.message,
      });
    }
  }
);

// ============================================================================
// STATISTICS ROUTES - Public Analytics
// ============================================================================

// GET /api/public/documents/stats - Public document statistics
router.get("/stats", async (req, res) => {
  try {
    console.log("=== PUBLIC DOCUMENT STATS REQUEST ===");

    const documentsTableExists = await tableExists("public_documents");
    if (!documentsTableExists) {
      return res.status(404).json({
        success: false,
        message: "Documents system not initialized",
        data: {
          overview: { total_documents: 0, total_downloads: 0 },
          by_category: [],
          popular_documents: [],
        },
        note: "public_documents table not found",
      });
    }

    // Get overall statistics
    const [overallStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_documents,
        SUM(download_count) as total_downloads,
        COUNT(CASE WHEN is_featured = 1 THEN 1 END) as featured_documents,
        AVG(file_size) as avg_file_size,
        COUNT(DISTINCT category) as total_categories
      FROM public_documents
      WHERE is_active = 1 
        AND approved_by IS NOT NULL
        AND (published_date IS NULL OR published_date <= CURDATE())
        AND (expiry_date IS NULL OR expiry_date >= CURDATE())
    `);

    // Get category statistics (simplified)
    const [categoryStats] = await pool.execute(`
      SELECT 
        pd.category,
        pd.category as category_name,
        COUNT(*) as document_count,
        SUM(pd.download_count) as total_downloads
      FROM public_documents pd
      WHERE pd.is_active = 1 
        AND pd.approved_by IS NOT NULL
        AND (pd.published_date IS NULL OR pd.published_date <= CURDATE())
        AND (pd.expiry_date IS NULL OR pd.expiry_date >= CURDATE())
      GROUP BY pd.category
      ORDER BY document_count DESC
    `);

    // Get popular documents
    const [popularDocs] = await pool.execute(`
      SELECT 
        id,
        title,
        category,
        download_count,
        file_size,
        upload_date
      FROM public_documents
      WHERE is_active = 1 
        AND approved_by IS NOT NULL
        AND (published_date IS NULL OR published_date <= CURDATE())
        AND (expiry_date IS NULL OR expiry_date >= CURDATE())
      ORDER BY download_count DESC
      LIMIT 5
    `);

    // Add formatted fields
    popularDocs.forEach((doc) => {
      doc.file_size_formatted = formatFileSize(doc.file_size);
      doc.download_url = `/api/public/documents/download/${doc.id}`;
    });

    const stats = {
      overview: {
        ...overallStats[0],
        avg_file_size_formatted: formatFileSize(
          overallStats[0].avg_file_size || 0
        ),
      },
      by_category: categoryStats,
      popular_documents: popularDocs,
      last_updated: new Date().toISOString(),
    };

    console.log("Document statistics retrieved successfully");

    res.json({
      success: true,
      message: "Document statistics retrieved successfully",
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching document statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve document statistics",
      error: "Internal server error",
      debug: error.message,
    });
  }
});

module.exports = router;
