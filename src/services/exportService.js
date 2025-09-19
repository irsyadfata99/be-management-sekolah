const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs").promises;

class ExportService {
  constructor() {
    this.exportPath = path.join(__dirname, "../storage/exports");
  }

  // Ensure export directory exists
  async ensureExportDir() {
    try {
      await fs.mkdir(this.exportPath, { recursive: true });
    } catch (error) {
      console.error("Export directory creation failed:", error);
    }
  }

  // Export SPMB data to Excel
  async exportSPMBToExcel(filters = {}) {
    try {
      await this.ensureExportDir();

      // Build query dengan filters
      let query = `
        SELECT 
          s.id,
          s.nomor_pendaftaran,
          s.nama_lengkap,
          s.nisn,
          s.nik,
          s.tempat_lahir,
          DATE_FORMAT(s.tanggal_lahir, '%d-%m-%Y') as tanggal_lahir,
          s.jenis_kelamin,
          s.alamat,
          s.no_hp,
          s.email,
          s.nama_ayah,
          s.pekerjaan_ayah,
          s.nama_ibu,
          s.pekerjaan_ibu,
          s.asal_sekolah,
          s.program_pilihan_1,
          s.program_pilihan_2,
          s.status,
          DATE_FORMAT(s.created_at, '%d-%m-%Y %H:%i') as tanggal_daftar
        FROM spmb s
        WHERE 1=1
      `;

      const queryParams = [];

      // Apply filters
      if (filters.status) {
        query += " AND s.status = ?";
        queryParams.push(filters.status);
      }

      if (filters.program) {
        query += " AND (s.program_pilihan_1 = ? OR s.program_pilihan_2 = ?)";
        queryParams.push(filters.program, filters.program);
      }

      if (filters.start_date) {
        query += " AND DATE(s.created_at) >= ?";
        queryParams.push(filters.start_date);
      }

      if (filters.end_date) {
        query += " AND DATE(s.created_at) <= ?";
        queryParams.push(filters.end_date);
      }

      query += " ORDER BY s.created_at DESC";

      // Get data from database
      const data = await db.query(query, queryParams);

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();

      // Add metadata
      workbook.creator = "Sistem SPMB Sekolah";
      workbook.created = new Date();

      // Create worksheet
      const worksheet = workbook.addWorksheet("Data SPMB", {
        pageSetup: {
          paperSize: 9,
          orientation: "landscape",
          fitToPage: true,
        },
      });

      // Define columns
      worksheet.columns = [
        { header: "No", key: "no", width: 5 },
        { header: "No. Pendaftaran", key: "nomor_pendaftaran", width: 15 },
        { header: "Nama Lengkap", key: "nama_lengkap", width: 25 },
        { header: "NISN", key: "nisn", width: 15 },
        { header: "NIK", key: "nik", width: 18 },
        { header: "Tempat Lahir", key: "tempat_lahir", width: 15 },
        { header: "Tanggal Lahir", key: "tanggal_lahir", width: 12 },
        { header: "Jenis Kelamin", key: "jenis_kelamin", width: 12 },
        { header: "No. HP", key: "no_hp", width: 15 },
        { header: "Email", key: "email", width: 25 },
        { header: "Nama Ayah", key: "nama_ayah", width: 20 },
        { header: "Pekerjaan Ayah", key: "pekerjaan_ayah", width: 15 },
        { header: "Nama Ibu", key: "nama_ibu", width: 20 },
        { header: "Pekerjaan Ibu", key: "pekerjaan_ibu", width: 15 },
        { header: "Asal Sekolah", key: "asal_sekolah", width: 25 },
        { header: "Program Pilihan 1", key: "program_pilihan_1", width: 20 },
        { header: "Program Pilihan 2", key: "program_pilihan_2", width: 20 },
        { header: "Status", key: "status", width: 12 },
        { header: "Tanggal Daftar", key: "tanggal_daftar", width: 18 },
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2563eb" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };
      headerRow.height = 25;

      // Add data rows
      data.forEach((item, index) => {
        const row = worksheet.addRow({
          no: index + 1,
          ...item,
        });

        // Style alternate rows
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F8FAFC" },
          };
        }

        // Style status column dengan colors
        const statusCell = row.getCell("status");
        switch (item.status.toLowerCase()) {
          case "diterima":
            statusCell.font = { bold: true, color: { argb: "059669" } };
            break;
          case "ditolak":
            statusCell.font = { bold: true, color: { argb: "DC2626" } };
            break;
          case "pending":
            statusCell.font = { bold: true, color: { argb: "D97706" } };
            break;
        }
      });

      // Add borders to all cells
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        const lengths = column.values.map((v) => (v ? v.toString().length : 0));
        const maxLength = Math.max(
          ...lengths.filter((v) => typeof v === "number")
        );
        column.width = Math.min(Math.max(maxLength + 2, 10), 50);
      });

      // Add summary info
      const summaryStartRow = data.length + 3;

      // Summary header
      const summaryHeaderCell = worksheet.getCell(`A${summaryStartRow}`);
      summaryHeaderCell.value = "SUMMARY DATA SPMB";
      summaryHeaderCell.font = { bold: true, size: 14 };
      summaryHeaderCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2563eb" },
      };
      summaryHeaderCell.font.color = { argb: "FFFFFF" };

      // Merge cells for summary header
      worksheet.mergeCells(`A${summaryStartRow}:D${summaryStartRow}`);

      // Add summary data
      const statusCounts = {
        total: data.length,
        diterima: data.filter(
          (item) => item.status.toLowerCase() === "diterima"
        ).length,
        ditolak: data.filter((item) => item.status.toLowerCase() === "ditolak")
          .length,
        pending: data.filter((item) => item.status.toLowerCase() === "pending")
          .length,
      };

      worksheet.getCell(`A${summaryStartRow + 2}`).value = "Total Pendaftar:";
      worksheet.getCell(`B${summaryStartRow + 2}`).value = statusCounts.total;

      worksheet.getCell(`A${summaryStartRow + 3}`).value = "Diterima:";
      worksheet.getCell(`B${summaryStartRow + 3}`).value =
        statusCounts.diterima;
      worksheet.getCell(`B${summaryStartRow + 3}`).font = {
        color: { argb: "059669" },
      };

      worksheet.getCell(`A${summaryStartRow + 4}`).value = "Ditolak:";
      worksheet.getCell(`B${summaryStartRow + 4}`).value = statusCounts.ditolak;
      worksheet.getCell(`B${summaryStartRow + 4}`).font = {
        color: { argb: "DC2626" },
      };

      worksheet.getCell(`A${summaryStartRow + 5}`).value = "Pending:";
      worksheet.getCell(`B${summaryStartRow + 5}`).value = statusCounts.pending;
      worksheet.getCell(`B${summaryStartRow + 5}`).font = {
        color: { argb: "D97706" },
      };

      // Generate filename
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const filename = `data-spmb-${timestamp}.xlsx`;
      const filepath = path.join(this.exportPath, filename);

      // Write file
      await workbook.xlsx.writeFile(filepath);

      return {
        success: true,
        filename: filename,
        filepath: filepath,
        recordCount: data.length,
        summary: statusCounts,
      };
    } catch (error) {
      console.error("Excel Export Error:", error);
      throw new Error("Gagal export Excel: " + error.message);
    }
  }

  // Clean old export files (older than 7 days)
  async cleanupOldExports() {
    try {
      const files = await fs.readdir(this.exportPath);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filepath = path.join(this.exportPath, file);
        const stats = await fs.stat(filepath);

        if (stats.mtime.getTime() < oneWeekAgo) {
          await fs.unlink(filepath);
          console.log(`Cleaned up old export: ${file}`);
        }
      }
    } catch (error) {
      console.error("Cleanup exports error:", error);
    }
  }
}

module.exports = new ExportService();
