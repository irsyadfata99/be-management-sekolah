// src/routes/export.js - Excel Export System
const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const { pool } = require("../config/database");
const fs = require("fs");
const path = require("path");

// Ensure exports directory exists
const exportsDir = path.join(__dirname, "../../exports");
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Helper function to format currency
const formatCurrency = (amount) => {
  if (!amount) return "Rp 0";
  return "Rp " + Number(amount).toLocaleString("id-ID");
};

// Helper function to format date
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("id-ID");
};

// GET /api/export/registrations - Export SPMB registrations to Excel
router.get("/registrations", async (req, res) => {
  try {
    const {
      status,
      jurusan,
      start_date,
      end_date,
      payment_type,
      include_files = "false",
    } = req.query;

    console.log("=== EXCEL EXPORT REQUEST ===");
    console.log("Filters:", {
      status,
      jurusan,
      start_date,
      end_date,
      payment_type,
    });

    // Build query with filters
    let query = `
      SELECT 
        p.id, p.no_pendaftaran, p.pin_login, p.nisn, p.nama_lengkap, 
        p.nomor_whatsapp_aktif, p.tempat_lahir, p.tanggal_lahir, p.jenis_kelamin,
        p.golongan_darah, p.agama, p.status_sekarang, p.alamat_siswa,
        p.asal_sekolah, p.alamat_sekolah, p.tahun_lulus,
        p.nama_orang_tua, p.nomor_whatsapp_ortu, p.pendidikan_orang_tua,
        p.pekerjaan_orang_tua, p.instansi_orang_tua, p.penghasilan_orang_tua,
        p.alamat_orang_tua, p.status_pendaftaran, p.catatan_admin,
        p.tanggal_daftar, p.updated_at,
        j.nama_jurusan, j.kode_jurusan,
        po.nama_pembayaran, po.total_pembayaran,
        p.bukti_pembayaran, p.ijazah, p.akta_kelahiran, p.kartu_keluarga,
        p.pas_foto, p.surat_keterangan_lulus
      FROM pendaftar_spmb p 
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id 
      LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
      WHERE 1=1
    `;

    const queryParams = [];

    // Add filters
    if (status) {
      query += " AND p.status_pendaftaran = ?";
      queryParams.push(status);
    }
    if (jurusan) {
      query += " AND p.pilihan_jurusan_id = ?";
      queryParams.push(jurusan);
    }
    if (start_date) {
      query += " AND DATE(p.tanggal_daftar) >= ?";
      queryParams.push(start_date);
    }
    if (end_date) {
      query += " AND DATE(p.tanggal_daftar) <= ?";
      queryParams.push(end_date);
    }
    if (payment_type) {
      query += " AND p.pilihan_pembayaran_id = ?";
      queryParams.push(payment_type);
    }

    query += " ORDER BY p.tanggal_daftar DESC";

    console.log("Executing query with params:", queryParams);
    const [rows] = await pool.execute(query, queryParams);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No registration data found with specified filters",
      });
    }

    console.log(`Found ${rows.length} registrations to export`);

    // Get school info for header
    const [schoolInfo] = await pool.execute(
      "SELECT * FROM school_settings WHERE id = 1"
    );
    const school = schoolInfo[0] || { school_name: "SMKN 1 Indonesia" };

    // Create new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Pendaftar SPMB");

    // Set worksheet properties
    worksheet.properties.defaultRowHeight = 20;

    // Add header information
    worksheet.mergeCells("A1:AC1");
    const headerCell = worksheet.getCell("A1");
    headerCell.value = `DATA PENDAFTAR SPMB - ${school.school_name}`;
    headerCell.font = { bold: true, size: 16 };
    headerCell.alignment = { horizontal: "center" };

    // Add export info
    worksheet.mergeCells("A2:AC2");
    const infoCell = worksheet.getCell("A2");
    infoCell.value = `Diekspor pada: ${new Date().toLocaleDateString(
      "id-ID"
    )} - Total: ${rows.length} pendaftar`;
    infoCell.font = { size: 12 };
    infoCell.alignment = { horizontal: "center" };

    // Add filters info if any
    if (status || jurusan || start_date || end_date) {
      worksheet.mergeCells("A3:AC3");
      const filterCell = worksheet.getCell("A3");
      const filters = [];
      if (status) filters.push(`Status: ${status}`);
      if (jurusan) filters.push(`Jurusan ID: ${jurusan}`);
      if (start_date) filters.push(`Dari: ${start_date}`);
      if (end_date) filters.push(`Sampai: ${end_date}`);
      filterCell.value = `Filter: ${filters.join(" | ")}`;
      filterCell.font = { size: 10, italic: true };
      filterCell.alignment = { horizontal: "center" };
    }

    // Define column headers
    const headers = [
      "No",
      "No Pendaftaran",
      "PIN",
      "NISN",
      "Nama Lengkap",
      "WhatsApp",
      "Tempat Lahir",
      "Tanggal Lahir",
      "Jenis Kelamin",
      "Golongan Darah",
      "Agama",
      "Status Tinggal",
      "Alamat Siswa",
      "Asal Sekolah",
      "Alamat Sekolah",
      "Tahun Lulus",
      "Nama Orang Tua",
      "WhatsApp Ortu",
      "Pendidikan Ortu",
      "Pekerjaan Ortu",
      "Instansi Ortu",
      "Penghasilan Ortu",
      "Alamat Ortu",
      "Jurusan",
      "Kode Jurusan",
      "Jenis Pembayaran",
      "Total Pembayaran",
      "Status Pendaftaran",
      "Catatan Admin",
      "Tanggal Daftar",
      "Last Update",
    ];

    // Add file columns if requested
    if (include_files === "true") {
      headers.push(
        "Bukti Pembayaran",
        "Ijazah",
        "Akta Kelahiran",
        "Kartu Keluarga",
        "Pas Foto",
        "Surat Keterangan Lulus"
      );
    }

    // Add headers to worksheet (starting from row 5)
    const headerRow = worksheet.getRow(5);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6FA" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add data rows
    rows.forEach((row, index) => {
      const dataRow = worksheet.getRow(index + 6);
      const values = [
        index + 1,
        row.no_pendaftaran,
        row.pin_login,
        row.nisn || "",
        row.nama_lengkap,
        row.nomor_whatsapp_aktif,
        row.tempat_lahir,
        formatDate(row.tanggal_lahir),
        row.jenis_kelamin,
        row.golongan_darah || "",
        row.agama,
        row.status_sekarang || "",
        row.alamat_siswa,
        row.asal_sekolah,
        row.alamat_sekolah || "",
        row.tahun_lulus,
        row.nama_orang_tua,
        row.nomor_whatsapp_ortu || "",
        row.pendidikan_orang_tua || "",
        row.pekerjaan_orang_tua,
        row.instansi_orang_tua || "",
        row.penghasilan_orang_tua || "",
        row.alamat_orang_tua || "",
        row.nama_jurusan,
        row.kode_jurusan,
        row.nama_pembayaran,
        formatCurrency(row.total_pembayaran),
        row.status_pendaftaran.toUpperCase(),
        row.catatan_admin || "",
        formatDate(row.tanggal_daftar),
        formatDate(row.updated_at),
      ];

      // Add file information if requested
      if (include_files === "true") {
        values.push(
          row.bukti_pembayaran ? "Ada" : "Tidak Ada",
          row.ijazah ? "Ada" : "Tidak Ada",
          row.akta_kelahiran ? "Ada" : "Tidak Ada",
          row.kartu_keluarga ? "Ada" : "Tidak Ada",
          row.pas_foto ? "Ada" : "Tidak Ada",
          row.surat_keterangan_lulus ? "Ada" : "Tidak Ada"
        );
      }

      values.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };

        // Color code status
        if (colIndex === 27) {
          // Status column
          if (value === "DITERIMA") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFD4EDDA" },
            };
          } else if (value === "DITOLAK") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8D7DA" },
            };
          } else if (value === "PENDING") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFF3CD" },
            };
          }
        }
      });
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Add summary at the bottom
    const summaryStartRow = rows.length + 8;

    // Status summary
    const statusCounts = rows.reduce((acc, row) => {
      acc[row.status_pendaftaran] = (acc[row.status_pendaftaran] || 0) + 1;
      return acc;
    }, {});

    worksheet.getCell(`A${summaryStartRow}`).value = "RINGKASAN DATA:";
    worksheet.getCell(`A${summaryStartRow}`).font = { bold: true, size: 12 };

    let summaryRow = summaryStartRow + 1;
    Object.entries(statusCounts).forEach(([status, count]) => {
      worksheet.getCell(
        `A${summaryRow}`
      ).value = `${status.toUpperCase()}: ${count} pendaftar`;
      summaryRow++;
    });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `SPMB_Export_${timestamp}.xlsx`;
    const filepath = path.join(exportsDir, filename);

    // Write file
    await workbook.xlsx.writeFile(filepath);

    console.log(`Excel file created: ${filename}`);

    // Send file as response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Stream file to response
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    // Clean up file after sending (optional)
    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          console.log(`Temporary file deleted: ${filename}`);
        }
      }, 5000); // Delete after 5 seconds
    });
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export data to Excel",
      error: error.message,
    });
  }
});

// GET /api/export/summary - Export registration summary report
router.get("/summary", async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    console.log(`=== SUMMARY EXPORT REQUEST for year ${year} ===`);

    // Get summary data
    const [summaryData] = await pool.execute(
      `
      SELECT 
        j.nama_jurusan,
        j.kode_jurusan,
        po.nama_pembayaran,
        COUNT(*) as total_pendaftar,
        SUM(CASE WHEN p.status_pendaftaran = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN p.status_pendaftaran = 'diterima' THEN 1 ELSE 0 END) as diterima,
        SUM(CASE WHEN p.status_pendaftaran = 'ditolak' THEN 1 ELSE 0 END) as ditolak,
        SUM(po.total_pembayaran) as total_revenue,
        MIN(p.tanggal_daftar) as first_registration,
        MAX(p.tanggal_daftar) as last_registration
      FROM pendaftar_spmb p
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id
      LEFT JOIN payment_options po ON p.pilihan_pembayaran_id = po.id
      WHERE YEAR(p.tanggal_daftar) = ?
      GROUP BY p.pilihan_jurusan_id, p.pilihan_pembayaran_id
      ORDER BY j.nama_jurusan, po.nama_pembayaran
    `,
      [year]
    );

    // Get monthly registration counts
    const [monthlyData] = await pool.execute(
      `
      SELECT 
        MONTH(tanggal_daftar) as month,
        COUNT(*) as registrations,
        SUM(CASE WHEN status_pendaftaran = 'diterima' THEN 1 ELSE 0 END) as accepted
      FROM pendaftar_spmb 
      WHERE YEAR(tanggal_daftar) = ?
      GROUP BY MONTH(tanggal_daftar)
      ORDER BY month
    `,
      [year]
    );

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // Summary Sheet
    const summarySheet = workbook.addWorksheet("Ringkasan SPMB");

    // Add header
    summarySheet.mergeCells("A1:J1");
    const headerCell = summarySheet.getCell("A1");
    headerCell.value = `RINGKASAN PENDAFTARAN SPMB TAHUN ${year}`;
    headerCell.font = { bold: true, size: 16 };
    headerCell.alignment = { horizontal: "center" };

    // Summary headers
    const summaryHeaders = [
      "Jurusan",
      "Kode",
      "Jenis Pembayaran",
      "Total Pendaftar",
      "Pending",
      "Diterima",
      "Ditolak",
      "Total Revenue",
      "Pendaftaran Pertama",
      "Pendaftaran Terakhir",
    ];

    const summaryHeaderRow = summarySheet.getRow(3);
    summaryHeaders.forEach((header, index) => {
      const cell = summaryHeaderRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6FA" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Add summary data
    summaryData.forEach((row, index) => {
      const dataRow = summarySheet.getRow(index + 4);
      const values = [
        row.nama_jurusan || "N/A",
        row.kode_jurusan || "N/A",
        row.nama_pembayaran || "N/A",
        row.total_pendaftar,
        row.pending,
        row.diterima,
        row.ditolak,
        formatCurrency(row.total_revenue),
        formatDate(row.first_registration),
        formatDate(row.last_registration),
      ];

      values.forEach((value, colIndex) => {
        const cell = dataRow.getCell(colIndex + 1);
        cell.value = value;
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Monthly Sheet
    const monthlySheet = workbook.addWorksheet("Data Bulanan");

    monthlySheet.mergeCells("A1:C1");
    const monthlyHeaderCell = monthlySheet.getCell("A1");
    monthlyHeaderCell.value = `DATA PENDAFTARAN BULANAN TAHUN ${year}`;
    monthlyHeaderCell.font = { bold: true, size: 16 };
    monthlyHeaderCell.alignment = { horizontal: "center" };

    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const monthlyHeaders = ["Bulan", "Total Pendaftar", "Diterima"];
    const monthlyHeaderRow = monthlySheet.getRow(3);
    monthlyHeaders.forEach((header, index) => {
      const cell = monthlyHeaderRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6FA" },
      };
    });

    // Add monthly data
    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyData.find((m) => m.month === i);
      const dataRow = monthlySheet.getRow(i + 3);

      dataRow.getCell(1).value = monthNames[i - 1];
      dataRow.getCell(2).value = monthData ? monthData.registrations : 0;
      dataRow.getCell(3).value = monthData ? monthData.accepted : 0;
    }

    // Auto-fit columns for both sheets
    [summarySheet, monthlySheet].forEach((sheet) => {
      sheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 30);
      });
    });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `SPMB_Summary_${year}_${timestamp}.xlsx`;
    const filepath = path.join(exportsDir, filename);

    // Write file
    await workbook.xlsx.writeFile(filepath);

    // Send response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    // Cleanup
    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 5000);
    });
  } catch (error) {
    console.error("Summary export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export summary report",
      error: error.message,
    });
  }
});

// GET /api/export/template - Download Excel template for bulk import
router.get("/template", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template Import SPMB");

    // Add instructions
    worksheet.mergeCells("A1:F1");
    const instructionCell = worksheet.getCell("A1");
    instructionCell.value =
      "TEMPLATE IMPORT DATA SPMB - Isi data sesuai format di bawah ini";
    instructionCell.font = { bold: true, size: 14 };
    instructionCell.alignment = { horizontal: "center" };

    // Template headers
    const templateHeaders = [
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

    const headerRow = worksheet.getRow(3);
    templateHeaders.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFE6CC" },
      };
    });

    // Add sample data
    const sampleRow = worksheet.getRow(4);
    const sampleData = [
      "John Doe",
      "081234567890",
      "Jakarta",
      "2006-01-15",
      "Laki-laki",
      "Islam",
      "Jl. Contoh No. 123",
      "SMPN 1 Jakarta",
      "2024",
      "Jane Doe",
      "PNS",
      "1",
      "1",
    ];

    sampleData.forEach((data, index) => {
      sampleRow.getCell(index + 1).value = data;
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    // Generate filename
    const filename = "Template_Import_SPMB.xlsx";
    const filepath = path.join(exportsDir, filename);

    await workbook.xlsx.writeFile(filepath);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    fileStream.on("end", () => {
      setTimeout(() => {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }, 5000);
    });
  } catch (error) {
    console.error("Template export error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message,
    });
  }
});

// GET /api/export/stats - Get export statistics
router.get("/stats", async (req, res) => {
  try {
    // Get basic statistics
    const [totalStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_registrations,
        COUNT(CASE WHEN status_pendaftaran = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status_pendaftaran = 'diterima' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN status_pendaftaran = 'ditolak' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN DATE(tanggal_daftar) = CURDATE() THEN 1 END) as today_count,
        COUNT(CASE WHEN DATE(tanggal_daftar) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as week_count
      FROM pendaftar_spmb
    `);

    // Get jurusan statistics
    const [jurusanStats] = await pool.execute(`
      SELECT 
        j.nama_jurusan,
        j.kode_jurusan,
        COUNT(*) as pendaftar_count,
        COUNT(CASE WHEN p.status_pendaftaran = 'diterima' THEN 1 END) as accepted_count
      FROM pendaftar_spmb p
      LEFT JOIN jurusan j ON p.pilihan_jurusan_id = j.id
      GROUP BY p.pilihan_jurusan_id
      ORDER BY pendaftar_count DESC
    `);

    res.json({
      success: true,
      message: "Export statistics retrieved successfully",
      data: {
        total_stats: totalStats[0],
        jurusan_stats: jurusanStats,
        export_options: {
          available_formats: ["xlsx"],
          filters: ["status", "jurusan", "date_range", "payment_type"],
          include_files: true,
          max_records: 10000,
        },
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Export stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get export statistics",
      error: error.message,
    });
  }
});

module.exports = router;
