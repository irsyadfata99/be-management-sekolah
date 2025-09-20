// ============================================================================
// ENHANCED SCHOOL SETTINGS MANAGEMENT
// File: src/routes/settings.js
// ============================================================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../config/database");
const { authenticateToken, requirePermission } = require("../middleware/auth");

// ============================================================================
// LOGO UPLOAD CONFIGURATION
// ============================================================================

// Configure multer for school logo
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/logos";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✅ Created directory: ${uploadDir}`);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const filename = `school-logo-${uniqueSuffix}${extension}`;
    console.log(`🏫 Generated logo filename: ${filename}`);
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for logos
  fileFilter: (req, file, cb) => {
    console.log(`📋 Logo upload validation:`, {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === "image/svg+xml";

    if (mimetype && extname) {
      console.log("✅ Logo file type validation passed");
      return cb(null, true);
    } else {
      console.log("❌ Logo file type validation failed");
      cb(new Error("Only image files (JPG, PNG, GIF, WebP, SVG) are allowed for logos"));
    }
  },
});

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Apply authentication to all routes
router.use(authenticateToken);

// Apply settings management permission to modification routes
const settingsPermission = requirePermission("manage_settings");

// ============================================================================
// GET CURRENT SCHOOL SETTINGS
// ============================================================================

router.get("/", async (req, res) => {
  try {
    console.log("=== GET SCHOOL SETTINGS REQUEST ===");
    console.log("Requested by:", req.user.username);

    const [rows] = await pool.execute("SELECT * FROM school_settings WHERE id = 1");

    if (rows.length === 0) {
      // Return default settings if none exist
      console.log("⚠️ No school settings found, returning defaults");

      const defaultSettings = {
        id: 1,
        school_name: "SMKN 1 Indonesia",
        school_email: null,
        school_phone: null,
        school_address: null,
        school_website: null,
        school_logo_path: null,
        smtp_host: null,
        smtp_port: 587,
        smtp_user: null,
        smtp_secure: false,
        spmb_open_date: null,
        spmb_close_date: null,
        spmb_announcement_date: null,
        spmb_registration_fee: 0,
        auto_send_confirmation: true,
        auto_send_status_update: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return res.json({
        success: true,
        message: "Default school settings (not yet configured)",
        data: defaultSettings,
        is_default: true,
      });
    }

    // Don't expose sensitive data like SMTP password
    const settings = { ...rows[0] };
    delete settings.smtp_password;

    // Add computed fields
    settings.logo_url = settings.school_logo_path ? `${req.protocol}://${req.get("host")}/uploads/logos/${settings.school_logo_path}` : null;

    settings.spmb_status = getSPMBStatus(settings);
    settings.email_configured = !!(settings.smtp_host && settings.smtp_user);

    console.log("✅ School settings retrieved successfully");

    res.json({
      success: true,
      message: "School settings retrieved successfully",
      data: settings,
      is_default: false,
    });
  } catch (error) {
    console.error("❌ Get school settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve school settings",
      error: error.message,
    });
  }
});

// ============================================================================
// UPDATE SCHOOL SETTINGS
// ============================================================================

router.put("/", settingsPermission, async (req, res) => {
  try {
    console.log("=== UPDATE SCHOOL SETTINGS REQUEST ===");
    console.log("Update requested by:", req.user.username);
    console.log("Update data:", req.body);

    const {
      school_name,
      school_email,
      school_phone,
      school_address,
      school_website,
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_password,
      smtp_secure,
      spmb_open_date,
      spmb_close_date,
      spmb_announcement_date,
      spmb_registration_fee,
      auto_send_confirmation,
      auto_send_status_update,
    } = req.body;

    // Validation
    const validationErrors = [];

    if (school_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(school_email)) {
      validationErrors.push("Format email sekolah tidak valid");
    }

    if (school_website && school_website !== "" && !/^https?:\/\/.+/.test(school_website)) {
      validationErrors.push("Website harus dimulai dengan http:// atau https://");
    }

    if (smtp_port && (isNaN(smtp_port) || smtp_port < 1 || smtp_port > 65535)) {
      validationErrors.push("Port SMTP harus berupa angka antara 1-65535");
    }

    if (spmb_registration_fee && (isNaN(spmb_registration_fee) || spmb_registration_fee < 0)) {
      validationErrors.push("Biaya pendaftaran harus berupa angka positif");
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors: validationErrors,
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (school_name !== undefined) {
      updateFields.push("school_name = ?");
      updateValues.push(school_name.trim());
    }
    if (school_email !== undefined) {
      updateFields.push("school_email = ?");
      updateValues.push(school_email?.trim() || null);
    }
    if (school_phone !== undefined) {
      updateFields.push("school_phone = ?");
      updateValues.push(school_phone?.trim() || null);
    }
    if (school_address !== undefined) {
      updateFields.push("school_address = ?");
      updateValues.push(school_address?.trim() || null);
    }
    if (school_website !== undefined) {
      updateFields.push("school_website = ?");
      updateValues.push(school_website?.trim() || null);
    }
    if (smtp_host !== undefined) {
      updateFields.push("smtp_host = ?");
      updateValues.push(smtp_host?.trim() || null);
    }
    if (smtp_port !== undefined) {
      updateFields.push("smtp_port = ?");
      updateValues.push(parseInt(smtp_port) || 587);
    }
    if (smtp_user !== undefined) {
      updateFields.push("smtp_user = ?");
      updateValues.push(smtp_user?.trim() || null);
    }
    if (smtp_password !== undefined && smtp_password !== "") {
      updateFields.push("smtp_password = ?");
      updateValues.push(smtp_password);
    }
    if (smtp_secure !== undefined) {
      updateFields.push("smtp_secure = ?");
      updateValues.push(Boolean(smtp_secure));
    }
    if (spmb_open_date !== undefined) {
      updateFields.push("spmb_open_date = ?");
      updateValues.push(spmb_open_date || null);
    }
    if (spmb_close_date !== undefined) {
      updateFields.push("spmb_close_date = ?");
      updateValues.push(spmb_close_date || null);
    }
    if (spmb_announcement_date !== undefined) {
      updateFields.push("spmb_announcement_date = ?");
      updateValues.push(spmb_announcement_date || null);
    }
    if (spmb_registration_fee !== undefined) {
      updateFields.push("spmb_registration_fee = ?");
      updateValues.push(parseFloat(spmb_registration_fee) || 0);
    }
    if (auto_send_confirmation !== undefined) {
      updateFields.push("auto_send_confirmation = ?");
      updateValues.push(Boolean(auto_send_confirmation));
    }
    if (auto_send_status_update !== undefined) {
      updateFields.push("auto_send_status_update = ?");
      updateValues.push(Boolean(auto_send_status_update));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada field yang diupdate",
      });
    }

    updateFields.push("updated_at = NOW()");

    // Check if settings exist
    const [existingSettings] = await pool.execute("SELECT id FROM school_settings WHERE id = 1");

    if (existingSettings.length === 0) {
      // Insert new settings
      console.log("Creating new school settings...");

      const insertFields = ["id"].concat(updateFields.slice(0, -1)); // Remove updated_at for insert
      const insertValues = [1].concat(updateValues);

      const insertQuery = `
        INSERT INTO school_settings (${insertFields.join(", ")}, created_at, updated_at) 
        VALUES (${insertFields.map(() => "?").join(", ")}, NOW(), NOW())
      `;

      await pool.execute(insertQuery, insertValues);
      console.log("✅ School settings created successfully");
    } else {
      // Update existing settings
      updateValues.push(1); // for WHERE id = ?

      const updateQuery = `UPDATE school_settings SET ${updateFields.join(", ")} WHERE id = ?`;

      console.log("Executing update query:", updateQuery);
      console.log("With values:", updateValues);

      const [result] = await pool.execute(updateQuery, updateValues);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "School settings not found",
        });
      }

      console.log("✅ School settings updated successfully");
    }

    res.json({
      success: true,
      message: "School settings berhasil diperbarui",
      data: {
        updated_fields: updateFields.length - 1, // exclude updated_at
        updated_by: req.user.username,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Update school settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update school settings",
      error: error.message,
    });
  }
});

// ============================================================================
// UPLOAD SCHOOL LOGO
// ============================================================================

router.post("/logo", settingsPermission, upload.single("logo"), async (req, res) => {
  try {
    console.log("=== UPLOAD SCHOOL LOGO REQUEST ===");
    console.log("Upload requested by:", req.user.username);
    console.log("Uploaded file:", req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No logo file uploaded",
      });
    }

    // Get current logo path to delete old file
    const [currentSettings] = await pool.execute("SELECT school_logo_path FROM school_settings WHERE id = 1");

    const logoFilename = req.file.filename;
    const logoPath = `/uploads/logos/${logoFilename}`;

    // Ensure settings record exists
    if (currentSettings.length === 0) {
      // Create new settings record with logo
      await pool.execute("INSERT INTO school_settings (id, school_logo_path, created_at, updated_at) VALUES (1, ?, NOW(), NOW())", [logoFilename]);
      console.log("✅ Created new school settings with logo");
    } else {
      // Update existing settings with new logo path
      const [result] = await pool.execute("UPDATE school_settings SET school_logo_path = ?, updated_at = NOW() WHERE id = 1", [logoFilename]);

      if (result.affectedRows === 0) {
        return res.status(500).json({
          success: false,
          message: "Failed to update logo in database",
        });
      }

      // Delete old logo file if exists
      if (currentSettings[0].school_logo_path) {
        const oldLogoPath = path.join("uploads/logos", currentSettings[0].school_logo_path);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
          console.log("🗑️ Deleted old logo file");
        }
      }

      console.log("✅ School logo updated successfully");
    }

    res.json({
      success: true,
      message: "School logo berhasil diupload",
      data: {
        filename: logoFilename,
        path: logoPath,
        url: `${req.protocol}://${req.get("host")}${logoPath}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploaded_by: req.user.username,
        uploaded_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file) {
      const filePath = path.join("uploads/logos", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("🗑️ Cleaned up uploaded file due to error");
      }
    }

    console.error("❌ Upload logo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload school logo",
      error: error.message,
    });
  }
});

// ============================================================================
// DELETE SCHOOL LOGO
// ============================================================================

router.delete("/logo", settingsPermission, async (req, res) => {
  try {
    console.log("=== DELETE SCHOOL LOGO REQUEST ===");
    console.log("Delete requested by:", req.user.username);

    // Get current logo path
    const [currentSettings] = await pool.execute("SELECT school_logo_path FROM school_settings WHERE id = 1");

    if (currentSettings.length === 0 || !currentSettings[0].school_logo_path) {
      return res.status(404).json({
        success: false,
        message: "No logo found to delete",
      });
    }

    const logoPath = currentSettings[0].school_logo_path;

    // Remove logo path from database
    const [result] = await pool.execute("UPDATE school_settings SET school_logo_path = NULL, updated_at = NOW() WHERE id = 1");

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to remove logo from database",
      });
    }

    // Delete physical file
    const filePath = path.join("uploads/logos", logoPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("🗑️ Deleted logo file from filesystem");
    }

    console.log("✅ School logo deleted successfully");

    res.json({
      success: true,
      message: "School logo berhasil dihapus",
      data: {
        deleted_file: logoPath,
        deleted_by: req.user.username,
        deleted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Delete logo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete school logo",
      error: error.message,
    });
  }
});

// ============================================================================
// EMAIL TEMPLATES MANAGEMENT
// ============================================================================

// Get email templates
router.get("/templates", async (req, res) => {
  try {
    console.log("=== GET EMAIL TEMPLATES REQUEST ===");

    const [templates] = await pool.execute(
      `SELECT id, name, subject, type, status, created_at, updated_at 
       FROM email_templates 
       ORDER BY type, name`
    );

    console.log(`✅ Retrieved ${templates.length} email templates`);

    res.json({
      success: true,
      message: "Email templates retrieved successfully",
      data: templates,
      total: templates.length,
    });
  } catch (error) {
    console.error("❌ Get templates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve email templates",
      error: error.message,
    });
  }
});

// Update email template
router.put("/templates/:id", settingsPermission, async (req, res) => {
  try {
    console.log("=== UPDATE EMAIL TEMPLATE REQUEST ===");
    const { id } = req.params;
    const { subject, content, status } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: "Subject and content are required",
      });
    }

    const [result] = await pool.execute(
      `UPDATE email_templates 
       SET subject = ?, content = ?, status = ?, updated_at = NOW() 
       WHERE id = ?`,
      [subject, content, status || "active", id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Email template not found",
      });
    }

    console.log("✅ Email template updated successfully");

    res.json({
      success: true,
      message: "Email template berhasil diperbarui",
      data: {
        id: parseInt(id),
        subject,
        status: status || "active",
        updated_by: req.user.username,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Update template error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update email template",
      error: error.message,
    });
  }
});

// ============================================================================
// SYSTEM INFORMATION
// ============================================================================

router.get("/system-info", async (req, res) => {
  try {
    console.log("=== GET SYSTEM INFO REQUEST ===");
    console.log("Requested by:", req.user.username);

    // Get database info
    const [tables] = await pool.execute("SHOW TABLES");
    const tableNames = tables.map((row) => Object.values(row)[0]);

    // Get registration stats
    const [regStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_registrations,
        COUNT(CASE WHEN status_pendaftaran = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status_pendaftaran = 'diterima' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN status_pendaftaran = 'ditolak' THEN 1 END) as rejected_count
      FROM pendaftar_spmb
    `);

    // Get email stats (if table exists)
    let emailStats = { total_emails: 0, sent_emails: 0, failed_emails: 0 };
    if (tableNames.includes("email_logs")) {
      try {
        const [stats] = await pool.execute(`
          SELECT 
            COUNT(*) as total_emails,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_emails,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_emails
          FROM email_logs
        `);
        emailStats = stats[0];
      } catch (e) {
        console.log("⚠️ Could not fetch email stats:", e.message);
      }
    }

    // Get personnel stats (if table exists)
    let personnelStats = { total_personnel: 0, active_personnel: 0 };
    if (tableNames.includes("school_personnel")) {
      try {
        const [stats] = await pool.execute(`
          SELECT 
            COUNT(*) as total_personnel,
            SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_personnel
          FROM school_personnel
        `);
        personnelStats = stats[0];
      } catch (e) {
        console.log("⚠️ Could not fetch personnel stats:", e.message);
      }
    }

    // Get article stats (if table exists)
    let articleStats = { total_articles: 0, published_articles: 0 };
    if (tableNames.includes("artikel")) {
      try {
        const [stats] = await pool.execute(`
          SELECT 
            COUNT(*) as total_articles,
            SUM(CASE WHEN is_published = TRUE THEN 1 ELSE 0 END) as published_articles
          FROM artikel
        `);
        articleStats = stats[0];
      } catch (e) {
        console.log("⚠️ Could not fetch article stats:", e.message);
      }
    }

    const systemInfo = {
      database: {
        total_tables: tableNames.length,
        table_names: tableNames,
        connection_status: "connected",
      },
      statistics: {
        registrations: regStats[0],
        email_system: emailStats,
        personnel: personnelStats,
        articles: articleStats,
      },
      server: {
        node_version: process.version,
        platform: process.platform,
        uptime_seconds: Math.floor(process.uptime()),
        uptime_formatted: formatUptime(process.uptime()),
        memory_usage: {
          used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
          percentage: `${Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)}%`,
        },
        environment: process.env.NODE_ENV || "development",
      },
      timestamps: {
        server_started: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        current_time: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    console.log("✅ System information retrieved successfully");

    res.json({
      success: true,
      message: "System information retrieved successfully",
      data: systemInfo,
    });
  } catch (error) {
    console.error("❌ Get system info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve system information",
      error: error.message,
    });
  }
});

// ============================================================================
// TEST EMAIL CONFIGURATION
// ============================================================================

router.post("/test-email", settingsPermission, async (req, res) => {
  try {
    console.log("=== TEST EMAIL CONFIGURATION REQUEST ===");
    console.log("Test requested by:", req.user.username);

    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({
        success: false,
        message: "Test email address is required",
      });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(test_email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Get current settings
    const [settings] = await pool.execute("SELECT smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, school_name FROM school_settings WHERE id = 1");

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "School settings not found",
      });
    }

    const config = settings[0];

    if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
      return res.status(400).json({
        success: false,
        message: "Email configuration incomplete. Please configure SMTP settings first.",
        missing_fields: {
          smtp_host: !config.smtp_host,
          smtp_user: !config.smtp_user,
          smtp_password: !config.smtp_password,
        },
      });
    }

    // Create temporary transporter with current settings
    const nodemailer = require("nodemailer");
    const testTransporter = nodemailer.createTransporter({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_secure || config.smtp_port === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password,
      },
      tls: {
        rejectUnauthorized: false, // For development/testing
      },
    });

    console.log("🔍 Testing SMTP connection...");

    // Test configuration
    await testTransporter.verify();
    console.log("✅ SMTP connection verified");

    // Send test email
    const mailOptions = {
      from: {
        name: `${config.school_name || "School"} - System Test`,
        address: config.smtp_user,
      },
      to: test_email,
      subject: "Email Configuration Test - Success!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">✅ Email Test Berhasil!</h2>
          <p>Selamat! Konfigurasi email Anda sudah berfungsi dengan baik.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>📧 Detail Konfigurasi:</h3>
            <p><strong>SMTP Host:</strong> ${config.smtp_host}</p>
            <p><strong>SMTP Port:</strong> ${config.smtp_port}</p>
            <p><strong>SMTP User:</strong> ${config.smtp_user}</p>
            <p><strong>Secure Connection:</strong> ${config.smtp_secure ? "Yes (SSL/TLS)" : "No (STARTTLS)"}</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>ℹ️ Informasi Test:</h3>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString("id-ID")}</p>
            <p><strong>Sent From:</strong> ${config.school_name || "School Management System"}</p>
            <p><strong>Test Requested By:</strong> ${req.user.username}</p>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Email ini dikirim secara otomatis untuk menguji konfigurasi email system.
          </p>
        </div>
      `,
    };

    console.log("📧 Sending test email...");
    const result = await testTransporter.sendMail(mailOptions);
    console.log("✅ Test email sent successfully");

    res.json({
      success: true,
      message: "Test email berhasil dikirim",
      data: {
        messageId: result.messageId,
        recipient: test_email,
        smtp_config: {
          host: config.smtp_host,
          port: config.smtp_port,
          user: config.smtp_user,
          secure: config.smtp_secure,
        },
        test_details: {
          tested_by: req.user.username,
          sent_at: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("❌ Test email error:", error);

    let errorMessage = "Email test failed";
    let errorDetails = error.message;

    // Provide helpful error messages
    if (error.code === "EAUTH") {
      errorMessage = "SMTP Authentication failed";
      errorDetails = "Please check your SMTP username and password";
    } else if (error.code === "ECONNECTION") {
      errorMessage = "SMTP Connection failed";
      errorDetails = "Please check your SMTP host and port settings";
    } else if (error.code === "ETIMEDOUT") {
      errorMessage = "SMTP Connection timeout";
      errorDetails = "Please check your network connection and SMTP server";
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: errorDetails,
      error_code: error.code,
      troubleshooting: [
        "Verify SMTP host and port are correct",
        "Check SMTP username and password",
        "Ensure 'Less secure app access' is enabled (for Gmail)",
        "Try using app-specific password (for Gmail with 2FA)",
        "Check firewall and network settings",
      ],
    });
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getSPMBStatus(settings) {
  const now = new Date();
  const openDate = settings.spmb_open_date ? new Date(settings.spmb_open_date) : null;
  const closeDate = settings.spmb_close_date ? new Date(settings.spmb_close_date) : null;

  if (!openDate || !closeDate) {
    return {
      status: "not_configured",
      message: "SPMB dates not configured",
    };
  }

  if (now < openDate) {
    return {
      status: "upcoming",
      message: "SPMB will open soon",
      days_until_open: Math.ceil((openDate - now) / (1000 * 60 * 60 * 24)),
    };
  }

  if (now >= openDate && now <= closeDate) {
    return {
      status: "open",
      message: "SPMB is currently open",
      days_remaining: Math.ceil((closeDate - now) / (1000 * 60 * 60 * 24)),
    };
  }

  if (now > closeDate) {
    return {
      status: "closed",
      message: "SPMB registration is closed",
      days_since_closed: Math.ceil((now - closeDate) / (1000 * 60 * 60 * 24)),
    };
  }

  return {
    status: "unknown",
    message: "SPMB status unknown",
  };
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(" ") || "0s";
}

module.exports = router;
