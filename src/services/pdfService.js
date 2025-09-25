const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs").promises;
const { pool } = require("../config/database");

class PDFService {
  constructor() {
    this.browser = null;
    this.templateCache = new Map();
    this.initializeHandlebarsHelpers();
  }

  // Initialize custom Handlebars helpers
  initializeHandlebarsHelpers() {
    handlebars.registerHelper("eq", function (a, b) {
      return a === b;
    });

    handlebars.registerHelper("ne", function (a, b) {
      return a !== b;
    });

    handlebars.registerHelper("gt", function (a, b) {
      return a > b;
    });

    handlebars.registerHelper("lt", function (a, b) {
      return a < b;
    });

    handlebars.registerHelper("and", function (a, b) {
      return a && b;
    });

    handlebars.registerHelper("or", function (a, b) {
      return a || b;
    });

    handlebars.registerHelper("formatCurrency", function (amount) {
      if (!amount) return "Rp 0";
      return "Rp " + Number(amount).toLocaleString("id-ID");
    });

    handlebars.registerHelper("formatDate", function (date, format) {
      if (!date) return "";
      const d = new Date(date);
      if (format === "long") {
        return d.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      return d.toLocaleDateString("id-ID");
    });

    handlebars.registerHelper("capitalize", function (str) {
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    handlebars.registerHelper("upper", function (str) {
      if (!str) return "";
      return str.toUpperCase();
    });

    handlebars.registerHelper("lower", function (str) {
      if (!str) return "";
      return str.toLowerCase();
    });

    console.log("Handlebars helpers initialized successfully");
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: process.env.CHROME_BIN || null,
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async loadTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    try {
      const templatePath = path.join(__dirname, "../templates/pdf", `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, "utf-8");
      const template = handlebars.compile(templateContent);

      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      console.error(`Template load error for ${templateName}:`, error);
      return this.getDefaultTemplate(templateName);
    }
  }

  getDefaultTemplate(templateName) {
    if (templateName === "bukti-pendaftaran") {
      const defaultTemplate = `
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <title>Bukti Pendaftaran - {{no_pendaftaran}}</title>
            <style>
                @page { size: A4; margin: 2cm; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Times New Roman', serif; font-size: 12px; line-height: 1.4; color: #000; }
                .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                .logo { width: 80px; height: 80px; margin: 0 auto 10px; }
                .school-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
                .document-title { font-size: 16px; font-weight: bold; margin: 10px 0; text-decoration: underline; }
                .year { font-size: 14px; font-weight: bold; }
                .registration-info { background: #f0f0f0; padding: 15px; border: 2px solid #000; margin: 20px 0; text-align: center; }
                .reg-number { font-size: 24px; font-weight: bold; color: #d32f2f; margin-bottom: 5px; }
                .reg-pin { font-size: 18px; font-weight: bold; color: #1976d2; }
                .content-section { margin: 20px 0; }
                .section-title { font-size: 14px; font-weight: bold; background: #e3f2fd; padding: 8px; border-left: 4px solid #1976d2; margin-bottom: 10px; }
                .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                .info-table td { padding: 5px 8px; border: 1px solid #ddd; vertical-align: top; }
                .info-table .label { background: #f5f5f5; font-weight: bold; width: 30%; }
                .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; color: white; background-color: {{status_color}}; text-align: center; margin: 10px 0; }
                .qr-section { text-align: center; margin: 20px 0; border: 1px dashed #666; padding: 15px; }
                .footer-notes { margin-top: 30px; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                {{#if school.logo_path}}
                <img src="{{school.logo_path}}" alt="Logo Sekolah" class="logo" />
                {{/if}}
                <div class="school-name">{{school.nama_sekolah}}</div>
                <div>{{school.alamat_lengkap}}</div>
                <div class="document-title">BUKTI PENDAFTARAN SISWA BARU</div>
                <div class="year">TAHUN AJARAN {{school.academic_year}}</div>
            </div>
            
            <div class="registration-info">
                <div>NOMOR PENDAFTARAN</div>
                <div class="reg-number">{{no_pendaftaran}}</div>
                <div>PIN LOGIN</div>
                <div class="reg-pin">{{pin_login}}</div>
                <div style="margin-top: 10px;">Tanggal Pendaftaran: {{formatted_tanggal_daftar}}</div>
            </div>
            
            <div class="content-section">
                <div class="section-title">BIODATA SISWA</div>
                <table class="info-table">
                    <tr>
                        <td class="label">Nama Lengkap</td>
                        <td>{{nama_lengkap}}</td>
                    </tr>
                    {{#if nisn}}
                    <tr>
                        <td class="label">NISN</td>
                        <td>{{nisn}}</td>
                    </tr>
                    {{/if}}
                    <tr>
                        <td class="label">WhatsApp</td>
                        <td>{{nomor_whatsapp_aktif}}</td>
                    </tr>
                    <tr>
                        <td class="label">Tempat/Tanggal Lahir</td>
                        <td>{{tempat_lahir}}, {{formatted_tanggal_lahir}}</td>
                    </tr>
                    <tr>
                        <td class="label">Jenis Kelamin</td>
                        <td>{{jenis_kelamin}}</td>
                    </tr>
                    <tr>
                        <td class="label">Agama</td>
                        <td>{{agama}}</td>
                    </tr>
                    <tr>
                        <td class="label">Alamat</td>
                        <td>{{alamat_siswa}}</td>
                    </tr>
                </table>
            </div>

            <div class="content-section">
                <div class="section-title">ASAL SEKOLAH</div>
                <table class="info-table">
                    <tr>
                        <td class="label">Sekolah Asal</td>
                        <td>{{asal_sekolah}}</td>
                    </tr>
                    <tr>
                        <td class="label">Tahun Lulus</td>
                        <td>{{tahun_lulus}}</td>
                    </tr>
                </table>
            </div>

            <div class="content-section">
                <div class="section-title">DATA ORANG TUA</div>
                <table class="info-table">
                    <tr>
                        <td class="label">Nama Orang Tua</td>
                        <td>{{nama_orang_tua}}</td>
                    </tr>
                    <tr>
                        <td class="label">Pekerjaan</td>
                        <td>{{pekerjaan_orang_tua}}</td>
                    </tr>
                </table>
            </div>

            <div class="content-section">
                <div class="section-title">PILIHAN JURUSAN</div>
                <table class="info-table">
                    <tr>
                        <td class="label">Jurusan</td>
                        <td>{{nama_jurusan}} ({{kode_jurusan}})</td>
                    </tr>
                    <tr>
                        <td class="label">Jenis Pembayaran</td>
                        <td>{{nama_pembayaran}}</td>
                    </tr>
                    <tr>
                        <td class="label">Total Pembayaran</td>
                        <td>Rp {{total_pembayaran}}</td>
                    </tr>
                </table>
            </div>

            <div class="content-section">
                <div class="section-title">STATUS PENDAFTARAN</div>
                <div class="status-badge">{{status_text}}</div>
                {{#if catatan_admin}}
                <div style="margin-top: 10px;"><strong>Catatan:</strong> {{catatan_admin}}</div>
                {{/if}}
            </div>

            {{#if qr_code}}
            <div class="qr-section">
                <div><strong>Kode Verifikasi</strong></div>
                <div><img src="{{qr_code}}" alt="QR Code" style="width: 120px; height: 120px;" /></div>
                <div style="font-size: 10px;">Scan untuk verifikasi data pendaftar</div>
            </div>
            {{/if}}

            <div class="footer-notes">
                <h4>CATATAN PENTING:</h4>
                <ul>
                    <li>Simpan bukti pendaftaran ini dengan baik</li>
                    <li>Gunakan Nomor Pendaftaran dan PIN untuk cek status online</li>
                    <li>Bawa bukti ini saat daftar ulang jika diterima</li>
                    <li>Hubungi sekolah jika ada pertanyaan</li>
                </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                <div>{{tanggal_cetak}}</div>
                <div style="margin-top: 40px;">
                    <strong>{{school.nama_sekolah}}</strong>
                </div>
            </div>
        </body>
        </html>
      `;
      return handlebars.compile(defaultTemplate);
    }
    return handlebars.compile("<p>Template not found</p>");
  }

  async generateQRCode(data) {
    try {
      return await QRCode.toDataURL(JSON.stringify(data), {
        width: 120,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    } catch (error) {
      console.error("QR Code generation error:", error);
      return null;
    }
  }

  async getSPMBDataForPDF(pendaftarId) {
    try {
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
        WHERE p.id = ?
      `,
        [pendaftarId]
      );

      if (rows.length === 0) {
        throw new Error("Data pendaftar tidak ditemukan");
      }

      return rows[0];
    } catch (error) {
      console.error("Database error in getSPMBDataForPDF:", error);
      throw new Error("Gagal mengambil data pendaftar: " + error.message);
    }
  }

  async generateBuktiPendaftaran(pendaftarId) {
    try {
      console.log(`Generating PDF for pendaftar ID: ${pendaftarId}`);

      const pendaftarData = await this.getSPMBDataForPDF(pendaftarId);

      const browser = await this.initBrowser();
      const page = await browser.newPage();

      const qrData = {
        no_pendaftaran: pendaftarData.no_pendaftaran,
        pin: pendaftarData.pin_login,
        nama: pendaftarData.nama_lengkap,
        id: pendaftarData.id,
      };
      const qrCodeDataUrl = await this.generateQRCode(qrData);

      const templateData = {
        no_pendaftaran: pendaftarData.no_pendaftaran,
        pin_login: pendaftarData.pin_login,
        nama_lengkap: pendaftarData.nama_lengkap,
        nisn: pendaftarData.nisn,
        nomor_whatsapp_aktif: pendaftarData.nomor_whatsapp_aktif,
        tempat_lahir: pendaftarData.tempat_lahir,
        jenis_kelamin: pendaftarData.jenis_kelamin,
        agama: pendaftarData.agama,
        alamat_siswa: pendaftarData.alamat_siswa,
        asal_sekolah: pendaftarData.asal_sekolah,
        tahun_lulus: pendaftarData.tahun_lulus,
        nama_orang_tua: pendaftarData.nama_orang_tua,
        pekerjaan_orang_tua: pendaftarData.pekerjaan_orang_tua,
        nama_jurusan: pendaftarData.nama_jurusan,
        kode_jurusan: pendaftarData.kode_jurusan,
        nama_pembayaran: pendaftarData.nama_pembayaran,
        total_pembayaran: pendaftarData.total_pembayaran,
        school: {
          nama_sekolah: pendaftarData.school_name,
          alamat_lengkap: pendaftarData.school_address,
          telepon: pendaftarData.school_phone,
          email: pendaftarData.school_email,
          logo_path: pendaftarData.school_logo ? `/uploads/logos/${pendaftarData.school_logo}` : null,
          academic_year: pendaftarData.academic_year,
        },
        formatted_tanggal_lahir: new Date(pendaftarData.tanggal_lahir).toLocaleDateString("id-ID"),
        formatted_tanggal_daftar: new Date(pendaftarData.tanggal_daftar).toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        status_pendaftaran: pendaftarData.status_pendaftaran,
        status_text: this.getStatusText(pendaftarData.status_pendaftaran),
        status_color: this.getStatusColor(pendaftarData.status_pendaftaran),
        catatan_admin: pendaftarData.catatan_admin,
        qr_code: qrCodeDataUrl,
        tanggal_cetak: new Date().toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };

      const template = await this.loadTemplate("bukti-pendaftaran");
      const htmlContent = template(templateData);

      await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">BUKTI PENDAFTARAN - ${templateData.school.nama_sekolah}</div>`,
        footerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></div>`,
      });

      await page.close();

      const fileName = `bukti-${pendaftarData.no_pendaftaran}-${Date.now()}.pdf`;
      const storagePath = path.join(__dirname, "../storage/pdf");

      try {
        await fs.mkdir(storagePath, { recursive: true });
      } catch (error) {
        console.log("Directory creation info:", error.message);
      }

      const filePath = path.join(storagePath, fileName);
      await fs.writeFile(filePath, pdfBuffer);

      try {
        await pool.execute("UPDATE pendaftar_spmb SET bukti_pdf_path = ? WHERE id = ?", [fileName, pendaftarId]);
        console.log(`Database updated with PDF path: ${fileName}`);
      } catch (dbError) {
        if (dbError.code === "ER_BAD_FIELD_ERROR") {
          console.warn("Warning: bukti_pdf_path column does not exist. PDF generated but path not stored in database.");
          console.warn("Please run: ALTER TABLE pendaftar_spmb ADD COLUMN bukti_pdf_path VARCHAR(255) NULL;");
        } else {
          console.error("Database update error:", dbError);
        }
      }

      console.log(`PDF generated successfully: ${fileName}`);

      return {
        success: true,
        filename: fileName,
        path: filePath,
        size: pdfBuffer.length,
        pendaftar_data: {
          no_pendaftaran: pendaftarData.no_pendaftaran,
          nama_lengkap: pendaftarData.nama_lengkap,
        },
      };
    } catch (error) {
      console.error("PDF Generation Error:", error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  async generateBuktiPendaftaranByNomor(no_pendaftaran) {
    try {
      const [rows] = await pool.execute("SELECT id FROM pendaftar_spmb WHERE no_pendaftaran = ?", [no_pendaftaran]);

      if (rows.length === 0) {
        throw new Error("Nomor pendaftaran tidak ditemukan");
      }

      return await this.generateBuktiPendaftaran(rows[0].id);
    } catch (error) {
      console.error("Generate PDF by nomor error:", error);
      throw new Error("Gagal generate PDF: " + error.message);
    }
  }

  async getPDFFromStorage(fileName) {
    try {
      const filePath = path.join(__dirname, "../storage/pdf", fileName);

      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error("File PDF tidak ditemukan");
      }

      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      console.error("Get PDF from storage error:", error);
      throw new Error("Gagal membaca file PDF: " + error.message);
    }
  }

  /**
   * ✅ NEW HELPER METHOD: Get absolute path to PDF file
   * @param {string} fileName - Filename from database (e.g., "bukti-SMK202533506-1234567890.pdf")
   * @returns {string} - Absolute path to PDF file
   */
  getPDFAbsolutePath(fileName) {
    if (!fileName) {
      throw new Error("Filename is required");
    }

    // Resolve to storage/pdf directory
    return path.join(__dirname, "../storage/pdf", fileName);
  }

  /**
   * ✅ NEW HELPER METHOD: Check if PDF file exists
   * @param {string} fileName - Filename from database
   * @returns {Promise<boolean>} - True if file exists
   */
  async pdfFileExists(fileName) {
    if (!fileName) return false;

    try {
      const filePath = this.getPDFAbsolutePath(fileName);
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkPDFExists(pendaftarId) {
    try {
      try {
        const [rows] = await pool.execute("SELECT bukti_pdf_path FROM pendaftar_spmb WHERE id = ?", [pendaftarId]);

        if (rows.length === 0) {
          return { exists: false, message: "Data pendaftar tidak ditemukan" };
        }

        const pdfPath = rows[0].bukti_pdf_path;
        if (!pdfPath) {
          return { exists: false, message: "PDF belum digenerate" };
        }

        const filePath = path.join(__dirname, "../storage/pdf", pdfPath);
        try {
          await fs.access(filePath);
          return { exists: true, filename: pdfPath };
        } catch (error) {
          return {
            exists: false,
            message: "File PDF tidak ditemukan di storage",
          };
        }
      } catch (dbError) {
        if (dbError.code === "ER_BAD_FIELD_ERROR") {
          console.warn("bukti_pdf_path column does not exist, checking storage directly");

          const [pendaftarRows] = await pool.execute("SELECT no_pendaftaran FROM pendaftar_spmb WHERE id = ?", [pendaftarId]);

          if (pendaftarRows.length === 0) {
            return { exists: false, message: "Data pendaftar tidak ditemukan" };
          }

          const storagePath = path.join(__dirname, "../storage/pdf");
          try {
            const files = await fs.readdir(storagePath);
            const noPendaftaran = pendaftarRows[0].no_pendaftaran;
            const pdfFile = files.find((file) => file.includes(noPendaftaran));

            if (pdfFile) {
              return { exists: true, filename: pdfFile };
            } else {
              return { exists: false, message: "PDF belum digenerate" };
            }
          } catch (storageError) {
            return {
              exists: false,
              message: "Error checking storage: " + storageError.message,
            };
          }
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error("Check PDF exists error:", error);
      return { exists: false, message: "Error checking PDF: " + error.message };
    }
  }

  getStatusText(status) {
    const statusMap = {
      pending: "MENUNGGU REVIEW",
      diterima: "DITERIMA",
      ditolak: "DITOLAK",
    };
    return statusMap[status] || "TIDAK DIKETAHUI";
  }

  getStatusColor(status) {
    const colorMap = {
      pending: "#f59e0b",
      diterima: "#10b981",
      ditolak: "#ef4444",
    };
    return colorMap[status] || "#6b7280";
  }

  async generateExcelReport(data, reportType = "pendaftar") {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();

    if (reportType === "pendaftar") {
      return await this.generatePendaftarExcel(workbook, data);
    }

    return await workbook.xlsx.writeBuffer();
  }

  async generatePendaftarExcel(workbook, pendaftarData) {
    const worksheet = workbook.addWorksheet("Data Pendaftar SPMB");

    const columns = [
      { header: "No. Pendaftaran", key: "no_pendaftaran", width: 15 },
      { header: "Nama Lengkap", key: "nama_lengkap", width: 25 },
      { header: "NISN", key: "nisn", width: 18 },
      { header: "Jenis Kelamin", key: "jenis_kelamin", width: 12 },
      { header: "Tempat Lahir", key: "tempat_lahir", width: 15 },
      { header: "Tanggal Lahir", key: "tanggal_lahir", width: 12 },
      { header: "Alamat", key: "alamat_siswa", width: 40 },
      { header: "WhatsApp", key: "nomor_whatsapp_aktif", width: 15 },
      { header: "Sekolah Asal", key: "asal_sekolah", width: 25 },
      { header: "Nama Orang Tua", key: "nama_orang_tua", width: 25 },
      { header: "Pekerjaan Orang Tua", key: "pekerjaan_orang_tua", width: 20 },
      { header: "Status", key: "status_pendaftaran", width: 12 },
      { header: "Tanggal Daftar", key: "tanggal_daftar", width: 15 },
    ];

    worksheet.columns = columns;

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };
    headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };

    pendaftarData.forEach((pendaftar, index) => {
      const row = worksheet.addRow({
        ...pendaftar,
        tanggal_lahir: pendaftar.tanggal_lahir ? new Date(pendaftar.tanggal_lahir).toLocaleDateString("id-ID") : "",
        tanggal_daftar: pendaftar.tanggal_daftar ? new Date(pendaftar.tanggal_daftar).toLocaleDateString("id-ID") : "",
      });

      if ((index + 2) % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  async cleanupOldPDFs(olderThanDays = 30) {
    try {
      const storagePath = path.join(__dirname, "../storage/pdf");
      const files = await fs.readdir(storagePath);
      const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(storagePath, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          console.log(`Cleaned up old PDF: ${file}`);
        }
      }
    } catch (error) {
      console.error("Cleanup old PDFs error:", error);
    }
  }
}

module.exports = PDFService;
