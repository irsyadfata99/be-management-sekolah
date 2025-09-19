// src/routes/settings.js - School Settings Management
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool } = require("../config/database");

// Configure multer for logo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/logos";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "school-logo-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files (JPG, PNG, GIF, WebP) are allowed"));
    }
  },
});

// GET /api/settings - Get current school settings
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM school_settings WHERE id = 1"
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "School settings not found",
      });
    }

    // Don't expose sensitive data like SMTP password
    const settings = { ...rows[0] };
    delete settings.smtp_password;

    res.json({
      success: true,
      message: "School settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get school settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve school settings",
      error: error.message,
    });
  }
});

// PUT /api/settings - Update school settings
router.put("/", async (req, res) => {
  try {
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

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    if (school_name !== undefined) {
      updateFields.push("school_name = ?");
      updateValues.push(school_name);
    }
    if (school_email !== undefined) {
      updateFields.push("school_email = ?");
      updateValues.push(school_email);
    }
    if (school_phone !== undefined) {
      updateFields.push("school_phone = ?");
      updateValues.push(school_phone);
    }
    if (school_address !== undefined) {
      updateFields.push("school_address = ?");
      updateValues.push(school_address);
    }
    if (school_website !== undefined) {
      updateFields.push("school_website = ?");
      updateValues.push(school_website);
    }
    if (smtp_host !== undefined) {
      updateFields.push("smtp_host = ?");
      updateValues.push(smtp_host);
    }
    if (smtp_port !== undefined) {
      updateFields.push("smtp_port = ?");
      updateValues.push(parseInt(smtp_port));
    }
    if (smtp_user !== undefined) {
      updateFields.push("smtp_user = ?");
      updateValues.push(smtp_user);
    }
    if (smtp_password !== undefined && smtp_password !== "") {
      updateFields.push("smtp_password = ?");
      updateValues.push(smtp_password);
    }
    if (smtp_secure !== undefined) {
      updateFields.push("smtp_secure = ?");
      updateValues.push(smtp_secure);
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
      updateValues.push(auto_send_confirmation);
    }
    if (auto_send_status_update !== undefined) {
      updateFields.push("auto_send_status_update = ?");
      updateValues.push(auto_send_status_update);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(1); // for WHERE id = ?

    const [result] = await pool.execute(
      `UPDATE school_settings SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "School settings not found",
      });
    }

    res.json({
      success: true,
      message: "School settings updated successfully",
      data: {
        updated_fields: updateFields.length - 1, // exclude updated_at
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Update school settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update school settings",
      error: error.message,
    });
  }
});

// POST /api/settings/logo - Upload school logo
router.post("/logo", upload.single("logo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No logo file uploaded",
      });
    }

    // Get current logo path to delete old file
    const [currentSettings] = await pool.execute(
      "SELECT school_logo_path FROM school_settings WHERE id = 1"
    );

    const logoPath = req.file.filename;

    // Update database with new logo path
    const [result] = await pool.execute(
      "UPDATE school_settings SET school_logo_path = ?, updated_at = NOW() WHERE id = 1",
      [logoPath]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "School settings not found",
      });
    }

    // Delete old logo file if exists
    if (currentSettings.length > 0 && currentSettings[0].school_logo_path) {
      const oldLogoPath = path.join(
        "uploads/logos",
        currentSettings[0].school_logo_path
      );
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    res.json({
      success: true,
      message: "School logo uploaded successfully",
      data: {
        filename: logoPath,
        path: `/uploads/logos/${logoPath}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploaded_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Upload logo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload school logo",
      error: error.message,
    });
  }
});

// DELETE /api/settings/logo - Delete school logo
router.delete("/logo", async (req, res) => {
  try {
    // Get current logo path
    const [currentSettings] = await pool.execute(
      "SELECT school_logo_path FROM school_settings WHERE id = 1"
    );

    if (currentSettings.length === 0 || !currentSettings[0].school_logo_path) {
      return res.status(404).json({
        success: false,
        message: "No logo found to delete",
      });
    }

    const logoPath = currentSettings[0].school_logo_path;

    // Remove logo path from database
    await pool.execute(
      "UPDATE school_settings SET school_logo_path = NULL, updated_at = NOW() WHERE id = 1"
    );

    // Delete physical file
    const filePath = path.join("uploads/logos", logoPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: "School logo deleted successfully",
      data: {
        deleted_file: logoPath,
        deleted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Delete logo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete school logo",
      error: error.message,
    });
  }
});

// GET /api/settings/templates - Get email template settings
router.get("/templates", async (req, res) => {
  try {
    const [templates] = await pool.execute(
      `SELECT id, name, subject, type, status, created_at, updated_at 
       FROM email_templates 
       WHERE status = 'active' 
       ORDER BY type, name`
    );

    res.json({
      success: true,
      message: "Email templates retrieved successfully",
      data: templates,
    });
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve email templates",
      error: error.message,
    });
  }
});

// PUT /api/settings/templates/:id - Update email template
router.put("/templates/:id", async (req, res) => {
  try {
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

    res.json({
      success: true,
      message: "Email template updated successfully",
      data: {
        id: parseInt(id),
        subject,
        status: status || "active",
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Update template error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update email template",
      error: error.message,
    });
  }
});

// GET /api/settings/system-info - Get system information for admin
router.get("/system-info", async (req, res) => {
  try {
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
      // email_logs table doesn't exist yet
    }

    res.json({
      success: true,
      message: "System information retrieved successfully",
      data: {
        database: {
          total_tables: tableNames.length,
          table_names: tableNames,
        },
        registrations: regStats[0],
        email_system: emailStats,
        server: {
          node_version: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          environment: process.env.NODE_ENV || "development",
        },
        timestamps: {
          server_started: new Date(
            Date.now() - process.uptime() * 1000
          ).toISOString(),
          current_time: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Get system info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve system information",
      error: error.message,
    });
  }
});

// POST /api/settings/test-email - Test email configuration with current settings
router.post("/test-email", async (req, res) => {
  try {
    const { test_email } = req.body;

    if (!test_email) {
      return res.status(400).json({
        success: false,
        message: "Test email address is required",
      });
    }

    // Get current settings
    const [settings] = await pool.execute(
      "SELECT smtp_host, smtp_port, smtp_user, smtp_password FROM school_settings WHERE id = 1"
    );

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "School settings not found",
      });
    }

    const config = settings[0];

    // Create temporary transporter with current settings
    const nodemailer = require("nodemailer");
    const testTransporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password,
      },
    });

    // Test configuration
    await testTransporter.verify();

    // Send test email
    const mailOptions = {
      from: {
        name: "SPMB System Test",
        address: config.smtp_user,
      },
      to: test_email,
      subject: "Email Configuration Test",
      html: `
        <h2>Email Test Successful!</h2>
        <p>This is a test email to verify SMTP configuration.</p>
        <p><strong>SMTP Host:</strong> ${config.smtp_host}</p>
        <p><strong>SMTP Port:</strong> ${config.smtp_port}</p>
        <p><strong>Test Time:</strong> ${new Date().toLocaleString("id-ID")}</p>
      `,
    };

    const result = await testTransporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: "Test email sent successfully",
      data: {
        messageId: result.messageId,
        recipient: test_email,
        smtp_config: {
          host: config.smtp_host,
          port: config.smtp_port,
          user: config.smtp_user,
        },
        sent_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Email test failed",
      error: error.message,
      details: "Check SMTP configuration in settings",
    });
  }
});

module.exports = router;
