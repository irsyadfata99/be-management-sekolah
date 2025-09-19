// src/service/emailService.js - FIXED VERSION
const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs").promises;
const path = require("path");
const { pool } = require("../config/database");

class EmailService {
  constructor() {
    this.transporter = null;
    this.templateCache = new Map();
    this.initializeTransporter();
    this.initializeHandlebarsHelpers();
  }

  // Initialize email transporter - FIXED: createTransport not createTransporter
  async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Test connection
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        console.log("✅ Email transporter initialized successfully");
      } else {
        console.log("⚠️ Email credentials not configured in .env");
      }
    } catch (error) {
      console.error(
        "❌ Email transporter initialization failed:",
        error.message
      );
      // Don't throw error to prevent app crash
    }
  }

  // Initialize Handlebars helpers
  initializeHandlebarsHelpers() {
    handlebars.registerHelper("formatDate", function (date) {
      if (!date) return "";
      return new Date(date).toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    });

    handlebars.registerHelper("formatDateTime", function (datetime) {
      if (!datetime) return "";
      return new Date(datetime).toLocaleString("id-ID");
    });

    handlebars.registerHelper("upper", function (str) {
      return str ? str.toString().toUpperCase() : "";
    });

    handlebars.registerHelper("capitalize", function (str) {
      return str
        ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
        : "";
    });
  }

  // Load and compile email template
  async loadTemplate(templateName) {
    try {
      if (this.templateCache.has(templateName)) {
        return this.templateCache.get(templateName);
      }

      // Check multiple possible template paths
      const possiblePaths = [
        path.join(__dirname, "../templates/email", `${templateName}.hbs`),
        path.join(__dirname, "../../templates/email", `${templateName}.hbs`),
        path.join(process.cwd(), "src/templates/email", `${templateName}.hbs`),
      ];

      let templateSource = null;
      for (const templatePath of possiblePaths) {
        try {
          templateSource = await fs.readFile(templatePath, "utf8");
          console.log(`✅ Template loaded from: ${templatePath}`);
          break;
        } catch (error) {
          continue;
        }
      }

      if (!templateSource) {
        // Return simple HTML template if file not found
        console.log(
          `⚠️ Template file ${templateName}.hbs not found, using default`
        );
        templateSource = this.getDefaultTemplate(templateName);
      }

      const compiledTemplate = handlebars.compile(templateSource);
      this.templateCache.set(templateName, compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      console.error(`❌ Error loading template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  // Default template fallback
  getDefaultTemplate(templateName) {
    const templates = {
      spmb_confirmation: `
        <h2>Konfirmasi Pendaftaran SPMB</h2>
        <p>Yth. <strong>{{full_name}}</strong>,</p>
        <p>Terima kasih telah mendaftar di {{school.school_name}}.</p>
        <p><strong>Nomor Pendaftaran:</strong> {{registration_number}}</p>
        <p><strong>PIN:</strong> {{pin}}</p>
        <p><strong>Status:</strong> {{status}}</p>
        <p>Silakan simpan email ini sebagai bukti pendaftaran.</p>
      `,
      spmb_verified: `
        <h2>Pendaftaran Terverifikasi</h2>
        <p>Yth. <strong>{{full_name}}</strong>,</p>
        <p>Pendaftaran Anda dengan nomor <strong>{{registration_number}}</strong> telah diverifikasi.</p>
      `,
      spmb_accepted: `
        <h2>Selamat! Anda Diterima</h2>
        <p>Yth. <strong>{{full_name}}</strong>,</p>
        <p><strong>SELAMAT!</strong> Anda telah diterima di {{school.school_name}}.</p>
      `,
      spmb_rejected: `
        <h2>Informasi Status Pendaftaran</h2>
        <p>Yth. <strong>{{full_name}}</strong>,</p>
        <p>Terima kasih atas minat Anda. Mohon maaf pendaftaran belum dapat diterima saat ini.</p>
      `,
    };

    return templates[templateName] || "<p>Email template not found</p>";
  }

  // Get school settings
  async getSchoolSettings() {
    try {
      const [rows] = await pool.execute(
        "SELECT * FROM school_settings WHERE id = 1"
      );

      return (
        rows[0] || {
          school_name: "SMKN 1 Indonesia",
          school_email: "info@smkn1indonesia.sch.id",
          school_phone: "(021) 1234567",
          school_address: "Jl. Pendidikan No. 1, Jakarta",
          school_website: "https://smkn1indonesia.sch.id",
        }
      );
    } catch (error) {
      console.error("❌ Error getting school settings:", error);
      return {
        school_name: "SMKN 1 Indonesia",
        school_email: "info@smkn1indonesia.sch.id",
        school_phone: "(021) 1234567",
        school_address: "Jl. Pendidikan No. 1, Jakarta",
        school_website: "https://smkn1indonesia.sch.id",
      };
    }
  }

  // Send SPMB registration confirmation email
  async sendSPMBConfirmation(registrationData) {
    try {
      if (!this.transporter) {
        console.log("❌ Email transporter not available");
        return { success: false, error: "Email service not configured" };
      }

      const template = await this.loadTemplate("spmb_confirmation");
      const schoolSettings = await this.getSchoolSettings();

      const templateData = {
        ...registrationData,
        school: schoolSettings,
        currentYear: new Date().getFullYear(),
      };

      const htmlContent = template(templateData);

      const mailOptions = {
        from: {
          name: schoolSettings.school_name,
          address: process.env.SMTP_USER,
        },
        to: registrationData.email,
        subject: `Konfirmasi Pendaftaran SPMB - ${registrationData.registration_number}`,
        html: htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log email activity
      await this.logEmailActivity({
        type: "spmb_confirmation",
        recipient: registrationData.email,
        subject: mailOptions.subject,
        status: "sent",
        message_id: result.messageId,
        registration_id: registrationData.id,
      });

      console.log(
        `✅ SPMB confirmation email sent to: ${registrationData.email}`
      );
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Error sending SPMB confirmation email:", error);

      await this.logEmailActivity({
        type: "spmb_confirmation",
        recipient: registrationData.email,
        subject: `Konfirmasi Pendaftaran SPMB - ${registrationData.registration_number}`,
        status: "failed",
        error_message: error.message,
        registration_id: registrationData.id,
      });

      return { success: false, error: error.message };
    }
  }

  // Send test email
  async sendTestEmail(recipientEmail) {
    try {
      if (!this.transporter) {
        throw new Error("Email transporter not configured");
      }

      const schoolSettings = await this.getSchoolSettings();

      const mailOptions = {
        from: {
          name: schoolSettings.school_name,
          address: process.env.SMTP_USER,
        },
        to: recipientEmail,
        subject: "Test Email - Konfigurasi Email Berhasil",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Test Email Berhasil</h2>
            <p>Halo,</p>
            <p>Ini adalah test email untuk memverifikasi bahwa konfigurasi email sudah berfungsi dengan baik.</p>
            <p><strong>Sekolah:</strong> ${schoolSettings.school_name}</p>
            <p><strong>Email:</strong> ${schoolSettings.school_email}</p>
            <p><strong>Waktu:</strong> ${new Date().toLocaleString("id-ID")}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Email ini dikirim secara otomatis dari sistem ${
              schoolSettings.school_name
            }</p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);

      await this.logEmailActivity({
        type: "test_email",
        recipient: recipientEmail,
        subject: mailOptions.subject,
        status: "sent",
        message_id: result.messageId,
      });

      console.log(`✅ Test email sent to: ${recipientEmail}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Error sending test email:", error);
      throw error;
    }
  }

  // Log email activity to database
  async logEmailActivity(logData) {
    try {
      const query = `
        INSERT INTO email_logs (
          type, recipient, subject, status, message_id, 
          error_message, registration_id, template_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      await pool.execute(query, [
        logData.type || null,
        logData.recipient || null,
        logData.subject || null,
        logData.status || null,
        logData.message_id || null,
        logData.error_message || null,
        logData.registration_id || null,
        logData.template_name || null,
      ]);
    } catch (error) {
      console.error("❌ Error logging email activity:", error);
    }
  }

  // Test email configuration
  async testEmailConfig() {
    try {
      if (!this.transporter) {
        return { success: false, error: "Email transporter not configured" };
      }

      await this.transporter.verify();
      console.log("✅ Email configuration test passed");
      return { success: true, message: "Email configuration is valid" };
    } catch (error) {
      console.error("❌ Email configuration test failed:", error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
