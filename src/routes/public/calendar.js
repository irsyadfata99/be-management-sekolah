const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");

// GET /api/public/calendar/events
router.get("/events", async (req, res) => {
  try {
    const { tahun_ajaran, semester, jenis_kegiatan, bulan, search } = req.query;

    let query = `
      SELECT * FROM academic_calendar 
      WHERE status = 'published'
    `;
    const params = [];

    // Add filters
    if (tahun_ajaran) {
      query += " AND tahun_ajaran = ?";
      params.push(tahun_ajaran);
    }
    if (semester) {
      query += " AND semester = ?";
      params.push(semester);
    }
    if (jenis_kegiatan) {
      query += " AND jenis_kegiatan = ?";
      params.push(jenis_kegiatan);
    }
    if (bulan) {
      query += " AND MONTH(tanggal_mulai) = ?";
      params.push(bulan);
    }
    if (search) {
      query += " AND judul_kegiatan LIKE ?";
      params.push(`%${search}%`);
    }

    query += " ORDER BY tanggal_mulai ASC";

    const [events] = await pool.execute(query, params);

    res.json({
      success: true,
      message: "Academic calendar events retrieved successfully",
      data: events,
      meta: {
        total: events.length,
      },
    });
  } catch (error) {
    console.error("Calendar API Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve calendar events",
      error: error.message,
    });
  }
});

module.exports = router;
