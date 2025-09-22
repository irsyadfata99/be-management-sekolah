// ============================================================================
// PUBLIC TESTIMONI ROUTES - Simple Pattern (Copy dari public/articles.js)
// File: src/routes/public/testimoni.js
// ============================================================================

const express = require("express");
const router = express.Router();

// Import database
let pool;
try {
  const database = require("../../config/database");
  pool = database.pool;
} catch (error) {
  console.warn("Database not available:", error.message);
}

// Mock data for fallback
const mockTestimoni = [
  {
    id: 1,
    nama_pemberi: "Budi Santoso",
    status: "Alumni",
    deskripsi:
      "Sekolah ini sangat bagus untuk masa depan karir saya di bidang teknologi.",
    foto_path: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    nama_pemberi: "Sari Dewi",
    status: "Orang Tua Siswa",
    deskripsi: "Saya puas dengan pendidikan yang diberikan kepada anak saya.",
    foto_path: null,
    created_at: new Date().toISOString(),
  },
];

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

// GET /api/public/testimoni - Get testimoni for frontend display
router.get("/", async (req, res) => {
  try {
    const { limit = 5, search } = req.query;

    // Fallback to mock data if database not available
    if (!pool) {
      let data = [...mockTestimoni];
      if (search) {
        data = data.filter(
          (item) =>
            item.nama_pemberi.toLowerCase().includes(search.toLowerCase()) ||
            item.deskripsi.toLowerCase().includes(search.toLowerCase())
        );
      }
      data = data.slice(0, parseInt(limit));

      return res.json({
        success: true,
        message: "Testimoni retrieved (mock data)",
        data,
      });
    }

    // Build query
    let query =
      "SELECT id, nama_pemberi, status, deskripsi, foto_path, created_at FROM testimoni WHERE is_active = 1";
    let params = [];

    if (search) {
      query += " AND (nama_pemberi LIKE ? OR deskripsi LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY display_order ASC, created_at DESC LIMIT ?";
    params.push(parseInt(limit));

    const [testimoni] = await pool.execute(query, params);

    res.json({
      success: true,
      message: "Testimoni retrieved successfully",
      data: testimoni,
    });
  } catch (error) {
    console.error("Error fetching public testimoni:", error);

    // Return mock data as fallback
    res.json({
      success: true,
      message: "Testimoni retrieved (fallback)",
      data: mockTestimoni.slice(0, parseInt(req.query.limit || 5)),
    });
  }
});

// GET /api/public/testimoni/featured - Get featured testimoni
router.get("/featured", async (req, res) => {
  try {
    const { limit = 3 } = req.query;

    if (!pool) {
      return res.json({
        success: true,
        message: "Featured testimoni (mock)",
        data: mockTestimoni.slice(0, parseInt(limit)),
      });
    }

    const [testimoni] = await pool.execute(
      "SELECT id, nama_pemberi, status, deskripsi, foto_path FROM testimoni WHERE is_active = 1 ORDER BY display_order ASC LIMIT ?",
      [parseInt(limit)]
    );

    res.json({
      success: true,
      message: "Featured testimoni retrieved",
      data: testimoni,
    });
  } catch (error) {
    console.error("Error fetching featured testimoni:", error);
    res.json({
      success: true,
      message: "Featured testimoni (fallback)",
      data: mockTestimoni.slice(0, parseInt(req.query.limit || 3)),
    });
  }
});

// GET /api/public/testimoni/status-options - Get available status options
router.get("/status-options", (req, res) => {
  res.json({
    success: true,
    message: "Status options retrieved",
    data: [
      "Alumni",
      "Siswa Aktif",
      "Orang Tua Siswa",
      "Guru/Staff",
      "Industri Partner",
    ],
  });
});

module.exports = router;
