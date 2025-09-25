// src/routes/admin/spmb.js
const express = require("express");
const router = express.Router();
const { pool } = require("../../config/database"); // ✅ Fixed: destructure pool
const path = require("path");
const fs = require("fs").promises;
const archiver = require("archiver");
const { authenticateToken, requireAdmin } = require("../../middleware/auth");
const PDFService = require("../../services/pdfService");

// Initialize PDFService
const pdfService = new PDFService();

// Get all SPMB registrations with pagination and filters
router.get("/registrations", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = "WHERE 1=1";
    const params = [];

    if (search) {
      whereClause += " AND (p.no_pendaftaran LIKE ? OR p.nama_lengkap LIKE ? OR p.nisn LIKE ?)";
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (status) {
      whereClause += " AND p.status_pendaftaran = ?";
      params.push(status);
    }

    // Get total count
    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM pendaftar_spmb p ${whereClause}`, params);
    const total = countResult[0].total;

    // Get paginated data - same structure as pdfService.js
    const query = `
      SELECT 
        p.*,
        j.nama_jurusan,
        po.nama_pembayaran
      FROM pendaftar_spmb p
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id
      LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
      ${whereClause}
      ORDER BY p.tanggal_daftar DESC
      LIMIT ? OFFSET ?
    `;

    const [registrations] = await pool.query(query, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: registrations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching registrations:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pendaftaran",
      error: error.message,
    });
  }
});

// Get single registration detail
router.get("/registrations/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [registrations] = await pool.query(
      `SELECT 
        p.*,
        j.nama_jurusan,
        j.kode_jurusan,
        po.nama_pembayaran,
        po.total_pembayaran
      FROM pendaftar_spmb p
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id
      LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
      WHERE p.id = ?`,
      [id]
    );

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pendaftaran tidak ditemukan",
      });
    }

    // Get documents
    const [documents] = await pool.query("SELECT * FROM spmb_documents WHERE registration_id = ?", [id]);

    res.json({
      success: true,
      data: {
        ...registrations[0],
        documents,
      },
    });
  } catch (error) {
    console.error("Error fetching registration detail:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail pendaftaran",
      error: error.message,
    });
  }
});

// Update registration status
router.put("/registrations/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status_pendaftaran, catatan_admin } = req.body;

    // Validate status
    const validStatuses = ["pending", "diterima", "ditolak"];
    if (!validStatuses.includes(status_pendaftaran)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid",
      });
    }

    await pool.query(
      `UPDATE pendaftar_spmb 
       SET status_pendaftaran = ?, 
           catatan_admin = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [status_pendaftaran, catatan_admin || null, id]
    );

    res.json({
      success: true,
      message: "Status berhasil diupdate",
    });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({
      success: false,
      message: "Gagal update status",
      error: error.message,
    });
  }
});

// Delete registration
router.delete("/registrations/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if registration exists
    const [registrations] = await pool.query("SELECT * FROM pendaftar_spmb WHERE id = ?", [id]);

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pendaftaran tidak ditemukan",
      });
    }

    // Get documents to delete files
    const [documents] = await pool.query("SELECT file_path FROM spmb_documents WHERE registration_id = ?", [id]);

    // Delete physical files
    for (const doc of documents) {
      try {
        const filePath = path.join(__dirname, "../../../", doc.file_path);
        await fs.unlink(filePath);
      } catch (err) {
        console.error(`Error deleting file: ${doc.file_path}`, err);
      }
    }

    // Delete PDF if exists
    const registration = registrations[0];
    if (registration.bukti_pdf_path) {
      try {
        const pdfPath = pdfService.getPDFAbsolutePath(registration.bukti_pdf_path);
        await fs.unlink(pdfPath);
      } catch (err) {
        console.error("Error deleting PDF:", err);
      }
    }

    // Delete from database (cascade will handle documents)
    await pool.query("DELETE FROM pendaftar_spmb WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Pendaftaran berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting registration:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pendaftaran",
      error: error.message,
    });
  }
});

// Download all documents as ZIP
router.get("/download-package/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [registrations] = await pool.query("SELECT * FROM pendaftar_spmb WHERE id = ?", [id]);

    if (registrations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pendaftaran tidak ditemukan",
      });
    }

    const registration = registrations[0];

    // Setup ZIP
    const archive = archiver("zip", { zlib: { level: 9 } });
    const zipFilename = `SPMB-${registration.no_pendaftaran}-Dokumen.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    archive.pipe(res);

    // Add PDF formulir
    if (registration.bukti_pdf_path) {
      try {
        const pdfPath = pdfService.getPDFAbsolutePath(registration.bukti_pdf_path);
        const exists = await pdfService.pdfFileExists(registration.bukti_pdf_path);

        if (exists) {
          const pdfBuffer = await fs.readFile(pdfPath);
          archive.append(pdfBuffer, { name: "01-Formulir-Pendaftaran.pdf" });
          console.log(`✅ PDF formulir added: ${registration.bukti_pdf_path}`);
        }
      } catch (err) {
        console.error("❌ Error adding PDF:", err.message);
      }
    }

    // Add uploaded documents from columns
    const documentMapping = {
      kartu_keluarga: { column: "kartu_keluarga", filename: "02-Kartu-Keluarga" },
      akta_kelahiran: { column: "akta_kelahiran", filename: "03-Akta-Kelahiran" },
      ijazah: { column: "ijazah", filename: "04-Ijazah" },
      pas_foto: { column: "pas_foto", filename: "05-Pas-Foto" },
      surat_keterangan_lulus: { column: "surat_keterangan_lulus", filename: "06-Surat-Keterangan-Lulus" },
      bukti_pembayaran: { column: "bukti_pembayaran", filename: "07-Bukti-Pembayaran" },
    };

    for (const [key, config] of Object.entries(documentMapping)) {
      const filePath = registration[config.column];

      if (filePath) {
        try {
          const fullPath = path.join(__dirname, "../../../uploads/spmb", filePath);
          await fs.access(fullPath);

          const ext = path.extname(filePath);
          const fileName = `${config.filename}${ext}`;

          archive.file(fullPath, { name: fileName });
          console.log(`✅ Added: ${fileName}`);
        } catch (err) {
          console.error(`❌ File not found: ${config.column} - ${filePath}`);
        }
      }
    }

    // Finalize ZIP
    await archive.finalize();
    console.log(`✅ ZIP created successfully: ${zipFilename}`);
  } catch (error) {
    console.error("❌ Error creating ZIP:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Gagal membuat paket dokumen",
        error: error.message,
      });
    }
  }
});

// Dashboard statistics
router.get("/statistics", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total registrations
    const [totalResult] = await pool.query("SELECT COUNT(*) as total FROM pendaftar_spmb");

    // By status
    const [statusResult] = await pool.query(
      `SELECT 
        status_pendaftaran, 
        COUNT(*) as count 
       FROM pendaftar_spmb 
       GROUP BY status_pendaftaran`
    );

    // By jurusan
    const [jurusanResult] = await pool.query(
      `SELECT 
        j.nama_jurusan,
        COUNT(p.id) as count
       FROM pendaftar_spmb p
       LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id
       GROUP BY j.id, j.nama_jurusan
       ORDER BY count DESC`
    );

    // Recent registrations
    const [recentResult] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM pendaftar_spmb 
       WHERE tanggal_daftar >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );

    res.json({
      success: true,
      data: {
        total: totalResult[0].total,
        byStatus: statusResult,
        byJurusan: jurusanResult,
        recentWeek: recentResult[0].count,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil statistik",
      error: error.message,
    });
  }
});

module.exports = router;
