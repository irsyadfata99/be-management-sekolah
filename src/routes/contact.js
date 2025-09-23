const express = require("express");
const router = express.Router();
const { pool } = require("../config/database");
const { body, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");

// ============================================================================
// CONTACT ROUTES - Updated for Database Compatibility
// ============================================================================

// GET /api/contact/info - Get school contact information (Public)
router.get("/info", async (req, res) => {
  try {
    console.log("🔍 Fetching contact info...");

    // Get school basic info from settings table
    const [schoolInfo] = await pool.execute(`
      SELECT setting_key, setting_value, description
      FROM school_settings 
      WHERE setting_key IN (
        'school_name', 'school_address', 'school_phone', 'school_email', 
        'school_website', 'maps_latitude', 'maps_longitude', 'maps_embed_url',
        'whatsapp_number', 'instagram_handle', 'facebook_page', 'contact_email'
      )
      ORDER BY setting_key
    `);

    console.log(`✅ Found ${schoolInfo.length} settings from database`);

    // Process settings into object
    const info = {};
    schoolInfo.forEach((setting) => {
      info[setting.setting_key] = setting.setting_value;
    });

    // Build contact info with database values + defaults
    const contactInfo = {
      school_name: info.school_name || "SMA Negeri 1 Jakarta",
      school_address:
        info.school_address ||
        "Jl. Pendidikan No. 123, Jakarta Pusat, DKI Jakarta 10001",
      school_phone: info.school_phone || "(021) 1234-5678",
      school_email: info.school_email || "info@sman1jakarta.sch.id",
      school_website: info.school_website || "www.sman1jakarta.sch.id",
      maps_latitude: parseFloat(info.maps_latitude) || -6.2088,
      maps_longitude: parseFloat(info.maps_longitude) || 106.8456,
      maps_embed_url: info.maps_embed_url || "",

      // Additional contact details
      office_hours: "Senin - Jumat: 07:00 - 16:00 WIB",
      whatsapp: info.whatsapp_number || "+62 812-3456-7890",
      instagram: info.instagram_handle || "@sman1jakarta",
      facebook: info.facebook_page || "SMA Negeri 1 Jakarta",

      // Department contacts (static for now, could be moved to database later)
      departments: [
        {
          name: "Tata Usaha",
          phone: info.school_phone
            ? info.school_phone + " ext. 101"
            : "(021) 1234-5678 ext. 101",
          email: "tatausaha@sman1jakarta.sch.id",
        },
        {
          name: "Kesiswaan",
          phone: info.school_phone
            ? info.school_phone + " ext. 102"
            : "(021) 1234-5678 ext. 102",
          email: "kesiswaan@sman1jakarta.sch.id",
        },
        {
          name: "Kurikulum",
          phone: info.school_phone
            ? info.school_phone + " ext. 103"
            : "(021) 1234-5678 ext. 103",
          email: "kurikulum@sman1jakarta.sch.id",
        },
        {
          name: "Perpustakaan",
          phone: info.school_phone
            ? info.school_phone + " ext. 104"
            : "(021) 1234-5678 ext. 104",
          email: "perpustakaan@sman1jakarta.sch.id",
        },
      ],
    };

    console.log("✅ Contact info compiled successfully");

    res.json({
      success: true,
      message: "Contact information retrieved successfully",
      data: contactInfo,
      debug: {
        settings_from_db: schoolInfo.length,
        available_settings: Object.keys(info),
      },
    });
  } catch (error) {
    console.error("❌ Get contact info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve contact information",
      error: error.message,
      debug: {
        sql_error: error.sqlMessage || "No SQL error",
        code: error.code || "Unknown",
      },
    });
  }
});

// POST /api/contact/message - Submit contact form (Public)
router.post(
  "/message",
  [
    body("name")
      .notEmpty()
      .withMessage("Nama harus diisi")
      .isLength({ min: 2, max: 255 })
      .withMessage("Nama harus 2-255 karakter"),
    body("email").isEmail().withMessage("Email tidak valid").normalizeEmail(),
    body("subject")
      .notEmpty()
      .withMessage("Subject harus diisi")
      .isLength({ min: 5, max: 500 })
      .withMessage("Subject harus 5-500 karakter"),
    body("message")
      .isLength({ min: 10, max: 5000 })
      .withMessage("Pesan harus 10-5000 karakter"),
    body("category")
      .optional()
      .isIn(["general", "admission", "academic", "technical"])
      .withMessage("Kategori tidak valid"),
    body("phone")
      .optional()
      .matches(/^[\+]?[0-9\-\s\(\)]{8,15}$/)
      .withMessage("Format nomor telepon tidak valid"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Data tidak valid",
          errors: errors.array(),
        });
      }

      const {
        name,
        email,
        phone,
        subject,
        message,
        category = "general",
      } = req.body;

      console.log(`📝 New contact message from: ${name} (${email})`);

      // Save to database with proper error handling
      const [result] = await pool.execute(
        `
      INSERT INTO contact_messages (name, email, phone, subject, message, category, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'new', NOW())
    `,
        [
          name.trim(),
          email.trim(),
          phone ? phone.trim() : null,
          subject.trim(),
          message.trim(),
          category,
        ]
      );

      const messageId = result.insertId;
      console.log(`✅ Contact message saved with ID: ${messageId}`);

      // Send email notification (async, don't block response)
      setImmediate(async () => {
        try {
          await sendContactNotification({
            id: messageId,
            name,
            email,
            phone,
            subject,
            message,
            category,
          });
          console.log(`📧 Email notification sent for message #${messageId}`);
        } catch (emailError) {
          console.error(
            `❌ Email notification failed for message #${messageId}:`,
            emailError.message
          );
          // Don't fail the main request
        }
      });

      res.status(201).json({
        success: true,
        message: "Pesan berhasil dikirim. Terima kasih atas pertanyaan Anda!",
        data: {
          message_id: messageId,
          category: category,
          status: "new",
        },
      });
    } catch (error) {
      console.error("❌ Submit contact message error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengirim pesan. Silakan coba lagi.",
        error: error.message,
        debug: {
          sql_error: error.sqlMessage || "No SQL error",
          code: error.code || "Unknown",
        },
      });
    }
  }
);

// GET /api/contact/messages - Get all contact messages (Admin only)
router.get("/messages", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      search,
      sort = "created_at",
      order = "desc",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = "SELECT * FROM contact_messages WHERE 1=1";
    const params = [];

    // Apply filters
    if (status && ["new", "read", "replied", "resolved"].includes(status)) {
      query += " AND status = ?";
      params.push(status);
    }

    if (
      category &&
      ["general", "admission", "academic", "technical"].includes(category)
    ) {
      query += " AND category = ?";
      params.push(category);
    }

    if (search && search.trim()) {
      query +=
        " AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)";
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Sorting
    const allowedSorts = [
      "created_at",
      "updated_at",
      "name",
      "email",
      "subject",
      "status",
      "category",
    ];
    const sortField = allowedSorts.includes(sort) ? sort : "created_at";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

    query += ` ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    console.log("🔍 Admin messages query:", {
      query: query.substring(0, 100) + "...",
      params: params.slice(-2),
    });

    const [messages] = await pool.execute(query, params);

    // Count total with same filters
    let countQuery = "SELECT COUNT(*) as total FROM contact_messages WHERE 1=1";
    const countParams = [];

    if (status && ["new", "read", "replied", "resolved"].includes(status)) {
      countQuery += " AND status = ?";
      countParams.push(status);
    }

    if (
      category &&
      ["general", "admission", "academic", "technical"].includes(category)
    ) {
      countQuery += " AND category = ?";
      countParams.push(category);
    }

    if (search && search.trim()) {
      countQuery +=
        " AND (name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)";
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    console.log(`✅ Retrieved ${messages.length} messages (${total} total)`);

    res.json({
      success: true,
      message: "Contact messages retrieved successfully",
      data: messages,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_pages: Math.ceil(total / limitNum),
        total_messages: total,
        has_next: pageNum * limitNum < total,
        has_prev: pageNum > 1,
      },
      filters: {
        status,
        category,
        search: search ? search.trim() : null,
      },
    });
  } catch (error) {
    console.error("❌ Get contact messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve messages",
      error: error.message,
    });
  }
});

// PUT /api/contact/messages/:id/status - Update message status (Admin only)
router.put(
  "/messages/:id/status",
  [
    body("status")
      .isIn(["new", "read", "replied", "resolved"])
      .withMessage("Status tidak valid"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Status tidak valid",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Validate ID
      const messageId = parseInt(id);
      if (isNaN(messageId) || messageId < 1) {
        return res.status(400).json({
          success: false,
          message: "ID pesan tidak valid",
        });
      }

      // Check if message exists first
      const [existing] = await pool.execute(
        "SELECT id, status FROM contact_messages WHERE id = ?",
        [messageId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Pesan tidak ditemukan",
        });
      }

      // Update status
      const [result] = await pool.execute(
        "UPDATE contact_messages SET status = ?, updated_at = NOW() WHERE id = ?",
        [status, messageId]
      );

      console.log(`✅ Message #${messageId} status updated to: ${status}`);

      res.json({
        success: true,
        message: "Status berhasil diupdate",
        data: {
          message_id: messageId,
          old_status: existing[0].status,
          new_status: status,
          updated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("❌ Update message status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update status",
        error: error.message,
      });
    }
  }
);

// GET /api/contact/stats - Get contact statistics (Admin only)
router.get("/stats", async (req, res) => {
  try {
    console.log("📊 Generating contact statistics...");

    // Main statistics
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_messages,
        SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_messages,
        SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied_messages,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_messages,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today_messages,
        SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as week_messages,
        SUM(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as month_messages
      FROM contact_messages
    `);

    // Category breakdown
    const [categoryStats] = await pool.execute(`
      SELECT category, COUNT(*) as count,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
      FROM contact_messages
      GROUP BY category
      ORDER BY count DESC
    `);

    // Recent messages
    const [recentMessages] = await pool.execute(`
      SELECT id, name, email, subject, category, status, created_at
      FROM contact_messages
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Daily activity (last 7 days)
    const [dailyActivity] = await pool.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as messages_count
      FROM contact_messages 
      WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    console.log(
      `✅ Statistics generated: ${stats[0].total_messages} total messages`
    );

    res.json({
      success: true,
      message: "Contact statistics retrieved successfully",
      data: {
        overview: stats[0],
        by_category: categoryStats,
        recent_messages: recentMessages,
        daily_activity: dailyActivity,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Get contact stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message,
    });
  }
});

// DELETE /api/contact/messages/:id - Delete message (Admin only)
router.delete("/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const messageId = parseInt(id);

    if (isNaN(messageId) || messageId < 1) {
      return res.status(400).json({
        success: false,
        message: "ID pesan tidak valid",
      });
    }

    // Check if message exists
    const [existing] = await pool.execute(
      "SELECT id, name, email FROM contact_messages WHERE id = ?",
      [messageId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pesan tidak ditemukan",
      });
    }

    // Delete message
    const [result] = await pool.execute(
      "DELETE FROM contact_messages WHERE id = ?",
      [messageId]
    );

    console.log(`🗑️ Message #${messageId} from ${existing[0].name} deleted`);

    res.json({
      success: true,
      message: "Pesan berhasil dihapus",
      data: {
        deleted_message: {
          id: messageId,
          name: existing[0].name,
          email: existing[0].email,
        },
      },
    });
  } catch (error) {
    console.error("❌ Delete message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
});

// ============================================================================
// EMAIL NOTIFICATION HELPER - Enhanced
// ============================================================================
async function sendContactNotification(messageData) {
  // Skip if email not configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log("📧 Email not configured, skipping notification");
    return;
  }

  try {
    // Get contact email from settings
    const [contactSettings] = await pool.execute(
      "SELECT setting_value FROM school_settings WHERE setting_key = 'contact_email'"
    );

    const contactEmail =
      contactSettings[0]?.setting_value ||
      process.env.CONTACT_EMAIL ||
      process.env.SMTP_USER;

    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const categoryNames = {
      general: "Pertanyaan Umum",
      admission: "Pendaftaran",
      academic: "Akademik",
      technical: "Teknis",
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .message-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #3B82F6; margin: 15px 0; }
          .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 Pesan Kontak Baru</h2>
            <p>${
              categoryNames[messageData.category] || messageData.category
            }</p>
          </div>
          <div class="content">
            <p><strong>📝 Dari:</strong> ${messageData.name}</p>
            <p><strong>📧 Email:</strong> ${messageData.email}</p>
            ${
              messageData.phone
                ? `<p><strong>📱 Telepon:</strong> ${messageData.phone}</p>`
                : ""
            }
            <p><strong>📋 Subject:</strong> ${messageData.subject}</p>
            <p><strong>🏷️ Kategori:</strong> ${
              categoryNames[messageData.category] || messageData.category
            }</p>
            
            <h3>📄 Pesan:</h3>
            <div class="message-box">
              ${messageData.message.replace(/\n/g, "<br>")}
            </div>
          </div>
          <div class="footer">
            <p>ID Pesan: #${
              messageData.id
            } | Waktu: ${new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    })}</p>
            <p>Sistem Website Sekolah</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Website Sekolah" <${process.env.SMTP_USER}>`,
      to: contactEmail,
      subject: `[KONTAK] ${categoryNames[messageData.category]} - ${
        messageData.subject
      }`,
      html: htmlContent,
      replyTo: messageData.email,
    });

    console.log(`📧 Contact notification sent to: ${contactEmail}`);
  } catch (error) {
    console.error("❌ Send notification error:", error);
    throw error;
  }
}

module.exports = router;
