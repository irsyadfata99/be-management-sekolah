// ============================================================================
// ADMIN DOCUMENTS ROUTES - Complete CRUD Implementation (FIXED VERSION)
// File: src/routes/admin/documents.js
// ============================================================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { body, query, param, validationResult } = require("express-validator");
const { pool } = require("../../config/database");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

// Configure storage for public documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/public-docs";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`Created directory: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
    const filename = `doc-${uniqueSuffix}-${safeName}`;

    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  },
});

// File validation
const fileFilter = (req, file, cb) => {
  console.log(`File upload validation:`, {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
  });

  // Allowed file types
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];

  const allowedExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|jpg|jpeg|png)$/i;

  if (
    allowedTypes.includes(file.mimetype) &&
    allowedExtensions.test(file.originalname)
  ) {
    console.log("File type validation passed");
    return cb(null, true);
  } else {
    console.log("File type validation failed");
    cb(
      new Error(
        `Only document files are allowed (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG). Received: ${file.mimetype}`
      )
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.PUBLIC_DOCS_MAX_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1, // Only one file at a time
  },
  fileFilter: fileFilter,
});

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Apply authentication to all routes
router.use(authenticateToken);

// Apply admin permission to modification routes
const adminPermission = requireAdmin;

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

// Get category statistics
async function getCategoryStats() {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        pd.category,
        dc.category_name,
        COUNT(*) as total_count,
        COUNT(CASE WHEN pd.is_active = 1 THEN 1 END) as active_count,
        SUM(pd.download_count) as total_downloads
      FROM public_documents pd
      LEFT JOIN document_categories dc ON pd.category = dc.category_slug
      GROUP BY pd.category, dc.category_name
      ORDER BY total_count DESC
    `);
    return stats;
  } catch (error) {
    console.error("Error getting category stats:", error);
    return [];
  }
}

// Get status statistics
async function getStatusStats() {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_documents,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_documents,
        COUNT(CASE WHEN approved_by IS NOT NULL THEN 1 END) as approved_documents,
        COUNT(CASE WHEN approved_by IS NULL THEN 1 END) as pending_documents,
        SUM(download_count) as total_downloads,
        AVG(file_size) as avg_file_size
      FROM public_documents
    `);
    return stats[0];
  } catch (error) {
    console.error("Error getting status stats:", error);
    return {};
  }
}

// ============================================================================
// GET ROUTES - Retrieve Documents
// ============================================================================

// GET /api/admin/documents - List all documents with filtering
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
    query("status").optional().isIn(["active", "inactive", "all"]),
    query("approved").optional().isIn(["true", "false", "pending"]),
    query("search").optional().isString().trim(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sort_by")
      .optional()
      .isIn(["title", "upload_date", "download_count", "file_size"]),
    query("sort_order").optional().isIn(["asc", "desc"]),
  ],
  async (req, res) => {
    try {
      console.log("=== GET ADMIN DOCUMENTS REQUEST ===");
      console.log("Query params:", req.query);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid query parameters",
          errors: errors.array(),
        });
      }

      const {
        category,
        status = "all",
        approved = "all",
        search,
        page = 1,
        limit = 20,
        sort_by = "upload_date",
        sort_order = "desc",
      } = req.query;

      // Build WHERE conditions
      const conditions = [];
      const queryParams = [];

      if (category) {
        conditions.push("pd.category = ?");
        queryParams.push(category);
      }

      if (status === "active") {
        conditions.push("pd.is_active = 1");
      } else if (status === "inactive") {
        conditions.push("pd.is_active = 0");
      }

      if (approved === "true") {
        conditions.push("pd.approved_by IS NOT NULL");
      } else if (approved === "false") {
        conditions.push("pd.approved_by IS NULL");
      } else if (approved === "pending") {
        conditions.push("pd.approved_by IS NULL AND pd.is_active = 1");
      }

      if (search && search.trim()) {
        conditions.push(
          "(pd.title LIKE ? OR pd.description LIKE ? OR pd.tags LIKE ? OR pd.keywords LIKE ?)"
        );
        const searchTerm = `%${search.trim()}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Calculate pagination
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Main query - simplified to avoid JOIN issues
      const mainQuery = `
      SELECT 
        pd.*,
        admin.username as uploaded_by_name,
        admin.full_name as uploaded_by_full_name,
        approver.username as approved_by_name,
        approver.full_name as approved_by_full_name
      FROM public_documents pd
      LEFT JOIN admin_users admin ON pd.uploaded_by = admin.id
      LEFT JOIN admin_users approver ON pd.approved_by = approver.id
      ${whereClause}
      ORDER BY pd.${sort_by} ${sort_order.toUpperCase()}, pd.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

      // Count query
      const countQuery = `
      SELECT COUNT(*) as total
      FROM public_documents pd
      ${whereClause}
    `;

      console.log("Executing main query:", mainQuery);
      console.log("With params:", queryParams);

      const [documents] = await pool.execute(mainQuery, queryParams);
      const [countResult] = await pool.execute(countQuery, queryParams);

      const totalRecords = countResult[0].total;
      const totalPages = Math.ceil(totalRecords / limitNum);

      // Add computed fields
      documents.forEach((doc) => {
        doc.file_size_formatted = formatFileSize(doc.file_size);
        doc.download_url = `/api/public/documents/download/${doc.id}`;
        doc.is_approved = doc.approved_by !== null;
        doc.days_since_upload = Math.floor(
          (new Date() - new Date(doc.created_at)) / (1000 * 60 * 60 * 24)
        );
      });

      console.log(`Found ${documents.length} documents`);

      res.json({
        success: true,
        message: "Documents retrieved successfully",
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
          status,
          approved,
          search: search || "",
          sort_by,
          sort_order,
        },
        summary: {
          total_documents: totalRecords,
          by_category: await getCategoryStats(),
          by_status: await getStatusStats(),
        },
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve documents",
        error: error.message,
      });
    }
  }
);

// GET /api/admin/documents/:id - Get single document details
router.get(
  "/:id",
  [
    param("id")
      .isInt({ min: 1 })
      .withMessage("Document ID must be a positive integer"),
  ],
  async (req, res) => {
    try {
      console.log("=== GET SINGLE DOCUMENT REQUEST ===");
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

      const query = `
      SELECT 
        pd.*,
        admin.username as uploaded_by_name,
        admin.full_name as uploaded_by_full_name,
        admin.email as uploaded_by_email,
        approver.username as approved_by_name,
        approver.full_name as approved_by_full_name,
        approver.email as approved_by_email
      FROM public_documents pd
      LEFT JOIN admin_users admin ON pd.uploaded_by = admin.id
      LEFT JOIN admin_users approver ON pd.approved_by = approver.id
      WHERE pd.id = ?
    `;

      const [result] = await pool.execute(query, [id]);

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      const document = result[0];

      // Add computed fields
      document.file_size_formatted = formatFileSize(document.file_size);
      document.download_url = `/api/public/documents/download/${document.id}`;
      document.admin_download_url = `/api/admin/documents/download/${document.id}`;
      document.is_approved = document.approved_by !== null;
      document.days_since_upload = Math.floor(
        (new Date() - new Date(document.created_at)) / (1000 * 60 * 60 * 24)
      );

      // Check if file exists
      document.file_exists = fs.existsSync(
        path.join(__dirname, "../../..", document.file_path)
      );

      console.log("Document details retrieved successfully");

      res.json({
        success: true,
        message: "Document details retrieved successfully",
        data: document,
      });
    } catch (error) {
      console.error("Error fetching document details:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve document details",
        error: error.message,
      });
    }
  }
);

// GET /api/admin/documents/meta/categories - Get all document categories
router.get("/meta/categories", async (req, res) => {
  try {
    // Check if table exists first
    const [tableCheck] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'document_categories'
    `);

    if (tableCheck[0].count === 0) {
      // Return default categories if table doesn't exist
      const defaultCategories = [
        {
          category_name: "Pengumuman",
          category_slug: "pengumuman",
          document_count: 0,
          active_count: 0,
        },
        {
          category_name: "Kurikulum",
          category_slug: "kurikulum",
          document_count: 0,
          active_count: 0,
        },
        {
          category_name: "Akademik",
          category_slug: "akademik",
          document_count: 0,
          active_count: 0,
        },
        {
          category_name: "Administrasi",
          category_slug: "administrasi",
          document_count: 0,
          active_count: 0,
        },
        {
          category_name: "Keuangan",
          category_slug: "keuangan",
          document_count: 0,
          active_count: 0,
        },
        {
          category_name: "Prestasi",
          category_slug: "prestasi",
          document_count: 0,
          active_count: 0,
        },
        {
          category_name: "Lainnya",
          category_slug: "lainnya",
          document_count: 0,
          active_count: 0,
        },
      ];

      return res.json({
        success: true,
        message: "Default document categories retrieved",
        data: defaultCategories,
        note: "document_categories table not found, using defaults",
      });
    }

    const [categories] = await pool.execute(`
      SELECT 
        dc.category_name,
        dc.category_slug,
        dc.description,
        dc.icon,
        dc.color,
        COUNT(pd.id) as document_count,
        COUNT(CASE WHEN pd.is_active = 1 THEN 1 END) as active_count
      FROM document_categories dc
      LEFT JOIN public_documents pd ON dc.category_slug = pd.category
      WHERE dc.is_active = 1
      GROUP BY dc.id, dc.category_name, dc.category_slug, dc.description, dc.icon, dc.color
      ORDER BY dc.display_order, dc.category_name
    `);

    res.json({
      success: true,
      message: "Document categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories",
      error: error.message,
    });
  }
});

// ============================================================================
// POST ROUTES - Create Documents
// ============================================================================

// POST /api/admin/documents - Upload new document
router.post(
  "/",
  adminPermission,
  upload.single("document"),
  [
    body("title")
      .notEmpty()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage("Title must be 3-255 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Description must be less than 2000 characters"),
    body("category")
      .isIn([
        "pengumuman",
        "kurikulum",
        "akademik",
        "administrasi",
        "keuangan",
        "prestasi",
        "lainnya",
      ])
      .withMessage("Invalid category"),
    body("upload_date").optional().isDate().withMessage("Invalid upload date"),
    body("published_date")
      .optional()
      .isDate()
      .withMessage("Invalid published date"),
    body("expiry_date").optional().isDate().withMessage("Invalid expiry date"),
    body("tags")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Tags must be less than 500 characters"),
    body("keywords")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Keywords must be less than 500 characters"),
  ],
  async (req, res) => {
    const connection = await pool.getConnection();

    try {
      console.log("=== CREATE DOCUMENT REQUEST ===");
      console.log("Request body:", req.body);
      console.log("Uploaded file:", req.file);

      await connection.beginTransaction();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Delete uploaded file if validation fails
        if (req.file) {
          const filePath = path.join(
            __dirname,
            "../../../uploads/public-docs",
            req.file.filename
          );
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Deleted uploaded file due to validation errors");
          }
        }

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Document file is required",
        });
      }

      const {
        title,
        description,
        category,
        upload_date,
        published_date,
        expiry_date,
        tags,
        keywords,
        is_featured,
        requires_login,
        auto_approve,
      } = req.body;

      // Fixed: Proper boolean conversion for MySQL
      const featuredBool =
        is_featured === "true" || is_featured === true ? 1 : 0;
      const requiresLoginBool =
        requires_login === "true" || requires_login === true ? 1 : 0;
      const shouldApprove = auto_approve === "true" || auto_approve === true;

      // Process file information
      const fileExtension = path
        .extname(req.file.originalname)
        .toLowerCase()
        .substring(1);
      const filePath = `/uploads/public-docs/${req.file.filename}`;

      // Auto-approve if user has permission
      const approvedBy = shouldApprove ? req.user.id : null;
      const approvedAt = shouldApprove ? new Date() : null;

      const insertQuery = `
        INSERT INTO public_documents (
          title, description, category, original_filename, stored_filename,
          file_path, file_size, file_type, file_extension, upload_date,
          published_date, expiry_date, uploaded_by, approved_by, approved_at,
          tags, keywords, is_featured, requires_login
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(insertQuery, [
        title.trim(),
        description?.trim() || null,
        category,
        req.file.originalname,
        req.file.filename,
        filePath,
        req.file.size,
        req.file.mimetype,
        fileExtension,
        upload_date || new Date().toISOString().split("T")[0],
        published_date || null,
        expiry_date || null,
        req.user.id,
        approvedBy,
        approvedAt,
        tags?.trim() || null,
        keywords?.trim() || null,
        featuredBool,
        requiresLoginBool,
      ]);

      await connection.commit();

      console.log("Document created successfully:", result.insertId);

      res.status(201).json({
        success: true,
        message: "Document uploaded successfully",
        data: {
          id: result.insertId,
          title: title.trim(),
          category,
          filename: req.file.filename,
          file_size: req.file.size,
          file_size_formatted: formatFileSize(req.file.size),
          download_url: `/api/public/documents/download/${result.insertId}`,
          is_approved: shouldApprove,
          uploaded_by: req.user.username,
          created_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      await connection.rollback();

      // Delete uploaded file if database insert fails
      if (req.file) {
        const filePath = path.join(
          __dirname,
          "../../../uploads/public-docs",
          req.file.filename
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("Deleted uploaded file due to database error");
        }
      }

      console.error("Error creating document:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload document",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  }
);

// ============================================================================
// PUT ROUTES - Update Documents
// ============================================================================

// PUT /api/admin/documents/:id - Update document metadata (FIXED VERSION)
router.put(
  "/:id",
  adminPermission,
  [
    param("id")
      .isInt({ min: 1 })
      .withMessage("Document ID must be a positive integer"),
    body("title")
      .optional()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage("Title must be 3-255 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Description must be less than 2000 characters"),
    body("category")
      .optional()
      .isIn([
        "pengumuman",
        "kurikulum",
        "akademik",
        "administrasi",
        "keuangan",
        "prestasi",
        "lainnya",
      ])
      .withMessage("Invalid category"),
    body("upload_date").optional().isDate().withMessage("Invalid upload date"),
    body("published_date")
      .optional()
      .isDate()
      .withMessage("Invalid published date"),
    body("expiry_date").optional().isDate().withMessage("Invalid expiry date"),
    body("tags")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Tags must be less than 500 characters"),
    body("keywords")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Keywords must be less than 500 characters"),
  ],
  async (req, res) => {
    const connection = await pool.getConnection();

    try {
      console.log("=== UPDATE DOCUMENT REQUEST ===");
      console.log("Document ID:", req.params.id);
      console.log("Request body:", req.body);
      console.log("Content-Type:", req.get("Content-Type"));

      await connection.beginTransaction();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { id } = req.params;

      // Check if document exists
      const [existing] = await connection.execute(
        "SELECT * FROM public_documents WHERE id = ?",
        [id]
      );
      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      // Fixed: Handle empty body or missing fields gracefully
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No update data provided",
          received_body: req.body,
        });
      }

      // Build dynamic update query - only for provided fields
      const updateFields = [];
      const updateValues = [];

      // Fixed: Safe field extraction with existence check
      const allowedFields = [
        "title",
        "description",
        "category",
        "upload_date",
        "published_date",
        "expiry_date",
        "tags",
        "keywords",
        "is_featured",
        "requires_login",
        "is_active",
      ];

      allowedFields.forEach((field) => {
        if (
          req.body.hasOwnProperty(field) &&
          req.body[field] !== undefined &&
          req.body[field] !== ""
        ) {
          updateFields.push(`${field} = ?`);

          // Fixed: Handle boolean conversion for MySQL
          if (
            field === "is_featured" ||
            field === "requires_login" ||
            field === "is_active"
          ) {
            updateValues.push(
              req.body[field] === "true" || req.body[field] === true ? 1 : 0
            );
          } else {
            updateValues.push(req.body[field]);
          }

          console.log(`Adding field: ${field} = ${req.body[field]}`);
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update",
          allowed_fields: allowedFields,
          received_fields: Object.keys(req.body),
        });
      }

      // Always update timestamp
      updateFields.push("updated_at = CURRENT_TIMESTAMP");
      updateValues.push(id);

      const updateQuery = `UPDATE public_documents SET ${updateFields.join(
        ", "
      )} WHERE id = ?`;

      console.log("Final update query:", updateQuery);
      console.log("Final update values:", updateValues);

      const [result] = await connection.execute(updateQuery, updateValues);
      console.log("Update result:", result);

      await connection.commit();

      res.json({
        success: true,
        message: "Document updated successfully",
        data: {
          id: parseInt(id),
          updated_fields: updateFields.slice(0, -1), // Remove timestamp field
          affected_rows: result.affectedRows,
          updated_by: req.user.username,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Update document error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update document",
        error: error.message,
        debug_info: {
          body_received: req.body,
          params_received: req.params,
        },
      });
    } finally {
      connection.release();
    }
  }
);

// PUT /api/admin/documents/:id/approve - Approve document (FIXED VERSION)
router.put(
  "/:id/approve",
  adminPermission,
  [
    param("id")
      .isInt({ min: 1 })
      .withMessage("Document ID must be a positive integer"),
  ],
  async (req, res) => {
    try {
      console.log("=== APPROVE DOCUMENT REQUEST ===");
      const { id } = req.params;
      console.log("Document ID:", id);
      console.log("User requesting approval:", req.user.username);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid document ID",
          errors: errors.array(),
        });
      }

      // Fixed: More detailed check with better error messages
      const [existing] = await pool.execute(
        "SELECT id, title, approved_by, approved_at, is_active FROM public_documents WHERE id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      const document = existing[0];
      console.log("Document to approve:", document);

      if (document.approved_by !== null) {
        return res.status(400).json({
          success: false,
          message: "Document is already approved",
          current_status: {
            approved_by: document.approved_by,
            approved_at: document.approved_at,
            is_active: document.is_active,
          },
          suggestion:
            "Use PUT /api/admin/documents/:id to modify document instead",
        });
      }

      // Approve document
      const [result] = await pool.execute(
        "UPDATE public_documents SET approved_by = ?, approved_at = CURRENT_TIMESTAMP, is_active = 1 WHERE id = ?",
        [req.user.id, id]
      );

      console.log("Approval result:", result);

      res.json({
        success: true,
        message: "Document approved successfully",
        data: {
          id: parseInt(id),
          title: document.title,
          approved_by: req.user.username,
          approved_by_id: req.user.id,
          approved_at: new Date().toISOString(),
          affected_rows: result.affectedRows,
        },
      });
    } catch (error) {
      console.error("Error approving document:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve document",
        error: error.message,
      });
    }
  }
);

// ============================================================================
// DELETE ROUTES - Remove Documents
// ============================================================================

// DELETE /api/admin/documents/:id - Delete document
router.delete(
  "/:id",
  adminPermission,
  [
    param("id")
      .isInt({ min: 1 })
      .withMessage("Document ID must be a positive integer"),
    query("permanent")
      .optional()
      .isBoolean()
      .withMessage("permanent must be boolean"),
  ],
  async (req, res) => {
    const connection = await pool.getConnection();

    try {
      console.log("=== DELETE DOCUMENT REQUEST ===");
      const { id } = req.params;
      const { permanent = false } = req.query;

      console.log("Document ID:", id);
      console.log("Permanent delete:", permanent);

      await connection.beginTransaction();

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Invalid parameters",
          errors: errors.array(),
        });
      }

      // Check if document exists
      const [existing] = await connection.execute(
        "SELECT id, title, file_path, is_active FROM public_documents WHERE id = ?",
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      const document = existing[0];

      if (permanent === true || permanent === "true") {
        // Permanent delete - remove file and database record
        console.log("Performing permanent delete...");

        // Delete file from filesystem
        if (document.file_path) {
          const filePath = path.join(__dirname, "../../..", document.file_path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("Deleted file from filesystem");
          }
        }

        // Delete from database (cascade will handle download logs)
        await connection.execute("DELETE FROM public_documents WHERE id = ?", [
          id,
        ]);
      } else {
        // Soft delete - just mark as inactive
        console.log("Performing soft delete...");
        await connection.execute(
          "UPDATE public_documents SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [id]
        );
      }

      await connection.commit();

      console.log("Document deletion completed");

      res.json({
        success: true,
        message: `Document "${document.title}" ${
          permanent ? "permanently deleted" : "deactivated"
        } successfully`,
        data: {
          id: parseInt(id),
          title: document.title,
          action: permanent ? "permanent_delete" : "soft_delete",
          was_active: document.is_active,
          deleted_by: req.user.username,
          deleted_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error deleting document:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete document",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  }
);

// ============================================================================
// DOWNLOAD ROUTES - Admin Access
// ============================================================================

// GET /api/admin/documents/download/:id - Admin download (no logging)
router.get(
  "/download/:id",
  [
    param("id")
      .isInt({ min: 1 })
      .withMessage("Document ID must be a positive integer"),
  ],
  async (req, res) => {
    try {
      console.log("=== ADMIN DOWNLOAD REQUEST ===");
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
      SELECT id, title, original_filename, file_path, file_type, file_size
      FROM public_documents 
      WHERE id = ?
    `,
        [id]
      );

      if (documents.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Document not found",
        });
      }

      const document = documents[0];
      const filePath = path.join(__dirname, "../../..", document.file_path);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: "File not found on server",
        });
      }

      console.log(`Admin downloading: ${document.title}`);

      // Set headers
      res.setHeader("Content-Type", document.file_type);
      res.setHeader("Content-Length", document.file_size);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(
          document.original_filename
        )}"`
      );
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error in admin download:", error);
      res.status(500).json({
        success: false,
        message: "Failed to download document",
        error: error.message,
      });
    }
  }
);

module.exports = router;
