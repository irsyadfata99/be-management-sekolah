// ============================================================================
// ADMIN ALUMNI ROUTES - Fixed Version
// File: src/routes/admin/alumni.js
// ============================================================================

const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();

// Import dependencies
let pool, authenticateToken;
try {
  const database = require("../../config/database");
  pool = database.pool;
  const auth = require("../../middleware/auth");
  authenticateToken = auth.authenticateToken;
} catch (error) {
  console.warn("Dependencies not available:", error.message);
}

// Apply authentication to all admin routes
router.use(authenticateToken);

// Validation rules untuk ALUMNI (bukan testimoni)
const validateAlumni = [
  body("nama_lengkap")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Nama lengkap required (2-255 chars)"),
  body("tahun_lulus")
    .isInt({ min: 1990, max: new Date().getFullYear() + 5 })
    .withMessage("Valid graduation year required"),
  body("pekerjaan_sekarang")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Current job required (2-255 chars)"),
  body("deskripsi")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Deskripsi minimum 10 characters"),
];

// GET /api/admin/alumni - List all alumni
router.get("/", async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: true,
        message: "Mock data (database not connected)",
        data: [],
      });
    }

    // Simple query tanpa parameter binding yang rumit
    const [alumni] = await pool.execute(
      "SELECT * FROM alumni ORDER BY created_at DESC LIMIT 50"
    );

    res.json({
      success: true,
      message: "Alumni retrieved successfully",
      data: alumni,
    });
  } catch (error) {
    console.error("Error fetching alumni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alumni",
      error: error.message,
    });
  }
});

// POST /api/admin/alumni - Create new alumni
router.post("/", validateAlumni, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    if (!pool) {
      return res.status(201).json({
        success: true,
        message: "Alumni created (mock)",
        data: { id: Math.floor(Math.random() * 1000) },
      });
    }

    const { nama_lengkap, tahun_lulus, pekerjaan_sekarang, deskripsi } =
      req.body;

    const [result] = await pool.execute(
      "INSERT INTO alumni (nama_lengkap, tahun_lulus, pekerjaan_sekarang, deskripsi) VALUES (?, ?, ?, ?)",
      [nama_lengkap, parseInt(tahun_lulus), pekerjaan_sekarang, deskripsi]
    );

    res.status(201).json({
      success: true,
      message: "Alumni created successfully",
      data: {
        id: result.insertId,
        nama_lengkap,
        tahun_lulus: parseInt(tahun_lulus),
        pekerjaan_sekarang,
      },
    });
  } catch (error) {
    console.error("Error creating alumni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create alumni",
      error: error.message,
    });
  }
});

// GET /api/admin/alumni/:id - Get single alumni
router.get("/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: true,
        data: {
          id: req.params.id,
          nama_lengkap: "Mock Alumni",
          tahun_lulus: 2020,
          pekerjaan_sekarang: "Software Developer",
        },
      });
    }

    const [alumni] = await pool.execute("SELECT * FROM alumni WHERE id = ?", [
      req.params.id,
    ]);

    if (alumni.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Alumni not found",
      });
    }

    res.json({
      success: true,
      message: "Alumni retrieved successfully",
      data: alumni[0],
    });
  } catch (error) {
    console.error("Error fetching alumni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch alumni",
      error: error.message,
    });
  }
});

// PUT /api/admin/alumni/:id - Update alumni
router.put("/:id", validateAlumni, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        errors: errors.array(),
      });
    }

    if (!pool) {
      return res.json({
        success: true,
        message: "Alumni updated (mock)",
      });
    }

    const { id } = req.params;
    const { nama_lengkap, tahun_lulus, pekerjaan_sekarang, deskripsi } =
      req.body;

    // Check if record exists first
    const [existing] = await pool.execute(
      "SELECT id FROM alumni WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Alumni with ID ${id} not found`,
      });
    }

    // Update the record - HANYA field yang diperlukan
    const [result] = await pool.execute(
      "UPDATE alumni SET nama_lengkap = ?, tahun_lulus = ?, pekerjaan_sekarang = ?, deskripsi = ? WHERE id = ?",
      [nama_lengkap, parseInt(tahun_lulus), pekerjaan_sekarang, deskripsi, id]
    );

    // Check if update actually happened
    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "No rows were updated",
      });
    }

    res.json({
      success: true,
      message: "Alumni updated successfully",
      affected_rows: result.affectedRows,
    });
  } catch (error) {
    console.error("Error updating alumni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update alumni", // Fixed message (bukan testimoni)
      error: error.message,
    });
  }
});

// DELETE /api/admin/alumni/:id - Delete alumni
router.delete("/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: true,
        message: "Alumni deleted (mock)",
      });
    }

    await pool.execute("DELETE FROM alumni WHERE id = ?", [req.params.id]);

    res.json({
      success: true,
      message: "Alumni deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting alumni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete alumni",
      error: error.message,
    });
  }
});

module.exports = router;
