// ============================================================================
// ADMIN TESTIMONI ROUTES - Simple Pattern (Copy dari artikel.js)
// File: src/routes/admin/testimoni.js
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

// Validation rules
const validateTestimoni = [
  body("nama_pemberi")
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Nama pemberi required (2-255 chars)"),
  body("status").notEmpty().withMessage("Status required"),
  body("deskripsi")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Deskripsi minimum 10 characters"),
];

// ============================================================================
// ADMIN CRUD ENDPOINTS
// ============================================================================

// GET /api/admin/testimoni - List all testimoni
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
    const [testimoni] = await pool.execute(
      "SELECT * FROM testimoni ORDER BY created_at DESC LIMIT 50"
    );

    res.json({
      success: true,
      message: "Testimoni retrieved successfully",
      data: testimoni,
    });
  } catch (error) {
    console.error("Error fetching testimoni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch testimoni",
      error: error.message,
    });
  }
});

// POST /api/admin/testimoni - Create new testimoni
router.post("/", validateTestimoni, async (req, res) => {
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
        message: "Testimoni created (mock)",
        data: { id: Math.floor(Math.random() * 1000) },
      });
    }

    const {
      nama_pemberi,
      status,
      deskripsi,
      is_active = true,
      display_order = 1,
    } = req.body;

    const [result] = await pool.execute(
      "INSERT INTO testimoni (nama_pemberi, status, deskripsi, is_active, display_order) VALUES (?, ?, ?, ?, ?)",
      [nama_pemberi, status, deskripsi, is_active, display_order]
    );

    res.status(201).json({
      success: true,
      message: "Testimoni created successfully",
      data: {
        id: result.insertId,
        nama_pemberi,
        status,
      },
    });
  } catch (error) {
    console.error("Error creating testimoni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create testimoni",
      error: error.message,
    });
  }
});

// GET /api/admin/testimoni/:id - Get single testimoni
router.get("/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: true,
        data: {
          id: req.params.id,
          nama_pemberi: "Mock User",
          status: "Alumni",
        },
      });
    }

    const [testimoni] = await pool.execute(
      "SELECT * FROM testimoni WHERE id = ?",
      [req.params.id]
    );

    if (testimoni.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Testimoni not found",
      });
    }

    res.json({
      success: true,
      message: "Testimoni retrieved successfully",
      data: testimoni[0],
    });
  } catch (error) {
    console.error("Error fetching testimoni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch testimoni",
      error: error.message,
    });
  }
});

// PUT /api/admin/testimoni/:id - Update testimoni
router.put("/:id", validateTestimoni, async (req, res) => {
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
        message: "Testimoni updated (mock)",
      });
    }

    const { nama_pemberi, status, deskripsi } = req.body;

    // Only update fields that are provided
    await pool.execute(
      "UPDATE testimoni SET nama_pemberi = ?, status = ?, deskripsi = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [nama_pemberi, status, deskripsi, req.params.id]
    );

    res.json({
      success: true,
      message: "Testimoni updated successfully",
    });
  } catch (error) {
    console.error("Error updating testimoni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update testimoni",
      error: error.message,
    });
  }
});

// DELETE /api/admin/testimoni/:id - Delete testimoni
router.delete("/:id", async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: true,
        message: "Testimoni deleted (mock)",
      });
    }

    await pool.execute("DELETE FROM testimoni WHERE id = ?", [req.params.id]);

    res.json({
      success: true,
      message: "Testimoni deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting testimoni:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete testimoni",
      error: error.message,
    });
  }
});

module.exports = router;
