const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database");
const { authenticateToken } = require("../../middleware/auth");
const path = require("path");
const fs = require("fs");

// Middleware untuk semua routes admin
router.use(authenticateToken);

// GET /api/admin/spmb/pendaftar - List semua pendaftar
router.get("/pendaftar", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      program,
      search,
      sort = "tanggal_daftar",
      order = "desc",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereConditions = [];
    let queryParams = [];

    // Filter by status
    if (status && status !== "all") {
      whereConditions.push("p.status_pendaftaran = ?");
      queryParams.push(status);
    }

    // Filter by program
    if (program) {
      whereConditions.push(
        "(p.pilihan_program_1 = ? OR p.pilihan_program_2 = ?)"
      );
      queryParams.push(program, program);
    }

    // Search by name or no_pendaftaran
    if (search) {
      whereConditions.push(
        "(p.nama_lengkap LIKE ? OR p.no_pendaftaran LIKE ?)"
      );
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    // Get total count
    const countQuery = `
            SELECT COUNT(*) as total 
            FROM pendaftar_spmb p 
            ${whereClause}
        `;
    const [countResult] = await pool.execute(countQuery, queryParams);
    const totalItems = countResult[0].total;

    // Get paginated data
    const dataQuery = `
            SELECT 
                p.*,
                pk1.nama_program as program_1_nama,
                pk2.nama_program as program_2_nama
            FROM pendaftar_spmb p
            LEFT JOIN program_keahlian pk1 ON p.pilihan_program_1 = pk1.id
            LEFT JOIN program_keahlian pk2 ON p.pilihan_program_2 = pk2.id
            ${whereClause}
            ORDER BY p.${sort} ${order.toUpperCase()}
            LIMIT ? OFFSET ?
        `;

    queryParams.push(parseInt(limit), offset);
    const [rows] = await pool.execute(dataQuery, queryParams);

    res.json({
      success: true,
      message: "Data pendaftar retrieved successfully",
      data: {
        items: rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_items: totalItems,
          total_pages: Math.ceil(totalItems / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get pendaftar error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// GET /api/admin/spmb/pendaftar/:id - Detail pendaftar
router.get("/pendaftar/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `
            SELECT 
                p.*,
                pk1.nama_program as program_1_nama,
                pk2.nama_program as program_2_nama
            FROM pendaftar_spmb p
            LEFT JOIN program_keahlian pk1 ON p.pilihan_program_1 = pk1.id
            LEFT JOIN program_keahlian pk2 ON p.pilihan_program_2 = pk2.id
            WHERE p.id = ?
        `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pendaftar tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Detail pendaftar retrieved successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Get pendaftar detail error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// PUT /api/admin/spmb/pendaftar/:id/status - Update status pendaftar
router.put("/pendaftar/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status_pendaftaran, catatan_admin } = req.body;

    if (!["pending", "diterima", "ditolak"].includes(status_pendaftaran)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    const [result] = await pool.execute(
      `UPDATE pendaftar_spmb 
             SET status_pendaftaran = ?, catatan_admin = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
      [status_pendaftaran, catatan_admin || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Pendaftar tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Status pendaftar berhasil diupdate",
      data: {
        id: parseInt(id),
        status_pendaftaran,
        catatan_admin,
        updated_by: req.user.username,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// GET /api/admin/spmb/download/:id/:type - Download file pendukung
router.get("/download/:id/:type", async (req, res) => {
  try {
    const { id, type } = req.params;

    // Validate file type
    const validTypes = [
      "file_akta_kelahiran",
      "file_kartu_keluarga",
      "file_ijazah",
      "file_skhun",
      "file_foto",
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    // Get file path from database
    const [rows] = await pool.execute(
      `SELECT ${type}, nama_lengkap FROM pendaftar_spmb WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pendaftar tidak ditemukan",
      });
    }

    const filename = rows[0][type];
    const nama_lengkap = rows[0].nama_lengkap;

    if (!filename) {
      return res.status(404).json({
        success: false,
        message: "File tidak ditemukan",
      });
    }

    const filePath = path.join(__dirname, "../../../uploads/spmb", filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File fisik tidak ditemukan",
      });
    }

    // Set appropriate headers
    const cleanType = type.replace("file_", "").replace("_", " ");
    const downloadFilename = `${nama_lengkap} - ${cleanType}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadFilename}"`
    );

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error("Download file error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// DELETE /api/admin/spmb/pendaftar/:id - Delete pendaftar
router.delete("/pendaftar/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get file paths before deletion
    const [fileRows] = await pool.execute(
      "SELECT file_akta_kelahiran, file_kartu_keluarga, file_ijazah, file_skhun, file_foto FROM pendaftar_spmb WHERE id = ?",
      [id]
    );

    if (fileRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pendaftar tidak ditemukan",
      });
    }

    // Delete from database
    const [result] = await pool.execute(
      "DELETE FROM pendaftar_spmb WHERE id = ?",
      [id]
    );

    // Delete associated files
    const files = fileRows[0];
    Object.values(files).forEach((filename) => {
      if (filename) {
        const filePath = path.join(
          __dirname,
          "../../../uploads/spmb",
          filename
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    res.json({
      success: true,
      message: "Pendaftar berhasil dihapus",
      data: {
        deleted_id: parseInt(id),
        deleted_by: req.user.username,
        deleted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Delete pendaftar error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// GET /api/admin/spmb/statistics - Dashboard statistics
router.get("/statistics", async (req, res) => {
  try {
    // Total pendaftar
    const [totalRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM pendaftar_spmb"
    );

    // By status
    const [statusRows] = await pool.execute(`
            SELECT status_pendaftaran, COUNT(*) as count 
            FROM pendaftar_spmb 
            GROUP BY status_pendaftaran
        `);

    // By program
    const [programRows] = await pool.execute(`
            SELECT pk.nama_program, COUNT(p.id) as count
            FROM program_keahlian pk
            LEFT JOIN pendaftar_spmb p ON pk.id = p.pilihan_program_1
            GROUP BY pk.id, pk.nama_program
            ORDER BY count DESC
        `);

    // Recent registrations (last 7 days)
    const [recentRows] = await pool.execute(`
            SELECT DATE(tanggal_daftar) as tanggal, COUNT(*) as count
            FROM pendaftar_spmb 
            WHERE tanggal_daftar >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
            GROUP BY DATE(tanggal_daftar)
            ORDER BY tanggal DESC
        `);

    res.json({
      success: true,
      message: "Statistics retrieved successfully",
      data: {
        total_pendaftar: totalRows[0].total,
        by_status: statusRows,
        by_program: programRows,
        recent_registrations: recentRows,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
