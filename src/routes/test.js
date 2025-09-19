const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");

// Create test student
router.post("/student", async (req, res) => {
  try {
    const {
      nama_lengkap = "Test Student",
      jenis_kelamin = "L",
      tempat_lahir = "Jakarta",
      tanggal_lahir = "2005-01-01",
    } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO pendaftar_spmb 
            (no_pendaftaran, pin_login, nama_lengkap, nik, jenis_kelamin, tempat_lahir, tanggal_lahir, 
             agama, alamat_lengkap, desa_kelurahan, kecamatan, kabupaten_kota, provinsi, no_hp, 
             anak_ke, jumlah_saudara, nama_ayah, nik_ayah, pekerjaan_ayah, nama_ibu, nik_ibu, pekerjaan_ibu,
             sekolah_asal, pilihan_program_1) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `TEST${Date.now()}`,
        Math.floor(100000 + Math.random() * 900000).toString(),
        nama_lengkap,
        `${Date.now()}${Math.floor(Math.random() * 1000)}`.substring(0, 16),
        jenis_kelamin,
        tempat_lahir,
        tanggal_lahir,
        "Islam",
        "Alamat Test",
        "Kelurahan Test",
        "Kecamatan Test",
        "Jakarta",
        "DKI Jakarta",
        "08123456789",
        1,
        2,
        "Nama Ayah Test",
        "1234567890123456",
        "Pegawai",
        "Nama Ibu Test",
        "1234567890123457",
        "Ibu Rumah Tangga",
        "SMP Test",
        1,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Test student created successfully",
      data: {
        id: result.insertId,
        nama_lengkap,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating test student:", error);
    res.status(500).json({
      success: false,
      message: "Error creating test student",
      error: error.message,
    });
  }
});

// Get all test students
router.get("/students", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, no_pendaftaran, nama_lengkap, jenis_kelamin, 
                    tempat_lahir, tanggal_lahir, status_pendaftaran, created_at
             FROM pendaftar_spmb 
             WHERE no_pendaftaran LIKE 'TEST%'
             ORDER BY created_at DESC 
             LIMIT 10`
    );

    res.json({
      success: true,
      message: "Test students retrieved successfully",
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching test students:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching test students",
      error: error.message,
    });
  }
});

// Get single test student
router.get("/student/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM pendaftar_spmb WHERE id = ? AND no_pendaftaran LIKE "TEST%"',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Test student not found",
      });
    }

    res.json({
      success: true,
      message: "Test student retrieved successfully",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching test student:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching test student",
      error: error.message,
    });
  }
});

// Update test student
router.put("/student/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nama_lengkap,
      tempat_lahir,
      status_pendaftaran = "pending",
    } = req.body;

    const [result] = await pool.execute(
      `UPDATE pendaftar_spmb 
             SET nama_lengkap = ?, tempat_lahir = ?, status_pendaftaran = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND no_pendaftaran LIKE 'TEST%'`,
      [nama_lengkap, tempat_lahir, status_pendaftaran, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Test student not found or no changes made",
      });
    }

    res.json({
      success: true,
      message: "Test student updated successfully",
      data: {
        id: parseInt(id),
        nama_lengkap,
        tempat_lahir,
        status_pendaftaran,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating test student:", error);
    res.status(500).json({
      success: false,
      message: "Error updating test student",
      error: error.message,
    });
  }
});

// Delete test student
router.delete("/student/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM pendaftar_spmb WHERE id = ? AND no_pendaftaran LIKE "TEST%"',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Test student not found",
      });
    }

    res.json({
      success: true,
      message: "Test student deleted successfully",
      data: {
        deleted_id: parseInt(id),
        deleted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error deleting test student:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting test student",
      error: error.message,
    });
  }
});

// Clean up all test data
router.delete("/cleanup", async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM pendaftar_spmb WHERE no_pendaftaran LIKE "TEST%"'
    );

    res.json({
      success: true,
      message: "Test data cleaned up successfully",
      data: {
        deleted_count: result.affectedRows,
        cleaned_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error cleaning up test data:", error);
    res.status(500).json({
      success: false,
      message: "Error cleaning up test data",
      error: error.message,
    });
  }
});

module.exports = router;
