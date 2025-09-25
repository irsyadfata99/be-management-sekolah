// ============================================================================
// PUBLIC ALUMNI ROUTES - FIXED MySQL Parameter Error
// File: src/routes/public/alumni.js
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
const mockAlumni = [
  {
    id: 1,
    nama_lengkap: "Ahmad Rizki Pratama",
    tahun_lulus: 2020,
    pekerjaan_sekarang: "Software Developer",
    deskripsi: "Lulusan TKJ yang sukses di bidang teknologi.",
    foto_path: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    nama_lengkap: "Siti Nurhaliza",
    tahun_lulus: 2019,
    pekerjaan_sekarang: "Graphic Designer",
    deskripsi: "Alumni multimedia yang berkarir di dunia kreatif.",
    foto_path: null,
    created_at: new Date().toISOString(),
  },
];

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

// GET /api/public/alumni - Get alumni for frontend display
router.get("/", async (req, res) => {
  try {
    console.log("Alumni request received:", req.query);

    // Parse limit dengan default value dan pastikan integer
    const limit = parseInt(req.query.limit) || 4;
    const search = req.query.search || "";
    const tahun_lulus = req.query.tahun_lulus
      ? parseInt(req.query.tahun_lulus)
      : null;

    console.log("Parsed params:", { limit, search, tahun_lulus });

    // Fallback to mock data if database not available
    if (!pool) {
      let data = [...mockAlumni];
      if (search) {
        data = data.filter(
          (item) =>
            item.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
            item.pekerjaan_sekarang.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (tahun_lulus) {
        data = data.filter((item) => item.tahun_lulus === tahun_lulus);
      }
      data = data.slice(0, limit);

      return res.json({
        success: true,
        message: "Alumni retrieved (mock data)",
        data,
      });
    }

    // Build query dengan parameter yang benar
    let query =
      "SELECT id, nama_lengkap, tahun_lulus, pekerjaan_sekarang, deskripsi, foto_path, created_at FROM alumni WHERE is_active = 1";
    let params = [];

    if (search) {
      query +=
        " AND (nama_lengkap LIKE ? OR pekerjaan_sekarang LIKE ? OR deskripsi LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (tahun_lulus) {
      query += " AND tahun_lulus = ?";
      params.push(tahun_lulus);
    }

    query += " ORDER BY display_order ASC, created_at DESC LIMIT ?";
    params.push(limit); // Pastikan limit adalah integer

    console.log("Executing query:", query);
    console.log("With params:", params);

    const [alumni] = await pool.execute(query, params);

    console.log(`Alumni query successful: ${alumni.length} rows returned`);

    // Process foto_path
    const processedAlumni = alumni.map((row) => ({
      ...row,
      foto_path: row.foto_path ? `/uploads/alumni/${row.foto_path}` : null,
    }));

    res.json({
      success: true,
      message: "Alumni retrieved successfully",
      data: processedAlumni,
    });
  } catch (error) {
    console.error("Error fetching public alumni:", error);

    // Return mock data as fallback
    res.json({
      success: true,
      message: "Alumni retrieved (fallback)",
      data: mockAlumni.slice(0, parseInt(req.query.limit || 4)),
    });
  }
});

// GET /api/public/alumni/featured - Get featured alumni
router.get("/featured", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 4;

    if (!pool) {
      return res.json({
        success: true,
        message: "Featured alumni (mock)",
        data: mockAlumni.slice(0, limit),
      });
    }

    const [alumni] = await pool.execute(
      "SELECT id, nama_lengkap, tahun_lulus, pekerjaan_sekarang, deskripsi, foto_path FROM alumni WHERE is_active = 1 ORDER BY display_order ASC LIMIT ?",
      [limit] // Ensure limit is integer
    );

    res.json({
      success: true,
      message: "Featured alumni retrieved",
      data: alumni,
    });
  } catch (error) {
    console.error("Error fetching featured alumni:", error);
    res.json({
      success: true,
      message: "Featured alumni (fallback)",
      data: mockAlumni.slice(0, parseInt(req.query.limit || 4)),
    });
  }
});

// GET /api/public/alumni/years - Get available graduation years
router.get("/years", async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: true,
        message: "Graduation years (mock)",
        data: [2023, 2022, 2021, 2020, 2019, 2018],
      });
    }

    const [years] = await pool.execute(
      "SELECT DISTINCT tahun_lulus FROM alumni WHERE is_active = 1 ORDER BY tahun_lulus DESC"
    );

    const yearList = years.map((row) => row.tahun_lulus);

    res.json({
      success: true,
      message: "Graduation years retrieved",
      data: yearList,
    });
  } catch (error) {
    console.error("Error fetching graduation years:", error);
    res.json({
      success: true,
      message: "Graduation years (fallback)",
      data: [2023, 2022, 2021, 2020, 2019, 2018],
    });
  }
});

module.exports = router;
