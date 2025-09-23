const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const { body, validationResult } = require("express-validator");

// GET /api/admin/calendar - List all events
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, jenis_kegiatan } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM academic_calendar WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND judul_kegiatan LIKE ?";
      params.push(`%${search}%`);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (jenis_kegiatan) {
      query += " AND jenis_kegiatan = ?";
      params.push(jenis_kegiatan);
    }

    query += " ORDER BY tanggal_mulai DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [events] = await pool.execute(query, params);

    // Count total
    let countQuery = "SELECT COUNT(*) as total FROM academic_calendar WHERE 1=1";
    const countParams = [];

    if (search) {
      countQuery += " AND judul_kegiatan LIKE ?";
      countParams.push(`%${search}%`);
    }
    if (status) {
      countQuery += " AND status = ?";
      countParams.push(status);
    }
    if (jenis_kegiatan) {
      countQuery += " AND jenis_kegiatan = ?";
      countParams.push(jenis_kegiatan);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      message: "Calendar events retrieved successfully",
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / limit),
        total_records: total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve calendar events",
      error: error.message,
    });
  }
});

// POST /api/admin/calendar - Create new event
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  [
    body("judul_kegiatan").notEmpty().withMessage("Judul kegiatan harus diisi"),
    body("tanggal_mulai").isDate().withMessage("Tanggal mulai harus valid"),
    body("jenis_kegiatan").isIn(["akademik", "ekstrakurikuler", "ujian", "libur", "acara_khusus"]).withMessage("Jenis kegiatan tidak valid"),
    body("tahun_ajaran").notEmpty().withMessage("Tahun ajaran harus diisi"),
    body("semester").isIn(["1", "2"]).withMessage("Semester harus 1 atau 2"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Data tidak valid",
          errors: errors.array(),
        });
      }

      const { judul_kegiatan, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, jenis_kegiatan, tingkat, status, tahun_ajaran, semester } = req.body;

      const [result] = await pool.execute(
        `INSERT INTO academic_calendar (
          judul_kegiatan, deskripsi, tanggal_mulai, tanggal_selesai,
          waktu_mulai, waktu_selesai, lokasi, jenis_kegiatan, tingkat,
          status, tahun_ajaran, semester, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [judul_kegiatan, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, jenis_kegiatan, tingkat || "sekolah", status || "draft", tahun_ajaran, semester, req.user.id]
      );

      res.json({
        success: true,
        message: "Event berhasil dibuat",
        data: { id: result.insertId },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Gagal membuat event",
        error: error.message,
      });
    }
  }
);

// GET /api/admin/calendar/:id - Get single event
router.get("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [events] = await pool.execute("SELECT * FROM academic_calendar WHERE id = ?", [req.params.id]);

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Event retrieved successfully",
      data: events[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve event",
      error: error.message,
    });
  }
});

// PUT /api/admin/calendar/:id - Update event
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { judul_kegiatan, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, jenis_kegiatan, tingkat, status, tahun_ajaran, semester } = req.body;

    const [result] = await pool.execute(
      `UPDATE academic_calendar SET 
        judul_kegiatan = ?, deskripsi = ?, tanggal_mulai = ?, tanggal_selesai = ?,
        waktu_mulai = ?, waktu_selesai = ?, lokasi = ?, jenis_kegiatan = ?, tingkat = ?,
        status = ?, tahun_ajaran = ?, semester = ?
      WHERE id = ?`,
      [judul_kegiatan, deskripsi, tanggal_mulai, tanggal_selesai, waktu_mulai, waktu_selesai, lokasi, jenis_kegiatan, tingkat, status, tahun_ajaran, semester, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Event berhasil diupdate",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate event",
      error: error.message,
    });
  }
});

// DELETE /api/admin/calendar/:id - Delete event
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute("DELETE FROM academic_calendar WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Event berhasil dihapus",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus event",
      error: error.message,
    });
  }
});

module.exports = router;
