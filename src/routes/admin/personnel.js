// ============================================================================
// ENHANCED TEACHERS & STAFF CRUD IMPLEMENTATION
// File: src/routes/admin/personnel.js
// ============================================================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../../config/database");
const {
  authenticateToken,
  requireAdmin,
  requirePermission,
} = require("../../middleware/auth");

// ============================================================================
// PHOTO UPLOAD CONFIGURATION
// ============================================================================

// Configure multer for professional photos (3x4 cm)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/personnel";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created directory: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = `personnel-${uniqueSuffix}${extension}`;
    console.log(`📷 Generated filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB limit
    files: 1, // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    console.log(`📋 File upload validation:`, {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      console.log("✅ File type validation passed");
      return cb(null, true);
    } else {
      console.log("❌ File type validation failed");
      cb(new Error("Only image files (JPEG, JPG, PNG, WEBP) are allowed"));
    }
  },
});

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Apply authentication to all routes
router.use(authenticateToken);

// Apply personnel management permission to modification routes
const personnelPermission = requirePermission("manage_personnel");

// ============================================================================
// CREATE - Add New Personnel (Teacher/Staff)
// ============================================================================

router.post(
  "/",
  personnelPermission,
  upload.single("photo"),
  async (req, res) => {
    const connection = await pool.getConnection();

    try {
      console.log("=== CREATE PERSONNEL REQUEST ===");
      console.log("Request body:", req.body);
      console.log("Uploaded file:", req.file);

      await connection.beginTransaction();

      const {
        full_name,
        position_category, // 'leadership', 'teacher', 'staff', 'support'
        position_title,
        department,
        subject_taught,
        teaching_since_year,
        hierarchy_level = 5,
        reports_to,
        display_order = 1,
        email,
        phone,
        education_background,
        certifications,
        bio,
        is_active = true,
      } = req.body;

      // Enhanced validation
      const validationErrors = [];

      if (!full_name || full_name.trim().length < 2) {
        validationErrors.push("Nama lengkap minimal 2 karakter");
      }

      if (
        !position_category ||
        !["leadership", "teacher", "staff", "support"].includes(
          position_category
        )
      ) {
        validationErrors.push(
          "Kategori posisi harus dipilih (leadership, teacher, staff, support)"
        );
      }

      if (!position_title || position_title.trim().length < 2) {
        validationErrors.push("Jabatan harus diisi minimal 2 karakter");
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        validationErrors.push("Format email tidak valid");
      }

      if (phone && !/^[\d\s\-\+\(\)]{8,20}$/.test(phone)) {
        validationErrors.push("Format nomor telepon tidak valid");
      }

      if (
        teaching_since_year &&
        (parseInt(teaching_since_year) < 1980 ||
          parseInt(teaching_since_year) > new Date().getFullYear())
      ) {
        validationErrors.push("Tahun mulai mengajar tidak valid");
      }

      if (validationErrors.length > 0) {
        // Delete uploaded file if validation fails
        if (req.file) {
          const filePath = path.join(
            __dirname,
            "../../../uploads/personnel",
            req.file.filename
          );
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log("🗑️ Deleted uploaded file due to validation errors");
          }
        }

        return res.status(400).json({
          success: false,
          message: "Validasi gagal",
          errors: validationErrors,
        });
      }

      // Handle photo upload
      const photo_path = req.file
        ? `/uploads/personnel/${req.file.filename}`
        : null;

      // Check if reports_to exists (if provided)
      if (reports_to) {
        const [supervisorCheck] = await connection.execute(
          "SELECT id FROM school_personnel WHERE id = ? AND is_active = TRUE",
          [reports_to]
        );
        if (supervisorCheck.length === 0) {
          throw new Error(
            "Atasan yang dipilih tidak ditemukan atau tidak aktif"
          );
        }
      }

      const insertQuery = `
      INSERT INTO school_personnel (
        full_name, photo_path, position_category, position_title, department,
        subject_taught, teaching_since_year, hierarchy_level, reports_to,
        display_order, email, phone, education_background, certifications, bio, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      const [result] = await connection.execute(insertQuery, [
        full_name.trim(),
        photo_path,
        position_category,
        position_title.trim(),
        department?.trim() || null,
        subject_taught?.trim() || null,
        teaching_since_year ? parseInt(teaching_since_year) : null,
        parseInt(hierarchy_level),
        reports_to ? parseInt(reports_to) : null,
        parseInt(display_order),
        email?.trim() || null,
        phone?.trim() || null,
        education_background?.trim() || null,
        certifications?.trim() || null,
        bio?.trim() || null,
        is_active,
      ]);

      await connection.commit();

      console.log("✅ Personnel created successfully:", result.insertId);

      res.status(201).json({
        success: true,
        message: "Data guru/staff berhasil ditambahkan",
        data: {
          id: result.insertId,
          full_name: full_name.trim(),
          position_category,
          position_title: position_title.trim(),
          photo_path,
          created_by: req.user.username,
          created_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      await connection.rollback();

      // Delete uploaded file if database insert fails
      if (req.file) {
        const filePath = path.join(
          __dirname,
          "../../../uploads/personnel",
          req.file.filename
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("🗑️ Deleted uploaded file due to database error");
        }
      }

      console.error("❌ Error creating personnel:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menambahkan data guru/staff",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  }
);

// ============================================================================
// READ - Get All Personnel with Enhanced Filtering & Search
// ============================================================================

router.get("/", authenticateToken, async (req, res) => {
  try {
    console.log("=== GET PERSONNEL REQUEST ===");
    console.log("Query params:", req.query);

    const {
      category,
      department,
      hierarchy_level,
      search,
      active_only = "true",
      page = 1,
      limit = 50,
    } = req.query;

    // Simple approach: Build WHERE conditions as strings (avoid parameter issues)
    let whereClause = "";
    const conditions = [];

    // Active filter
    if (active_only === "true") {
      conditions.push("p.is_active = 1");
    } else if (active_only === "false") {
      conditions.push("p.is_active = 0");
    }

    // Category filter
    if (category && category.trim()) {
      conditions.push(`p.position_category = '${category.trim()}'`);
    }

    // Department filter
    if (department && department.trim()) {
      conditions.push(`p.department = '${department.trim()}'`);
    }

    // Hierarchy filter
    if (hierarchy_level && !isNaN(parseInt(hierarchy_level))) {
      conditions.push(`p.hierarchy_level = ${parseInt(hierarchy_level)}`);
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = search.trim().replace(/'/g, "''"); // Escape quotes
      conditions.push(`(
        p.full_name LIKE '%${searchTerm}%' OR 
        p.position_title LIKE '%${searchTerm}%' OR 
        p.subject_taught LIKE '%${searchTerm}%' OR
        p.department LIKE '%${searchTerm}%'
      )`);
    }

    if (conditions.length > 0) {
      whereClause = " WHERE " + conditions.join(" AND ");
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offsetNum = (pageNum - 1) * limitNum;

    // Main query - simple string concatenation (no parameters)
    const mainQuery = `
      SELECT 
        p.id,
        p.full_name,
        p.photo_path,
        p.position_category,
        p.position_title,
        p.department,
        p.subject_taught,
        p.teaching_since_year,
        p.hierarchy_level,
        p.display_order,
        p.email,
        p.phone,
        p.education_background,
        p.certifications,
        p.bio,
        p.is_active,
        p.created_at,
        p.updated_at,
        superior.full_name as reports_to_name,
        superior.position_title as reports_to_title
      FROM school_personnel p
      LEFT JOIN school_personnel superior ON p.reports_to = superior.id
      ${whereClause}
      ORDER BY p.hierarchy_level ASC, p.display_order ASC, p.full_name ASC
      LIMIT ${limitNum} OFFSET ${offsetNum}
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM school_personnel p
      ${whereClause}
    `;

    console.log("Executing main query:", mainQuery);

    // Execute queries (no parameters, simple string queries)
    const [personnel] = await pool.execute(mainQuery);
    const [countResult] = await pool.execute(countQuery);

    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limitNum);

    console.log(
      "✅ Personnel retrieved successfully:",
      personnel.length,
      "records"
    );

    res.json({
      success: true,
      message: "Data guru/staff berhasil diambil",
      data: personnel,
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
        department: department || "all",
        hierarchy_level: hierarchy_level || "all",
        search: search || "",
        active_only,
      },
      summary: {
        total_personnel: totalRecords,
        active_personnel: personnel.filter((p) => p.is_active).length,
        by_category: getCountByCategory(personnel),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching personnel:", error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data guru/staff",
      error: error.message,
      debug:
        process.env.NODE_ENV === "development"
          ? {
              code: error.code,
              sqlMessage: error.sqlMessage,
              stack: error.stack,
            }
          : undefined,
    });
  }
});

// ============================================================================
// READ - Get Single Personnel by ID with Detailed Info
// ============================================================================

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    console.log("=== GET SINGLE PERSONNEL REQUEST ===");
    const { id } = req.params;
    console.log("Personnel ID:", id);

    const query = `
      SELECT 
        p.*,
        superior.full_name as reports_to_name,
        superior.position_title as reports_to_title,
        COUNT(subordinate.id) as subordinates_count,
        GROUP_CONCAT(
          CONCAT(subordinate.full_name, ' (', subordinate.position_title, ')')
          SEPARATOR '; '
        ) as subordinates_list
      FROM school_personnel p
      LEFT JOIN school_personnel superior ON p.reports_to = superior.id
      LEFT JOIN school_personnel subordinate ON subordinate.reports_to = p.id AND subordinate.is_active = TRUE
      WHERE p.id = ?
      GROUP BY p.id
    `;

    const [result] = await pool.execute(query, [id]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data guru/staff tidak ditemukan",
      });
    }

    const personnel = result[0];

    // Process subordinates
    personnel.subordinates = [];
    if (personnel.subordinates_list) {
      personnel.subordinates = personnel.subordinates_list
        .split("; ")
        .map((sub) => {
          const match = sub.match(/^(.+) \((.+)\)$/);
          return match
            ? { name: match[1], position: match[2] }
            : { name: sub, position: "" };
        });
    }
    delete personnel.subordinates_list;

    // Add computed fields
    personnel.years_of_service = personnel.teaching_since_year
      ? new Date().getFullYear() - personnel.teaching_since_year
      : null;

    personnel.photo_url = personnel.photo_path
      ? `${req.protocol}://${req.get("host")}${personnel.photo_path}`
      : null;

    console.log("✅ Personnel details retrieved successfully");

    res.json({
      success: true,
      message: "Detail guru/staff berhasil diambil",
      data: personnel,
    });
  } catch (error) {
    console.error("❌ Error fetching personnel by ID:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail guru/staff",
      error: error.message,
    });
  }
});

// ============================================================================
// UPDATE - Edit Personnel Data with Photo Handling
// ============================================================================

router.put(
  "/:id",
  personnelPermission,
  upload.single("photo"),
  async (req, res) => {
    const connection = await pool.getConnection();

    try {
      console.log("=== UPDATE PERSONNEL REQUEST ===");
      console.log("Personnel ID:", req.params.id);
      console.log("Request body:", req.body);
      console.log("New file:", req.file);

      await connection.beginTransaction();

      const { id } = req.params;
      const {
        full_name,
        position_category,
        position_title,
        department,
        subject_taught,
        teaching_since_year,
        hierarchy_level,
        reports_to,
        display_order,
        email,
        phone,
        education_background,
        certifications,
        bio,
        is_active,
        remove_photo = false,
      } = req.body;

      // Check if personnel exists
      const [existing] = await connection.execute(
        "SELECT photo_path FROM school_personnel WHERE id = ?",
        [id]
      );

      if (existing.length === 0) {
        if (req.file) {
          // Delete uploaded file if personnel not found
          const filePath = path.join(
            __dirname,
            "../../../uploads/personnel",
            req.file.filename
          );
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        return res.status(404).json({
          success: false,
          message: "Data guru/staff tidak ditemukan",
        });
      }

      const currentPhotoPath = existing[0].photo_path;
      let photo_path = currentPhotoPath;

      // Handle photo operations
      if (remove_photo === "true" || remove_photo === true) {
        // Remove existing photo
        if (currentPhotoPath) {
          const oldFilePath = path.join(
            __dirname,
            "../../..",
            currentPhotoPath
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log("🗑️ Removed existing photo");
          }
        }
        photo_path = null;
      } else if (req.file) {
        // Handle new photo upload
        photo_path = `/uploads/personnel/${req.file.filename}`;

        // Delete old photo if exists
        if (currentPhotoPath) {
          const oldFilePath = path.join(
            __dirname,
            "../../..",
            currentPhotoPath
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log("🗑️ Replaced existing photo");
          }
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];

      if (full_name !== undefined) {
        updateFields.push("full_name = ?");
        updateValues.push(full_name.trim());
      }

      if (photo_path !== currentPhotoPath) {
        updateFields.push("photo_path = ?");
        updateValues.push(photo_path);
      }

      if (position_category !== undefined) {
        updateFields.push("position_category = ?");
        updateValues.push(position_category);
      }

      if (position_title !== undefined) {
        updateFields.push("position_title = ?");
        updateValues.push(position_title.trim());
      }

      if (department !== undefined) {
        updateFields.push("department = ?");
        updateValues.push(department?.trim() || null);
      }

      if (subject_taught !== undefined) {
        updateFields.push("subject_taught = ?");
        updateValues.push(subject_taught?.trim() || null);
      }

      if (teaching_since_year !== undefined) {
        updateFields.push("teaching_since_year = ?");
        updateValues.push(
          teaching_since_year ? parseInt(teaching_since_year) : null
        );
      }

      if (hierarchy_level !== undefined) {
        updateFields.push("hierarchy_level = ?");
        updateValues.push(parseInt(hierarchy_level));
      }

      if (reports_to !== undefined) {
        updateFields.push("reports_to = ?");
        updateValues.push(reports_to ? parseInt(reports_to) : null);
      }

      if (display_order !== undefined) {
        updateFields.push("display_order = ?");
        updateValues.push(parseInt(display_order));
      }

      if (email !== undefined) {
        updateFields.push("email = ?");
        updateValues.push(email?.trim() || null);
      }

      if (phone !== undefined) {
        updateFields.push("phone = ?");
        updateValues.push(phone?.trim() || null);
      }

      if (education_background !== undefined) {
        updateFields.push("education_background = ?");
        updateValues.push(education_background?.trim() || null);
      }

      if (certifications !== undefined) {
        updateFields.push("certifications = ?");
        updateValues.push(certifications?.trim() || null);
      }

      if (bio !== undefined) {
        updateFields.push("bio = ?");
        updateValues.push(bio?.trim() || null);
      }

      if (is_active !== undefined) {
        updateFields.push("is_active = ?");
        updateValues.push(is_active);
      }

      // Always update timestamp
      updateFields.push("updated_at = CURRENT_TIMESTAMP");

      if (updateFields.length === 1) {
        // Only timestamp update
        return res.status(400).json({
          success: false,
          message: "Tidak ada data yang diubah",
        });
      }

      updateValues.push(id);

      const updateQuery = `
      UPDATE school_personnel SET ${updateFields.join(", ")} WHERE id = ?
    `;

      console.log("Update query:", updateQuery);
      console.log("Update values:", updateValues);

      await connection.execute(updateQuery, updateValues);
      await connection.commit();

      console.log("✅ Personnel updated successfully");

      res.json({
        success: true,
        message: "Data guru/staff berhasil diperbarui",
        data: {
          id: parseInt(id),
          full_name: full_name?.trim() || "not updated",
          position_title: position_title?.trim() || "not updated",
          photo_path,
          updated_by: req.user.username,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      await connection.rollback();

      // Delete new uploaded file if update fails
      if (req.file) {
        const filePath = path.join(
          __dirname,
          "../../../uploads/personnel",
          req.file.filename
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("🗑️ Deleted uploaded file due to update error");
        }
      }

      console.error("❌ Error updating personnel:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui data guru/staff",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  }
);

// ============================================================================
// DELETE - Remove Personnel (Soft Delete + Hard Delete Options)
// ============================================================================

router.delete("/:id", personnelPermission, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    console.log("=== DELETE PERSONNEL REQUEST ===");
    const { id } = req.params;
    const { permanent = "false", force = "false" } = req.query;

    console.log("Personnel ID:", id);
    console.log("Delete type:", permanent === "true" ? "permanent" : "soft");

    await connection.beginTransaction();

    // Check if personnel exists
    const [existing] = await connection.execute(
      "SELECT full_name, photo_path, is_active FROM school_personnel WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data guru/staff tidak ditemukan",
      });
    }

    const personnelName = existing[0].full_name;
    const photoPath = existing[0].photo_path;
    const isActive = existing[0].is_active;

    // Check for dependencies (subordinates)
    if (permanent === "true" && force !== "true") {
      const [subordinates] = await connection.execute(
        "SELECT COUNT(*) as count FROM school_personnel WHERE reports_to = ? AND is_active = TRUE",
        [id]
      );

      if (subordinates[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: `Tidak dapat menghapus ${personnelName}. Masih ada ${subordinates[0].count} staff yang melapor ke beliau.`,
          suggestion:
            "Pindahkan staff yang melapor terlebih dahulu atau gunakan parameter force=true",
        });
      }
    }

    if (permanent === "true") {
      // Permanent delete
      console.log("Performing permanent delete...");

      // Update subordinates to remove reference
      await connection.execute(
        "UPDATE school_personnel SET reports_to = NULL WHERE reports_to = ?",
        [id]
      );

      // Delete the record
      await connection.execute("DELETE FROM school_personnel WHERE id = ?", [
        id,
      ]);

      // Delete photo file
      if (photoPath) {
        const filePath = path.join(__dirname, "../../..", photoPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("🗑️ Deleted photo file");
        }
      }
    } else {
      // Soft delete
      console.log("Performing soft delete...");
      await connection.execute(
        "UPDATE school_personnel SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );
    }

    await connection.commit();

    console.log("✅ Personnel deletion completed");

    res.json({
      success: true,
      message: `Data guru/staff "${personnelName}" berhasil ${
        permanent === "true" ? "dihapus permanen" : "dinonaktifkan"
      }`,
      data: {
        id: parseInt(id),
        name: personnelName,
        action: permanent === "true" ? "permanent_delete" : "soft_delete",
        was_active: isActive,
        deleted_by: req.user.username,
        deleted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error deleting personnel:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data guru/staff",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// ============================================================================
// SPECIAL ENDPOINTS FOR CATEGORIZED VIEWS
// ============================================================================

// Get Leadership Team (Kepala & Wakil Kepala Sekolah)
router.get("/categories/leadership", authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT p.*, superior.full_name as reports_to_name
      FROM school_personnel p
      LEFT JOIN school_personnel superior ON p.reports_to = superior.id
      WHERE p.position_category = 'leadership' AND p.is_active = TRUE
      ORDER BY p.hierarchy_level ASC, p.display_order ASC
    `;

    const [leadership] = await pool.execute(query);

    res.json({
      success: true,
      message: "Data pimpinan sekolah berhasil diambil",
      data: leadership,
      category: "Leadership Team",
      total: leadership.length,
    });
  } catch (error) {
    console.error("❌ Error fetching leadership:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pimpinan sekolah",
      error: error.message,
    });
  }
});

// Get Teachers by Subject
router.get("/categories/teachers", authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT p.*, superior.full_name as reports_to_name
      FROM school_personnel p
      LEFT JOIN school_personnel superior ON p.reports_to = superior.id
      WHERE p.position_category = 'teacher' AND p.is_active = TRUE
      ORDER BY p.subject_taught ASC, p.full_name ASC
    `;

    const [teachers] = await pool.execute(query);

    // Group by subject
    const groupedBySubject = teachers.reduce((acc, teacher) => {
      const subject = teacher.subject_taught || "Mata Pelajaran Umum";
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(teacher);
      return acc;
    }, {});

    res.json({
      success: true,
      message: "Data guru berhasil diambil",
      data: groupedBySubject,
      category: "Teachers by Subject",
      total_teachers: teachers.length,
      subjects_count: Object.keys(groupedBySubject).length,
    });
  } catch (error) {
    console.error("❌ Error fetching teachers:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data guru",
      error: error.message,
    });
  }
});

// Get Staff by Department
router.get("/categories/staff", authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT p.*, superior.full_name as reports_to_name
      FROM school_personnel p
      LEFT JOIN school_personnel superior ON p.reports_to = superior.id
      WHERE p.position_category IN ('staff', 'support') AND p.is_active = TRUE
      ORDER BY p.department ASC, p.hierarchy_level ASC, p.full_name ASC
    `;

    const [staff] = await pool.execute(query);

    // Group by department
    const groupedByDepartment = staff.reduce((acc, member) => {
      const dept = member.department || "Departemen Umum";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(member);
      return acc;
    }, {});

    res.json({
      success: true,
      message: "Data staff berhasil diambil",
      data: groupedByDepartment,
      category: "Staff by Department",
      total_staff: staff.length,
      departments_count: Object.keys(groupedByDepartment).length,
    });
  } catch (error) {
    console.error("❌ Error fetching staff:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data staff",
      error: error.message,
    });
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Helper functions (pastikan ada)
function groupPersonnel(personnel, groupBy) {
  switch (groupBy) {
    case "category":
      return personnel.reduce((acc, person) => {
        const category = person.position_category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(person);
        return acc;
      }, {});

    case "department":
      return personnel.reduce((acc, person) => {
        const dept = person.department || "Tidak Ada Departemen";
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(person);
        return acc;
      }, {});

    case "hierarchy":
      return personnel.reduce((acc, person) => {
        const level = `Level ${person.hierarchy_level}`;
        if (!acc[level]) acc[level] = [];
        acc[level].push(person);
        return acc;
      }, {});

    default:
      return personnel;
  }
}

function getCountByCategory(personnel) {
  return personnel.reduce((acc, person) => {
    const category = person.position_category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
}

module.exports = router;
