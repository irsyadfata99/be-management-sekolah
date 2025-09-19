// UPDATED: src/routes/spmb.js
// Simple SPMB Registration for Single-Tenant Template
// Added PDF generation functionality and Email notification integration

const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");
const multer = require("multer");
const path = require("path");
const AuthUtils = require("../utils/auth");

// Import Services
const PDFService = require("../services/pdfService");
const EmailService = require("../services/emailService");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/spmb/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Allow images for pas_foto, PDF for other documents
    if (file.fieldname === "pas_foto") {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Pas foto harus berupa file gambar (JPG, PNG)"));
      }
    } else {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Dokumen harus berupa file PDF"));
      }
    }
  },
}).fields([
  { name: "bukti_pembayaran", maxCount: 1 }, // Required
  { name: "ijazah", maxCount: 1 }, // Optional
  { name: "akta_kelahiran", maxCount: 1 }, // Required
  { name: "kartu_keluarga", maxCount: 1 }, // Required
  { name: "pas_foto", maxCount: 1 }, // Required
  { name: "surat_keterangan_lulus", maxCount: 1 }, // Optional
]);

// =============================================================================
// PUBLIC ENDPOINTS (No authentication required)
// =============================================================================

// GET /api/spmb/school-info - Get public school information
router.get("/school-info", async (req, res) => {
  try {
    const [schoolRows] = await pool.execute(
      "SELECT school_name, school_address, school_phone, school_email, school_website, school_logo, primary_color, secondary_color, registration_status, academic_year, contact_person, contact_whatsapp FROM school_info LIMIT 1"
    );

    if (schoolRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "School information not found",
      });
    }

    res.json({
      success: true,
      message: "School information retrieved successfully",
      data: schoolRows[0],
    });
  } catch (error) {
    console.error("Get school info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve school information",
      error: error.message,
    });
  }
});

// GET /api/spmb/form-config - Get form configuration (jurusan + payment options)
router.get("/form-config", async (req, res) => {
  try {
    // Check if registration is open
    const [schoolRows] = await pool.execute(
      "SELECT registration_status, registration_start_date, registration_end_date FROM school_info LIMIT 1"
    );

    if (schoolRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "School configuration not found",
      });
    }

    const school = schoolRows[0];

    // Check registration status
    if (school.registration_status !== "open") {
      return res.status(400).json({
        success: false,
        message:
          school.registration_status === "closed"
            ? "Pendaftaran sudah ditutup"
            : "Sistem sedang dalam maintenance",
      });
    }

    // Check date range
    const now = new Date();
    if (
      school.registration_start_date &&
      new Date(school.registration_start_date) > now
    ) {
      return res.status(400).json({
        success: false,
        message: "Pendaftaran belum dibuka",
      });
    }
    if (
      school.registration_end_date &&
      new Date(school.registration_end_date) < now
    ) {
      return res.status(400).json({
        success: false,
        message: "Periode pendaftaran sudah berakhir",
      });
    }

    // Get active jurusan
    const [jurusanRows] = await pool.execute(
      "SELECT id, nama_jurusan, kode_jurusan, deskripsi, kuota_siswa FROM jurusan WHERE is_active = TRUE ORDER BY urutan_tampil, nama_jurusan"
    );

    // Get active payment options
    const [paymentRows] = await pool.execute(
      "SELECT id, nama_pembayaran, jumlah_pembayaran, uang_pendaftaran, total_pembayaran, description, is_recommended FROM payment_options WHERE is_active = TRUE ORDER BY urutan_tampil"
    );

    res.json({
      success: true,
      message: "Form configuration retrieved successfully",
      data: {
        jurusan: jurusanRows,
        payment_options: paymentRows,
        form_structure: {
          sections: [
            {
              name: "data_pribadi",
              title: "Data Pribadi",
              fields: [
                { name: "nisn", label: "NISN", type: "text", required: false },
                {
                  name: "nama_lengkap",
                  label: "Nama Lengkap",
                  type: "text",
                  required: true,
                },
                {
                  name: "nomor_whatsapp_aktif",
                  label: "Nomor WhatsApp Aktif",
                  type: "tel",
                  required: true,
                },
                {
                  name: "tempat_lahir",
                  label: "Tempat Lahir",
                  type: "text",
                  required: true,
                },
                {
                  name: "tanggal_lahir",
                  label: "Tanggal Lahir",
                  type: "date",
                  required: true,
                },
                {
                  name: "jenis_kelamin",
                  label: "Jenis Kelamin",
                  type: "select",
                  required: true,
                  options: ["Laki-laki", "Perempuan"],
                },
                {
                  name: "golongan_darah",
                  label: "Golongan Darah",
                  type: "select",
                  required: false,
                  options: ["O", "A", "B", "AB", "Tidak Tahu"],
                },
                {
                  name: "agama",
                  label: "Agama",
                  type: "select",
                  required: true,
                  options: [
                    "Islam",
                    "Kristen",
                    "Katolik",
                    "Hindu",
                    "Buddha",
                    "Konghucu",
                  ],
                },
                {
                  name: "status_sekarang",
                  label: "Status Sekarang",
                  type: "select",
                  required: false,
                  options: [
                    "Ikut orang tua",
                    "Kost",
                    "Rumah sendiri",
                    "Ikut saudara",
                  ],
                },
                {
                  name: "alamat_siswa",
                  label: "Alamat Siswa",
                  type: "textarea",
                  required: true,
                },
              ],
            },
            {
              name: "latar_belakang_sekolah",
              title: "Latar Belakang Sekolah",
              fields: [
                {
                  name: "asal_sekolah",
                  label: "Asal Sekolah",
                  type: "text",
                  required: true,
                },
                {
                  name: "alamat_sekolah",
                  label: "Alamat Sekolah",
                  type: "textarea",
                  required: false,
                },
                {
                  name: "tahun_lulus",
                  label: "Tahun Lulus",
                  type: "number",
                  required: true,
                },
              ],
            },
            {
              name: "data_orang_tua",
              title: "Data Orang Tua",
              fields: [
                {
                  name: "nama_orang_tua",
                  label: "Nama Orang Tua/Wali",
                  type: "text",
                  required: true,
                },
                {
                  name: "nomor_whatsapp_ortu",
                  label: "Nomor WhatsApp Orang Tua",
                  type: "tel",
                  required: false,
                },
                {
                  name: "pendidikan_orang_tua",
                  label: "Pendidikan Orang Tua",
                  type: "text",
                  required: false,
                },
                {
                  name: "pekerjaan_orang_tua",
                  label: "Pekerjaan Orang Tua",
                  type: "text",
                  required: true,
                },
                {
                  name: "instansi_orang_tua",
                  label: "Instansi/Perusahaan",
                  type: "text",
                  required: false,
                },
                {
                  name: "penghasilan_orang_tua",
                  label: "Penghasilan Orang Tua",
                  type: "select",
                  required: false,
                  options: [
                    "0 S.D 1.000.000",
                    "1.000.000 S.D 2.000.000",
                    "2.000.000 S.D 5.000.000",
                    "5.000.000 ke atas",
                  ],
                },
                {
                  name: "alamat_orang_tua",
                  label: "Alamat Orang Tua",
                  type: "textarea",
                  required: false,
                },
              ],
            },
            {
              name: "pilihan",
              title: "Pilihan Jurusan & Pembayaran",
              fields: [
                {
                  name: "pilihan_jurusan_id",
                  label: "Pilihan Jurusan",
                  type: "select",
                  required: true,
                  data_source: "jurusan",
                },
                {
                  name: "pilihan_pembayaran_id",
                  label: "Jenis Pembayaran",
                  type: "radio",
                  required: true,
                  data_source: "payment_options",
                },
              ],
            },
            {
              name: "dokumen",
              title: "Upload Dokumen",
              fields: [
                {
                  name: "bukti_pembayaran",
                  label: "Bukti Pembayaran",
                  type: "file",
                  required: true,
                  accept: ".pdf",
                },
                {
                  name: "akta_kelahiran",
                  label: "Akta Kelahiran",
                  type: "file",
                  required: true,
                  accept: ".pdf",
                },
                {
                  name: "kartu_keluarga",
                  label: "Kartu Keluarga",
                  type: "file",
                  required: true,
                  accept: ".pdf",
                },
                {
                  name: "pas_foto",
                  label: "Pas Foto",
                  type: "file",
                  required: true,
                  accept: ".jpg,.jpeg,.png",
                },
                {
                  name: "ijazah",
                  label: "Ijazah/STTB",
                  type: "file",
                  required: false,
                  accept: ".pdf",
                },
                {
                  name: "surat_keterangan_lulus",
                  label: "Surat Keterangan Lulus",
                  type: "file",
                  required: false,
                  accept: ".pdf",
                },
              ],
            },
          ],
        },
      },
    });
  } catch (error) {
    console.error("Get form config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve form configuration",
      error: error.message,
    });
  }
});

// POST /api/spmb/register - Student registration with EMAIL INTEGRATION
router.post("/register", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "File upload error",
        error: err.message,
      });
    }

    try {
      console.log("=== SPMB REGISTRATION ATTEMPT ===");
      console.log("Request body:", req.body);
      console.log("Uploaded files:", req.files);

      // Check if registration is open
      const [schoolRows] = await pool.execute(
        "SELECT registration_status, max_students FROM school_info LIMIT 1"
      );

      if (
        schoolRows.length === 0 ||
        schoolRows[0].registration_status !== "open"
      ) {
        return res.status(400).json({
          success: false,
          message: "Pendaftaran sedang ditutup",
        });
      }

      // Check student limit
      const [countRows] = await pool.execute(
        "SELECT COUNT(*) as count FROM pendaftar_spmb"
      );
      if (countRows[0].count >= schoolRows[0].max_students) {
        return res.status(400).json({
          success: false,
          message: "Kuota pendaftar sudah penuh",
        });
      }

      // Validate required files
      const files = req.files || {};
      const requiredFiles = [
        "bukti_pembayaran",
        "akta_kelahiran",
        "kartu_keluarga",
        "pas_foto",
      ];
      const missingFiles = [];

      requiredFiles.forEach((fieldName) => {
        if (!files[fieldName] || files[fieldName].length === 0) {
          missingFiles.push(fieldName);
        }
      });

      if (missingFiles.length > 0) {
        return res.status(400).json({
          success: false,
          message: "File yang wajib diupload belum lengkap",
          missing_files: missingFiles,
        });
      }

      // Validate required fields
      const requiredFields = [
        "nama_lengkap",
        "nomor_whatsapp_aktif",
        "tempat_lahir",
        "tanggal_lahir",
        "jenis_kelamin",
        "agama",
        "alamat_siswa",
        "asal_sekolah",
        "tahun_lulus",
        "nama_orang_tua",
        "pekerjaan_orang_tua",
        "pilihan_jurusan_id",
        "pilihan_pembayaran_id",
      ];

      const missingFields = [];
      requiredFields.forEach((field) => {
        if (!req.body[field] || req.body[field].toString().trim() === "") {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Data yang wajib diisi belum lengkap",
          missing_fields: missingFields,
        });
      }

      // Validate jurusan and payment option exist
      const [jurusanCheck] = await pool.execute(
        "SELECT id FROM jurusan WHERE id = ? AND is_active = TRUE",
        [req.body.pilihan_jurusan_id]
      );

      const [paymentCheck] = await pool.execute(
        "SELECT id FROM payment_options WHERE id = ? AND is_active = TRUE",
        [req.body.pilihan_pembayaran_id]
      );

      if (jurusanCheck.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Jurusan yang dipilih tidak valid",
        });
      }

      if (paymentCheck.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Jenis pembayaran yang dipilih tidak valid",
        });
      }

      // Generate registration number and PIN
      const no_pendaftaran = AuthUtils.generateNomorPendaftaran();
      const pin_login = AuthUtils.generatePIN();

      // Get file paths
      const filePaths = {
        bukti_pembayaran: files.bukti_pembayaran?.[0]?.filename || null,
        ijazah: files.ijazah?.[0]?.filename || null,
        akta_kelahiran: files.akta_kelahiran?.[0]?.filename || null,
        kartu_keluarga: files.kartu_keluarga?.[0]?.filename || null,
        pas_foto: files.pas_foto?.[0]?.filename || null,
        surat_keterangan_lulus:
          files.surat_keterangan_lulus?.[0]?.filename || null,
      };

      // Insert to database
      const insertQuery = `
        INSERT INTO pendaftar_spmb (
          no_pendaftaran, pin_login,
          nisn, nama_lengkap, nomor_whatsapp_aktif, tempat_lahir, tanggal_lahir,
          jenis_kelamin, golongan_darah, agama, status_sekarang, alamat_siswa,
          asal_sekolah, alamat_sekolah, tahun_lulus,
          nama_orang_tua, nomor_whatsapp_ortu, pendidikan_orang_tua, pekerjaan_orang_tua,
          instansi_orang_tua, penghasilan_orang_tua, alamat_orang_tua,
          pilihan_jurusan_id, pilihan_pembayaran_id,
          bukti_pembayaran, ijazah, akta_kelahiran, kartu_keluarga,
          pas_foto, surat_keterangan_lulus,
          submitted_ip, submitted_user_agent,
          status_pendaftaran, tanggal_daftar
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;

      const values = [
        no_pendaftaran,
        pin_login,
        req.body.nisn || null,
        req.body.nama_lengkap,
        req.body.nomor_whatsapp_aktif,
        req.body.tempat_lahir,
        req.body.tanggal_lahir,
        req.body.jenis_kelamin,
        req.body.golongan_darah || null,
        req.body.agama,
        req.body.status_sekarang || null,
        req.body.alamat_siswa,
        req.body.asal_sekolah,
        req.body.alamat_sekolah || null,
        parseInt(req.body.tahun_lulus),
        req.body.nama_orang_tua,
        req.body.nomor_whatsapp_ortu || null,
        req.body.pendidikan_orang_tua || null,
        req.body.pekerjaan_orang_tua,
        req.body.instansi_orang_tua || null,
        req.body.penghasilan_orang_tua || null,
        req.body.alamat_orang_tua || null,
        parseInt(req.body.pilihan_jurusan_id),
        parseInt(req.body.pilihan_pembayaran_id),
        filePaths.bukti_pembayaran,
        filePaths.ijazah,
        filePaths.akta_kelahiran,
        filePaths.kartu_keluarga,
        filePaths.pas_foto,
        filePaths.surat_keterangan_lulus,
        req.ip,
        req.get("User-Agent"),
      ];

      const [result] = await pool.execute(insertQuery, values);

      // Get complete registration data for response
      const [registrationData] = await pool.execute(
        `
        SELECT 
          p.*, 
          j.nama_jurusan, 
          po.nama_pembayaran, 
          po.total_pembayaran,
          si.school_name,
          si.contact_person,
          si.contact_whatsapp
        FROM pendaftar_spmb p 
        LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id 
        LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
        CROSS JOIN school_info si
        WHERE p.id = ?
      `,
        [result.insertId]
      );

      // NEW: AUTO-SEND REGISTRATION EMAIL
      try {
        if (process.env.SEND_EMAILS !== "false") {
          console.log("=== SENDING REGISTRATION EMAIL ===");
          await EmailService.sendRegistrationSuccess(result.insertId);
          console.log("✅ Registration email sent successfully");
        }
      } catch (emailError) {
        console.error(
          "⚠️ Registration email failed (but registration successful):",
          emailError.message
        );
        // Don't throw error - registration was successful, email is bonus
      }

      res.status(201).json({
        success: true,
        message: "Pendaftaran berhasil! Terima kasih atas partisipasinya.",
        data: {
          id: result.insertId,
          no_pendaftaran,
          pin_login,
          nama_lengkap: req.body.nama_lengkap,
          pilihan_jurusan: registrationData[0]?.nama_jurusan,
          jenis_pembayaran: registrationData[0]?.nama_pembayaran,
          total_pembayaran: registrationData[0]?.total_pembayaran,
          status_pendaftaran: "pending",
          bukti_pdf_url: `/api/spmb/bukti/${no_pendaftaran}`,
          // PDF generation links
          generate_pdf_url: `/api/spmb/generate-pdf/${result.insertId}`,
          download_pdf_url: `/api/spmb/download-pdf/${result.insertId}`,
          // Email notification info
          email_notification:
            process.env.SEND_EMAILS !== "false" ? "sent" : "disabled",
          school_info: {
            name: registrationData[0]?.school_name,
            contact_person: registrationData[0]?.contact_person,
            contact_whatsapp: registrationData[0]?.contact_whatsapp,
          },
          files_uploaded: {
            required_files: {
              bukti_pembayaran: !!filePaths.bukti_pembayaran,
              akta_kelahiran: !!filePaths.akta_kelahiran,
              kartu_keluarga: !!filePaths.kartu_keluarga,
              pas_foto: !!filePaths.pas_foto,
            },
            optional_files: {
              ijazah: !!filePaths.ijazah,
              surat_keterangan_lulus: !!filePaths.surat_keterangan_lulus,
            },
            total_uploaded: Object.values(filePaths).filter(Boolean).length,
          },
          next_steps: [
            "Simpan nomor pendaftaran dan PIN Anda",
            "Check email untuk konfirmasi pendaftaran",
            "Generate dan download bukti pendaftaran PDF",
            "Hubungi sekolah jika ada pertanyaan",
            "Pantau status pendaftaran secara berkala",
          ],
        },
      });
    } catch (error) {
      console.error("SPMB registration error:", error);
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan sistem. Silakan coba lagi.",
        error: error.message,
      });
    }
  });
});

// GET /api/spmb/check-status/:no_pendaftaran/:pin - Check registration status
router.get("/check-status/:no_pendaftaran/:pin", async (req, res) => {
  try {
    const { no_pendaftaran, pin } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT 
        p.*, 
        j.nama_jurusan, 
        po.nama_pembayaran, 
        po.total_pembayaran,
        si.school_name
      FROM pendaftar_spmb p 
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id 
      LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
      CROSS JOIN school_info si
      WHERE p.no_pendaftaran = ? AND p.pin_login = ?
    `,
      [no_pendaftaran, pin]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Data pendaftaran tidak ditemukan. Periksa kembali nomor pendaftaran dan PIN Anda.",
      });
    }

    const pendaftar = rows[0];

    res.json({
      success: true,
      message: "Data pendaftaran ditemukan",
      data: {
        id: pendaftar.id,
        no_pendaftaran: pendaftar.no_pendaftaran,
        nama_lengkap: pendaftar.nama_lengkap,
        pilihan_jurusan: pendaftar.nama_jurusan,
        jenis_pembayaran: pendaftar.nama_pembayaran,
        total_pembayaran: pendaftar.total_pembayaran,
        status_pendaftaran: pendaftar.status_pendaftaran,
        catatan_admin: pendaftar.catatan_admin,
        tanggal_daftar: pendaftar.tanggal_daftar,
        bukti_pdf_url: `/api/spmb/bukti/${pendaftar.no_pendaftaran}`,
        // PDF generation links
        generate_pdf_url: `/api/spmb/generate-pdf/${pendaftar.id}`,
        download_pdf_url: `/api/spmb/download-pdf/${pendaftar.id}`,
        pdf_ready: !!pendaftar.bukti_pdf_path,
        school_name: pendaftar.school_name,
      },
    });
  } catch (error) {
    console.error("Check status error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan sistem",
      error: error.message,
    });
  }
});

// GET /api/spmb/bukti/:no_pendaftaran - Generate HTML bukti pendaftaran (EXISTING FUNCTION PRESERVED)
router.get("/bukti/:no_pendaftaran", async (req, res) => {
  try {
    const { no_pendaftaran } = req.params;

    const [rows] = await pool.execute(
      `
      SELECT 
        p.*, 
        j.nama_jurusan, 
        j.kode_jurusan, 
        po.nama_pembayaran, 
        po.total_pembayaran,
        si.*
      FROM pendaftar_spmb p 
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id 
      LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
      CROSS JOIN school_info si
      WHERE p.no_pendaftaran = ?
    `,
      [no_pendaftaran]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data pendaftaran tidak ditemukan",
      });
    }

    const pendaftar = rows[0];
    const htmlContent = generateBuktiHTML(pendaftar);
    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (error) {
    console.error("Generate bukti error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating bukti pendaftaran",
    });
  }
});

// =============================================================================
// PDF ENDPOINTS - Professional PDF Generation
// =============================================================================

// POST /api/spmb/generate-pdf/:id - Generate PDF bukti pendaftaran
router.post("/generate-pdf/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`=== PDF GENERATION REQUEST for ID: ${id} ===`);

    // Validate pendaftar exists
    const [pendaftarCheck] = await pool.execute(
      "SELECT id, no_pendaftaran, nama_lengkap FROM pendaftar_spmb WHERE id = ?",
      [id]
    );

    if (pendaftarCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data pendaftar tidak ditemukan",
      });
    }

    // Initialize PDF Service
    const pdfService = new PDFService();

    // Generate PDF
    const result = await pdfService.generateBuktiPendaftaran(parseInt(id));

    res.json({
      success: true,
      message: "PDF bukti pendaftaran berhasil digenerate",
      data: {
        filename: result.filename,
        size: result.size,
        pendaftar: result.pendaftar_data,
        download_url: `/api/spmb/download-pdf/${id}`,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Generate PDF Error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal generate PDF bukti pendaftaran",
      error: error.message,
    });
  }
});

// GET /api/spmb/download-pdf/:id - Download PDF bukti pendaftaran
router.get("/download-pdf/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`=== PDF DOWNLOAD REQUEST for ID: ${id} ===`);

    // Get pendaftar data and PDF path
    const [rows] = await pool.execute(
      "SELECT id, no_pendaftaran, nama_lengkap, bukti_pdf_path FROM pendaftar_spmb WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data pendaftar tidak ditemukan",
      });
    }

    const pendaftar = rows[0];

    // Check if PDF exists, if not generate it
    if (!pendaftar.bukti_pdf_path) {
      console.log("PDF not found, generating new PDF...");
      const pdfService = new PDFService();
      const generateResult = await pdfService.generateBuktiPendaftaran(
        parseInt(id)
      );
      pendaftar.bukti_pdf_path = generateResult.filename;
    }

    // Get PDF from storage
    const pdfService = new PDFService();
    const pdfBuffer = await pdfService.getPDFFromStorage(
      pendaftar.bukti_pdf_path
    );

    // Set response headers for PDF download
    const fileName = `Bukti-Pendaftaran-${
      pendaftar.no_pendaftaran
    }-${pendaftar.nama_lengkap.replace(/\s+/g, "-")}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Download PDF Error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal download PDF bukti pendaftaran",
      error: error.message,
    });
  }
});

// GET /api/spmb/pdf-status/:id - Check PDF generation status
router.get("/pdf-status/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const pdfService = new PDFService();
    const status = await pdfService.checkPDFExists(parseInt(id));

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Check PDF Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal cek status PDF",
      error: error.message,
    });
  }
});

// PUBLIC ENDPOINT: GET /api/spmb/public/download-pdf/:no_pendaftaran/:pin
router.get("/public/download-pdf/:no_pendaftaran/:pin", async (req, res) => {
  try {
    const { no_pendaftaran, pin } = req.params;
    console.log(
      `=== PUBLIC PDF DOWNLOAD: ${no_pendaftaran} with PIN: ${pin} ===`
    );

    // Verify nomor pendaftaran and PIN
    const [rows] = await pool.execute(
      "SELECT id, nama_lengkap, bukti_pdf_path FROM pendaftar_spmb WHERE no_pendaftaran = ? AND pin_login = ?",
      [no_pendaftaran, pin]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data pendaftaran tidak ditemukan atau PIN salah",
      });
    }

    const pendaftar = rows[0];

    // Check if PDF exists, if not generate it
    if (!pendaftar.bukti_pdf_path) {
      console.log("PDF not found, generating new PDF...");
      const pdfService = new PDFService();
      const generateResult = await pdfService.generateBuktiPendaftaran(
        pendaftar.id
      );
      pendaftar.bukti_pdf_path = generateResult.filename;
    }

    // Get PDF from storage
    const pdfService = new PDFService();
    const pdfBuffer = await pdfService.getPDFFromStorage(
      pendaftar.bukti_pdf_path
    );

    // Set response headers for PDF download
    const fileName = `Bukti-Pendaftaran-${no_pendaftaran}-${pendaftar.nama_lengkap.replace(
      /\s+/g,
      "-"
    )}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Public Download PDF Error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal download PDF bukti pendaftaran",
      error: error.message,
    });
  }
});

// =============================================================================
// ADMIN ENDPOINTS (Require authentication - add your auth middleware)
// =============================================================================

// GET /api/spmb/admin/list - Get all registrations (add authentication middleware)
router.get("/admin/list", async (req, res) => {
  try {
    const { page = 1, limit = 20, status, jurusan } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*, 
        j.nama_jurusan, 
        po.nama_pembayaran, 
        po.total_pembayaran
      FROM pendaftar_spmb p 
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id 
      LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
      WHERE 1=1
    `;

    const queryParams = [];

    if (status) {
      query += " AND p.status_pendaftaran = ?";
      queryParams.push(status);
    }

    if (jurusan) {
      query += " AND p.pilihan_jurusan_id = ?";
      queryParams.push(jurusan);
    }

    query += " ORDER BY p.tanggal_daftar DESC LIMIT ? OFFSET ?";
    queryParams.push(parseInt(limit), offset);

    const [rows] = await pool.execute(query, queryParams);

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM pendaftar_spmb WHERE 1=1";
    const countParams = [];

    if (status) {
      countQuery += " AND status_pendaftaran = ?";
      countParams.push(status);
    }

    if (jurusan) {
      countQuery += " AND pilihan_jurusan_id = ?";
      countParams.push(jurusan);
    }

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin list error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pendaftar",
      error: error.message,
    });
  }
});

// =============================================================================
// ADMIN UPDATE STATUS WITH EMAIL NOTIFICATION
// =============================================================================

// PUT /api/spmb/admin/update-status/:id - Update status with email notification
router.put("/admin/update-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status_baru, catatan_admin } = req.body;

    console.log(`=== UPDATE STATUS for ID: ${id} to ${status_baru} ===`);

    // Validate status values
    const validStatuses = ["pending", "diterima", "ditolak"];
    if (!validStatuses.includes(status_baru)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid. Pilihan: pending, diterima, ditolak",
      });
    }

    // Get current status
    const [currentData] = await pool.execute(
      "SELECT status_pendaftaran, nama_lengkap FROM pendaftar_spmb WHERE id = ?",
      [id]
    );

    if (currentData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data pendaftar tidak ditemukan",
      });
    }

    const statusLama = currentData[0].status_pendaftaran;

    // Update status in database
    await pool.execute(
      "UPDATE pendaftar_spmb SET status_pendaftaran = ?, catatan_admin = ?, updated_at = NOW() WHERE id = ?",
      [status_baru, catatan_admin || null, id]
    );

    // Send status update email if status changed
    try {
      if (statusLama !== status_baru && process.env.SEND_EMAILS !== "false") {
        console.log("=== SENDING STATUS UPDATE EMAIL ===");
        await EmailService.sendStatusUpdate(
          parseInt(id),
          status_baru,
          catatan_admin
        );
        console.log("✅ Status update email sent successfully");
      }
    } catch (emailError) {
      console.error(
        "⚠️ Status update email failed (but status updated successfully):",
        emailError.message
      );
      // Don't throw error - status was updated successfully, email is bonus
    }

    res.json({
      success: true,
      message: "Status berhasil diperbarui",
      data: {
        id: parseInt(id),
        status_lama: statusLama,
        status_baru: status_baru,
        catatan_admin: catatan_admin,
        email_notification:
          statusLama !== status_baru && process.env.SEND_EMAILS !== "false"
            ? "sent"
            : "skipped",
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengupdate status",
      error: error.message,
    });
  }
});

// =============================================================================
// EXISTING FUNCTION PRESERVED - Generate HTML bukti with school branding
// =============================================================================
function generateBuktiHTML(pendaftar) {
  const primaryColor = pendaftar.primary_color || "#007bff";
  const secondaryColor = pendaftar.secondary_color || "#6c757d";
  const logoUrl = pendaftar.school_logo
    ? `/uploads/logos/${pendaftar.school_logo}`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <title>Bukti Pendaftaran - ${pendaftar.no_pendaftaran}</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                background: #f8f9fa;
                color: #333;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 15px rgba(0,0,0,0.1);
            }
            .header { 
                text-align: center; 
                border-bottom: 3px solid ${primaryColor}; 
                padding-bottom: 20px; 
                margin-bottom: 30px;
            }
            .logo {
                max-height: 80px;
                margin-bottom: 15px;
            }
            .header h1 { 
                color: ${primaryColor}; 
                margin: 10px 0 5px 0;
                font-size: 24px;
            }
            .header h2 { 
                color: ${secondaryColor}; 
                margin: 5px 0;
                font-size: 18px;
                font-weight: normal;
            }
            .registration-info {
                background: ${primaryColor};
                color: white;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
                margin: 20px 0;
            }
            .section { 
                margin: 25px 0; 
                padding: 20px;
                border-left: 4px solid ${primaryColor};
                background: #f8f9ff;
                border-radius: 0 8px 8px 0;
            }
            .section h3 { 
                color: ${primaryColor}; 
                margin-top: 0; 
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
                font-size: 18px;
            }
            .field { 
                display: flex; 
                margin: 12px 0; 
                padding: 8px 0;
                border-bottom: 1px dotted #ddd;
            }
            .label { 
                font-weight: bold; 
                width: 200px; 
                color: #333;
            }
            .value { 
                flex: 1; 
                color: #666;
            }
            .status-section {
                background: #e8f5e8;
                border-left-color: #28a745;
            }
            .status-section h3 { color: #28a745; }
            .status-${pendaftar.status_pendaftaran} {
                background: ${
                  pendaftar.status_pendaftaran === "diterima"
                    ? "#d4edda"
                    : pendaftar.status_pendaftaran === "ditolak"
                    ? "#f8d7da"
                    : "#fff3cd"
                };
                color: ${
                  pendaftar.status_pendaftaran === "diterima"
                    ? "#155724"
                    : pendaftar.status_pendaftaran === "ditolak"
                    ? "#721c24"
                    : "#856404"
                };
                padding: 10px;
                border-radius: 5px;
                text-align: center;
                font-weight: bold;
                font-size: 16px;
                margin: 10px 0;
            }
            .print-btn { 
                background: ${primaryColor}; 
                color: white; 
                padding: 15px 30px; 
                border: none; 
                cursor: pointer; 
                margin: 20px auto;
                display: block;
                border-radius: 5px;
                font-size: 16px;
                transition: background 0.3s;
            }
            .print-btn:hover { 
                background: ${secondaryColor}; 
            }
            .pdf-btn { 
                background: #28a745; 
                color: white; 
                padding: 15px 30px; 
                border: none; 
                cursor: pointer; 
                margin: 10px auto;
                display: block;
                border-radius: 5px;
                font-size: 16px;
                text-decoration: none;
                text-align: center;
                transition: background 0.3s;
            }
            .pdf-btn:hover { 
                background: #218838; 
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                color: #666;
                font-style: italic;
            }
            .contact-info {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-top: 20px;
                border: 1px solid #dee2e6;
            }
            @media print { 
                .print-btn, .pdf-btn { display: none; } 
                body { background: white; }
                .container { box-shadow: none; }
                .section { break-inside: avoid; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                ${
                  logoUrl
                    ? `<img src="${logoUrl}" alt="Logo Sekolah" class="logo">`
                    : ""
                }
                <h1>${pendaftar.school_name}</h1>
                <h2>BUKTI PENDAFTARAN SISWA BARU</h2>
                <p>Tahun Ajaran ${pendaftar.academic_year}</p>
            </div>
            
            <div class="registration-info">
                <h3>Nomor Pendaftaran: ${pendaftar.no_pendaftaran}</h3>
                <p>PIN: <strong>${pendaftar.pin_login}</strong></p>
                <p>Tanggal Daftar: ${new Date(
                  pendaftar.tanggal_daftar
                ).toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}</p>
            </div>
            
            <div class="section">
                <h3>Data Pribadi</h3>
                ${
                  pendaftar.nisn
                    ? `<div class="field"><span class="label">NISN:</span><span class="value">${pendaftar.nisn}</span></div>`
                    : ""
                }
                <div class="field"><span class="label">Nama Lengkap:</span><span class="value">${
                  pendaftar.nama_lengkap
                }</span></div>
                <div class="field"><span class="label">WhatsApp Aktif:</span><span class="value">${
                  pendaftar.nomor_whatsapp_aktif
                }</span></div>
                <div class="field"><span class="label">Tempat, Tanggal Lahir:</span><span class="value">${
                  pendaftar.tempat_lahir
                }, ${new Date(pendaftar.tanggal_lahir).toLocaleDateString(
    "id-ID"
  )}</span></div>
                <div class="field"><span class="label">Jenis Kelamin:</span><span class="value">${
                  pendaftar.jenis_kelamin
                }</span></div>
                ${
                  pendaftar.golongan_darah
                    ? `<div class="field"><span class="label">Golongan Darah:</span><span class="value">${pendaftar.golongan_darah}</span></div>`
                    : ""
                }
                <div class="field"><span class="label">Agama:</span><span class="value">${
                  pendaftar.agama
                }</span></div>
                ${
                  pendaftar.status_sekarang
                    ? `<div class="field"><span class="label">Status Sekarang:</span><span class="value">${pendaftar.status_sekarang}</span></div>`
                    : ""
                }
                <div class="field"><span class="label">Alamat:</span><span class="value">${
                  pendaftar.alamat_siswa
                }</span></div>
            </div>

            <div class="section">
                <h3>Latar Belakang Sekolah</h3>
                <div class="field"><span class="label">Asal Sekolah:</span><span class="value">${
                  pendaftar.asal_sekolah
                }</span></div>
                ${
                  pendaftar.alamat_sekolah
                    ? `<div class="field"><span class="label">Alamat Sekolah:</span><span class="value">${pendaftar.alamat_sekolah}</span></div>`
                    : ""
                }
                <div class="field"><span class="label">Tahun Lulus:</span><span class="value">${
                  pendaftar.tahun_lulus
                }</span></div>
            </div>

            <div class="section">
                <h3>Data Orang Tua</h3>
                <div class="field"><span class="label">Nama Orang Tua/Wali:</span><span class="value">${
                  pendaftar.nama_orang_tua
                }</span></div>
                ${
                  pendaftar.nomor_whatsapp_ortu
                    ? `<div class="field"><span class="label">WhatsApp Orang Tua:</span><span class="value">${pendaftar.nomor_whatsapp_ortu}</span></div>`
                    : ""
                }
                ${
                  pendaftar.pendidikan_orang_tua
                    ? `<div class="field"><span class="label">Pendidikan:</span><span class="value">${pendaftar.pendidikan_orang_tua}</span></div>`
                    : ""
                }
                <div class="field"><span class="label">Pekerjaan:</span><span class="value">${
                  pendaftar.pekerjaan_orang_tua
                }</span></div>
                ${
                  pendaftar.instansi_orang_tua
                    ? `<div class="field"><span class="label">Instansi:</span><span class="value">${pendaftar.instansi_orang_tua}</span></div>`
                    : ""
                }
                ${
                  pendaftar.penghasilan_orang_tua
                    ? `<div class="field"><span class="label">Penghasilan:</span><span class="value">${pendaftar.penghasilan_orang_tua}</span></div>`
                    : ""
                }
                ${
                  pendaftar.alamat_orang_tua
                    ? `<div class="field"><span class="label">Alamat Orang Tua:</span><span class="value">${pendaftar.alamat_orang_tua}</span></div>`
                    : ""
                }
            </div>

            <div class="section">
                <h3>Pilihan Jurusan & Pembayaran</h3>
                <div class="field"><span class="label">Jurusan:</span><span class="value">${
                  pendaftar.nama_jurusan
                } (${pendaftar.kode_jurusan})</span></div>
                <div class="field"><span class="label">Jenis Pembayaran:</span><span class="value">${
                  pendaftar.nama_pembayaran
                }</span></div>
                <div class="field"><span class="label">Total Pembayaran:</span><span class="value">Rp ${Number(
                  pendaftar.total_pembayaran
                ).toLocaleString("id-ID")}</span></div>
            </div>

            <div class="section status-section">
                <h3>Status Pendaftaran</h3>
                <div class="status-${pendaftar.status_pendaftaran}">
                    ${pendaftar.status_pendaftaran.toUpperCase()}
                </div>
                ${
                  pendaftar.catatan_admin
                    ? `<div class="field"><span class="label">Catatan:</span><span class="value">${pendaftar.catatan_admin}</span></div>`
                    : ""
                }
            </div>

            ${
              pendaftar.contact_person || pendaftar.contact_whatsapp
                ? `
            <div class="contact-info">
                <h4>Informasi Kontak</h4>
                ${
                  pendaftar.contact_person
                    ? `<p><strong>Contact Person:</strong> ${pendaftar.contact_person}</p>`
                    : ""
                }
                ${
                  pendaftar.contact_whatsapp
                    ? `<p><strong>WhatsApp:</strong> ${pendaftar.contact_whatsapp}</p>`
                    : ""
                }
                ${
                  pendaftar.school_phone
                    ? `<p><strong>Telepon:</strong> ${pendaftar.school_phone}</p>`
                    : ""
                }
                ${
                  pendaftar.school_email
                    ? `<p><strong>Email:</strong> ${pendaftar.school_email}</p>`
                    : ""
                }
            </div>
            `
                : ""
            }

            <div class="footer">
                <p>Dokumen ini digenerate otomatis oleh sistem SPMB Online</p>
                <p>Simpan bukti pendaftaran ini untuk keperluan verifikasi</p>
            </div>
        </div>
        
        <!-- PDF Download Button -->
        <a href="/api/spmb/download-pdf/${
          pendaftar.id
        }" class="pdf-btn">📄 Download PDF Professional</a>
        <button class="print-btn" onclick="window.print()">🖨️ Print Halaman</button>

        <script>
        // Auto-generate PDF after page load
        document.addEventListener('DOMContentLoaded', function() {
            // Auto-generate PDF in background if not exists
            fetch('/api/spmb/generate-pdf/${pendaftar.id}', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('PDF generated successfully');
                    }
                })
                .catch(error => {
                    console.error('PDF generation error:', error);
                });
        });
        </script>
    </body>
    </html>
  `;
}

module.exports = router;
