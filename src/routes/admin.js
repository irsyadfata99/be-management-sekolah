// NEW FILE: src/routes/admin.js
// Simple Admin Management for Single-Tenant School Template

const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "school_template_secret"
    );
    const [rows] = await pool.execute(
      "SELECT * FROM admin_users WHERE id = ? AND is_active = TRUE",
      [decoded.userId]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token." });
    }

    req.admin = rows[0];
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: "Invalid token." });
  }
};

// File upload for logos
const logoUpload = multer({
  dest: "uploads/logos/",
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});

// =============================================================================
// AUTHENTICATION
// =============================================================================

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const [rows] = await pool.execute(
      "SELECT * FROM admin_users WHERE username = ? AND is_active = TRUE",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const admin = rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    await pool.execute(
      "UPDATE admin_users SET last_login = NOW() WHERE id = ?",
      [admin.id]
    );

    const token = jwt.sign(
      { userId: admin.id, role: admin.role },
      process.env.JWT_SECRET || "school_template_secret",
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          full_name: admin.full_name,
          role: admin.role,
          permissions: {
            can_manage_students: admin.can_manage_students,
            can_manage_settings: admin.can_manage_settings,
            can_export_data: admin.can_export_data,
            can_manage_admins: admin.can_manage_admins,
          },
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// GET /api/admin/profile
router.get("/profile", authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.admin.id,
      username: req.admin.username,
      email: req.admin.email,
      full_name: req.admin.full_name,
      role: req.admin.role,
      last_login: req.admin.last_login,
      permissions: {
        can_manage_students: req.admin.can_manage_students,
        can_manage_settings: req.admin.can_manage_settings,
        can_export_data: req.admin.can_export_data,
        can_manage_admins: req.admin.can_manage_admins,
      },
    },
  });
});

// =============================================================================
// SCHOOL CONFIGURATION
// =============================================================================

// GET /api/admin/school-info
// FIXED: PUT /api/admin/school-info endpoint

router.put(
  "/school-info",
  authMiddleware,
  logoUpload.single("logo"),
  async (req, res) => {
    try {
      console.log("=== UPDATE SCHOOL INFO DEBUG ===");
      console.log("Request body:", req.body);
      console.log("Uploaded file:", req.file);

      if (!req.admin.can_manage_settings) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Settings management permission required.",
        });
      }

      // Start with request body
      let updateData = { ...req.body };

      // Add file if uploaded
      if (req.file) {
        updateData.school_logo = req.file.filename;
      }

      console.log("Update data before filtering:", updateData);

      // Filter out empty, null, or undefined values
      const filteredData = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && value !== null && value !== "") {
          filteredData[key] = value;
        }
      }

      console.log("Filtered update data:", filteredData);

      // Check if there's anything to update
      if (Object.keys(filteredData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid data provided for update",
        });
      }

      // Build dynamic update query
      const fields = Object.keys(filteredData)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = Object.values(filteredData);

      console.log("SQL fields:", fields);
      console.log("SQL values:", values);

      const updateQuery = `UPDATE school_info SET ${fields} WHERE id = 1`;
      console.log("Final query:", updateQuery);

      const [result] = await pool.execute(updateQuery, values);

      console.log("Update result:", result);

      // Check if any rows were affected
      if (result.affectedRows === 0) {
        // Try to insert if no rows exist
        console.log("No rows affected, trying to insert...");

        const insertFields = Object.keys(filteredData).join(", ");
        const insertPlaceholders = Object.keys(filteredData)
          .map(() => "?")
          .join(", ");
        const insertQuery = `INSERT INTO school_info (id, ${insertFields}) VALUES (1, ${insertPlaceholders})`;

        console.log("Insert query:", insertQuery);
        await pool.execute(insertQuery, values);
      }

      res.json({
        success: true,
        message: "School information updated successfully",
      });
    } catch (error) {
      console.error("Update school info error:", error);

      // Handle specific MySQL errors
      if (error.code === "ER_NO_SUCH_TABLE") {
        return res.status(500).json({
          success: false,
          message:
            "School info table does not exist. Please run database setup.",
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to update school information",
        error: error.message,
        debug: {
          sql: error.sql,
          sqlMessage: error.sqlMessage,
        },
      });
    }
  }
);

// PUT /api/admin/school-info
router.put(
  "/school-info",
  authMiddleware,
  logoUpload.single("logo"),
  async (req, res) => {
    try {
      if (!req.admin.can_manage_settings) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Settings management permission required.",
        });
      }

      const updateData = req.body;

      if (req.file) {
        updateData.school_logo = req.file.filename;
      }

      // Build dynamic update query
      const fields = Object.keys(updateData)
        .map((key) => `${key} = ?`)
        .join(", ");
      const values = Object.values(updateData);

      const [result] = await pool.execute(
        `UPDATE school_info SET ${fields} WHERE id = 1`,
        values
      );

      res.json({
        success: true,
        message: "School information updated successfully",
      });
    } catch (error) {
      console.error("Update school info error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update school information",
        error: error.message,
      });
    }
  }
);

// =============================================================================
// JURUSAN MANAGEMENT
// =============================================================================

// GET /api/admin/jurusan
router.get("/jurusan", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT j.*, COUNT(p.id) as total_pendaftar
      FROM jurusan j
      LEFT JOIN pendaftar_spmb p ON j.id = p.pilihan_jurusan_id
      GROUP BY j.id
      ORDER BY j.urutan_tampil, j.nama_jurusan
    `);

    res.json({
      success: true,
      message: "Jurusan retrieved successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Get jurusan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve jurusan",
      error: error.message,
    });
  }
});

// POST /api/admin/jurusan
router.post("/jurusan", authMiddleware, async (req, res) => {
  try {
    if (!req.admin.can_manage_settings) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Settings management permission required.",
      });
    }

    const {
      nama_jurusan,
      kode_jurusan,
      deskripsi,
      kuota_siswa,
      jenjang,
      durasi_tahun,
      urutan_tampil,
    } = req.body;

    const [result] = await pool.execute(
      `
      INSERT INTO jurusan (
        nama_jurusan, kode_jurusan, deskripsi, kuota_siswa,
        jenjang, durasi_tahun, urutan_tampil
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        nama_jurusan,
        kode_jurusan,
        deskripsi,
        kuota_siswa || 36,
        jenjang || "SMK",
        durasi_tahun || 3,
        urutan_tampil || 1,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Jurusan created successfully",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Create jurusan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create jurusan",
      error: error.message,
    });
  }
});

// PUT /api/admin/jurusan/:id
router.put("/jurusan/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.admin.can_manage_settings) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Settings management permission required.",
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Build dynamic update query
    const fields = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updateData);
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE jurusan SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Jurusan not found",
      });
    }

    res.json({
      success: true,
      message: "Jurusan updated successfully",
    });
  } catch (error) {
    console.error("Update jurusan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update jurusan",
      error: error.message,
    });
  }
});

// DELETE /api/admin/jurusan/:id
router.delete("/jurusan/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.admin.can_manage_settings) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Settings management permission required.",
      });
    }

    const { id } = req.params;

    // Check if jurusan is being used
    const [usageCheck] = await pool.execute(
      "SELECT COUNT(*) as count FROM pendaftar_spmb WHERE pilihan_jurusan_id = ?",
      [id]
    );

    if (usageCheck[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete jurusan. It has students registered.",
      });
    }

    const [result] = await pool.execute("DELETE FROM jurusan WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Jurusan not found",
      });
    }

    res.json({
      success: true,
      message: "Jurusan deleted successfully",
    });
  } catch (error) {
    console.error("Delete jurusan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete jurusan",
      error: error.message,
    });
  }
});

// =============================================================================
// PAYMENT OPTIONS MANAGEMENT
// =============================================================================

// GET /api/admin/payment-options
router.get("/payment-options", authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT po.*, COUNT(p.id) as total_pendaftar
      FROM payment_options po
      LEFT JOIN pendaftar_spmb p ON po.id = p.pilihan_pembayaran_id
      GROUP BY po.id
      ORDER BY po.urutan_tampil, po.nama_pembayaran
    `);

    res.json({
      success: true,
      message: "Payment options retrieved successfully",
      data: rows,
    });
  } catch (error) {
    console.error("Get payment options error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve payment options",
      error: error.message,
    });
  }
});

// POST /api/admin/payment-options
router.post("/payment-options", authMiddleware, async (req, res) => {
  try {
    if (!req.admin.can_manage_settings) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Settings management permission required.",
      });
    }

    const {
      nama_pembayaran,
      jumlah_pembayaran,
      uang_pendaftaran,
      total_pembayaran,
      description,
      payment_terms,
      is_recommended,
      urutan_tampil,
    } = req.body;

    const [result] = await pool.execute(
      `
      INSERT INTO payment_options (
        nama_pembayaran, jumlah_pembayaran, uang_pendaftaran, total_pembayaran,
        description, payment_terms, is_recommended, urutan_tampil
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        nama_pembayaran,
        jumlah_pembayaran || 0,
        uang_pendaftaran || 0,
        total_pembayaran,
        description,
        payment_terms,
        is_recommended || false,
        urutan_tampil || 1,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Payment option created successfully",
      data: { id: result.insertId },
    });
  } catch (error) {
    console.error("Create payment option error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment option",
      error: error.message,
    });
  }
});

// PUT /api/admin/payment-options/:id
router.put("/payment-options/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.admin.can_manage_settings) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Settings management permission required.",
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Build dynamic update query
    const fields = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updateData);
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE payment_options SET ${fields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment option not found",
      });
    }

    res.json({
      success: true,
      message: "Payment option updated successfully",
    });
  } catch (error) {
    console.error("Update payment option error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment option",
      error: error.message,
    });
  }
});

// =============================================================================
// STUDENT MANAGEMENT
// =============================================================================

// GET /api/admin/students
// FIXED STUDENTS ENDPOINT - Replace in your admin.js

// GET /api/admin/students
// ALTERNATIVE FIX: Different approach to avoid MySQL2 parameter issue

// GET /api/admin/students - Alternative approach
router.get("/students", authMiddleware, async (req, res) => {
  try {
    console.log("=== STUDENTS ENDPOINT DEBUG (Alternative) ===");

    if (!req.admin.can_manage_students) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student management permission required.",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "";

    console.log("Query params:", { page, limit, search, status });

    // Build WHERE clause
    let whereClause = "WHERE 1=1";
    let params = [];

    if (search && search.trim() !== "") {
      whereClause += ` AND (p.nama_lengkap LIKE ? OR p.no_pendaftaran LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status && status.trim() !== "") {
      whereClause += ` AND p.status_pendaftaran = ?`;
      params.push(status);
    }

    console.log("WHERE clause:", whereClause);
    console.log("Params:", params);

    // Try approach 1: String interpolation for LIMIT/OFFSET (safe since we control the values)
    const offset = (page - 1) * limit;

    // Get total count first
    const countQuery = `SELECT COUNT(*) as total FROM pendaftar_spmb p ${whereClause}`;
    const [countResult] = await pool.execute(countQuery, params);
    const totalRecords = countResult[0].total;

    console.log("Total records found:", totalRecords);

    // Build data query with string interpolation for LIMIT/OFFSET
    const dataQuery = `
      SELECT 
        p.id,
        p.no_pendaftaran,
        p.pin_login,
        p.nisn,
        p.nama_lengkap,
        p.nomor_whatsapp_aktif,
        p.tempat_lahir,
        p.tanggal_lahir,
        p.jenis_kelamin,
        p.agama,
        p.asal_sekolah,
        p.tahun_lulus,
        p.nama_orang_tua,
        p.nomor_whatsapp_ortu,
        p.status_pendaftaran,
        p.tanggal_daftar,
        p.catatan_admin,
        j.nama_jurusan,
        po.nama_pembayaran,
        po.total_pembayaran
      FROM pendaftar_spmb p
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id
      LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
      ${whereClause}
      ORDER BY p.tanggal_daftar DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    console.log("Data query:", dataQuery);
    console.log("Using same params as count query:", params);

    const [rows] = await pool.execute(dataQuery, params);
    console.log("Query executed successfully, rows found:", rows.length);

    res.json({
      success: true,
      message: "Students retrieved successfully",
      data: {
        students: rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(totalRecords / limit),
          total_records: totalRecords,
          per_page: limit,
          has_next: page < Math.ceil(totalRecords / limit),
          has_prev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("❌ Get students error:", error);

    // If still failing, try the most basic query without parameters
    try {
      console.log("Trying fallback query without parameters...");

      const fallbackQuery = `
        SELECT 
          p.id,
          p.no_pendaftaran,
          p.nama_lengkap,
          p.status_pendaftaran,
          j.nama_jurusan,
          po.nama_pembayaran
        FROM pendaftar_spmb p
        LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id
        LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
        ORDER BY p.tanggal_daftar DESC
        LIMIT 20
      `;

      const [fallbackRows] = await pool.execute(fallbackQuery, []);

      return res.json({
        success: true,
        message: "Students retrieved successfully (fallback mode)",
        data: {
          students: fallbackRows,
          pagination: {
            current_page: 1,
            total_pages: 1,
            total_records: fallbackRows.length,
            per_page: 20,
          },
        },
      });
    } catch (fallbackError) {
      console.error("❌ Even fallback query failed:", fallbackError);

      res.status(500).json({
        success: false,
        message: "Failed to retrieve students",
        error: error.message,
        fallback_error: fallbackError.message,
      });
    }
  }
});

// PUT /api/admin/students/:id/status
router.put("/students/:id/status", authMiddleware, async (req, res) => {
  try {
    if (!req.admin.can_manage_students) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Student management permission required.",
      });
    }

    const { id } = req.params;
    const { status_pendaftaran, catatan_admin } = req.body;

    const [result] = await pool.execute(
      `
      UPDATE pendaftar_spmb 
      SET status_pendaftaran = ?, catatan_admin = ?, updated_at = NOW()
      WHERE id = ?
    `,
      [status_pendaftaran, catatan_admin, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      message: "Student status updated successfully",
    });
  } catch (error) {
    console.error("Update student status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update student status",
      error: error.message,
    });
  }
});

// =============================================================================
// DASHBOARD STATISTICS
// =============================================================================

// GET /api/admin/dashboard-stats
router.get("/dashboard-stats", authMiddleware, async (req, res) => {
  try {
    // Total students
    const [totalStudents] = await pool.execute(
      "SELECT COUNT(*) as count FROM pendaftar_spmb"
    );

    // Students by status
    const [statusStats] = await pool.execute(`
      SELECT status_pendaftaran, COUNT(*) as count
      FROM pendaftar_spmb
      GROUP BY status_pendaftaran
    `);

    // Students by jurusan
    const [jurusanStats] = await pool.execute(`
      SELECT j.nama_jurusan, COUNT(p.id) as count
      FROM jurusan j
      LEFT JOIN pendaftar_spmb p ON j.id = p.pilihan_jurusan_id
      GROUP BY j.id
      ORDER BY count DESC
    `);

    // Recent registrations (last 7 days)
    const [recentStats] = await pool.execute(`
      SELECT DATE(tanggal_daftar) as date, COUNT(*) as count
      FROM pendaftar_spmb
      WHERE tanggal_daftar >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(tanggal_daftar)
      ORDER BY date
    `);

    res.json({
      success: true,
      message: "Dashboard statistics retrieved successfully",
      data: {
        total_students: totalStudents[0].count,
        status_breakdown: statusStats,
        jurusan_breakdown: jurusanStats,
        recent_registrations: recentStats,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard statistics",
      error: error.message,
    });
  }
});

module.exports = router;
