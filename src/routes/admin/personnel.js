// ============================================================================
// TEACHERS & STAFF CRUD IMPLEMENTATION - Complete Backend
// File: src/routes/admin/personnel.js
// ============================================================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../../config/database");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");

// Configure multer for photo upload (3x4 cm professional photos)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/personnel";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "personnel-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, JPG, PNG, WEBP) are allowed"));
    }
  },
});

// ============================================================================
// CREATE - Add New Personnel (Teacher/Staff)
// ============================================================================
router.post("/", authenticateToken, requireAdmin, upload.single("photo"), async (req, res) => {
  const connection = await pool.getConnection();

  try {
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
    } = req.body;

    // Validation
    if (!full_name || !position_category || !position_title) {
      return res.status(400).json({
        success: false,
        message: "Nama lengkap, kategori posisi, dan jabatan wajib diisi",
      });
    }

    // Handle photo upload
    const photo_path = req.file ? `/uploads/personnel/${req.file.filename}` : null;

    const insertQuery = `
      INSERT INTO school_personnel (
        full_name, photo_path, position_category, position_title, department,
        subject_taught, teaching_since_year, hierarchy_level, reports_to,
        display_order, email, phone, education_background, certifications, bio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(insertQuery, [
      full_name,
      photo_path,
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
    ]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Data guru/staff berhasil ditambahkan",
      data: {
        id: result.insertId,
        full_name,
        position_category,
        position_title,
        photo_path,
      },
    });
  } catch (error) {
    await connection.rollback();

    // Delete uploaded file if database insert fails
    if (req.file) {
      const filePath = path.join(__dirname, "../../../uploads/personnel", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    console.error("Error creating personnel:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data guru/staff",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// ============================================================================
// READ - Get All Personnel with Filtering & Grouping
// ============================================================================
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      category, // Filter by position_category
      department, // Filter by department
      hierarchy_level, // Filter by hierarchy level
      group_by, // Group results by: 'category', 'department', 'hierarchy'
      search, // Search by name or position
      active_only = true,
    } = req.query;

    let whereConditions = [];
    let queryParams = [];

    // Base query
    let baseQuery = `
      SELECT 
        p.*,
        superior.full_name as reports_to_name
      FROM school_personnel p
      LEFT JOIN school_personnel superior ON p.reports_to = superior.id
    `;

    // Add filters
    if (active_only === "true") {
      whereConditions.push("p.is_active = ?");
      queryParams.push(true);
    }

    if (category) {
      whereConditions.push("p.position_category = ?");
      queryParams.push(category);
    }

    if (department) {
      whereConditions.push("p.department = ?");
      queryParams.push(department);
    }

    if (hierarchy_level) {
      whereConditions.push("p.hierarchy_level = ?");
      queryParams.push(parseInt(hierarchy_level));
    }

    if (search) {
      whereConditions.push("(p.full_name LIKE ? OR p.position_title LIKE ? OR p.subject_taught LIKE ?)");
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Construct WHERE clause
    if (whereConditions.length > 0) {
      baseQuery += " WHERE " + whereConditions.join(" AND ");
    }

    // Add ordering
    baseQuery += " ORDER BY p.hierarchy_level ASC, p.display_order ASC, p.full_name ASC";

    const [personnel] = await pool.execute(baseQuery, queryParams);

    // Group results if requested
    let result = personnel;
    if (group_by) {
      result = groupPersonnel(personnel, group_by);
    }

    res.json({
      success: true,
      data: result,
      total: personnel.length,
      filters_applied: {
        category: category || "all",
        department: department || "all",
        hierarchy_level: hierarchy_level || "all",
        search: search || "",
        active_only,
      },
    });
  } catch (error) {
    console.error("Error fetching personnel:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data guru/staff",
      error: error.message,
    });
  }
});

// ============================================================================
// READ - Get Single Personnel by ID
// ============================================================================
router.get("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.*,
        superior.full_name as reports_to_name,
        GROUP_CONCAT(subordinate.full_name) as subordinates
      FROM school_personnel p
      LEFT JOIN school_personnel superior ON p.reports_to = superior.id
      LEFT JOIN school_personnel subordinate ON subordinate.reports_to = p.id
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

    // Convert subordinates string to array
    personnel.subordinates = personnel.subordinates ? personnel.subordinates.split(",") : [];

    res.json({
      success: true,
      data: personnel,
    });
  } catch (error) {
    console.error("Error fetching personnel by ID:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data guru/staff",
      error: error.message,
    });
  }
});

// ============================================================================
// UPDATE - Edit Personnel Data
// ============================================================================
router.put("/:id", authenticateToken, requireAdmin, upload.single("photo"), async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { full_name, position_category, position_title, department, subject_taught, teaching_since_year, hierarchy_level, reports_to, display_order, email, phone, education_background, certifications, bio, is_active } = req.body;

    // Check if personnel exists
    const [existing] = await connection.execute("SELECT photo_path FROM school_personnel WHERE id = ?", [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data guru/staff tidak ditemukan",
      });
    }

    const currentPhotoPath = existing[0].photo_path;
    let photo_path = currentPhotoPath;

    // Handle new photo upload
    if (req.file) {
      photo_path = `/uploads/personnel/${req.file.filename}`;

      // Delete old photo if exists
      if (currentPhotoPath) {
        const oldFilePath = path.join(__dirname, "../../..", currentPhotoPath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    const updateQuery = `
      UPDATE school_personnel SET
        full_name = ?, photo_path = ?, position_category = ?, position_title = ?,
        department = ?, subject_taught = ?, teaching_since_year = ?,
        hierarchy_level = ?, reports_to = ?, display_order = ?, email = ?,
        phone = ?, education_background = ?, certifications = ?, bio = ?,
        is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await connection.execute(updateQuery, [
      full_name,
      photo_path,
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
      is_active !== undefined ? is_active : true,
      id,
    ]);

    await connection.commit();

    res.json({
      success: true,
      message: "Data guru/staff berhasil diperbarui",
      data: { id, full_name, position_title, photo_path },
    });
  } catch (error) {
    await connection.rollback();

    // Delete new uploaded file if update fails
    if (req.file) {
      const filePath = path.join(__dirname, "../../../uploads/personnel", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    console.error("Error updating personnel:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data guru/staff",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// ============================================================================
// DELETE - Remove Personnel (Soft Delete)
// ============================================================================
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { permanent = false } = req.query;

    // Check if personnel exists
    const [existing] = await connection.execute("SELECT full_name, photo_path FROM school_personnel WHERE id = ?", [id]);

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data guru/staff tidak ditemukan",
      });
    }

    const personnelName = existing[0].full_name;
    const photoPath = existing[0].photo_path;

    if (permanent === "true") {
      // Permanent delete
      await connection.execute("DELETE FROM school_personnel WHERE id = ?", [id]);

      // Delete photo file
      if (photoPath) {
        const filePath = path.join(__dirname, "../../..", photoPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } else {
      // Soft delete
      await connection.execute("UPDATE school_personnel SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Data guru/staff "${personnelName}" berhasil ${permanent === "true" ? "dihapus permanen" : "dinonaktifkan"}`,
      action: permanent === "true" ? "permanent_delete" : "soft_delete",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting personnel:", error);
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
// SPECIAL ENDPOINTS FOR FRONTEND CATEGORIZATION
// ============================================================================

// Get Leadership (Kepala & Wakil Kepala Sekolah)
router.get("/categories/leadership", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT * FROM school_personnel 
      WHERE position_category = 'leadership' AND is_active = true
      ORDER BY hierarchy_level ASC, display_order ASC
    `;

    const [leadership] = await pool.execute(query);

    res.json({
      success: true,
      data: leadership,
      category: "Leadership Team",
    });
  } catch (error) {
    console.error("Error fetching leadership:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pimpinan sekolah",
    });
  }
});

// Get Teachers by Subject
router.get("/categories/teachers", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT * FROM school_personnel 
      WHERE position_category = 'teacher' AND is_active = true
      ORDER BY subject_taught ASC, full_name ASC
    `;

    const [teachers] = await pool.execute(query);

    // Group by subject
    const groupedBySubject = teachers.reduce((acc, teacher) => {
      const subject = teacher.subject_taught || "Umum";
      if (!acc[subject]) acc[subject] = [];
      acc[subject].push(teacher);
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedBySubject,
      category: "Teachers by Subject",
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data guru",
    });
  }
});

// Get Staff by Department
router.get("/categories/staff", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const query = `
      SELECT * FROM school_personnel 
      WHERE position_category IN ('staff', 'support') AND is_active = true
      ORDER BY department ASC, hierarchy_level ASC, full_name ASC
    `;

    const [staff] = await pool.execute(query);

    // Group by department
    const groupedByDepartment = staff.reduce((acc, member) => {
      const dept = member.department || "Umum";
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(member);
      return acc;
    }, {});

    res.json({
      success: true,
      data: groupedByDepartment,
      category: "Staff by Department",
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data staff",
    });
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

module.exports = router;
